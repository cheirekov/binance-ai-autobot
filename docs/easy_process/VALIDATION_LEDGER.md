# VALIDATION_LEDGER

Last updated: 2026-03-27 18:03 EET  
Owner: PM/BA + Runtime Analyst + Trader

Purpose:
track which runtime behaviors have real proof and which are still only hypotheses.

## Ticket currently under validation
- `T-032`
- Current batch action: `patch_same_ticket`

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
- `inconclusive`
- the March 23 guard-pause loop is no longer the dominant latest signal in the 2026-03-27 bundle
- keep the old guard-pause evidence as history, not as current batch authority

### S4 — Funding/routing pressure
Question:
- does the new behavior avoid reintroducing funding deadlocks?

Status:
- `running`
- latest March 27 evidence says funding regression absent
- `T-034` stays closed unless fresh evidence proves a new follow-up is needed

### S5 — Healthy idle vs stuck
Question:
- can we distinguish "correctly idle" from "execution/process deadlock"?

Status:
- `running`
- latest bundle is fresh and not a proved engine-dead incident
- the current same-ticket question is whether defensive order maintenance is falsely canceling BUY limits that should be allowed to rest
- next proof needed: confirm the next bundle no longer alternates `grid-ladder-buy` with defensive cancel cleanup while buys are allowed

### S6 — No-feasible liquidity recovery under reserve starvation
Question:
- when spendable quote after reserve is too low, does the bot re-enable recovery sells instead of staying boxed into `No feasible` skips?

Status:
- `proved`
- latest fresh bundle contains a real `no-feasible-liquidity-recovery` sell on `TAOUSDC`
- the prior same-ticket gate patch now has live runtime evidence

### S7 — Defensive BUY-order maintenance
Question:
- does `DEFENSIVE` cancel bot-owned BUY LIMIT orders only when a true buy pause is active?

Status:
- `running`
- latest fresh bundle shows repeated defensive BUY-order cancel/recreate churn on `BTCUSDC` / `ETHUSDC` while regime is `NEUTRAL`
- next proof needed: no repeated churn when `buyPaused=false`, and any remaining cancel should align with an active caution/grid-guard pause

## Validation result states
Use only one:
- `not_started`
- `planned`
- `running`
- `proved`
- `failed`
- `inconclusive`

## Current validation evidence
- `./scripts/pmba-gate.sh start` ✅
- `./scripts/pmba-gate.sh end` ✅
- `./scripts/validate-active-ticket.sh` ✅
- `./node_modules/.bin/vitest run --no-cache src/modules/bot/bot-engine.service.test.ts` ✅

## Promotion rule
A runtime/strategy behavior is not "adaptive" just because it looked good in one recent market patch.
Before promotion, it must have evidence from at least:
- one range-leaning case
- one trend-leaning case
- or deterministic equivalents accepted by PM/BA
