# Session Brief

Last updated: 2026-03-29 15:08 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Goal (single sentence): continue `T-031` with a bounded March 29 slice so managed symbols in `CAUTION`/`DEFENSIVE` are no longer blocked by fee-edge gating before downside-control handling can run.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - preserve the earlier parked-ladder / no-inventory fee-edge routing filters.
  - allow defensive / caution-unwind handling to bypass fee-edge on already-open managed symbols.
  - preserve existing `T-032` downside controls and `T-034` funding stability.
- Out of scope:
  - quote-routing redesign (`T-034` is closed unless runtime regresses),
  - exit-manager rewrite in this batch,
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: fresh March 29 afternoon evidence shows the engine is still returning early on fee-edge checks for already-open managed symbols while `risk_state=CAUTION`. Bypassing fee-edge only for defensive/loss-guard handling should let downside-control logic run without reopening fresh-entry risk.
- Target KPI delta:
  - reduce repeated `BTCUSDC: Fee/edge filter (...)` loops while `risk_state=CAUTION`.
  - let caution/halt unwind handling reach managed symbols before fee-edge returns.
  - keep downside-control runtime intact while improving entry selection quality.
- Stop/rollback condition:
  - if the strategy slice weakens bear-side protection or reopens quote-funding regressions, freeze `T-031` and revert to the last `T-032`/`T-034`-stable baseline.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - defensive / caution-unwind handling can bypass fee-edge for already-open managed symbols.
    - fresh candidates still remain fee-edge gated.
  - active development lane remains `T-031`; `T-032` stays support/runtime only.
- Runtime evidence in decisions/logs:
  - latest bundle runs `git.commit=6a151bd`.
  - latest fresh bundle is dominated by `CAUTION` + repeated `BTCUSDC: Fee/edge filter (...)` on managed inventory.
  - the next fresh bundle should show lower managed-symbol fee-edge repetition during `CAUTION` and evidence that caution/halt handling is still reachable.
- Risk slider impact:
  - risk slider modulates the suppression threshold for dead-end retries.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - deploy the current `T-031` slices and collect one fresh bundle before any further strategy reprioritization

## 3) Deployment handoff

- Commit hash: `6a151bd`
- Deploy target: remote Binance Spot testnet runtime
- Required config changes: none
- Operator checklist:
  - reset state needed? (`no`)
  - keep config.json? (`yes`)
  - start command:
    - Compose v2: `docker compose up -d --build --force-recreate`
    - Compose v1: `docker-compose up -d --build --force-recreate`
  - collect bundle:
    - `AUTOBOT_COMPOSE_CMD=docker-compose ./scripts/collect-feedback.sh`
    - cycle label is auto-inferred (manual override optional via `AUTOBOT_RUN_PHASE=...`)
  - local ingest:
    - preferred: `./scripts/pull-and-ingest-feedback.sh <remote-host> [remote-repo-dir]`
    - fallback: `./scripts/ingest-feedback.sh autobot-feedback-YYYYMMDD-HHMMSS.tgz`
  - canonical procedure reference:
    - `docs/RUN_LOGGING_P0.md`

## 4) End-of-batch result (fill after run)

- Run context:
  - window (local): `EVENING (collection) / EVENING (run end)`
  - timezone: `Europe/Sofia`
  - bundle interval (hours): `6.861`
  - runtime uptime (hours): `961.057`
  - run end: `Sun Mar 29 2026 18:07:42 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `NIGHT_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (77))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=103, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=48.5%)
  - sizing reject pressure: `low` (sizingRejectSkips=2, decisions=200, ratio=1.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_required`
- Next ticket candidate: `T-031` (continue active lane unless PM/BA reprioritizes)
- Required action: `same-ticket mitigation required before next long run`
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260329-150750.tgz`
  - auto-updated at: `2026-03-29T15:08:18.424Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_required
Required action: same-ticket mitigation required before next long run
Latest bundle: autobot-feedback-20260329-150750.tgz
Fresh runtime evidence: yes (fresh)
Goal: reduce profit giveback and improve downside control while preserving T-034 funding stability.
In scope: fee-edge bypass for already-open managed symbols during defensive / loss-guard handling.
Out of scope: quote-routing redesign, fresh-entry fee-floor loosening, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
