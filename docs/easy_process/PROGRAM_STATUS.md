# PROGRAM_STATUS

Last updated: 2026-03-28 10:47 EET  
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
- Next validation lane: `PM/BA pivot review`
- Active ticket: `T-032` (pending pivot review)
- Why:
  - the latest fresh bundle auto-signaled `pivot_required`
  - the previous same-ticket patch deployed and removed the old churn signature
  - the remaining repeat is an `ABS_DAILY_LOSS` caution policy/scope question, so another same-ticket patch is not justified yet

## Current batch priority order
1. `Lane A` — decide whether to pivot from `T-032` to a new follow-up / hardening ticket on daily-loss caution re-entry policy
2. `Lane B` — if the lane stays on `T-032`, define a new bounded hypothesis before code
3. `Lane C` — defer broader strategy work until the correct runtime lane is chosen
4. `Lane D` — still out of scope
5. `Lane E` — keep process memory aligned to the pivot review

## Program-level hard rules
1. Do not reopen or redefine DONE tickets.
2. Keep one active ticket.
3. Do not treat one post-patch bundle as promotion proof.
4. If the next bundle disproves the same-ticket hypothesis, create a follow-up ticket instead of rewriting history.
