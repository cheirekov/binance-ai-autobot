# Ticket Switch Retrospective

Last updated: 2026-03-30 09:45 UTC
Previous ticket: `T-031`
Current ticket: `T-032`
Switch decision: `freeze previous / reactivate downside-control lane`
Decision source: `automatic retro + PM/BA review of fresh runtime evidence`

## Why `T-031` was frozen

- The March 28-29 `T-031` slices improved candidate quality, but the latest fresh evidence no longer shows strategy-quality dead ends as the dominant blocker.
- The newest fresh bundles are dominated by `CAUTION` flat-book freezes:
  - `Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered)`
  - `Skip BTCUSDC: Daily loss caution paused GRID BUY leg`
- The engine is no longer primarily choosing the wrong symbols. It is globally boxed in by downside-control policy while almost flat.

## Evidence used for the switch

- `autobot-feedback-20260330-082950.tgz`
  - `risk_state=CAUTION`
  - `daily_net_usdt=-170.99`
  - `max_drawdown_pct=5.26`
  - `total_alloc_pct=0.11`
  - `open_positions=3`
  - dominant repeats: `daily loss caution paused new symbols` (`89`), `BTCUSDC: Daily loss caution paused GRID BUY leg` (`75`)
- `autobot-feedback-20260329-150750.tgz`
  - same dominant `CAUTION` / new-symbol-pause pattern (`77`)
- raw state audit
  - `activeOrders=0`
  - latest decision summary: `Skip: No feasible candidates: daily loss caution paused new symbols (no managed inventory)`
  - runtime is effectively flat while `CAUTION` still blocks new symbols

## What `T-031` fixed and what it did not fix

### Improved enough to preserve
- risk-linked regime thresholds are live
- lane-aware candidate scoring is live
- parked-ladder and no-inventory fee-edge suppression are live
- managed-symbol fee-edge bypass during defensive handling is live

### Still not fixed and now higher priority
- `ABS_DAILY_LOSS` CAUTION keeps pausing new symbols even after the book is effectively flat
- downside-control cannot prove adaptive recovery if the engine stays boxed in after exposure is already gone
- fresh runtime evidence is dominated by guard-policy freeze, not strategy-quality opportunity selection

## Why `T-032` is the correct next lane

- The current live blocker is a downside-control policy defect:
  - CAUTION does not thaw when managed exposure/order state is already near zero.
- `T-032` owns:
  - exit-manager / downside-control release behavior,
  - de-risking and recovery logic after adverse moves,
  - the policy boundary between preserving gains and letting the engine re-enter safely.
- A bounded `T-032` slice can fix this without reopening `T-034` funding work or discarding the March 28-29 `T-031` strategy improvements.

## Hard process correction

- This switch includes:
  - board/session/changelog updates,
  - explicit triage note,
  - first real runtime code slice in the same batch.
- Hard rule remains:
  - no ticket switch is complete until this file is updated and `pmba-gate.sh start` passes against it.

## Next expected outcome

- `T-032` batches should:
  - release `CAUTION` new-symbol pause once the book is effectively flat,
  - preserve tighter `PROFIT_GIVEBACK` caution behavior while exposure is still material,
  - keep the March 28-29 `T-031` strategy-quality gains and `T-034` routing stability intact.
