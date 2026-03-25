# LEARNING_AND_MODEL_RISK

## Target
Use ML/AI to improve adaptation without turning the system into an ungoverned black box.

## Learning loop
1. collect structured runtime evidence
2. build labeled datasets
3. evaluate offline candidates
4. run shadow scoring in live conditions
5. compare against baseline
6. promote only with bounded authority and rollback

## Mandatory model-risk controls
- feature lineage documented
- target metric documented
- confidence calibration tracked
- drift checks tracked
- token/cost budget tracked for LLM components
- kill switch exists
- rollback path exists

## What “self-learning” means in this repo
Allowed:
- automated data collection
- automated offline retraining proposals
- automated shadow evaluation
- automated promotion recommendation packet

Not allowed:
- model silently changing live policy by itself
- model shipping its own new live rules without promotion gates
- LLM prose directly changing execution behavior

## Promotion rule
Learning output may propose changes.
Only the orchestrated promotion ladder may approve live influence.
