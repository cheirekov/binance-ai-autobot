# PM_TASK_SPLIT

Last updated: 2026-03-26 12:13 EET  
Owner: PM/BA + Codex

## PM/BA
- Objective: close the P0 runtime ambiguity with one bounded engine recovery batch
- Tasks:
  - keep `T-032` active
  - record `PATCH_NOW` and the audited rollback target
  - gate the next move on one short fresh post-deploy bundle
- Deliverable: single-source runtime recovery decision
- Dependency: audited engine diff `cce2322..a2a9ad0`

## Architect
- Objective: remove the March 25 guard-pause regression without widening scope
- Tasks:
  - stop non-caution guard-pause no-action ticks from short-circuiting later runtime handling
  - keep legacy guard-pause cooldowns from acting as hard selection blocks
  - preserve existing defensive unwind policy
- Deliverable: bounded engine hotfix
- Dependency: `apps/api/src/modules/bot/bot-engine.service.ts`

## Trader
- Objective: keep runtime inactivity within professional acceptability bounds
- Tasks:
  - reject another boxed-in short bundle as acceptable behavior
  - require changed runtime decision mix before calling the hotfix credible
- Deliverable: accept/reject rule for the next bundle
- Dependency: post-deploy fresh evidence

## Runtime Analyst
- Objective: verify the engine is alive after deployment
- Tasks:
  - perform clean recreate
  - confirm fresh timestamps and non-stale decisions
  - capture one short bundle
- Deliverable: post-deploy runtime confirmation
- Dependency: operator deployment

## AI Specialist
- Objective: keep the recovery strictly deterministic
- Tasks:
  - confirm no AI autonomy behavior changed
  - keep hard risk policy untouched
- Deliverable: AI scope isolation note
- Dependency: code review only

## State Steward
- Objective: prevent stale March 25 lock semantics from masquerading as healthy runtime control
- Tasks:
  - preserve existing state
  - rely on the patch instead of manual state wipe
  - keep P0 authority in the easy-process outputs
- Deliverable: state-safe recovery handoff
- Dependency: deployed patch

## Senior BE/UI
- Objective: restore bot-engine behavior credibly
- Tasks:
  - ship the guard-pause hotfix
  - keep regression coverage on lock semantics
  - validate with targeted and full CI
- Deliverable: tested engine recovery patch
- Dependency: Architect findings
