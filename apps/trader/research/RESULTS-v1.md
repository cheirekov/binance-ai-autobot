# Autobot research v1 result

Protocol SHA-256: `ab96294c9380f45a335ece5edbf66653dd45fe9c6bf2c1c2332fc493809b6756`

Data: Binance spot hourly candles, BTC/USDC, ETH/USDC and SOL/USDC. The
screening spans 2024-01-01 through 2026-09-12. Validation and holdout folds
(2025-01-01 onward) alone determine the gate. Each entry and exit is charged
0.1%; wallet 1000 USDC, stake 100 USDC, maximum three positions.

| Strategy | Evaluation trades | Evaluation return | Profit factor | Positive folds | All-history return | Gate |
|---|---:|---:|---:|---:|---:|:---:|
| AutobotBaseline | 333 | -3.74% | 0.89 | 43% | -9.53% | FAIL |
| ResearchTrendPullback | 280 | -8.90% | 0.66 | 14% | -10.44% | FAIL |
| ResearchMeanReversion | 87 | -1.05% | 0.84 | 57% | -2.97% | FAIL |
| ResearchVolatilityBreakout | 201 | -7.16% | 0.73 | 29% | -8.95% | FAIL |

No candidate has a validated trading edge. None may replace the remote baseline
or authorize real-money trading. Mean reversion loses least, but also fails the
minimum trade count, profitability, profit-factor and positive-fold gates.

Freqtrade lookahead-analysis sampled 50 signals for every candidate: no biased
entry signal, exit signal or indicator was detected. This supports temporal
correctness of the implementation; it does not improve the failed economics.

Pair and exit diagnostics show that isolated profitable slices move between
assets and periods. Selecting those slices after inspection would be cherry-picking,
not a valid strategy. The next protocol must define its selection and regime logic
before it sees its evaluation data, then use a new prospective period for final
confirmation.

This is retrospective evidence, not a forecast. Hourly candles cannot reproduce
every intrabar path, spread, slippage, latency or actual fill. Fold boundaries
close positions and reset the wallet. Full generated JSON, trade archives and
market data remain under the ignored `data/trader-v2/research/` runtime directory.
