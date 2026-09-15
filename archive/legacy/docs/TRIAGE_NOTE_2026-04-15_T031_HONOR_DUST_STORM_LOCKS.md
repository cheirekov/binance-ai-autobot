# Triage Note — 2026-04-15 — T-031

## Bundle
- `autobot-feedback-20260415-072942.tgz`

## Observed
- The April 14 family-level dust storm logic is live:
  - active `GRID_SELL_NOT_ACTIONABLE` locks now show `Skip storm (...) Grid sell leg not actionable yet`.
- The bot is not dead:
  - `daily-loss-halt-unwind` fired on `DOGEUSDC`.
- New blocker:
  - residual symbols can still be reselected even when their active cooldown reason is already a skip storm.

## Diagnosis
- The first-pass dust-cooldown bypass is now too permissive.
- It is useful for first recovery after a tiny residual cooldown, but once a storm lock exists it should be authoritative.
- This belongs in `T-031` because it is candidate-quality / rotation behavior.
- `T-032` remains linked support only because halt unwind is reachable and active.

## Decision
- Keep `T-031` active.
- Keep `T-032` as linked support only.

## Mitigation
- Keep the dust-cooldown bypass for non-storm locks.
- Do not bypass active `Skip storm (...) Grid sell leg not actionable yet` locks.
