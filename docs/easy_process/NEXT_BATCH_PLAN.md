# NEXT_BATCH_PLAN

Last updated: 2026-07-14 08:24 UTC
Owner: PM/BA + Codex

## Scope
Continue `T-040` after deploying the confirmed `entry_burst_guard_v1` testnet patch.

## In scope
- keep testnet/paper running without data reset.
- verify `Skip <symbol>: Adaptive neutral/range entry burst cap reached` appears when a third MARKET entry would otherwise occur.
- count consecutive MARKET entries per symbol and confirm a filled SELL resets the cap.
- monitor ZEC exposure, fees, fills, realized-after-fees, and SELL/reduce reachability.
- keep `risk_governor_hysteresis` as fallback validation.

## Out of scope
- any broader strategy or risk-governor change beyond the approved entry-burst guard.
- weakening risk guards or exposure caps.
- AI/news action-driving or real-money beta promotion.
- reopening T-031/T-032 from skip text alone.

## Acceptance
- rejects, restarts, and health errors remain `0`.
- filled orders improve from `169`; fees improve from `8.31 USDC`.
- realized-after-fees improves from `-72.46 USDT`.
- allocation does not exceed `5.09%` without an actionable exit.
- ZEC exposure does not grow beyond cap and SELL/reduce remains reachable.
- no symbol receives more than two consecutive neutral/range MARKET entries at risk `100` without an intervening filled SELL.

## Hotfix condition
Open P0/P1 work only for uncontrolled exposure, repeated exchange rejects, blocked SELL/unwind, broken accounting, crash/restart instability, or a hard guardrail regression.
