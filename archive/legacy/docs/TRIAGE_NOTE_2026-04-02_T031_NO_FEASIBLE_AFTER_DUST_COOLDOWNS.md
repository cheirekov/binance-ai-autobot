# Triage Note — 2026-04-02 — T-031 no-feasible deadlock after dust sell cooldowns

- Observed:
  - fresh bundle `autobot-feedback-20260402-113357.tgz` ends `risk_state=CAUTION`, `daily_net_usdt=-158.18`, `sizingRejectPressure=low`.
  - dominant repeat is `Skip: No feasible candidates after policy/exposure filters (21)`.
  - bundle state shows `quoteFree≈6959 USDC`, `activeOrders=0`, and twelve symbol cooldown locks in category `GRID_SELL_NOT_ACTIONABLE` on home-quote symbols.
  - rejection samples inside the latest `No feasible candidates` decision are mostly non-home quotes exhausted after reserve, while the remaining home-quote family is locked out by sell-not-actionable cooldown.
- Impact:
  - `P2 quality`
- Repro / Evidence bundle:
  - `autobot-feedback-20260402-081314.tgz`
  - `autobot-feedback-20260402-113357.tgz`
- Proposed fix:
  - keep `T-031` active and allow home-quote dust residuals with no active orders to bypass `GRID_SELL_NOT_ACTIONABLE` at selection time so the engine can re-enter feasible home-quote candidates instead of falling straight into `No feasible candidates`.
- Candidate ticket:
  - `T-031`
