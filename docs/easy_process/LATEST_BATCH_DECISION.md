# LATEST_BATCH_DECISION

Last updated: 2026-04-15 10:45 EEST  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
- `observed`: the latest fresh bundle is `autobot-feedback-20260415-072942.tgz`
- `observed`: auto-retro says `patch_required`
- `observed`: April 14 storm locks are live (`Skip storm (...) Grid sell leg not actionable yet`)
- `observed`: selection still re-enters residual symbols that are already protected by those storm locks
- `observed`: `T-032` halt unwind is reachable and fired on `DOGEUSDC`
- `inferred`: the immediate blocker is the dust-cooldown bypass ignoring active storm locks, not missing storm detection

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (support slices allowed only when fresh evidence couples downside-control with strategy-quality validation)
- Decision: `patch_required`
- Why:
  - `observed`: the linked-support thaw worked, so `T-032` stays support-only
  - `observed`: the live blocker moved back to `T-031` candidate-quality behavior
  - `inferred`: the next bounded batch is to honor active storm locks during candidate selection

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260415-072942.tgz`
- Compared bundle: `autobot-feedback-20260414-090828.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - preserve the widened residual-family storm behavior
  - prevent the dust-cooldown bypass from ignoring active skip-storm locks
  - preserve the April 12 linked-support thaw, April 9-10 residual mitigations, and March 30-31 `T-032` downside-control behavior
- Validation:
  - fresh bundle review (`autobot-feedback-20260415-072942.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - PM/BA gate start + Docker CI pass ✅
