# Session Brief

Last updated: 2026-04-12 18:20 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (allowed only when fresh evidence shows downside-control and candidate quality are coupled in the same runtime window)
- Goal (single sentence): release `CAUTION` new-symbol pause once the book is already near-flat and orderless after an `ABS_DAILY_LOSS` day, so residual dust does not block fresh `T-031` validation.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - keep undersized sell legs non-actionable before runtime attempts another grid sell ladder.
  - keep the April 2 and April 7-10 `T-031` dust-loop mitigations in place.
  - apply one bounded linked-support `T-032` slice only to stop near-flat residual positions from anchoring `CAUTION` new-symbol pause after `ABS_DAILY_LOSS`.
  - preserve March 30-31 `T-032` downside-control behavior.
  - preserve `T-034` funding / quote-routing stability.
- Out of scope:
  - quote-routing redesign (`T-034` stays closed unless runtime regresses),
  - reopening `T-032` as the active blocker without fresh evidence,
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: the bot is no longer state-stuck, but fresh April 12 evidence shows `ABS_DAILY_LOSS` `CAUTION` still pauses new symbols after the book has already de-risked to ~0.3% exposure with no active orders. Releasing that pause in the near-flat/orderless case should preserve `T-032` downside control while letting `T-031` resume candidate evaluation.
- Target KPI delta:
  - reduce repeated steady-state `Grid sell leg not actionable yet` loops on the same residual symbol family.
  - preserve the absence of the older `No feasible candidates after policy/exposure filters` deadlock.
  - preserve low sizing reject pressure and preserve reachable `daily-loss-caution-unwind` behavior.
- Stop/rollback condition:
  - if the selection exception reopens materially actionable sell inventory too early, or reopens any `T-032` caution freeze regression, freeze `T-031` and revert to the last stable April 2 morning baseline.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - sell-leg feasibility remains assessed explicitly before grid sell placement.
    - undersized sell legs remain `Grid sell leg not actionable yet` instead of repeatedly failing on exchange minimums.
    - `GRID_SELL_NOT_ACTIONABLE` cooldown still allows first-pass dust recovery, and existing longer retry cooldown behavior remains preserved.
    - `ABS_DAILY_LOSS` `CAUTION` no longer pauses new symbols once managed exposure is below the trigger floor and there are no active orders, even if tiny residual managed positions remain.
    - March 30-31 `T-032` caution-unwind / thaw behavior remains preserved.
  - active development lane is `T-031`; `T-032` remains preserved as a support lane in runtime.
- Runtime evidence in decisions/logs:
  - latest fresh bundle runs `git.commit=58d9e47`.
  - latest fresh bundle (`autobot-feedback-20260412-180152.tgz`) shows:
    - `risk_state=CAUTION` with `trigger=ABS_DAILY_LOSS`
    - `managedExposure≈0.3%`
    - `activeOrders=0`
    - latest decision: `Skip: No feasible candidates: daily loss caution paused new symbols (60 filtered)`
  - the next fresh bundle should show fresher post-caution candidate activity instead of near-flat `CAUTION` freeze.
- Risk slider impact:
  - risk slider still modulates cooldown duration and lane thresholds; this slice only changes when dust sell legs are considered actionable enough to keep re-entering grid rotation.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - deploy the current `T-031` slice and collect one fresh bundle before any further reprioritization

## 3) Deployment handoff

- Commit hash: `<set-after-commit>`
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
  - bundle interval (hours): `12.32`
  - runtime uptime (hours): `27.985`
  - run end: `Sun Apr 12 2026 21:01:28 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `NIGHT_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip WLDUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (19))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=24, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=61.9%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_required`
- Next ticket candidate: `T-031` (continue active lane unless PM/BA reprioritizes)
- Required action: `same-ticket mitigation required before next long run`
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260412-180152.tgz`
  - auto-updated at: `2026-04-12T18:02:26.144Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_required
Required action: same-ticket mitigation required before next long run
Latest bundle: autobot-feedback-20260412-180152.tgz
Fresh runtime evidence: yes (fresh)
Goal: release near-flat ABS_DAILY_LOSS caution freeze so T-031 candidate activity can resume after the book is already de-risked.
In scope: one bounded linked-support T-032 thaw inside active T-031, preserving existing residual-family mitigation and downside-control behavior.
Out of scope: quote-routing redesign, broad candidate-hygiene rewrites, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
