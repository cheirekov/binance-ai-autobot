# PM_TASK_SPLIT

Last updated: 2026-03-28 23:10 EET  
Owner: PM/BA + Codex

## PM/BA
- Objective: pivot active development to the higher-leverage strategy lane
- Tasks:
  - record `pivot_active_ticket`
  - freeze `T-032` as support/runtime-preserved work
  - activate `T-031` cleanly in board/session/switch-retro docs
- Deliverable: explicit pivot recommendation
- Dependency: latest bundle evidence

## Architect
- Objective: keep the strategy slice bounded
- Tasks:
  - confirm current code still uses simpler regime thresholds and a regime-agnostic fee floor
  - keep the first `T-031` slice limited to those two surfaces
- Deliverable: bounded strategy-slice definition
- Dependency: direct bundle read + code audit

## Trader
- Objective: move adaptation work toward strategy-quality, not more proof-only downside-control waiting
- Tasks:
  - review the fact pattern: current blockers are `Fee/edge filter` + parked-ladder waiting
  - approve a regime-linked threshold / fee-floor strategy slice as the next most valuable move
- Deliverable: strategy-lane approval
- Dependency: live bundle facts + code audit

## Runtime Analyst
- Objective: capture the reprioritization evidence cleanly
- Tasks:
  - document that the latest bundle is fresh and strategy-quality dominated
  - document the switch trigger from `T-032` to `T-031`
  - document the expected next proof after deployment
- Deliverable: updated pivot digest
- Dependency: raw bundle review

## AI Specialist
- Objective: keep AI scope unchanged
- Tasks:
  - confirm this batch changes no AI behavior or promotion scope
- Deliverable: AI scope freeze
- Dependency: none

## State Steward
- Objective: realign easy-process memory
- Tasks:
  - update working-memory docs from `continue_same_ticket` / `T-032` to `pivot_active_ticket` / `T-031`
  - keep the manual PM/BA decision explicit
- Deliverable: current docs aligned to `T-031`
- Dependency: PM/BA decision

## Senior BE/UI
- Objective: land the first bounded `T-031` slice
- Tasks:
  - implement risk-linked regime thresholds
  - implement regime-aware fee floor
  - add regression tests and Docker validation
- Deliverable: bounded strategy patch
- Dependency: PM/BA review + architect scope freeze
