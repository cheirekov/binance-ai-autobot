# P0_ROOT_CAUSE_TREE

Last updated: 2026-03-26 15:16 EET  
Owner: PM/BA + Codex

## Root cause tree
- `P0: bot is still operationally non-credible after the previous recovery attempt`
- Branch A: `cumulative runtime summary still advertises the old guard-pause loop`
  - `baseline-kpis.json` still starts at `2026-02-17`
  - top skips still carry Mar 23 `Grid guard paused BUY leg` / `Grid waiting...` counts
  - this explains why the latest bundle still looks unchanged at the summary layer
- Branch B: `active engine defect on the no-feasible recovery path`
  - `deriveNoFeasibleRecoveryPolicy(...)` only matched `No feasible candidates after sizing/cap filters`
  - live skips are now `No feasible candidates after policy/exposure filters`
  - the no-feasible recovery gate used raw `quoteFree`, not spendable quote after reserve
  - effect: `noFeasibleRecovery.enabled=false` in the live bundle
  - status: `patched in this batch`
- Branch C: `restart / recovery continuity issue`
  - recent decisions advance right after restart, then stall again
  - runtime is alive, but not credibly progressing
  - status: `clean recreate still required`
- Branch D: `previous recovery action hit the wrong surface`
  - March 25/26 guard-pause patches were plausible, but the latest bundle on `2914263` shows the active blocker is elsewhere
  - status: `not the primary live blocker now`

## Synthesis
- this is not just a dashboard issue
- this is not best explained by the March 26 hotfix failing to deploy
- full rollback to `cce2322` is weak because the pre-patch bundle was already unresolved
- the active recovery move is a bounded engine patch on the no-feasible liquidity-recovery path, plus clean recreate
