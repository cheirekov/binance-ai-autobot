# Triage Note — 2026-03-30 — T-031 → T-032 pivot

## Observed
- Fresh runtime evidence is no longer dominated by strategy-quality dead ends.
- The latest fresh bundles are dominated by `CAUTION` global new-symbol pause while the book is already almost flat:
  - `Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered)`
  - `Skip BTCUSDC: Daily loss caution paused GRID BUY leg`
- Raw state audit shows `activeOrders=0`, near-zero managed exposure, and latest decision `no managed inventory`, yet CAUTION still blocks re-entry.

## Impact
- `P1` stability

## Evidence bundle
- `autobot-feedback-20260330-082950.tgz`
- `autobot-feedback-20260329-150750.tgz`

## Reproduction
- Seen in fresh bundles above after the March 28-29 `T-031` slices are already deployed.
- Runtime remains in `CAUTION` with nearly flat exposure/order state and keeps emitting global new-symbol pause skips.

## Proposed fix
- Pivot active development back to `T-032` and thaw `ABS_DAILY_LOSS` CAUTION once managed exposure, countable managed positions, and active orders are effectively flat.

## Candidate ticket
- `T-032`

## PM/BA decision
- `interrupt active ticket`
- Owner: `PM/BA + Codex`
- Due window: `immediate next batch`
