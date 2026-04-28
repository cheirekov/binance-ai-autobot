# LATEST_BATCH_DECISION

Last updated: 2026-04-28 13:50 EEST
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
- `observed`: the latest fresh bundle is `autobot-feedback-20260428-102858.tgz`
- `observed`: auto-retro says `patch_required`
- `observed`: deployed commit is `dde35f4`
- `observed`: runtime is `NORMAL`, `unwind_only=false`, `activeOrders=0`
- `observed`: dominant `Skip: No feasible candidates after policy/exposure filters` remains high (`59`)
- `observed`: no-feasible recovery alternates between `TRXBTC` below minQty and no eligible managed recovery positions
- `observed`: home-quote `GRID_SELL_NOT_ACTIONABLE` storm locks remain active while live base balances are dust-sized
- `inferred`: the live blocker is a `T-031` dust actionability / stale-lock gap, not a `T-032` downside-control freeze

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (preserved only; not the current blocker)
- Decision: `patch_required`
- Why:
  - `observed`: the April 20 `T-032` support fix remains preserved; runtime is not in `HALT`
  - `observed`: the live runtime blocker is repeated no-feasible quote pressure under `T-031`
  - `observed`: no new fills or orders landed across the long run
  - `inferred`: the next bounded batch should stay in `T-031` and unblock normal-mode home-quote candidates from stale dust sell-storm locks

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260428-102858.tgz`
- Compared bundle: `autobot-feedback-20260427-113318.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - keep `T-032` preserved only
  - preserve the April 20 linked-support fix, April 20 quote-pressure quarantine behavior, April 17 dust cooldown behavior, and April 15 fee-edge quarantine behavior
  - let normal-mode dust home-quote candidates progress past stale sell-storm locks and extend recovery min-order dust parking
- Validation:
  - fresh bundle review (`autobot-feedback-20260427-113318.tgz`) ✅
  - fresh bundle review (`autobot-feedback-20260428-102858.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - PM/BA gate start + Docker CI pass ✅
