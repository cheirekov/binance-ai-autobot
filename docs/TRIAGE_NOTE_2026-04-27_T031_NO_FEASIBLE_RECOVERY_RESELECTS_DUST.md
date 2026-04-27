# Triage Note: T-031 no-feasible recovery reselects dust

## Observed
- Latest fresh bundle `autobot-feedback-20260427-113318.tgz` is deployed on commit `61e0e46`, runtime is `NORMAL`, `unwind_only=false`, and `activeOrders=0`.
- Dominant loop remains `Skip: No feasible candidates after policy/exposure filters` with count `70`.
- No-feasible recovery is enabled and attempted, but the latest attempted recovery symbol is `TRXBTC` and it fails exchange minimum validation: `Below minQty 1.00000000`.
- Fresh rejection samples are still quote-pressure driven (`BTC` / `ETH` spendable exhausted after reserve).
- No new fills or orders landed during the long run, so the bot is adapting only by holding, not by executing reachable recovery actions.

## Impact
- `P1` stability / `P2` strategy quality.

## Evidence bundle
- `autobot-feedback-20260427-113318.tgz`
- Previous comparable bundle: `autobot-feedback-20260424-082814.tgz`

## Reproduction
- Seen in bundle `autobot-feedback-20260427-113318.tgz`.
- Runtime repeatedly reaches no-feasible recovery, filters managed positions through existing symbol locks, then retries a dust-size `TRXBTC` recovery sell that is below exchange minimums.

## Proposed fix
- Keep `T-031` active and add bounded recovery selection logic:
  - let no-feasible recovery SELL validation bypass buy/quote/grid-wait symbol cooldowns that are not hard risk locks,
  - prioritize home-stable managed positions before non-home quote-pressure positions,
  - park recovery candidates that fail min-order validation under a symbol-level `NO_FEASIBLE_RECOVERY_MIN_ORDER` cooldown so the engine does not keep reselecting the same dust residual.

## Candidate ticket
- Existing ticket: `T-031`
- Linked support ticket: `T-032` remains preserved only.

## PM/BA decision
- `interrupt active ticket`
- Owner: PM/BA + Codex
- Due window: current patch batch
