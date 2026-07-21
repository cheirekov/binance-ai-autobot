# Ticket Switch Retrospective

Last updated: 2026-07-21 12:05 UTC
Previous ticket: `T-040`
Current ticket: `T-026`
Switch decision: `accept deployed guard / activate deterministic strategy calibration`
Decision source: `July 21 post-deploy audit + persistent negative after-fee expectancy`

## Boundary

- T-040 entry-burst behavior is accepted: six activations, zero forbidden fills, maximum streak two, and SELL reachability preserved.
- T-040 remains `VALIDATION`; production and real-money beta remain blocked.
- T-026 owns strategy improvement through replay and walk-forward validation.
- Live skip churn cannot create a T-026 runtime patch. Only reproduced P0/P1 safety evidence may interrupt this lane.

## Expected Output

A machine-readable candidate comparison using separate calibration and validation windows, after-fee expectancy, drawdown, turnover/fees, and SELL reachability. A candidate that only fits one market window is rejected.
