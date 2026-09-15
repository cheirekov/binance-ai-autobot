# Triage Note — 2026-05-21 — T-031 risk-budget defensive exit preempted

## Observed
- Latest fresh bundle `autobot-feedback-20260521-125108.tgz` deployed `git.commit=5ea35c4`, so the May 20 managed-bypass patch is active.
- EDEN is no longer dominant; the dominant blocker moved to risk-budget defense:
  - `Skip BTCUSDC: Risk budget blocked new exposure (59)`
  - `Skip ETHUSDC: Risk budget blocked new exposure (43)`
  - `Skip SOLUSDC: Risk budget paused GRID BUY leg (31)`
- Runtime ended `risk_state=NORMAL`, but `riskBudget` was `DEFENSIVE` because portfolio exposure was over budget.
- Wallet/equity deterioration continued:
  - `daily_net_usdt=-38.50`
  - `equity_usdt=5451.31`
  - `total_alloc_pct=21.32`
  - largest position `SOLUSDC=20.09%`
- Existing behavior placed repeated small SOL sell ladders but allowed new-candidate risk-budget skips to preempt managed-position exit evaluation on many ticks.

## Impact
- `P1` strategy/adaptation.
- The bot correctly blocks new exposure, but defensive mode does not prioritize reducing the oversized managed position before recording another new-candidate skip.

## Evidence bundle
- `autobot-feedback-20260521-125108.tgz`
- `docs/RETROSPECTIVE_AUTO.md` reports `patch_required` due no KPI trend improvement.

## Reproduction
- Runtime has `risk_state=NORMAL`, `riskBudget.lane=DEFENSIVE`, `reasons=["portfolio-exposure-budget-full","no-new-exposure-budget"]`, and one oversized managed home-quote position (`SOLUSDC` around 20%).
- Selected new candidates such as BTC/ETH are not open, so risk-budget new-exposure skip returns before managed exits can be evaluated.

## Proposed fix
- Keep `T-031` active.
- Evaluate managed exits before returning a new-candidate risk-budget skip.
- When portfolio exposure is over risk-budget, tighten effective single-symbol concentration cap so oversized positions can trigger concentration-rebalance exits instead of only tiny ladder sells.
- Keep fresh BUYs blocked while over budget.

## Candidate ticket
- Existing ticket: `T-031`

## PM/BA decision
- `same-ticket mitigation`
- Owner: PM/BA + Codex
- Due window: before next long run
