# OPERATOR_NOTE

Last updated: 2026-03-26 12:13 EET  
Owner: PM/BA + Codex

## What to run next
- deploy this batch as an engine hotfix, not as a dashboard patch
- do a clean recreate on the target runtime
- keep current `state.json` and config; do not manually wipe state first
- collect one short fresh bundle after 30-90 minutes

## What not to do next
- do not redeploy the prior UI/reporting-only batch and assume runtime recovery
- do not run another long ambiguous bundle before the short hotfix confirmation
- do not manually rollback to `cce2322` unless the next short bundle still shows no runtime change

## What fresh evidence would change the decision
- unchanged `Grid guard paused BUY leg` / `Grid waiting for ladder slot or inventory` counts with no new behavior
- no `grid-guard-defensive-unwind` and no changed decision mix after the hotfix
- any return of dominant quote-funding regression
