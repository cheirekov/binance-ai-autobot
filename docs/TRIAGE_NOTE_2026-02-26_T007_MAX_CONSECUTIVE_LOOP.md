# Triage Note — 2026-02-26 — Max consecutive entry loop

## Observed
- Repeated dominant skip in consecutive bundles:
  - `Skip ETHUSDC: Max consecutive entries reached (8)` (10 -> 11)
- Bot appeared mostly idle with sparse decisions during morning window.

## Impact
- `P1` stability

## Evidence bundle
- `autobot-feedback-20260226-083253.tgz`
- Previous: `autobot-feedback-20260226-065205.tgz`
- `pmba-gate.sh end` failed due repeated dominant loop reason.

## Reproduction
- Seen in bundle histories and UI decisions stream:
  - repeated `Max consecutive entries reached (8)` for `ETHUSDC`/`DOTUSDC`.

## Proposed fix
- Add symbol cooldown when max-consecutive entry guard triggers, and include this reason in skip-storm detection so cooldown escalates on repetition.

## Candidate ticket
- `T-007` (stability mitigation to unblock runtime evidence collection for PnL lane)

## PM/BA decision
- `interrupt active ticket`
- Owner: BE
- Due window: immediate morning patch (same session)
