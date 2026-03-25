# DECISION_LEDGER

Last updated: 2026-03-25  
Owner: PM/BA

Purpose:
preserve the reasoning trail across cycles in a compact append-only form.

## How to use
- append new entries at the top,
- keep entries short,
- never rewrite historical decisions except to add a correction note,
- if a decision is reversed later, add a new entry instead of editing the old one.

## Entry template
```md
### 2026-03-25T00:00:00Z | cycle=POST_STUCK_PROCESS_HARDENING | decision=validation_only
- active_ticket: T-032
- lane: Lane B — Deterministic validation
- evidence_class: stale
- observed:
  - latest bundle produced no fresh runtime proof
- inferred:
  - live waiting is no longer efficient validation
- action:
  - switch next batch to deterministic validation
- rollback_or_revisit_when:
  - a fresh bundle or validation result changes the evidence
```

## Ledger

### 2026-03-25T20:38:57Z | cycle=POST_FRESH_RUNTIME_PATCH | decision=patch_now
- active_ticket: T-032
- lane: Lane A — Runtime stability
- evidence_class: fresh
- observed:
  - latest authoritative bundle is `autobot-feedback-20260325-195431.tgz`
  - dominant loop remained `Skip BTCUSDC: Grid guard paused BUY leg (17)`
  - no runtime `grid-guard-defensive-unwind` evidence appeared
- inferred:
  - repeated guard-pause skips were being logged without enough persistent symbol cooldown pressure
  - stale easy-process files were contradicting fresher authoritative docs
- action:
  - patch the same T-032 lane now
  - update easy-process files to mirror `RETROSPECTIVE_AUTO.md` and `SESSION_BRIEF.md`
  - validate the patch and collect the next fresh bundle
- rollback_or_revisit_when:
  - the next fresh bundle shows unchanged loop pressure, or the cooldown creates churn / funding regression

### 2026-03-25T00:00:00Z | cycle=POST_STUCK_PROCESS_HARDENING | decision=validation_only
- active_ticket: T-032
- lane: Lane B — Deterministic validation
- evidence_class: stale
- observed:
  - latest reviewed bundle was classified as stale
  - no fresh runtime proof appeared after the earlier patch
- inferred:
  - the workflow was spending effort on repeated bundle interpretation instead of proof generation
- action:
  - do not request another speculative runtime patch
  - harden the process against context loss and time ambiguity
  - route the next technical batch through deterministic validation
- rollback_or_revisit_when:
  - a deterministic validation result or truly fresh bundle changes the evidence

### 2026-03-24T09:18:26Z | cycle=MORNING_REVIEW | decision=validation_required
- active_ticket: T-032
- lane: Lane B — Deterministic validation
- evidence_class: stale
- observed:
  - same build and no new visible decision timestamp progression in the reviewed state
- inferred:
  - more short bundles would not improve confidence
- action:
  - stop relying on live waiting as the primary validation path
- rollback_or_revisit_when:
  - new evidence proves the path is already exercised
