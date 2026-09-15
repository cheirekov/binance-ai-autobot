import unittest
import tempfile
from pathlib import Path

import pandas as pd
from unittest.mock import Mock

from portfolio_research import capped_weights, simulate, volatility_scale, metrics, load_closes, rebalance_after_cost
from MomentumCandidate import AutobotMomentumCandidate


def protocol(cost=0.001):
    return {
        "start": "2026-01-03",
        "end": "2026-01-11",
        "rebalance_weekday_utc": 6,
        "execution_cost_ratio_per_turnover": cost,
        "max_asset_weight": 0.5,
        "volatility_lookback_days": 2,
    }


class PortfolioResearchTests(unittest.TestCase):
    def test_capped_weights_never_use_leverage(self):
        weights = capped_weights(pd.Series({"A": 10.0, "B": 1.0, "C": 1.0}), 0.5)
        self.assertLessEqual(weights.max(), 0.5)
        self.assertLessEqual(weights.sum(), 1.0)
        self.assertAlmostEqual(weights.sum(), 1.0)

    def test_buy_and_hold_charges_initial_turnover_once(self):
        dates = pd.date_range("2026-01-01", periods=12, tz="UTC")
        closes = pd.DataFrame({"A": 100.0, "B": 100.0}, index=dates)
        result = simulate(closes, {"kind": "buy_hold"}, protocol(cost=0.01))
        self.assertAlmostEqual(result.iloc[0]["equity"], 1 / 1.01)
        self.assertEqual((result["turnover"] > 0).sum(), 1)
        self.assertAlmostEqual(result.iloc[-1]["equity"], 1 / 1.01)

    def test_rebalance_cash_conservation_with_fee(self):
        old = pd.Series({"A": 0.4, "B": 0.3})
        desired = pd.Series({"A": 0.1, "B": 0.6})
        remaining, turnover = rebalance_after_cost(old, desired, 0.01)
        self.assertAlmostEqual(remaining + turnover * 0.01, 1.0)
        expected_cash = 1 - old.sum() - (desired * remaining - old).sum() - turnover * 0.01
        self.assertAlmostEqual(expected_cash, remaining * (1 - desired.sum()))

    def test_drawdown_includes_loss_from_starting_capital(self):
        value = metrics(pd.DataFrame({"net_return": [-0.1, 0], "turnover": [1, 0], "exposure": [1, 1]}))
        self.assertAlmostEqual(value["max_drawdown_pct"], 10)

    def test_incomplete_candles_are_not_silently_dropped(self):
        frame = pd.DataFrame({"date": pd.date_range("2025-01-01", periods=18, freq="4h", tz="UTC"),
                              "close": 100.0, "volume": 10.0})
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "BTC_USDC-4h.feather"
            frame.to_feather(path)
            self.assertEqual(len(load_closes(Path(directory), ["BTC/USDC"], "4h", "2025-01-04")), 3)
            for broken in (frame.drop(index=8), frame.drop(index=range(6, 12)), pd.concat([frame, frame.iloc[[0]]])):
                broken.reset_index(drop=True).to_feather(path)
                with self.assertRaises(ValueError):
                    load_closes(Path(directory), ["BTC/USDC"], "4h", "2025-01-04")

    def test_simulation_requires_full_range_and_warmup(self):
        closes = pd.DataFrame({"A": 100.0}, index=pd.date_range("2026-01-01", periods=12, tz="UTC"))
        from_feather = closes.copy()
        from_feather.index = from_feather.index.as_unit("ms")
        self.assertEqual(len(simulate(from_feather, {"kind": "buy_hold"}, protocol())), 8)
        with self.assertRaisesRegex(ValueError, "warmup"):
            simulate(closes, {"kind": "tsmom_equal", "lookback_days": 30}, protocol())
        with self.assertRaisesRegex(ValueError, "calendar day"):
            simulate(closes.drop(closes.index[5]), {"kind": "buy_hold"}, protocol())

    def test_volatility_target_only_reduces_exposure(self):
        dates = pd.date_range("2025-01-01", periods=60, tz="UTC")
        closes = pd.DataFrame({
            "A": [100 * (1.03 if index % 2 else 0.97) ** index for index in range(60)],
            "B": [100 * (1.02 if index % 2 else 0.98) ** index for index in range(60)],
        }, index=dates)
        original = pd.Series({"A": 0.5, "B": 0.5})
        scaled = volatility_scale(original, closes, 59, 30, 0.20)
        self.assertGreaterEqual(scaled.min(), 0)
        self.assertLess(scaled.sum(), original.sum())

    def test_future_price_change_does_not_rewrite_past_results(self):
        dates = pd.date_range("2025-09-01", periods=140, tz="UTC")
        closes = pd.DataFrame({
            "A": [100 + index for index in range(140)],
            "B": [100 + index * 0.5 for index in range(140)],
        }, index=dates)
        config = protocol()
        config.update(start="2026-01-03", end="2026-01-11")
        candidate = {"kind": "tsmom_equal", "lookback_days": 30}
        original = simulate(closes, candidate, config)
        changed = closes.copy()
        change_at = pd.Timestamp("2026-01-08", tz="UTC")
        changed.loc[change_at:, "A"] *= 2
        revised = simulate(changed, candidate, config)
        pd.testing.assert_frame_equal(original.loc[original.index < change_at], revised.loc[revised.index < change_at])
        self.assertNotEqual(original.loc[change_at, "equity"], revised.loc[change_at, "equity"])

    def test_runtime_candidate_sizes_each_asset_to_conservative_risk_budget(self):
        strategy = AutobotMomentumCandidate({
            "stake_currency": "USDC",
            "dry_run": True,
            "max_open_trades": 3,
            "exchange": {"pair_whitelist": ["BTC/USDC", "ETH/USDC", "SOL/USDC"]},
        })
        strategy.dp = Mock()
        strategy.dp.get_analyzed_dataframe.return_value = (
            pd.DataFrame([{"annualized_volatility_30d": 0.6}]), None
        )
        strategy.wallets = Mock()
        strategy.wallets.get_total.return_value = 1000
        stake = strategy.custom_stake_amount(
            "BTC/USDC", None, 100, 100, 10, 1000, 1, None, "long"
        )
        self.assertAlmostEqual(stake, 111.11111111111111)
        self.assertLessEqual(stake, 500)
        for volatility in (float("nan"), float("inf"), 0, -0.6):
            strategy.dp.get_analyzed_dataframe.return_value = (
                pd.DataFrame([{"annualized_volatility_30d": volatility}]), None
            )
            with self.subTest(volatility=volatility):
                self.assertEqual(strategy.custom_stake_amount(
                    "BTC/USDC", None, 100, 100, 10, 1000, 1, None, "long"), 0)


if __name__ == "__main__":
    unittest.main()
