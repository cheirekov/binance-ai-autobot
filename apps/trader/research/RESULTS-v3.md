# Autobot portfolio research v3 result

Protocol SHA-256: `8759f91e13de523049b557532dc9bce29be2e2dd5d430fce4b603ffeb7a855d7`

V3 tests weekly, unlevered, long/cash time-series momentum. It charges 0.15%
per unit of turnover: 0.10% regular Binance spot fee plus a conservative 0.05%
slippage allowance. The simulator drifts holdings between rebalances instead of
silently assuming free daily rebalancing.

| Portfolio | Evaluation return | CAGR | Sharpe | Max drawdown | Positive folds | Gate |
|---|---:|---:|---:|---:|---:|:---:|
| Equal-weight buy-and-hold | -28.77% | -18.14% | -0.07 | 62.43% | 43% | benchmark |
| TSMOM 30-day equal | +25.46% | +14.32% | 0.54 | 33.20% | 57% | FAIL |
| TSMOM 90-day equal | -21.75% | -13.47% | -0.23 | 43.88% | 14% | FAIL |
| TSMOM dual 30/90 volatility-weighted | -9.12% | -5.49% | -0.06 | 25.11% | 14% | FAIL |

The 30-day signal is economically interesting and survives the conservative
cost assumption, but it fails the predeclared 20% drawdown ceiling and the 60%
positive-fold requirement. It is therefore a research lead, not a deployable
edge. The next frozen ablation may add volatility targeting; the gate itself must
not be weakened to make this result pass.

V3 was designed after V1/V2 and has no pristine historical holdout. Even a later
retrospective pass requires prospective dry-run confirmation before runtime use.
