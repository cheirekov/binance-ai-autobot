# P0_RECOVERY_PLAN

Last updated: 2026-03-26 11:44 EET  
Owner: PM/BA + Codex

## Immediate action executed
- `OPERATIONS_ADJUSTMENT`
- purpose:
  - restore operator trust in 24h PnL and decision freshness surfaces
  - stop making `T-032` strategy calls from misleading telemetry

## Recovery sequence
1. Deploy this batch as an ops-credibility fix.
2. Recreate the runtime cleanly instead of trusting stale recovered process memory.
3. Collect one short confirmation bundle.
4. Run the deterministic `T-032` proof batch on guard-pause `COOLDOWN` vs unwind interaction.
5. Choose exactly one next behavior action:
   - `ROLLBACK_NOW` if March 25 guard-pause `COOLDOWN` blocks the intended path
   - `PATCH_NOW` if a smaller non-blocking guard-pause patch is proven safer
   - `PIVOT_TICKET` if the remaining behavior is strategy-consistent and `T-032` is no longer the right lane

## Success criteria for the next bundle
- state timestamps advance after clean recreate
- dashboard freshness pills no longer hide stale state
- rolling 24h `daily_net_usdt` no longer stays flat only because lifetime `net` was reused
- runtime evidence is fresh enough to separate dead/stale process from boxed-in but live strategy behavior

## Do not do
- do not run another long live evaluation from the old stale process surface
- do not apply another blind `T-032` strategy patch before the guard-pause interaction is proven
- do not trust pre-adjustment `daily_net_usdt` values as a real 24h field
