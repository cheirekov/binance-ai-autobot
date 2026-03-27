# LATEST_BATCH_DECISION

Last updated: 2026-03-27 18:03 EET  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Runtime stability`
- Why:
  - `observed`: the latest fresh bundle is now `autobot-feedback-20260327-155408.tgz`
  - `observed`: auto-retro raised `pivot_required` because the aggregate top skip repeated across the latest 2 fresh bundles
  - `observed`: the raw latest decisions are not a pure no-candidate stall; they repeatedly alternate `grid-ladder-buy` with `defensive-bear-cancel-buy` on `BTCUSDC` / `ETHUSDC`
  - `inferred`: the current blocker is still a bounded `T-032` defensive order-maintenance bug, so a same-ticket patch remains justified before any lane pivot
- Evidence tags:
  - `observed`: latest bundle runs `git.commit=aaf532b`
  - `observed`: latest bundle risk state is `CAUTION` with trigger `PROFIT_GIVEBACK` and `managedExposure=6.7%`
  - `observed`: latest bundle totals show `TRADE=84`, `ENGINE=75`, `SKIP=41`, `orders.canceled=129`, `activeOrders=3`
  - `observed`: latest state/adaptive-shadow evidence shows repeated `BUY LIMIT ... grid-ladder-buy` immediately followed by `defensive-bear-cancel-buy` while regime is `NEUTRAL` with confidence `0.4`
  - `observed`: the earlier `no-feasible-liquidity-recovery` path remains a previously validated `T-032` behavior and is not the dominant current blocker
  - `inferred`: the aggregate skip summary is lagging the actual low-level runtime behavior in this bundle

## Chosen active ticket
- Current: `T-032` (Exit manager v2)
- Decision: `patch_same_ticket`
- Why:
  - `observed`: board and changelog still keep `T-032` as the sole active lane
  - `observed`: the raw latest bundle behavior still lands inside `T-032` downside-control / defensive-entry behavior
  - `observed`: the auto `pivot_required` result came from a repeated coarse summary, not from unchanged low-level behavior
  - `inferred`: no ticket pivot is needed unless the next bundle disproves this cancel-churn hypothesis

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260327-155408.tgz`
- Compared bundle: `autobot-feedback-20260327-123604.tgz`

## Allowed work mode
- Current batch: `PATCH_ALLOWED`

## Batch decision
- Decision: `patch_same_ticket`
- Patch slice:
  - cancel defensive bot-owned BUY limits only when buys are actually paused
  - preserve resting BUY ladder orders in `DEFENSIVE` when regime is `NEUTRAL`/`RANGE` and no pause is active
  - keep the proven caution-release and no-feasible recovery paths unchanged
- Validation:
  - `./node_modules/.bin/vitest run --no-cache src/modules/bot/bot-engine.service.test.ts` ✅
  - `./scripts/validate-active-ticket.sh` ✅
