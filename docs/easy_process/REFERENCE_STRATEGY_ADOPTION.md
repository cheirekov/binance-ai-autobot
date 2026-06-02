# REFERENCE_STRATEGY_ADOPTION

Last updated: 2026-06-02 08:50 UTC
Owner: PM/BA + Trader + Architect + Codex

Purpose: turn the local reference bots into productive strategy work without copying incompatible code or restarting the T-031/T-032 loop.

## Decision

Do not copy strategy code blindly.

Use a clean-room adoption path:
1. read reference behavior and license status.
2. write our own strategy contract in this repo.
3. validate with deterministic fixtures/replay before live influence.
4. promote only through Gate P1/P2.

If the operator has explicit permission to use a reference source, record it in `docs/REFERENCE_PERMISSION_NOTES.md` before direct copying or derivative porting.

## License Boundary

| Source | Use |
| --- | --- |
| `references/binance-ai-bot-1` | internal reference; patterns may be ported, but prefer clean-room code |
| `references/binance-ai-bot-24` | internal reference; first source for grid guard, risk governor, PnL reconciliation |
| `references/NostalgiaForInfinity-main` | MIT; ideas/code can be used with attribution, but avoid monolithic copy |
| `references/jesse-master` | MIT; useful for strategy lifecycle and backtest concepts |
| `references/Crypto-Signal-master` | MIT; useful for indicator/signal scanner concepts |
| `references/ccxt-master` | MIT; use package/API patterns, not vendored source |
| `references/freqtrade-develop` | GPLv3; study architecture only unless compatible permission or licensing decision is documented |
| `references/freqtrade-strategies-main` | GPLv3; study strategy categories only unless compatible permission or licensing decision is documented |
| `references/Gekko-Strategies-master` | mixed/unclear; study categories only until per-file license or owner permission is documented |
| `references/crypto-trading-open-main` | no license found; do not copy unless permission is documented |

## Strategy Families To Build Clean-Room

| Priority | Family | Reference pattern | Repo target |
| --- | --- | --- | --- |
| 1 | Risk Governor hysteresis | daily/rolling drawdown, fee burn, NORMAL/CAUTION/HALT hysteresis | `bear_choppy_controlled_drawdown` fixture + risk policy review |
| 2 | Grid Guard v2 | pause BUY legs in bad regimes, keep SELL/unwind reachable | `T-026` fixtures first, then runtime only if proven |
| 3 | Mean reversion gate | BB/RSI/ADX-style range entry confirmation | shadow score, no live action first |
| 4 | Trend-follow gate | EMA/ADX/ATR trend confirmation and volatility stop | shadow score, no live action first |
| 5 | PnL/reconciliation guard | separate account equity, realized PnL, fees, conversions, residual inventory | Gate P1 audit packet |

## First Implementation Target

Start with `T-026 Offline calibration runner`, not live strategy patching.

Why:
- the latest live evidence shows three negative fresh windows.
- copying a strategy into live execution would only restart the loop in a new form.
- we need deterministic bear/choppy fixtures that can prove whether a strategy improves expectancy and drawdown.

Minimum useful `T-026` output:
- fixture loader for feedback bundles or synthetic windows.
- strategy evaluator that can score current behavior vs candidate strategy rules.
- metrics: daily net, max drawdown, exposure, rejects, fees, trade count, skip pressure.
- report format that says `PASS`, `FAIL`, or `NEEDS_MORE_DATA`.
- generated fixture file for the current blocker: `docs/easy_process/fixtures/t026/bear_choppy_controlled_drawdown.json`.

## Promotion Rule

A reference-inspired strategy may affect live orders only when:
- it is implemented in this repo as clean-room code.
- or direct-copy permission is documented in `docs/REFERENCE_PERMISSION_NOTES.md`.
- deterministic replay/fixture validation passes.
- full CI passes.
- T-040 packet records the risk impact and rollback trigger.
- PM/BA explicitly promotes it from shadow/validation into bounded live influence.

## Current User Prompt Translation

When the operator says “use the reference bots and strategies,” execute this:

```text
Use T-040 validation mode.
Stop passive bundle waiting.
Adopt reference strategies clean-room.
Do not copy GPL or unclear-license code.
Start with T-026 offline calibration/replay for bear/choppy validation.
Only patch runtime strategy after deterministic proof.
```
