# PM/BA Changelog

This log is mandatory for every implementation patch batch.

## Entry template

```md
## YYYY-MM-DD HH:MM UTC — <ticket id/title>
- Scope:
- BA requirement mapping:
- PM milestone mapping:
- Technical changes:
- Risk slider impact:
- Validation evidence:
- Runtime test request:
- Follow-up:
```

## 2026-02-11 15:00 UTC — T-001 Exposure-aware candidate fallback
- Scope: prevent idle loop when top candidate is blocked by symbol exposure cap.
- BA requirement mapping: full automation should continue without manual intervention.
- PM milestone mapping: M1 stabilization of Spot testnet execution continuity.
- Technical changes:
  - Added exposure-aware candidate picker in bot engine.
  - Rotates to next eligible home-quote symbol before placement path.
  - Keeps telemetry candidate context aligned after candidate switch.
- Risk slider impact: none (selection fallback only; no risk formula change).
- Validation evidence: Docker CI passed (`lint`, `test`, `build`).
- Runtime test request: run 4-6h uninterrupted and verify decision stream is not stuck on a single repeated exposure skip.
- Follow-up: evaluate candidate rotation quality and add guard metrics to telemetry.

## 2026-02-11 15:20 UTC — T-002 High-risk aggressiveness tuning
- Scope: make risk=100 visibly more aggressive in execution pacing/sizing.
- BA requirement mapping: user requested stronger behavior in highest-risk mode and faster measurable results.
- PM milestone mapping: M1 stabilization with meaningful risk-slider effect.
- Technical changes:
  - `deriveAdvancedRiskProfile` now scales to fast/high throughput at high risk:
    - lower trade/entry cooldowns
    - higher notional cap
    - faster conversion/rebalance loops
    - higher consecutive entries per symbol.
  - Fee/edge gate now applies risk-adjusted minimum edge threshold.
  - Added shared-schema tests for high-risk output values.
- Risk slider impact: explicit behavior increase at high risk (more frequent entries, larger allowed notional, lower edge threshold).
- Validation evidence: Docker CI passed (`lint`, `test`, `build`).
- Runtime test request: run 4-6h uninterrupted, collect bundle, compare trades/hour and skip reasons vs previous run.
- Follow-up: combine with adaptive exits (T-003) to control bearish hold risk.

## 2026-02-11 15:35 UTC — T-008 Process hardening for team continuity
- Scope: enforce persistent PM/BA delivery discipline to prevent context-loss drift.
- BA requirement mapping: user requested hard rules and reliable ticket/process tracking.
- PM milestone mapping: delivery governance for M1 and future tracks.
- Technical changes:
  - Added `docs/TEAM_OPERATING_RULES.md` with mandatory workflow and definition of done.
  - Added `docs/DELIVERY_BOARD.md` as the ticket source of truth.
  - Added `docs/PM_BA_CHANGELOG.md` template + structured entries.
  - Linked governance docs from `README.md`, `docs/AI_CONTEXT.md`, `docs/ROADMAP.md`.
  - Updated `scripts/collect-feedback.sh` to include governance docs snapshot in feedback bundles.
- Risk slider impact: none (process/documentation + feedback packaging only).
- Validation evidence: Docker CI passed (`lint`, `test`, `build`).
- Runtime test request: generate next bundle and confirm `meta/docs/` contains board/changelog snapshots.
- Follow-up: enforce board/changelog updates before each feature batch (starting with T-003 adaptive exits).
