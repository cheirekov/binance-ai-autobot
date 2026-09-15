# Triage Note — 2026-03-14 — T-032 buy sizing rejects are mostly quote starvation

## Observed
- PM/BA ingest flagged `sizingRejectPressure=high` for `autobot-feedback-20260314-104045.tgz`.
- Top skip reasons were dominated by `Grid buy sizing rejected (...)`, but decision details show `quoteFree` stayed near the hard reserve floor while `quoteSpendable` was effectively zero.
- Examples from the bundle:
  - `SUIUSDC`: `quoteFree=5.039695`, `quoteSpendable=0.039695`, `requiredQty=0.1`
  - `SOLUSDC`: `quoteFree=5.039695`, `quoteSpendable=0.039695`, `requiredQty=0.001`
  - `BANANAS31USDC`: `quoteFree=5.039695`, `quoteSpendable=0.039695`, `minNotional=1.0`

## Impact
- `P1` stability: the bot classifies reserve-floor quote starvation as symbol sizing pressure, which inflates reject metrics and keeps rotating through symbols that cannot be funded.

## Evidence bundle
- `autobot-feedback-20260314-104045.tgz`

## Reproduction
- Seen in bundle `autobot-feedback-20260314-104045.tgz` without state reset.

## Proposed fix
- Reclassify grid buy sizing rejects as `Insufficient spendable <quote> for grid BUY` whenever the minimum required order cost exceeds current spendable quote balance.

## Candidate ticket
- `T-032`

## PM/BA decision
- `interrupt active ticket` (same-ticket mitigation; no lane pivot)
- Owner: BE + Trader
- Due window: immediate day patch
