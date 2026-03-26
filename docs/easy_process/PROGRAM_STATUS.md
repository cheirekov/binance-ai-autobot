# PROGRAM_STATUS

Last updated: 2026-03-26 12:13 EET  
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
- Active lane: `Lane A — Runtime stability`
- Why:
  - the latest fresh bundle still showed a boxed-in live `T-032` runtime
  - the prior P0 batch fixed credibility surfaces but not engine behavior
  - the March 25 guard-pause slice was confirmed as a plausible engine-regression assist and was patched in this batch

## Current batch priority order
1. `Lane A` — confirm the engine hotfix in a short fresh runtime bundle
2. `Lane B` — if needed, decide rollback vs continue from the post-hotfix bundle
3. `Lane C` — only after runtime credibility is restored
4. `Lane E` — keep process/state hygiene, but it is no longer the active blocker
5. `Lane D` — still out of scope

## Program-level hard rules
1. Do not treat UI/reporting improvements as runtime recovery.
2. Do not trust persisted `running=true` state if the actual runtime is absent.
3. Do not do another blind long live `T-032` patch cycle before the short hotfix confirmation bundle.
4. Keep one active ticket.
