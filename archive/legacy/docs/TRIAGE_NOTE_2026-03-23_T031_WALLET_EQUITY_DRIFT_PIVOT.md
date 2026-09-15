# Triage Note — 2026-03-23 — Pivot from T-031 to T-032 after continued wallet/equity weakness

## Observed
- Recent `T-031` slices improved candidate hygiene, but wallet/equity remains materially weak across the multi-day window.
- Latest evidence:
  - `autobot-feedback-20260322-155534.tgz` — equity `7112.42`, daily `-163.90`, end-state `HALT`
  - `autobot-feedback-20260323-074326.tgz` — equity `7206.50`, daily `+17.11`, but wallet is still roughly `~7143` in live UI

## Impact
- `P1` stability / capital protection: execution hygiene is improving, but the program-level outcome is still not acceptable.

## Evidence bundle
- `autobot-feedback-20260322-155534.tgz`
- `autobot-feedback-20260323-074326.tgz`
- `docs/PROGRAM_RETRO_2026-03-23.md`

## Proposed fix
- Freeze `T-031` and pivot the active lane to `T-032` (Exit manager v2) so work targets profit giveback, earlier de-risking, and downside control.

## Candidate ticket
- `T-032`

## PM/BA decision
- `pivot active ticket`
- Owner: BE + Trader + PM/BA
- Due window: immediate next batch
