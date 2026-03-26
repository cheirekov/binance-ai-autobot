# STATE_DIGEST

Last updated: 2026-03-26 12:13 EET  
Owner: State Steward

## Current observations
- the March 26 fresh bundle still points to a boxed-in live `T-032` runtime
- the prior P0 batch already repaired the main telemetry/reporting credibility defect
- the active blocker in this batch was the engine path, not the dashboard
- local/runtime process confusion remains an operational caution:
  - do clean recreate
  - do not trust `running=true` alone

## State hygiene rules
1. Do not trust `running=true` alone.
2. Compare persisted state against actual runtime presence.
3. Distinguish:
   - `strategy-idle but live`
   - `process absent / stale persisted state`
   - `telemetry-only freeze`
   - `combined failure`

## Working assumption
The active P0 blocker moved from telemetry credibility to engine recovery. State/process hygiene still matters, but it is no longer the only thing standing between the operator and credible runtime behavior.
