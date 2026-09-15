# Triage Note — 2026-03-02 — Inventory waiting dominant loop in T-030

## Observed
- PM/BA end gate failed due repeated dominant loop reason across two bundles:
  - `"Skip DOGEUSDC: Grid waiting for ladder slot or inventory"` (`22 -> 10`).
- Bundle context:
  - `autobot-feedback-20260302-193305.tgz`,
  - active ticket `T-030`,
  - sizing reject pressure moved to medium, but inventory-wait loop stayed dominant.

## Impact
- `P1` stability: candidate rotation quality degrades when passive/waiting symbols are repeatedly re-selected.

## Evidence bundle
- `autobot-feedback-20260302-193305.tgz`
- previous comparison bundle from gate history (`autobot-feedback-20260302-112527.tgz`).

## Reproduction
- Seen in sequential day/evening bundles while bot remains on the same long-running state.

## Proposed fix
- Prioritize actionable grid candidates over passive waiting candidates and penalize symbols with repeated inventory-wait skips under global inventory-wait pressure.

## Candidate ticket
- `T-030`

## PM/BA decision
- `interrupt active ticket` (same-ticket mitigation; no lane pivot)
- Owner: BE + Trader
- Due window: immediate pre-night patch
