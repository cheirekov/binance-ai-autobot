# LATEST_BATCH_DECISION

Last updated: 2026-03-25 20:38 UTC  
Owner: PM/BA + Codex

## Batch outcome
- `PROCESS_STATE_CONFLICT`: `true`
- Authoritative sources for this batch:
  - `docs/RETROSPECTIVE_AUTO.md`
  - `docs/SESSION_BRIEF.md`
- Stale/conflicting easy-process files corrected in this batch:
  - `docs/easy_process/BUNDLE_DIGEST.md`
  - `docs/easy_process/ACTIVE_TICKET.md`
  - `docs/easy_process/PROGRAM_STATUS.md`
  - `docs/easy_process/RUN_CONTEXT.md`
  - `docs/easy_process/DECISION_LEDGER.md`

## Production capability lane
- Chosen: `Lane A — Runtime stability`
- Capability moved forward: `C1 — Execution core maturity`
- Why:
  - `observed`: latest reviewed bundle is `autobot-feedback-20260325-195431.tgz`
  - `observed`: evidence class is `fresh`
  - `observed`: repeated dominant loop remained `Skip BTCUSDC: Grid guard paused BUY leg (17)`
  - `observed`: no runtime `grid-guard-defensive-unwind` event appeared in the fresh bundle
  - `inferred`: the active failure is a live no-action reselection loop, not a stale-evidence-only process problem

## Chosen active ticket
- Current: `T-032` (Exit manager v2)
- Status: `IN_PROGRESS`
- Decision: `patch_same_ticket`
- `BATCH_ACTION_CLASS`: `PATCH_NOW`

## Evidence class
- Current: `fresh`
- Evidence tags:
  - `observed`: fresh bundle, repeated BTCUSDC/SOLUSDC grid-guard loop, `NORMAL` risk, high allocation
  - `inferred`: current T-032 unwind path is not reducing guard-pause loop pressure in practice
  - `assumption`: the cooldown-driven rotation fix is sufficient without widening unwind thresholds

## Allowed work mode
- Decision: `PATCH_ALLOWED`
- Reason: fresh runtime evidence plus direct code-surface alignment justify a same-ticket mitigation now

## Code-surface discovery
- Likely patch surface:
  - `apps/api/src/modules/bot/bot-engine.service.ts`
  - repeated `Grid guard paused BUY leg` was logged but not converted into a persisted symbol cooldown
- Likely rollback surface:
  - `apps/api/src/modules/bot/bot-engine.service.ts`
  - current T-032 grid-guard cooldown addition if it suppresses actionable sell work or creates churn
- Likely validation surface:
  - `apps/api/src/modules/bot/bot-engine.service.test.ts`
  - `scripts/validate-active-ticket.sh`
- Primary issue type: `runtime` with stale process-state memory corrected in the same batch

## Execution result
- Code changed: `yes`
- Result:
  - repeated grid-guard BUY pauses now participate in skip-storm handling
  - a repeated guard-pause no-action tick now persists a symbol cooldown
  - the targeted validation entrypoint now covers the active guard-pause symptom
