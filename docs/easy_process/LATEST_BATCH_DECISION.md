# LATEST_BATCH_DECISION

Last updated: 2026-04-02 19:36 EEST  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
  - `observed`: the latest fresh bundle is `autobot-feedback-20260402-162840.tgz`
  - `observed`: auto-retro says `pivot_required`, but the fresh-state audit shows a narrower same-ticket blocker
  - `observed`: the bundle ends `risk_state=CAUTION`, `daily_net_usdt=-144.24`, `sizingRejectPressure=low`
  - `observed`: the dominant counter is still `Skip: No feasible candidates after policy/exposure filters (31)`
  - `observed`: the newest live decisions are already per-symbol `Grid sell leg not actionable yet` / `Protection lock COOLDOWN` on `STOUSDC` / `XPLUSDC`
  - `inferred`: the April 2 day selection bypass landed, but execution is still re-blocking the same dust family one step later

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (support slices allowed only when fresh evidence couples downside-control with strategy-quality validation)
- Decision: `patch_required`
- Why:
  - `observed`: downside-control remains preserved, but fresh runtime still re-blocks cooled home-quote dust symbols after selection
  - `observed`: the repeated no-feasible counter is lagging the newer per-symbol cooldown behavior, not indicating a ticket pivot
  - `inferred`: the next bounded batch is a `T-031` execution-gate consistency slice, not a ticket pivot

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260402-162840.tgz`
- Compared bundle: `autobot-feedback-20260402-113357.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - stop cooled home-quote dust residuals from being re-blocked at the post-selection execution gate
  - preserve March 30-31 `T-032` downside-control behavior and `T-034` funding stability
- Validation:
  - fresh bundle review (`autobot-feedback-20260402-162840.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - PM/BA gate start + Docker CI pass ✅
