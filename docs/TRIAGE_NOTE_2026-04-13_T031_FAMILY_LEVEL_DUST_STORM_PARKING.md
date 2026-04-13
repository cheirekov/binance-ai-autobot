# Triage Note — 2026-04-13 — T-031

## Bundle
- `autobot-feedback-20260413-082204.tgz`

## Observed
- The April 12 linked-support thaw did reopen runtime activity.
- The next fresh bundle no longer ended on a dead engine or only stale state.
- New blocker:
  - residual home-quote dust rotated across multiple symbols:
    - `GIGGLEUSDC`
    - `0GUSDC`
    - `币安人生USDC`
    - `BTCUSDC`
    - `ETHUSDC`
  - all repeated `Grid sell leg not actionable yet`

## Diagnosis
- Symbol-level cooldowns are working, but the cluster now rotates across symbols.
- That means the next bounded fix belongs in `T-031`:
  - family-level residual parking
  - not another state reset
  - not a `T-032` reopen

## Decision
- Keep `T-031` active.
- Keep `T-032` as linked support only.

## Mitigation
- Make `Grid sell leg not actionable yet` share a storm key across symbols.
- Let the existing infeasible-symbol storm logic extend cooldowns for the residual family as a cluster.
