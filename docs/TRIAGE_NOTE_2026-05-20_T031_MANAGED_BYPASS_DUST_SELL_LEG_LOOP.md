# Triage Note — 2026-05-20 — T-031 managed-bypass dust sell-leg loop

## Observed
- Latest fresh bundle `autobot-feedback-20260520-150037.tgz` deployed `git.commit=7b52732`.
- PM/BA gate passes, but runtime evidence shows the same dust sell-leg class moved from SAGA to EDEN:
  - `Skip EDENUSDC: Grid sell leg not actionable yet (34)`
  - `Skip EDENUSDC: Risk budget paused GRID BUY leg (24)`
- EDEN details show a below-minimum sell leg while BUY is paused:
  - `reason=Below minQty 0.10000000`
  - `buyPaused=true`
  - `buyPausedByCaution=true`
  - paired BUY-leg skips include `buyPausedByRiskBudget=true`.
- Runtime remains defensive:
  - `risk_state=CAUTION`
  - `trigger=PROFIT_GIVEBACK`
  - `daily_net_usdt=-11.24`
  - `total_alloc_pct=1.23`
  - `activeOrders=0`

## Impact
- `P1` stability.
- The bot is correctly blocking fresh exposure, but managed-risk bypass still lets countable dust residuals re-enter selection before the `GRID_SELL_NOT_ACTIONABLE` cooldown is honored.

## Evidence bundle
- `autobot-feedback-20260520-150037.tgz`
- `docs/RETROSPECTIVE_AUTO.md` is manually elevated to `patch_required` because top skip reason remains a non-actionable dust sell leg despite the automated gate passing.

## Reproduction
- Runtime state is `CAUTION`, home quote is `USDC`, active orders are `0`, EDEN free quantity is not sell-actionable under exchange filters, and BUY is paused by caution/risk budget.
- Because EDEN exposure is countable, the managed-risk bypass short-circuits the symbol lock before the non-`NORMAL` paused-buy cooldown branch can block selection.

## Proposed fix
- Keep `T-031` active.
- Evaluate `GRID_SELL_NOT_ACTIONABLE` cooldown details before applying managed-risk bypass.
- Continue allowing managed-risk bypass for other bypassable locks, but never bypass a non-`NORMAL` paused-buy dust sell-leg cooldown.

## Candidate ticket
- Existing ticket: `T-031`

## PM/BA decision
- `same-ticket mitigation`
- Owner: PM/BA + Codex
- Due window: before next long run
