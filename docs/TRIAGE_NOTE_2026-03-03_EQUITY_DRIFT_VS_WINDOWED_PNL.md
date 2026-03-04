# Triage Note — 2026-03-03 — Wallet equity drift vs positive panel PnL

## Observed
- In `autobot-feedback-20260303-155005.tgz`:
  - wallet equity is `8003.99` USDC equivalent,
  - panel net PnL for tracked fills is `+12.70` USDC,
  - operator reports wallet trend still red/shrinking.

## Impact
- `P2` quality / operator trust:
  - bot may be adapting/trading correctly in the current window,
  - but UI PnL and wallet trend can look contradictory, reducing confidence in decision quality.

## Evidence
- `data/telemetry/last_run_summary.json` in bundle `autobot-feedback-20260303-155005.tgz`.
- Bot state/order history are intentionally rolling windows:
  - `apps/api/src/modules/bot/bot-engine.service.ts:2512`
  - `apps/api/src/modules/bot/bot-engine.service.ts:3318`
  - `apps/api/src/modules/bot/bot-engine.service.ts:3876`
  - `apps/api/src/modules/bot/bot-engine.service.ts:6724`
- UI label already states fills-based baseline:
  - `apps/ui/src/pages/DashboardPage.tsx:564`

## Reproduction
- Long-running bot with non-reset state and changing market regime.
- Compare wallet total trend vs latest fills-window PnL panel.

## Proposed fix
- Keep `T-034` active (no interrupt), and add a post-`T-034` observability slice:
  - show both **fills-window PnL** and **equity delta from run start** side by side,
  - explicitly mark rolling-window limitations in UI/API summary.

## Candidate ticket
- `T-032` (exit/profit-giveback controls) for strategy side,
- plus a new small observability follow-up ticket (proposed `T-039`) for PnL/equity clarity.

## PM/BA decision
- No interrupt of active `T-034`.
- Track as quality debt with high visibility in next planning pass.
