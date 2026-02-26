# P0 Run Logging Protocol (Single Source of Truth)

Use this exact process for every day/night cycle.  
Do not improvise per session.

## 1) On remote bot server (collect bundle — fully automatic)

Just run:

- `AUTOBOT_COMPOSE_CMD=docker-compose ./scripts/collect-feedback.sh`

Notes:
- No manual phase is required.
- Script auto-infers run cycle (`SHORT_REVIEW` / `DAY_RUN` / `NIGHT_RUN`) from runtime duration.
- If needed, you can still override with `AUTOBOT_RUN_PHASE=...`, but it is optional.

Result: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 2) On local machine (single command)

Preferred fully automatic pull + ingest:

- `./scripts/pull-and-ingest-feedback.sh <remote-host> [remote-repo-dir]`

Example:
- `./scripts/pull-and-ingest-feedback.sh i2 /root/work/binance-ai-autobot`

This command does:
- finds latest bundle on remote,
- copies it via `scp`,
- runs local ingestion.

## 3) Local ingestion details (automatic)

`ingest-feedback` performs:
- bundle sanity check (`run-context`, `last_run_summary`, `info.txt`),
- `update-session-brief.sh`,
- `pmba-gate.sh end`.

## 4) Send to Codex

Post only:
- bundle filename,
- output of `./scripts/pull-and-ingest-feedback.sh ...` (or `ingest-feedback` if you copied manually).

No extra manual edits before Codex review.

## 5) Non-negotiable rules

- Keep one active ticket only (`IN_PROGRESS`).
- No strategy scope change during ingestion.
- No state reset unless ticket explicitly requires it.
- If `pmba-gate.sh end` fails, create triage note first (`docs/TRIAGE_NOTE_TEMPLATE.md`).
