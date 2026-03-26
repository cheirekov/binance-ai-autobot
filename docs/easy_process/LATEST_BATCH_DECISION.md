# LATEST_BATCH_DECISION

Last updated: 2026-03-26 18:47 EET  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Runtime stability`
- Evidence tags:
  - `observed`: latest fresh bundle `autobot-feedback-20260326-164157.tgz` runs `git.commit=3a6a14f`
  - `observed`: cumulative top skips still show `Skip BTCUSDC: Grid guard paused BUY leg (17)` and `Grid waiting for ladder slot or inventory (16)`, unchanged from the prior fresh bundle
  - `observed`: latest recent decisions are still mostly `Skip: No feasible candidates after policy/exposure filters` with restart markers in between
  - `observed`: latest no-feasible details still show `noFeasibleRecovery.enabled=false`, `recentCount=1`, `threshold=2`, `quoteLiquidityThreshold=1`, and `maxExecutionQuoteSpendableHome=2.841632`
  - `inferred`: the previous no-feasible recovery patch deployed, but its trigger math was still too strict for live runtime cadence and live funding floors

## Chosen active ticket
- Current: `T-032` (Exit manager v2)
- Decision: `patch_same_ticket`
- Why:
  - `observed`: the active failure is still an exit/liquidity-recovery failure inside `T-032`
  - `observed`: the new bundle proves the previous recovery action deployed and narrows the remaining defect to the same engine path
  - `inferred`: `ROLLBACK_NOW` would reintroduce the already-fixed reason-matching/spendable-liquidity work and is weaker than one bounded same-surface amendment

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260326-164157.tgz`
- Compared bundle: `autobot-feedback-20260326-130152.tgz`

## Allowed work mode
- `PATCH_ALLOWED`

## Batch decision
- `BATCH_ACTION_CLASS`: `PATCH_NOW`
- Incident classification: `P0 runtime-boxed / incomplete no-feasible recovery incident`
- Primary incident type:
  - incomplete bot-engine recovery patch on the no-feasible recovery path
  - restart/recovery cadence as a secondary amplifier
- Previous recovery action:
  - `2026-03-26 13:16 UTC` same-ticket bot-engine patch on the no-feasible liquidity-recovery path
  - it broadened reason matching and moved the gate to spendable quote after reserve
- Why the previous intervention did not restore runtime behavior:
  - it touched the bot-engine path and it did deploy
  - but the activation policy still needed two no-feasible skips inside a 10-minute cluster
  - the recovery gate still used a `1` home-unit threshold even though the live funding floor was effectively `3-5` home units
  - result: the runtime stayed boxed even on the patched commit because the recovery arm still could not activate
- Likely rollback surface:
  - only the new no-feasible window/threshold amendment if it over-fires after deployment
  - broad rollback before `3a6a14f` is not preferred
- Likely patch surface:
  - `apps/api/src/modules/bot/bot-engine.service.ts`
  - `deriveNoFeasibleRecoveryPolicy(...)`
  - `deriveMinQuoteLiquidityHome(...)`
  - `shouldAttemptNoFeasibleRecovery(...)`
- Likely state/ops recovery surface:
  - clean recreate after deploy
  - no reseed / wipe is justified by current evidence
- Validation:
  - `./scripts/validate-active-ticket.sh` ✅
  - `docker compose -f docker-compose.ci.yml run --rm ci` ✅
