## Observed
- Fresh bundle `autobot-feedback-20260507-090740.tgz` runs deployed commit `0415b81` and ends in `ABS_DAILY_LOSS` `CAUTION` with `daily_net_usdt=-151.90`, `activeOrders=0`, and `total_alloc_pct=37.26`.
- Runtime is no longer blocked by exchange backoff. The dominant live blockers are `Max open positions reached`, `Daily loss caution: no eligible managed symbols`, and `Daily loss caution paused GRID BUY leg`.
- State audit shows material managed inventory remains in `SOLUSDC` and `ZECUSDC`, but both were under `NO_FEASIBLE_RECOVERY_MIN_ORDER` symbol cooldowns, causing caution managed-symbol selection/fallback to evaluate small `IOUSDC` instead of the large risk inventory.

## Impact
- `P1` stability: daily-loss caution can become passive while large managed positions remain exposed, so the bot fails the adaptive downside-control goal even though risk protection is active.

## Evidence bundle
- `autobot-feedback-20260507-090740.tgz`
- `risk_state=CAUTION`, `trigger=ABS_DAILY_LOSS`, `dailyRealized=-141.10USDC`, `maxLoss=279.80USDC`
- Top skips include `Skip: Daily loss caution: no eligible managed symbols` and `Skip IOUSDC: Daily loss caution paused GRID BUY leg`.
- State positions show `SOLUSDC≈1168 USDC` and `ZECUSDC≈1134 USDC` open cost while `SOLUSDC`/`ZECUSDC` have `NO_FEASIBLE_RECOVERY_MIN_ORDER` cooldown locks.

## Reproduction
- Seen in bundle `autobot-feedback-20260507-090740.tgz` after the bot de-risked, reopened some grid legs, then entered `ABS_DAILY_LOSS` `CAUTION` with material home-quote inventory and no active orders.

## Proposed fix
- During daily-loss `CAUTION`/`HALT`, allow countable managed positions to bypass non-hard symbol cooldown locks created by no-feasible/min-order/max-position/grid-sell retry handling, so managed exits/unwind/sell evaluation remains reachable while fresh-symbol blocks stay intact.

## Candidate ticket
- Existing `T-031` with linked `T-032` support.

## PM/BA decision
- `interrupt active ticket`
- Owner: Codex
- Due window: before next long run
