# PM_TASK_SPLIT

Last updated: 2026-03-26 18:47 EET  
Owner: PM/BA + Codex

## PM/BA
- Objective: close the follow-up P0 incident with one explicit same-ticket recovery action
- Tasks:
  - keep `T-032` active
  - record why the `3a6a14f` hotfix deployed but still failed to restore runtime credibility
  - gate the next move on one short fresh post-deploy bundle
- Deliverable: single-source runtime recovery decision
- Dependency: fresh-bundle audit on `3a6a14f`

## Architect
- Objective: restore the designed no-feasible liquidity-recovery path without widening scope
- Tasks:
  - align the recovery threshold with the same liquidity floor used for candidate feasibility
  - let repeated starvation across the real production cadence arm recovery
  - leave guard-pause and hard-risk policy unchanged
- Deliverable: bounded engine amendment
- Dependency: `apps/api/src/modules/bot/bot-engine.service.ts`

## Trader
- Objective: reject professionally unacceptable high-allocation idling
- Tasks:
  - treat repeated post-restart `No feasible` / `No eligible` behavior as non-credible
  - require either recovery sells, `enabled=true`, or materially changed decision mix before accepting the patch
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
  - ship the no-feasible recovery threshold/window amendment
  - keep regression coverage on spaced no-feasible skips and liquidity-floor gating
  - validate with targeted and full CI
- Deliverable: tested engine recovery patch
- Dependency: Architect findings
