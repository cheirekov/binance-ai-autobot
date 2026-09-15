# NORTH_STAR_PRODUCTION

## Final target
Build a **professional adaptive Binance bot** that:
- grows capital on a **risk-adjusted** basis,
- protects the wallet before chasing upside,
- adapts across different market regimes,
- uses AI/ML as a **gated advantage layer**, not as uncontrolled live mutation,
- remains auditable, reproducible, and rollback-safe.

## What “professional” means here
The bot is considered professional only if all are true:
1. **Capital protection first**
   - hard drawdown and exposure guardrails exist
   - loss containment works without operator intervention
2. **Adaptation is measured, not guessed**
   - strategy changes are validated on replay / backtest / paper / shadow before broader live influence
3. **News/event awareness is bounded**
   - external signals can reduce risk or bias candidate ranking
   - no prose or headline may directly bypass hard risk controls
4. **Learning is staged**
   - data collection → offline learning → shadow scoring → bounded live influence → wider promotion
5. **Operational trust exists**
   - state is compact enough to inspect
   - runtime decisions are explainable
   - incidents are triaged deterministically

## Explicit non-goals
- no uncontrolled self-modifying live strategy
- no “one bullish run = success” logic
- no patching from stale bundles alone
- no AI freedom above hard risk/policy limits

## Success measures
Use these top-line measures:
- expectancy improvement
- drawdown reduction / loss containment
- lower adverse high-allocation persistence
- stable guardrail behavior
- promotion evidence quality

## Program rule
A batch is only “good” if it moves one of the production capabilities forward, not only the current symptom.
