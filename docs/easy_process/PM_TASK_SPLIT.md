# PM_TASK_SPLIT

Last updated: 2026-03-26 15:16 EET  
Owner: PM/BA + Codex

## PM/BA
- Objective: close the follow-up P0 incident with one explicit same-ticket recovery action
- Tasks:
  - keep `T-032` active
  - record why the March 26 hotfix failed to restore runtime credibility
  - gate the next move on one short fresh post-deploy bundle
- Deliverable: single-source runtime recovery decision
- Dependency: fresh-bundle audit on `2914263`

## Architect
- Objective: restore the designed no-feasible liquidity-recovery path without widening scope
- Tasks:
  - align no-feasible recovery matching with the actual live skip family
  - gate recovery on spendable quote after reserve, in home units
  - leave guard-pause and hard-risk policy unchanged
- Deliverable: bounded engine patch
- Dependency: `apps/api/src/modules/bot/bot-engine.service.ts`

## Trader
- Objective: reject professionally unacceptable high-allocation idling
- Tasks:
  - treat repeated post-restart `No feasible` / `No eligible` behavior as non-credible
  - require either recovery sells or materially changed decision mix before accepting the patch
- Deliverable: accept/reject rule for the next bundle
- Dependency: post-deploy fresh evidence

## Runtime Analyst
- Objective: prove the runtime does more than wake up after restart
- Tasks:
  - perform clean recreate
  - confirm fresh timestamps continue after the initial recovery message
  - capture one short bundle
- Deliverable: post-deploy runtime confirmation
- Dependency: operator deployment

## AI Specialist
- Objective: keep the recovery deterministic
- Tasks:
  - confirm no AI autonomy behavior changed
  - keep hard risk policy untouched
- Deliverable: AI scope isolation note
- Dependency: code review only

## State Steward
- Objective: preserve state unless hard evidence proves it is corrupted
- Tasks:
  - use clean recreate, not reseed
  - distinguish cumulative historical top skips from fresh recent decisions
  - keep incident authority in the easy-process outputs
- Deliverable: state-safe recovery handoff
- Dependency: deployed patch

## Senior BE/UI
- Objective: restore bot-engine behavior on the actual live blocker
- Tasks:
  - ship the no-feasible recovery patch
  - keep regression coverage on reason matching and spendable-liquidity gating
  - validate with targeted and full CI
- Deliverable: tested engine recovery patch
- Dependency: Architect findings
