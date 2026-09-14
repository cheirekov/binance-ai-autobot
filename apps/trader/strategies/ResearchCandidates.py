"""Frozen, non-AI strategy candidates for chronological research only.

These candidates intentionally expose no optimizable parameters.  Changing a
threshold creates a new protocol version; it must not rewrite an inspected run.
"""

import talib.abstract as ta
from pandas import DataFrame

from AutobotV2 import AutobotBaseline


class ResearchTrendPullback(AutobotBaseline):
    """Join an established uptrend after price recovers its fast average."""

    minimal_roi = {"0": 0.03}
    stoploss = -0.03
    trailing_stop_positive = 0.012
    trailing_stop_positive_offset = 0.025

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe = super().populate_indicators(dataframe, metadata)
        dataframe["volume_mean_20"] = dataframe["volume"].rolling(20).mean()
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["enter_long"] = 0
        recovered_ema20 = (
            (dataframe["close"] > dataframe["ema20"])
            & (dataframe["close"].shift(1) <= dataframe["ema20"].shift(1))
        )
        dataframe.loc[
            (dataframe["volume"] > 0)
            & (dataframe["volume"] >= dataframe["volume_mean_20"] * 0.8)
            & (dataframe["ema20"] > dataframe["ema50"])
            & (dataframe["ema50"] > dataframe["ema200"])
            & recovered_ema20
            & dataframe["rsi"].between(45, 65)
            & dataframe["atr_pct"].between(0.15, 4),
            ["enter_long", "enter_tag"],
        ] = (1, "trend_pullback")
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["exit_long"] = 0
        dataframe.loc[
            (dataframe["volume"] > 0)
            & ((dataframe["close"] < dataframe["ema50"]) | (dataframe["rsi"] > 75)),
            ["exit_long", "exit_tag"],
        ] = (1, "pullback_exit")
        return dataframe


class ResearchMeanReversion(AutobotBaseline):
    """Buy statistically stretched pullbacks, but only inside a bull regime."""

    minimal_roi = {"0": 0.025}
    stoploss = -0.035
    trailing_stop = False

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe = super().populate_indicators(dataframe, metadata)
        dataframe["bb_mid"] = dataframe["close"].rolling(20).mean()
        deviation = dataframe["close"].rolling(20).std(ddof=0)
        dataframe["bb_lower"] = dataframe["bb_mid"] - 2 * deviation
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["enter_long"] = 0
        dataframe.loc[
            (dataframe["volume"] > 0)
            & (dataframe["ema50"] > dataframe["ema200"])
            & (dataframe["close"] > dataframe["ema200"])
            & (dataframe["close"] < dataframe["bb_lower"])
            & (dataframe["rsi"] < 35)
            & dataframe["atr_pct"].between(0.15, 4),
            ["enter_long", "enter_tag"],
        ] = (1, "bull_mean_reversion")
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["exit_long"] = 0
        dataframe.loc[
            (dataframe["volume"] > 0)
            & ((dataframe["close"] >= dataframe["bb_mid"]) | (dataframe["rsi"] > 58)),
            ["exit_long", "exit_tag"],
        ] = (1, "mean_reversion_exit")
        return dataframe


class ResearchVolatilityBreakout(AutobotBaseline):
    """Require a longer breakout and meaningful volume expansion."""

    minimal_roi = {"0": 0.06}
    stoploss = -0.04
    trailing_stop_positive = 0.02
    trailing_stop_positive_offset = 0.04

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe = super().populate_indicators(dataframe, metadata)
        dataframe["prior_high_55"] = dataframe["high"].rolling(55).max().shift(1)
        dataframe["prior_low_20"] = dataframe["low"].rolling(20).min().shift(1)
        dataframe["volume_mean_20"] = dataframe["volume"].rolling(20).mean()
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["enter_long"] = 0
        dataframe.loc[
            (dataframe["volume"] > dataframe["volume_mean_20"] * 1.2)
            & (dataframe["ema50"] > dataframe["ema200"])
            & (dataframe["close"] > dataframe["prior_high_55"])
            & dataframe["rsi"].between(55, 78)
            & dataframe["atr_pct"].between(0.2, 5),
            ["enter_long", "enter_tag"],
        ] = (1, "volume_breakout_55")
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["exit_long"] = 0
        dataframe.loc[
            (dataframe["volume"] > 0)
            & ((dataframe["close"] < dataframe["prior_low_20"])
               | (dataframe["close"] < dataframe["ema50"])),
            ["exit_long", "exit_tag"],
        ] = (1, "volatility_breakout_exit")
        return dataframe


class Research4hBase(AutobotBaseline):
    """Shared causal indicators for the slower second research protocol."""

    timeframe = "4h"
    startup_candle_count = 240

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        for period in (20, 50, 100, 200):
            dataframe[f"ema{period}"] = ta.EMA(dataframe, timeperiod=period)
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)
        dataframe["adx"] = ta.ADX(dataframe, timeperiod=14)
        dataframe["atr_pct"] = ta.ATR(dataframe, timeperiod=14) / dataframe["close"] * 100
        dataframe["volume_mean_20"] = dataframe["volume"].rolling(20).mean()
        dataframe["prior_high_30"] = dataframe["high"].rolling(30).max().shift(1)
        dataframe["return_7d_pct"] = dataframe["close"].pct_change(42) * 100
        dataframe["ema200_slope_1d_pct"] = dataframe["ema200"].pct_change(6) * 100
        dataframe["bb_mid"] = dataframe["close"].rolling(20).mean()
        deviation = dataframe["close"].rolling(20).std(ddof=0)
        dataframe["bb_lower"] = dataframe["bb_mid"] - 2 * deviation
        return dataframe


class Research4hRegimeBreakout(Research4hBase):
    """Trade breakouts only when long trend and trend strength agree."""

    minimal_roi = {"0": 0.12, "720": 0.08, "1440": 0.05}
    stoploss = -0.06
    trailing_stop = True
    trailing_stop_positive = 0.025
    trailing_stop_positive_offset = 0.05
    trailing_only_offset_is_reached = True

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["enter_long"] = 0
        dataframe.loc[
            (dataframe["volume"] >= dataframe["volume_mean_20"] * 0.9)
            & (dataframe["ema50"] > dataframe["ema200"])
            & (dataframe["ema200_slope_1d_pct"] > 0)
            & (dataframe["close"] > dataframe["prior_high_30"])
            & (dataframe["adx"] > 20)
            & dataframe["rsi"].between(52, 75)
            & dataframe["atr_pct"].between(0.4, 6),
            ["enter_long", "enter_tag"],
        ] = (1, "4h_regime_breakout")
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["exit_long"] = 0
        dataframe.loc[
            (dataframe["volume"] > 0)
            & ((dataframe["close"] < dataframe["ema50"])
               | (dataframe["ema200_slope_1d_pct"] < 0)),
            ["exit_long", "exit_tag"],
        ] = (1, "4h_regime_lost")
        return dataframe


class Research4hSlowTrend(Research4hBase):
    """Hold broad uptrends and ignore fast mean reversions."""

    minimal_roi = {"0": 0.20, "2880": 0.12, "10080": 0.06}
    stoploss = -0.08
    trailing_stop = True
    trailing_stop_positive = 0.035
    trailing_stop_positive_offset = 0.07
    trailing_only_offset_is_reached = True

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["enter_long"] = 0
        recovered_fast_trend = (
            (dataframe["close"] > dataframe["ema20"])
            & (dataframe["close"].shift(1) <= dataframe["ema20"].shift(1))
        )
        dataframe.loc[
            (dataframe["volume"] > 0)
            & (dataframe["ema20"] > dataframe["ema50"])
            & (dataframe["ema50"] > dataframe["ema200"])
            & (dataframe["ema200_slope_1d_pct"] > 0)
            & (dataframe["adx"] > 18)
            & recovered_fast_trend
            & dataframe["return_7d_pct"].between(0, 30)
            & dataframe["atr_pct"].between(0.35, 6),
            ["enter_long", "enter_tag"],
        ] = (1, "4h_slow_trend")
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["exit_long"] = 0
        dataframe.loc[
            (dataframe["volume"] > 0)
            & ((dataframe["close"] < dataframe["ema100"])
               | (dataframe["ema50"] < dataframe["ema200"])),
            ["exit_long", "exit_tag"],
        ] = (1, "4h_slow_trend_lost")
        return dataframe


class Research4hMeanReversion(Research4hBase):
    """Buy deep four-hour pullbacks without fighting the long bull regime."""

    minimal_roi = {"0": 0.05, "1440": 0.03}
    stoploss = -0.06
    trailing_stop = False

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["enter_long"] = 0
        dataframe.loc[
            (dataframe["volume"] > 0)
            & (dataframe["ema50"] > dataframe["ema200"])
            & (dataframe["ema200_slope_1d_pct"] >= 0)
            & (dataframe["close"] > dataframe["ema200"])
            & (dataframe["close"] < dataframe["bb_lower"])
            & (dataframe["rsi"] < 32)
            & dataframe["atr_pct"].between(0.35, 6),
            ["enter_long", "enter_tag"],
        ] = (1, "4h_bull_mean_reversion")
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["exit_long"] = 0
        dataframe.loc[
            (dataframe["volume"] > 0)
            & ((dataframe["close"] >= dataframe["bb_mid"]) | (dataframe["rsi"] > 58)),
            ["exit_long", "exit_tag"],
        ] = (1, "4h_mean_reversion_exit")
        return dataframe
