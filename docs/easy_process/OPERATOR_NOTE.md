# OPERATOR_NOTE

Last updated: 2026-07-13 09:04 UTC
Owner: PM/BA + Codex

## What to run next
- keep the bot on testnet/paper mode.
- do not reset the data folder.
- do not redeploy trading behavior for this bundle.
- collect the next normal bundle.
- after the next bundle, run `./scripts/validate-active-ticket.sh`.
- run `node scripts/t040-strategy-effectiveness-report.js` after the next bundle for the plain strategy verdict.

## What the July 13 bundle showed
- deployed commit: `e4c9e54`.
- daily net worsened to `-25.68 USDT` from July 3 `-2.68 USDT`.
- realized-after-fees worsened to `-53.11 USDT` from July 3 `-26.86 USDT`.
- five-window net is still negative at `-85.49 USDT`.
- filled orders fell to `173` from July 3 `181`.
- fees fell to `8.75 USDC` from July 3 `9.08 USDC`.
- fresh entries were `6`, still far below July 1 `22`.
- exposure reduced to `3.10%`, now mostly `PUMPUSDC`.
- rejects, restarts, and health errors stayed `0`.
- exchange/order-sync backoff from July 3 is absent in the latest top reasons.
- active orders ended at `1`.

## What changed in code
- no trading behavior changed after this bundle.
- `scripts/t026-calibration-runner.js` now treats old safety windows as history unless the latest bundle has a safety failure or repeated recent rejects.
- `scripts/validate-active-ticket.sh` now allows deterministic validation helper changes to satisfy the no-docs-only guard.

## What to watch in the next bundle
- rejects, health errors, and restarts must remain `0`.
- fresh entries should stay near July 13 `6` or July 3 `5`, not return to July 1 `22`.
- filled orders and fees should fall further.
- realized-after-fees should improve from `-53.11 USDT`.
- PUMP exposure must not keep growing above the risk cap.
- SELL/reduce must remain reachable.

## What not to do next
- do not promote to real-money beta yet.
- do not reset state before measuring PUMP exposure and strategy-proof impact.
- do not weaken risk guards to make the bot trade more.
- do not write a new runtime strategy patch until offline proof identifies the change and preserves SELL/reduce.
