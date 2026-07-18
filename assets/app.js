import { RUBRICS, buildEvaluationRecord, evaluateSuite, parseJsonl, resultsToCsv } from "./evaluator.mjs";

const workspace = document.querySelector("#workspace");
const state = { suiteName: "", cases: [], selectedId: null, overrides: {}, thresholds: { minScore: 78, maxSafetyRegressions: 0, maxSliceDrop: 5 }, evaluation: null, decision: null, events: [], filters: { slice: "all", state: "all" } };
const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const fmt = (value) => Number(value).toFixed(1);

function shell() {
  workspace.innerHTML = `<div class="studio-shell">
    <aside class="case-rail" aria-labelledby="case-heading">
      <div class="rail-heading"><p class="eyebrow">Evaluation dataset</p><h1 id="case-heading">Test cases</h1><p id="suite-label"></p></div>
      <div class="filter-grid"><label for="slice-filter">Slice<select id="slice-filter"></select></label><label for="state-filter">Result<select id="state-filter"><option value="all">All cases</option><option value="regression">Regressions</option><option value="disagreement">Disagreements</option><option value="failed">Failed rubrics</option></select></label></div>
      <div id="case-list" class="case-list"></div>
      <label class="import-control" for="jsonl-import"><span>Import local JSONL</span><small>Replaces the current in-memory suite</small></label><input id="jsonl-import" type="file" accept=".jsonl,application/json,text/plain"><p id="import-error" class="import-error" role="alert"></p>
      <p class="privacy-note">Synthetic content only. Import stays in browser memory; no model key, prompt, output, or decision is transmitted.</p>
    </aside>
    <section class="workbench" aria-labelledby="workbench-title">
      <div class="workbench-heading"><div><p class="eyebrow">Candidate regression run</p><h2 id="workbench-title">EvalDeck Studio</h2><p>Baseline and candidate outputs scored with transparent deterministic rubrics.</p></div><div class="export-actions"><button id="export-json" class="secondary" type="button">JSON report</button><button id="export-csv" class="secondary" type="button">Cases CSV</button></div></div>
      <div id="summary-strip" class="summary-strip"></div>
      <div class="overview-grid">
        <section class="chart-panel" aria-labelledby="chart-heading"><div class="panel-heading"><div><p class="eyebrow">Aggregate evidence</p><h3 id="chart-heading">Rubric comparison</h3></div><span>Baseline vs candidate</span></div><canvas id="rubric-chart" width="760" height="340" aria-label="Baseline and candidate rubric averages"></canvas><div class="legend"><span><i class="baseline"></i>Baseline</span><span><i class="candidate"></i>Candidate</span></div></section>
        <section class="gate-panel" aria-labelledby="gate-heading"><div class="panel-heading"><div><p class="eyebrow">Regression policy</p><h3 id="gate-heading">Release gate</h3></div><span id="gate-status" class="status"></span></div><div id="gate-controls"></div><div id="gate-checks" class="gate-checks"></div></section>
      </div>
      <section class="review-section" aria-labelledby="review-heading"><div class="panel-heading"><div><p class="eyebrow">Pairwise evaluator</p><h3 id="review-heading">Case review</h3></div><span id="case-meta"></span></div><div id="case-prompt" class="case-prompt"></div><div class="output-grid"><article><div class="output-heading"><span>Baseline</span><strong id="baseline-total"></strong></div><pre id="baseline-output"></pre></article><article><div class="output-heading candidate"><span>Candidate</span><strong id="candidate-total"></strong></div><pre id="candidate-output"></pre></article></div><div class="rubric-table-wrap"><table class="rubric-table"><thead><tr><th>Rubric</th><th>Baseline</th><th>Candidate</th><th>Delta</th><th>Reference delta</th><th>Evidence</th></tr></thead><tbody id="rubric-rows"></tbody></table></div>
        <div class="override-panel"><div><p class="eyebrow">Human override</p><h4>Adjust one candidate rubric</h4><p>An evaluator must provide a reason; raw deterministic scores remain in the exported record.</p></div><label for="override-rubric">Rubric<select id="override-rubric">${RUBRICS.map((rubric) => `<option value="${rubric}">${rubric}</option>`).join("")}</select></label><label for="override-score">Score<input id="override-score" type="number" min="0" max="100" value="80"></label><label class="reason" for="override-reason">Reason<input id="override-reason" type="text" maxlength="180" placeholder="Evidence for the override"></label><button id="apply-override" type="button">Apply override</button></div>
      </section>
      <section class="slice-section" aria-labelledby="slice-heading"><div class="panel-heading"><div><p class="eyebrow">Slice health</p><h3 id="slice-heading">Performance by workflow</h3></div><span>Weighted total</span></div><div class="table-wrap"><table><thead><tr><th>Slice</th><th>Cases</th><th>Baseline</th><th>Candidate</th><th>Delta</th></tr></thead><tbody id="slice-rows"></tbody></table></div></section>
      <section class="decision-section" aria-labelledby="decision-heading"><div><p class="eyebrow">Human release gate</p><h3 id="decision-heading">Candidate decision</h3><p>Automated checks inform release review; a human evaluator owns the decision and any override.</p><p id="decision-summary" class="decision-summary">No release decision recorded.</p></div><div class="decision-actions"><button id="approve-candidate" type="button">Approve candidate</button><button id="block-candidate" class="return" type="button">Block candidate</button></div></section>
      <section class="event-section" aria-labelledby="event-heading"><div class="panel-heading"><div><p class="eyebrow">Audit evidence</p><h3 id="event-heading">Evaluation log</h3></div></div><ol id="event-list"></ol></section>
    </section></div>`;
}

function selectedCase() { return state.cases.find((item) => item.id === state.selectedId) || state.cases[0]; }
function selectedResult() { return state.evaluation.results.find((item) => item.id === selectedCase().id); }

function addEvent(message) { state.events.push(message); document.querySelector("#event-list").innerHTML = state.events.map((event) => `<li>${esc(event)}</li>`).join(""); }

function recalculate(log = true) {
  state.evaluation = evaluateSuite(state.cases, state.overrides, state.thresholds);
  state.decision = null;
  renderAll();
  if (log) addEvent(`Regression gate recalculated: candidate ${fmt(state.evaluation.summary.candidateAverage)}, ${state.evaluation.summary.gatePass ? "pass" : "blocked"}.`);
}

function renderAll() { renderSummary(); renderCases(); renderGate(); renderReview(); renderSlices(); drawChart(); renderDecision(); }

function renderSummary() {
  const s = state.evaluation.summary;
  document.querySelector("#summary-strip").innerHTML = `<div><span>Candidate score</span><strong>${fmt(s.candidateAverage)}</strong><small>${s.delta >= 0 ? "+" : ""}${fmt(s.delta)} vs baseline</small></div><div><span>Case pass rate</span><strong>${Math.round(s.passRate * 100)}%</strong><small>70+ weighted score</small></div><div><span>Safety regressions</span><strong>${s.safetyRegressions}</strong><small>candidate below baseline</small></div><div><span>Disagreements</span><strong>${s.disagreements}</strong><small>20+ point reference gap</small></div><div><span>Gate</span><strong>${s.gatePass ? "PASS" : "BLOCK"}</strong><small>policy checks</small></div>`;
}

function renderCases() {
  const slices = [...new Set(state.cases.map((item) => item.slice))];
  const sliceFilter = document.querySelector("#slice-filter");
  const current = state.filters.slice;
  sliceFilter.innerHTML = `<option value="all">All slices</option>${slices.map((slice) => `<option value="${slice}">${esc(slice)}</option>`).join("")}`;
  sliceFilter.value = slices.includes(current) ? current : "all";
  const filtered = state.cases.filter((testCase) => {
    const result = state.evaluation.results.find((item) => item.id === testCase.id);
    const sliceMatch = state.filters.slice === "all" || testCase.slice === state.filters.slice;
    const stateMatch = state.filters.state === "all" || (state.filters.state === "regression" && result.delta < 0) || (state.filters.state === "disagreement" && result.hasDisagreement) || (state.filters.state === "failed" && result.failedRubrics.length);
    return sliceMatch && stateMatch;
  });
  document.querySelector("#case-list").innerHTML = filtered.length ? filtered.map((testCase) => {
    const result = state.evaluation.results.find((item) => item.id === testCase.id);
    const label = result.safetyRegression ? "safety" : result.delta < 0 ? "regression" : result.hasDisagreement ? "review" : "pass";
    return `<button class="case-button" type="button" data-case="${testCase.id}" aria-pressed="${testCase.id === state.selectedId}"><span>${esc(testCase.slice)} / ${testCase.id}</span><strong>${esc(testCase.prompt)}</strong><small class="${label}">${label} / ${result.candidateTotal}</small></button>`;
  }).join("") : '<p class="empty">No cases match these filters.</p>';
}

function renderGate() {
  const controls = [
    ["minScore", "Minimum average", 50, 100, 1],
    ["maxSafetyRegressions", "Max safety regressions", 0, 5, 1],
    ["maxSliceDrop", "Max slice drop", 0, 25, 1],
  ];
  document.querySelector("#gate-controls").innerHTML = controls.map(([key, label, min, max, step]) => `<label for="${key}"><span>${label}<output id="${key}-value">${state.thresholds[key]}</output></span><input id="${key}" data-threshold="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${state.thresholds[key]}"></label>`).join("");
  const status = document.querySelector("#gate-status"); status.className = `status ${state.evaluation.summary.gatePass ? "pass" : "block"}`; status.textContent = state.evaluation.summary.gatePass ? "Pass" : "Blocked";
  document.querySelector("#gate-checks").innerHTML = state.evaluation.summary.checks.map((check) => `<div class="gate-check ${check.pass ? "pass" : "fail"}"><span>${check.pass ? "PASS" : "FAIL"}</span><p>${esc(check.label)}</p><strong>${fmt(check.actual)}</strong></div>`).join("");
}

function renderReview() {
  const testCase = selectedCase(); const result = selectedResult();
  document.querySelector("#case-meta").textContent = `${testCase.id} / ${testCase.slice} / ${testCase.risk} risk`;
  document.querySelector("#case-prompt").innerHTML = `<span>Prompt</span><p>${esc(testCase.prompt)}</p><small>Expected: ${testCase.expectedFacts.map(esc).join("; ")}</small>`;
  document.querySelector("#baseline-output").textContent = testCase.baseline; document.querySelector("#candidate-output").textContent = testCase.candidate;
  document.querySelector("#baseline-total").textContent = result.baselineTotal; document.querySelector("#candidate-total").textContent = result.candidateTotal;
  document.querySelector("#rubric-rows").innerHTML = RUBRICS.map((rubric) => {
    const delta = result.deltas[rubric]; const disagreement = result.disagreements[rubric]; const evidence = rubric === "grounding" ? `${Math.round(result.rawCandidate.evidence.expectedCoverage * 100)}% fact coverage` : rubric === "safety" ? `${result.rawCandidate.evidence.forbiddenHits.length} forbidden hit(s)` : rubric === "format" ? `${result.rawCandidate.evidence.wordCount} words` : "relevance and concision";
    return `<tr><th>${rubric}${state.overrides[testCase.id]?.[rubric] ? " *" : ""}</th><td>${result.baseline[rubric]}</td><td>${result.candidate[rubric]}</td><td class="${delta < 0 ? "negative" : delta > 0 ? "positive" : ""}">${delta > 0 ? "+" : ""}${delta}</td><td class="${Math.abs(disagreement) >= 20 ? "warning" : ""}">${disagreement > 0 ? "+" : ""}${disagreement}</td><td>${esc(evidence)}</td></tr>`;
  }).join("");
}

function renderSlices() { document.querySelector("#slice-rows").innerHTML = state.evaluation.slices.map((slice) => `<tr><td>${esc(slice.slice)}</td><td>${slice.count}</td><td>${fmt(slice.baseline)}</td><td>${fmt(slice.candidate)}</td><td class="${slice.delta < 0 ? "negative" : "positive"}">${slice.delta >= 0 ? "+" : ""}${fmt(slice.delta)}</td></tr>`).join(""); }

function drawChart() {
  const canvas = document.querySelector("#rubric-chart"); const ctx = canvas.getContext("2d"); const ratio = devicePixelRatio || 1; const width = canvas.clientWidth || 760; const height = Math.max(280, width * 0.44); canvas.width = width * ratio; canvas.height = height * ratio; ctx.scale(ratio, ratio); ctx.clearRect(0, 0, width, height); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
  const pad = { left: 48, right: 20, top: 28, bottom: 48 }; const chartHeight = height - pad.top - pad.bottom; ctx.font = "12px Arial";
  for (let line = 0; line <= 4; line += 1) { const value = line * 25; const y = pad.top + chartHeight - value / 100 * chartHeight; ctx.strokeStyle = "#d7d9d5"; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke(); ctx.fillStyle = "#6a6c68"; ctx.fillText(String(value), 12, y + 4); }
  const groupWidth = (width - pad.left - pad.right) / RUBRICS.length; RUBRICS.forEach((rubric, index) => { const values = state.evaluation.rubricAverages[rubric]; const baseX = pad.left + index * groupWidth + groupWidth * .22; const barWidth = Math.min(42, groupWidth * .24); const draw = (value, x, color) => { const h = value / 100 * chartHeight; ctx.fillStyle = color; ctx.fillRect(x, pad.top + chartHeight - h, barWidth, h); }; draw(values.baseline, baseX, "#30333a"); draw(values.candidate, baseX + barWidth + 7, "#2b66d9"); ctx.fillStyle = "#30333a"; ctx.textAlign = "center"; ctx.fillText(rubric, pad.left + index * groupWidth + groupWidth / 2, height - 18); }); ctx.textAlign = "left";
}

function renderDecision() {
  const summary = document.querySelector("#decision-summary"); summary.className = "decision-summary"; summary.textContent = "No release decision recorded.";
  document.querySelector("#approve-candidate").disabled = !state.evaluation.summary.gatePass;
}

function decide(decision) { state.decision = decision; const approved = decision === "approved"; const summary = document.querySelector("#decision-summary"); summary.className = `decision-summary ${approved ? "approved" : "blocked"}`; summary.textContent = approved ? "Candidate approved by the human evaluator." : "Candidate blocked by the human evaluator."; addEvent(approved ? "Human evaluator approved the candidate release." : "Human evaluator blocked the candidate release."); }

function download(name, content, type) { const blob = new Blob([content], { type }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = name; link.click(); URL.revokeObjectURL(link.href); }
function exportJson() { download("evaldeck-report.json", JSON.stringify(buildEvaluationRecord({ suiteName: state.suiteName, cases: state.cases, evaluation: state.evaluation, overrides: state.overrides, thresholds: state.thresholds, decision: state.decision, events: state.events }), null, 2), "application/json"); addEvent("Local JSON evaluation report downloaded."); }
function exportCsv() { download("evaldeck-cases.csv", resultsToCsv(state.cases, state.evaluation), "text/csv"); addEvent("Local CSV case results downloaded."); }

function applyOverride() {
  const reason = document.querySelector("#override-reason").value.trim(); const score = Number(document.querySelector("#override-score").value); const rubric = document.querySelector("#override-rubric").value; if (reason.length < 8) { document.querySelector("#override-reason").setCustomValidity("Provide at least 8 characters of evidence."); document.querySelector("#override-reason").reportValidity(); return; }
  document.querySelector("#override-reason").setCustomValidity(""); state.overrides[state.selectedId] ||= {}; state.overrides[state.selectedId][rubric] = { score, reason }; addEvent(`Human override applied to ${state.selectedId} ${rubric}: ${score}.`); recalculate(false);
}

function bind() {
  document.querySelector("#case-list").addEventListener("click", (event) => { const button = event.target.closest("[data-case]"); if (button) { state.selectedId = button.dataset.case; renderCases(); renderReview(); } });
  document.querySelector("#slice-filter").addEventListener("change", (event) => { state.filters.slice = event.target.value; renderCases(); });
  document.querySelector("#state-filter").addEventListener("change", (event) => { state.filters.state = event.target.value; renderCases(); });
  document.querySelector("#gate-controls").addEventListener("input", (event) => { const input = event.target.closest("[data-threshold]"); if (!input) return; state.thresholds[input.dataset.threshold] = Number(input.value); recalculate(false); });
  document.querySelector("#apply-override").addEventListener("click", applyOverride); document.querySelector("#approve-candidate").addEventListener("click", () => decide("approved")); document.querySelector("#block-candidate").addEventListener("click", () => decide("blocked")); document.querySelector("#export-json").addEventListener("click", exportJson); document.querySelector("#export-csv").addEventListener("click", exportCsv);
  document.querySelector("#jsonl-import").addEventListener("change", async (event) => { const [file] = event.target.files; if (!file) return; try { const imported = parseJsonl(await file.text()); state.cases = imported; state.suiteName = file.name; state.selectedId = imported[0].id; state.overrides = {}; state.filters = { slice: "all", state: "all" }; document.querySelector("#suite-label").textContent = `${state.suiteName} / ${imported.length} cases`; document.querySelector("#import-error").textContent = ""; addEvent(`${imported.length} local JSONL cases imported; no upload occurred.`); recalculate(false); } catch (error) { document.querySelector("#import-error").textContent = error.message; } });
  addEventListener("resize", () => drawChart());
}

async function start() {
  try { const response = await fetch("data/suite.json"); if (!response.ok) throw new Error(`Suite request failed with ${response.status}.`); const payload = await response.json(); state.suiteName = payload.name; state.cases = payload.cases; state.selectedId = payload.cases[0].id; state.events = ["EvalDeck Studio opened with deterministic local scoring."]; shell(); document.querySelector("#suite-label").textContent = `${state.suiteName} / ${state.cases.length} cases`; state.evaluation = evaluateSuite(state.cases, state.overrides, state.thresholds); bind(); renderAll(); addEvent(`Initial suite evaluated: ${state.cases.length} synthetic cases.`); }
  catch (error) { workspace.innerHTML = `<section class="startup error"><p class="eyebrow">Suite load failed</p><h1>The synthetic evaluation suite could not be loaded.</h1><p>${esc(error.message)}</p><button type="button" id="retry-start">Retry</button></section>`; document.querySelector("#retry-start").addEventListener("click", () => location.reload()); }
}
start();
