param([string]$NodePath = "")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$failures = New-Object System.Collections.Generic.List[string]
$required = @(
  "index.html", "assets/styles.css", "assets/app.js", "assets/evaluator.mjs",
  "data/suite.json", "data/sample-import.jsonl", "tests/evaluator.test.mjs", "tests/browser-smoke.mjs",
  "tools/static-server.mjs", "tools/static-server.ps1", "README.md", "docs/ARCHITECTURE.md",
  "docs/CASE_STUDY.md", "docs/RELEASE_NOTES.md", "docs/VALIDATION.md",
  "docs/screenshots/evaldeck-regression-desktop.png", "docs/screenshots/evaldeck-regression-mobile.png",
  "package.json", "LICENSE", ".gitignore", ".env.example", ".nojekyll"
)
foreach ($file in $required) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $file))) { $failures.Add("Missing required file: $file") }
}

try {
  $suite = Get-Content -Raw -LiteralPath (Join-Path $root "data/suite.json") | ConvertFrom-Json
  if ($suite.cases.Count -lt 12) { $failures.Add("At least 12 synthetic cases are required.") }
  if (($suite.cases.slice | Sort-Object -Unique).Count -lt 5) { $failures.Add("At least five evaluation slices are required.") }
  if ($suite.notice -notmatch "fictional") { $failures.Add("Synthetic notice missing.") }
} catch { $failures.Add("Evaluation suite is invalid JSON.") }

$html = Get-Content -Raw -LiteralPath (Join-Path $root "index.html")
foreach ($hook in @('<meta name="viewport"', 'class="skip-link"', 'id="workspace"', 'aria-live=', 'type="module"')) {
  if ($html -notmatch [Regex]::Escape($hook)) { $failures.Add("index.html missing $hook") }
}

$files = Get-ChildItem -LiteralPath $root -Recurse -File | Where-Object {
  $_.FullName -notmatch "\\.git\\" -and $_.FullName -ne $MyInvocation.MyCommand.Path -and
  $_.Extension -in @(".html", ".css", ".js", ".mjs", ".json", ".jsonl", ".md", ".txt", ".example")
}
$text = ($files | ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName }) -join "`n"
foreach ($pattern in @("(?i)gmail\.com", "sk-[A-Za-z0-9]{20,}", "gh[opsu]_[A-Za-z0-9]{20,}", "BEGIN (RSA|OPENSSH) PRIVATE KEY")) {
  if ($text -match $pattern) { $failures.Add("Potential private information or secret found: $pattern") }
}
foreach ($phrase in @("synthetic", "deterministic", "human", "No hosted model", "AI-assisted", "regression")) {
  if ($text -notmatch [Regex]::Escape($phrase)) { $failures.Add("Disclosure phrase missing: $phrase") }
}

if (-not $NodePath) {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node) { $NodePath = $node.Source }
}
if (-not $NodePath -or -not (Test-Path -LiteralPath $NodePath)) {
  $failures.Add("Node.js not found; pass -NodePath.")
} else {
  & $NodePath (Join-Path $root "tests/evaluator.test.mjs")
  if ($LASTEXITCODE -ne 0) { $failures.Add("Logic tests failed.") }
}

if ($failures.Count) {
  Write-Host "EVALDECK VALIDATION FAILED"
  foreach ($failure in $failures) { Write-Host "- $failure" }
  exit 1
}
Write-Host "EVALDECK VALIDATION PASSED"
Write-Host "Checked files, suite size and slices, disclosures, privacy patterns, accessibility hooks, and evaluation logic."
