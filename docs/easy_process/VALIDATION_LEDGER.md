# VALIDATION_LEDGER

Last updated: 2026-03-26 18:47 EET  
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
- still not proved
- cumulative bundle summaries still carry the Mar 23 guard-pause loop
- this is no longer the only live blocker

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
- latest bundle shows the runtime is alive after restart, but not credibly progressing

### S6 — No-feasible liquidity recovery under reserve starvation
Question:
- when spendable quote after reserve is too low, does the bot re-enable recovery sells instead of staying boxed into `No feasible` skips?

Status:
- patched again
- latest `3a6a14f` bundle proved the previous amendment was still too strict
- fresh post-deploy confirmation is required

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
- or deterministic equivalents accepted by PM/BA
