# OPERATOR_NOTE

Last updated: 2026-03-27 12:46 EET  
Owner: PM/BA + Codex

## What to run next
- run `./node_modules/.bin/vitest run --no-cache src/modules/bot/bot-engine.service.test.ts`
- deploy this `T-032` patch in the normal operator flow
- ingest the next fresh production bundle and inspect `noFeasibleRecovery.gateAttempted`, `pressureDetected`, and `attemptedReason`

## What not to do next
- do not widen into unrelated strategy work before the next bundle lands
- do not reopen any DONE ticket
- do not assume the patch is production-proved without fresh runtime evidence

## What fresh evidence would change the decision
- the next bundle shows continued boxed-in `No feasible` skips with `gateAttempted=false`
- the next bundle shows harmful recovery churn
- a new bundle establishes a different runtime incident outside `T-032`
