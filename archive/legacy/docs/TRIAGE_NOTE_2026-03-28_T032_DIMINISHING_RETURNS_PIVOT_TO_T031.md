# Triage Note — 2026-03-28 — Freeze T-032 and pivot active development to T-031

## Observed
- The latest fresh bundle `autobot-feedback-20260328-202730.tgz` ends `NORMAL` with `daily_net_usdt=+19.17`, `max_drawdown_pct=0.97`, and `sizingRejectPressure=low`.
- The dominant repeats are now:
  - `Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.052%)`
  - `Skip SOLUSDC: Fee/edge filter (net 0.044% < 0.052%)`
  - parked-ladder waiting on `ETHUSDC`, `TAOUSDC`, `XRPUSDC`, `DOGEUSDC`
- Current runtime code audit shows:
  - `buildRegimeSnapshot(...)` still uses simpler fixed RSI/ADX thresholds
  - fee-edge gating is still regime-agnostic even when trend evidence is strong

## Impact
- `P2 quality` / `P2 strategy leverage`
- The active lane is spending too much time proving downside-control behavior while the stronger current opportunity is strategy-quality improvement.

## Evidence bundle
- `autobot-feedback-20260328-202730.tgz`
- `docs/STRATEGY_COVERAGE.md`
- `apps/api/src/modules/bot/bot-engine.service.ts`

## Proposed fix
- Freeze `T-032` as a support lane.
- Switch the active ticket to `T-031`.
- Implement the first bounded `T-031` slice:
  - risk-linked regime thresholds
  - regime-aware fee floor

## Candidate ticket
- `T-031`

## PM/BA decision
- `pivot active ticket`
- Owner: BE + Trader + PM/BA
- Due window: immediate next batch
