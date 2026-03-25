# PROMOTION_LADDER

This is the safe path from idea to live influence.

## Levels

### L0 — Concept / hypothesis
Allowed:
- design note
- expected KPI effect
- failure modes
Not allowed:
- live behavior change

### L1 — Offline validation
Allowed:
- replay
- historical slices
- synthetic scenarios
Exit criteria:
- repeatable pass/fail artifact
- no obvious risk-policy violation

### L2 — Paper / simulation
Allowed:
- no-execution scoring
- decision comparison to baseline
Exit criteria:
- measurable uplift on target metric
- no major regression in loss-control metric

### L3 — Shadow live
Allowed:
- live scoring, live recommendations, no execution authority
Exit criteria:
- quality stable across multiple windows / regimes
- token/cost budget acceptable
- confidence calibration documented

### L4 — Bounded live influence
Allowed:
- AI/ML may influence ranking, throttles, or de-risking intensity within hard caps
Not allowed:
- bypass hard stops
- bypass exposure caps
- direct order sizing above policy envelope
Exit criteria:
- objective metric improvement with stable drawdown discipline
- instant rollback path exists

### L5 — Broader live influence
Allowed only after strong evidence across multiple windows/regimes.
Still not allowed:
- self-modifying strategy deployment without offline/shadow gating

## Promotion packet
Every promotion request must include:
- exact level change
- evidence windows
- objective metric change
- risk metric change
- rollback trigger
- operator visibility impact
