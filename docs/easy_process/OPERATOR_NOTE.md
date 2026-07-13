# OPERATOR_NOTE

Last updated: 2026-07-03 09:17 UTC
Owner: PM/BA + Codex

## What to run next
- keep the bot on testnet/paper mode.
- do not reset the data folder.
- do not redeploy trading behavior for this bundle; the July 1 patch is already running in commit `18b6ce2`.
- collect the next normal bundle.
- after the next bundle, run `./scripts/validate-active-ticket.sh`.
- run `node scripts/t040-strategy-effectiveness-report.js` after the next bundle for the plain strategy verdict.

## What the July 3 bundle showed
- deployed commit: `18b6ce2`.
- daily net improved to `-2.68 USDT` from July 2 `-13.65 USDT`.
- realized-after-fees improved to `-26.86 USDT` from July 2 `-60.92 USDT`, but is still negative.
- filled orders fell to `181` from `189`.
- fees fell to `9.08 USDC` from `10.39 USDC`.
- fresh entries were `5`, still far below July 1 `22`.
- exposure stayed near the cap at `5.09%`, now mostly `ETHUSDC` at `5.00%`.
- HBAR exposure fell to dust.
- rejects and restarts stayed `0`.
- health errors rose to `1` because Binance testnet returned repeated `502 Bad Gateway` on `openOrders`; the bot backed off instead of submitting more orders.
- active orders ended at `0`.

## What changed in code
- no trading behavior changed after this bundle.
- validation plumbing was corrected so `PATCH_ALLOWED_REVIEW` evidence can be audited instead of aborting the active-ticket gate.
- auto-retro now prints the actual exchange/order-sync backoff reason.

## What to watch in the next bundle
- order-sync must recover: no `Live order sync failed`, `Transient exchange backoff active`, or Binance `502 Bad Gateway` in top reasons.
- health errors should return to `0`.
- fresh entries should stay low, near July 3 `5` or July 2 `2`.
- filled orders and fees should fall further.
- realized-after-fees should improve from `-26.86 USDT`.
- ETH exposure must not keep growing above the risk cap.
- exchange rejects and restarts must remain `0`.

## What not to do next
- do not promote to real-money beta yet.
- do not reset state before measuring the ETH exposure and order-sync recovery.
- do not weaken risk guards to make the bot trade more.
- do not write a new runtime patch from repeated risk-budget skip text alone.
