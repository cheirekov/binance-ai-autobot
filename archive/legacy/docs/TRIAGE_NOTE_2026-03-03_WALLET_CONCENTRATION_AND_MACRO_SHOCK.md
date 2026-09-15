# Triage Note — 2026-03-03 — Wallet concentration risk + macro-shock adaptation gap

## Observed
- High-risk runtime (`risk=100`) accumulates large non-home holdings that remain open for long periods.
- Operator reports concern that positions in the `100-1000+` USDC range may stay unrotated while wallet equity trends down.
- Macro-shock context (geopolitical events) can abruptly change market regime, but current execution is still mostly technical/rule-driven.

## Impact
- `P1` strategy stability:
  - concentrated bags can amplify drawdown during adverse regime shifts,
  - adaptation may look slow when there is no explicit shock-reactive lane.

## Evidence
- Recent bundles:
  - `autobot-feedback-20260303-071331.tgz`
  - `autobot-feedback-20260303-155005.tgz`
- Open exposure remains concentrated in a few symbols while skip/trade loops continue in normal risk state.

## Reproduction
- Keep bot running on testnet with high risk over long windows and non-reset state.
- Observe persistent open positions + equity drift under shifting market conditions.

## Proposed fix
- Keep active lane `T-034` (no interrupt), but enforce these next steps:
  1. `T-034`: add multi-quote routing to reduce single-quote bottleneck and improve opportunity coverage.
  2. `T-032`: add stronger adaptive exit/de-risk policy (position aging + adverse-move unwind ladder).
  3. `T-035/T-037`: add event/news shock signal lane (shadow first, then gated execution).
  4. Add concentration guard metric to telemetry: `% equity in top-1/top-3 symbols`.

## Candidate ticket mapping
- `T-034` (active): execution opportunity expansion.
- `T-032` (next): loss control/adaptive exits.
- `T-035`, `T-037` (later): news/event-aware adaptation.

## PM/BA decision
- No interruption of `T-034`.
- Treat as priority acceptance criteria for `T-032` and strategy-promotion planning.
