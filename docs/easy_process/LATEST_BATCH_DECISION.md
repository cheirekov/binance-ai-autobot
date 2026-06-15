# LATEST_BATCH_DECISION

Last updated: 2026-06-15 06:56 UTC
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Gate P1 — bounded beta readiness`
- Why:
  - `observed`: the June 15 bundle stayed on `T-040` and auto-retro returned `validation_required`.
  - `observed`: no `P0/P1` runtime safety trigger appeared in the latest bundle.
  - `observed`: the latest fresh window returned `-23.60 USDT` daily net with `0` rejected orders, `0` restarts, no exchange/order-sync backoff, and low sizing reject pressure.
  - `observed`: the strategy-effectiveness report returned `NOT_BETA_READY`; rule-based strategy switching is visible but five-window net is `-52.15 USDT` and latest realized-after-fees is `-32.85 USDT`.
  - `observed`: `scripts/t026-fixture-comparison.js` ranks `grid_guard_v2` first for the refreshed fixture (`61`), ahead of `risk_governor_hysteresis` (`54`).
  - `observed`: `scripts/t026-grid-guard-proof.js` returns `GRID_GUARD_OFFLINE_PROOF_TARGET_READY` with five eligible windows and sell activity present.
  - `observed`: `scripts/t026-risk-governor-proof.js` returns `RISK_GOVERNOR_OFFLINE_PROOF_TARGET_READY` with five leading negative windows and two high-exposure windows.
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
- Latest bundle: `autobot-feedback-20260615-065149.tgz`
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
  - refresh `bear_choppy_controlled_drawdown` from the June 15 five-window sequence and use `FIXTURE_CANDIDATE_GRID_GUARD_V2`, `GRID_GUARD_OFFLINE_PROOF_TARGET_READY`, and `RISK_GOVERNOR_OFFLINE_PROOF_TARGET_READY` as the next offline proof targets.
