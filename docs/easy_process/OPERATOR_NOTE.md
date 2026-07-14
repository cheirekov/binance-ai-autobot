# OPERATOR_NOTE

Last updated: 2026-07-14 08:24 UTC
Owner: PM/BA + Codex

## Operator action
- Keep the bot on testnet/paper mode.
- Do not reset the data folder.
- Deploy this patch to the testnet trading service without resetting state.
- Collect the next normal bundle after deployment.

## July 14 result
- Daily net `-31.07 USDT`; realized-after-fees `-72.46 USDT`; five-window net `-119.63 USDT`.
- Filled orders `169`; fees `8.31 USDC`; allocation `5.09%`.
- ZEC open cost `229.74 USDC` after four neutral MARKET entries.
- Rejects, health errors, and restarts stayed `0`.

## Engineering result
- Added `scripts/t026-entry-burst-proof.js`, a second independent replay, and focused unit tests.
- Actual July 13→14 replay: `+5.74 USDC` mark-to-market delta, `-0.26 USDC` fees, `-92.27 USDC` ending exposure, and `15/15` sell events preserved.
- Runtime behavior now caps neutral/range MARKET entry bursts at two consecutive fills for risk `70-100` and one for lower risk; a filled SELL resets the cap. GRID limit buys do not count.

## Next check
After deployment, verify the cap blocks the third neutral/range MARKET entry, does not block SELL/reduce, and does not increase rejects or health errors. Real-money beta remains blocked.
