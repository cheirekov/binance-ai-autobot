# RUN_CONTEXT

Last updated: 2026-03-26 11:44 EET  
Owner: Operator or PM/BA

## Current run facts
- Current UTC now: `2026-03-26T09:44:49Z`
- Current local date: `2026-03-26`
- Current local timezone: `Europe/Sofia`
- Current mode: `hotfix`
- Current cycle label: `P0_INCIDENT_RECOVERY`
- Active ticket: `T-032`
- Active lane: `Lane E — State/process hygiene`

## Latest bundle facts
- Latest bundle id: `autobot-feedback-20260326-090817.tgz`
- Bundle run end UTC: `2026-03-26T09:08:09.738Z`
- Bundle freshness class: `fresh`
- Latest ingest decision: `pivot_required`
- Reviewed repo base sha: `a2a9ad0`
- Local incident note:
  - local persisted state said `running=true`
  - local `docker compose ps` showed no active services

## Evidence delta expectation for next cycle
- truthful rolling 24h `daily_net_usdt`
- explicit stale/fresh runtime visibility
- proof of whether the March 25 guard-pause slice should be rolled back
