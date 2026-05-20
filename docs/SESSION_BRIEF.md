# Session Brief

Last updated: 2026-05-20 15:00 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (bounded downside-control support)
- Goal (single sentence): stop `CAUTION`/risk-budget defensive mode from reselecting countable dust residuals where the sell leg is below exchange minimum and the BUY leg is paused.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - route new exposure, grid BUYs, market entries, and fee/edge checks through `deriveRiskBudgetDecision`.
  - respect `GRID_SELL_NOT_ACTIONABLE` cooldowns for dust home-quote symbols during non-`NORMAL` risk states when the BUY leg is also paused, even if managed-risk bypass exposure is countable.
  - keep recovered quote protected against immediate BUY re-spend after no-feasible recovery sells.
  - keep profit-giveback `CAUTION` as a fresh-entry freeze while giveback remains above the caution threshold or daily realized PnL is negative.
  - preserve the May 7 managed-position lock bypass so existing inventory remains reachable for exit/unwind handling.
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
  - futures/margin execution,
  - news/event action-driving,
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: the risk-budget and first dust-cooldown patches are deployed, but managed-risk bypass still reselects countable EDEN dust before honoring the paused-buy `GRID_SELL_NOT_ACTIONABLE` cooldown.
- Target KPI delta:
  - `riskBudget` continues appearing in relevant skip details for new-exposure, GRID BUY, MARKET entry, and fee/edge decisions.
  - repeated `Skip EDENUSDC: Grid sell leg not actionable yet` drops materially after the cooldown is respected.
  - no immediate BUY re-spend of quote recovered by `no-feasible-liquidity-recovery` sells.
  - no fresh grid BUY reopen cycle while `trigger=PROFIT_GIVEBACK` and `state=CAUTION/HALT`.
  - high risk still respects defensive/reduce-only behavior in `HALT`, confirmed bear, and active loss/giveback `CAUTION`.
  - `RECOVERY_OPPORTUNITY` appears only after caution has stabilized and exposure is near-flat.
  - managed sell/unwind/exit evaluation remains visible for existing exposure.
  - lower churn/fee pressure after liquidity recovery.
  - preserve fee-aware daily-loss/profit-giveback and April 30 BUY progression behavior.
- Stop/rollback condition:
  - if the patch blocks actionable managed exits/unwinds, weakens hard risk locks, allows recovery-sell → immediate BUY churn, or makes risk 100 bypass fee-proof edge, reopen PM/BA triage immediately.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - all new exposure gates use `apps/api/src/modules/bot/risk-budget.service.ts`.
    - dust home-quote `GRID_SELL_NOT_ACTIONABLE` cooldowns are respected in `CAUTION`/`HALT` when the BUY leg is also paused, before managed-risk bypass can release the symbol.
    - high risk no longer lowers fee-edge requirements below estimated round-trip cost.
    - `HALT`, confirmed bear, and active negative `CAUTION` become defensive/reduce-only for new exposure.
    - stabilized `CAUTION` can permit only small recovery-opportunity exposure.
    - after `no-feasible-liquidity-recovery`, BUY sizing temporarily preserves the high quote reserve instead of only the hard reserve.
    - reserve rebuild skips are not treated as pressure to trigger another recovery sell.
    - countable managed positions can bypass non-hard recovery/min-order/max-position/grid-sell cooldown locks during daily-loss `CAUTION`/`HALT`.
    - fresh candidates still respect those cooldown locks.
    - profit-giveback `CAUTION` pauses fresh symbols while giveback remains above the caution threshold.
    - profit-giveback `CAUTION` pauses fresh symbols while daily realized PnL is negative.
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
  - latest fresh bundle before this patch runs `git.commit=7b52732`.
  - latest fresh bundle (`autobot-feedback-20260520-150037.tgz`) shows:
    - `risk_state=CAUTION`
    - `trigger=PROFIT_GIVEBACK`
    - `daily_net_usdt=-11.24`
    - `max_drawdown_pct=1.47933`
    - `open_positions=12`
    - `total_alloc_pct=1.23`
    - top loop `Skip EDENUSDC: Grid sell leg not actionable yet (34)`.
  - next fresh bundle after this patch should show lower EDEN dust sell-leg churn while `riskBudget` still blocks fresh exposure in active profit-giveback caution.
- Risk slider impact:
  - risk slider now feeds a deterministic budget contract instead of only widening exposure/turnover.
  - risk-state protections remain hard; high risk cannot bypass `HALT`, confirmed bear defense, active negative `CAUTION`, or fee-proof edge.
- Validation commands:
  - `(cd apps/api && ./node_modules/.bin/vitest run src/modules/bot/risk-budget.service.test.ts --cache=false)`
  - `(cd apps/api && ./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts -t "dust sell-leg|grid-sell-not-actionable|managed daily-loss candidates" --cache=false)`
  - `(cd apps/api && ./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts --cache=false)`
  - `(cd apps/api && ./node_modules/.bin/vitest run --cache=false)`
  - `./apps/api/node_modules/.bin/tsc -p apps/api/tsconfig.json --noEmit`
  - `./scripts/validate-active-ticket.sh`
  - `git diff --check`
  - `./scripts/pmba-gate.sh start`
  - `./scripts/pmba-gate.sh end`
- Runtime validation plan:
  - deploy the current `T-031` slice and collect one fresh bundle before any further reprioritization

## 3) Deployment handoff

- Commit hash: `pending local patch` (base runtime `7b52732`)
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
  - bundle interval (hours): `31.189`
  - runtime uptime (hours): `936.962`
  - run end: `Wed May 20 2026 18:00:05 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `NIGHT_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip EDENUSDC: Grid sell leg not actionable yet (34))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=47, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=76.5%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_required`
- Next ticket candidate: `T-031` (continue active lane unless PM/BA reprioritizes)
- Required action: `same-ticket managed-bypass mitigation before next long run`
- Open risks:
  - PM/BA gate passed, but the same dust sell-leg class moved to EDEN because countable managed exposure bypassed the paused-buy sell-leg cooldown.
- Notes for next session:
  - bundle: `autobot-feedback-20260520-150037.tgz`
  - auto-updated at: `2026-05-20T15:00:50.966Z`
  - local patch pending: evaluate `GRID_SELL_NOT_ACTIONABLE` paused-buy cooldowns before managed-risk bypass.

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_required
Required action: same-ticket managed-bypass mitigation before next long run
Latest bundle: autobot-feedback-20260520-150037.tgz
Fresh runtime evidence: yes (fresh)
Goal: stop EDEN-style managed-bypass dust sell-leg reselection while preserving riskBudget defensive behavior.
In scope: GRID_SELL_NOT_ACTIONABLE cooldown ordering before managed-risk bypass.
Out of scope: quote-routing redesign, candidate-hygiene-only optimization, PnL schema changes, AI lane.
Validation: targeted bot-engine dust sell-leg tests, full bot-engine tests, API tests, tsc, active-ticket gate.
After deploy: check EDEN sell-leg-not-actionable count drops and riskBudget still blocks fresh BUYs during profit-giveback CAUTION.
```
