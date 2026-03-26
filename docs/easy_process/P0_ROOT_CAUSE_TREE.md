# P0_ROOT_CAUSE_TREE

Last updated: 2026-03-26 11:44 EET  
Owner: PM/BA + Codex

## Root cause tree
- `P0: bot is operationally non-credible`
- Branch A: `runtime / strategy boxed-in`
  - March 26 fresh bundle still showed repeated `Grid guard paused BUY leg (17 -> 17)`
  - no `grid-guard-defensive-unwind` evidence appeared
  - latest tail leaned toward `No eligible universe candidates` / `No feasible candidates`
- Branch B: `March 25 regression surface`
  - guard-pause skips became storm-eligible
  - guard-pause no-action now persists a generic symbol `COOLDOWN`
  - that lock is treated as a hard symbol block before later unwind logic
  - status: `plausible, not yet fully proved`
- Branch C: `telemetry / reporting defect`
  - `last_run_summary.pnl.daily_net_usdt` reused lifetime `net`
  - dashboard timeline surfaces did not make stale state obvious
- Branch D: `process / state confusion`
  - `PROCESS_STATE_CONFLICT = true`
  - `docs/SESSION_BRIEF.md` was not authoritative for this incident batch
  - local persisted state said `running=true` while local Compose runtime was absent

## Synthesis
- This is not a pure PnL bug
- This is not a pure process bug
- This is not yet proven to be a pure March 25 regression either
- It is a combined failure where operator trust broke at the same time as the live `T-032` behavior remained unresolved
