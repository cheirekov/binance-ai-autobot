# NEXT_BATCH_PLAN

Last updated: 2026-03-25 20:38 UTC  
Owner: PM/BA + Codex

## Exact scope
Validate the `PATCH_NOW` T-032 guard-pause cooldown change against the next fresh runtime window.

## In scope
- run targeted validation for the updated T-032 grid-guard pause path
- deploy the patched workspace to the remote Binance Spot testnet runtime
- collect one fresh `1-3h` feedback bundle after deployment
- compare repeated `Grid guard paused BUY leg` and `Grid waiting for ladder slot or inventory` counts on `BTCUSDC` and `SOLUSDC`
- confirm no funding/routing regression from `T-034`

## Out of scope
- widening defensive-unwind thresholds before the patched cooldown behavior is measured
- opening a second active ticket
- new AI/shadow lane work
- UI, auth, or reporting redesign

## Acceptance criteria
- targeted validation passes on the patched T-032 surfaces
- the next fresh bundle shows lower repeated guard-pause / ladder-wait pressure, or explicit cooldown-driven rotation away from the same stuck symbols
- no fresh `Insufficient spendable <quote>` dominant loop returns
- no uncontrolled churn or hard-guard regression appears

## Rollback condition
- the new cooldown suppresses actionable sell work
- the next fresh bundle shows unchanged dominant loop pressure with no evidence of rotation benefit
- funding loops or churn reappear after deployment

## What capability this moves forward
Moves `Lane A — Runtime stability` and `C1 — Execution core maturity` forward by turning a fresh repeated no-action loop into a bounded rotation path that can now be measured cleanly.
