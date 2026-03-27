# PM_TASK_SPLIT

Last updated: 2026-03-27 12:46 EET  
Owner: PM/BA + Codex

## PM/BA
- Objective: keep the batch bounded to the fresh March 27 `T-032` defect
- Tasks:
  - record `patch_same_ticket`
  - keep `T-032` as the only active lane
  - require the next bundle before any broader conclusion
- Deliverable: bounded ticket decision
- Dependency: latest bundle evidence

## Architect
- Objective: patch the smallest runtime gate that matches the evidence
- Tasks:
  - tie recovery activation to quote-pressure rejection stages, not only raw spendable quote
  - avoid widening into unrelated exit-manager refactors
  - expose enough telemetry to validate the patch from the next bundle
- Deliverable: narrow gate-design correction
- Dependency: direct bundle read + bot-engine path review

## Trader
- Objective: keep recovery sells bounded and capital-aware
- Tasks:
  - treat quote-spendable-floor and quote-exposure-cap loops as trapped-liquidity pressure
  - reject panic-style liquidation outside the bounded recovery fraction
  - use the next bundle to judge whether the patch reduces deadlock without creating churn
- Deliverable: execution-risk sanity check
- Dependency: live bundle facts

## Runtime Analyst
- Objective: prove or falsify the new gate behavior quickly
- Tasks:
  - inspect the next fresh bundle for `gateAttempted`, `pressureDetected`, and `attemptedReason`
  - confirm whether a `no-feasible-liquidity-recovery` trade appears
  - escalate only if the next bundle shows continued boxed-in behavior
- Deliverable: next-bundle validation read
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
  - update batch decision artifacts from normalization mode to `T-032` patch mode
  - keep DONE history untouched
  - carry forward only fresh-bundle evidence
- Deliverable: current batch docs aligned to code state
- Dependency: PM/BA decision

## Senior BE/UI
- Objective: implement and validate the bounded runtime fix
- Tasks:
  - patch `apps/api/src/modules/bot/bot-engine.service.ts`
  - extend `apps/api/src/modules/bot/bot-engine.service.test.ts`
  - run focused bot-engine tests without cache
- Deliverable: tested `T-032` code slice
- Dependency: architected patch hypothesis
