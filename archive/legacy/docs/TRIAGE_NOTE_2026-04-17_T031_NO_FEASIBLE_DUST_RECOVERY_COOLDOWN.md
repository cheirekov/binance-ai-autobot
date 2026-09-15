# Triage Note — 2026-04-17 — T-031 near-flat no-feasible dust recovery loop

## Observed
- Latest fresh bundle (`autobot-feedback-20260417-164018.tgz`) reports `patch_required`.
- Runtime is `risk_state=CAUTION` with `trigger=PROFIT_GIVEBACK`, `activeOrders=0`, and only `4` open positions.
- Dominant skip remains `Skip: No feasible candidates after policy/exposure filters` (`61`), followed by repeated home-quote `Grid sell leg not actionable yet` residuals.
- The latest no-feasible recovery attempt already fires, but it tries `BIOUSDC` and fails on exchange minimums (`Below minNotional 5.00000000 ...`), so the engine repeats a dust-only recovery loop instead of parking it.

## Impact
- `P2` quality.
- Runtime is alive, but decision cycles are wasted on a near-flat recovery path that cannot execute because the remaining book is below exchange minimums.

## Evidence bundle
- `autobot-feedback-20260417-074005.tgz`
- `autobot-feedback-20260417-164018.tgz`

## Reproduction
- Seen in bundle `autobot-feedback-20260417-164018.tgz`.
- Non-home quotes are exhausted after reserve, active orders are already gone, and the recovery fallback repeatedly points at a residual home-quote position that still fails `minNotional` / `minQty`.

## Proposed fix
- Keep `T-031` active and add a bounded global cooldown when the bot is already near-flat in `PROFIT_GIVEBACK` `CAUTION`, has no active orders, and the no-feasible recovery attempt fails only because of exchange minimums.

## Candidate ticket
- Existing ticket: `T-031`
- Linked support preserved: `T-032`

## PM/BA decision
- `interrupt active ticket`: no
- Same-ticket mitigation under `T-031`
- Owner: PM/BA + Codex
- Due window: before next long run
