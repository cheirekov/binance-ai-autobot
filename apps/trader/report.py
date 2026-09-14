"""Read-only economic snapshot for the V2 spot experiment, not a performance backtest."""
import argparse
import json
import math
import sqlite3
import urllib.parse
import urllib.request
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from freqtrade.persistence import LocalTrade


def read_database(path, queries):
    # mode=ro prevents a typo from silently creating an empty database.
    with closing(sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)) as db:
        db.row_factory = sqlite3.Row
        db.execute("BEGIN")
        return [[dict(row) for row in db.execute(query)] for query in queries]


def finite(value):
    result = float(value)
    if not math.isfinite(result):
        raise ValueError("Invalid numeric accounting value")
    return result


def public_bid(pair):
    symbol = pair.replace("/", "")
    if not symbol.isascii() or not symbol.isalnum():
        raise ValueError("Invalid pair")
    query = urllib.parse.urlencode({"symbol": symbol})
    with urllib.request.urlopen("https://api.binance.com/api/v3/ticker/bookTicker?" + query, timeout=10) as response:
        value = json.load(response)
    bid = finite(value["bidPrice"])
    if value.get("symbol") != symbol or bid <= 0:
        raise ValueError("Missing valid bid")
    return bid


def economic_snapshot(trades, pending_orders, costs, prices, usdc_usd=None):
    closed = 0.0
    marked_open = 0.0
    opened = []
    problems = []
    for row in trades:
        if row["stake_currency"] != "USDC" or row["trading_mode"] != "spot" or row["is_short"] or row["leverage"] != 1:
            raise ValueError("Report supports only V2 long-only USDC spot trades")
        if not row["is_open"]:
            closed += finite(row["close_profit_abs"])
            continue
        price = finite(prices[row["pair"]])
        if price <= 0:
            raise ValueError("Invalid mark")
        # Use the executor's accounting, including estimated exit fee and already
        # realized partial exits. Do not subtract entry fees a second time.
        profit = finite(LocalTrade(**row).calculate_profit(price).total_profit)
        marked_open += profit
        opened.append({"id": row["id"], "pair": row["pair"], "bid": price,
                       "profit_if_closed_usdc": round(profit, 8)})
    if pending_orders:
        problems.append("Pending orders: fills may change exposure; combined net is withheld")
    known = finite(costs["known_cost_usd"])
    unresolved = finite(costs["unresolved_reserved_usd"])
    total = closed + marked_open
    net = None
    if usdc_usd is not None:
        fx = finite(usdc_usd)
        if fx <= 0:
            raise ValueError("Invalid USDC/USD conversion")
        if not problems:
            net = round(total * fx - known, 8)
    return {
        "closed_trades": sum(not t["is_open"] for t in trades),
        "closed_net_usdc": round(closed, 8), "open_positions": opened,
        "open_including_partial_realized_net_usdc": round(marked_open, 8),
        "trading_net_at_bid_usdc": round(total, 8), "api": costs,
        "assumed_usdc_usd": usdc_usd, "net_after_known_api_usd": net,
        "net_after_api_reservations_usd": round(net - unresolved, 8) if net is not None else None,
        "warnings": problems,
        "limitations": ["Bid marks are indicative, not guaranteed fills; no depth/slippage model",
                        "No USDC=USD assumption unless explicitly supplied",
                        "Server, development/Codex subscription and tax costs are excluded",
                        "Point-in-time P&L only: not a return, drawdown or proof of trading edge"],
    }


def report(directory, ai=False, usdc_usd=None, fetch_price=public_bid):
    trade_path = directory / "trades.sqlite"
    if not trade_path.is_file():
        return {"status": "not_started", "directory": str(directory)}
    trades, orders = read_database(trade_path, ["SELECT * FROM trades", "SELECT id FROM orders WHERE ft_is_open=1"])
    costs = {"calls": 0, "known_cost_usd": 0, "unresolved_reserved_usd": 0}
    if ai:
        if not (directory / "advisor.sqlite").is_file():
            return {"status": "incomplete", "reason": "Advisor accounting database missing"}
        costs = read_database(directory / "advisor.sqlite", [
            "SELECT COUNT(*) AS calls, COALESCE(SUM(cost),0) AS known_cost_usd, "
            "COALESCE(SUM(CASE WHEN cost IS NULL THEN reserved ELSE 0 END),0) AS unresolved_reserved_usd FROM requests"
        ])[0][0]
    prices = {pair: fetch_price(pair) for pair in {t["pair"] for t in trades if t["is_open"]}}
    result = economic_snapshot(trades, orders, costs, prices, usdc_usd)
    result["status"] = "incomplete" if result["warnings"] else "ok"
    result["observed_at"] = datetime.now(timezone.utc).isoformat()
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument("--usdc-usd", type=float, help="Explicit conversion assumption; omit to keep costs separate")
    args = parser.parse_args()
    reports = {}
    for name in ("baseline", "astra"):
        try:
            reports[name] = report(args.data_dir / name, name == "astra", args.usdc_usd)
        except Exception as exc:
            reports[name] = {"status": "unavailable", "error": type(exc).__name__}
    print(json.dumps(reports, indent=2, allow_nan=False))
    return 0 if all(r["status"] == "ok" for r in reports.values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())
