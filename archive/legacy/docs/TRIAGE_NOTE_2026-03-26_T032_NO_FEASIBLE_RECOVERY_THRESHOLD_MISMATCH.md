# TRIAGE NOTE: T-032 No-Feasible Recovery Threshold Mismatch

Date: 2026-03-26  
Ticket: T-032  
Severity: P0 Runtime  
Status: OPEN  

## Observed
- Latest fresh bundle `autobot-feedback-20260326-164157.tgz` runs `git.commit=3a6a14f`, so the previous no-feasible recovery patch did deploy.
- The dominant aggregate loop still repeated as `Skip BTCUSDC: Grid guard paused BUY leg (17 -> 17)`.
- Recent live decisions are still mostly `Skip: No feasible candidates after policy/exposure filters` with restart markers in between.
- Latest no-feasible details still show:
  - `enabled=false`
  - `recentCount=1`
  - `threshold=2`
  - `quoteLiquidityThreshold=1`
  - `maxExecutionQuoteSpendableHome=2.841632`

## Impact
- `P0` safety / runtime credibility

## Evidence bundle
- Bundle ID: `autobot-feedback-20260326-164157.tgz`
- Run end UTC: `2026-03-26T16:41:56.063Z`
- Active ticket from session/retro: `T-032`

## Reproduction
- seen in bundle `autobot-feedback-20260326-164157.tgz`

## Proposed fix
- Amend the no-feasible recovery trigger so it uses the same minimum quote-liquidity floor as candidate feasibility and so repeated starvation can accumulate across the actual production cadence instead of only a 10-minute cluster.

## Candidate ticket
- `T-032`

## PM/BA decision
- `interrupt active ticket`
- Owner: PM/BA + Codex
- Due window: immediate follow-up P0 batch
