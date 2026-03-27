# PM_TASK_SPLIT

Last updated: 2026-03-27 14:40 EET  
Owner: PM/BA + Codex

## PM/BA
- Objective: keep the batch bounded to the fresh March 27 `T-032` defect
- Tasks:
  - record `patch_same_ticket`
  - keep `T-032` as the only active lane
  - note that the prior recovery patch is now evidenced as working
  - require the next bundle before any broader conclusion
- Deliverable: bounded ticket decision
- Dependency: latest bundle evidence

## Architect
- Objective: patch the smallest runtime gate that matches the evidence
- Tasks:
  - relax profit-giveback `CAUTION` new-symbol pause only after material de-risking
  - preserve symbol-level bearish BUY pause behavior
  - avoid widening into unrelated exit-manager refactors
- Deliverable: trigger-aware caution-threshold correction
- Dependency: direct bundle read + bot-engine path review

## Trader
- Objective: keep recovery sells bounded and capital-aware
- Tasks:
  - accept that the bot already de-risked materially in the latest bundle
  - allow new symbols again only once remaining exposure is no longer materially high
  - use the next bundle to judge whether the relaxed pause reduces idle deadlock without creating churn
- Deliverable: caution-release risk sanity check
- Dependency: live bundle facts

## Runtime Analyst
- Objective: prove or falsify the new gate behavior quickly
- Tasks:
  - inspect the next fresh bundle for loss of the `59 filtered` loop
  - confirm the prior `no-feasible-liquidity-recovery` trade path still appears when needed
  - confirm symbol-level bearish BUY pause evidence still exists on the risky managed symbol
- Deliverable: next-bundle caution-release validation read
- Dependency: patched runtime + next ingestion

## AI Specialist
- Objective: keep AI scope unchanged
- Tasks:
  - confirm this patch does not alter AI autonomy or learning claims
  - keep the lane strictly deterministic runtime recovery hardening
- Deliverable: AI scope freeze
- Dependency: none

## State Steward
- Objective: keep process memory aligned to the actual patch batch
- Tasks:
  - update batch decision artifacts from recovery-gate mode to caution-threshold mode
  - keep DONE history untouched
  - carry forward only fresh-bundle evidence
- Deliverable: current batch docs aligned to code state
- Dependency: PM/BA decision

## Senior BE/UI
- Objective: implement and validate the bounded runtime fix
- Tasks:
  - patch `apps/api/src/modules/bot/bot-engine.service.ts`
  - extend `apps/api/src/modules/bot/bot-engine.service.test.ts`
  - update the session/easy-process handoff docs for the new bundle
  - run focused bot-engine tests without cache
- Deliverable: tested `T-032` code slice
- Dependency: architected patch hypothesis
