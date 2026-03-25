# CAPABILITY_ROADMAP

This roadmap keeps the program focused on capabilities, not only tickets.

## Capability lanes

### C1 — Execution core maturity
Goal: stable entries, exits, inventory handling, quote routing, order lifecycle discipline.
Signals of maturity:
- no dead loops around funding/inventory/order state
- order lifecycle is observable and replayable
- execution remains deterministic under restart

### C2 — Risk engine maturity
Goal: risk slider becomes a true portfolio/risk control plane.
Must cover:
- per-position risk budget
- total exposure caps
- cash/stable reserve floors
- unwind behavior under adverse conditions
- cooldown and churn suppression

### C3 — Regime adaptation
Goal: bot reacts differently in range / trend / shock conditions.
Must cover:
- regime classification confidence
- behavior mapping by regime
- prove adaptation over at least one range-leaning and one trend-leaning validation window

### C4 — Validation system
Goal: stop relying on the live market to naturally produce proof.
Must cover:
- deterministic replay harness
- ticket-specific scenario tests
- paper / shadow comparisons
- promotion evidence packages

### C5 — Market intelligence lane
Goal: detect event risk and macro/news shocks without allowing unsafe direct execution control.
Must cover:
- event ingestion and tagging
- confidence / freshness scoring
- safe action templates
- event → risk posture mapping

### C6 — Learning and model-risk lane
Goal: AI/ML improves decision quality under measurable gates.
Must cover:
- labeled datasets / feature lineage
- offline evaluation
- shadow score quality
- bounded live influence
- rollback / disable switch

## Program steering rule
At any time:
- one active runtime delivery ticket
- but PM/BA always steers against this roadmap
- if the active ticket is not moving any capability forward, PM/BA must split / pivot / close it
