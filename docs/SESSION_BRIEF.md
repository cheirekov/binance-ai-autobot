# Session Brief

Last updated: 2026-05-27 10:48 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (bounded downside-control support)
- Goal (single sentence): add a reduce-only aggregate portfolio-budget trim so full risk-budget envelopes can release exposure before fresh-symbol retries dominate.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - route new exposure, grid BUYs, market entries, and fee/edge checks through `deriveRiskBudgetDecision`.
  - clamp MARKET entry and grid BUY sizing to `riskBudget.maxNewExposureHome` after converting the cap into candidate quote units.
  - leave grid SELL and managed exit sizing uncapped by new-exposure budget so reduce-only paths remain reachable.
  - when `portfolio-exposure-budget-full` is present, allow managed SELLs to trim aggregate exposure back toward `riskBudget.maxTotalExposurePct`.
  - respect `GRID_SELL_NOT_ACTIONABLE` cooldowns for dust home-quote symbols whenever the BUY leg is paused.
  - run managed-position exits before new-candidate risk-budget skips.
  - tighten effective concentration cap when risk-budget is defensive because portfolio exposure is over budget.
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
- Hypothesis: the May 26 BUY cap is deployed and working, but aggregate managed exposure is now above the 5% risk-budget envelope without any single symbol breaching concentration, so the engine has no reduce-only release path and keeps retrying fresh symbols that risk budget must reject.
- Target KPI delta:
  - `riskBudget` continues appearing in relevant skip details for new-exposure, GRID BUY, MARKET entry, and fee/edge decisions.
  - placed MARKET/grid BUY notional stays at or below `riskBudgetBuyNotionalCapQuote` whenever the cap is present.
  - exchange-minimum BUYs above the risk-budget cap become explicit risk-budget sizing skips instead of oversized orders.
  - `portfolio-exposure-budget-full` can produce `portfolio-budget-rebalance-exit` managed SELL evidence before fresh-symbol risk-budget skips dominate.
  - `Skip BTCUSDC/ETHUSDC: Risk budget blocked new exposure` counts drop because managed exits are evaluated first.
  - oversized SOL exposure produces concentration-rebalance/exit evidence if it remains above the effective risk-budget concentration cap.
  - no immediate BUY re-spend of quote recovered by `no-feasible-liquidity-recovery` sells.
  - no fresh grid BUY reopen cycle while `trigger=PROFIT_GIVEBACK` and `state=CAUTION/HALT`.
  - high risk still respects defensive/reduce-only behavior in `HALT`, confirmed bear, and active loss/giveback `CAUTION`.
  - `RECOVERY_OPPORTUNITY` appears only after caution has stabilized and exposure is near-flat.
  - managed sell/unwind/exit evaluation remains visible for existing exposure.
  - lower churn/fee pressure after liquidity recovery.
  - preserve fee-aware daily-loss/profit-giveback and April 30 BUY progression behavior.
- Stop/rollback condition:
  - if the patch blocks actionable managed exits/unwinds, caps SELL sizing with new-exposure budget, weakens hard risk locks, allows recovery-sell → immediate BUY churn, or makes risk 100 bypass fee-proof edge, reopen PM/BA triage immediately.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - all new exposure gates use `apps/api/src/modules/bot/risk-budget.service.ts`.
    - MARKET entry and grid BUY quantities are bounded by `riskBudget.maxNewExposureHome` after quote conversion.
    - BUY order details include the applied risk-budget cap for runtime verification.
    - exchange minimums above the risk-budget BUY cap produce a risk-budget sizing skip.
    - aggregate portfolio-budget excess can trigger a reduce-only `portfolio-budget-rebalance-exit`.
    - dust home-quote `GRID_SELL_NOT_ACTIONABLE` cooldowns are respected whenever the BUY leg is paused, before managed-risk bypass can release the symbol.
    - managed exits run before new-candidate risk-budget skips return.
    - over-budget defensive mode tightens the effective concentration cap for managed-position exits.
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
  - latest fresh bundle before this patch runs `git.commit=9fc5bd9`.
  - latest fresh bundle (`autobot-feedback-20260527-104314.tgz`) shows:
    - `risk_state=CAUTION`
    - `daily_net_usdt=-11.26`
    - `max_drawdown_pct=3.65688`
    - `open_positions=11`
    - `total_alloc_pct=5.29634`
    - top loop `Skip BTCUSDC: Risk budget blocked new exposure (60)`.
    - skip details show `riskBudget.maxTotalExposurePct=5`, `maxNewExposureHome=0`, `portfolio-exposure-budget-full`, and `no-new-exposure-budget`.
  - next fresh bundle after this patch should show `portfolio-budget-rebalance-exit` when aggregate exposure is over budget, or explicit sell ineligibility evidence if exchange minimums/cooldowns prevent the trim.
- Risk slider impact:
  - risk slider now feeds a deterministic budget contract instead of only widening exposure/turnover.
  - risk-state protections remain hard; high risk cannot bypass `HALT`, confirmed bear defense, active negative `CAUTION`, or fee-proof edge.
- Validation commands:
  - `(cd apps/api && ./node_modules/.bin/vitest run src/modules/bot/risk-budget.service.test.ts --cache=false)`
  - `(cd apps/api && ./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts -t "risk-budget BUY notional caps" --cache=false)`
  - `(cd apps/api && ./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts -t "portfolio-budget trim" --cache=false)`
  - `(cd apps/api && ./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts -t "dust sell-leg|grid-sell-not-actionable|managed daily-loss candidates" --cache=false)`
  - `(cd apps/api && ./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts --cache=false)`
  - `(cd apps/api && ./node_modules/.bin/vitest run --cache=false)`
  - `./apps/api/node_modules/.bin/tsc -p apps/api/tsconfig.json --noEmit`
  - `./scripts/validate-active-ticket.sh`
  - `git diff --check`
  - `./scripts/pmba-gate.sh start`
  - `./scripts/pmba-gate.sh end` (expected fail until a fresh post-patch bundle replaces the May 27 repeated-loop evidence)
- Runtime validation plan:
  - deploy the current `T-031` slice and collect one fresh bundle before any further reprioritization

## 3) Deployment handoff

- Commit hash: `pending`
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
  - bundle interval (hours): `19.829`
  - runtime uptime (hours): `1100.675`
  - run end: `Wed May 27 2026 13:42:55 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `DAY_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip BTCUSDC: Risk budget blocked new exposure (60))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=66, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=67.3%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `pivot_required`
- Next ticket candidate: `T-031` (same-ticket mitigation after PM/BA triage)
- Required action: `deploy T-031 aggregate portfolio-budget trim and collect a fresh bundle`
- Open risks:
  - PM/BA repeated-loop gate will continue failing on the already-collected May 27 bundle until a fresh post-patch bundle changes the runtime evidence.
  - if managed SELLs are blocked by exchange minimums or recent-buy cooldowns, the next slice should add explicit sell-ineligibility evidence before changing risk-budget limits.
- Validation status:
  - local API tests, TypeScript, diff check, PM/BA start gate, and active-ticket Docker CI passed.
  - PM/BA end gate failed on the pre-patch repeated-loop evidence by design.
- Notes for next session:
  - bundle: `autobot-feedback-20260527-104314.tgz`
  - auto-updated at: `2026-05-27T10:43:29.380Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: pivot_required
Required action: deploy same-ticket aggregate portfolio-budget trim and collect a fresh bundle
Latest bundle: autobot-feedback-20260527-104314.tgz
Fresh runtime evidence: yes (fresh)
Goal: add reduce-only portfolio-budget rebalance exits when aggregate exposure is above the T-031 risk-budget envelope.
In scope: T-031 risk-budget rotation, managed SELL trim evidence, preserving T-032 downside controls.
Out of scope: weakening the 5% budget cap, quote-routing redesign, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
