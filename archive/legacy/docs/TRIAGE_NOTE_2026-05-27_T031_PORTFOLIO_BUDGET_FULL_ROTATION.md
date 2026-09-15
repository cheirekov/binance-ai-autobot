# Triage Note — 2026-05-27 — T-031 portfolio budget full rotation

## Observed
- Fresh bundle `autobot-feedback-20260527-104314.tgz` ran deployed commit `9fc5bd9` and still triggered `pivot_required`.
- The dominant loop repeated across the latest two fresh bundles:
  - `Skip BTCUSDC: Risk budget blocked new exposure` rose `32 -> 60`.
  - latest share was `30.0%`.
- Latest runtime state:
  - `risk_state=CAUTION`
  - `daily_net_usdt=-11.26`
  - `max_drawdown_pct=3.66`
  - `open_positions=11`
  - `total_alloc_pct=5.30`
  - largest position `RENDERUSDC=4.69%`
- Skip details show `riskBudget.maxTotalExposurePct=5`, `maxNewExposureHome=0`, and reasons:
  - `portfolio-exposure-budget-full`
  - `no-new-exposure-budget`

## Impact
- `P1` stability.
- The May 26 BUY cap worked as intended by preventing new over-budget BUY sizing, but the runtime had no aggregate portfolio-budget trim path when total exposure exceeded the risk-budget envelope without any single symbol breaching the concentration cap.
- Candidate rotation kept retrying fresh BTC/ETH/SOL/SEI/XRP entries that the risk budget could only reject.

## Evidence bundle
- `autobot-feedback-20260527-104314.tgz`
- `data/telemetry/last_run_summary.json`
- `data/state.json`
- `data/telemetry/adaptive-shadow.tail.jsonl`

## Reproduction
- Seen in bundle `autobot-feedback-20260527-104314.tgz`.
- The latest state has aggregate managed exposure above the 5% risk-budget cap and no active open orders, while managed exits only trigger on stop-loss, take-profit, or per-symbol concentration.

## Proposed fix
- Keep `T-031` active and add an aggregate `portfolio-budget-rebalance-exit` path so reduce-only managed SELLs can trim total exposure back under the risk-budget envelope before fresh-symbol retries resume.

## Candidate ticket
- Existing ticket: `T-031`
- Linked support ticket remains: `T-032`

## PM/BA decision
- `interrupt active ticket`
- Owner: PM/BA + Codex
- Due window: before the next long run
- Decision: same-ticket mitigation under `T-031`; do not weaken the deterministic 5% risk-budget cap and do not promote `T-032` because the immediate blocker is strategy-budget rotation, not downside-control policy.
