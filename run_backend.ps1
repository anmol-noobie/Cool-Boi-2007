$ErrorActionPreference = "Stop"

$python = Join-Path $PSScriptRoot ".python312\python.exe"
if (-not (Test-Path $python)) {
    throw "Missing local runtime at .python312\\python.exe"
}

& $python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
