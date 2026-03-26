# OPERATOR_NOTE

Last updated: 2026-03-26 18:47 EET  
Owner: PM/BA + Codex

## What to run next
- deploy this batch as a bot-engine recovery amendment
- do a clean recreate on the target runtime
- keep current `state.json` and config; do not manually wipe state first
- collect one short fresh bundle after 30-90 minutes

## What not to do next
- do not judge the next run only from the cumulative top-skip table
- do not assume `3a6a14f` already fixed the live blocker; the 16:41 bundle proved it did not
- do not manually rollback before fresh post-patch evidence shows this amendment over-fired or regressed behavior

## What fresh evidence would change the decision
- recent decisions after restart still remain only `No feasible` / `No eligible` with no recovery attempt
- `noFeasibleRecovery` still stays disabled when spendable quote after reserve is below the candidate funding floor
- recovery sells begin firing too aggressively or reintroduce funding churn
