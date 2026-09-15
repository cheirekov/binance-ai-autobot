# Triage Note: T-031 No-Feasible Recovery Quote Churn

## Observed
- Latest bundle `autobot-feedback-20260511-080610.tgz` is `patch_required` with trailing daily net loss across fresh bundles.
- Runtime commit `663ca9b` is deployed, so the earlier daily-loss caution re-entry patch is active.
- Evidence shows repeated `no-feasible-liquidity-recovery` sells followed within minutes by new grid BUY orders that spend the recovered quote back down near the hard reserve.

## Impact
- `P1` stability: the bot can churn fees and inventory while trying to rebuild quote liquidity.

## Evidence bundle
- `autobot-feedback-20260511-080610.tgz`
- `data/state.json`: recovery sells at `2026-05-11T07:35:06Z`, `07:52:06Z`, and `08:02:36Z`; new BUY orders follow shortly after.
- `data/telemetry/last_run_summary.json`: `daily_net=-49.7226`, `max_drawdown_pct=4.9009`, `open_positions=12`, `total_alloc_pct=30.7996`.

## Reproduction
- Seen in bundle `autobot-feedback-20260511-080610.tgz` after risk returned to `NORMAL`.

## Proposed fix
- After a `no-feasible-liquidity-recovery` sell, temporarily size new BUY legs against the high quote reserve instead of the hard reserve so recovered quote is not immediately re-spent.

## Candidate ticket
- Existing ticket `T-031`, with linked support from `T-032`.

## PM/BA decision
- `interrupt active ticket`
- Owner: engineering
- Due window: next patch cycle
