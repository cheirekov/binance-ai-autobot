"""Public-data context check; optional bounded model request, never orders."""
import argparse
import json
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from strategies.AutobotV2 import AutobotBaseline
from strategies.astra_advisor import AstraAdvisor
from strategies.market_context import build_snapshot

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy-config", help="Read only the existing OpenAI key; never prints it")
    parser.add_argument("--state-dir", help="Required only for --call-ai")
    parser.add_argument("--call-ai", action="store_true", help="Enable one paid model request")
    args = parser.parse_args()
    if args.call_ai and not args.state_dir:
        parser.error("--call-ai requires --state-dir")
    now = time.time()
    config = json.loads((Path(__file__).parent / "config.json").read_text())
    strategy = AutobotBaseline(config)
    frames = {}
    for pair in config["exchange"]["pair_whitelist"]:
        symbol = pair.replace("/", "")
        with urllib.request.urlopen(f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval=1h&limit=500", timeout=20) as response:
            rows = json.load(response)
        frame = pd.DataFrame([
            {"date": pd.to_datetime(row[0], unit="ms", utc=True),
             "open": float(row[1]), "high": float(row[2]), "low": float(row[3]),
             "close": float(row[4]), "volume": float(row[5])}
            for row in rows if row[6] < now * 1000
        ])
        frames[pair] = strategy.populate_indicators(frame, {})
    snapshot = build_snapshot(frames, [], [], datetime.fromtimestamp(now, timezone.utc), config, 1000, 1000)
    from strategies.astra_advisor import request_body
    print(json.dumps({"context": "valid", "as_of": snapshot["as_of"],
                      "pairs": [m["pair"] for m in snapshot["markets"]],
                      "request_bytes": len(json.dumps(request_body(snapshot)).encode()),
                      "news": snapshot["sources"]["news_and_world_events"], "orders": "disabled"}))
    if not args.call_ai:
        return 0
    key = None
    if args.legacy_config:
        key = json.loads(Path(args.legacy_config).read_text())["basic"]["openai"].get("apiKey", "")
    advisor = AstraAdvisor(args.state_dir, api_key=key, daily_budget=0.20)
    result = advisor.refresh(snapshot, now)
    print(json.dumps({"request": result, "plan": advisor.latest(), "usage": advisor.summary()}, indent=2))
    return 0 if result["status"] == "ok" else 1


if __name__ == "__main__":
    raise SystemExit(main())
