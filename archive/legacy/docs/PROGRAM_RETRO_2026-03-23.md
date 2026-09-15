# Program Retrospective — 2026-03-23

## Scope

Review the recent multi-day execution window as a program, not as isolated ticket slices.

Focus:
- wallet/equity drift,
- drawdown behavior,
- what recent tickets improved,
- what they did not improve,
- what must change next.

## Executive conclusion

- The bot is not yet performing acceptably at the program level.
- Recent tickets improved execution hygiene, but they did not restore acceptable equity behavior.
- Wallet/equity remains the primary KPI and it is still weak.
- The next active lane must focus on equity protection / downside control, not more candidate-hygiene micro-optimizations.

## Evidence window

- `autobot-feedback-20260318-171743.tgz`
  - equity `7404.45`
  - daily `-269.75`
  - maxDD `5.46%`
- `autobot-feedback-20260319-124933.tgz`
  - equity `7353.29`
  - daily `-285.84`
  - maxDD `6.12%`
- `autobot-feedback-20260321-165459.tgz`
  - equity `7283.88`
  - daily `+18.54`
  - maxDD `0.93%`
- `autobot-feedback-20260322-063344.tgz`
  - equity `7165.32`
  - daily `-138.87`
  - maxDD `2.68%`
- `autobot-feedback-20260322-155534.tgz`
  - equity `7112.42`
  - daily `-163.90`
  - maxDD `3.00%`
  - end state `HALT`
- `autobot-feedback-20260323-074326.tgz`
  - equity `7206.50`
  - daily `+17.11`
  - maxDD `3.46%`

User-observed live UI after the latest bundle:
- wallet est. `~7143 USDC`

## What recent tickets improved

### `T-034`
- Reduced quote-funding / quote-routing starvation.
- Non-home reserve handling and spendable-quote gating stopped being the dominant blocker.

### `T-031`
- Reduced some repeated fee-edge churn.
- Reduced some non-actionable candidate reselection.
- Preserved `T-034` funding stability.

## What recent tickets did not improve enough

- Wallet/equity protection
- Profit giveback control
- Adverse high-allocation persistence
- Late de-risking under deteriorating market conditions

## Professional interpretation

- `T-031` is not wrong, but it is no longer the highest-leverage lane.
- Continuing to spend more short cycles on candidate hygiene alone would be the wrong optimization target.
- The correct next move is to shift active work to exit manager / downside control.

## PM/BA decision

- Freeze `T-031` after the current slice.
- Activate `T-032` as the next lane.

## Why `T-032`

- It directly targets:
  - profit giveback reduction,
  - earlier de-risking,
  - better downside exits,
  - stronger stable-coin reversion under adverse conditions.

## Hard rules going forward

- Wallet/equity is the primary KPI. Bundle-local positive daily PnL is secondary.
- No ticket may remain active indefinitely if it improves churn but not outcomes.
- After 3 bundles on the same lane without acceptable equity behavior improvement, PM/BA must:
  - freeze the lane,
  - write a program-level retro,
  - reprioritize the board.
