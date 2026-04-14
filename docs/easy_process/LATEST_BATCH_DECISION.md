# LATEST_BATCH_DECISION

Last updated: 2026-04-14 12:20 EEST  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
- `observed`: the latest fresh bundle is `autobot-feedback-20260414-090828.tgz`
- `observed`: auto-retro says `patch_required`
- `observed`: the April 13 family-level storm key is live, but the runtime still rotates more slowly across `币安人生USDC`, `GIGGLEUSDC`, `SOLUSDC`, `ENJUSDC`, `ETHUSDC`
- `observed`: repeated entries still fall back to `Grid sell leg not actionable yet` plus short `COOLDOWN` re-entry loops
- `inferred`: the immediate blocker is a slower residual-family dust storm, not the older near-flat caution freeze itself

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (support slices allowed only when fresh evidence couples downside-control with strategy-quality validation)
- Decision: `patch_required`
- Why:
  - `observed`: the linked-support thaw worked, so `T-032` stays support-only
  - `observed`: the live blocker moved back to `T-031` candidate-quality behavior
  - `inferred`: the next bounded batch is wider family-level residual dust storm parking

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260414-090828.tgz`
- Compared bundle: `autobot-feedback-20260413-161359.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - widen the `T-031` residual-family storm window/threshold/cooldown for repeated `Grid sell leg not actionable yet`
  - preserve the April 12 linked-support thaw, April 9-10 residual mitigations, and March 30-31 `T-032` downside-control behavior
- Validation:
  - fresh bundle review (`autobot-feedback-20260414-090828.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - PM/BA gate start + Docker CI pass ✅
