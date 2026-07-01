# OPERATOR_NOTE

Last updated: 2026-07-01 09:01 UTC
Owner: PM/BA + Codex

## What to run next
- redeploy the API/bot service with the July 1 risk-governor hysteresis patch.
- keep the bot on testnet/paper mode.
- do not reset the data folder.
- collect the next normal bundle.
- after the next bundle, run `./scripts/validate-active-ticket.sh`.
- run `node scripts/t040-strategy-effectiveness-report.js` after the next bundle for the plain strategy verdict.

## What the July 1 bundle showed
- deployed commit: `d1bb273`.
- daily net fell to `-46.55 USDT`.
- realized-after-fees was `-42.67 USDT`.
- fees were `11.62 USDC`.
- exposure stayed low at `0.12%`.
- rejects, restarts, and health errors stayed `0`.
- filled orders remained high at `197`.
- buy/sell notional remained high at `6357.51/6557.45 USDC`.
- top after-fee losses: `SYNUSDC=-25.78`, `ZROUSDC=-8.98`, `AIGENSYNUSDC=-7.90`.

## What changed in code
- risk-governor negative-expectancy hysteresis now blocks fresh exposure even during strong-bull `NORMAL` conditions.
- SELL/reduce permissions remain available when there is open exposure.
- this targets fresh-entry churn after recent after-fee losses; it is not a skip-loop patch.

## What to watch in the next bundle
- fresh entries should fall from July 1 `22`.
- filled orders should fall from `197`.
- fees should fall from `11.62 USDC`.
- realized-after-fees should improve from `-42.67 USDT`.
- exposure must stay bounded.
- exchange rejects, health errors, and restarts must remain `0`.

## What not to do next
- do not promote to real-money beta yet.
- do not reset state before measuring the patch.
- do not weaken risk guards to make the bot trade more.
- do not treat one improved bundle as production proof.
