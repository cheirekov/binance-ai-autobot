# VALIDATION_LEDGER

Last updated: 2026-05-04 11:50 EEST
Owner: PM/BA + Runtime Analyst + Trader

Purpose:
track which runtime behaviors have real proof and which are still only hypotheses.

## Ticket currently under validation
- `T-031`
- Current batch action: `patch_ready`

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
- preserved support lane
- `T-032` remains linked support; May 4 adds fee-aware daily-loss/giveback protection and severe near-halt fresh-symbol pause

### S3 — Regime-quality entry adaptation
Question:
- does the regime engine classify stronger trend conditions earlier and feed a better entry-quality gate?

Status:
- `running`
- May 4 evidence proves actionability restored into orders; current validation focus is whether strategy activity stops fee/giveback churn before reopening entries

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
- latest May 4 bundle is not engine-dead; it traded heavily, then entered daily-loss/giveback protection
- next bundle must distinguish intentional severe-loss pause from a new execution deadlock

### S6 — Regime-aware fee floor
Question:
- in strong bull-trend conditions, can the bot avoid unnecessary fee-edge idling without weakening bear-side protection?

Status:
- `running`
- first `T-031` slice implemented in this batch

### S7 — No-feasible liquidity recovery under reserve starvation
Question:
- when spendable quote after reserve is too low, does the bot re-enable recovery sells instead of staying boxed into `No feasible` skips?

Status:
- `proved`
- latest fresh bundle contains a real `no-feasible-liquidity-recovery` sell on `TAOUSDC`
- the prior same-ticket gate patch now has live runtime evidence

### S8 — Defensive BUY-order maintenance
Question:
- does `DEFENSIVE` cancel bot-owned BUY LIMIT orders only when a true buy pause is active?

Status:
- `inconclusive`
- latest fresh bundle runs the deployed fix on `5927bd9` and no longer shows the old defensive cancel signature
- the same bundle is globally paused under `ABS_DAILY_LOSS`, so the resting-buy path is not fully exercised in the review window

### S9 — Daily-loss caution re-entry policy
Question:
- once managed exposure is already very low, should `ABS_DAILY_LOSS` caution still globally pause all new symbols?

Status:
- `running`
- this remains an open historical question from `autobot-feedback-20260328-084345.tgz`
- it is not the dominant current blocker in `autobot-feedback-20260328-202730.tgz`

## Validation result states
Use only one:
- `not_started`
- `planned`
- `running`
- `proved`
- `failed`
- `inconclusive`

## Current validation evidence
- `autobot-feedback-20260328-202730.tgz` ✅
- `autobot-feedback-20260328-084345.tgz` ✅
- raw bundle review (`last_run_summary.json`, `state.json`, `adaptive-shadow.tail.jsonl`) ✅
- `./scripts/pmba-gate.sh start` ✅
- `./scripts/pmba-gate.sh end` ✅
- `./scripts/pmba-gate.sh start` ✅
- `docker compose -f docker-compose.ci.yml run --rm ci` ✅

## Promotion rule
A runtime/strategy behavior is not "adaptive" just because it looked good in one recent market patch.
Before promotion, it must have evidence from at least:
- one range-leaning case
- one trend-leaning case
- or deterministic equivalents accepted by PM/BA
