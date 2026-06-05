# Session Brief

Last updated: 2026-06-05 07:55 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch. This brief is intentionally short; long historical preservation details live in `docs/PM_BA_CHANGELOG.md` and `docs/STRATEGY_COVERAGE.md`.

## 1) Batch Contract

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-040` (Bounded beta readiness)
- Linked support ticket: `none`
- Goal (single sentence): stop the T-031/T-032 live-evidence patch loop and move the project to a bounded beta-readiness gate.
- In scope:
  - freeze `T-031` and `T-032` as preserved runtime behavior.
  - make `T-040` the single active lane for Gate P1 beta readiness.
  - change process memory so `patch_required` from live Binance evidence does not automatically create another same-ticket runtime patch.
  - require P0/P1 severity plus deterministic reproduction before any new runtime behavior patch.
  - create/update the project operating skill for future agents.
  - keep existing safety, risk-budget, and downside-control code intact.
- Out of scope:
  - another regime/risk-budget/exit-manager micro-patch from the latest bundle.
  - weakening hard risk guards, exposure caps, or sell/unwind reachability.
  - AI/news live action-driving.
  - production claims without a beta-readiness packet.
- Hypothesis: the project is not blocked by one missing trading rule; it is blocked by a process loop that treats non-stationary live-market evidence as mandatory T-031/T-032 patch work.
- Target KPI delta:
  - next session starts from `T-040` and beta readiness, not `T-031/T-032`.
  - auto-retro on production-readiness tickets returns validation/readiness action for live-market churn unless P0/P1 severity is proven.
  - PM/BA gate no longer fails `T-040` solely because a repeated skip reason appears in live bundles.
  - deterministic validation gaps are explicit backlog items.
- Stop/rollback condition:
  - if a fresh bundle shows uncontrolled exposure, repeated exchange order rejects, inability to sell/unwind, broken PnL accounting, or crash/restart instability, open a P0/P1 hotfix and pause beta promotion.

## 2) Definition Of Done

- Process behavior:
  - `docs/DELIVERY_BOARD.md` has exactly one `IN_PROGRESS` ticket: `T-040`.
  - `docs/TICKET_SWITCH_RETRO.md` records the T-031/T-032 freeze and beta-readiness pivot.
  - `docs/easy_process/*` current-memory files point to beta readiness instead of May T-031 patch work.
  - `docs/easy_process/T040_BETA_READINESS_PACKET.md` and `docs/easy_process/T040_VALIDATION_MAP.md` exist and are referenced by the production workflow.
  - `docs/easy_process/AI_ORCHESTRATION.md` defines compact skill/subagent/MCP use.
  - `scripts/auto-retro.sh`, `scripts/update-session-brief.sh`, and `scripts/pmba-gate.sh` distinguish production-readiness validation from runtime patch pressure.
  - `scripts/validate-active-ticket.sh` has targeted `T-040` validation.
  - project skill exists for future Codex sessions.
- Runtime posture:
  - T-031/T-032 behavior remains preserved.
  - new runtime patches are allowed only for P0/P1 safety/execution blockers or deterministic production-gate failures.
- Validation commands:
  - `bash -n scripts/auto-retro.sh scripts/update-session-brief.sh scripts/pmba-gate.sh`
  - `node --check scripts/feedback-evidence.js`
  - `node --check scripts/t040-readiness-check.js`
  - `node --check scripts/t026-calibration-runner.js`
  - `node scripts/t040-readiness-check.js`
  - `node scripts/t026-calibration-runner.js`
  - `./scripts/auto-retro.sh autobot-feedback-20260605-075150.tgz`
  - `./scripts/update-session-brief.sh autobot-feedback-20260605-075150.tgz`
  - `./scripts/validate-active-ticket.sh`
  - `./scripts/pmba-gate.sh start`
  - `./scripts/pmba-gate.sh end`
  - `git diff --check`
- Runtime validation plan:
  - after the process pivot, collect the next bundle as beta-readiness evidence, not as automatic T-031/T-032 patch input.

## 3) Deployment Handoff

- Commit hash: `9322e44`
- Deploy target: process/docs/scripts only; no bot redeploy required unless code changes are later added.
- Required config changes: none
- Operator checklist:
  - do not reset state for this process change.
  - use next bundle to fill the beta-readiness packet.
  - do not request another T-031/T-032 patch unless there is P0/P1 severity or deterministic reproduction.

## 4) End-of-batch result (fill after run)

- Run context:
  - window (local): `MORNING (collection) / MORNING (run end)`
  - timezone: `Europe/Sofia`
  - bundle interval (hours): `23.467`
  - runtime uptime (hours): `1313.81`
  - run end: `Fri Jun 05 2026 10:50:58 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `MORNING_REVIEW`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip: No feasible candidates after policy/exposure filters (76))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=37, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=81.5%)
  - sizing reject pressure: `low` (sizingRejectSkips=6, decisions=200, ratio=3.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `continue`
- Next ticket candidate: `T-040` (continue active lane unless PM/BA reprioritizes)
- Required action: `continue active ticket`
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260605-075150.tgz`
  - auto-updated at: `2026-06-05T07:55:39.587Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-040
Decision: continue
Required action: continue active ticket
Latest bundle: autobot-feedback-20260605-075150.tgz
Fresh runtime evidence: yes (fresh)
Goal: move the bot toward bounded beta/production readiness, not another T-031/T-032 micro-patch.
Patch policy: runtime patches require P0/P1 safety severity plus deterministic reproduction.
In scope: beta gates, deterministic validation fixtures, operator controls, release/rollback packet.
Out of scope: fixing every live-market skip loop or tuning strategy from one bundle.
Validation: ./scripts/validate-active-ticket.sh && ./scripts/pmba-gate.sh end
After patch: update delivery board, production docs, session brief, and changelog.
```
