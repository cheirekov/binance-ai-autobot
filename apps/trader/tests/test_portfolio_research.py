import unittest

import pandas as pd
from unittest.mock import Mock

from portfolio_research import capped_weights, simulate, volatility_scale
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
        self.assertAlmostEqual(result.iloc[0]["equity"], 0.99)
        self.assertEqual((result["turnover"] > 0).sum(), 1)
        self.assertAlmostEqual(result.iloc[-1]["equity"], 0.99)

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
        changed.iloc[-1, 0] *= 100
        revised = simulate(changed, candidate, config)
        pd.testing.assert_frame_equal(original.iloc[:-1], revised.iloc[:-1])

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


if __name__ == "__main__":
    unittest.main()
