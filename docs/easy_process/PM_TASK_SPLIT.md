# PM_TASK_SPLIT

Last updated: 2026-03-25 20:38 UTC  
Owner: PM/BA + Codex

## PM/BA
- Objective: keep `T-032` as the single active ticket and verify the fresh `patch_required` decision is reflected everywhere
- Tasks:
  - confirm `PATCH_NOW` remains the authoritative batch action from fresh evidence
  - compare the next fresh bundle against the pre-patch BTCUSDC/SOLUSDC loop baseline
- Deliverable: go/no-go decision after the next fresh bundle
- Dependency: post-patch validation and fresh runtime evidence

## Architect
- Objective: verify the patch stays inside the smallest safe code surface
- Tasks:
  - review the new guard-pause cooldown path and confirm it does not widen unwind policy
  - review rollback trigger if the cooldown suppresses legitimate sell work
- Deliverable: architecture sign-off or rollback recommendation
- Dependency: code diff and post-patch bundle

## Trader
- Objective: judge whether the patched behavior is professionally acceptable
- Tasks:
  - verify that repeated guard-pause loops reduce without reintroducing overtrading
  - confirm the bot still de-risks inventory professionally under bear conditions
- Deliverable: trader accept/reject call on post-patch behavior
- Dependency: fresh post-patch bundle

## Runtime Analyst
- Objective: measure whether the stuck runtime loop actually improved
- Tasks:
  - compare pre/post patch counts for `Grid guard paused BUY leg` and `Grid waiting for ladder slot or inventory`
  - check for any new `grid-guard-defensive-unwind` or cooldown evidence
- Deliverable: concise before/after runtime comparison
- Dependency: fresh post-patch bundle

## AI Specialist
- Objective: confirm the patch remains outside AI authority
- Tasks:
  - verify no AI/autonomy path changed
  - confirm risk policy still dominates any adaptive behavior
- Deliverable: AI/risk isolation confirmation
- Dependency: code diff only

## State Steward
- Objective: keep repo handoff memory consistent after the March 25 conflict
- Tasks:
  - verify easy-process files still mirror `RETROSPECTIVE_AUTO.md` and `SESSION_BRIEF.md`
  - update stale state again only if the next bundle changes the decision
- Deliverable: clean handoff state for the next LLM
- Dependency: final docs from this batch

## Senior BE/UI
- Objective: execute and validate the same-ticket mitigation
- Tasks:
  - run targeted validation and Docker-backed validation
  - deploy the patched build and collect the next fresh bundle
- Deliverable: validated patch and bundle for next review
- Dependency: current workspace and operator access
