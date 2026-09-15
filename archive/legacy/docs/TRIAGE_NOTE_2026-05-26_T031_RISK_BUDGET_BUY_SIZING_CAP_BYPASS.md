# Triage Note — 2026-05-26 — T-031 risk-budget BUY sizing cap bypass

## Observed
- Latest fresh bundle `autobot-feedback-20260525-090223.tgz` runs `git.commit=642dcfd`.
- Runtime ended `risk_state=NORMAL`, `daily_net_usdt=-43.20`, `max_drawdown_pct=1.83`, `open_positions=13`, and `total_alloc_pct=2.63`.
- Top skip class remains risk-budget new-exposure blocking:
  - `Skip ETHUSDC: Risk budget blocked new exposure (30)`
  - `Skip BTCUSDC: Risk budget blocked new exposure (26)`
  - `Skip XRPUSDC: Risk budget blocked new exposure (13)`
- Decision details show `riskBudget.maxNewExposureHome` around `79.6` USDC when budget is open, but grid BUY orders are sized around `1038-1050` USDC:
  - `NILUSDC` BUY LIMIT notional `1039.90672`
  - `NEARUSDC` BUY LIMIT notional `1049.19`
- This means the risk-budget service gates whether a BUY may happen, but BUY sizing can still use the live notional cap and overshoot the deterministic budget.

## Impact
- `P1` strategy/adaptation.
- One allowed grid BUY can immediately refill exposure above the 5% risk-budget envelope, causing the next cycle to return `Risk budget blocked new exposure` instead of letting the budget operate as a deterministic sizing contract.

## Evidence bundle
- `autobot-feedback-20260525-090223.tgz`

## Reproduction
- Risk slider is `100`, wallet total is about `5306` USDC, and `deriveRiskBudgetDecision` returns `maxTotalExposurePct=5` with `maxNewExposureHome≈79.6`.
- Grid BUY sizing later validates quantities against quote spendable/live notional cap, producing roughly `1050` USDC orders.

## Proposed fix
- Keep `T-031` active.
- Convert `riskBudget.maxNewExposureHome` into candidate quote units and clamp market/grid BUY sizing with it.
- Preserve sell sizing and managed exits so reduce-only behavior is not weakened.
- Log the risk-budget BUY cap on placed BUY order details and emit explicit risk-budget sizing skips when exchange minimums exceed the cap.

## Candidate ticket
- Existing ticket: `T-031`

## PM/BA decision
- `same-ticket mitigation`
- Owner: PM/BA + Codex
- Due window: current batch before next runtime deploy
