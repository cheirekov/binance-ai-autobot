# STATE_DIGEST

Last updated: 2026-03-25  
Owner: State Steward

Purpose:
keep compact operational memory so new LLM sessions do not have to reason from the full raw `state.json`.

## Current observations
- raw `state.json` in the reviewed feedback bundle is much larger and noisier than the compact summaries
- a retained decision window can make old patterns look fresh
- dynamic reason strings contain embedded values and symbol-specific noise, which is weak input for LLM clustering

## State hygiene rules
1. Read compact summaries first.
2. Read raw `state.json` only when:
   - the digest is missing,
   - the digest is contradictory,
   - a forensic drill-down is required.
3. Prefer stable fields and reason families over full human-readable reason strings.
4. Distinguish:
   - execution inactivity,
   - healthy idle,
   - policy deadlock,
   - funding deadlock,
   - validation blockage.

## Suggested digest fields
- bundle id
- run end time
- git sha
- fresh/stale class
- last decision timestamp
- decision delta vs previous bundle
- active orders delta
- trade delta
- realized pnl delta
- unrealized pnl delta
- spendable quote balance
- total allocation %
- dominant reason families (normalized)
- current risk state
- current lane
- current active ticket

## Recommended next improvement
Introduce normalized reason fields such as:
- `reason_family`
- `reason_code`
- `symbol`
- `quote_asset`
- `severity`

instead of relying only on free-text reasons like:
- `Skip BTCUSDC: Grid guard paused BUY leg`
- `Skip: No feasible candidates after policy/exposure filters`

## Working assumption
The bot did not fail only because of trading logic.
It also failed because the process was reasoning from a noisy memory surface.
