# EvalDeck Studio Release Notes

## v1.0.1

Hardens deployed browser verification for local JSONL imports.

### Changed

- Waits for the imported two-case list to finish rendering before asserting its size.
- Preserves the complete local and deployed workflow gate without timing-dependent false failures.
- Increases secondary and status text contrast and labels both horizontally scrollable data tables for keyboard access.
- Adds automated axe-core verification at desktop and mobile viewports.

### Validation

- Repository and logic checks passed.
- Local and deployed browser suites passed.
- Local axe-core audit passed with zero violations.
- Privacy and presentation scans passed.

## v1.0.0

EvalDeck Studio v1.0.0 delivers a formal, developer-facing AI output regression workflow.

## Included

- Twelve synthetic cases across six workflow slices.
- Baseline and candidate pairwise comparison.
- Transparent quality, grounding, safety, and format rubrics.
- Aggregate rubric chart, case pass rate, safety regressions, reference disagreement, and slice deltas.
- Configurable average, safety-regression, and slice-drop release checks.
- Reasoned human override that preserves raw scores.
- Separate human approve or block decision with event history.
- Local JSONL import plus JSON and CSV export.
- Logic, repository, desktop, mobile, keyboard, failure, privacy, HTTP, and deployed browser evidence.

## Scope

All cases are synthetic and scoring is deterministic. No hosted model, customer output, API key, or production release action is included.
