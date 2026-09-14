import tempfile
import unittest
import zipfile
from pathlib import Path

from research import aggregate, extract_result
from ResearchCandidates import (
    ResearchMeanReversion,
    ResearchTrendPullback,
    ResearchVolatilityBreakout,
)


def row(profits, drawdown=2):
    return {
        "trades": len(profits),
        "profit_abs": sum(profits),
        "return_pct": sum(profits) / 10,
        "profit_factor": None,
        "max_drawdown_pct": drawdown,
        "wins": sum(value > 0 for value in profits),
        "losses": sum(value < 0 for value in profits),
        "trade_profits": profits,
    }


class ResearchTests(unittest.TestCase):
    def setUp(self):
        self.gate = {
            "min_total_trades": 4,
            "min_profit_factor": 1.15,
            "min_positive_fold_ratio": 0.6,
            "min_total_return_pct": 0,
            "max_drawdown_pct": 10,
            "max_worst_fold_loss_pct": 5,
        }

    def test_gate_aggregates_profit_factor_from_trades(self):
        result = aggregate([row([2, -1]), row([3, -1])], self.gate)
        self.assertEqual(result["trades"], 4)
        self.assertEqual(result["profit_factor"], 2.5)
        self.assertTrue(result["screening_pass"])

    def test_every_gate_is_binding(self):
        cases = [
            [row([1])],
            [row([1, -2]), row([1, -2])],
            [row([-1, -1]), row([3, 1])],
            [row([2, -1], drawdown=11), row([2, -1])],
            [row([-60, 1]), row([70, 1])],
        ]
        for rows in cases:
            with self.subTest(rows=rows):
                self.assertFalse(aggregate(rows, self.gate)["screening_pass"])

    def test_archive_requires_exactly_one_primary_json(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / "result.zip"
            with zipfile.ZipFile(archive, "w") as bundle:
                bundle.writestr("result.json", '{"strategy": {}}')
                bundle.writestr("result_config.json", "{}")
            self.assertEqual(extract_result(archive), {"strategy": {}})

    def test_candidate_signals_do_not_change_when_future_rows_are_appended(self):
        import pandas as pd

        rows = [{
            "open": 100 + index * 0.03,
            "high": 101 + index * 0.03,
            "low": 99 + index * 0.03,
            "close": 100 + index * 0.03,
            "volume": 1000 + index % 17,
        } for index in range(500)]
        for strategy_type in (
            ResearchTrendPullback, ResearchMeanReversion, ResearchVolatilityBreakout
        ):
            strategy = strategy_type({"stake_currency": "USDC", "dry_run": True})

            def calculate(source):
                frame = strategy.populate_indicators(pd.DataFrame(source), {})
                frame = strategy.populate_entry_trend(frame, {})
                return strategy.populate_exit_trend(frame, {})

            whole = calculate(rows)
            prefix = calculate(rows[:450])
            with self.subTest(strategy=strategy_type.__name__):
                pd.testing.assert_frame_equal(whole.iloc[:450], prefix)


if __name__ == "__main__":
    unittest.main()
