# Ticket Switch Retrospective

Last updated: 2026-04-01 15:17 UTC
Previous ticket: `T-032`
Current ticket: `T-031`
Switch decision: `freeze previous as support / reactivate strategy-quality lane`
Decision source: `automatic retro + PM/BA review of fresh runtime evidence`

## Why `T-032` is no longer the active lane

- The March 30-31 `T-032` slices are now holding in fresh runtime evidence:
  - `risk_state=NORMAL`
  - positive daily net on the latest two fresh bundles
  - no dominant global `CAUTION` freeze / cooled-residual anchor loop
- The newest fresh bundle (`autobot-feedback-20260401-150741.tgz`) is dominated by strategy-quality dead ends instead:
  - `Skip BNBETH: Grid guard paused BUY leg`
  - `Skip BNBETH: Grid waiting for ladder slot or inventory`
  - `Skip SOLETH: Grid waiting for ladder slot or inventory`
  - `Skip SOLBTC: Fee/edge filter (...)`
- The engine is no longer primarily boxed in by downside-control policy. It is rotating too often through parked cross-quote ladders and weak fee-edge candidates.

## Evidence used for the switch

- `autobot-feedback-20260331-170410.tgz`
  - `risk_state=NORMAL`
  - `daily_net_usdt=+74.14`
  - dominant skips: sizing/cap filters, `SOLBTC` ladder waiting / fee-edge
- `autobot-feedback-20260401-083229.tgz`
  - `risk_state=NORMAL`
  - `daily_net_usdt=+235.33`
  - no dominant caution freeze, `T-032` support slices stable
- `autobot-feedback-20260401-150741.tgz`
  - `risk_state=NORMAL`
  - `daily_net_usdt=+129.39`
  - `total_alloc_pct=43.93`
  - dominant repeats: `BNBETH`, `SOLETH`, `SOLBTC`, `TRXETH`, `XRPETH`
- raw state audit
  - latest decision summary: `Binance testnet BUY MARKET XRPUSDC qty 934.1 → FILLED (orderId 362581741 · entry)`
  - active orders include parked sell-only / dual ladders on cross-quote pairs
  - downside-control is reachable and has already proven `daily-loss-caution-unwind` in the same runtime lineage

## What `T-032` fixed and what it did not fix

### Improved enough to preserve
- `ABS_DAILY_LOSS` flat-book thaw is live
- best-effort `daily-loss-caution-unwind` is live
- stop-loss-cooled residual positions no longer anchor global `CAUTION`

### Still not fixed and now higher priority
- guarded cross-quote sell ladders keep getting reconsidered after the sell leg is already parked
- cross-quote fee-edge dead ends still consume candidate budget
- the current live blocker is strategy-quality / lane-rotation behavior, not downside-control reachability

## Why `T-031` is the correct next lane

- The current live blocker is a strategy-quality defect:
  - the engine keeps revisiting guarded / parked cross-quote symbols instead of rotating cleanly to better opportunities.
- `T-031` owns:
  - regime-aware candidate quality,
  - execution-lane prioritization,
  - bounded suppression of dead-end lanes without weakening risk guards.
- A bounded `T-031` slice can fix this without reopening `T-032` downside-control work or `T-034` quote-routing work.

## Hard process correction

- This switch includes:
  - board/session/changelog updates,
  - explicit triage note,
  - first real runtime code slice in the same batch.
- Hard rule remains:
  - no ticket switch is complete until this file is updated and `pmba-gate.sh start` passes against it.

## Next expected outcome

- `T-031` batches should:
  - reduce repeated `Grid guard paused BUY leg` / `Grid waiting for ladder slot or inventory` on guarded cross-quote sell ladders,
  - reduce repeated fee-edge retries on weak cross-quote candidates,
  - preserve March 30-31 `T-032` downside-control behavior and `T-034` funding stability.
