# Autobot operational momentum v6 result

Historical report. See `AUDIT-2026-09-15.md` for corrected risk and interpretation:
the max evaluation fold wallet drawdown is 8.76%, and full-period maximum
percentage wallet drawdown is 13.27%. The runtime is not equivalent to V4/V5.
The later decision is not to select Momentum as a validated product strategy.

Protocol SHA-256: `9013dc4a11db90000222a5020269ba57fed4a52034e092890ff503b4a088d74b`

This check translates the frozen portfolio lead into the exact Freqtrade strategy
that can run prospectively. It uses 4h signals, 15m execution detail and a 0.15%
fee-and-slippage proxy on both entry and exit.

| Test | Trades | Return | Profit factor | Drawdown | Result |
|---|---:|---:|---:|---:|:---:|
| Quarterly evaluation folds, 2025–2026 | 35 | +2.76% | 1.17 | 7.11% max fold | FAIL |
| Continuous evaluation, 2025–2026 | 30 | +5.98% | — | 12.61% wallet | diagnostic |
| Continuous full interval, 2024–2026 | 50 | +23.86% | 1.93 | 12.61% wallet | diagnostic |

The frozen quarterly gate fails because only four of seven evaluation folds are
positive (57% versus 60% required) and the worst fold is −7.11% (limit −5%). The
continuous run is materially better because it does not force-close positions at
arbitrary quarter boundaries. That difference is disclosed rather than used to
rewrite the gate.

Freqtrade look-ahead analysis examined 47 usable signals from a 50-signal target:
zero biased entries, zero biased exits, and no biased indicators were detected.

The combined evidence permits only an isolated prospective dry-run shadow. It does
not justify replacing the controls, changing the gate, or enabling real funds.
