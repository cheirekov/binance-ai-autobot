# STATE_DIGEST

Last updated: 2026-03-26  
Owner: State Steward

## Current observations
- the March 26 fresh bundle still points to a boxed-in live `T-032` state
- the local workspace showed separate stale-process evidence:
  - `data/state.json` had `running=true`
  - `data/state.json.updatedAt` and local telemetry were old
  - local Compose runtime was absent
- the repo also had a telemetry integrity defect: `daily_net_usdt` in `last_run_summary` reused lifetime `net`

## State hygiene rules
1. Do not trust `running=true` alone.
2. Compare persisted state against actual runtime presence.
3. Treat stale timestamp visibility as an incident surface, not a cosmetic issue.
4. Distinguish:
   - `strategy-idle but live`
   - `process absent / stale persisted state`
   - `telemetry-only freeze`
   - `combined failure`

## Working assumption
The current incident is a combined runtime + telemetry + process-state problem, not a single bad chart or single bad patch.
