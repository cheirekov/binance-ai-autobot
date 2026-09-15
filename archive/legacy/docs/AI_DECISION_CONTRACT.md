# AI Decision Contract (v1)

This document defines the only allowed interface between AI/ML components and the trading engine.

Goal: AI is action-driving (signals that may influence execution), never action-authoritative (cannot bypass hard limits).

---

## Core principles

1) Engine is final authority
- AI output is input only.
- Engine must enforce:
  - daily loss cap / halt state
  - max allocation / max order notional
  - exchange filters
  - portfolio exposure constraints
  - liquidity gates (spread/volume/depth)

2) Structured JSON only
- Engine consumes JSON only.
- Free-text notes are log-only metadata.

3) Tighten-first safety
- AI may automatically tighten risk.
- AI may not loosen risk automatically unless explicitly enabled and promotion-gated.

4) Budgeted + cached
- AI is bounded by calls/hour, tokens/day, cache TTL.
- If budget is exceeded, mode degrades to shadow-only.

---

## AI slider autonomy mapping

- `0`: AI disabled
- `1-30`: shadow only
- `31-60`: action-driving in Tier-1 universe (BTC/ETH + selected majors like XRP), strict caps
- `61-85`: Tier-2 universe (Top-N liquid), bounded parameter deltas
- `86-100`: Tier-2 + theme baskets, still hard-gated, adaptive thresholds (tighten-first)

Engine must enforce policy even if AI suggests otherwise.

---

## Message envelope (required)

```json
{
  "schema_version": "1.0",
  "request_id": "uuid",
  "generated_at_utc": "2026-02-18T12:00:00Z",
  "messages": []
}
```

Each message requires:
- `schema_version`: `"1.0"`
- `message_type`: `"NEWS_ALPHA_SIGNAL" | "REGIME_SIGNAL" | "PARAMETER_DELTA" | "RISK_ADVICE"`
- `generated_at_utc`: RFC3339
- `model_id`: string
- `request_id`: string
- `ttl_sec`: integer
- `confidence`: number `0..1`

Optional:
- `notes_short` (max 240 chars, log-only)
- `source_event_ids` (event store references)

---

## Message types

### 1) `NEWS_ALPHA_SIGNAL`

Required:
- `symbol` (exchange format, e.g. `XRPUSDT`)
- `side`: `BUY | SELL`
- `horizon_min`
- `half_life_min`
- `expected_edge_bps`
- `expected_vol_bps`
- `p_up`
- `p_down`
- `event_type`: `politics_macro | regulation | etf | exchange | hack | legal | rumor | other`
- `tags`: `string[]`

Optional:
- `affected`: array of `{ symbol, relevance }`
- `time_stop_min`
- `max_adverse_excursion_bps`
- `take_profit_bps`

Engine execution gate:
- confidence >= configured minimum
- within TTL
- net edge above fees/slippage/safety buffer
- symbol allowed by AI tier
- liquidity gates pass
- risk state allows new risk

### 2) `REGIME_SIGNAL`

Required:
- `scope`: `GLOBAL | SYMBOL`
- `symbol` (required for `SYMBOL`)
- `regime`: `risk_on | risk_off | range | trend_up | trend_down | high_vol | low_vol`
- `duration_hint_min`
- `features`: `string[]`

Rule:
- May influence scoring/lane selection.
- Must not bypass hard protection locks.

### 3) `PARAMETER_DELTA`

Required:
- `target`: `GRID | MARKET | NEWS_ALPHA | GLOBAL`
- `deltas`: array of
  - `path`
  - `op`: `SET | MULTIPLY | ADD`
  - `value`
  - `bound_min`
  - `bound_max`
- `reason_code`: `VOLATILITY_CHANGE | SPREAD_WIDEN | DRIFT | CHURN | DRAWDOWN | OPPORTUNITY`

Rules:
- Enabled only for higher AI autonomy tiers.
- Bounds are mandatory.
- Default policy is tighten-only.

### 4) `RISK_ADVICE`

Required:
- `action`: `TIGHTEN | PAUSE_ENTRIES | UNWIND_ONLY | RESUME`
- `scope`: `GLOBAL | SYMBOL`
- `symbol` (required for `SYMBOL`)
- `reason_code`: `DRAWDOWN | LOSS_STREAK | VOL_SPIKE | OUTAGE | MODEL_HEALTH | BUDGET | LIQUIDITY`
- `recommended_duration_min`

Rules:
- Tighten actions are always safe candidates.
- `RESUME` never overrides hard HALT logic.
