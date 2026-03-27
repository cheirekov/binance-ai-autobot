# PM_TASK_SPLIT

Last updated: 2026-03-27 18:03 EET  
Owner: PM/BA + Codex

## PM/BA
- Objective: keep the batch bounded to the fresh March 27 `T-032` defect
- Tasks:
  - record `patch_same_ticket`
  - keep `T-032` as the only active lane
  - record that auto-retro raised `pivot_required`, but manual raw bundle review still supports a same-ticket fix
  - require the next bundle before any broader lane change
- Deliverable: bounded ticket decision
- Dependency: latest bundle evidence

## Architect
- Objective: patch the smallest runtime gate that matches the evidence
- Tasks:
  - gate defensive BUY-limit cancellation behind an actual buy-pause state
  - preserve resting BUY ladder orders in `DEFENSIVE` when buys are allowed
  - avoid widening into unrelated exit-manager refactors
- Deliverable: defensive cancel-gating correction
- Dependency: direct bundle read + bot-engine path review

## Trader
- Objective: keep recovery sells bounded and capital-aware
- Tasks:
  - accept that the bot is still in `CAUTION`, so true buy pauses must remain enforceable
  - avoid reopening aggressive buys just to suppress churn
  - use the next bundle to judge whether preserving resting buys reduces idle churn without harming de-risking
- Deliverable: defensive-order risk sanity check
- Dependency: live bundle facts

## Runtime Analyst
- Objective: prove or falsify the new gate behavior quickly
- Tasks:
  - inspect the next fresh bundle for loss of repeated `grid-ladder-buy` / defensive cancel alternation
  - confirm defensive BUY-order cancels only happen when buy pauses are active
  - confirm the prior `no-feasible-liquidity-recovery` trade path still appears when needed
- Deliverable: next-bundle defensive-cancel validation read
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
  - update batch decision artifacts from caution-threshold mode to defensive cancel-gating mode
  - keep DONE history untouched
  - keep auto-retro intact while recording the manual same-ticket override in human-owned docs
- Deliverable: current batch docs aligned to code state
- Dependency: PM/BA decision

## Senior BE/UI
- Objective: implement and validate the bounded runtime fix
- Tasks:
  - patch `apps/api/src/modules/bot/bot-engine.service.ts`
  - extend `apps/api/src/modules/bot/bot-engine.service.test.ts`
  - add the March 27 triage note and update the session/easy-process handoff docs for the new bundle
  - run focused bot-engine tests without cache
- Deliverable: tested `T-032` code slice
- Dependency: architected patch hypothesis
