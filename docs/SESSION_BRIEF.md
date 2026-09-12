# Session Brief

Last updated: 2026-09-12 09:38 UTC
Owner: PM/BA + Codex

## 1) Batch Contract

- Batch type: `IMPLEMENTATION`
- Active ticket: `T-026` (Offline calibration runner)
- Linked support ticket: `none`
- Goal: build deterministic walk-forward strategy calibration so progress does not depend on the current Binance market window.
- In scope: replay fixtures, train/validation separation, after-fee expectancy, drawdown, candidate comparison, and promotion thresholds.
- Out of scope: tuning from one bundle, weakening risk controls, real-money deployment, or another T-031/T-032/T-040 runtime patch.
- Live evidence policy: bundles are supporting datasets; only a reproduced P0/P1 safety failure may interrupt T-026.

## 2) Definition Of Done

- `docs/DELIVERY_BOARD.md` has exactly one `IN_PROGRESS` ticket: `T-026`.
- deterministic calibration produces a repeatable machine-readable report.
- candidate selection uses separate calibration and validation windows.
- a candidate cannot pass unless after-fee expectancy and drawdown improve without reducing SELL/unwind reachability.
- `./scripts/validate-active-ticket.sh` and `./scripts/pmba-gate.sh end` pass.

## 3) Deployment Handoff

- Commit hash: `c207a95`
- Deploy target: none for this calibration batch; keep the existing testnet deployment running.
- Required config changes: none.
- Operator action: do not reset data and do not redeploy; the accepted T-026 candidate is for shadow-only review.

## 4) End-of-batch result (fill after run)

- Run context:
  - window (local): `DAY (collection) / DAY (run end)`
  - timezone: `Europe/Sofia`
  - bundle interval (hours): `288.911`
  - runtime uptime (hours): `3691.582`
  - run end: `Sat Sep 12 2026 12:37:19 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `DAY_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip BTCUSDC: Risk budget blocked new exposure (13))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=51, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=74.6%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `validation_required`
- Next ticket candidate: `T-026` (stop live-wait loop and use deterministic validation)
- Required action: `continue deterministic calibration/replay; live-market churn is supporting evidence and cannot require a runtime patch`
- Open risks:
  - `牛来USDC` produced eight testnet unknown-symbol health errors. This is logged for separate P0/P1 triage; it does not interrupt T-026 or authorize a runtime patch without deterministic reproduction.
- Notes for next session:
  - bundle: `autobot-feedback-20260912-093754.tgz`
  - offline result: the fixed liquid-core September cutoff rejected the previous selector (`-1.70%` after fees, `2/12` profitable); four-cutoff gate is `WALK_FORWARD_REJECTED`, while SELL reachability remains `48/48` and selected drawdown remains no worse than buy-and-hold.
  - auto-updated at: `2026-09-12T09:38:15.489Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-026
Decision: validation_required
Required action: continue deterministic calibration/replay; live-market churn is supporting evidence and cannot require a runtime patch
Latest bundle: autobot-feedback-20260912-093754.tgz
Fresh runtime evidence: yes (fresh)
Goal: improve strategy selection and parameters through deterministic replay and walk-forward calibration.
Live evidence policy: bundles are supporting inputs, never an automatic request for another runtime patch.
In scope: fixtures, replay metrics, train/validation splits, candidate comparison, and promotion thresholds.
Out of scope: tuning from one market window, weakening risk controls, or claiming profitability from testnet alone.
Validation: ./scripts/validate-active-ticket.sh && ./scripts/pmba-gate.sh end
After implementation: record the executable report and the next bounded calibration hypothesis.
```
