@echo off
cd /d "%~dp0"
echo Starting CoolBoi_2007 v3...
echo.

REM Kill any existing servers on these ports
echo Cleaning up any existing servers...
taskkill /f /im python.exe >nul 2>&1
timeout /t 1 /nobreak >nul

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
echo  Press any key to STOP servers and exit...
echo ========================================
pause >nul

REM Kill servers on exit
echo Stopping servers...
taskkill /f /fi "WINDOWTITLE eq CoolBoi*" >nul 2>&1
taskkill /f /im python.exe >nul 2>&1
echo Done!
