"""Conservative Freqtrade translation of the portfolio TSMOM research lead."""

import math

import numpy as np
from pandas import DataFrame

from AutobotV2 import AutobotBaseline


class AutobotMomentumCandidate(AutobotBaseline):
    """Weekly 30-day time-series momentum with a conservative volatility stake."""

    timeframe = "4h"
    startup_candle_count = 200
    minimal_roi = {"0": 100.0}
    stoploss = -0.20
    trailing_stop = False
    target_portfolio_volatility = 0.20

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        returns = dataframe["close"].pct_change()
        dataframe["momentum_30d"] = dataframe["close"].pct_change(180)
        dataframe["annualized_volatility_30d"] = returns.rolling(180).std(ddof=0) * math.sqrt(6 * 365)
        dataframe["weekly_rebalance"] = (
            (dataframe["date"].dt.weekday == 6) & (dataframe["date"].dt.hour == 20)
        )
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["enter_long"] = 0
        dataframe.loc[
            (dataframe["volume"] > 0)
            & dataframe["weekly_rebalance"]
            & (dataframe["momentum_30d"] > 0)
            & np.isfinite(dataframe["annualized_volatility_30d"])
            & (dataframe["annualized_volatility_30d"] > 0),
            ["enter_long", "enter_tag"],
        ] = (1, "weekly_tsmom30")
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["exit_long"] = 0
        dataframe.loc[
            (dataframe["volume"] > 0)
            & dataframe["weekly_rebalance"]
            & (dataframe["momentum_30d"] <= 0),
            ["exit_long", "exit_tag"],
        ] = (1, "weekly_tsmom30_off")
        return dataframe

    def custom_stake_amount(
        self, pair, current_time, current_rate, proposed_stake, min_stake,
        max_stake, leverage, entry_tag, side, **kwargs,
    ):
        try:
            frame, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
            volatility = float(frame.iloc[-1]["annualized_volatility_30d"])
            capital = float(self.wallets.get_total(self.config["stake_currency"]))
            configured_slots = int(self.config.get("max_open_trades", 3))
            pair_count = len(self.config.get("exchange", {}).get("pair_whitelist", [])) or 3
            slots = max(1, min(configured_slots, pair_count))
            weight = min(0.5, (self.target_portfolio_volatility / slots) / volatility)
            stake = min(capital * weight, max_stake)
            return stake if math.isfinite(stake) and stake >= (min_stake or 0) else 0.0
        except (KeyError, TypeError, ValueError, IndexError, ZeroDivisionError):
            return 0.0
