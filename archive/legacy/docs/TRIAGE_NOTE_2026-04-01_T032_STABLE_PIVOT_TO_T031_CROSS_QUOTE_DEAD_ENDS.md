# Triage Note — 2026-04-01 — T-032 stable, pivot to T-031 cross-quote dead ends

- Observed:
  - fresh bundle `autobot-feedback-20260401-150741.tgz` ends `risk_state=NORMAL`, `daily_net_usdt=+129.39`, `max_drawdown_pct=1.88`, with no dominant `CAUTION` freeze.
  - dominant repeats moved to strategy-quality dead ends:
    - `Skip BNBETH: Grid guard paused BUY leg` (`10`)
    - `Skip BNBETH: Grid waiting for ladder slot or inventory` (`8`)
    - `Skip SOLETH: Grid waiting for ladder slot or inventory` (`6`)
    - `Skip SOLBTC: Fee/edge filter (...)` (`6`)
- Impact:
  - `P2 quality`
- Repro / Evidence bundle:
  - `autobot-feedback-20260331-170410.tgz`
  - `autobot-feedback-20260401-083229.tgz`
  - `autobot-feedback-20260401-150741.tgz`
- Proposed fix:
  - freeze `T-032` as support, reactivate `T-031`, and add bounded guarded-sell-ladder rotation logic so parked cross-quote symbols stop consuming candidate cycles.
- Candidate ticket:
  - `T-031`
