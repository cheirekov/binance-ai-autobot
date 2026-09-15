"""Small V2 dashboard adapter over authenticated Freqtrade APIs."""
import base64
import json
import math
import os
import sqlite3
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


BOTS = {
    "baseline": os.environ.get("BASELINE_API_URL", "http://baseline:8080/api/v1"),
    "astra": os.environ.get("ASTRA_API_URL", "http://astra:8080/api/v1"),
    "momentum": os.environ.get("MOMENTUM_API_URL", "http://momentum:8080/api/v1"),
}
USER = os.environ.get("TRADER_API_USER", "")
PASSWORD = os.environ.get("TRADER_API_PASSWORD", "")
ADVISOR_DB = Path(os.environ.get("ADVISOR_DB", "/data/astra/advisor.sqlite"))
app = FastAPI(title="Autobot V2 Dashboard API", docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=[], allow_methods=["GET", "POST"], allow_headers=[])


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def bot_request(name, path, method="GET"):
    if name not in BOTS or not USER or not PASSWORD:
        raise ValueError("Dashboard API configuration is incomplete")
    auth = base64.b64encode(f"{USER}:{PASSWORD}".encode()).decode()
    request = urllib.request.Request(
        BOTS[name] + path, method=method,
        headers={"Authorization": "Basic " + auth, "Accept": "application/json"},
        data=b"" if method == "POST" else None,
    )
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Freqtrade HTTP {exc.code}") from None


def advisor_snapshot():
    empty = {"available": False, "calls": 0, "knownCostUsd": 0, "reservedCostUsd": 0,
             "latestStatus": None, "latestAt": None, "expiresAt": None, "decisions": []}
    if not ADVISOR_DB.is_file():
        return empty
    uri = ADVISOR_DB.resolve().as_uri() + "?mode=ro"
    with closing(sqlite3.connect(uri, uri=True, timeout=2)) as db:
        db.row_factory = sqlite3.Row
        db.execute("BEGIN")
        totals = db.execute(
            "SELECT COUNT(*) calls, COALESCE(SUM(cost),0) known, "
            "COALESCE(SUM(CASE WHEN cost IS NULL THEN reserved ELSE 0 END),0) reserved FROM requests"
        ).fetchone()
        latest = db.execute(
            "SELECT ts,status,plan,error FROM requests ORDER BY id DESC LIMIT 1"
        ).fetchone()
    result = dict(empty, available=True, calls=totals["calls"],
                  knownCostUsd=totals["known"], reservedCostUsd=totals["reserved"])
    if latest:
        result.update(latestStatus=latest["status"],
                      latestAt=datetime.fromtimestamp(latest["ts"], timezone.utc).isoformat())
        if latest["plan"]:
            plan = json.loads(latest["plan"])
            result.update(expiresAt=datetime.fromtimestamp(plan["expires_at"], timezone.utc).isoformat(),
                          decisions=plan.get("decisions", []))
    return result


def safe_number(value):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) else None


def account_snapshot(name):
    try:
        with ThreadPoolExecutor(max_workers=4) as pool:
            futures = {
                key: pool.submit(bot_request, name, path) for key, path in {
                    "config": "/show_config", "health": "/health", "profit": "/profit",
                    "balance": "/balance", "positions": "/status",
                }.items()
            }
            data = {key: future.result() for key, future in futures.items()}
        config, profit, balance = data["config"], data["profit"], data["balance"]
        positions = [{
            "id": row.get("trade_id"), "pair": row.get("pair"), "openedAt": row.get("open_date"),
            "stake": safe_number(row.get("stake_amount")), "entry": safe_number(row.get("open_rate")),
            "current": safe_number(row.get("current_rate")), "profitQuote": safe_number(row.get("total_profit_abs")),
            "profitPct": safe_number(row.get("profit_pct")), "stop": safe_number(row.get("stop_loss_abs")),
            "pendingOrder": bool(row.get("has_open_orders")),
        } for row in data["positions"]]
        return {
            "reachable": True, "error": None, "state": config.get("state"),
            "running": config.get("state") == "running", "strategy": config.get("strategy"),
            "dryRun": config.get("dry_run") is True, "lastProcess": data["health"].get("last_process"),
            "wallet": {"totalQuote": safe_number(balance.get("total")),
                       "startingQuote": safe_number(balance.get("starting_capital")),
                       "currency": balance.get("stake")},
            "metrics": {key: safe_number(profit.get(key)) for key in (
                "profit_closed_coin", "profit_all_coin", "trade_count", "closed_trade_count",
                "winning_trades", "losing_trades", "profit_factor", "winrate", "expectancy",
                "max_drawdown", "max_drawdown_abs")},
            "openPositions": positions,
        }
    except Exception as exc:
        return {"reachable": False, "running": False, "error": type(exc).__name__,
                "state": "unavailable", "strategy": None, "dryRun": None,
                "lastProcess": None, "wallet": {}, "metrics": {}, "openPositions": []}


def build_snapshot():
    with ThreadPoolExecutor(max_workers=len(BOTS)) as pool:
        accounts = dict(zip(BOTS, pool.map(account_snapshot, BOTS)))
    accounts["astra"]["advisor"] = advisor_snapshot()
    reasons = []
    if not all(account["reachable"] for account in accounts.values()):
        reasons.append("All prospective accounts must be reachable")
    if not all(account.get("dryRun") for account in accounts.values()):
        reasons.append("Comparison is allowed only while all accounts are dry-run")
    for name, account in accounts.items():
        if account.get("openPositions") and any(p["pendingOrder"] for p in account["openPositions"]):
            reasons.append(f"{name} has a pending order")
    return {
        "generatedAt": utc_now(), "product": "Autobot V2", "environment": "dry-run",
        "marketData": "Binance public spot mainnet", "orders": "simulated locally by Freqtrade",
        "accounts": accounts,
        "comparison": {"ready": not reasons, "limitations": reasons or [
            "Account lifetime totals may begin at different times; compare only a separately recorded common interval",
            "Different entry decisions create different capital timing within that common interval",
            "API cost is USD while trading P&L is USDC and is shown separately",
        ]},
        "promotion": {"realMoneyAllowed": False, "reason": "No profitable edge has been validated"},
    }


@app.get("/health")
def health():
    return {"ok": True, "ts": utc_now()}


@app.get("/dashboard/snapshot")
def snapshot():
    return build_snapshot()


@app.post("/bots/{name}/{action}")
def control(name: str, action: str):
    if name not in BOTS or action not in {"start", "stop", "pause"}:
        raise HTTPException(status_code=404, detail="Unknown bot or action")
    try:
        result = bot_request(name, "/" + action, "POST")
        return {"ok": True, "bot": name, "action": action, "result": result}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=type(exc).__name__) from None
