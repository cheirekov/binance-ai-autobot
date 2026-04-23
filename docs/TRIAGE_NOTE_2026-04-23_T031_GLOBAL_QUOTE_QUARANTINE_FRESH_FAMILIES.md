# Triage Note — 2026-04-23 — T-031 repeated no-feasible quote-pressure loop after April 20 quarantine deploy

## Observed
- Latest fresh bundle (`autobot-feedback-20260423-080554.tgz`) fails the repeated-loop gate for active ticket `T-031` against the prior fresh bundle (`autobot-feedback-20260422-100621.tgz`).
- Deployed commit is still `530fcfa`.
- Runtime is no longer in downside-control freeze:
  - `risk_state=NORMAL`
  - `unwind_only=false`
  - `activeOrders=0`
- But the dominant loop is back:
  - `Skip: No feasible candidates after policy/exposure filters` (`75 -> 65`)
  - no new fills or orders landed across the two fresh bundles
- Latest no-feasible details still show the same non-home quote pressure:
  - `BTC` / `ETH` spendable exhausted after reserve
  - recovery is enabled / attempted
  - recovery still points at `TRXBTC`
  - recovery still fails on `Below minQty 1.00000000`

## Impact
- `P2` active-lane blocker.
- The April 20 no-feasible quote quarantine is being seeded, but fresh non-home quote families can still re-enter selection without local quote-insufficient skip history, so the global lock is not fully effective.

## Evidence bundle
- `autobot-feedback-20260422-100621.tgz`
- `autobot-feedback-20260423-080554.tgz`

## Proposed fix
- Keep `T-031` active.
- Make active `GRID_BUY_QUOTE` quarantine suppress fresh non-home quote grid candidates that have no actionable sell leg, even when they do not yet have local quote-insufficient skip history.
- Preserve the April 20 `T-032` support fix, April 17 dust cooldown, April 15 fee-edge quarantine, and `T-034` routing stability.

## Candidate ticket
- Active ticket remains: `T-031`
- Linked support preserved: `T-032`

## PM/BA decision
- `interrupt active ticket`: no
- Same-ticket mitigation under `T-031`
- Owner: PM/BA + Codex
- Due window: before next long run
