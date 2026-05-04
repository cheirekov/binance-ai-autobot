# LATEST_BATCH_DECISION

Last updated: 2026-05-04 11:50 EEST
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing with bounded downside-control support`
- Why:
  - `observed`: latest fresh bundle is `autobot-feedback-20260504-084256.tgz`.
  - `observed`: auto-retro says `patch_required`.
  - `observed`: deployed commit is `474b1ee`.
  - `observed`: runtime reached real trading after the April 30 patch (`submitted=200`, `filled=136`).
  - `observed`: runtime ended in `PROFIT_GIVEBACK` daily-loss protection with wallet/equity estimate `6247.63 USDC`, `feesHome=42.19`, and `activeOrders=0`.
  - `inferred`: the live blocker is now post-actionability churn / fee-aware guardrail quality, not the old dust sell-leg no-action loop.

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (bounded guardrail support)
- Decision: `patch_ready`
- Why:
  - `observed`: the bot is no longer idle, but the trading restored by the last patch produced fee-heavy giveback.
  - `observed`: current guard math reports gross closed PnL while runtime PnL/fees show material fee burn.
  - `inferred`: daily-loss/giveback protection must be fee-aware and must not reopen fresh symbols when the loss budget is near exhausted.

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260504-084256.tgz`
- Compared bundle: `autobot-feedback-20260430-081918.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_ready`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active.
  - allow bounded `T-032` support for fee-aware daily-loss/giveback behavior.
  - preserve April 30 dust/zero SELL-leg BUY progression, April 28 stale-dust storm bypass, April 27 recovery dust parking, April 20 exposure clipping, and `T-034` funding stability.
  - make daily-loss/profit-giveback accounting fee-aware and pause fresh symbols at severe near-halt loss-budget usage.
- Validation:
  - fresh bundle review (`autobot-feedback-20260504-084256.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - focused Vitest ✅
  - API TypeScript build check ✅
  - active-ticket full CI validation ✅
  - diff whitespace check ✅
  - PM/BA gate start/end ✅
