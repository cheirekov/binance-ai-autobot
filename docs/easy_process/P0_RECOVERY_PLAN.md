# P0_RECOVERY_PLAN

Last updated: 2026-03-26 15:16 EET  
Owner: PM/BA + Codex

## Immediate action executed
- `PATCH_NOW`
- purpose:
  - restore the no-feasible liquidity-recovery path on the active `T-032` engine
  - recover real runtime behavior after the previous guard-pause hotfix failed to change the live blocker

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
- low spendable quote after reserve makes `noFeasibleRecovery` eligible again
- at least one of:
  - `no-feasible-liquidity-recovery`
  - materially changed recent decision mix
  - resumed sell-side activity on managed execution-quote symbols
- no dominant funding regression

## Do not do
- do not stop at dashboard/reporting confirmation alone
- do not judge the next run only from the cumulative top-skip table
- do not wipe state before trying this patch
- do not blind-rollback to `cce2322` before the fresh post-patch bundle exists
