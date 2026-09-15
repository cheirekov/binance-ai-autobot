# Triage Note — 2026-04-20 — T-032 linked support for profit-giveback HALT anchored by consumed base inventory

## Observed
- Latest fresh bundle (`autobot-feedback-20260420-145411.tgz`) still fails the repeated-loop gate after the April 20 `T-031` quote-pressure quarantine deploy.
- The deployed commit is `47693bb`.
- Runtime has moved into a coupled blocker:
  - `risk_state=HALT`
  - `trigger=PROFIT_GIVEBACK`
  - `unwind_only=true`
  - `activeOrders=0`
  - `managedExposure=9.2%`
  - `haltExposureFloor=8.0%`
- Dominant skip is still `Skip: No feasible candidates after policy/exposure filters` (`38`), and the latest rejection samples remain non-home quote spendable exhaustion (`BTC`, `ETH`, `BNB`) with recovery still failing on `Below minQty 1.00000000`.
- Latest decisions show repeated `Skip: Daily loss HALT (profit giveback ...)`, but no fresh unwind trade actually fires.

## Impact
- `P1` validation blocker for the active lane.
- The April 20 `T-031` patch reduced quote-pressure churn, but `PROFIT_GIVEBACK` HALT is still being held open by managed exposure that is no longer actually unwindable because the base asset was already spent into quote-funded inventory elsewhere.

## Evidence bundle
- `autobot-feedback-20260420-083837.tgz`
- `autobot-feedback-20260420-145411.tgz`

## Proposed fix
- Keep `T-031` active.
- Open a bounded linked-support `T-032` slice so daily-loss managed exposure only counts base inventory still present in balances.
- Preserve the April 20 quote-pressure quarantine, April 17 dust cooldown, April 15 fee-edge quarantine, and March 30-31 / April 12 downside-control thaw behavior.

## Candidate ticket
- Active ticket remains: `T-031`
- Linked support used now: `T-032`

## PM/BA decision
- `interrupt active ticket`: no
- Same-batch linked-support mitigation under `T-032`
- Owner: PM/BA + Codex
- Due window: before next long run
