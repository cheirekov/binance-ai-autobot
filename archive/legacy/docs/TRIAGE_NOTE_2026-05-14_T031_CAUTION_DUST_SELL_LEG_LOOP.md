# Triage Note — 2026-05-14 — T-031 caution dust sell-leg loop

## Observed
- Latest fresh bundle `autobot-feedback-20260514-103746.tgz` deployed `git.commit=ca13c42`, so the deterministic `riskBudget` patch is active.
- Runtime evidence shows `riskBudget` working for new exposure:
  - `Skip ETHUSDC: Risk budget paused GRID BUY leg`
  - `Skip BTCUSDC: Risk budget blocked new exposure`
- Gate still fails because the same dust sell-leg loop repeated:
  - `Skip SAGAUSDC: Grid sell leg not actionable yet` (`47 -> 48` across the latest two fresh bundles).
- SAGA details show a live dust balance below exchange sell minimum:
  - `desiredQty=0.05579`
  - `normalizedQty=0`
  - `reason=Below minQty 0.10000000`
  - `buyPausedByCaution=true`
  - `buyPausedByRiskBudget=true`

## Impact
- `P1` stability.
- The bot is not adding new exposure, but it keeps selecting an untradeable dust residual while both legs are blocked, causing evidence-loop churn and wasting cycles.

## Evidence bundle
- `autobot-feedback-20260514-103746.tgz`
- `docs/RETROSPECTIVE_AUTO.md` reports `patch_required`.
- Top latest skips:
  - `Skip SAGAUSDC: Grid sell leg not actionable yet (48)`
  - `Skip SAGAUSDC: Daily loss caution paused GRID BUY leg (48)`

## Reproduction
- Seen in bundle `autobot-feedback-20260514-103746.tgz`.
- Runtime state is `CAUTION`, trigger `PROFIT_GIVEBACK`, active orders `0`, SAGA free quantity below `minQty`, and BUY leg paused by caution/risk budget.

## Proposed fix
- Keep `T-031` active and make `GRID_SELL_NOT_ACTIONABLE` cooldowns block dust home-quote candidates during non-`NORMAL` risk states when the BUY leg is also paused, instead of letting daily-loss managed-risk bypass reselect the same untradeable symbol.

## Candidate ticket
- Existing ticket: `T-031`

## PM/BA decision
- `interrupt active ticket`
- Owner: PM/BA + Codex
- Due window: before next long run
