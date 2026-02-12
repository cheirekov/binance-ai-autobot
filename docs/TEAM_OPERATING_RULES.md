# Team Operating Rules (Hard)

Purpose: keep execution stable across long-running sessions and context resets.

Companion docs:

- `docs/PM_BA_PLAYBOOK.md` (how PM/BA prioritize and define done)
- `docs/SESSION_BRIEF.md` (single-session handoff and execution contract)

## Team roles (mandatory)

- `PM/BA`
  - Own ticket priority, acceptance criteria, and stop/go decisions.
- `Solution Architect`
  - Own system boundaries, integration safety, and technical sequencing.
- `Professional Trader`
  - Own market-structure checks, strategy realism, and risk assumptions.
- `Senior BE/UI`
  - Own implementation quality, telemetry, and operational usability.
- `AI Specialist`
  - Own adaptive-policy experiment design, shadow-mode quality gates, and promotion criteria from shadow to execution.

## Hard rules

1. Every implementation patch must map to a ticket in `docs/DELIVERY_BOARD.md`.
2. Every implementation patch must create an entry in `docs/PM_BA_CHANGELOG.md`.
3. Every changelog entry must include:
   - BA requirement mapping
   - PM milestone mapping
   - Risk slider impact (`none` or explicit behavior change)
   - Validation evidence (`ci`, runtime bundle id, or both)
4. No “hidden” behavior changes. If logic changes but no doc entry exists, the patch is incomplete.
5. Risk slider is first-class:
   - If trading behavior changes, evaluate and document risk-scaling impact.
   - If no risk impact, explicitly state `Risk impact: none`.
6. Keep one active ticket at a time (`IN_PROGRESS`) to avoid drift.
7. Do not start a new ticket before closing or deferring the current one.
8. Runtime issues must be triaged from bundle artifacts first (`state`, telemetry, API log tail), then patched.
9. Each patch batch must be tested with Docker CI before handoff.
10. Avoid micro-churn. Group related fixes into a single testable batch.
11. If scope changes, update board/changelog before additional code changes.
12. If a decision is postponed, capture reason + owner + trigger for revisit.
13. Commit messages must be actionable and structured. Disallow generic subjects (`Implemented`, `Patched`, `Code changes`, `What changed`).
14. Commit subject format: `<type>(<scope>): <outcome>` (preferred) or concise imperative summary.
15. Keep commit subject <= 72 chars and include details in body when needed.
16. One delivery lane only: exactly one ticket may be `IN_PROGRESS` at any time.
17. Every patch batch must be timeboxed before coding starts:
   - day batch: `2-4h`
   - night batch: `8-12h`
18. Every batch must define before coding:
   - hypothesis
   - KPI target delta
   - stop/rollback condition
19. If two consecutive batches show no KPI improvement, feature expansion pauses until root-cause analysis is documented.
20. Adaptive/AI logic must ship in shadow-first mode unless PM/BA explicitly approves promotion with measurable gates.
21. Every batch must start by updating `docs/SESSION_BRIEF.md` with active ticket, scope, DoD, KPIs, and stop condition.
22. Ticket prioritization and DoD must follow `docs/PM_BA_PLAYBOOK.md`; ad-hoc priority decisions are not allowed.

## Delivery workflow (mandatory)

1. Update `docs/SESSION_BRIEF.md` (timebox, hypothesis, DoD, KPI targets, stop condition).
2. Select the next `TODO` ticket in `docs/DELIVERY_BOARD.md` using `docs/PM_BA_PLAYBOOK.md`.
3. Move it to `IN_PROGRESS` and note date/owner.
4. Implement code + tests.
5. Run `docker compose -f docker-compose.ci.yml run --rm ci`.
6. Add a structured entry in `docs/PM_BA_CHANGELOG.md`.
7. Mark ticket `DONE` (or `BLOCKED` with reason and next action).

## Batch cadence (mandatory)

1. Start-of-batch brief (max 10 lines) in `docs/PM_BA_CHANGELOG.md`:
   - scope, hypothesis, target KPI delta, stop condition.
2. End-of-batch result:
   - run `./scripts/collect-feedback.sh` then `./scripts/update-session-brief.sh`,
   - observed KPI delta,
   - decision (`continue`, `rollback`, `pivot`),
   - next batch owner.

## Commit subject examples

Good:

- `feat(bot): add exposure-aware candidate fallback`
- `fix(ui): prevent table header letter wrapping`
- `feat(config): support binance credential rotation`

Bad:

- `Implemented`
- `Patched`
- `What changed`

## Definition of done

A ticket is done only if all are true:

- Code merged and builds in Docker CI.
- Ticket status updated in `docs/DELIVERY_BOARD.md`.
- Changelog entry exists in `docs/PM_BA_CHANGELOG.md`.
- Runtime validation plan is stated (or completed with bundle id).
- `docs/SESSION_BRIEF.md` end-of-batch section is completed with decision (`continue`/`rollback`/`pivot`).
