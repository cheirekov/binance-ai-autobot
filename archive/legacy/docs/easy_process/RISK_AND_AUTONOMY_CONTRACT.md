# RISK_AND_AUTONOMY_CONTRACT

## Risk slider intent
The risk slider is not a cosmetic setting.
It is the main operator contract for how aggressive the bot may be.

Risk slider should control at least:
- max total portfolio exposure
- max per-position exposure
- reserve floor / stable bias
- cooldown intensity
- de-risking urgency
- confirmation strictness

## AI autonomy intent
AI autonomy is separate from risk.
A low-risk / high-AI setting is allowed only if AI remains inside the same hard risk envelope.

AI autonomy levels:
- `0`: off
- `1-30`: shadow only
- `31-60`: bounded ranking / throttles / de-risk hints
- `61-100`: broader influence only after promotion gates

## Hard invariant
AI autonomy never overrides hard risk policy.
If the two conflict, risk policy wins.
