# Triage Note — T-034 DOGEBTC insufficient BTC skip loop

## Observed
- Repeated dominant skip loop across consecutive bundles:
  - `Skip DOGEBTC: Insufficient spendable BTC for grid BUY`
- Seen with active multi-quote routing and low free BTC spendable reserve.

## Impact
- `P1` stability

## Evidence bundle
- `autobot-feedback-20260305-154249.tgz`
- previous cycle referenced by ingest gate compare

## Reproduction
- Run `SPOT_GRID` with cross-quote enabled (`T-034`), high risk profile, constrained free BTC quote balance.
- Observe repeated DOGEBTC insufficient-quote BUY skips in decisions.

## Proposed fix
- Add quote-family insufficiency backoff/cooldown escalation so repeated non-home quote shortfall skips rotate to other quote families faster.

## Candidate ticket
- `T-034` (current lane), mitigation slice after current risk-state consistency fix.

## PM/BA decision
- `queue after active ticket`
- Owner: BE + Trader
- Due window: next short (1–3h) `T-034` patch cycle if loop remains dominant after current deploy.
