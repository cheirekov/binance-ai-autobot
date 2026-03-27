# AUTHORITATIVE_SOURCE_DECISION

Last updated: 2026-03-27 12:33 EET  
Owner: PM/BA + Codex

## Source priority
1. Ticket status and active lane: `docs/DELIVERY_BOARD.md`
2. Historical delivery evidence and ratified batch decisions: `docs/PM_BA_CHANGELOG.md`
3. Latest runtime evidence: `docs/SESSION_BRIEF.md` Section 4 plus `docs/RETROSPECTIVE_AUTO.md` dated 2026-03-27
4. Derived working memory: `docs/easy_process/*`

## Explicit authority by topic
- Closed / DONE ticket history:
  - authoritative: `docs/DELIVERY_BOARD.md`, `docs/PM_BA_CHANGELOG.md`
  - not authoritative: `docs/SESSION_BRIEF.md`, `docs/RETROSPECTIVE_AUTO.md`, `docs/easy_process/*`
- Current active ticket:
  - authoritative: `docs/DELIVERY_BOARD.md`
  - confirming sources: `docs/PM_BA_CHANGELOG.md`, `docs/TICKET_SWITCH_RETRO.md`
- Latest runtime evidence:
  - authoritative: the latest ingested evidence as mirrored in `docs/SESSION_BRIEF.md` Section 4 and `docs/RETROSPECTIVE_AUTO.md`
  - historical context only: older incident notes and patch-result notes
- Current derived process memory:
  - authoritative only as working memory after it is aligned to the sources above

## Conflict-resolution rule
- If `docs/easy_process/*` conflicts with board/changelog/runtime evidence, update `docs/easy_process/*`.
- Do not normalize board/changelog history to match stale derived files.
- Do not use derived files to reopen or redefine a DONE ticket.

## Current normalization decision
- The March 26 `P0_INCIDENT_SUMMARY` / `PATCH_RESULT` artifacts remain valid history for that batch, but they are not the current batch authority after the March 27 fresh bundle.
- The March 27 `continue active ticket` result is now ratified through `docs/PM_BA_CHANGELOG.md` and mirrored into the easy-process layer.
