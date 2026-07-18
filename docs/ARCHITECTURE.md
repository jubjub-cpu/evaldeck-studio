# Architecture

EvalDeck Studio is a static local-first browser application with no backend, database, analytics, or hosted model.

## Evaluation Pipeline

1. The fixture suite or a local JSONL file supplies prompt, baseline, candidate, expected facts, forbidden claims, format rules, and synthetic reference scores.
2. `scoreOutput` calculates four transparent rubric scores and retains evidence such as fact coverage, forbidden hits, citation presence, and word count.
3. `evaluateCase` produces pairwise deltas, weighted totals, failed rubrics, safety regressions, and reference disagreement.
4. `evaluateSuite` aggregates rubric averages, workflow slices, pass rate, and configurable regression checks.
5. Human overrides are layered over raw scores with a required reason; both values remain exportable.
6. The human release decision is separate from automated gate output.

## Trust Boundary

All included content is fictional. Local JSONL is parsed in browser memory and never transmitted. JSON and CSV downloads are generated with Blob URLs. The app accepts no API key and cannot deploy a model or change a production release.

## Failure Model

- Suite request failure produces a visible Retry state.
- Invalid or missing JSONL fields produce line-specific errors.
- Approval remains disabled while the configured gate is blocked.
- Override evidence shorter than eight characters fails native validation.

## Deployment

Static files deploy from `main` to GitHub Pages. The same browser suite validates local and deployed behavior.
