# Triage Note — 2026-04-07 — T-031 repeated solo dust sell-leg loop

- Observed:
  - fresh bundle `autobot-feedback-20260407-181242.tgz` keeps `T-031` active; this is not a funding regression and not a `T-032` reopen.
  - the April 7 morning slice helped: the paired `ETHUSDC` dead-end loop dropped from `91` to `31`.
  - the remaining live blocker is narrower but still real: the same residual family keeps repeating pure `Grid sell leg not actionable yet` retries after the paired-loop guard already reduced the buy-pause side.
- Impact:
  - `P2 quality`
- Repro / Evidence bundle:
  - `autobot-feedback-20260407-181242.tgz`
- Proposed fix:
  - keep `T-031` active and re-apply the existing `GRID_SELL_NOT_ACTIONABLE` cooldown after a higher local threshold of repeated solo non-actionable sell-leg skips on the same home-quote dust residual.
- Candidate ticket:
  - `T-031`
