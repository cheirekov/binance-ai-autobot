# Autobot portfolio research v5 external result

This is the weekly rebalanced portfolio model, not the Freqtrade runtime.
See `AUDIT-2026-09-15.md`; the numerical result survives accounting corrections,
but cannot be attributed to the deployed strategy.

Protocol SHA-256: `3a3a284f388c64bdc42d0bca6aec64d51d48e81db5febbfba33d991bdefb1d09`

V5 keeps the V4 candidate unchanged and checks a separate, earlier
BTC/ETH/SOL-USDT interval from January 2021 through November 2023. It remains
long/cash, unlevered, weekly rebalanced, and charges 0.15% per unit of turnover.

| Portfolio | Evaluation return | CAGR | Sharpe | Max drawdown | Positive folds | Rebalances | Gate |
|---|---:|---:|---:|---:|---:|---:|:---:|
| TSMOM 30 equal (benchmark) | +1876.54% | +178.52% | 1.90 | 49.67% | 75% | — | benchmark |
| TSMOM 30 / volatility 20% | +146.20% | +36.24% | 1.76 | 17.18% | 67% | 115 | PASS |

The frozen volatility-scaled candidate passes every external-history screening
check, including eight positive quarters out of twelve. This is useful evidence
that the signal is not unique to the recent USDC sample. It is still a
retrospective proxy using USDT prices and does not authorize real-money trading.

The next check is the conservative Freqtrade translation on the recent USDC
period, followed by look-ahead analysis and a prospective dry-run challenger.
