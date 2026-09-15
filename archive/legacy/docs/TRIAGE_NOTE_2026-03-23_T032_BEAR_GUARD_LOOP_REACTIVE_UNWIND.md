# Triage Note — 2026-03-23 — T-032 repeated bear-guard loop

- Observed:
  - `autobot-feedback-20260323-102308.tgz` failed PM/BA gate on repeated `Skip BTCUSDC: Grid guard paused BUY leg` (`17 -> 17` across the latest two bundles).
  - The same bundle also shows paired `Grid waiting for ladder slot or inventory` on `BTCUSDC` and `SOLUSDC`, with wallet/equity still around `~7100 USDC`.
- Impact:
  - `P1 stability` and `P1 strategy-quality`
- Repro / Evidence bundle:
  - `autobot-feedback-20260323-102308.tgz`
  - `autobot-feedback-20260323-074326.tgz`
- Proposed fix:
  - add a controlled defensive market-unwind path for repeated bear-trend buy-pause loops on home-quote inventory, instead of only re-posting passive sell ladders or re-logging pauses.
- Candidate ticket:
  - `T-032`
