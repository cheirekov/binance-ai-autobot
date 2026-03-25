# ONE_PAGE_WORKFLOW

This is the simple operating model for Codex/Cline/Qwen.

## Files to read first
Always read in this order:
1. `docs/easy_process/PROGRAM_STATUS.md`
2. `docs/easy_process/ACTIVE_TICKET.md`
3. `docs/easy_process/RUN_CONTEXT.md`
4. `docs/easy_process/BUNDLE_DIGEST.md`
5. `docs/easy_process/STATE_DIGEST.md`
6. `docs/easy_process/VALIDATION_LEDGER.md`
7. `docs/easy_process/DECISION_LEDGER.md`
8. `docs/easy_process/NEXT_CYCLE_HANDOFF.md`
9. `docs/SESSION_BRIEF.md`
10. `docs/DELIVERY_BOARD.md`
11. `docs/PM_BA_PLAYBOOK.md`
12. `docs/TEAM_OPERATING_RULES.md`

Do not start from raw `state.json`.
Do not assume the time from chat history.

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
- Never trust previous chat memory over `RUN_CONTEXT.md`.
- Every cycle must append to the ledger and leave a handoff.
