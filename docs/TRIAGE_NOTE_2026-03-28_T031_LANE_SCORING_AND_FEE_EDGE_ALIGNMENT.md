# Triage Note — 2026-03-28 — T-031 lane scoring still favored grid-style candidates under trend regimes

## Observed
- Latest fresh bundle `autobot-feedback-20260328-202730.tgz` is no longer dominated by downside-control failures.
- The dominant current repeats are:
  - `Fee/edge filter` on `BTCUSDC` / `SOLUSDC`
  - parked-ladder waiting on `ETHUSDC`, `TAOUSDC`, `XRPUSDC`, `DOGEUSDC`
- Runtime code audit showed that in `SPOT_GRID` mode the selector still scored candidates mainly through the `grid` lens, even when the same candidate's resolved execution lane was `MARKET` or `DEFENSIVE`.

## Impact
- `P2 quality` / `P2 strategy leverage`
- The bot could recognize regime/trend conditions, but still rank candidates as if grid behavior were primary.

## Evidence bundle
- `autobot-feedback-20260328-202730.tgz`
- `apps/api/src/modules/bot/bot-engine.service.ts`

## Proposed fix
- Keep `T-031` active.
- Score `SPOT_GRID` candidates by their resolved execution lane (`MARKET` / `GRID` / `DEFENSIVE`) instead of using a mostly grid-weighted score for all of them.
- Combine that with the already-added regime-aware fee floor.

## Candidate ticket
- `T-031`

## PM/BA decision
- `patch_same_ticket`
- Owner: BE + Trader + PM/BA
- Due window: immediate current batch
