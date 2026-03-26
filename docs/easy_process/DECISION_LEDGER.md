# DECISION_LEDGER

Last updated: 2026-03-26  
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

### 2026-03-26T09:44:49Z | cycle=P0_INCIDENT_RECOVERY | decision=operations_adjustment
- active_ticket: T-032
- lane: Lane E — State/process hygiene
- evidence_class: fresh bundle + stale local state surface
- observed:
  - March 26 fresh bundle on `a2a9ad0` still showed `Grid guard paused BUY leg (17 -> 17)` with no unwind evidence
  - `daily_net_usdt` in `last_run_summary` reused overall `net`
  - local `data/state.json` still said `running=true` while local Compose runtime was absent
- inferred:
  - operator trust was too weak to make another strategy decision safely
  - rollback was plausible but not yet proven as the dominant fix
- action:
  - execute an ops-credibility patch now
  - keep T-032 active
  - make the next behavior batch deterministic proof for rollback vs patch
- rollback_or_revisit_when:
  - deterministic validation proves the March 25 guard-pause slice should be reverted, or fresh post-adjustment evidence materially changes the picture

### 2026-03-26T09:23:36Z | cycle=POST_PIVOT_REVIEW_VALIDATION | decision=deterministic_validation
- active_ticket: T-032
- lane: Lane B — Deterministic validation
- evidence_class: fresh
- observed:
  - latest authoritative bundle is `autobot-feedback-20260326-090817.tgz`
  - fresh bundle git sha is `a2a9ad0`, so the March 25 patch was deployed
  - dominant aggregate loop still remained `Skip BTCUSDC: Grid guard paused BUY leg (17 -> 17)`
  - no runtime `grid-guard-defensive-unwind` evidence appeared
  - latest live decision tail was mostly `No eligible universe candidates` / `No feasible candidates`
- inferred:
  - runtime health is normal, so this is not primarily an ops incident
  - current validation is too weak to distinguish a real code bug from boxed-in but strategy-consistent waiting
  - the March 25 `PATCH_NOW` state is no longer the correct repository action
- action:
  - stop same-ticket live patching
  - keep `T-032` as the only active ticket
  - move the next engineering batch to deterministic validation
  - update easy-process files to mirror the March 26 authority pair
- rollback_or_revisit_when:
  - deterministic validation proves a minimal safe patch or rollback, or a materially different fresh bundle changes the runtime picture

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
