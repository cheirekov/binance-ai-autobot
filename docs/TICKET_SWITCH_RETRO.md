# Ticket Switch Retrospective

Last updated: 2026-03-22 08:10 UTC
Previous ticket: `T-034`
Current ticket: `T-031`
Switch decision: `close previous / activate next lane`
Decision source: `manual PM/BA decision informed by runtime evidence + auto-retro`

## Why `T-034` was closed

- Runtime evidence across the latest confirming bundles showed that quote-funding/routing was no longer the dominant blocker.
- The previously dominant failure family:
  - `Insufficient spendable <quote> for grid BUY`
  - repeated quote-family starvation across `USDC` / `ETH` quote symbols
  was materially reduced and no longer led the run.
- Later bundles showed:
  - `sizingRejectPressure=low`,
  - `unmanaged_exposure_pct` materially reduced,
  - top blockers shifted to `Fee/edge filter` and `Grid waiting for ladder slot or inventory`.

## Evidence used for the switch

- `autobot-feedback-20260321-060548.tgz`
  - dailyNet `+54.90`
  - dominant blocker moved to `Fee/edge filter`
- `autobot-feedback-20260321-165459.tgz`
  - dailyNet `+18.54`
  - `risk_state=NORMAL`
  - no dominant quote-starvation loop
- `autobot-feedback-20260322-063344.tgz`
  - dailyNet `-138.87`
  - dominant blockers were `Fee/edge filter` and `Grid waiting for ladder slot or inventory`, not quote funding
- `docs/RETROSPECTIVE_AUTO.md`
  - latest automatic decision at the time was `continue`, not `patch_required` or `pivot_required`, for the quote-funding lane

## What `T-034` fixed and what it did not fix

### Fixed enough to close
- reserve-floor math for non-home quotes (`ETH`, `BTC`, `BNB`, etc.)
- spendable-quote gating before later execution-time failures
- quote-family starvation suppression strong enough that it stopped dominating the run

### Not fixed by `T-034` because it is a different lane
- repeated `Fee/edge filter (...)` churn on weak candidates
- repeated ladder-wait churn on non-actionable parked ladders
- proactive adaptation / de-risking during market regime deterioration

## Why `T-031` is the correct next lane

- Once funding/routing stopped being the dominant blocker, the next highest runtime waste became candidate quality:
  - symbols reaching execution only to fail `Fee/edge filter`
  - symbols with parked ladders being reconsidered despite no actionable missing leg
- Those are regime/edge-selection problems, not routing/funding problems.
- Continuing to patch `T-034` after that point would be micro-optimization in the wrong subsystem.

## Hard process correction

- The previous switch was only partially documented:
  - board/session/changelog were updated,
  - but there was no standalone ticket-switch retrospective artifact.
- New rule:
  - no ticket switch is considered complete until this file is updated and `pmba-gate.sh start` passes against it.

## Next expected outcome

- `T-031` batches should reduce:
  - repeated same-symbol `Fee/edge filter (...)` churn,
  - repeated `Grid waiting for ladder slot or inventory` churn,
  while preserving `T-034` funding stability.
