# NEXT_BATCH_PLAN

Last updated: 2026-03-26 12:13 EET  
Owner: PM/BA + Codex

## Exact scope
Deploy the engine hotfix, clean-recreate the runtime, and confirm from one short fresh bundle that the March 25 guard-pause regression is no longer suppressing meaningful runtime behavior.

## In scope
- deploy the patched bot-engine runtime
- preserve current state and config; do not wipe runtime state unless the patch fails
- collect one short fresh bundle after recreate
- verify the decision mix changes away from pure guard-pause dead-end behavior
- decide whether the follow-up is `continue_same_ticket` or `rollback_same_ticket`

## Out of scope
- dashboard-only or reporting-only work
- broad `T-032` strategy redesign
- reopening `T-031` or `T-034`
- AI-lane or auth/UI scope

## Acceptance criteria
- the runtime emits fresh decisions after clean recreate
- legacy non-caution guard-pause cooldown no longer hard-blocks symbol progression
- the short bundle shows at least one of:
  - `grid-guard-defensive-unwind`
  - changed guard/wait loop counts
  - different actionable decision mix than the March 26 boxed-in baseline
- no funding regression dominates the bundle

## Rollback condition
- the next short fresh bundle still shows unchanged `Grid guard paused BUY leg` / `Grid waiting for ladder slot or inventory` pressure with no meaningful runtime change
- new validation or runtime evidence shows the remaining safe action is to revert the March 25 slice fully back to `cce2322` engine behavior

## What capability this moves forward
Moves `Lane A — Runtime stability` forward by restoring the bot-engine path itself, not just its operator-facing surfaces.
