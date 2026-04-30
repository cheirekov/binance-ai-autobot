# LATEST_BATCH_DECISION

Last updated: 2026-04-30 11:45 EEST
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
  - `observed`: latest fresh bundle is `autobot-feedback-20260430-081918.tgz`.
  - `observed`: auto-retro says `patch_required`.
  - `observed`: deployed commit is `1efbdae`.
  - `observed`: runtime is `NORMAL`, `unwind_only=false`, `activeOrders=0`.
  - `observed`: old generic no-feasible blocker is gone from the dominant reason.
  - `observed`: dominant blocker is now `Skip BTCUSDC: Grid sell leg not actionable yet` (`86`), with repeated buy-pause and dust/zero sell-leg evidence.
  - `inferred`: the live blocker is a `T-031` actionability ordering bug, not a `T-032` downside-control freeze.

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (preserved only; not the current blocker)
- Decision: `patch_ready`
- Why:
  - `observed`: no active orders and unchanged trade totals prove the bot is still not adapting into orders.
  - `observed`: `BTCUSDC` live sell qty is below exchange `minQty`; `PENGUUSDC` has zero base but still hit sell-leg-not-actionable skips.
  - `inferred`: dust/zero SELL legs must not preempt reachable grid BUY evaluation.

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260430-081918.tgz`
- Compared bundle: `autobot-feedback-20260429-120806.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_ready`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active.
  - keep `T-032` preserved only.
  - preserve April 28 stale-dust storm bypass, April 27 recovery dust parking, April 20 `T-032` support fix, and `T-034` funding stability.
  - treat home-quote dust as non-actionable inventory and let reachable grid BUY legs proceed.
- Validation:
  - fresh bundle review (`autobot-feedback-20260430-081918.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - Docker CI ✅
  - active-ticket validation ✅
  - PM/BA gate start ✅
  - PM/BA gate end remains blocked by the already-ingested pre-patch bundle pair (`63 -> 86`) until the next fresh bundle
