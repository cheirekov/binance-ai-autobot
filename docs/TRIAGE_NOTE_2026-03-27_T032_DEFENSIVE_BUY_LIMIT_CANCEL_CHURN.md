# TRIAGE NOTE: T-032 Defensive BUY-Limit Cancel Churn

Date: 2026-03-27  
Ticket: T-032  
Severity: P1 Stability  
Status: OPEN  

## Observed
- Fresh bundle `autobot-feedback-20260327-155408.tgz` triggered an automatic `pivot_required` because the aggregate top skip repeated across the latest 2 fresh bundles.
- Manual raw bundle review shows the latest runtime is not boxed into a pure no-candidate loop anymore.
- Recent live decisions repeatedly alternate:
  - `Binance testnet BUY LIMIT BTCUSDC ... grid-ladder-buy`
  - `Canceled 1 bot open order(s): defensive-bear-cancel-buy BTCUSDC`
- The same cancel/recreate pattern also appears on `ETHUSDC`.
- Latest cancel events run with:
  - `executionLane=DEFENSIVE`
  - `regime=NEUTRAL`
  - `confidence=0.4`

## Impact
- `P1` stability

## Evidence bundle
- Bundle ID: `autobot-feedback-20260327-155408.tgz`
- Run end UTC: `2026-03-27T15:53:24.773Z`
- Embedded runtime commit: `aaf532b`

## Reproduction
- seen in bundle `autobot-feedback-20260327-155408.tgz`

## Proposed fix
- Cancel defensive bot-owned BUY LIMIT orders only when a true buy-pause state is active, instead of canceling all defensive BUY orders unconditionally.

## Candidate ticket
- `T-032`

## PM/BA decision
- `interrupt active ticket`
- Owner: PM/BA + Codex
- Due window: immediate same-ticket follow-up patch
