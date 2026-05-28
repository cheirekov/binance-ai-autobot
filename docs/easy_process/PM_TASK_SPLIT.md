# PM_TASK_SPLIT

Last updated: 2026-05-28 11:05 UTC
Owner: PM/BA + Codex

## PM/BA
- Objective: stop the live-evidence patch loop.
- Tasks: activate `T-040`, freeze `T-031/T-032`, define severity threshold.
- Deliverable: beta-readiness decision packet.

## Architect
- Objective: separate runtime behavior from release readiness.
- Tasks: identify deterministic validation gaps and release blockers.
- Deliverable: Gate P1 validation map.

## Trader
- Objective: prevent overfitting to one live market window.
- Tasks: classify live skip churn as normal/adverse/safety-critical.
- Deliverable: severity rubric for trading evidence.

## Runtime Analyst
- Objective: make evidence compact and actionable.
- Tasks: define required bundle fields and pass/fail signals for beta.
- Deliverable: beta-readiness evidence checklist.

## AI Specialist
- Objective: keep AI/adaptive claims honest.
- Tasks: ensure AI remains shadow/gated until promotion ladder evidence exists.
- Deliverable: AI scope freeze for beta.

## State Steward
- Objective: clean working memory.
- Tasks: update board, session, switch retro, easy-process files, and skill.
- Deliverable: future agents start from `T-040`.

## Senior BE/UI
- Objective: validate without unnecessary code.
- Tasks: run gates, add deterministic validation only if needed.
- Deliverable: validation result and remaining blockers.
