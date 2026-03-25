# TRIAGE NOTE: T-032 Grid Guard Paused BUY Leg Loop

Date: 2026-03-25  
Ticket: T-032  
Severity: P2 Quality  
Status: OPEN  

## Problem Statement
Dominant loop reason "Skip BTCUSDC: Grid guard paused BUY leg" repeated in last 2 fresh bundles for active ticket T-032 with count 17 -> 17, indicating a stuck behavior where the bot is repeatedly encountering the same grid guard condition without progression.

## Evidence
- Bundle: autobot-feedback-20260325-195431.tgz
- Cycle: NIGHT_RUN
- Run end UTC: 2026-03-25T19:54:09.822Z
- Sizing reject pressure: medium
- Loop count: "Skip BTCUSDC: Grid guard paused BUY leg" (17 -> 17)

## Impact
- Blocks effective execution of T-032 (Exit manager v2) objectives
- Creates inefficient loop where bot repeatedly encounters same condition
- Prevents proper validation of defensive grid guard unwind behavior
- Wastes computational resources on repetitive skip decisions

## Root Cause Analysis
The grid guard mechanism is pausing BUY legs for BTCUSDC, but the bot is repeatedly selecting this symbol and encountering the same guard condition without making progress. This suggests either:
1. The underlying market conditions triggering the grid guard remain constant
2. The bot lacks proper rotation/cool-down logic when encountering persistent grid guards
3. The defensive grid guard logic in T-032 is creating a dead-end condition

## Proposed Resolution
1. Add symbol-level cooldown when grid guard pauses BUY leg to prevent repeated selection of same symbol
2. Implement proper rotation logic to alternative symbols when grid guard is active
3. Review T-032 defensive grid guard logic to ensure it doesn't create stuck conditions

## Decision Required
PM/BA decision needed: Should this be addressed as a patch mitigation to T-032 or does this require a pivot to a different ticket given the repeated loop pattern?

## Batch Decision (2026-03-25 20:38 UTC)
- `PROCESS_STATE_CONFLICT`: `true` before this batch because easy-process files still reflected the older March 24 validation-only state
- Chosen action: `PATCH_NOW`
- Ticket decision: `patch_same_ticket`
- Implemented in this batch:
  - repeated `Grid guard paused BUY leg` now participates in skip-storm handling
  - a repeated guard-pause no-action tick now persists a symbol cooldown so the bot rotates away instead of immediately reselecting the same symbol
- Pending proof:
  - targeted Docker validation
  - next fresh runtime bundle after deployment
