# Program Retro — 2026-03-24 Process Correction

Last updated: 2026-03-24 10:00 UTC
Scope: fix the evidence/review process so live-market waiting does not produce false patch decisions.

## Observed failures

- Repeated live bundles were treated as fresh evidence even when:
  - `lastDecisionTs` did not move,
  - activity totals did not change,
  - only wallet mark-to-market changed.
- `RETROSPECTIVE_AUTO.md`, `SESSION_BRIEF.md`, and `pmba-gate.sh` could disagree on the same bundle.
- Remote/local tooling selected the “latest” bundle by mtime instead of the bundle timestamp in the filename.
- `run-batch.sh` bypassed the full ingest path, so retrospectives and gates were not always applied.
- Bundles did not consistently include the PM/BA artifacts needed to audit a ticket switch or program-level pivot.

## Root causes

- No explicit freshness classifier existed for bundle review.
- Review logic used cumulative state snapshots as if every bundle were a clean validation window.
- Session brief and auto-retro each made their own batch decision instead of sharing one source of truth.
- Process scripts were permissive on missing metadata and inconsistent on bundle discovery.

## Hard corrections

- `scripts/feedback-evidence.js` now classifies bundles as:
  - `fresh`
  - `mark_to_market_only`
  - `stale`
- `docs/RETROSPECTIVE_AUTO.md` is now the batch decision source of truth.
- `docs/SESSION_BRIEF.md` Section 4 must mirror the retrospective decision.
- `pmba-gate.sh end` skips dominant-loop failure on stale bundles and fails if session brief and retrospective disagree.
- Two consecutive stale/mark-to-market-only bundles now require deterministic validation instead of more live-wait bundles.
- Bundle collection/ingest now uses deterministic filename ordering, not mtime ordering.

## Operator consequences

- A stale bundle is still useful, but only for:
  - wallet/equity observation,
  - confirming the bot did not produce fresh runtime evidence.
- A stale bundle is not valid justification for:
  - a same-ticket mitigation patch,
  - a lane pivot,
  - closing a ticket.
- If ingestion says `validation_required`, the next step is not “wait another 1-2 hours”; the next step is deterministic validation for the active ticket.

## Next gap

- `T-032` still needs a deterministic validation path so downside-control changes can be exercised without waiting on the live market to reproduce the case.
