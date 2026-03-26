# PM_TASK_SPLIT

Last updated: 2026-03-26 11:44 EET  
Owner: PM/BA + Codex

## PM/BA
- Objective: keep one active ticket while separating ops credibility from strategy behavior
- Tasks:
  - keep `T-032` active
  - block blind live patching and long-run evaluation until post-adjustment freshness is confirmed
  - choose `ROLLBACK_NOW`, `PATCH_NOW`, or `PIVOT_TICKET` only after the guard-pause interaction is proven
- Deliverable: one clear post-adjustment decision gate
- Dependency: fresh March 26 evidence plus this batch's ops adjustment

## Architect
- Objective: prove whether the March 25 guard-pause slice is a regression
- Tasks:
  - trace guard-pause `COOLDOWN` from creation to symbol blocking
  - prove whether that block prevents `grid-guard-defensive-unwind`
  - define the smallest safe rollback or replacement patch
- Deliverable: rollback-vs-patch recommendation with exact code/test surface
- Dependency: [bot-engine.service.ts](/home/yc/work/binance-ai-autobot/apps/api/src/modules/bot/bot-engine.service.ts) and March 25 / March 26 evidence

## Trader
- Objective: define the professional acceptability boundary once telemetry is trustworthy again
- Tasks:
  - separate acceptable reserve-floor idle from unacceptable boxed-in inactivity
  - define what fresh post-adjustment evidence would count as live credibility restored
- Deliverable: trader accept/reject criteria for the next bundle
- Dependency: updated telemetry semantics and fresh runtime evidence

## Runtime Analyst
- Objective: confirm the process is truly alive before more strategy interpretation
- Tasks:
  - verify clean restart state vs persisted `running=true` memory
  - confirm state timestamps and adaptive tail move after deployment
  - capture one short confirmation bundle after clean recreate
- Deliverable: process-freshness check
- Dependency: operator deploy/restart of this batch

## AI Specialist
- Objective: keep the incident out of AI scope
- Tasks:
  - confirm no AI/autonomy behavior changed
  - keep hard risk and deterministic execution as the only live authorities
- Deliverable: AI scope isolation note
- Dependency: code review only

## State Steward
- Objective: leave a single authoritative incident memory surface
- Tasks:
  - keep `PROCESS_STATE_CONFLICT = true` explicit
  - record why `docs/SESSION_BRIEF.md` is not authoritative for this batch
  - ensure the new P0 incident files outrank stale patch narratives
- Deliverable: coherent P0 handoff
- Dependency: final batch decision

## Senior BE/UI
- Objective: restore operator trust without changing trading behavior
- Tasks:
  - keep the rolling-24h summary correction
  - keep stale-state / stale-timeline visibility in the dashboard
  - next, add the missing deterministic `T-032` regression test around guard-pause blocking vs unwind
- Deliverable: ops credibility patch now, proof-bearing `T-032` batch next
- Dependency: Architect + Runtime Analyst findings
