# Triage Note — 2026-04-19 — T-031 post-patch normal runtime, no T-032 slice

## Observed
- Latest fresh bundle (`autobot-feedback-20260419-123151.tgz`) reports `pivot_required` from the gate because the top skip reason is still `Skip: No feasible candidates after policy/exposure filters`.
- The runtime is materially different from the April 17 failure:
  - `git.commit=72d6068`
  - `risk_state=NORMAL`
  - `activeOrders=1`
  - latest decision is a real trade: `SELL MARKET TRXBTC ... no-feasible-liquidity-recovery`
  - dominant `No feasible candidates after policy/exposure filters` fell from `61` to `14`
- The latest no-feasible details are no longer the near-flat `PROFIT_GIVEBACK` dust loop:
  - recovery is now actively trading
  - primary blockers are `BTC` quote exposure cap and `ETH` spendable exhaustion after reserve
  - book concentration is now mainly `BTCUSDC` (`~38.15%` of wallet)

## Impact
- `P2` strategy-quality / routing.
- The April 17 patch worked: runtime escaped the old near-flat `CAUTION` freeze and resumed trading.
- The remaining blocker is candidate feasibility under quote-asset constraints, not downside-control thaw or caution deadlock.

## Evidence bundle
- `autobot-feedback-20260417-164018.tgz`
- `autobot-feedback-20260419-123151.tgz`

## PM/BA decision
- No `T-032` slice now.
- Keep `T-031` active.
- Reason:
  - latest bundle ends `NORMAL`, not `CAUTION` / `HALT`
  - downside-control support is preserved and not the immediate blocker
  - current work belongs to strategy-quality / candidate-routing under quote-asset constraints

## Next bounded slice if the pattern persists
- Stay on `T-031`.
- Target the smaller post-patch loop only if the next fresh bundle still shows:
  - repeated `No feasible candidates after policy/exposure filters`
  - driven mainly by `BTC` quote exposure cap / `ETH` reserve starvation
  - while runtime remains otherwise live (`activeOrders > 0` or real recovery trades continue)
