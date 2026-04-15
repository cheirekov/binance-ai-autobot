# Triage Note — 2026-04-15 — T-031 global fee-edge quarantine rotation

## Observed
- Latest fresh bundle (`autobot-feedback-20260415-164608.tgz`) reports `patch_required` while PM/BA gate passes.
- The residual dust storm blocker from the April 15 morning slice is no longer dominant.
- Runtime has active `REASON_QUARANTINE:FEE_EDGE`, but decisions still rotate through fresh non-home-quote fee-edge skips such as `XRPETH`, `BNBETH`, `TRXETH`, and `LTCETH`.

## Impact
- `P2` quality.
- The engine is alive and trading history is present, but candidate-quality routing wastes decision cycles on cross-quote candidates already covered by global fee-edge evidence.

## Evidence bundle
- `autobot-feedback-20260415-164608.tgz`
- Compared with `autobot-feedback-20260415-072942.tgz`

## Reproduction
- Seen in bundle `autobot-feedback-20260415-164608.tgz`.
- Active global `FEE_EDGE` quarantine exists while fresh cross-quote symbols with no local fee-edge history still enter selection and fail the same fee-edge gate.

## Proposed fix
- Keep `T-031` active and make global `FEE_EDGE` quarantine suppress fresh non-home-quote grid candidates that have no actionable sell leg, while preserving home-quote and managed sell-leg candidates.

## Candidate ticket
- Existing ticket: `T-031`
- Linked support preserved: `T-032`

## PM/BA decision
- `interrupt active ticket`: no
- Same-ticket mitigation under `T-031`
- Owner: PM/BA + Codex
- Due window: before next long run
