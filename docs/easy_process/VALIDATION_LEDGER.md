# VALIDATION_LEDGER

Last updated: 2026-03-25  
Owner: PM/BA + Runtime Analyst + Trader

Purpose:
track which runtime behaviors have real proof and which are still only hypotheses.

## Ticket currently under validation
- `T-032`

## Required scenario classes
Each strategy/runtime change should eventually cover more than one market condition.

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
- hypothesis only

### S4 — Funding/routing pressure
Question:
- does the new behavior avoid reintroducing funding deadlocks?

Status:
- must be checked in deterministic validation

### S5 — Healthy idle vs stuck
Question:
- can we distinguish "correctly idle" from "execution/process deadlock"?

Status:
- needs explicit classifier and acceptance criteria

## Validation result states
Use only one:
- `not_started`
- `planned`
- `running`
- `proved`
- `failed`
- `inconclusive`

## Promotion rule
A runtime/strategy behavior is not "adaptive" just because it looked good in one recent market patch.
Before promotion, it must have evidence from at least:
- one range-leaning case
- one trend-leaning case
or deterministic equivalents accepted by PM/BA.
