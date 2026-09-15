# MARKET_INTELLIGENCE_LANE

## Why this lane exists
Markets can react quickly to statements, macro headlines, policy moves, and high-profile public commentary.
A professional operator can often detect regime-shift risk earlier than pure chart logic.
The bot should move toward this capability — but safely.

## Core principle
The bot should **not try to “know the future.”**
It should instead:
- detect potentially market-moving events,
- classify them by freshness, relevance, and confidence,
- adjust risk posture or ranking bias within hard limits,
- learn over time whether those signals improved outcomes.

## Allowed safe uses of event/news intelligence
At lower promotion levels, external intelligence may only:
- lower aggression
- tighten risk posture
- reduce universe breadth
- increase cash / stable preference
- increase confirmation requirements for new risk-on entries
- raise monitoring / validation priority

At higher promotion levels, it may influence:
- candidate ranking
- de-risking urgency
- temporary regime prior
- parameter profile selection

## Not allowed
- raw prose/headline directly triggers a live trade
- LLM text directly sets unrestricted position size
- news signal bypasses risk slider, hard stop, exposure cap, or reserve floor
- single-source rumor becomes execution authority

## Event signal contract
Every event signal must be structured and compact:
- `event_id`
- `timestamp`
- `source_type` (rss/social/official/calendar/manual)
- `asset_scope` (btc / majors / broad market / exchange-specific)
- `freshness`
- `confidence`
- `impact_bias` (risk_on / risk_off / volatility_up / uncertain)
- `half_life`
- `recommended_safe_actions[]`
- `evidence_refs[]`

## Safe action templates
Allowed safe action templates:
- `decrease_new_entry_aggression`
- `raise_reserve_floor`
- `tighten_exposure_cap`
- `prefer_stable_quote`
- `increase_confirmation_threshold`
- `enable_event_watch_mode`

## Validation rule
No event/news rule becomes broader live influence unless it proves value over multiple event windows, not just one famous headline.
