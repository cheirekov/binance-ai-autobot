# OPERATOR_NOTE

Last updated: 2026-06-19 08:58 UTC
Owner: PM/BA + Codex

## What to run next
- keep the bot on testnet/paper mode.
- do not reset the data folder.
- collect the next normal bundle.
- after the next bundle, run `./scripts/validate-active-ticket.sh`.
- run `node scripts/t040-strategy-effectiveness-report.js` after the next bundle for the plain strategy verdict.

## What the June 19 bundle showed
- deployed commit: `5cb40be`.
- daily net improved to `+3.07 USDT`.
- realized-after-fees improved to `-24.73 USDT` from June 18 `-58.82 USDT`.
- fees improved to `9.07 USDC` from June 18 `10.83 USDC`.
- exposure stayed very low at `0.10%`.
- rejects, restarts, and health errors stayed `0`.
- filled orders did not improve yet (`190` vs June 18 `186`), so churn is still a watch item.
- repeated `No feasible candidates after policy/exposure filters` is a validation/backlog warning, not a hotfix trigger by itself.

## What to watch in the next bundle
- daily net should not immediately revert to a large loss.
- realized-after-fees should improve from `-24.73 USDT`.
- fees should continue below the June 18 baseline (`10.83 USDC`).
- filled order count should start falling from the current `190`.
- buy/sell notional should fall from `5748.19/5950.75 USDC` unless backed by real entry quality.
- exchange rejects, health errors, and restarts must remain `0`.

## What not to do next
- do not request another T-031/T-032 patch for ordinary no-feasible skip churn.
- do not weaken risk guards to make the bot trade more.
- do not promote to real-money beta yet.
- do not treat one positive daily bundle as proof of profitable adaptation.

## What fresh evidence would change the decision
- P0/P1 safety issue: uncontrolled exposure, repeated exchange order rejects, inability to sell/unwind, broken accounting, crash/restart instability.
- deterministic fixture/replay proves a production-gate failure.
- strategy-effectiveness report changes from `NOT_BETA_READY` to `CANDIDATE_READY_FOR_OPERATOR_REVIEW`.
