# LATEST_BATCH_DECISION

Last updated: 2026-04-13 11:45 EEST  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
- `observed`: the latest fresh bundle is `autobot-feedback-20260413-082204.tgz`
- `observed`: auto-retro says `patch_required`
- `observed`: the bundle shows the April 12 thaw worked later in the run, but the runtime then rotated across `GIGGLEUSDC`, `0GUSDC`, `币安人生USDC`, `BTCUSDC`, `ETHUSDC`
- `observed`: these symbols all repeat `Grid sell leg not actionable yet`
- `inferred`: the immediate blocker is now residual-family dust rotation, not the near-flat caution freeze itself

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (support slices allowed only when fresh evidence couples downside-control with strategy-quality validation)
- Decision: `patch_required`
- Why:
  - `observed`: the linked-support thaw worked, so `T-032` stays support-only
  - `observed`: the live blocker moved back to `T-031` candidate-quality behavior
  - `inferred`: the next bounded batch is family-level residual dust storm parking

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260413-082204.tgz`
- Compared bundle: `autobot-feedback-20260412-180152.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - add one bounded `T-031` family-level storm key for repeated `Grid sell leg not actionable yet`
  - preserve the April 12 linked-support thaw, April 9-10 residual mitigations, and March 30-31 `T-032` downside-control behavior
- Validation:
  - fresh bundle review (`autobot-feedback-20260410-072500.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - PM/BA gate start + Docker CI pass ✅
