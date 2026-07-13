# LATEST_BATCH_DECISION

Last updated: 2026-07-03 09:17 UTC
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Gate P1 - bounded beta readiness`
- Why:
  - `observed`: the July 3 bundle ran deployed commit `18b6ce2`; the July 1 risk-governor hysteresis patch is still live.
  - `observed`: auto-retro returned `validation_required`; readiness classifier returned `PATCH_ALLOWED_REVIEW`.
  - `observed`: strategy results improved but remain not beta-ready: daily net `-2.68 USDT`, realized-after-fees `-26.86 USDT`, five-window net `-99.58 USDT`.
  - `observed`: churn improved versus July 2: filled orders `189 -> 181`, fees `10.39 -> 9.08 USDC`, buy/sell notional `5742/5602 -> 5175/5153 USDC`.
  - `observed`: exposure stayed near the watch level at `5.09%`; HBAR exposure fell from `5.00%` to dust, while ETH is now the main position at `5.00%`.
  - `observed`: operational safety is not clean: `1` health error and repeated order-sync backoff from Binance testnet `502 Bad Gateway` on `openOrders`.
  - `observed`: trading safety stayed bounded: `0` rejected orders, `0` restarts, `0` unmanaged exposure, service still `TRADING`, active orders `0`.

## Chosen active ticket
- Current: `T-040` (Bounded beta readiness)
- Linked support: `none`
- Decision: `patch_allowed_review_no_trading_patch`
- Runtime action this batch: `process/validation patch only`
- Why:
  - `observed`: the review trigger is external order-sync backoff, not strategy skip churn.
  - `observed`: the bot paused during backoff and did not crash or keep submitting rejected orders.
  - `observed`: HBAR concentration resolved; ETH concentration is now the exposure watch item.
  - `inferred`: the correct next step is a clean follow-up bundle or deterministic exchange-backoff validation, not another risk-budget/strategy patch.

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260703-091448.tgz`
- Evidence role: operational review evidence showing improving PnL/churn trend but Binance testnet order-sync backoff and continued negative expectancy.

## Allowed work mode
- Current batch: `PATCH_ALLOWED_REVIEW`
- Runtime patch basis: `review only; no bot-side trading bug deterministically proven`
- Production promotion: `blocked`

## Batch decision
- Decision: `continue_same_ticket_operational_validation`
- Next ticket candidate: `T-040`
- Review slice:
  - keep running testnet/paper mode without state reset.
  - do not redeploy trading behavior for this bundle.
  - next bundle must show order-sync backoff cleared, no health errors, ETH exposure not growing beyond cap, entries staying low, fees falling, and realized-after-fees improving.
  - do not promote to real-money beta.
