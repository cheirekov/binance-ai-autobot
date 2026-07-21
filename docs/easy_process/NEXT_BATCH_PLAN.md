# Next Batch Plan

Last updated: 2026-07-21 12:05 UTC

Active ticket: `T-026`

Implement deterministic walk-forward comparison of strategy candidates. Separate calibration from validation windows and score after-fee expectancy, drawdown, fees/turnover, exposure, and SELL reachability. Reject candidates that improve only the calibration slice.

Initial July 21 walk-forward result: `NO_WALK_FORWARD_EDGE`. The selected families averaged `+0.08%` on validation with only `3/12` profitable symbols, versus buy-and-hold `+3.47%`; no runtime candidate is promoted.

Live bundles continue in the background as datasets. They do not authorize runtime patches unless they reproduce a P0/P1 safety failure.
