# P0_RECOVERY_PLAN

Last updated: 2026-03-26 12:13 EET  
Owner: PM/BA + Codex

## Immediate action executed
- `PATCH_NOW`
- purpose:
  - remove the March 25 guard-pause runtime regression
  - restore credible engine progression on the `T-032` path

## Recovery sequence
1. Deploy this engine hotfix.
2. Clean-recreate the target runtime.
3. Keep state/config intact unless the patch clearly fails.
4. Collect one short fresh bundle.
5. Choose exactly one follow-up:
   - `continue_same_ticket` if runtime behavior changes materially in the right direction
   - `ROLLBACK_NOW` if the short bundle still proves no effective recovery

## Success criteria for the next bundle
- fresh decision timestamps after recreate
- no legacy hard-block from non-caution `GRID_GUARD_BUY_PAUSE` cooldown
- changed runtime decision mix relative to the March 26 boxed-in baseline
- no dominant funding regression

## Do not do
- do not stop at dashboard/reporting confirmation alone
- do not wipe state before trying this patch
- do not run another long ambiguous live batch before the short recovery confirmation
