# PROGRAM_STATUS

Last updated: 2026-03-27 18:03 EET  
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
- Active lane for this batch: `Lane A — Runtime stability`
- Next validation lane: `Lane B — Deterministic validation`
- Active ticket: `T-032` (Exit manager v2)
- Why:
  - the latest fresh bundle auto-signaled `pivot_required`, but raw behavior changed materially
  - the runtime is already placing BUY ladder orders; the current blocker is false defensive cancel cleanup inside `T-032`
  - the next action is still a bounded same-ticket patch plus fresh-bundle validation, not a lane rewrite

## Current batch priority order
1. `Lane A` — patch defensive BUY-limit cancel gating inside `T-032`
2. `Lane B` — validate the patch on the next fresh live bundle
3. `Lane C` — defer broader strategy work until the gate behavior is proved
4. `Lane D` — still out of scope
5. `Lane E` — keep process memory aligned, but do not let it dominate the active lane again

## Program-level hard rules
1. Do not reopen or redefine DONE tickets.
2. Keep one active ticket.
3. Do not treat one post-patch bundle as promotion proof.
4. If the next bundle disproves the same-ticket hypothesis, create a follow-up ticket instead of rewriting history.
