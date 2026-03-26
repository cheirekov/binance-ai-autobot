# P0_ROOT_CAUSE_TREE

Last updated: 2026-03-26 12:13 EET  
Owner: PM/BA + Codex

## Root cause tree
- `P0: bot is operationally non-credible`
- Branch A: `runtime / strategy boxed-in`
  - March 26 fresh bundle still showed repeated `Grid guard paused BUY leg (17 -> 17)`
  - no `grid-guard-defensive-unwind` evidence appeared
  - latest decision mix leaned toward no-action waiting
- Branch B: `confirmed March 25 regression surface`
  - non-caution guard-pause ticks wrote a generic symbol `COOLDOWN`
  - that state could become the terminal no-action save before later waiting / no-inventory handling ran
  - the same cooldown could hard-block symbol progression through `isSymbolBlocked(...)`
  - status: `patched in this batch`
- Branch C: `telemetry / reporting credibility defect`
  - fixed in the prior `OPERATIONS_ADJUSTMENT` batch
  - status: `not the active blocker in this batch`
- Branch D: `process / state confusion`
  - local/runtime state could still be misread if the operator trusts stale recovered process memory
  - status: `operational caution remains`

## Synthesis
- this was not just a dashboard issue
- this was not safely solved by full rollback alone
- the active recovery move is a bounded engine hotfix on the March 25 guard-pause path
