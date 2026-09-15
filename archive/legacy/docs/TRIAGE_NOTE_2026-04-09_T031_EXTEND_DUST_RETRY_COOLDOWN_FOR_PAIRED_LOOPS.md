# Triage Note — 2026-04-09 — T-031 paired residual dust loops

## Bundle
- `autobot-feedback-20260409-071715.tgz`

## What changed
- The April 7 evening slice kept the April 2 deadlock closed, but fresh April 9 evidence shows a wider home-quote dust residual family still resurfaces after cooldown expiry.

## Evidence
- `risk_state=NORMAL`
- `daily_net_usdt=-0.89`
- `sizingRejectPressure=low`
- dominant residual loop cluster:
  - `Skip BTCUSDC: Grid sell leg not actionable yet (30)`
  - `Skip TAOUSDC: Grid sell leg not actionable yet (29)`
  - `Skip TAOUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (25)`

## Interpretation
- This is still `T-031`, not a pivot.
- The blocker is not funding or downside-control. It is residual home-quote dust symbols re-entering after the first cooldown and repeating paired or solo dead-end sell-leg loops.

## Mitigation
- Reuse the longer dust retry cooldown not only after the higher-threshold solo loop, but also after repeated paired dead-end loops on the same residual symbol.

## Expected next evidence
- Fewer repeated `Grid sell leg not actionable yet` loops across the residual dust family.
- No return of `No feasible candidates after policy/exposure filters`.
