# PROGRAM_STATUS

Last updated: 2026-03-26 15:16 EET  
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
  - the latest fresh bundle on `2914263` still showed a non-credible live `T-032` runtime
  - the previous guard-pause hotfix deployed, but the active blocker shifted to the no-feasible recovery path
  - restart/recovery continuity still matters, but it is a secondary overlay rather than the primary code surface

## Current batch priority order
1. `Lane A` — deploy and confirm the no-feasible recovery patch in one short fresh bundle
2. `Lane B` — use the post-patch bundle to decide whether another same-ticket recovery slice is needed
3. `Lane C` — only after runtime credibility is restored
4. `Lane E` — preserve clean recreate and state hygiene, but do not widen to full reseed without proof
5. `Lane D` — still out of scope

## Program-level hard rules
1. Do not treat UI/reporting improvements as runtime recovery.
2. Do not trust the cumulative top-skip table alone when the run is long-lived.
3. Do not wipe state before the fresh post-patch recreate unless corruption is proven.
4. Keep one active ticket.
