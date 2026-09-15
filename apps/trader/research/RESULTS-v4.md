# Autobot portfolio research v4 result

Protocol SHA-256: `95017b5c1ec775ec1f8a56aed6c8a54f6aeedba488c024c84cfbb5eb25e72dca`

V4 freezes the V3 30-day time-series momentum signal and adds a 20% annual
volatility cap calculated from trailing 30-day covariance. It remains unlevered
and charges 0.15% per unit of turnover.

| Portfolio | Evaluation return | CAGR | Sharpe | Max drawdown | Positive folds | Gate |
|---|---:|---:|---:|---:|---:|:---:|
| TSMOM 30 equal (V3 benchmark) | +25.46% | +14.32% | 0.54 | 33.20% | 57% | benchmark |
| TSMOM 30 / volatility 20% | +15.45% | +8.85% | 0.59 | 15.57% | 57% | FAIL |
| TSMOM 30 / volatility 20% / BTC gate | +0.31% | +0.19% | 0.08 | 14.50% | 43% | FAIL |

Volatility scaling materially reduces drawdown while preserving positive return,
but the candidate is positive in only four of seven evaluation folds; the gate
requires at least five. The BTC-wide market gate removes too much of the useful
exposure and is rejected.

The next test keeps `Tsmom30Vol20` unchanged and evaluates a separate earlier
BTC/ETH/SOL-USDT period. The positive-fold gate is not weakened.
