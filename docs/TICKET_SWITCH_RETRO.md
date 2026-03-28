# Ticket Switch Retrospective

Last updated: 2026-03-28 23:10 UTC
Previous ticket: `T-032`
Current ticket: `T-031`
Switch decision: `freeze previous / activate next lane`
Decision source: `manual PM/BA decision informed by program-level retro + runtime evidence`

## Why `T-032` was frozen

- Runtime evidence no longer shows `T-032` as the highest-leverage blocker.
- The latest fresh bundle ends `NORMAL` with positive daily net, and the dominant repeats have shifted to strategy-quality signals: `Fee/edge filter` and parked-ladder waiting.
- Continuing to prove `T-032` only through live-market waiting would be lower-leverage work than upgrading the regime/entry logic that now dominates runtime behavior.

## Evidence used for the switch

- `autobot-feedback-20260328-202730.tgz`
  - `risk_state=NORMAL`
  - `daily_net_usdt=+19.17`
  - `max_drawdown_pct=0.97`
  - dominant repeats: `Fee/edge filter` on `BTCUSDC` / `SOLUSDC`, parked-ladder waiting
- `docs/STRATEGY_COVERAGE.md`
  - `T-031` is the intended owner of risk-linked regime thresholds and strategy-quality adaptation
- runtime code audit
  - `buildRegimeSnapshot(...)` still used fixed thresholds
  - `Fee/edge filter` still used a regime-agnostic floor even when the regime engine classified strong trend conditions

## What `T-032` fixed and what it did not fix

### Improved enough to stop dominating the board
- downside-control / recovery work is present in runtime
- the earlier boxed-in quote/funding behavior is no longer the main blocker
- `T-034` funding stability remains preserved

### Not fixed by `T-032` and now higher priority
- strategy entry quality in strong trends
- fee-edge false idling when trend evidence is stronger than the static floor
- regime classification quality still relies on simpler fixed RSI/ADX thresholds than the planned `T-031` design

## Why `T-031` is the correct next lane

- The current runtime’s top blockers are strategy-quality signals, not exit-manager defects.
- `T-031` directly owns:
  - risk-linked regime thresholds,
  - stronger bull/bear/range classification,
  - better alignment between regime and entry quality gates.
- A bounded `T-031` slice can improve adaptation while leaving existing `T-032` downside controls in place.

## Hard process correction

- This switch includes:
  - board/session/changelog updates,
  - explicit strategy source-of-truth update,
  - a standalone ticket-switch retrospective artifact.
- Hard rule remains:
  - no ticket switch is complete until this file is updated and `pmba-gate.sh start` passes against it.

## Next expected outcome

- `T-031` batches should improve:
  - regime classification quality,
  - entry-quality adaptation in trend conditions,
  - fee-edge selectivity by regime,
  while preserving the already-implemented `T-032` downside controls and `T-034` funding stability.
