# LATEST_BATCH_DECISION

Last updated: 2026-04-01 18:17 EEST  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
  - `observed`: the latest fresh bundle is `autobot-feedback-20260401-150741.tgz`
  - `observed`: auto-retro says `continue`
  - `observed`: the bundle ends `risk_state=NORMAL`, `daily_net_usdt=+129.39`, `sizingRejectPressure=low`
  - `observed`: the dominant repeats are guarded cross-quote sell-ladder churn (`BNBETH`, `SOLETH`, `TRXETH`) plus cross-quote fee-edge retries
  - `inferred`: `T-032` is stable enough to freeze as support, and the next leverage point is `T-031` candidate quality

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Decision: `pivot_and_patch`
- Why:
  - `observed`: the active blocker is no longer downside-control policy
  - `observed`: runtime now shows fresh normal-state trading with parked cross-quote ladder churn
  - `inferred`: the more valuable next batch is a bounded `T-031` guarded-sell-ladder rotation slice

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260401-150741.tgz`
- Compared bundle: `autobot-feedback-20260401-083229.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `pivot_and_patch`
- Next ticket candidate: `T-031`
- Review slice:
  - switch active work back to `T-031`
  - stop guarded cross-quote sell ladders from re-entering rotation immediately after the sell leg is parked
  - preserve March 30-31 `T-032` downside-control behavior and `T-034` routing stability
- Validation:
  - fresh bundle review (`autobot-feedback-20260401-150741.tgz`) ✅
  - ticket switch retro updated ✅
  - first real `T-031` slice landed in code/tests ✅
