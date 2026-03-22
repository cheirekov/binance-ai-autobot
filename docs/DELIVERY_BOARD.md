# DELIVERY BOARD (PM v2) — Binance AI Autobot

Last updated: 2026-02-25  
Owner: PM/BA + Codex + User

This board is structured to reduce scope drift and context-window churn.
One active ticket at a time, with gate-based promotion.

---

## North Star

Build an adaptive Binance autotrader that:
- maximizes risk-adjusted returns (expectancy),
- controls losses with hard guardrails,
- keeps AI as action-driving but never above hard risk/policy limits,
- remains auditable via trustworthy PnL/exposure telemetry.

---

## Product contract

### Risk slider (0-100)
- Controls capital at risk, exposure caps, cooldown intensity, and guardrail thresholds.

### AI autonomy slider (0-100)
- `0`: AI off
- `1-30`: shadow only
- `31-60`: limited action-driving in strict universe/caps
- `61-100`: broader action-driving with bounded deltas

Hard rule: until Gate A passes, AI remains shadow-only for execution changes.

---

## Work rules

- WIP = 1 ticket (`IN_PROGRESS`) unless PM/BA escalates P0.
- Mid-ticket scope expansion is not allowed; new ideas go to triage.
- Every `DONE` ticket requires:
  - changelog entry (`docs/PM_BA_CHANGELOG.md`)
  - session brief update (`docs/SESSION_BRIEF.md`)
  - feedback bundle (`scripts/collect-feedback.sh`)
  - runtime summary artifact in telemetry bundle (`data/telemetry/last_run_summary.json`)
- End-of-batch gate now includes loop persistence check across the latest 2 bundles (`./scripts/pmba-gate.sh end`) to prevent repeating closed-ticket failure patterns without triage.
- Runtime collection/ingestion procedure is fixed and centralized in `docs/RUN_LOGGING_P0.md` (remote collect + local ingest).

AI message contract reference:
- `docs/AI_DECISION_CONTRACT.md`
- Schema reference: `docs/schemas/last_run_summary.schema.json`
- Strategy source-of-truth: `docs/STRATEGY_COVERAGE.md`

---

## Gates

### Gate A — Audit-safe trading (blocker for AI execution influence)
Must pass all:
1. `T-005` daily guardrails implemented + UI visibility + unwind-only on hard stop
2. `T-007` commission/fill-aware PnL and exposure are stable across restart
3. no dominant retry/churn storms in overnight run
4. runtime bundle includes compact last-run summary

### Gate B — Calibratable learning
Must pass all:
1. `T-026` offline calibration pipeline exists and produces repeatable reports
2. `T-025` shadow model emits measurable quality metrics
3. promotion criteria from shadow to limited-live are defined

### Gate C — AI action at scale
Must pass all:
1. action-driving lane improves objective metrics without violating drawdown/cap rules
2. AI token/call budgets are enforced (`T-036`)
3. promotion automation (`T-038`) is in place

---

## Tracks

- **Track A: Execution & safety** — `T-029`, `T-005`, `T-020`, `T-034`, `T-031`, `T-032`, `T-003`
- **Track B: PnL / ledger / observability** — `T-007`, telemetry summary schema
- **Track C: Learning/shadow** — `T-026`, `T-025`
- **Track D: AI action lane** — `T-035`, `T-036`, `T-037`, `T-038`
- **Track E: UX/Ops** — `T-028`

---

## Strategy delivery map (adaptive + ML)

| Phase | Tickets | What changes in bot behavior |
|---|---|---|
| Foundation (now) | `T-007` | PnL/fees become audit-grade so strategy quality is measurable, not guessed. |
| Adaptive execution v1 | `T-030`, `T-031`, `T-032`, `T-034` | Universe quality filters + regime routing + exit logic + quote routing adapt entries/exits to market structure. |
| Learning (shadow) | `T-026`, `T-025` | Offline calibration + shadow model score market situations and recommend parameter shifts without live risk. |
| AI action (gated) | `T-035`, `T-036`, `T-037`, `T-038` | News/event signals can influence trades only after promotion gates and budget/risk checks pass. |

Profit milestone rule:
- We will call adaptation/profit behavior “ready” only after we can show improvement in **expectancy** and **drawdown control** across multiple day/night bundles, not a single bullish run.

---

## NOW / NEXT / LATER

### NOW (active lane)

| ID | Status | Title | Scope freeze |
|---|---|---|---|
| T-031 | IN_PROGRESS | Regime engine v2 | No quote-routing rework, no AI lane, no PnL redesign, no exit-manager redesign in this batch |
| T-032 | TODO | Exit manager v2 | Return after quote-routing/funding policy stops dominating runtime churn |
| T-034 | DONE | Multi-quote execution policy v1 | Closed after routing/funding loops stopped dominating runtime evidence |

`T-005` status: moved to DONE after overnight evidence (`autobot-feedback-20260225-100508.tgz`) showed guard transitions/recovery without deadlock.
`T-029` status: moved to DONE after overnight evidence (`autobot-feedback-20260219-103043.tgz`) showed unmanaged exposure controlled and no dominant no-feasible conversion loop.
`T-007` status: moved to DONE after restart-stability evidence (`autobot-feedback-20260302-112527.tgz`) confirmed fee-aware summary fields, executed-trade count consistency, and bounded drawdown reporting.
`T-030` status: moved to DONE after sustained low sizing-reject pressure in follow-up evidence (`autobot-feedback-20260303-071331.tgz`) with PM/BA gate pass and no dominant min-order reject loop.
`T-034` status: moved to DONE after follow-up evidence (`autobot-feedback-20260321-165459.tgz`, `autobot-feedback-20260322-063344.tgz`) showed quote-funding starvation was no longer the dominant blocker and runtime moved to fee/edge + ladder-wait behavior.

### NEXT (Gate A blockers)

| Priority | ID | Status | Title | Acceptance focus |
|---|---|---|---|---|
| 1 | T-032 | TODO | Exit manager v2 | reduce profit giveback and improve downside exits |
| 2 | T-020 | TODO | Remove hidden ENV fallbacks | one effective runtime config source |
| 3 | T-028 | TODO | Compact advanced UX | improve operator readability without changing strategy behavior |

### LATER (after Gate A)

| Priority | ID | Status | Title |
|---|---|---|---|
| 1 | T-003 | BLOCKED | Adaptive exit policy follow-up |
| 2 | T-028 | TODO | Compact advanced UX |

### Learning/AI lane (parallel prep, shadow-first)

| Priority | ID | Status | Title |
|---|---|---|---|
| 1 | T-026 | TODO | Offline calibration runner |
| 2 | T-025 | TODO | Adaptive confidence shadow model v1 |
| 3 | T-035 | TODO | News dataset + event store |
| 4 | T-036 | TODO | AI decision contract + budget gate |
| 5 | T-037 | TODO | News alpha lane v1 (gated action-driving) |
| 6 | T-038 | TODO | Promotion gates (shadow → limited → broader) |

---

## Ticket status snapshot

### Completed baseline (already delivered)

`T-000`, `T-001`, `T-002`, `T-004`, `T-005`, `T-006`, `T-007`, `T-008`, `T-009`, `T-010`, `T-011`, `T-012`, `T-013`, `T-014`, `T-015`, `T-016`, `T-017`, `T-019`, `T-021`, `T-022`, `T-024`, `T-027`, `T-029`, `T-030`, `T-033`

### Open backlog

`T-003`, `T-020`, `T-023`, `T-025`, `T-026`, `T-028`, `T-031`, `T-032`, `T-034`, `T-035`, `T-036`, `T-037`, `T-038`

---

## Triage protocol (interrupt control)

New issues must be written as a triage note and mapped to impact:
- `P0` safety
- `P1` stability
- `P2` quality
- `P3` enhancement

Only `P0/P1` can interrupt active ticket execution.

Template file: `docs/TRIAGE_NOTE_TEMPLATE.md`
