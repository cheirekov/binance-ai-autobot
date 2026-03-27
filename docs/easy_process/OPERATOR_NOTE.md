# OPERATOR_NOTE

Last updated: 2026-03-27 14:40 EET  
Owner: PM/BA + Codex

## What to run next
- run `./node_modules/.bin/vitest run --no-cache src/modules/bot/bot-engine.service.test.ts`
- deploy this `T-032` patch in the normal operator flow
- ingest the next fresh production bundle and inspect whether `daily loss caution paused new symbols` is still dominant
- also confirm the prior `no-feasible-liquidity-recovery` behavior did not regress

## What not to do next
- do not widen into unrelated strategy work before the next bundle lands
- do not reopen any DONE ticket
- do not assume the patch is production-proved without fresh runtime evidence

## What fresh evidence would change the decision
- the next bundle still shows global new-symbol pause loops at low managed exposure
- the next bundle shows harmful churn or premature re-risking after giveback
- the next bundle regresses no-feasible recovery behavior
- a new bundle establishes a different runtime incident outside `T-032`
