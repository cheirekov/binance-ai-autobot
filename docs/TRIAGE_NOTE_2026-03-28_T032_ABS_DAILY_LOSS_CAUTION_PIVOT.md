# Triage Note — 2026-03-28 — Pivot review after ABS_DAILY_LOSS caution global new-symbol pause

## Observed
- Fresh bundle `autobot-feedback-20260328-084345.tgz` triggered automatic `pivot_required`.
- The deployed runtime now runs `git.commit=5927bd9`, so the previous defensive BUY-limit cancel patch did deploy.
- The prior cancel/recreate churn signature is gone from the latest raw bundle.
- The latest review window instead shows:
  - `risk_state = CAUTION`
  - `trigger=ABS_DAILY_LOSS`
  - `open_positions = 4`
  - `total_alloc_pct = 3.40`
  - `decisions = 200`, `trades = 0`, `activeOrders = 0`
  - dominant repeated skip: `Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered)` (`100`)
- Managed-symbol progression in the same window is mostly `BTCUSDC` fee/edge rejection under `DEFENSIVE` / `RANGE`, not another exit-manager cancel loop.

## Impact
- `P1` stability: the latest review window is fully boxed into skip-only behavior despite low remaining exposure and high free quote.
- `P2` quality: the previous `T-032` micro-hypothesis is now closed; the remaining question is whether this is intended daily-loss policy or a new follow-up ticket.

## Evidence bundle
- `autobot-feedback-20260328-084345.tgz`
- comparison bundle: `autobot-feedback-20260327-155408.tgz`
- automatic retrospective: `docs/RETROSPECTIVE_AUTO.md`

## Reproduction
- Seen in consecutive fresh bundles with the same aggregate top skip.
- Latest raw bundle no longer reproduces the previous defensive cancel/recreate bug.
- Latest raw bundle does reproduce a global new-symbol pause under `ABS_DAILY_LOSS` caution while managed exposure is already low.

## Proposed fix
- Do not apply another blind `T-032` runtime patch from this bundle alone.
- Pivot to `PM/BA-TRIAGE` and decide whether a new follow-up / hardening ticket is needed for daily-loss caution re-entry policy versus treating the current behavior as intended healthy idle under loss protection.

## Candidate ticket
- `PM/BA-TRIAGE`

## PM/BA decision
- `pivot active ticket`
- Owner: PM/BA + Trader + BE
- Due window: before the next long run
