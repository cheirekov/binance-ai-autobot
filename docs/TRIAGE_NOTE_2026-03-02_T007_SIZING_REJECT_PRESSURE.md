# Triage Note — 2026-03-02 — Sizing reject pressure during T-007

## Observed
- Skip pressure shifted high while T-007 is active:
  - `sizingRejectSkips=57`,
  - `skips=119`,
  - `sizingRejectSkipPct=47.8992%`,
  - repeated `Below minQty` / `Below minNotional` grid BUY rejects.
- Bundle decision flagged pivot:
  - `Decision=pivot`,
  - `nextTicket=PM/BA-TRIAGE`,
  - `sizingRejectPressure=high`.

## Impact
- `P2` quality (execution efficiency): strategy keeps rotating into non-feasible candidate legs and wastes decision budget.

## Evidence bundle
- `autobot-feedback-20260302-065830.tgz`
- `data/telemetry/baseline-kpis.json` and `data/telemetry/last_run_summary.json` in this bundle.

## Reproduction
- Seen in bundle `autobot-feedback-20260302-065830.tgz` on long-running state without reset.

## Proposed fix
- Move next execution lane to candidate-actionability filtering (`T-030`) so symbols with repeated BUY sizing failures are de-prioritized or temporarily quarantined before selection.

## Candidate ticket
- `T-030` (Universe filter-chain v2 + explainable staged rejection)

## PM/BA decision
- `queue after active ticket`
- Owner: PM/BA + BE
- Due window: next batch after T-007 closeout evidence
