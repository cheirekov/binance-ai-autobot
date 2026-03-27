# LATEST_BATCH_DECISION

Last updated: 2026-03-27 12:46 EET  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Runtime stability`
- Why:
  - `observed`: the latest fresh bundle is still `autobot-feedback-20260327-102432.tgz`
  - `observed`: `docs/SESSION_BRIEF.md` and `docs/RETROSPECTIVE_AUTO.md` both keep `T-032` active with decision `continue`
  - `observed`: bundle state shows `noFeasibleRecovery.enabled=true` while repeated skips still end at `attemptedSymbol=null`
  - `inferred`: the remaining same-ticket defect is runtime recovery gating, not process authority drift
- Evidence tags:
  - `observed`: `Skip: No feasible candidates after sizing/cap filters` remains the dominant latest runtime signature
  - `observed`: latest skip details record `maxExecutionQuoteSpendableHome=1588.033641`, `quoteLiquidityThreshold=3`, and `attemptedSymbol=null`
  - `observed`: rejection samples in the same bundle include `quote-spendable`, `quote-spendable-floor`, and prior bundle evidence also showed `quote-exposure-cap`
  - `inferred`: raw spendable quote on another execution-quote family can keep the recovery gate closed even when the active candidate pool is boxed in
  - `assumption`: the next fresh bundle is required to prove live behavior changed, not just helper logic

## Chosen active ticket
- Current: `T-032` (Exit manager v2)
- Decision: `patch_same_ticket`
- Why:
  - `observed`: board and changelog still keep `T-032` as the sole active lane
  - `observed`: the bundle defect is inside the existing no-feasible recovery path already being hardened under `T-032`
  - `inferred`: no ticket pivot is needed unless the next bundle disproves this runtime hypothesis

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260327-102432.tgz`
- Compared bundle: `autobot-feedback-20260326-164157.tgz`

## Allowed work mode
- Current batch: `PATCH_ALLOWED`

## Batch decision
- Decision: `patch_same_ticket`
- Patch slice:
  - allow no-feasible recovery to trigger when repeated rejection samples already prove quote starvation or quote-family saturation, even if another execution quote still shows raw spendable balance
  - add clearer skip telemetry with `gateAttempted` and `pressureDetected`
  - record an explicit recovery attempt reason when no eligible managed position exists or clamp math leaves a non-positive sell quantity
- Validation:
  - `./node_modules/.bin/vitest run --no-cache src/modules/bot/bot-engine.service.test.ts` ✅
