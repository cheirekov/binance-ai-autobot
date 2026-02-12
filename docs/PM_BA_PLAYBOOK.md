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
