# PM/BA Playbook

Purpose: make prioritization and Definition of Done deterministic so delivery does not depend on ad-hoc prompting.

## Priority policy (hard)

Use this sequence for every new batch:

1. Safety/production risk gate:
   - Any active issue that can cause uncontrolled losses, unauthorized access, or broken execution loop is `P0` and goes first.
2. If no `P0`, score each candidate ticket:
   - `User impact` (1-5): how visible/useful to operator in next run.
   - `PnL/risk impact` (1-5): expected effect on realized/unrealized performance or loss control.
   - `Learning speed` (1-5): how quickly logs will confirm if change works.
   - `Unblock value` (0-3): how many downstream tickets become easier.
   - `Effort` (1-5): implementation + validation complexity (subtract this).
3. Compute priority score:
   - `score = userImpact + pnlRiskImpact + learningSpeed + unblockValue - effort`
4. Pick only one active ticket:
   - highest score wins,
   - tie-breaker 1: smaller effort,
   - tie-breaker 2: stronger risk-slider coverage.

## Batch selection rubric

- Day batch (`2-4h`): prefer tickets with `learningSpeed >= 4`.
- Night batch (`8-12h`): prefer tickets with `pnlRiskImpact >= 4` and measurable overnight behavior.
- Never mix more than one `IN_PROGRESS` ticket.

## Definition of Done template (hard)

A ticket is shippable only if all fields are explicitly filled.

```md
## DoD — <ticket id>
- Behavior outcome:
  - API:
  - UI:
  - Runtime decision/log evidence:
- Risk slider mapping:
  - What changes at low/mid/high risk:
  - If none: "Risk impact: none"
- Validation:
  - CI command:
  - Targeted tests/commands:
- Runtime proof:
  - Required run length:
  - Required bundle artifacts/KPIs:
- Stop/rollback condition:
```

## KPI minimum set (use in every batch)

Track only these to avoid noisy interpretation:

- Realized PnL
- Unrealized PnL
- Conversion trade ratio
- Sizing reject ratio
- Idle inventory ratio (non-core holdings as % of wallet value)

## PM/BA decision checkpoints

1. Start checkpoint:
   - approve ticket, scope, DoD, KPI delta target.
2. End checkpoint:
   - compare observed KPI delta vs target,
   - decide `continue`, `rollback`, or `pivot`,
   - set next single ticket.

## No-loop / anti-hallucination control (hard)

1. Evidence classes in review notes:
   - `observed`: directly from bundle/log/metrics,
   - `inferred`: logical interpretation of observed data,
   - `assumption`: not yet verified.
2. PM/BA decisions cannot rely on `assumption` items alone.
3. If two consecutive bundles for one ticket have the same dominant failure pattern, the next batch must be one of:
   - direct mitigation batch for that exact failure,
   - explicit pivot/de-scope with reason.
4. If the latest bundle has no fresh runtime evidence, do not patch from it.
   - Use `docs/RETROSPECTIVE_AUTO.md` and `fresh runtime evidence` in `docs/SESSION_BRIEF.md`.
   - Two consecutive stale/mark-to-market-only bundles require deterministic validation, not another live-wait loop.
   - Default deterministic validation entrypoint: `./scripts/validate-active-ticket.sh`
5. Use `./scripts/pmba-gate.sh start` before implementation and `./scripts/pmba-gate.sh end` before handoff.
6. Run `./scripts/auto-retro.sh [bundle]` after each ingestion (or rely on `ingest-feedback.sh`, which now does it automatically).

## Automatic retrospective rules (hard)

The automatic retrospective is not optional process noise; it is the time-awareness layer for long tickets.

- Artifact:
  - `docs/RETROSPECTIVE_AUTO.md`
- Trigger cadence:
  - regenerate on every ingestion
- Hard-rule checks:
  - latest bundle freshness (`fresh` / `mark_to_market_only` / `stale`),
  - repeated dominant loop across latest 2 fresh bundles,
  - negative `daily_net_usdt` across latest 3 fresh bundles,
  - no KPI trend improvement across latest 3 fresh bundles (daily net and max drawdown both not improving)
- Required PM/BA action:
  - `continue` → same lane can continue,
  - `patch_required` → next batch must be direct same-ticket mitigation,
  - `pivot_required` → PM/BA must explicitly review scope/ticket before the next long run.
  - `await_fresh_evidence` → do not patch from this bundle alone,
  - `validation_required` → stop live waiting and move to deterministic validation.
- Single source of truth:
  - `docs/RETROSPECTIVE_AUTO.md` owns the batch decision,
  - `docs/SESSION_BRIEF.md` must mirror that decision, not invent a second one.

## Ticket-switch retrospective rule (hard)

A ticket switch is not complete just because the board and session brief changed.

- Required artifact:
  - `docs/TICKET_SWITCH_RETRO.md`
- Minimum content:
  - previous ticket,
  - current ticket,
  - switch decision,
  - evidence bundles,
  - why the previous lane is closed/pivoted,
  - why the next lane is the correct target.
- Enforcement:
  - `./scripts/pmba-gate.sh start` must fail if `docs/TICKET_SWITCH_RETRO.md` does not align with the current active ticket.
- Intent:
  - prevent “board switch without real retrospective”.

## Ticket-age retrospective rule (hard)

- A ticket may not drift indefinitely on micro-patches.
- Trigger a program/ticket retro when either is true:
  - `5` fresh bundles have been reviewed on the same active ticket, or
  - `3` calendar days have elapsed on the same active ticket.
- Required output:
  - what improved,
  - what did not improve,
  - why the ticket remains open,
  - continue / split / pivot decision.
