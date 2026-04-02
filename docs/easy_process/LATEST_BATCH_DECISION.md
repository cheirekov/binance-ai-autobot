# LATEST_BATCH_DECISION

Last updated: 2026-04-02 08:29 EEST  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
  - `observed`: the latest fresh bundle is `autobot-feedback-20260402-081314.tgz`
  - `observed`: auto-retro says `patch_required`
  - `observed`: the bundle ends `risk_state=CAUTION`, `daily_net_usdt=-250.94`, `sizingRejectPressure=high`
  - `observed`: the dominant repeats are managed home-quote sell-ladder sizing churn (`ETHUSDC`, `BTCUSDC`, `STOUSDC`, `TAOUSDC`, `XRPUSDC`) plus paired `Grid guard paused BUY leg`
  - `inferred`: `T-032` is not the live blocker; the next leverage point is still `T-031` candidate/actionability quality

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (support slices allowed only when fresh evidence couples downside-control with strategy-quality validation)
- Decision: `patch_required`
- Why:
  - `observed`: downside-control remains preserved, but fresh runtime is still burning cycles on impossible sell ladders
  - `observed`: repeated sell-ladder sizing rejects now dominate on managed home-quote symbols
  - `inferred`: the next bounded batch is a `T-031` sell-leg actionability slice, not a ticket pivot

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260402-081314.tgz`
- Compared bundle: `autobot-feedback-20260401-150741.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - stop undersized managed sell legs from re-entering runtime grid sell placement
  - preserve March 30-31 `T-032` downside-control behavior and `T-034` routing stability
- Validation:
  - fresh bundle review (`autobot-feedback-20260402-081314.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - PM/BA gate start + Docker CI pass ✅
