# Ticket Switch Retrospective

Last updated: 2026-03-23 08:25 UTC
Previous ticket: `T-031`
Current ticket: `T-032`
Switch decision: `freeze previous / activate next lane`
Decision source: `manual PM/BA decision informed by program-level retro + runtime evidence`

## Why `T-031` was frozen

- Runtime evidence showed `T-031` improved candidate hygiene, but not enough program-level outcome.
- Wallet/equity remained materially weak across the multi-day window.
- Recent bundles still showed excessive giveback, large allocation swings, and late downside control.

## Evidence used for the switch

- `autobot-feedback-20260322-155534.tgz`
  - equity `7112.42`
  - dailyNet `-163.90`
  - `risk_state=HALT`
- `autobot-feedback-20260323-074326.tgz`
  - equity `7206.50`
  - dailyNet `+17.11`
  - still high allocation and guard/ladder dominated behavior
- `docs/PROGRAM_RETRO_2026-03-23.md`
  - program-level conclusion: execution hygiene improved, but wallet/equity protection did not improve enough

## What `T-031` fixed and what it did not fix

### Improved but not enough to stay active
- repeated fee-edge churn was reduced
- some non-actionable candidate reselection was reduced
- `T-034` funding stability was preserved

### Not fixed by `T-031` and now higher priority
- profit giveback remains too large
- downside control is still late
- wallet/equity remains materially down
- concentration / near-full allocation states remain too risky

## Why `T-032` is the correct next lane

- The program-level failure is now equity protection, not quote funding or candidate hygiene.
- `T-032` directly targets:
  - profit giveback reduction,
  - earlier de-risking,
  - stronger downside exits,
  - lower time spent in adverse fully-allocated states.
- Continuing to patch `T-031` first would be lower-leverage work.

## Hard process correction

- The previous switch was only partially documented:
  - board/session/changelog were updated,
  - but there was no standalone ticket-switch retrospective artifact.
- New rule:
  - no ticket switch is considered complete until this file is updated and `pmba-gate.sh start` passes against it.

## Next expected outcome

- `T-032` batches should reduce:
  - profit giveback,
  - drawdown persistence,
  - late exits under adverse market conditions,
  while preserving `T-034` funding stability and the `T-031` candidate-hygiene gains.
