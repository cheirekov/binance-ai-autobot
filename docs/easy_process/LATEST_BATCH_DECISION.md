# LATEST_BATCH_DECISION

Last updated: 2026-07-01 09:01 UTC
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Gate P1 - bounded beta readiness`
- Why:
  - `observed`: the July 1 bundle ran deployed commit `d1bb273`.
  - `observed`: auto-retro returned `continue`, but latest daily net was `-46.55 USDT`, risk state ended `CAUTION`, and strategy effectiveness remains `NOT_BETA_READY`.
  - `observed`: safety stayed clean: `0` rejected orders, `0` restarts, `0` health errors, and `0.12%` allocation.
  - `observed`: execution churn remained high: `197` fills, `6357.51/6557.45 USDC` buy/sell notional, `11.62 USDC` fees, and only `5.78 USDC` open exposure cost.
  - `observed`: top losses after fees are concentrated in `SYNUSDC`, `ZROUSDC`, and `AIGENSYNUSDC`.

## Chosen active ticket
- Current: `T-040` (Bounded beta readiness)
- Linked support: `none`
- Decision: `runtime_patch_with_test`
- Runtime action this batch: `risk-governor hysteresis patch`
- Why:
  - `observed`: the June 18 dust-churn guard did not sufficiently reduce longer-window fee churn.
  - `observed`: risk-budget logic had a deterministic exception that let strong-bull `NORMAL` conditions keep fresh exposure open after recent after-fee losses.
  - `inferred`: removing that exception is a bounded P1 execution mitigation and preserves SELL/reduce actions.

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260701-085837.tgz`
- Evidence role: post-deploy validation showing risk-governor fallback is now needed.

## Allowed work mode
- Current batch: `RUNTIME_PATCH_WITH_TEST`
- Runtime patch basis: `P1 execution fee-churn issue plus deterministic unit test`
- Production promotion: `blocked`

## Batch decision
- Decision: `continue_same_ticket_with_runtime_mitigation`
- Next ticket candidate: `T-040`
- Review slice:
  - deploy the API/bot service with the risk-governor hysteresis patch.
  - keep running testnet/paper mode without state reset.
  - next bundle must show lower fresh-entry churn, lower fees, and improved realized-after-fees.
  - do not promote to real-money beta.
