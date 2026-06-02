# AI_ORCHESTRATION

Last updated: 2026-05-28 12:15 UTC
Owner: PM/BA + Codex

Purpose: make AI work cheaper, smaller, and more production-directed.

## Default Agent Contract

Future agents must start from the compact working set:
1. `docs/DELIVERY_BOARD.md`
2. `docs/SESSION_BRIEF.md`
3. `docs/TICKET_SWITCH_RETRO.md`
4. `docs/RETROSPECTIVE_AUTO.md`
5. `docs/PM_BA_CHANGELOG.md`
6. `docs/easy_process/T040_BETA_READINESS_PACKET.md`
7. `docs/easy_process/T040_VALIDATION_MAP.md`
8. `docs/easy_process/REFERENCE_STRATEGY_ADOPTION.md` when strategy/reference work is requested

Do not load old triage notes, historical easy-process files, or full changelog sections unless the current task asks for history.

## Skill Use

Use the local Codex skill:

`/home/yc/.codex/skills/autobot-production-orchestrator/SKILL.md`

The skill exists to stop future sessions from converting live-market noise into another same-ticket trading patch.

## Subagent Use

Use subagents only for bounded audits with a clear artifact.
| Subagent role | Input | Output |
| --- | --- | --- |
| Runtime Analyst | latest feedback bundle + retro | severity classification and evidence summary |
| Validation Engineer | tests + validation map | missing deterministic scenarios |
| Trader/Safety Reviewer | risk docs + state evidence | safety invariant concerns |
| Release Manager | beta packet + deployment docs | release/rollback checklist gaps |
| Reference Auditor | `references/` + license notes | clean-room strategy candidates and license constraints |

The main agent remains responsible for final integration and validation.

## MCP / Connector Use

- Use local files first for project truth.
- Use GitHub connector only for repository, PR, issue, or CI work.
- Use OpenAI docs MCP only for current OpenAI API or Codex platform questions.
- Do not browse or call external tools to justify trading decisions unless the task explicitly requires current external facts.
- For direct reference-code copying, check `docs/REFERENCE_PERMISSION_NOTES.md` first.

## Token Budget Rule

One bundle cycle should not become a full archaeology session.

Default limit:
- read compact working set.
- classify severity.
- run mapped validation.
- update only current memory files.

Escalate to broader history only when:
- a P0/P1 incident appears.
- an active-ticket contradiction appears.
- a production promotion decision is being made.
- a deterministic validation gap requires older context.

## Output Classes

Use one of these outputs:
- `NO_CODE`: docs or decision only.
- `VALIDATION_ONLY`: evidence, tests, fixtures, gates, runbook.
- `PATCH_ALLOWED`: runtime code change allowed because severity and reproduction are proven.
- `PROMOTION_PACKET_ONLY`: production/beta approval artifact.
- `REFERENCE_STRATEGY_ADOPTION`: clean-room strategy extraction, validation fixtures, and shadow-first implementation.

If none fits, default to `VALIDATION_ONLY`.
