# Triage Note — 2026-05-22 — Risk-budget repeated-loop gate false-positive

## Observed
- Latest bundle `autobot-feedback-20260522-114754.tgz` initially failed the PM/BA end gate because the dominant skip reason repeated: `Skip BTCUSDC: Risk budget blocked new exposure`.
- The count materially improved from `59` to `14`, with latest share `7.0%` of the 200-decision window.
- Runtime evidence was fresh and active: 12 trade decisions in the state snapshot, including grid BUY orders plus take-profit, stop-loss, and concentration-rebalance exits.
- KPIs improved: `daily_net_usdt=+92.77`, `max_drawdown_pct=0.73`, and `total_alloc_pct=3.19`.
- The exchange/order-sync WARN was also a false-positive because the old regex matched the fee threshold text `0.559%` as a `5xx` code.

## Impact
- `P1` stability/process: the gate demanded an unnecessary same-ticket patch even though the latest runtime showed recovery and active adaptation.

## Evidence bundle
- `autobot-feedback-20260522-114754.tgz`
- Previous comparison bundle: `autobot-feedback-20260521-125108.tgz`

## Reproduction
- Run `./scripts/auto-retro.sh autobot-feedback-20260522-114754.tgz` with the old gate logic.
- Run `./scripts/pmba-gate.sh end`; the old logic fails on same top reason despite a `76.3%` skip-count reduction.

## Proposed fix
- Classify repeated dominant loops as failures only when the loop is still material and not materially improving; require contextual exchange/backoff evidence instead of matching bare `5xx`-looking numbers.

## Candidate ticket
- Existing ticket: `T-031`

## PM/BA decision
- `queue after active ticket`
- Owner: Codex
- Due window: current bundle-response patch
