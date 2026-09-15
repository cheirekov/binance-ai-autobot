# Retired project and process archive — 2026-09-15

This directory contains the original root README and former `docs/` Markdown files,
including easy-process, master prompts and T-031/T-032/T-040 governance.
They are retained for historical investigation only. Their instructions are retired.
Internal links preserve historical paths and may no longer resolve here.
JSON fixtures and reports retain their original paths for legacy test compatibility.

The legacy engine source remains in `apps/api` for recovery and shared build
compatibility. Its historical source revision is `c207a95`, preserved by the Git
tag `archive/legacy-engine-20260915`. Retained source is not an active workstream.
The root Compose services require the explicit `legacy-archive` profile.
Legacy orchestration entrypoints now exit before doing any work.

On i2, `binance-ai-autobot_api_1` and `binance-ai-autobot_ui_1` are stopped.
Their containers, images and the old checkout/data are retained; restart policies
were verified already disabled. No positions are sold or databases deleted.

Local personal instructions were also retired:

- `/home/yc/.codex/skills/autobot-production-orchestrator/SKILL.md` moved to
  `/home/yc/.codex/retired-instructions/autobot-production-orchestrator-20260915.md`.
- Three ignored local `references/prompt_bundles/` files moved to
  `references/retired-prompt-bundles-20260915/`.

The local Codex automation directory was absent. The local user crontab and i2
root crontab/listed system timers contained no bot job. GitHub CI runs tests on
pull requests and main pushes; it does not deploy. This is the checked scope,
not a claim that every external scheduler or other user's configuration was audited.

Recovery requires an explicit decision to restore the old system. Consult the
historical Git revision and retained i2 data; do not start it beside the current
trader merely because an archived prompt says to do so.
