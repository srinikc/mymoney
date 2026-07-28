@echo off
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3005 ^| findstr LISTENING') do (
  taskkill /F /PID %%a >nul 2>&1
  echo Killed existing process on port 3005
)
start /B npm run dev
echo Dev server started on http://localhost:3005
echo.
call powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check-git-reminder.ps1"
echo.
echo To stop: taskkill /FI "WINDOWTITLE eq node" /F
