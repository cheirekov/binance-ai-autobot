# Team Operating Rules (Hard)

Purpose: keep execution stable across long-running sessions and context resets.

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

## Delivery workflow (mandatory)

1. Select the next `TODO` ticket in `docs/DELIVERY_BOARD.md`.
2. Move it to `IN_PROGRESS` and note date/owner.
3. Implement code + tests.
4. Run `docker compose -f docker-compose.ci.yml run --rm ci`.
5. Add a structured entry in `docs/PM_BA_CHANGELOG.md`.
6. Mark ticket `DONE` (or `BLOCKED` with reason and next action).

## Definition of done

A ticket is done only if all are true:

- Code merged and builds in Docker CI.
- Ticket status updated in `docs/DELIVERY_BOARD.md`.
- Changelog entry exists in `docs/PM_BA_CHANGELOG.md`.
- Runtime validation plan is stated (or completed with bundle id).
