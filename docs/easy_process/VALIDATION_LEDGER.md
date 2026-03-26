# VALIDATION_LEDGER

Last updated: 2026-03-26 12:13 EET  
Owner: PM/BA + Runtime Analyst + Trader

Purpose:
track which runtime behaviors have real proof and which are still only hypotheses.

## Ticket currently under validation
- `T-032`
- Current batch action: `PATCH_NOW`

## Required scenario classes

### S1 — Green repricing with low free quote
Question:
- can the bot be mostly allocated and still behave normally without overtrading?

Status:
- partly observed in live bundles

### S2 — Adverse move while highly allocated
Question:
- does the bot de-risk earlier instead of only waiting?

Status:
- not yet proven deterministically

### S3 — Repeated grid-guard loop / bear-trend persistence
Question:
- does the system escalate from passive waiting to bounded unwind?

Status:
- patched
- this batch removed the March 25 hard-block / short-circuit regression surface
- fresh post-deploy confirmation is still required

### S4 — Funding/routing pressure
Question:
- does the new behavior avoid reintroducing funding deadlocks?

Status:
- planned

### S5 — Healthy idle vs stuck
Question:
- can we distinguish "correctly idle" from "execution/process deadlock"?

Status:
- running
- prior ops-adjustment batch repaired the credibility surface
- this batch repaired an engine-path blocker

## Validation result states
Use only one:
- `not_started`
- `planned`
- `running`
- `proved`
- `failed`
- `inconclusive`

## Current validation evidence
- `./scripts/validate-active-ticket.sh` ✅
- `docker compose -f docker-compose.ci.yml run --rm ci` ✅

## Promotion rule
A runtime/strategy behavior is not "adaptive" just because it looked good in one recent market patch.
Before promotion, it must have evidence from at least:
- one range-leaning case
- one trend-leaning case
or deterministic equivalents accepted by PM/BA.
