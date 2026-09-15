# P0_ROOT_CAUSE_TREE

Last updated: 2026-03-26 18:47 EET  
Owner: PM/BA + Codex

## Root cause tree
- `P0: bot is still operationally non-credible after the previous recovery attempt`
- Branch A: `cumulative runtime summary still advertises the old guard-pause loop`
  - `baseline-kpis.json` still starts at `2026-02-17`
  - top skips still carry Mar 23 `Grid guard paused BUY leg` / `Grid waiting...` counts
  - this explains why the latest bundle still looks unchanged at the summary layer
- Branch B: `active engine defect remains on the no-feasible recovery path`
  - the previous patch deployed on `3a6a14f`
  - `deriveNoFeasibleRecoveryPolicy(...)` still only armed recovery after a 10-minute skip cluster
  - `shouldAttemptNoFeasibleRecovery(...)` still used a `1` home-unit threshold while live funding floors were effectively `3-5`
  - effect: `noFeasibleRecovery.enabled=false` or recovery stays gated off even though the engine remains quote-starved
  - status: `patched in this batch`
- Branch C: `restart / recovery cadence issue`
  - recent decisions advance right after restart, then only sparse starvation evidence appears
  - runtime is alive, but the original recovery policy assumed a tighter cadence than production showed
  - status: `clean recreate still required`
- Branch D: `previous recovery action was incomplete, not absent`
  - March 26 `3a6a14f` correctly improved reason matching and spendable-liquidity measurement
  - the fresh 16:41 bundle proves the remaining blocker is still the same no-feasible path, but with stricter trigger math than live conditions allow
  - status: `amended in this batch`

## Synthesis
- this is not just a dashboard issue
- this is not best explained by the March 26 patch failing to deploy
- the immediate prior patch touched the right surface, but it did not go far enough
- full rollback before `3a6a14f` is weak because it would reintroduce already-fixed defects
- the active recovery move is a bounded engine amendment on the same no-feasible liquidity-recovery path, plus clean recreate
