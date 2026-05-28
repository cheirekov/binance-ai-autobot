# Ticket Switch Retrospective

Last updated: 2026-05-28 11:05 UTC
Previous ticket: `T-031`
Current ticket: `T-040`
Switch decision: `freeze runtime strategy/support lanes / activate bounded beta readiness`
Decision source: `operator concern + PM/BA review of March-May live-evidence loop`

## Why T-031/T-032 Are No Longer The Active Destination

- `T-031` and `T-032` have accumulated months of live Binance testnet micro-patches.
- The dominant blocker keeps moving as market state, universe membership, exchange minimums, exposure, and cooldowns change.
- That is expected for an adaptive live trading system; it is not a reliable definition of “not production ready.”
- Continuing to require same-ticket patches for each repeated live skip loop creates an infinite development loop.

## What Is Preserved

- `T-031` regime/risk-budget/candidate-quality behavior remains in runtime.
- `T-032` downside-control and sell/unwind reachability behavior remains in runtime.
- `T-034` funding/quote-routing stability remains closed and preserved.
- Future changes to those surfaces require either:
  - P0/P1 safety or execution severity, or
  - deterministic reproduction of a Gate P1/P2 blocker.

## Why T-040 Is Now Active

- The product needs a bounded beta decision, not another unbounded live-evidence patch cycle.
- `T-040` owns:
  - beta-readiness gates,
  - deterministic validation map,
  - release/rollback packet,
  - operator runbook and kill-switch proof,
  - severity rules for when live evidence can force runtime code changes.

## Hard Process Correction

- `patch_required` from live evidence is no longer enough to write trading-code changes while `T-040` is active.
- Runtime patches require:
  - P0/P1 severity, and
  - deterministic reproduction or an explicit PM/BA override.
- Non-stationary live-market skip churn becomes validation/backlog evidence, not automatic same-ticket patch pressure.

## Next Expected Outcome

- Produce a Gate P1 beta-readiness packet.
- List exact blockers that still prevent beta.
- Move remaining work into bounded tickets such as config-source cleanup, deterministic replay, operator controls, and compact evidence quality.
