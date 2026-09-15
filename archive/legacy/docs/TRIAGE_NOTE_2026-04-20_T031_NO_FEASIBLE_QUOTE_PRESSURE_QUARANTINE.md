# Triage Note — 2026-04-20 — T-031 no-feasible quote-pressure loop after April 17 dust cooldown

## Observed
- Latest fresh bundle (`autobot-feedback-20260420-083837.tgz`) still fails the repeated-loop gate for `T-031`.
- Runtime is not frozen in the old April 17 state:
  - `git.commit=72d6068`
  - `risk_state=CAUTION` with `trigger=PROFIT_GIVEBACK`
  - active global lock is now `No-feasible dust recovery cooldown (20m)`
  - dominant skip is still `Skip: No feasible candidates after policy/exposure filters` (`42`)
- The latest no-feasible decision shows a narrower blocker:
  - rejection samples are all non-home quote pressure (`BTC`, `ETH`, `BNB`)
  - stages are `quote-spendable` only
  - no-feasible recovery is enabled and attempted, but the fallback recovery symbol (`TRXBTC`) fails on `Below minQty 1.00000000`

## Impact
- `P2` strategy-quality / routing.
- The April 17 dust cooldown works, but it does not yet seed the existing buy-quote quarantine path, so selection still revisits non-home quote families that are already reserve-starved.

## Evidence bundle
- `autobot-feedback-20260419-123151.tgz`
- `autobot-feedback-20260420-083837.tgz`

## Proposed fix
- Keep `T-031` active.
- When a repeated no-feasible cycle is driven entirely by non-home quote pressure and the recovery attempt also fails on exchange minimums, seed global `GRID_BUY_QUOTE` quarantine so candidate routing suppresses those quote-starved families until the loop clears.

## Candidate ticket
- Existing ticket: `T-031`
- Linked support preserved: `T-032`
