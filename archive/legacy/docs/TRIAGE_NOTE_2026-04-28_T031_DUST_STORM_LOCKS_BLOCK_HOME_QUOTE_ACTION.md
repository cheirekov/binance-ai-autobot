# Triage Note: T-031 dust storm locks block home-quote action

## Observed
- Latest fresh bundle `autobot-feedback-20260428-102858.tgz` is deployed on commit `dde35f4`, runtime is `NORMAL`, `unwind_only=false`, and `activeOrders=0`.
- Dominant loop remains `Skip: No feasible candidates after policy/exposure filters` with count `59` (`70 -> 59` vs previous bundle).
- The April 27 patch did park recovery min-order dust, but the retry window is too short and the loop returns after expiry.
- No-feasible details alternate between:
  - `attemptedSymbol=TRXBTC`, `attemptedReason=Below minQty 1.00000000`
  - `attemptedSymbol=null`, `attemptedReason=No eligible managed positions available for recovery sell`
- State shows multiple active home-quote `GRID_SELL_NOT_ACTIONABLE` storm locks while live base balances are dust-sized and not actionable.

## Impact
- `P1` stability / `P2` strategy quality.

## Evidence bundle
- `autobot-feedback-20260428-102858.tgz`
- Previous bundle: `autobot-feedback-20260427-113318.tgz`

## Reproduction
- Seen in bundle `autobot-feedback-20260428-102858.tgz`.
- Runtime has large spendable `USDC`, no active orders, and `NORMAL` risk state, but home-quote candidates can remain blocked by stale residual sell-storm locks while recovery can only find below-minimum dust.

## Proposed fix
- Keep `T-031` active and apply a bounded actionability correction:
  - in `NORMAL` mode with no active orders, allow dust-sized home-quote candidates through `GRID_SELL_NOT_ACTIONABLE` storm locks when their live base exposure is below actionable minimums.
  - extend `NO_FEASIBLE_RECOVERY_MIN_ORDER` parking from minutes to hours because dust balances do not become sellable on a 20-minute cadence.

## Candidate ticket
- Existing ticket: `T-031`
- Linked support ticket: `T-032` remains preserved only.

## PM/BA decision
- `interrupt active ticket`
- Owner: PM/BA + Codex
- Due window: current patch batch
