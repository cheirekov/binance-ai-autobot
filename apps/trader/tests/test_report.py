import sys
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from report import economic_snapshot, report


def trade(**changes):
    value = {"id": 1, "pair": "BTC/USDC", "stake_currency": "USDC", "trading_mode": "spot",
             "is_short": False, "leverage": 1, "is_open": True, "amount": 1,
             "open_rate": 100, "fee_open": 0.01, "fee_close": 0.01,
             "realized_profit": 0, "max_stake_amount": 100, "close_profit_abs": None}
    return dict(value, **changes)


COST = {"calls": 1, "known_cost_usd": 1, "unresolved_reserved_usd": 2}


class ReportTests(unittest.TestCase):
    def test_open_and_closed_profit_fees_counted_once(self):
        result = economic_snapshot([trade(), trade(id=2, is_open=False, close_profit_abs=7.9)], [], COST,
                                   {"BTC/USDC": 110}, 1)
        # Buy 100 + fee 1; sell 110 - fee 1.1 = 7.9, not 6.9.
        self.assertAlmostEqual(result["open_including_partial_realized_net_usdc"], 7.9)
        self.assertAlmostEqual(result["trading_net_at_bid_usdc"], 15.8)
        self.assertAlmostEqual(result["net_after_known_api_usd"], 14.8)
        self.assertAlmostEqual(result["net_after_api_reservations_usd"], 12.8)

    def test_unrealized_loss_not_hidden_by_closed_wins(self):
        result = economic_snapshot([trade(), trade(id=2, is_open=False, close_profit_abs=5)], [], COST,
                                   {"BTC/USDC": 90}, 1)
        self.assertLess(result["net_after_known_api_usd"], 0)

    def test_partial_realized_added_once(self):
        result = economic_snapshot([trade(realized_profit=2)], [], COST, {"BTC/USDC": 110})
        self.assertAlmostEqual(result["trading_net_at_bid_usdc"], 9.9)
        self.assertIsNone(result["net_after_known_api_usd"])

    def test_pending_orders_withhold_combined_net(self):
        result = economic_snapshot([trade()], [{"id": 1}], COST, {"BTC/USDC": 110}, 1)
        self.assertIsNone(result["net_after_known_api_usd"])
        self.assertTrue(result["warnings"])

    def test_unsupported_or_missing_accounting_is_rejected(self):
        for row in [trade(is_short=True), trade(leverage=2), trade(is_open=False)]:
            with self.assertRaises((ValueError, TypeError)):
                economic_snapshot([row], [], COST, {"BTC/USDC": 110}, 1)

    def test_missing_database_is_not_zero_profit(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertEqual(report(Path(directory))["status"], "not_started")
            self.assertFalse((Path(directory) / "trades.sqlite").exists())

    def test_read_only_report_reads_real_sqlite_schema(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            row = trade()
            with closing(sqlite3.connect(path / "trades.sqlite")) as db:
                db.execute("CREATE TABLE trades (" + ",".join(row) + ")")
                db.execute("INSERT INTO trades VALUES (" + ",".join("?" for _ in row) + ")", list(row.values()))
                db.execute("CREATE TABLE orders (id, ft_is_open)")
                db.commit()
            result = report(path, usdc_usd=1, fetch_price=lambda _: 110)
            self.assertEqual(result["status"], "ok")
            self.assertAlmostEqual(result["net_after_known_api_usd"], 7.9)
            self.assertEqual(report(path, ai=True)["status"], "incomplete")
