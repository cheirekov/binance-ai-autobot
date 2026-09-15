# Triage Note — 2026-04-14 — T-031

## Bundle
- `autobot-feedback-20260414-090828.tgz`

## Observed
- The April 13 family-level storm key is live.
- The runtime is no longer boxed into a near-flat `CAUTION` freeze.
- New blocker:
  - residual home-quote dust still rotates more slowly across multiple symbols:
    - `币安人生USDC`
    - `GIGGLEUSDC`
    - `SOLUSDC`
    - `ENJUSDC`
    - `ETHUSDC`
  - pattern:
    - `Grid sell leg not actionable yet`
    - short `COOLDOWN` re-entry loops (`900s`)

## Diagnosis
- The family-level residual parking logic is correct in kind, but it triggers too late for a slower multi-symbol rotation over a longer live run.
- The next bounded fix remains inside `T-031`:
  - widen the family storm lookback
  - lower the trigger threshold
  - extend the cooldown once the family storm is active

## Decision
- Keep `T-031` active.
- Keep `T-032` as linked support only.

## Mitigation
- Re-tune the family-level `Grid sell leg not actionable yet` storm so the residual cluster parks earlier and longer.
