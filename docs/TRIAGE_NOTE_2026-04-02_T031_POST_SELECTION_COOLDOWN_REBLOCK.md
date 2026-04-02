# Triage Note — 2026-04-02 — T-031 post-selection cooldown reblock

- Observed:
  - fresh bundle `autobot-feedback-20260402-162840.tgz` remains `T-031`, not a ticket pivot.
  - the dominant bundle counter is still `Skip: No feasible candidates after policy/exposure filters (31)`, but the latest live decisions have already shifted to per-symbol `GRID_SELL_NOT_ACTIONABLE` cooldown skips such as `STOUSDC` and `XPLUSDC`.
  - this means the prior April 2 selection-time bypass partially worked, but the same cooled dust symbols were still being hard-blocked again by the raw post-selection `isSymbolBlocked(...)` gate before runtime could reuse them.
- Impact:
  - `P2 quality`
- Repro / Evidence bundle:
  - `autobot-feedback-20260402-113357.tgz`
  - `autobot-feedback-20260402-162840.tgz`
- Proposed fix:
  - keep `T-031` active and apply the same bounded dust-cooldown exception at the post-selection execution gate, not only during candidate selection.
- Candidate ticket:
  - `T-031`
