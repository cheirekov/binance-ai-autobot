# Triage Note — 2026-04-12 — T-031/T-032 linked support

## Bundle
- `autobot-feedback-20260412-180152.tgz`

## Observed
- Fresh bundle stayed active (`63` submitted, `50` fills, `50` trades) but ended near-flat:
  - `risk_state=CAUTION`
  - `trigger=ABS_DAILY_LOSS`
  - `managedExposure≈0.3%`
  - `activeOrders=0`
- Latest runtime decision:
  - `Skip: No feasible candidates: daily loss caution paused new symbols (60 filtered)`

## Diagnosis
- This is not a stale-state or dead-engine issue.
- `T-031` candidate-quality validation is being blocked by a `T-032` support-policy edge case:
  - tiny residual managed positions still anchor global `CAUTION` new-symbol pause
  - even after the book is effectively flat and no orders remain

## Decision
- Keep `T-031` active.
- Use one bounded linked-support `T-032` slice.

## Mitigation
- Release `ABS_DAILY_LOSS` `CAUTION` new-symbol pause when:
  - managed exposure is already below the caution floor
  - `activeOrders=0`
- Preserve all existing downside-control and unwind behavior.
