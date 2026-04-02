# AUTHORITATIVE_SOURCE_DECISION

Last updated: 2026-04-02 09:35 EEST  
Owner: PM/BA + Codex

## Source priority
1. Ticket status and active lane: `docs/DELIVERY_BOARD.md`
2. Historical delivery evidence and ratified batch decisions: `docs/PM_BA_CHANGELOG.md`
3. Latest runtime evidence: `docs/SESSION_BRIEF.md` Section 4 plus `docs/RETROSPECTIVE_AUTO.md`
4. Current derived working memory: `docs/easy_process/LATEST_BATCH_DECISION.md`
5. All other `docs/easy_process/*`: on-demand reference or archive only

## Default live working set

Only these files should be loaded in the normal bundle cycle:
- `docs/DELIVERY_BOARD.md`
- `docs/PM_BA_CHANGELOG.md`
- `docs/SESSION_BRIEF.md`
- `docs/RETROSPECTIVE_AUTO.md`
- `docs/easy_process/LATEST_BATCH_DECISION.md`

Everything else in `docs/easy_process/*` is reference-only unless the batch explicitly needs it.

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
- Do not load archive/reference `docs/easy_process/*` files by default during routine bundle handling.

## Current normalization decision
- `docs/easy_process/README.md` is now the compact index for what stays live vs what is archive/reference.
- Historical `easy_process` files remain valid, but they are no longer part of the default working-memory load for normal bundle cycles.
