# P0 Run Logging Protocol (Single Source of Truth)

Use this exact process for every day/night cycle.  
Do not improvise per session.

## 1) On remote bot server (collect bundle)

Use `docker-compose` v1 and set cycle label explicitly:

- Morning review:
  - `AUTOBOT_COMPOSE_CMD=docker-compose AUTOBOT_RUN_PHASE=MORNING_REVIEW ./scripts/collect-feedback.sh`
- Day run:
  - `AUTOBOT_COMPOSE_CMD=docker-compose AUTOBOT_RUN_PHASE=DAY_RUN ./scripts/collect-feedback.sh`
- Night run:
  - `AUTOBOT_COMPOSE_CMD=docker-compose AUTOBOT_RUN_PHASE=NIGHT_RUN ./scripts/collect-feedback.sh`

Result: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 2) Copy bundle to local machine

- `scp user@remote:/path/to/autobot-feedback-YYYYMMDD-HHMMSS.tgz .`

## 3) On local repo (ingest bundle)

Run one command:

- `./scripts/ingest-feedback.sh autobot-feedback-YYYYMMDD-HHMMSS.tgz`

This performs:
- bundle sanity check (`run-context`, `last_run_summary`, `info.txt`),
- `update-session-brief.sh`,
- `pmba-gate.sh end`.

## 4) Send to Codex

Post only:
- bundle filename,
- output of `./scripts/ingest-feedback.sh ...`.

No extra manual edits before Codex review.

## 5) Non-negotiable rules

- Keep one active ticket only (`IN_PROGRESS`).
- No strategy scope change during ingestion.
- No state reset unless ticket explicitly requires it.
- If `pmba-gate.sh end` fails, create triage note first (`docs/TRIAGE_NOTE_TEMPLATE.md`).
