# LATEST_BATCH_DECISION

Last updated: 2026-07-14 08:24 UTC
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Gate P1 - bounded beta readiness`
- Latest bundle: `autobot-feedback-20260714-075300.tgz`
- Deployed commit: `e4c9e54` on `testnet`
- Readiness: `VALIDATION_REQUIRED`; strategy effectiveness: `NOT_BETA_READY`
- Profitability: daily net `-31.07 USDT`, realized-after-fees `-72.46 USDT`, five-window net `-119.63 USDT`
- Safety: `0` rejected orders, `0` health errors, `0` restarts; allocation `5.09%`

## Decision
- Active ticket: `T-040`
- Decision: `bounded_testnet_entry_burst_patch_approved`
- Runtime action: implement `entry_burst_guard_v1` for testnet validation under delegated PM/BA override
- Validation action: two independent bundle-delta replays plus focused runtime tests
- Production promotion: blocked

## Why the proof target changed
- Event-level evidence shows repeated neutral MARKET entries, not GRID BUY legs, as the directly reproducible July 14 loss/exposure mechanism.
- ALLO received four MARKET entries before a stop loss; ZEC received four MARKET entries and ended near `229.74 USDC` open cost.
- The deterministic two-entry counterfactual suppressed four entries, improved mark-to-market by `5.74 USDC`, reduced fees by `0.26 USDC`, reduced ending exposure by `92.27 USDC`, and preserved `15/15` sell events.
- This is P2 strategy-quality evidence, not a P0/P1 safety failure. The delegated PM/BA override approves a bounded testnet implementation after two independent proofs; beta promotion remains blocked.

## Next bounded action
- Keep testnet state; do not reset data.
- Deploy the bounded testnet patch without resetting state.
- Validate that the third neutral/range MARKET entry is blocked while SELL/reduce remains reachable.
- Do not promote to real-money beta.
