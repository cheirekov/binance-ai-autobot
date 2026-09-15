# Triage Note — 2026-03-19 — Pivot from T-032 to T-034 after repeated BNBETH quote-starvation loop

## Observed
- PM/BA gate failed because the dominant loop reason repeated across the latest two bundles:
  - `"Skip BNBETH: Insufficient spendable ETH for grid BUY"` (`17 -> 17`).
- Automatic retrospective also triggered `pivot_required`:
  - repeated dominant loop,
  - negative `daily_net_usdt` across the latest three bundles,
  - no KPI trend improvement across the latest three bundles.

## Impact
- `P1` stability: the bot is still rotating through unfundable quote-asset families during adverse conditions.
- `P2` quality: this is no longer an exit-manager micro-loop issue; it is a quote-routing / funding-policy issue.

## Evidence bundle
- `autobot-feedback-20260319-082411.tgz`
- comparison bundle: `autobot-feedback-20260318-171743.tgz`
- automatic retrospective: `docs/RETROSPECTIVE_AUTO.md`

## Reproduction
- Seen in consecutive overnight bundles without state reset.
- The repeated dominant loop is an ETH-quote funding failure (`BNBETH`) rather than a symbol-local exit-manager issue.

## Proposed fix
- Pivot the active lane from `T-032` to `T-034` and treat repeated quote-family starvation as a routing/funding policy problem, not another exit-manager micro-mitigation.

## Candidate ticket
- `T-034`

## PM/BA decision
- `pivot active ticket`
- Owner: BE + Trader + PM/BA
- Due window: immediate next batch
