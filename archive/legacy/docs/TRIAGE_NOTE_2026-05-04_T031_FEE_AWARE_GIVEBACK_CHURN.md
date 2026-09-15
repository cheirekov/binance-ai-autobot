# Triage Note — 2026-05-04 — T-031 fee-aware giveback churn

## Observed
- Latest fresh bundle `autobot-feedback-20260504-084256.tgz` no longer shows the April 30 no-action dust sell-leg loop.
- Runtime did place and fill orders after the last patch, but the wallet fell to `6247.63 USDC` estimated equity.
- `risk_state=HALT`, `trigger=PROFIT_GIVEBACK`, `unwind_only=true`, and latest guard details show `dailyRealized=-231.26 USDC`, `peakDaily=29.71 USDC`, `giveback=260.98 USDC`, `managedExposure=0.0%`, `activeOrders=0`.
- The 24h run also shows high churn: `orders submitted=200`, `filled=136`, `canceled=64`, `buyNotional=31542.71`, `sellNotional=34425.02`, `feesHome=42.19`.

## Impact
- `P1` stability / downside-control quality.

## Evidence bundle
- `autobot-feedback-20260504-084256.tgz`
- Comparison bundle: `autobot-feedback-20260430-081918.tgz`

## Reproduction
- Seen in bundle `autobot-feedback-20260504-084256.tgz` after the April 30 actionability patch restored order activity.

## Proposed fix
- Make daily-loss/profit-giveback closed-PnL accounting fee-aware, lower the profit-giveback activation floor enough to preserve net wins, and keep severe near-halt daily-loss caution from reopening fresh symbols only because managed exposure is near-flat.

## Candidate ticket
- Active ticket `T-031`, with linked support behavior from `T-032`.

## PM/BA decision
- `interrupt active ticket`
- Owner: PM/BA + Codex
- Due window: before next long run
