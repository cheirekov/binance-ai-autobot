# LATEST_BATCH_DECISION

Last updated: 2026-04-20 11:00 EEST
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
- `observed`: the latest fresh bundle is `autobot-feedback-20260420-083837.tgz`
- `observed`: auto-retro says `pivot_required`
- `observed`: runtime is `CAUTION(trigger=PROFIT_GIVEBACK)` with active global dust cooldown
- `observed`: dominant `Skip: No feasible candidates after policy/exposure filters` rose from `14` to `42`
- `observed`: latest no-feasible rejection samples are entirely non-home quote pressure (`BTC`, `ETH`, `BNB`) and recovery fails on `Below minQty 1.00000000`
- `inferred`: the blocker is still `T-031` routing under quote pressure; `T-032` remains support only

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (support slices allowed only when fresh evidence couples downside-control with strategy-quality validation)
- Decision: `patch_required`
- Why:
  - `observed`: the linked-support thaw and downside-control support path remain preserved
  - `observed`: the live blocker is `T-031` candidate-quality / recovery behavior, not quote-funding or downside-control
  - `observed`: the April 17 patch remains active, but it is not enough on its own
  - `inferred`: the next bounded batch should seed `GRID_BUY_QUOTE` quarantine from the no-feasible quote-pressure loop

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260420-083837.tgz`
- Compared bundle: `autobot-feedback-20260419-123151.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - keep `T-031` active
  - preserve the April 17 dust cooldown behavior, April 15 fee-edge quarantine behavior, and April 12 linked-support thaw
  - seed `GRID_BUY_QUOTE` quarantine from no-feasible quote-pressure evidence
- Validation:
  - fresh bundle review (`autobot-feedback-20260420-083837.tgz`) ✅
  - same-ticket mitigation landed in code/tests ⏳
  - PM/BA gate start + Docker CI pass ⏳
