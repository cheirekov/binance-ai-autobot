# Session Brief

Last updated: 2026-05-04 08:50 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (bounded downside-control support)
- Goal (single sentence): reduce restored-trading fee/giveback churn by making daily-loss protection fee-aware and preventing near-halt fresh-symbol reopening.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - make closed-PnL events include buy-side and sell-side fees before daily-loss/profit-giveback evaluation.
  - lower profit-giveback activation to preserve smaller net wins after fees.
  - prevent severe near-halt daily-loss `CAUTION` from reopening fresh symbols solely because managed exposure is near-flat.
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
- Hypothesis: the April 30 actionability fix restored trading, but daily-loss/profit-giveback protection still under-counted fee burn and could thaw fresh symbols too easily once exposure was near-flat. Fee-aware closed PnL plus severe-budget pause should reduce churn without weakening hard guardrails.
- Target KPI delta:
  - daily-loss guard details reflect fee-aware realized PnL.
  - no fresh-symbol entries when severe daily-loss caution has consumed most of the risk-linked daily budget.
  - profit-giveback still protects smaller net wins after fees.
  - preserve reachable home-quote / managed sell paths and April 30 BUY progression.
- Stop/rollback condition:
  - if the patch permits fresh entries during severe daily-loss protection, hides fees from realized guard math, blocks reachable unwind/sell paths, or reopens the old no-feasible quote-pressure loop, reopen PM/BA triage immediately.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - daily-loss/profit-giveback closed PnL is fee-aware.
    - buy-side fees increase cost basis before close.
    - sell-side fees reduce closed PnL.
    - severe near-halt daily-loss `CAUTION` pauses fresh symbols even when managed exposure is near-flat.
    - profit-giveback hard `HALT` on near-flat books is reserved for severe daily-loss usage or material managed exposure.
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
  - latest fresh bundle runs `git.commit=474b1ee`.
  - latest fresh bundle (`autobot-feedback-20260504-084256.tgz`) shows:
    - `risk_state=HALT`
    - `trigger=PROFIT_GIVEBACK`
    - `unwind_only=true`
    - `activeOrders=0`
    - wallet/equity estimate `6247.63 USDC`
    - `dailyRealized=-231.26 USDC`, `peakDaily=29.71 USDC`, `giveback=260.98 USDC`
    - high churn: `submitted=200`, `filled=136`, `canceled=64`, `feesHome=42.19`
  - the next fresh bundle should show fee-aware daily-loss/giveback details and no fresh-symbol entries while severe daily-loss caution is active.
- Risk slider impact:
  - no exposure cap or fee-floor changes.
  - daily-loss budget remains risk-linked and unchanged.
  - severe caution pause is risk-linked (`65% -> 85%` of the daily-loss budget).
  - profit-giveback activation now uses `5%` of the daily-loss budget so fee-aware smaller net wins are still protected.
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

- Commit hash: `pending local patch after 474b1ee`
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
  - window (local): `MORNING (collection) / MORNING (run end)`
  - timezone: `Europe/Sofia`
  - bundle interval (hours): `96.384`
  - runtime uptime (hours): `546.665`
  - run end: `Mon May 04 2026 11:42:17 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `MORNING_REVIEW`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (restored trading reached fee/giveback protection; top skip `Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.050%)` (10))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=103, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=48.5%)
  - sizing reject pressure: `low` (sizingRejectSkips=15, decisions=200, ratio=7.5%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_required`
- Next ticket candidate: `T-031` (continue active lane unless PM/BA reprioritizes)
- Required action: `same-ticket mitigation required before next long run`
- Open risks:
  - next bundle may be intentionally paused by fee-aware daily-loss protection until the rolling loss window clears; that is safer than reopening fresh symbols into severe loss budget usage.
- Notes for next session:
  - bundle: `autobot-feedback-20260504-084256.tgz`
  - auto-updated at: `2026-05-04T08:43:15.630Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_required
Required action: same-ticket mitigation required before next long run
Latest bundle: autobot-feedback-20260504-084256.tgz
Fresh runtime evidence: yes (fresh)
Goal: reduce profit giveback and improve downside control while preserving T-034 funding stability.
In scope: fee-aware daily-loss/profit-giveback guardrails and severe near-halt fresh-symbol pause.
Out of scope: quote-routing redesign, candidate-hygiene-only optimization, PnL schema changes, AI lane.
Validation: ./apps/api/node_modules/.bin/vitest run apps/api/src/modules/bot/bot-engine.service.test.ts --cache=false; ./apps/api/node_modules/.bin/tsc -p apps/api/tsconfig.build.json --noEmit; ./scripts/validate-active-ticket.sh; git diff --check; ./scripts/pmba-gate.sh start; ./scripts/pmba-gate.sh end
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
