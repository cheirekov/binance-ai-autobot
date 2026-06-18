# PRODUCTION_DELTA_NOTE

Last updated: 2026-06-18 09:07 UTC
Owner: PM/BA + Codex

## How this batch moves the bot closer to production
The June 18 bundle proved the previous patch deployed and reduced exposure, but it did not stop wallet bleed. The bot ended with only `0.11%` allocation and `5.42 USDC` open exposure cost, yet it still produced `186` filled orders, `5859.88 USDC` buy notional, `6060.27 USDC` sell notional, `10.83 USDC` fees, and `-58.82 USDC` realized-after-fees.

That is not production-ready adaptation. It is a bounded P1 execution-safety issue: fee-negative GRID churn around dust-sized inventory.

This batch adds a runtime guard that pauses GRID BUY legs only when recent fills are negative after fees, the symbol exposure is below the managed-position countable floor, and there is no working/actionable sell leg. Existing bot-owned GRID BUY orders are canceled when this guard trips. SELL ladders and reduce/unwind paths remain available.

## What is still missing before the next gate
- deploy this API/bot service change and collect the next bundle.
- verify filled orders, buy/sell notional, fees, and realized-after-fees improve.
- keep exchange rejects, restarts, and health errors at `0`.
- if churn persists after this guard, evaluate `risk_governor_hysteresis` as the deterministic fallback.
- finish release/rollback runbook proof before any real-money beta promotion.

## What this batch added to reduce process waste
- patched `apps/api/src/modules/bot/bot-engine.service.ts` with a fee-negative dust-churn GRID buy pause/cancel guard.
- added focused unit coverage in `apps/api/src/modules/bot/bot-engine.service.test.ts`.
- refreshed the June 18 `bear_choppy_controlled_drawdown` fixture and proof reports.
- updated T-040 handoff notes to require code-or-stop instead of docs-only loops when `NOT_BETA_READY` persists.

## Whether this batch improves execution, risk, validation, event awareness, or learning
- Execution: `yes`
- Risk: `yes`
- Validation: `yes`
- Event awareness: `no`
- Learning: `indirect`
