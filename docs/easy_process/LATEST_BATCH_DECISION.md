# LATEST_BATCH_DECISION

Last updated: 2026-03-27 14:40 EET  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Runtime stability`
- Why:
  - `observed`: the latest fresh bundle is now `autobot-feedback-20260327-123604.tgz`
  - `observed`: the bundle contains a real `no-feasible-liquidity-recovery` trade on `TAOUSDC` at `2026-03-27T11:13:21.360Z`
  - `observed`: the dominant new blocker is `Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered)`
  - `inferred`: the next same-ticket defect is profit-giveback `CAUTION` staying too global after the book has already de-risked
- Evidence tags:
  - `observed`: latest bundle risk state is `CAUTION` with trigger `PROFIT_GIVEBACK`
  - `observed`: latest risk-state reason codes report `managedExposure=18.0%` and `haltExposureFloor=8.0%`
  - `observed`: latest skip details show `quoteFree=5889.612684`, `rejectionSamples=[]`, and `noFeasibleRecovery.enabled=false`
  - `observed`: top alternating skips are global new-symbol pause plus symbol-level `BTCUSDC` daily-loss caution BUY-leg pause
  - `inferred`: after de-risking to about `18%` managed exposure, the global caution pause should relax sooner while symbol-level bearish pauses remain active
  - `assumption`: the next fresh bundle is required to prove this threshold change improves behavior without reintroducing churn

## Chosen active ticket
- Current: `T-032` (Exit manager v2)
- Decision: `patch_same_ticket`
- Why:
  - `observed`: board and changelog still keep `T-032` as the sole active lane
  - `observed`: the prior no-feasible recovery patch is now evidenced as working in the latest bundle
  - `observed`: the new runtime blocker is still inside `T-032` downside-control / defensive-entry behavior
  - `inferred`: no ticket pivot is needed unless the next bundle disproves this runtime hypothesis

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260327-123604.tgz`
- Compared bundle: `autobot-feedback-20260327-102432.tgz`

## Allowed work mode
- Current batch: `PATCH_ALLOWED`

## Batch decision
- Decision: `patch_same_ticket`
- Patch slice:
  - keep the proven no-feasible recovery path unchanged
  - relax profit-giveback `CAUTION` new-symbol pause so it only stays global while managed exposure is still materially high
  - preserve symbol-level bearish BUY pauses on the risky managed symbol itself
- Validation:
  - `./node_modules/.bin/vitest run --no-cache src/modules/bot/bot-engine.service.test.ts` ✅
