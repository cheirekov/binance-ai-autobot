# Binance Autobot Hardening v4

This pack hardens the easy-process workflow against the two biggest LLM failure modes:
- **context window loss** across many cycles,
- **time/cycle ambiguity** when a new model starts from a fresh chat.

The goal is simple:
**the project must remember itself; the LLM must not be asked to remember it.**

## What this pack adds
This pack extends the small living-file process with three mandatory continuity files:

1. `docs/easy_process/RUN_CONTEXT.md`
   - explicit current time, cycle, bundle freshness, active mode
   - prevents day/time guessing
2. `docs/easy_process/DECISION_LEDGER.md`
   - compact append-only log of important decisions
   - prevents losing the reasoning trail between cycles
3. `docs/easy_process/NEXT_CYCLE_HANDOFF.md`
   - strict handoff contract from one cycle to the next
   - prevents drift when models change or chats restart

It also updates the onboarding prompt so every new LLM reads these files first.

## Design principles
1. **Chat is disposable.** The repo is the memory.
2. **Time must be declared, not inferred.**
3. **Every batch must leave a handoff.**
4. **Important decisions must be append-only.**
5. **Raw state is forensic evidence, not default context.**

## Drop-in location
Copy these files into your repo:
- `docs/easy_process/`
- `references/prompt_bundles/autobot_existing_master.md`

## Minimal operator flow
1. Collect and ingest the latest bundle as you already do.
2. Update only these small files:
   - `RUN_CONTEXT.md`
   - `BUNDLE_DIGEST.md`
   - `STATE_DIGEST.md`
   - `ACTIVE_TICKET.md` (only if changed)
   - append one entry to `DECISION_LEDGER.md`
   - write `NEXT_CYCLE_HANDOFF.md`
3. Start a new model with only this prompt:

```text
Follow instructions in `references/prompt_bundles/autobot_existing_master.md`
and write the requested outputs.
```

## The 8 files that matter most
1. `PROGRAM_STATUS.md`
2. `ACTIVE_TICKET.md`
3. `RUN_CONTEXT.md`
4. `BUNDLE_DIGEST.md`
5. `STATE_DIGEST.md`
6. `VALIDATION_LEDGER.md`
7. `DECISION_LEDGER.md`
8. `NEXT_CYCLE_HANDOFF.md`

## Keep using from the repo
This pack is additive. Keep the repo's existing process docs authoritative for deeper rules and scripts.
