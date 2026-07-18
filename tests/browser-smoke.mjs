import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);
const port = Number(process.env.EVALDECK_TEST_PORT || 4196);
const deployed = process.env.EVALDECK_BASE_URL?.trim();
const base = deployed ? `${deployed.replace(/\/$/, "")}/` : `http://127.0.0.1:${port}/`;
const target = process.env.PLAYWRIGHT_MODULE || "playwright";
const specifier = /^[A-Za-z]:[\\/]/.test(target) ? pathToFileURL(target).href : target;
const { chromium } = await import(specifier);
const desktopShot = fileURLToPath(new URL("../docs/screenshots/evaldeck-regression-desktop.png", import.meta.url));
const mobileShot = fileURLToPath(new URL("../docs/screenshots/evaldeck-regression-mobile.png", import.meta.url));
const importPath = fileURLToPath(new URL("../data/sample-import.jsonl", import.meta.url));
const server = deployed ? null : spawn(process.execPath, ["tools/static-server.mjs", "--port", String(port)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

async function ready() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try { if ((await fetch(base)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("EvalDeck server did not start");
}

async function approveWithOverride(page) {
  await page.locator('[data-case="FIN-04"]').click();
  assert.match(await page.locator("#case-meta").innerText(), /FIN-04/);
  await page.locator("#override-rubric").selectOption("safety");
  await page.locator("#override-score").fill("100");
  await page.locator("#override-reason").fill("Qualified evaluator verified the synthetic safety boundary.");
  await page.locator("#apply-override").click();
  await page.locator("#gate-status").getByText("Pass").waitFor({ state: "visible" });
  assert.equal(await page.locator("#approve-candidate").isEnabled(), true);
  await page.locator("#approve-candidate").click();
  assert.match(await page.locator("#decision-summary").innerText(), /approved by the human evaluator/i);
}

async function waitForCaseCount(page, expected, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await page.locator("[data-case]").count() === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(await page.locator("[data-case]").count(), expected);
}

let browser;
try {
  await ready();
  browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await desktop.newPage();
  const errors = [];
  const failed = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("requestfailed", (request) => failed.push(request.url()));
  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(await page.locator("[data-case]").count(), 12);
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("skip-link")), true);
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => location.hash), "#workspace");
  assert.match(await page.locator("#gate-status").innerText(), /blocked/i);
  assert.equal(await page.locator("#approve-candidate").isEnabled(), false);
  await page.locator("#state-filter").selectOption("regression");
  assert.ok((await page.locator("[data-case]").count()) >= 1);
  await page.locator("#state-filter").selectOption("all");
  await approveWithOverride(page);
  const chartPixels = await page.locator("#rubric-chart").evaluate((canvas) => {
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let index = 0; index < data.length; index += 80) if (data[index] < 245 || data[index + 1] < 245 || data[index + 2] < 245) count += 1;
    return count;
  });
  assert.ok(chartPixels > 50);
  const jsonDownload = page.waitForEvent("download");
  await page.locator("#export-json").click();
  assert.match((await jsonDownload).suggestedFilename(), /evaldeck-report\.json$/);
  const csvDownload = page.waitForEvent("download");
  await page.locator("#export-csv").click();
  assert.match((await csvDownload).suggestedFilename(), /evaldeck-cases\.csv$/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path: desktopShot, fullPage: true });
  await page.locator("#jsonl-import").setInputFiles(importPath);
  await page.locator("#suite-label").getByText(/2 cases/).waitFor({ state: "visible" });
  await waitForCaseCount(page, 2);
  assert.equal(await page.locator("[data-case]").count(), 2);
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(base, { waitUntil: "networkidle" });
  await approveWithOverride(mobilePage);
  assert.equal(await mobilePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
  await mobilePage.evaluate(() => document.activeElement?.blur());
  await mobilePage.screenshot({ path: mobileShot, fullPage: true });
  await mobile.close();

  const errorContext = await browser.newContext();
  const errorPage = await errorContext.newPage();
  await errorPage.route("**/data/suite.json", (route) => route.abort());
  await errorPage.goto(base, { waitUntil: "domcontentloaded" });
  await errorPage.getByRole("heading", { name: "The synthetic evaluation suite could not be loaded." }).waitFor({ state: "visible" });
  assert.equal(await errorPage.getByRole("button", { name: "Retry" }).isVisible(), true);
  await errorContext.close();

  console.log("EVALDECK BROWSER TESTS PASSED");
  console.log(JSON.stringify({ target: deployed ? "deployed" : "local", cases: 12, rubrics: 4, defaultGateBlocked: true, humanOverride: true, gatePass: true, jsonExport: true, csvExport: true, jsonlImport: true, keyboard: true, desktopOverflow: false, mobileOverflow: false, consoleErrors: 0, failedRequests: 0 }));
} finally {
  if (browser) await browser.close();
  if (server) server.kill();
}
