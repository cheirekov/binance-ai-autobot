import unittest
import pandas as pd
from momentum_audit import drawdown, block_interval, daily_closing_equity


class AuditTests(unittest.TestCase):
    def test_final_midnight_is_not_an_extra_day(self):
        marked = pd.Series([100, 101, 102, 103], index=pd.to_datetime([
            "2026-01-01T04:00:00Z", "2026-01-02T00:00:00Z",
            "2026-01-02T04:00:00Z", "2026-01-03T00:00:00Z"]).as_unit("us"))
        self.assertEqual(daily_closing_equity(marked).tolist(), [101, 103])

    def test_drawdown_is_relative_and_includes_initial_loss(self):
        self.assertAlmostEqual(drawdown([90, 100, 150, 130], 100), 100 * 20 / 150)
        self.assertAlmostEqual(drawdown([80, 80], 100), 20)

    def test_block_interval_is_reproducible_and_preserves_constant_returns(self):
        settings = {"seed": 13, "block_days": 30, "samples": 100}
        low, high = block_interval([0.001] * 60, settings)
        self.assertAlmostEqual(low, high)
        self.assertAlmostEqual(low, ((1.001 ** 365) - 1) * 100)
        values = [0.01, -0.02, 0.0] * 20
        self.assertEqual(block_interval(values, settings), block_interval(values, settings))
