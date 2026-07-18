# EvalDeck Studio

EvalDeck Studio is a developer-facing AI output evaluation and regression workbench. It compares baseline and candidate outputs over a fixed synthetic suite, exposes four transparent rubrics, measures slice regressions and reference disagreement, and keeps release approval with a human evaluator.

[Live demo](https://jubjub-cpu.github.io/evaldeck-studio/) | [Portfolio](https://jubjub-cpu.github.io/gabe-ai-product-portfolio/) | [v1.0.1 release](https://github.com/jubjub-cpu/evaldeck-studio/releases/tag/v1.0.1)

## Business Problem

AI product teams often rely on a few favorable examples when changing prompts or models. That hides safety regressions, format failures, weak slices, and evaluator disagreement. EvalDeck turns release review into a repeatable dataset, rubric, threshold, evidence, override, and decision workflow.

## Target User

AI product engineers, prompt engineers, evaluation specialists, and QA leads.

## Primary Workflow

1. Load the included 12-case synthetic suite or import local JSONL.
2. Compare baseline and candidate outputs side by side.
3. Inspect quality, grounding, safety, and format scores with concrete evidence.
4. Filter regressions, failed rubrics, disagreements, and workflow slices.
5. Configure minimum average, maximum safety regressions, and maximum slice drop.
6. Apply a reasoned human override while preserving the raw score.
7. Approve or block the candidate at a separate human release gate.
8. Download JSON evidence and case-level CSV.

## Evaluation Method

- **Quality:** expected-fact coverage, concision, and filler avoidance.
- **Grounding:** expected-fact coverage plus a source marker when required.
- **Safety:** forbidden-claim checks and a high-risk human-review boundary.
- **Format:** JSON schema fields, bullet structure, required phrases, and word limits.
- Weighted total: 30% quality, 30% grounding, 25% safety, 15% format.
- Reference disagreement: a 20-point or larger gap from the synthetic human reference.

The method is deterministic and explainable. No hosted judge model runs in the static demo.

## Architecture

- `assets/evaluator.mjs`: scoring, pairwise deltas, aggregate and slice metrics, gate checks, JSONL parsing, and export.
- `assets/app.js`: filters, comparison UI, Canvas chart, overrides, release decision, and downloads.
- `data/suite.json`: 12 fictional cases across customer support, high-stakes, developer, policy, format, and summarization slices.
- `tests/evaluator.test.mjs`: rubric, gate, override, import, CSV, and report checks.
- `tests/browser-smoke.mjs`: desktop, mobile, keyboard, chart, gate, override, export, import, failure, and deployed checks.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/CASE_STUDY.md](docs/CASE_STUDY.md).

## Run Locally

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\static-server.ps1 -NodePath "C:\path\to\node.exe"
```

Open `http://127.0.0.1:4182/`.

## Validation

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\validate.ps1 -NodePath "C:\path\to\node.exe"
node .\tests\browser-smoke.mjs
```

Exact evidence is recorded in [docs/VALIDATION.md](docs/VALIDATION.md).

## Accessibility, Privacy, and Security

- Native controls, semantic tables, skip navigation, visible focus, responsive layouts, and reduced motion.
- Synthetic prompts, outputs, policies, and reference scores only.
- Local JSONL remains in browser memory. No model key, customer data, analytics, cookies, backend, or external evaluator.
- Human overrides require evidence and raw scores remain in the exported report.

## Screenshots

![EvalDeck desktop regression workflow](docs/screenshots/evaldeck-regression-desktop.png)

![EvalDeck mobile regression workflow](docs/screenshots/evaldeck-regression-mobile.png)

## Limitations

- String-based checks cannot measure all semantic correctness, nuance, or adversarial behavior.
- Synthetic references are illustrative, not calibrated human evaluation labels.
- Production evaluation should add model-specific datasets, multiple judges, statistical confidence, and protected test-set governance.
