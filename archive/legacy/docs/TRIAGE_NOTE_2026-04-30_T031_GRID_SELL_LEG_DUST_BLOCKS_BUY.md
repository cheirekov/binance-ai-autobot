# Triage Note — 2026-04-30 — T-031 Grid Sell-Leg Dust Blocks Buy Progression

## Observed
- Latest bundle `autobot-feedback-20260430-081918.tgz` fails PM/BA end gate because the dominant loop repeated: `Skip BTCUSDC: Grid sell leg not actionable yet` (`63 -> 86`).
- Runtime is `NORMAL`, `risk=100`, `unwind_only=false`, `activeOrders=0`, but no new orders or fills landed.
- Decision details show dust-size or zero live base inventory (`BTCUSDC` base free `0.00000334` below `minQty 0.00001000`; `PENGUUSDC` base free `0`) while the grid executor returns on the missing SELL leg before it can place a valid BUY leg.

## Impact
- `P1` stability / strategy actionability: the bot remains alive but can spend long windows producing non-actionable SELL skips instead of adapting into a reachable BUY candidate.

## Evidence bundle
- `autobot-feedback-20260430-081918.tgz`
- Previous comparison bundle: `autobot-feedback-20260429-120806.tgz`
- Gate failure: `Skip BTCUSDC: Grid sell leg not actionable yet` (`63 -> 86`)

## Reproduction
- Seen in bundle `autobot-feedback-20260430-081918.tgz` with `SPOT_GRID`, `risk=100`, `risk_state=NORMAL`, zero active orders, and dust/zero base balances.

## Proposed fix
- Treat home-quote dust as non-actionable inventory during candidate viability checks, rotate away from buy-paused symbols with no live sell inventory, and do not let a dust/zero SELL leg block an otherwise actionable grid BUY leg.

## Candidate ticket
- Existing active ticket: `T-031`

## PM/BA decision
- `interrupt active ticket`
- Owner: Codex
- Due window: same batch before next long run
