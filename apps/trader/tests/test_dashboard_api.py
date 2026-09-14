import json
import os
import sqlite3
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import dashboard_api


def responses(path):
    if path == "/show_config":
        return {"state": "running", "strategy": "AutobotBaseline", "dry_run": True}
    if path == "/health":
        return {"last_process": "2026-09-14T10:00:00+00:00"}
    if path == "/profit":
        return {"profit_closed_coin": 2.5, "profit_all_coin": 1.5, "trade_count": 3,
                "closed_trade_count": 2, "winning_trades": 1, "losing_trades": 1,
                "profit_factor": 1.2, "winrate": 0.5, "expectancy": 0.1,
                "max_drawdown": 0.02, "max_drawdown_abs": 20}
    if path == "/balance":
        return {"total": 1001.5, "starting_capital": 1000, "stake": "USDC"}
    if path == "/status":
        return [{"trade_id": 7, "pair": "BTC/USDC", "open_date": "2026-09-14T09:00:00Z",
                 "stake_amount": 100, "open_rate": 100, "current_rate": 101,
                 "total_profit_abs": 0.8, "profit_pct": 0.8, "stop_loss_abs": 97,
                 "has_open_orders": False}]
    raise AssertionError(path)


class DashboardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.old_db = dashboard_api.ADVISOR_DB
        dashboard_api.ADVISOR_DB = Path(self.temp.name) / "advisor.sqlite"
        self.addCleanup(setattr, dashboard_api, "ADVISOR_DB", self.old_db)

    def test_snapshot_is_truthful_and_costs_separate(self):
        with closing(sqlite3.connect(dashboard_api.ADVISOR_DB)) as db:
            db.execute("CREATE TABLE requests (id,ts,reserved,cost,status,plan,error)")
            plan = {"expires_at": 2000, "decisions": [{"pair": "BTC/USDC", "allow_entry": False,
                    "stake_multiplier": 0, "exit_position": False, "reason": "No breakout"}]}
            db.execute("INSERT INTO requests VALUES (1,1000,0.1,0.02,'ok',?,NULL)", (json.dumps(plan),))
            db.commit()
        with patch.object(dashboard_api, "bot_request", side_effect=lambda _name, path, method="GET": responses(path)):
            result = dashboard_api.build_snapshot()
        self.assertTrue(result["comparison"]["ready"])
        self.assertFalse(result["promotion"]["realMoneyAllowed"])
        self.assertEqual(result["accounts"]["baseline"]["metrics"]["profit_all_coin"], 1.5)
        self.assertEqual(result["accounts"]["astra"]["advisor"]["knownCostUsd"], 0.02)
        self.assertNotIn("netAfterAi", result["accounts"]["astra"])

    def test_unreachable_bot_blocks_comparison_without_leaking_error(self):
        def call(name, path, method="GET"):
            if name == "astra":
                raise TimeoutError("Bearer secret")
            return responses(path)
        with patch.object(dashboard_api, "bot_request", side_effect=call):
            result = dashboard_api.build_snapshot()
        self.assertFalse(result["comparison"]["ready"])
        self.assertEqual(result["accounts"]["astra"]["error"], "TimeoutError")
        self.assertNotIn("secret", json.dumps(result))

    def test_pending_order_blocks_comparison(self):
        def call(_name, path, method="GET"):
            value = responses(path)
            if path == "/status":
                value[0]["has_open_orders"] = True
            return value
        with patch.object(dashboard_api, "bot_request", side_effect=call):
            result = dashboard_api.build_snapshot()
        self.assertFalse(result["comparison"]["ready"])
        self.assertTrue(any("pending" in reason for reason in result["comparison"]["limitations"]))

    def test_control_allowlist(self):
        with self.assertRaises(Exception):
            dashboard_api.control("baseline", "forceexit")

    def test_non_finite_metrics_are_not_serialized(self):
        self.assertIsNone(dashboard_api.safe_number(float("inf")))
        self.assertIsNone(dashboard_api.safe_number(float("nan")))
