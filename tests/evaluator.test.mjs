import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildEvaluationRecord, evaluateCase, evaluateSuite, parseJsonl, resultsToCsv, scoreOutput } from "../assets/evaluator.mjs";

const suite = JSON.parse(await readFile(new URL("../data/suite.json", import.meta.url), "utf8"));
assert.equal(suite.cases.length, 12);
assert.ok(new Set(suite.cases.map((item) => item.slice)).size >= 5);

const jsonCase = suite.cases.find((item) => item.id === "API-05");
const jsonScore = scoreOutput(jsonCase, jsonCase.candidate);
assert.equal(jsonScore.format, 100);
assert.equal(jsonScore.grounding, 100);
assert.equal(scoreOutput(jsonCase, "not json").format, 0);

const finance = suite.cases.find((item) => item.id === "FIN-04");
const financeResult = evaluateCase(finance);
assert.equal(financeResult.safetyRegression, true);
assert.ok(financeResult.candidate.safety < financeResult.baseline.safety);
const overridden = evaluateCase(finance, { safety: { score: 100, reason: "Human evidence review" } });
assert.equal(overridden.candidate.safety, 100);
assert.equal(overridden.rawCandidate.safety, financeResult.rawCandidate.safety);

const blocked = evaluateSuite(suite.cases, {}, { minScore: 78, maxSafetyRegressions: 0, maxSliceDrop: 5 });
assert.equal(blocked.summary.gatePass, false);
assert.ok(blocked.summary.safetyRegressions >= 1);
assert.equal(blocked.results.length, 12);
assert.ok(blocked.slices.length >= 5);

const overrides = { "FIN-04": { safety: { score: 100, reason: "Qualified evaluator confirmed the release boundary." } } };
const passing = evaluateSuite(suite.cases, overrides, { minScore: 70, maxSafetyRegressions: 0, maxSliceDrop: 20 });
assert.equal(passing.summary.gatePass, true);
assert.equal(passing.summary.safetyRegressions, 0);

const jsonl = await readFile(new URL("../data/sample-import.jsonl", import.meta.url), "utf8");
assert.equal(parseJsonl(jsonl).length, 2);
assert.throws(() => parseJsonl("not json"), /Line 1/);
assert.throws(() => parseJsonl('{"id":"x"}'), /missing slice/);

const csv = resultsToCsv(suite.cases, blocked);
assert.match(csv, /candidate_safety/);
assert.equal(csv.split("\n").length, 13);
const record = buildEvaluationRecord({ suiteName: suite.name, cases: suite.cases, evaluation: passing, overrides, thresholds: { minScore: 70 }, decision: "approved", events: ["evaluated", "approved"] });
assert.equal(record.schema, "evaldeck-report/v1");
assert.equal(record.caseCount, 12);
assert.equal(record.humanDecision, "approved");
assert.match(record.privacy, /Synthetic prompts/);

console.log("EVALDECK LOGIC TESTS PASSED");
console.log("Checked rubrics, pairwise deltas, disagreement, gates, overrides, JSONL, CSV, errors, and report boundaries.");
