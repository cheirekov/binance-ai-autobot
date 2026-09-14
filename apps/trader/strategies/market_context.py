"""Point-in-time inputs, not a news feed or a claim of predictive skill."""
import math
from datetime import timedelta


def number(value):
    result = float(value)
    if not math.isfinite(result):
        raise ValueError("Non-finite context value")
    return round(result, 6)


def market_context(pair, frame, now):
    if len(frame) < 200 or now.utcoffset() is None:
        raise ValueError("Insufficient history or naive clock")
    # Do not silently discard future/incomplete data: a provider contract failure
    # must block new model decisions. All timestamps denote candle OPEN times.
    recent = frame.tail(200)
    dates = recent["date"]
    if dates.dt.tz is None or not dates.is_monotonic_increasing or dates.duplicated().any():
        raise ValueError("Invalid candle timestamps")
    if not dates.diff().iloc[1:].eq(timedelta(hours=1)).all():
        raise ValueError("Missing hourly candles")
    last = recent.iloc[-1]
    age = (now - last["date"].to_pydatetime()).total_seconds()
    if not 3600 <= age <= 7500:
        raise ValueError("Incomplete or stale candle")
    for _, row in recent.iterrows():
        o, h, l, c, v = (number(row[k]) for k in ("open", "high", "low", "close", "volume"))
        if min(o, h, l, c) <= 0 or v <= 0 or not l <= min(o, c) <= max(o, c) <= h:
            raise ValueError("Invalid or zero-volume OHLCV candle")

    def blocks(hours, count):
        data = recent.tail(hours * count)
        result = []
        for start in range(0, len(data), hours):
            chunk = data.iloc[start:start + hours]
            result.append([chunk.iloc[0]["date"].isoformat(),
                           number(chunk.iloc[0]["open"]), number(chunk["high"].max()),
                           number(chunk["low"].min()), number(chunk.iloc[-1]["close"]),
                           number(chunk["volume"].sum())])
        return result

    return {
        "pair": pair, "candle_open": last["date"].isoformat(),
        "last_close_at": (last["date"] + timedelta(hours=1)).isoformat(),
        **{k: number(last[k]) for k in
           ("close", "ema20", "ema50", "ema200", "rsi", "atr_pct", "return_24h_pct")},
        "columns": ["open_at_utc", "open", "high", "low", "close", "base_volume"],
        "trailing_48h_4h_blocks": blocks(4, 12),
        "trailing_7d_24h_blocks": blocks(24, 7),
    }


def build_snapshot(frames, open_trades, closed_trades, now, config, free_quote, total_quote):
    markets = [market_context(pair, frame, now) for pair, frame in sorted(frames.items())]
    if not markets:
        raise ValueError("No markets")
    prices = {m["pair"]: m["close"] for m in markets}
    positions = []
    for trade in open_trades:
        if trade.pair not in prices or trade.open_date_utc > now:
            raise ValueError("Uncovered or future position")
        positions.append({"id": trade.id, "pair": trade.pair,
                          "open_at": trade.open_date_utc.isoformat(),
                          "open_rate": number(trade.open_rate), "stake": number(trade.stake_amount),
                          "profit_ratio_at_last_candle_after_fees": number(trade.calc_profit_ratio(prices[trade.pair])),
                          "pending_order": bool(trade.has_open_orders)})
    # Selection is chronological, never filtered by winning outcome. Future rows
    # indicate a bad clock/database, not extra examples to show to the model.
    if any(t.close_date_utc is None or t.close_date_utc > now for t in closed_trades):
        raise ValueError("Future or missing trade close timestamp")
    history = sorted(closed_trades, key=lambda t: (t.close_date_utc, t.id))[-20:]
    return {
        "context_version": 1, "as_of": now.isoformat(), "mode": "prospective_dry_run",
        "sources": {"market": "Binance public spot closed 1h OHLCV via Freqtrade",
                    "portfolio": "this strategy's simulated Freqtrade account",
                    "news_and_world_events": "unavailable; no external news source connected"},
        "markets": markets, "positions": positions,
        "portfolio": {"quote_currency": config["stake_currency"],
                      "free_quote": number(free_quote), "total_quote": number(total_quote)},
        "recent_closed_trades": [{"id": t.id, "pair": t.pair,
                                  "open_at": t.open_date_utc.isoformat(), "close_at": t.close_date_utc.isoformat(),
                                  "net_profit_quote": number(t.close_profit_abs),
                                  "exit_reason": t.exit_reason} for t in history],
        "history_selection": {"rule": "latest up to 20 closed trades, wins and losses; may be shortened for input budget",
                              "shown_count": len(history), "truncated_for_input_budget": False,
                              "total_closed_count": len(closed_trades),
                              "not_included": "counterfactual missed opportunities; external traders' records"},
        "limits": {"max_positions": config["max_open_trades"],
                   "stake_cap_quote": min(float(config["stake_amount"]), 100),
                   "assumed_fee_ratio_per_side": config.get("fee", 0.001),
                   "stoploss_ratio": config.get("stoploss", -0.03)},
    }
