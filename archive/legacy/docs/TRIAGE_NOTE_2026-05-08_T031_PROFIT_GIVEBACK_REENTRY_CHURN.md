# Triage Note — 2026-05-08 — T-031 Profit-Giveback Re-entry Churn

## Summary

The May 7 reachability patch worked: the May 8 bundle shows managed inventory was actively unwound and large `SOLUSDC`/`ZECUSDC` exposure no longer dominated. The new blocker is re-entry churn: after profit-giveback protection de-risked exposure below the hard-halt floor, `CAUTION` allowed fresh grid buys again while daily PnL/giveback was still damaged.

## Evidence

- Bundle: `autobot-feedback-20260508-081302.tgz`
- Runtime commit: `525b6cd`
- Risk state: `HALT`
- Trigger: `PROFIT_GIVEBACK`
- Wallet/equity: `6080.94 USDC`
- Daily net: `-136.89 USDC`
- Trades: `70`
- Orders: `200 submitted`, `132 filled`, `68 canceled`, `0 active`
- Fees: `17.23 USDC`
- Top skip: `Skip: No feasible candidates after policy/exposure filters (34)`
- Runtime tail shows repeated fresh/reopened grid buys after daily-loss/profit-giveback unwind, including `NILUSDC`, `TONUSDC`, `JTOUSDC`, `ONDOUSDC`, `SUIUSDC`, `DYDXUSDC`, and `CHIPUSDC`.

## Decision

Patch in the same `T-031` lane. Profit-giveback `CAUTION` must be a re-entry freeze, not permission to restart fresh grid buying because exposure became smaller. Existing managed exits/unwinds remain allowed.

## Mitigation

- Keep fresh symbols paused while profit-giveback `CAUTION` is still active.
- Also keep fresh symbols paused when profit-giveback `CAUTION` has negative daily realized PnL.
- Preserve managed-position evaluation and all hard guardrails.

## Runtime Validation

Collect a fresh 1–3h bundle after deploy. Expected signal: no fresh grid BUY reopen cycle while `trigger=PROFIT_GIVEBACK` and `state=CAUTION/HALT`; managed exits remain visible if exposure exists.
