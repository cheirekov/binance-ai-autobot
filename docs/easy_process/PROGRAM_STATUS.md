# PROGRAM_STATUS

Last updated: 2026-03-26 11:44 EET  
Owner: PM/BA + Codex

## North Star
Build a **professional Binance autobot** that:
- adapts across different market conditions
- maximizes risk-adjusted returns
- protects capital with hard guardrails
- stays auditable and operator-trustworthy

## Program lanes
- `Lane A — Runtime stability`
- `Lane B — Deterministic validation`
- `Lane C — Strategy quality`
- `Lane D — AI/shadow learning`
- `Lane E — State/process hygiene`

## Current program decision
- Active lane: `Lane E — State/process hygiene`
- Why:
  - the bot is currently operationally non-credible, not just unresolved on `T-032`
  - the March 26 fresh bundle still left the strategy boxed-in
  - telemetry and local process memory were also misleading

## Current batch priority order
1. `Lane E` — restore truthful daily-net and stale-state visibility
2. `Lane B` — prove whether the March 25 guard-pause slice is a rollback candidate
3. `Lane A` — only after proof, execute the smallest safe rollback or patch
4. `Lane C` — broader strategy quality work after the current ambiguity is removed
5. `Lane D` — still out of scope

## Program-level hard rules
1. Do not treat non-credible telemetry as strategy evidence.
2. Do not trust persisted `running=true` state if the actual runtime is absent.
3. Do not do another blind live `T-032` hotfix from the March 25 / March 26 pair.
4. Keep one active ticket.
