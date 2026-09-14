# Autobot research v2 result

Protocol SHA-256: `24acc489e0af1ffa31c9516af12d7b667075267cf8e83f726a41ae0bc9b3abb9`

V2 replaced one-hour signals with frozen four-hour regime-aware hypotheses and
used 15-minute detail candles for execution. Validation and holdout folds alone
determine the gate. Each side is charged 0.1%.

| Strategy | Evaluation trades | Evaluation return | Profit factor | Positive folds | All-fold return | Gate |
|---|---:|---:|---:|---:|---:|:---:|
| Research4hRegimeBreakout | 42 | -1.02% | 0.89 | 43% | -0.99% | FAIL |
| Research4hSlowTrend | 54 | -2.66% | 0.82 | 29% | +1.06% | FAIL |
| Research4hMeanReversion | 9 | +0.84% | 1.68 | 43% | +0.44% | FAIL |

Mean reversion is positive in the evaluation slice but has only nine trades and
fails both minimum observations and period consistency. It is not evidence of an
edge. Slow trend is positive only when development folds are included.

A supplemental continuous run, which does not force positions closed at each
quarter boundary, produced:

| Strategy | Trades | Return | Profit factor | Drawdown | Sharpe | p-value |
|---|---:|---:|---:|---:|---:|---:|
| Research4hRegimeBreakout | 87 | -2.03% | 0.89 | 7.40% | -0.09 | 0.63 |
| Research4hSlowTrend | 101 | +2.58% | 1.10 | 6.54% | 0.08 | 0.67 |
| Research4hMeanReversion | 21 | +0.69% | 1.23 | 0.99% | 0.04 | 0.70 |

The positive continuous results remain economically small and statistically
indistinguishable from noise. V2 therefore does not replace a runtime strategy.
Because V2 was designed after inspecting V1, these historical periods are not a
pristine final holdout; any future candidate requires prospective confirmation.
