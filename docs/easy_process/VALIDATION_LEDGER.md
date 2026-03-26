# VALIDATION_LEDGER

Last updated: 2026-03-26  
Owner: PM/BA + Runtime Analyst + Trader

Purpose:
track which runtime behaviors have real proof and which are still only hypotheses.

## Ticket currently under validation
- `T-032`
- Current batch action: `DETERMINISTIC_VALIDATION`

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
- running
- March 26 evidence shows no live unwind proof after the March 25 patch deployment

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
- March 26 evidence suggests boxed-in `no feasible candidates` waiting is being conflated with a hard-stuck loop

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
