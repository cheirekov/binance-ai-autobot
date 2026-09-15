# Triage Note — 2026-03-13 — Waiting ladder symbols still re-selected in T-032

## Observed
- PM/BA end gate failed due repeated dominant loop reason across two bundles:
  - `"Skip XRPUSDC: Grid waiting for ladder slot or inventory"` (`14 -> 8`).
- The previous patch reduced the loop, but did not eliminate it.
- In `autobot-feedback-20260313-171401.tgz`, `XRPUSDC` still had both a resting `BUY` and `SELL` limit order while being re-selected as a candidate.

## Impact
- `P1` stability: candidate selection still spends cycles on non-actionable symbols that already have resting ladder legs.

## Evidence bundle
- `autobot-feedback-20260313-171401.tgz`
- previous comparison bundle from gate history: `autobot-feedback-20260313-144451.tgz`

## Reproduction
- Seen in sequential day/evening bundles while bot remains on the same long-running state.
- In the newer bundle, `activeOrders` still contain both `BUY` and `SELL` limits for `XRPUSDC`, while decisions continue to emit `Grid waiting for ladder slot or inventory`.

## Proposed fix
- Treat any symbol with resting ladder orders and no actionable missing leg as stalled immediately during candidate selection, not only after repeated wait-loop history.

## Candidate ticket
- `T-032`

## PM/BA decision
- `interrupt active ticket` (same-ticket mitigation; no lane pivot)
- Owner: BE + Trader
- Due window: immediate pre-night patch
