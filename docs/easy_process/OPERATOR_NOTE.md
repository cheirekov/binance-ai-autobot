# OPERATOR_NOTE

Last updated: 2026-03-26 15:16 EET  
Owner: PM/BA + Codex

## What to run next
- deploy this batch as a bot-engine recovery patch
- do a clean recreate on the target runtime
- keep current `state.json` and config; do not manually wipe state first
- collect one short fresh bundle after 30-90 minutes

## What not to do next
- do not judge the next run only from the cumulative top-skip table
- do not redeploy the older guard-pause hotfix and assume recovery
- do not manually rollback to `cce2322` unless fresh post-patch evidence shows this patch regressed behavior

## What fresh evidence would change the decision
- recent decisions after restart still remain only `No feasible` / `No eligible` with no recovery attempt
- `noFeasibleRecovery` stays disabled when spendable quote after reserve is still low
- any return of dominant quote-funding regression
