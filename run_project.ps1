param(
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$python = Join-Path $root ".python312\python.exe"

if (-not (Test-Path $python)) {
    throw "Missing local runtime at .python312\\python.exe"
}

$backend = $null
$frontend = $null

try {
    $backend = Start-Process `
        -FilePath $python `
        -ArgumentList "-m uvicorn backend.main:app --host 127.0.0.1 --port 8000" `
        -WorkingDirectory $root `
        -PassThru

    $frontend = Start-Process `
        -FilePath $python `
        -ArgumentList "-m http.server 5500 --directory frontend" `
        -WorkingDirectory $root `
        -PassThru

    Start-Sleep -Seconds 2

    Write-Host "Backend:  http://127.0.0.1:8000"
    Write-Host "Frontend: http://127.0.0.1:5500"
    Write-Host "Press Ctrl+C to stop both servers."

    if (-not $NoBrowser) {
        Start-Process "http://127.0.0.1:5500" | Out-Null
    }

    while ($true) {
        Start-Sleep -Seconds 1

        $backendAlive = $null -ne (Get-Process -Id $backend.Id -ErrorAction SilentlyContinue)
        $frontendAlive = $null -ne (Get-Process -Id $frontend.Id -ErrorAction SilentlyContinue)

        if (-not $backendAlive -or -not $frontendAlive) {
            Write-Host "One server stopped. Exiting launcher."
            break
        }
    }
}
finally {
    if ($backend) {
        Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    }
    if ($frontend) {
        Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
    }
}
