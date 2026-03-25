# PROGRAM_STATUS

Last updated: 2026-03-25 20:38 UTC  
Owner: PM/BA + Codex

## North Star
Build a **professional Binance autobot** that:
- adapts across different market conditions, not just one recent regime,
- maximizes risk-adjusted returns,
- protects capital with hard guardrails,
- uses AI and ML only through controlled, auditable promotion,
- can be continued by different LLMs without drift.

## Program lanes
Only **one lane** may be active for implementation in a batch, but PM/BA must review all lanes when choosing the next batch.

### Lane A — Runtime stability
Purpose:
- execution loop health
- stuck/unresponsive behavior
- funding/exposure deadlocks
- order lifecycle correctness

### Lane B — Deterministic validation
Purpose:
- scenario replay
- targeted tests
- seeded state validation
- proof that a behavior change works without waiting on the live market

### Lane C — Strategy quality
Purpose:
- entry/exit quality
- exposure control
- regime adaptation
- risk slider mapping

### Lane D — AI/shadow learning
Purpose:
- AI policy design
- shadow evaluation
- promotion gates
- structured decision contract

### Lane E — State/process hygiene
Purpose:
- compact operational memory
- state summary quality
- reason-code normalization
- LLM handoff quality

## Current program decision
- Active lane: `Lane A — Runtime stability`
- Why:
  - the latest authoritative bundle is `fresh`, not `stale`
  - the same T-032 loop stayed dominant across fresh evidence
  - a direct same-ticket mitigation is now justified before any deeper strategy or validation pivot

## Current batch priority order
1. `Lane A` — same-ticket runtime mitigation and post-patch validation for the active stuck loop
2. `Lane B` — deterministic follow-up only if the patch still leaves the loop unresolved
3. `Lane E` — keep easy-process memory aligned with `RETROSPECTIVE_AUTO.md` and `SESSION_BRIEF.md`
4. `Lane C` — broader strategy improvements after the loop pressure is reduced
5. `Lane D` — AI/shadow promotion only after execution and validation are healthier

## Program-level hard rules
1. Do not choose the next batch from one document alone.
2. Do not stay on one ticket forever just because it is already active.
3. If evidence is stale, move to validation instead of speculative patching.
4. If evidence is fresh and directly matches a live runtime loop, direct same-ticket mitigation is allowed.
5. Strategy work is not complete if it only works in one recent market state.
6. Full raw `state.json` is forensic evidence, not the default working memory for LLM onboarding.
7. A new model session is expected to start from files, not from previous chat memory.
8. `docs/RETROSPECTIVE_AUTO.md` is the decision authority; `docs/SESSION_BRIEF.md` must mirror it; easy-process files must not diverge from both.

## PM/BA output required every batch
- chosen lane
- chosen ticket
- why this lane is the best use of the next batch
- what evidence supports that
- what is still only inferred
