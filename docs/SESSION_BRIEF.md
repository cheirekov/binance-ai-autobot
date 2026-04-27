# Session Brief

Last updated: 2026-04-27 12:15 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (preserved only; not the current blocker)
- Goal (single sentence): make no-feasible recovery prefer reachable managed sells and stop reselecting the same below-minimum dust recovery candidate.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - let no-feasible recovery SELL validation bypass buy/quote/grid-wait symbol cooldowns that are not hard risk locks.
  - prioritize home-stable managed positions before non-home quote-pressure recovery candidates.
  - park recovery candidates that fail market-sell minimum validation under a bounded `NO_FEASIBLE_RECOVERY_MIN_ORDER` symbol cooldown.
  - preserve the April 20 linked-support `T-032` exposure fix.
  - preserve the April 23 buy-quote quarantine, April 20 quote-pressure quarantine, April 17 no-feasible dust cooldown, April 15 fee-edge quarantine, and active-order behavior.
  - keep the April 13-15 residual storm mitigations in place.
  - preserve April 12 and March 30-31 `T-032` downside-control behavior.
  - preserve `T-034` funding / quote-routing stability.
- Out of scope:
  - quote-routing redesign (`T-034` stays closed unless runtime regresses),
  - reopening `T-032` as the active blocker without fresh evidence,
  - weakening entry filters or fee-edge floors,
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: the current long-run hold is not a `T-032` downside-control freeze; it is a `T-031` recovery-selection gap where valid managed recovery candidates are excluded by soft cooldowns before exchange validation while a dust `TRXBTC` candidate is repeatedly retried. Ranking home-stable recovery sells first and parking min-order failures should restore bounded adaptive action without weakening risk locks.
- Target KPI delta:
  - reduce repeated `Skip: No feasible candidates after policy/exposure filters` under the same BTC/ETH quote-pressure pattern.
  - stop repeated `TRXBTC` no-feasible recovery attempts that fail on `Below minQty 1.00000000`.
  - increase reachable home-quote recovery validation attempts when active orders are zero.
  - preserve the April 20 `T-032` support fix and avoid reopening the old April 17 freeze.
  - preserve reachable home-quote / managed sell paths.
- Stop/rollback condition:
  - if the new recovery ranking weakens downside control, bypasses hard risk locks, blocks reachable home-quote / managed sell paths, or a fresh bundle reopens the old near-flat `CAUTION` / `HALT` freeze, reopen PM/BA triage immediately.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - no-feasible recovery SELL validation bypasses only soft buy/quote/grid-wait symbol cooldowns and still honors hard/global risk locks.
    - no-feasible recovery sell ranking prefers home-stable managed positions before non-home quote-pressure positions.
    - below-minimum recovery sell candidates receive a bounded symbol-level `NO_FEASIBLE_RECOVERY_MIN_ORDER` cooldown.
    - home-quote / actionable sell-leg candidates remain reachable.
    - April 20 linked-support `T-032` exposure fix remains preserved.
    - April 17 no-feasible dust cooldown remains preserved.
    - April 15 global fee-edge quarantine behavior remains preserved.
    - April 13-15 residual storm behavior remains preserved.
    - April 12 `ABS_DAILY_LOSS` `CAUTION` thaw remains preserved.
    - March 30-31 `T-032` caution-unwind / thaw behavior remains preserved.
  - active development lane is `T-031`; `T-032` remains preserved as a support lane in runtime.
- Runtime evidence in decisions/logs:
  - latest fresh bundle runs `git.commit=61e0e46`.
  - latest fresh bundle (`autobot-feedback-20260427-113318.tgz`) shows:
    - `risk_state=NORMAL`
    - `activeOrders=0`
    - `unwind_only=false`
    - `sizingRejectPressure=low`
    - dominant skip `Skip: No feasible candidates after policy/exposure filters` (`70`)
    - latest rejection samples are entirely non-home quote pressure (`BTC`, `ETH`)
    - no-feasible recovery still attempts, but the recovery symbol (`TRXBTC`) fails on `Below minQty 1.00000000`
    - no new fills or orders landed across the long run
  - the next fresh bundle should show lower repeated no-feasible churn, no repeated `TRXBTC` dust retry loop, and more home-quote / actionable-sell candidate reachability.
- Risk slider impact:
  - no cap, fee-floor, or daily-loss threshold changes.
  - this slice adds risk-linked min-order recovery parking (`60m` at risk `0`, `20m` at risk `100`).
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - deploy the current `T-031` slice and collect one fresh bundle before any further reprioritization

## 3) Deployment handoff

- Commit hash: `pending local patch after 61e0e46`
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
  - bundle interval (hours): `75.073`
  - runtime uptime (hours): `381.503`
  - run end: `Mon Apr 27 2026 14:32:33 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `DAY_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip: No feasible candidates after policy/exposure filters (70))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=81, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=59.7%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `continue`
- Next ticket candidate: `T-031` (continue active lane unless PM/BA reprioritizes)
- Required action: `continue active ticket`
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260427-113318.tgz`
  - auto-updated at: `2026-04-27T11:33:34.372Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: continue
Required action: continue active ticket
Latest bundle: autobot-feedback-20260427-113318.tgz
Fresh runtime evidence: yes (fresh)
Goal: restore bounded adaptation during no-feasible quote-pressure loops by preferring reachable recovery sells and parking below-minimum dust retries.
In scope: no-feasible recovery sell ranking, soft-lock bypass for recovery SELL validation, and min-order dust retry cooldown.
Out of scope: quote-routing redesign, candidate-hygiene-only optimization, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
