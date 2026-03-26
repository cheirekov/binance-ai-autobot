# P0_RECOVERY_PLAN

Last updated: 2026-03-26 18:47 EET  
Owner: PM/BA + Codex

## Immediate action executed
- `PATCH_NOW`
- purpose:
  - restore the no-feasible liquidity-recovery path on the active `T-032` engine under real live cadence
  - recover real runtime behavior after the previous no-feasible patch proved incomplete

## Recovery sequence
1. Deploy this engine patch.
2. Clean-recreate the target runtime.
3. Keep state/config intact unless the patch itself proves unsafe.
4. Collect one short fresh bundle.
5. Inspect recent decisions and `noFeasibleRecovery` details.
6. Choose exactly one follow-up:
   - `continue_same_ticket` if runtime behavior changes materially in the right direction
   - another same-ticket recovery slice if the runtime is still alive but the sell-side recovery path remains unreachable

## Success criteria for the next bundle
- fresh decision timestamps continue after recreate
- repeated no-feasible skips across the real live cadence now make `noFeasibleRecovery` eligible again
- low spendable quote after reserve now uses the same floor for recovery as for candidate feasibility
- at least one of:
  - `no-feasible-liquidity-recovery`
  - `noFeasibleRecovery.enabled=true`
  - materially changed recent decision mix
  - resumed sell-side activity on managed execution-quote symbols
- no dominant funding regression

## Do not do
- do not stop at dashboard/reporting confirmation alone
- do not judge the next run only from the cumulative top-skip table
- do not wipe state before trying this patch
- do not broad-rollback before `3a6a14f` before the fresh post-patch bundle exists
