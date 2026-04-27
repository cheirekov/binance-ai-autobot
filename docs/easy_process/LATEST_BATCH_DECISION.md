# LATEST_BATCH_DECISION

Last updated: 2026-04-27 15:15 EEST
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
- `observed`: the latest fresh bundle is `autobot-feedback-20260427-113318.tgz`
- `observed`: auto-retro says `continue`, but the runtime evidence still shows a long no-action loop
- `observed`: deployed commit is `61e0e46`
- `observed`: runtime is `NORMAL`, `unwind_only=false`, `activeOrders=0`
- `observed`: dominant `Skip: No feasible candidates after policy/exposure filters` remains high (`70`)
- `observed`: latest no-feasible rejection samples are still non-home quote pressure (`BTC`, `ETH`) and recovery still fails on `TRXBTC` `Below minQty 1.00000000`
- `observed`: no new fills or orders landed across the long run
- `inferred`: the live blocker is now a `T-031` recovery-selection gap, not a `T-032` downside-control freeze

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (preserved only; not the current blocker)
- Decision: `patch_required`
- Why:
  - `observed`: the April 20 `T-032` support fix remains preserved; runtime is not in `HALT`
  - `observed`: the live runtime blocker is repeated no-feasible quote pressure under `T-031`
  - `observed`: no new fills or orders landed across the long run
  - `inferred`: the next bounded batch should stay in `T-031` and fix no-feasible recovery candidate ranking / dust retry parking

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260427-113318.tgz`
- Compared bundle: `autobot-feedback-20260424-082814.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - keep `T-032` preserved only
  - preserve the April 20 linked-support fix, April 20 quote-pressure quarantine behavior, April 17 dust cooldown behavior, and April 15 fee-edge quarantine behavior
  - make no-feasible recovery prefer reachable home-quote managed sells and park below-minimum dust retries
- Validation:
  - fresh bundle review (`autobot-feedback-20260424-082814.tgz`) ✅
  - fresh bundle review (`autobot-feedback-20260427-113318.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - PM/BA gate start + Docker CI pass ✅
