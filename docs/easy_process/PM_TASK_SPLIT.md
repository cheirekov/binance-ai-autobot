# PM_TASK_SPLIT

Last updated: 2026-03-28 10:47 EET  
Owner: PM/BA + Codex

## PM/BA
- Objective: convert the fresh March 28 bundle into an explicit next-lane decision
- Tasks:
  - record `pivot_ticket`
  - keep `T-032` as the authoritative current ticket until PM/BA approves a real switch
  - close the prior defensive cancel-churn hypothesis
  - define whether the next lane is `PM/BA-TRIAGE` only or a concrete new follow-up / hardening ticket
- Deliverable: explicit pivot recommendation
- Dependency: latest bundle evidence

## Architect
- Objective: avoid another blind runtime patch
- Tasks:
  - confirm the `5927bd9` deployment removed the previous same-ticket defect
  - isolate the remaining open question as `ABS_DAILY_LOSS` caution re-entry / healthy-idle policy
  - defer code until PM/BA chooses the next lane
- Deliverable: no-code architecture read
- Dependency: direct bundle read

## Trader
- Objective: classify whether the latest idle behavior is acceptable risk policy
- Tasks:
  - review the fact pattern: `ABS_DAILY_LOSS`, `3.40%` exposure, high free quote, no active orders
  - decide whether global new-symbol pause at this state is intended or too restrictive
  - recommend whether this belongs in a new follow-up ticket
- Deliverable: policy-vs-bug judgment
- Dependency: live bundle facts

## Runtime Analyst
- Objective: capture the pivot evidence cleanly
- Tasks:
  - document that the latest 200 decisions are all `SKIP`
  - document that the prior defensive cancel signature is gone
  - document that the remaining repeats are global new-symbol pause plus `BTCUSDC` fee/edge filter
- Deliverable: pivot evidence summary
- Dependency: raw bundle review

## AI Specialist
- Objective: keep AI scope unchanged
- Tasks:
  - confirm this pivot batch does not change AI behavior or promotion scope
  - keep the lane decision strictly around runtime/risk policy
- Deliverable: AI scope freeze
- Dependency: none

## State Steward
- Objective: align process memory to the pivot review
- Tasks:
  - update batch decision artifacts from `patch_same_ticket` to `pivot_ticket`
  - keep auto-retro as the controlling batch decision
  - do not switch the board until PM/BA explicitly approves a new active ticket
- Deliverable: current docs aligned to `pivot_required`
- Dependency: PM/BA decision

## Senior BE/UI
- Objective: hold off on behavior changes until scope is credible
- Tasks:
  - make no runtime code patch in this batch
  - add the March 28 triage note
  - update the session/easy-process handoff docs for the new bundle
- Deliverable: docs-only pivot package
- Dependency: PM/BA review
