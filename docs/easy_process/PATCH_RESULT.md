# PATCH_RESULT

Last updated: 2026-05-04 11:50 EEST
Owner: PM/BA + Codex

## Incident classification
- `P1 restored-trading fee/giveback churn`

## Chosen action class
- `PATCH_NOW`

## Whether bot-engine changed
- `yes`

## Files changed
- `apps/api/src/modules/bot/bot-engine.service.ts`
- `apps/api/src/modules/bot/bot-engine.service.test.ts`
- `docs/PM_BA_CHANGELOG.md`
- `docs/TRIAGE_NOTE_2026-05-04_T031_FEE_AWARE_GIVEBACK_CHURN.md`
- `docs/SESSION_BRIEF.md`
- `docs/DELIVERY_BOARD.md`
- `docs/STRATEGY_COVERAGE.md`
- `docs/easy_process/LATEST_BATCH_DECISION.md`
- `docs/easy_process/PATCH_RESULT.md`

## Exact behavior changed
- closed-PnL events now include buy-side fees in cost basis and subtract sell-side fees from realized PnL.
- profit-giveback activation now preserves smaller net wins after fees.
- severe near-halt daily-loss caution pauses fresh symbols even when managed exposure is near-flat.
- near-flat profit-giveback hard HALT is reserved for severe daily-loss usage or material managed exposure.

## Why this is the minimum viable patch
- it targets the May 4 evidence directly: trading resumed, but high fee/churn and profit giveback drove wallet drawdown.
- it does not change exposure caps, fee floors, quote routing, or AI behavior.

## Hypothesis addressed
- the bot adapted into orders after the April 30 patch, but guardrail math still under-counted fee burn and allowed near-flat loss states to thaw fresh-symbol entry too easily.

## Tests added/updated
- closed PnL is net of buy and sell fees.
- severe near-halt daily-loss caution pauses fresh-symbol entry at the risk-linked budget threshold.

## Validation run
- `pnpm -C apps/api test -- bot-engine.service.test.ts` unavailable locally (`pnpm` not installed).
- `./apps/api/node_modules/.bin/vitest run apps/api/src/modules/bot/bot-engine.service.test.ts --cache=false` ✅
- `./apps/api/node_modules/.bin/tsc -p apps/api/tsconfig.build.json --noEmit` ✅
- `./scripts/validate-active-ticket.sh` ✅
- `git diff --check` ✅
- `./scripts/pmba-gate.sh start` ✅
- `./scripts/pmba-gate.sh end` ✅

## Remaining risk
- the next bundle may stay paused until the rolling daily-loss window clears; that is acceptable if the pause reason is explicit and fee-aware.

## Rollback trigger
- the patch permits fresh-symbol entry during severe daily-loss protection, bypasses reachable unwind/sell behavior, or hides fees from guardrail math.

## What the next bundle must confirm
- daily-loss/profit-giveback details use fee-aware realized PnL.
- no new fresh-symbol entries occur while severe daily-loss caution is active.
- after the loss window clears, the next blocker is explicit fee/edge, quote, cooldown, or candidate-quality behavior.
