# LATEST_BATCH_DECISION

Last updated: 2026-06-12 06:49 UTC
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Gate P1 — bounded beta readiness`
- Why:
  - `observed`: the June 12 bundle stayed on `T-040` and auto-retro returned `validation_required`.
  - `observed`: no `P0/P1` runtime safety trigger appeared in the latest bundle.
  - `observed`: the latest fresh window returned `-7.00 USDT` daily net with `0` rejected orders, `0` restarts, no exchange/order-sync backoff, and low sizing reject pressure.
  - `observed`: the strategy-effectiveness report returned `NOT_BETA_READY`; rule-based strategy switching is visible but five-window net is `-37.93 USDT` and latest realized-after-fees is `-21.25 USDT`.
  - `observed`: `scripts/t026-fixture-comparison.js` ranks `grid_guard_v2` first for the refreshed fixture (`54`), narrowly ahead of `risk_governor_hysteresis` (`52`).
  - `observed`: `scripts/t026-grid-guard-proof.js` returns `GRID_GUARD_OFFLINE_PROOF_TARGET_READY` with five eligible windows and sell activity present.
  - `observed`: the latest three fresh windows are negative, so T-040 requires deterministic validation before any beta promotion.
  - `inferred`: the post-patch runtime is safer but still not profitable enough; next work should prove a candidate family offline, not reopen T-031/T-032 from live churn.

## Chosen active ticket
- Current: `T-040` (Bounded beta readiness)
- Linked support: `none`
- Decision: `validation_required`
- Why:
  - `observed`: runtime strategy/support behavior exists and is preserved.
  - `inferred`: the next highest-leverage work is proving beta readiness and exact blockers, not adding another micro-mitigation.

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260612-063453.tgz`
- Evidence role: readiness input, not automatic runtime patch trigger.

## Allowed work mode
- Current batch: `VALIDATION_ONLY_WITH_FIXTURE_REFRESH`
- Runtime patch exception: `P0/P1 severity plus deterministic reproduction`.

## Batch decision
- Decision: `continue_same_ticket_with_validation_required`
- Next ticket candidate: `T-040`
- Review slice:
  - freeze `T-031/T-032`.
  - update process automation and memory.
  - create beta-readiness operating skill.
  - create T-040 beta-readiness packet, validation map, and AI orchestration guide.
  - add deterministic readiness classifier and validate gates.
  - add strategy-effectiveness reporting so `continue` cannot hide an unprofitable adaptation window.
  - refresh `bear_choppy_controlled_drawdown` from the June 12 five-window sequence and use `FIXTURE_CANDIDATE_GRID_GUARD_V2` plus `GRID_GUARD_OFFLINE_PROOF_TARGET_READY` as the next offline proof target, with `risk_governor_hysteresis` as the close fallback.
