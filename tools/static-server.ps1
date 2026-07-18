param([int]$Port = 4182, [string]$NodePath = "")
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $NodePath) { $NodePath = (Get-Command node -ErrorAction Stop).Source }
Push-Location $root
try { & $NodePath ".\tools\static-server.mjs" --port $Port } finally { Pop-Location }
