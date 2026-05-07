# Session Brief

Last updated: 2026-05-07 09:07 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (bounded downside-control support)
- Goal (single sentence): keep daily-loss managed exits reachable when recovery/min-order cooldown locks would otherwise hide material open inventory.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - let countable managed positions bypass non-hard no-feasible/min-order/max-position/grid-sell retry cooldown locks during daily-loss `CAUTION`/`HALT`.
  - preserve existing fresh-symbol cooldown blocks; bypass requires current managed exposure.
  - keep daily-loss/profit-giveback fee-aware guardrails from the May 4 slice.
  - preserve the April 30 dust/zero SELL-leg BUY progression behavior.
  - preserve the April 28 dust-storm bypass, April 27 recovery dust parking, April 23/20 quote quarantine behavior, and April 15 fee-edge quarantine.
  - preserve April 20 exposure clipping plus April 12 and March 30-31 `T-032` downside-control behavior.
  - preserve `T-034` funding / quote-routing stability.
- Out of scope:
  - quote-routing redesign (`T-034` stays closed unless runtime regresses),
  - promoting `T-032` to the active ticket beyond this bounded support fix,
  - weakening entry filters or fee-edge floors,
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: after exchange backoff cleared, daily-loss `CAUTION` was active but symbol-level no-feasible recovery locks hid the large managed `SOLUSDC`/`ZECUSDC` positions from managed fallback/exit evaluation. Allowing only countable managed positions to bypass those non-hard locks should restore downside-control reachability without reopening fresh-symbol churn.
- Target KPI delta:
  - lower repeated `Daily loss caution: no eligible managed symbols`.
  - visible managed sell/unwind/exit evaluation for material `SOLUSDC`/`ZECUSDC` exposure while daily-loss caution remains active.
  - no fresh-symbol reopening from the bypass.
  - preserve fee-aware daily-loss/profit-giveback and April 30 BUY progression behavior.
- Stop/rollback condition:
  - if the patch lets unowned/fresh symbols bypass cooldowns, weakens never-trade/global locks, or still leaves material managed exposure boxed in daily-loss caution with no sell/unwind reachability, reopen PM/BA triage immediately.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - countable managed positions can bypass non-hard recovery/min-order/max-position/grid-sell cooldown locks during daily-loss `CAUTION`/`HALT`.
    - fresh candidates still respect those cooldown locks.
    - daily-loss/profit-giveback closed PnL remains fee-aware.
    - severe near-halt daily-loss `CAUTION` still pauses fresh symbols even when managed exposure is near-flat.
    - April 30 dust/zero SELL legs still do not block reachable grid BUY legs.
    - `GRID_SELL_NOT_ACTIONABLE` storm-lock behavior from April 28 remains preserved.
    - below-minimum recovery sell candidates receive a multi-hour symbol-level `NO_FEASIBLE_RECOVERY_MIN_ORDER` cooldown.
    - home-quote / actionable sell-leg candidates remain reachable.
    - April 20 linked-support `T-032` exposure fix remains preserved.
    - April 17 no-feasible dust cooldown remains preserved.
    - April 15 global fee-edge quarantine behavior remains preserved.
    - April 13-15 residual storm behavior remains preserved.
    - April 12 `ABS_DAILY_LOSS` `CAUTION` thaw remains preserved.
    - March 30-31 `T-032` caution-unwind / thaw behavior remains preserved.
  - active development lane is `T-031`; `T-032` remains preserved as a support lane in runtime.
- Runtime evidence in decisions/logs:
  - latest fresh bundle runs `git.commit=0415b81`.
  - latest fresh bundle (`autobot-feedback-20260507-090740.tgz`) shows:
    - `risk_state=CAUTION`
    - `trigger=ABS_DAILY_LOSS`
    - `activeOrders=0`
    - wallet/equity estimate `6217.83 USDC`
    - `daily_net_usdt=-151.90`
    - `total_alloc_pct=37.26`
    - top skips: `Max open positions reached`, `Daily loss caution: no eligible managed symbols`, and `Daily loss caution paused GRID BUY leg`
  - the next fresh bundle should show managed `SOLUSDC`/`ZECUSDC` exit/unwind/sell evaluation rather than tiny-position fallback loops.
- Risk slider impact:
  - no exposure cap, daily-loss budget, or fee-floor changes.
  - risk-state protections remain hard; this only prevents non-hard symbol cooldowns from hiding already-managed risk inventory.
- Validation commands:
  - `./apps/api/node_modules/.bin/vitest run apps/api/src/modules/bot/bot-engine.service.test.ts --cache=false`
  - `./apps/api/node_modules/.bin/tsc -p apps/api/tsconfig.build.json --noEmit`
  - `./scripts/validate-active-ticket.sh`
  - `git diff --check`
  - `./scripts/pmba-gate.sh start`
  - `./scripts/pmba-gate.sh end`
- Runtime validation plan:
  - deploy the current `T-031` slice and collect one fresh bundle before any further reprioritization

## 3) Deployment handoff

- Commit hash: `pending local patch after 0415b81`
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
  - window (local): `DAY (collection) / DAY (run end)`
  - timezone: `Europe/Sofia`
  - bundle interval (hours): `48.998`
  - runtime uptime (hours): `619.088`
  - run end: `Thu May 07 2026 12:07:38 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `DAY_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip ZECBTC: Max open positions reached (10) (18))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=113, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=43.5%)
  - sizing reject pressure: `low` (sizingRejectSkips=13, decisions=200, ratio=6.5%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_required`
- Next ticket candidate: `T-031` (continue active lane unless PM/BA reprioritizes)
- Required action: `same-ticket mitigation required before next long run`
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260507-090740.tgz`
  - auto-updated at: `2026-05-07T09:07:53.375Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_required
Required action: same-ticket mitigation required before next long run
Latest bundle: autobot-feedback-20260507-090740.tgz
Fresh runtime evidence: yes (fresh)
Goal: reduce profit giveback and improve downside control while preserving T-034 funding stability.
In scope: exit-manager / de-risking behavior under adverse conditions.
Out of scope: quote-routing redesign, candidate-hygiene-only optimization, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
