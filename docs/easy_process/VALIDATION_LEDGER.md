# VALIDATION_LEDGER

Last updated: 2026-03-28 10:47 EET  
Owner: PM/BA + Runtime Analyst + Trader

Purpose:
track which runtime behaviors have real proof and which are still only hypotheses.

## Ticket currently under validation
- `T-032`
- Current batch action: `pivot_ticket`

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
- the current question is whether `ABS_DAILY_LOSS` caution global new-symbol pause at `3.40%` exposure is intended healthy idle or over-restrictive policy
- next proof needed: PM/BA lane decision, not another same-ticket patch

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
- `inconclusive`
- latest fresh bundle runs the deployed fix on `5927bd9` and no longer shows the old defensive cancel signature
- the same bundle is globally paused under `ABS_DAILY_LOSS`, so the resting-buy path is not fully exercised in the review window

### S8 — Daily-loss caution re-entry policy
Question:
- once managed exposure is already very low, should `ABS_DAILY_LOSS` caution still globally pause all new symbols?

Status:
- `running`
- latest fresh bundle shows `200` skips, `0` trades, `0` active orders, and dominant `daily loss caution paused new symbols` at only `3.40%` exposure
- next proof needed: PM/BA must decide whether this becomes a new follow-up / hardening ticket or is accepted as intended loss-protection behavior

## Validation result states
Use only one:
- `not_started`
- `planned`
- `running`
- `proved`
- `failed`
- `inconclusive`

## Current validation evidence
- `autobot-feedback-20260328-084345.tgz` ✅
- raw bundle review (`last_run_summary.json`, `state.json`, `adaptive-shadow.tail.jsonl`) ✅
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
