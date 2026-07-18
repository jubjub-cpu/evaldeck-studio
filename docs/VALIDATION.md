# Validation Evidence

## v1.0.1 hardening

Validated on July 18, 2026.

- Stabilized the deployed JSONL-import assertion by waiting for the rendered case list, not only the earlier suite-label update.
- Repository, logic, local browser, and deployed browser checks passed.
- Desktop, mobile, keyboard, import, export, override, recovery, console, request, and privacy checks remain covered.

## Local release candidate

Validated on July 18, 2026 before v1.0.0 publication.

- Repository validator: passed. Checked required files, 12 cases, six slices, synthetic-data boundaries, privacy patterns, accessibility hooks, and evaluation logic.
- Logic suite: passed. Covered four rubrics, pairwise deltas, weighted totals, reference disagreement, slice metrics, safety regressions, configurable gates, reasoned overrides, JSONL parsing and errors, CSV output, and report boundaries.
- Desktop browser: passed at 1440 x 1000. Confirmed the default blocked gate, regression filter, false-positive safety override with retained raw evidence, passing gate, human approval, nonblank rubric chart, JSON and CSV downloads, and two-case local JSONL import.
- Mobile browser: passed at 390 x 844 with no document overflow.
- Keyboard path: passed. The skip link receives focus first and moves focus to the evaluation workspace.
- Loading failure: passed. A failed suite request produces a visible recovery state and Retry control.
- Browser health: zero console errors and zero failed normal requests.
- Privacy scan: passed. No personal email address, API key, GitHub token, private key, customer output, model credential, or production data is present.
- Local axe-core audit: passed at desktop and mobile viewports with zero violations.

## Visual evidence

- `docs/screenshots/evaldeck-regression-desktop.png`: 1440 x 2249 full-workflow desktop capture.
- `docs/screenshots/evaldeck-regression-mobile.png`: 390 x 5542 full-workflow mobile capture.

## Deployment verification

Verified on July 18, 2026 at `https://jubjub-cpu.github.io/evaldeck-studio/`.

- GitHub Pages build: passed.
- Deployed browser suite: passed with the same 12-case, four-rubric, blocked-gate, override, approval, chart, filter, JSON, CSV, JSONL import, keyboard, and recovery checks as local.
- Deployed browser health: zero console errors and zero failed normal requests.
- Deployed axe-core audit: passed at desktop and mobile viewports with zero violations.
- Public page and 12-case suite: HTTP 200.
- Published page title: `EvalDeck Studio | AI Regression Workbench`.
- Published commit identity: author and committer use the GitHub no-reply address.
