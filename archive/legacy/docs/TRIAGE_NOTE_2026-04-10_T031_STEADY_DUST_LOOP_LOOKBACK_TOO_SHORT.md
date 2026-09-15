# Triage Note — 2026-04-10 — T-031 steady dust loop lookback

## Bundle
- `autobot-feedback-20260410-072500.tgz`

## What changed
- The April 9 slice reduced the broader residual family, but one symbol (`ETHUSDC`) still resurfaced through a steady every-15-minute non-actionable sell-leg loop.

## Evidence
- `risk_state=NORMAL`
- `daily_net_usdt=+0.75`
- `sizingRejectPressure=low`
- dominant loop cluster:
  - `Skip ETHUSDC: Grid sell leg not actionable yet (41)`
  - `Skip ETHUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (28)`
- latest decisions alternate the same `ETHUSDC` skip and cooldown entries over many hours

## Interpretation
- This is still `T-031`, not a pivot.
- The April 9 logic was directionally correct, but the solo reblock lookback was too short for a steady 15-minute loop to ever hit the higher threshold.

## Mitigation
- Extend the solo residual-loop lookback so the longer retry cooldown can trigger on steady-state dust loops, not only on short bursts.

## Expected next evidence
- Fewer repeated `ETHUSDC: Grid sell leg not actionable yet` loops.
- No return of `No feasible candidates after policy/exposure filters`.
