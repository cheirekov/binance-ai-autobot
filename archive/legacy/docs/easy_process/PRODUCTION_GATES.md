# PRODUCTION_GATES

Use this together with the repo delivery board gates.

## Gate P1 — Execution-safe baseline
Must be true:
- audit-grade PnL / exposure are trustworthy
- no dominant execution dead loops in overnight evidence
- deterministic validation exists for active runtime tickets
- operator can explain recent decisions from compact artifacts

## Gate P2 — Adaptive risk maturity
Must be true:
- risk slider clearly changes exposure, reserve, cooldown, and unwind posture
- adaptation is proven on at least one range-leaning and one trend-leaning validation window
- no regression of hard guardrails

## Gate P3 — Event-aware shadow maturity
Must be true:
- event/news signal contract exists
- shadow event signals are logged and scored
- evidence shows event-aware risk posture helps or at least does not damage drawdown discipline

## Gate P4 — Bounded AI/ML influence
Must be true:
- shadow metrics are measurable and stable
- bounded live influence scope is documented
- rollback takes one operator action or less
- budgets and kill switches are enforced

## Gate P5 — Production candidate
Must be true:
- repeated validation packages across multiple windows
- stable incident handling process
- promotion/rollback history is auditable
- compact state artifacts remain readable
