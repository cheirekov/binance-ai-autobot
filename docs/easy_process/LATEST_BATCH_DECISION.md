# LATEST_BATCH_DECISION

Last updated: 2026-03-28 23:45 EET  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane C — Strategy quality`
- Why:
  - `observed`: the latest fresh bundle is now `autobot-feedback-20260328-202730.tgz`
  - `observed`: auto-retro says `continue`, but the dominant blockers have moved to strategy-quality surfaces
  - `observed`: the bundle ends `risk_state=NORMAL`, `daily_net_usdt=+19.17`, `max_drawdown_pct=0.97`, `sizingRejectPressure=low`
  - `observed`: the dominant repeats are now `Fee/edge filter` on `BTCUSDC` / `SOLUSDC` plus ladder-wait noise
  - `inferred`: continuing to prove `T-032` as the active lane is lower leverage than activating the planned `T-031` strategy slice

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Decision: `pivot_active_ticket`
- Why:
  - `observed`: the active `T-032` evidence no longer points to downside-control as the dominant blocker
  - `observed`: the current code still uses simpler regime thresholds and a regime-agnostic fee floor
  - `inferred`: the more valuable next batch is `T-031`, while keeping `T-032` runtime behavior intact as a support lane

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260328-202730.tgz`
- Compared bundle: `autobot-feedback-20260328-084345.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `pivot_active_ticket`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - extend `T-031` with lane-aware candidate scoring
  - preserve current `T-032` downside controls and `T-034` routing stability
- Validation:
  - fresh bundle review (`autobot-feedback-20260328-202730.tgz`) ✅
  - strategy source-of-truth + board/session/ticket-switch docs aligned on `T-031` ✅
  - same-ticket `T-031` slice landed in code/tests ✅
