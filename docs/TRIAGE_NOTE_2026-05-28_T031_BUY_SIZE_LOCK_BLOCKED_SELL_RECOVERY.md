# Triage Note — 2026-05-28 — T-031 BUY-size lock blocked SELL recovery

## Observed
- Fresh bundle `autobot-feedback-20260528-105508.tgz` ran deployed commit `2db57ee` and changed the dominant loop away from repeated risk-budget new-exposure blocks.
- Latest runtime state:
  - `risk_state=NORMAL`
  - `daily_net_usdt=-16.21`
  - `max_drawdown_pct=0.93`
  - `open_positions=7`
  - `total_alloc_pct=5.06`
  - largest position `XLMUSDC=4.998%`
- Top skips:
  - `Skip: No feasible candidates after policy/exposure filters (62)`
  - `Skip XLMUSDC: Risk budget market entry cap below exchange minimum (22)`
  - `Skip ZECUSDC: Grid waiting for ladder slot or inventory (21)`
  - `Skip GENIUSUSDC: Risk budget market entry cap below exchange minimum (13)`
- No-feasible recovery attempted but repeatedly reported `No eligible managed positions available for recovery sell`.
- `XLMUSDC` had a large managed position, but also had an active `RISK_BUDGET_MARKET_ENTRY_SIZE` cooldown from the BUY-side min-notional cap path.

## Impact
- `P1` stability.
- BUY-side risk-budget sizing locks correctly suppress new entries, but they should not block managed SELL exits or no-feasible recovery SELLs for existing exposure.
- Because the lock was treated as a generic symbol protection lock, the runtime could keep retrying no-feasible recovery without using the largest sellable managed position to release budget.

## Evidence bundle
- `autobot-feedback-20260528-105508.tgz`
- `data/telemetry/last_run_summary.json`
- `data/state.json`
- `data/telemetry/adaptive-shadow.tail.jsonl`

## Reproduction
- Seen in bundle `autobot-feedback-20260528-105508.tgz`.
- State includes an active `RISK_BUDGET_MARKET_ENTRY_SIZE` lock on `XLMUSDC` while `XLMUSDC` is also the largest managed position.

## Proposed fix
- Keep `T-031` active and make `RISK_BUDGET_MARKET_ENTRY_SIZE` suppress only BUY/new-entry paths, while allowing managed SELL exits and no-feasible recovery SELLs for existing exposure.

## Candidate ticket
- Existing ticket: `T-031`
- Linked support ticket remains: `T-032`

## PM/BA decision
- `interrupt active ticket`
- Owner: PM/BA + Codex
- Due window: before the next long run
- Decision: same-ticket mitigation under `T-031`; do not weaken the risk-budget BUY cap or reopen `T-032`.
