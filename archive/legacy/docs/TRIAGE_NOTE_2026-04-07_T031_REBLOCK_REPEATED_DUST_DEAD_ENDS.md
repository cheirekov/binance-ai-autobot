# Triage Note — 2026-04-07 — T-031 repeated dust dead-end loop

- Observed:
  - fresh bundle `autobot-feedback-20260407-055241.tgz` keeps `T-031` active; this is not a funding regression and not a `T-032` reopen.
  - the broad `No feasible candidates after policy/exposure filters` deadlock remains fixed.
  - the new dominant loop is a paired home-quote dust dead-end on `ETHUSDC`:
    - `Skip ETHUSDC: Grid sell leg not actionable yet (91)`
    - `Skip ETHUSDC: Grid guard paused BUY leg (91)`
- Impact:
  - `P2 quality`
- Repro / Evidence bundle:
  - `autobot-feedback-20260407-055241.tgz`
- Proposed fix:
  - keep `T-031` active and re-apply the existing `GRID_SELL_NOT_ACTIONABLE` cooldown for home-quote dust residuals once the same symbol repeatedly hits both the non-actionable sell-leg path and the grid-guard buy-pause path inside the local loop window.
- Candidate ticket:
  - `T-031`
