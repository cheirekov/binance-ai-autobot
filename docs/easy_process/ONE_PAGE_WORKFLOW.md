# ONE_PAGE_WORKFLOW

This is the simple operating model for Codex/Cline/Qwen.

## Files to read first
Always read in this order for the normal bundle cycle:
1. `docs/DELIVERY_BOARD.md`
2. `docs/SESSION_BRIEF.md`
3. `docs/RETROSPECTIVE_AUTO.md`
4. `docs/PM_BA_CHANGELOG.md`
5. `docs/easy_process/LATEST_BATCH_DECISION.md`

Do not start from raw `state.json`.
Do not assume the time from chat history.
Do not load archive `docs/easy_process/*` files by default.

## Read only when needed
- `docs/PM_BA_PLAYBOOK.md`
- `docs/RUN_LOGGING_P0.md`
- `docs/easy_process/ACTIVE_TICKET.md`
- `docs/easy_process/NEXT_BATCH_PLAN.md`
- `docs/easy_process/CAPABILITY_ROADMAP.md`
- `docs/easy_process/PRODUCTION_GATES.md`
- `docs/easy_process/MARKET_INTELLIGENCE_LANE.md`
- `docs/easy_process/README.md`

## The only 5 questions that matter at batch start
1. What is the correct **lane**?
2. What is the correct **single active ticket**?
3. What is the exact **current mode and cycle context**?
4. Is the latest evidence good enough to patch?
5. If not, what is the next validation or triage move?

## The 4 allowed PM/BA decisions
- `continue_same_ticket`
- `patch_same_ticket`
- `rollback_same_ticket`
- `pivot_ticket`

## The 4 allowed coding states
- `NO_CODE` — evidence not good enough yet
- `VALIDATION_ONLY` — build tests/replay/harness, not behavior patch
- `PATCH_ALLOWED` — behavior patch justified and bounded
- `HOTFIX_ONLY` — emergency bounded fix only, with explicit rollback

## Anti-drift rules
- Never use the latest bundle as the whole program plan.
- Never stay on runtime waiting when validation is the real blocker.
- Never treat one green or one red market window as adaptation proof.
- Never let raw state become the primary onboarding surface.
- Never trust previous chat memory over the authoritative live working set.
- Do not expand the doc load unless the batch truly needs it.
