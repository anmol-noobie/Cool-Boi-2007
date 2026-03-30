@echo off
cd /d "%~dp0"
echo Starting CoolBoi_2007 v3...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python.
    pause
    exit /b 1
)

REM Start backend server
echo [1/2] Starting Backend Server (Groq Cloud)...
start "CoolBoi Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --host 127.0.0.1 --port 8000"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend server
echo [2/2] Starting Frontend...
start "CoolBoi Frontend" cmd /k "cd /d "%~dp0frontend" && python -m http.server 5500"

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Open browser
echo.
echo Opening browser...
start http://127.0.0.1:5500

echo.
echo ========================================
echo  CoolBoi_2007 v3 is running!
echo ========================================
echo.
echo  Backend:  http://127.0.0.1:8000
echo  Frontend: http://127.0.0.1:5500
echo.
echo  Close this window to stop the servers
echo  or close the backend/frontend windows
echo ========================================
pause
