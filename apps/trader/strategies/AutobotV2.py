"""A small, shared dry-run/backtest baseline and prospective Astra challenger."""
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

import talib.abstract as ta
from pandas import DataFrame
from freqtrade.exceptions import OperationalException
from freqtrade.persistence import Trade
from freqtrade.strategy import IStrategy

from astra_advisor import AstraAdvisor
from market_context import build_snapshot, market_context

logger = logging.getLogger(__name__)


class AutobotBaseline(IStrategy):
    def __init__(self, config):
        if config.get("dry_run") is not True:
            raise OperationalException("Autobot V2 currently requires dry_run=true.")
        super().__init__(config)

    INTERFACE_VERSION = 3
    timeframe = "1h"
    can_short = False
    startup_candle_count = 400
    process_only_new_candles = True
    position_adjustment_enable = False
    minimal_roi = {"0": 0.04}
    stoploss = -0.03
    trailing_stop = True
    trailing_stop_positive = 0.015
    trailing_stop_positive_offset = 0.03
    trailing_only_offset_is_reached = True
    order_types = {"entry": "market", "exit": "market", "stoploss": "market", "stoploss_on_exchange": False}

    def bot_start(self, **kwargs):
        if self.config.get("dry_run") is not True:
            raise OperationalException("Autobot V2 is currently restricted to dry-run and backtesting.")

    @property
    def protections(self):
        return [
            {"method": "CooldownPeriod", "stop_duration_candles": 6},
            {"method": "StoplossGuard", "lookback_period_candles": 24, "trade_limit": 2,
             "stop_duration_candles": 12, "only_per_pair": False},
        ]

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        for period in (20, 50, 200):
            dataframe[f"ema{period}"] = ta.EMA(dataframe, timeperiod=period)
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)
        dataframe["atr_pct"] = ta.ATR(dataframe, timeperiod=14) / dataframe["close"] * 100
        dataframe["prior_high"] = dataframe["high"].rolling(20).max().shift(1)
        dataframe["return_24h_pct"] = dataframe["close"].pct_change(24) * 100
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["enter_long"] = 0
        dataframe.loc[
            (dataframe["volume"] > 0) & (dataframe["ema50"] > dataframe["ema200"])
            & (dataframe["close"] > dataframe["prior_high"])
            & dataframe["rsi"].between(50, 75) & dataframe["atr_pct"].between(0.1, 4),
            ["enter_long", "enter_tag"],
        ] = (1, "trend_breakout")
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["exit_long"] = 0
        dataframe.loc[(dataframe["volume"] > 0) & (dataframe["close"] < dataframe["ema50"]),
                      ["exit_long", "exit_tag"]] = (1, "trend_lost")
        return dataframe


class AutobotAstra(AutobotBaseline):
    def bot_start(self, **kwargs):
        super().bot_start(**kwargs)
        if self.config["runmode"].value != "dry_run":
            raise OperationalException("Astra requires prospective dry-run; historical model calls would leak future knowledge.")
        self.advisor = AstraAdvisor(self.config["user_data_dir"])
        if not self.advisor.key:
            raise OperationalException("OPENAI_API_KEY is required for the Astra challenger.")
        self.executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="astra")
        self.pending = None
        self.next_check = 0.0

    def bot_loop_start(self, current_time: datetime, **kwargs):
        now = current_time.timestamp()
        if self.pending is not None:
            if not self.pending.done():
                return
            try:
                logger.info("Astra advisor: %s", self.pending.result())
            except Exception as exc:
                logger.warning("Astra advisor unavailable: %s", type(exc).__name__)
            self.pending = None
        if now < self.next_check:
            return
        self.next_check = now + 60
        if self.advisor.latest(now):
            return
        frames = {}
        for pair in self.dp.current_whitelist():
            frame, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
            frames[pair] = frame
        try:
            snapshot = build_snapshot(
                frames, Trade.get_trades_proxy(is_open=True), Trade.get_trades_proxy(is_open=False),
                current_time, self.config, self.wallets.get_free(self.config["stake_currency"]),
                self.wallets.get_total(self.config["stake_currency"]),
            )
        except (ValueError, KeyError, TypeError) as exc:
            logger.warning("Astra context rejected: %s", type(exc).__name__)
            return
        self.pending = self.executor.submit(self.advisor.refresh, snapshot, now)

    def _decision(self, pair, current_time):
        advisor = getattr(self, "advisor", None)
        try:
            plan = advisor.latest(current_time.timestamp()) if advisor else None
            return next((dict(row, position_id=plan.get("position_ids", {}).get(pair))
                         for row in (plan or {}).get("decisions", []) if row["pair"] == pair), None)
        except Exception:
            return None

    def confirm_trade_entry(self, pair, order_type, amount, rate, time_in_force, current_time, entry_tag, side, **kwargs):
        try:
            frame, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
            market_context(pair, frame, current_time)
        except Exception:
            return False
        decision = self._decision(pair, current_time)
        return bool(decision and decision["allow_entry"] and not decision["exit_position"] and decision["stake_multiplier"] > 0)

    def custom_stake_amount(self, pair, current_time, current_rate, proposed_stake, min_stake, max_stake, leverage, entry_tag, side, **kwargs):
        decision = self._decision(pair, current_time)
        if not decision or not decision["allow_entry"]:
            return 0.0
        stake = min(proposed_stake, max_stake, 100) * decision["stake_multiplier"]
        return stake if stake >= (min_stake or 0) else 0.0

    def custom_exit(self, pair, trade, current_time, current_rate, current_profit, **kwargs):
        decision = self._decision(pair, current_time)
        return "astra_exit" if decision and decision["exit_position"] and decision["position_id"] == trade.id else None

    def ft_bot_cleanup(self):
        if getattr(self, "executor", None):
            self.executor.shutdown(wait=False, cancel_futures=True)
        super().ft_bot_cleanup()
