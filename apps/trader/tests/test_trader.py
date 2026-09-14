import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

from astra_advisor import AstraAdvisor, INTERVAL, validate_plan
from AutobotV2 import AutobotAstra, AutobotBaseline
from market_context import market_context, build_snapshot


def candles(now):
    import pandas as pd
    dates = pd.date_range(end=now.replace(minute=0, second=0, microsecond=0), periods=501, freq="h", tz="UTC")[:-1]
    frame = pd.DataFrame([{"date": date, "open": 100 + i * 0.1, "high": 101 + i * 0.1,
                           "low": 99 + i * 0.1, "close": 100 + i * 0.1, "volume": 1000}
                          for i, date in enumerate(dates)])
    return AutobotBaseline({"stake_currency": "USDC", "dry_run": True}).populate_indicators(frame, {})


def plan():
    return {"decisions": [{"pair": "BTC/USDC", "allow_entry": True,
                           "stake_multiplier": 0.5, "exit_position": False, "reason": "test"}]}


def response():
    return {"id": "test-response", "status": "completed", "usage": {"input_tokens": 100, "output_tokens": 100},
            "output": [{"type": "message", "content": [{"type": "output_text", "text": json.dumps(plan())}]}]}


class AdvisorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.snapshot = {"markets": [{"pair": "BTC/USDC"}]}
        self.calls = []

    def transport(self, body):
        self.calls.append(body)
        return response()

    def advisor(self, **kwargs):
        return AstraAdvisor(self.temp.name, api_key="test-never-send", transport=kwargs.pop("transport", self.transport), **kwargs)

    def test_real_request_contract_and_durable_cooldown(self):
        advisor = self.advisor()
        self.assertEqual(advisor.refresh(self.snapshot, 1000)["status"], "ok")
        self.assertEqual(self.calls[0]["model"], "gpt-6-astra")
        self.assertTrue(self.calls[0]["text"]["format"]["strict"])
        self.assertNotIn("temperature", self.calls[0])
        self.assertEqual(self.advisor().refresh(self.snapshot, 1001)["status"], "cooldown")
        self.assertEqual(len(self.calls), 1)
        self.assertIsNotNone(advisor.latest(1001))
        self.assertIsNone(advisor.latest(1000 + INTERVAL))
        self.assertAlmostEqual(advisor.summary()["known_cost_usd"], 0.006)

    def test_budget_blocks_before_network(self):
        self.assertEqual(self.advisor(daily_budget=0).refresh(self.snapshot, 1000)["status"], "budget_exhausted")
        self.assertEqual(self.calls, [])

    def test_large_history_is_bounded_and_truncation_disclosed(self):
        self.snapshot["recent_closed_trades"] = [{"id": i, "reason": "x" * 1000} for i in range(20)]
        advisor = self.advisor()
        self.assertEqual(advisor.refresh(self.snapshot, 1000)["status"], "ok")
        actual = json.loads(self.calls[0]["input"][1]["content"])
        self.assertTrue(actual["history_selection"]["truncated_for_input_budget"])
        self.assertLess(len(actual["recent_closed_trades"]), 20)
        self.assertEqual(actual["recent_closed_trades"][-1]["id"], 19)
        self.assertEqual(len(self.snapshot["recent_closed_trades"]), 20)
        self.assertLessEqual(len(json.dumps(self.calls[0]).encode()), 12000)

    def test_unknown_request_cost_remains_reserved_after_failure(self):
        def fail(_):
            raise TimeoutError("Bearer secret-must-not-be-saved")
        advisor = self.advisor(transport=fail)
        self.assertEqual(advisor.refresh(self.snapshot, 1000), {"status": "error", "error": "TimeoutError"})
        self.assertIsNone(advisor.latest(1001))
        self.assertGreater(advisor.summary()["unresolved_reserved_usd"], 0)
        self.assertNotIn(b"secret-must-not-be-saved", Path(advisor.path).read_bytes())

    def test_schema_rejects_unsafe_or_incomplete_decisions(self):
        for replacement in [2, -1, float("nan"), True]:
            value = plan()
            value["decisions"][0]["stake_multiplier"] = replacement
            with self.assertRaises(ValueError):
                validate_plan(value, {"BTC/USDC"})
        value = plan()
        value["decisions"][0]["exit_position"] = True
        with self.assertRaises(ValueError):
            validate_plan(value, {"BTC/USDC"})
        with self.assertRaises(ValueError):
            validate_plan(plan(), {"ETH/USDC"})

    def test_refusal_is_not_a_trading_plan(self):
        advisor = self.advisor(transport=lambda _: {"status": "completed", "output": []})
        self.assertEqual(advisor.refresh(self.snapshot, 1000)["status"], "error")
        self.assertIsNone(advisor.latest(1001))

    def test_entry_gate_sizing_and_exit_independence(self):
        strategy = AutobotAstra({"stake_currency": "USDC", "dry_run": True})
        now = datetime.fromtimestamp(1000, timezone.utc)
        strategy.dp = Mock()
        strategy.dp.get_analyzed_dataframe.return_value = (candles(now), now)
        args = ("BTC/USDC", "market", 1, 100, "GTC", now, None, "long")
        self.assertFalse(strategy.confirm_trade_entry(*args))
        strategy.advisor = self.advisor()
        strategy.advisor.refresh(self.snapshot, 1000)
        self.assertTrue(strategy.confirm_trade_entry(*args))
        self.assertEqual(strategy.custom_stake_amount("BTC/USDC", now, 100, 100, 10, 1000, 1, None, "long"), 50)
        self.assertEqual(strategy.custom_stake_amount("BTC/USDC", now, 100, 100, 60, 1000, 1, None, "long"), 0)
        self.assertNotIn("confirm_trade_exit", AutobotAstra.__dict__)
        self.assertEqual(strategy.stoploss, AutobotBaseline.stoploss)
        late = datetime.fromtimestamp(1000 + INTERVAL, timezone.utc)
        self.assertFalse(strategy.confirm_trade_entry(*args[:5], late, None, "long"))

    def test_corrupt_cached_plan_fails_closed(self):
        advisor = self.advisor()
        advisor.refresh(self.snapshot, 1000)
        with advisor._db() as db:
            value = json.loads(db.execute("SELECT plan FROM requests").fetchone()[0])
            value["decisions"][0]["stake_multiplier"] = 100
            db.execute("UPDATE requests SET plan=?", (json.dumps(value),))
        strategy = AutobotAstra({"stake_currency": "USDC", "dry_run": True})
        strategy.advisor = advisor
        self.assertIsNone(strategy._decision("BTC/USDC", datetime.fromtimestamp(1001, timezone.utc)))

    def test_exit_plan_cannot_close_a_different_position(self):
        value = plan()
        value["decisions"][0].update(allow_entry=False, exit_position=True)
        reply = response()
        reply["output"][0]["content"][0]["text"] = json.dumps(value)
        advisor = self.advisor(transport=lambda _: reply)
        self.snapshot["positions"] = [{"pair": "BTC/USDC", "id": 42}]
        advisor.refresh(self.snapshot, 1000)
        strategy = AutobotAstra({"stake_currency": "USDC", "dry_run": True})
        strategy.advisor = advisor
        now = datetime.fromtimestamp(1001, timezone.utc)
        self.assertEqual(strategy.custom_exit("BTC/USDC", SimpleNamespace(id=42), now, 100, 0), "astra_exit")
        self.assertIsNone(strategy.custom_exit("BTC/USDC", SimpleNamespace(id=43), now, 100, 0))

    def test_stale_market_blocks_even_valid_plan(self):
        now = datetime.fromtimestamp(1000, timezone.utc)
        strategy = AutobotAstra({"stake_currency": "USDC", "dry_run": True})
        strategy.advisor = self.advisor()
        strategy.advisor.refresh(self.snapshot, 1000)
        strategy.dp = Mock()
        strategy.dp.get_analyzed_dataframe.return_value = (candles(now).iloc[:-3], now)
        self.assertFalse(strategy.confirm_trade_entry("BTC/USDC", "market", 1, 100, "GTC", now, None, "long"))

    def test_baseline_indicators_have_no_future_dependency(self):
        import pandas as pd
        rows = [{"open": 100 + i * 0.1, "high": 100.2 + i * 0.1, "low": 99.8 + i * 0.1,
                 "close": 100 + i * 0.1, "volume": 1000} for i in range(500)]
        strategy = AutobotBaseline({"stake_currency": "USDC", "dry_run": True})
        whole = strategy.populate_indicators(pd.DataFrame(rows), {})
        prefix = strategy.populate_indicators(pd.DataFrame(rows[:450]), {})
        pd.testing.assert_frame_equal(whole.iloc[:450], prefix)

    def test_live_mode_cannot_start(self):
        from freqtrade.exceptions import OperationalException
        with self.assertRaises(OperationalException):
            AutobotBaseline({"stake_currency": "USDC", "dry_run": False})


class ContextTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 9, 14, 10, 5, tzinfo=timezone.utc)
        self.frame = candles(self.now)

    def test_history_windows_contain_only_closed_data(self):
        result = market_context("BTC/USDC", self.frame, self.now)
        self.assertEqual(len(result["trailing_48h_4h_blocks"]), 12)
        self.assertEqual(len(result["trailing_7d_24h_blocks"]), 7)
        self.assertEqual(result["trailing_48h_4h_blocks"][-1][4], self.frame.iloc[-1]["close"])
        self.assertLessEqual(datetime.fromisoformat(result["last_close_at"]), self.now)

    def test_bad_data_is_rejected(self):
        for frame in [self.frame.iloc[:-3], self.frame.drop(self.frame.index[-5]),
                      self.frame.iloc[-100:], self.frame.iloc[::-1]]:
            with self.assertRaises(ValueError):
                market_context("BTC/USDC", frame, self.now)
        for column, value in [("close", float("nan")), ("volume", 0), ("high", 1),
                              ("date", self.now)]:
            frame = self.frame.copy()
            frame.loc[frame.index[-1], column] = value
            with self.assertRaises(ValueError):
                market_context("BTC/USDC", frame, self.now)

    def test_history_includes_losses_and_payload_fits_budget(self):
        from astra_advisor import request_body
        config = {"stake_currency": "USDC", "max_open_trades": 2, "stake_amount": 80}
        trades = [SimpleNamespace(id=i, pair="BTC/USDC", open_date_utc=self.now,
                                  close_date_utc=self.now, close_profit_abs=(-1)**i,
                                  exit_reason="stop_loss" if i % 2 else "roi") for i in range(25)]
        frames = {pair: self.frame for pair in ("BTC/USDC", "ETH/USDC", "SOL/USDC")}
        snapshot = build_snapshot(frames, [], trades, self.now, config, 1000, 1000)
        self.assertEqual(len(snapshot["recent_closed_trades"]), 20)
        self.assertEqual(snapshot["history_selection"]["total_closed_count"], 25)
        self.assertTrue(any(t["net_profit_quote"] < 0 for t in snapshot["recent_closed_trades"]))
        self.assertEqual(snapshot["limits"]["stake_cap_quote"], 80)
        self.assertIn("unavailable", snapshot["sources"]["news_and_world_events"])
        self.assertLessEqual(len(json.dumps(request_body(snapshot)).encode()), 12000)

    def test_future_trade_rejected(self):
        from datetime import timedelta
        trade = SimpleNamespace(close_date_utc=self.now + timedelta(seconds=1))
        with self.assertRaises(ValueError):
            build_snapshot({"BTC/USDC": self.frame}, [], [trade], self.now, {}, 1000, 1000)


if __name__ == "__main__":
    unittest.main()
