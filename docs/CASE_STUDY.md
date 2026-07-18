# Case Study

## Problem

Prompt and model changes can look better in a few examples while silently regressing safety, grounding, formatting, or a specific user workflow. Without a fixed suite and release policy, review becomes anecdotal.

## Product Decision

EvalDeck uses a deliberately transparent evaluator so every score can be traced to observable fixture evidence. Baseline and candidate outputs remain side by side; aggregate metrics connect to case-level failures; slice deltas prevent a strong average from hiding a weak workflow.

## Workflow

An evaluator reviews a 12-case suite, filters regressions and disagreement, inspects four rubric scores, adjusts release thresholds, and may apply a reasoned human override. The automated gate and human release decision remain separate. JSON and CSV evidence preserve the run locally.

## Distinct Portfolio Evidence

Unlike the foundation products, EvalDeck does not generate an operational recommendation. It evaluates AI outputs themselves. It adds formal evaluation, developer tooling, JSONL dataset handling, pairwise regressions, slice analysis, disagreement, threshold policy, and release governance.

## Responsible Scope

No hosted judge or customer output is used. High-stakes cases are synthetic and test only response boundaries. Deterministic checks are documented as narrow and cannot substitute for expert human evaluation.

## Evidence

- Logic checks for rubrics, pairwise deltas, disagreement, slice metrics, gates, overrides, JSONL errors, CSV, and report boundaries.
- Browser checks for the default blocked gate, reasoned override, passing gate, human approval, chart pixels, filters, two downloads, local import, keyboard access, mobile layout, and load recovery.
- Identical public workflow validation before v1.0.0 release.
