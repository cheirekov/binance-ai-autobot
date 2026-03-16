# Triage Note — 2026-03-16 — T-032 managed symbols still reselected during quote-starvation quarantine

## Observed
- PM/BA end gate failed due repeated dominant loop reason across two bundles:
  - `"Skip TAOUSDC: Insufficient spendable USDC for grid BUY"` (`19 -> 17`).
- Quote-starvation attribution is now correct, but the bot still reconsiders managed/no-buy-limit symbols during active `GRID_BUY_QUOTE` quarantine when they do not have an actionable sell leg.

## Impact
- `P1` stability: the bot still burns decision cycles on symbols that cannot open a funded BUY leg and also cannot place a meaningful SELL leg.

## Evidence bundle
- `autobot-feedback-20260316-090952.tgz`
- previous comparison bundle from gate history: `autobot-feedback-20260315-151927.tgz`

## Reproduction
- Seen in sequential bundles without state reset.
- In the newer bundle, `TAOUSDC`, `SUIUSDC`, and similar symbols continue to emit `Insufficient spendable USDC for grid BUY` while the global `REASON_QUARANTINE:GRID_BUY_QUOTE` lock is active.

## Proposed fix
- During active `GRID_BUY_QUOTE` quarantine, suppress candidates that have recent quote-insufficiency skips, no resting BUY leg, and no actionable missing SELL leg.

## Candidate ticket
- `T-032`

## PM/BA decision
- `interrupt active ticket` (same-ticket mitigation; no lane pivot)
- Owner: BE + Trader
- Due window: immediate day patch
