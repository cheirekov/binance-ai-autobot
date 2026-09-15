# Latest Batch Decision

Last updated: 2026-09-12 09:37 UTC

- Bundle: `autobot-feedback-20260912-093754.tgz`
- Deployed commit: `397fa51` on testnet
- Runtime safety: allocation `1.88%`; the bundle has `8` health errors from testnet attempts to trade the invalid dynamic-universe symbol `牛来USDC`. The calibration helper classifies this as `PATCH_ALLOWED_REVIEW`; it does not authorize a runtime patch without separate P0/P1 reproduction.
- Runtime strategy verdict: `NOT_BETA_READY` (`-8.65 USDT` daily); real-money beta remains blocked.
- Walk-forward gate: `WALK_FORWARD_REJECTED` across fixed July 21, August 10, August 31, and September 12 core-universe fixtures. The new independent September cutoff selected `REGIME_ADAPTIVE` on training but returned `-1.70%` after fees on validation, with only `2/12` profitable symbol-windows. Aggregate selected return is `-0.28%` versus buy-and-hold `-0.61%`; SELL reachability remains `48/48` and drawdown remains no worse than buy-and-hold.
- Decision: withdraw the previous shadow-only promotion candidate; improve or replace the offline selector on the preserved four-fixture set before any shadow handoff.
- Runtime action: none. Keep testnet state and deployment unchanged.
