# PRODUCTION_DELTA_NOTE

Last updated: 2026-07-14 08:24 UTC
Owner: PM/BA + Codex

## Production movement
The July 14 bundle is not production proof. It does move validation forward because the loss mechanism is now reproduced at filled-order level instead of inferred from aggregate skip counts.

- Deployed commit: `e4c9e54`
- Strategy verdict: `NOT_BETA_READY`
- Safety: clean (`0` rejects, `0` errors, `0` restarts)
- Confirmed candidate: `entry_burst_guard_v1`, implemented for bounded testnet validation under PM/BA override
- Counterfactual result: mark-to-market `+5.74 USDC`, fees `-0.26 USDC`, ending exposure `-92.27 USDC`, sells preserved `15/15`

## Remaining blocker
- Realized-after-fees is `-72.46 USDT`; five-window net is `-119.63 USDT`.
- Allocation is `5.09%`, concentrated in ZEC.
- The runtime patch needs one clean post-deploy bundle proving entry caps and SELL/reduce reachability.
- Release/rollback proof and a non-`NOT_BETA_READY` strategy verdict are still required before real-money beta.

## Capability status
- Execution: `clean_but_entry_burst_observed`
- Risk: `watch_zec_concentration`
- Validation: `entry_burst_offline_proof_confirmed_twice_and_runtime_test_passed`
- Event awareness: `no`
- Learning: `deterministic_counterfactual`
