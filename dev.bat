@echo off
start /B npm run dev
echo Dev server started on http://localhost:3005
echo.
call powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check-git-reminder.ps1"
echo.
echo To stop: taskkill /FI "WINDOWTITLE eq node" /F
