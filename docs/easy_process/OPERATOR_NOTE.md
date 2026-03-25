# OPERATOR_NOTE

Last updated: 2026-03-25 20:38 UTC  
Owner: PM/BA + Codex

## What to run next
- targeted validation already passed in this batch
- deploy the current patched workspace to the testnet runtime
- collect one fresh bundle with `AUTOBOT_COMPOSE_CMD=docker-compose ./scripts/collect-feedback.sh`

## What not to do next
- do not patch again from `autobot-feedback-20260325-195431.tgz`
- do not reopen the stale validation-only lane narrative unless a new bundle or validation result changes the evidence
- do not widen T-032 unwind policy before measuring this cooldown fix

## What fresh evidence would change the decision
- the next fresh bundle still shows unchanged BTCUSDC/SOLUSDC guard-pause loop pressure
- the next fresh bundle shows churn or funding regression after the cooldown patch
- a fresh bundle shows clean loop reduction and/or first justified `grid-guard-defensive-unwind` evidence
