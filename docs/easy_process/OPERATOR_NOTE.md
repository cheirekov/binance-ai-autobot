# OPERATOR_NOTE

Last updated: 2026-06-18 09:07 UTC
Owner: PM/BA + Codex

## What to run next
- redeploy the API/bot service before judging the next bundle.
- keep the bot on testnet/paper mode; do not promote to real-money beta yet.
- do not reset the data folder for this validation state.
- after the next bundle, run `./scripts/validate-active-ticket.sh`.
- run `node scripts/t040-strategy-effectiveness-report.js` after the next bundle to see the plain strategy verdict.

## What changed in code
- the bot now pauses GRID BUY legs when all of these are true:
  - recent fill performance is negative after fees,
  - the symbol exposure is below the managed-position countable floor,
  - there is no working/actionable sell leg,
  - the quote is the home stable quote.
- if that guard trips and a bot-owned GRID BUY ladder order is still open, the bot cancels that BUY order.
- SELL ladders, reduce-only behavior, and managed unwind paths remain available.

## What to watch in the next bundle
- filled order count should fall materially from the June 18 level (`186`) if the churn guard is working.
- buy/sell notional should fall materially from June 18 (`5859.88` buy, `6060.27` sell) unless there is real new entry activity.
- fees should fall from June 18 (`10.83 USDC`).
- realized-after-fees should stop worsening from June 18 (`-58.82 USDC`).
- open exposure should stay bounded; June 18 ended at `0.11%` allocation.
- exchange rejects, health errors, and restarts must remain `0`.

## What not to do next
- do not request another T-031/T-032 patch for ordinary live-market skip churn.
- do not ask to copy GPL or unclear-license strategy code directly.
- do not weaken risk guards to make the bot trade more.
- do not treat one profitable or unprofitable bundle as production proof.
- do not write a docs-only batch if the next bundle is still `VALIDATION_REQUIRED` and `NOT_BETA_READY`; either patch runtime/test code for a proven issue or write an explicit `STOP_TESTNET` decision.

## What fresh evidence would change the decision
- P0/P1 safety issue: uncontrolled exposure, repeated exchange order rejects, inability to sell/unwind, broken accounting, crash/restart instability.
- deterministic fixture/replay proves a production-gate failure.
- strategy-effectiveness report changes from `NOT_BETA_READY` to `CANDIDATE_READY_FOR_OPERATOR_REVIEW`.
