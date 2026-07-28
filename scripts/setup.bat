@echo off
REM MyMoney — Windows Setup Script
REM Checks prerequisites and initializes the application

echo.
echo ═══════════════════════════════════════
echo  MyMoney — Setup
echo ═══════════════════════════════════════
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed.
    echo Download from: https://nodejs.org (v20 or later)
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER%

REM Install dependencies
echo.
echo Installing dependencies...
call npm ci
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
)
echo [OK] Dependencies installed

REM Push database schema
echo.
echo Setting up database...
call npx prisma db push --skip-generate
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Database setup failed
    pause
    exit /b 1
)
echo [OK] Database ready

REM Run seed
echo.
echo Loading merchant mappings...
call npx tsx prisma/seed.ts
echo [OK] Seed complete

REM Generate PWA icons
echo.
echo Generating icons...
call npx tsx scripts/generate-icons.ts

echo.
echo ═══════════════════════════════════════
echo  Setup complete!
echo.
echo  Run start.bat to launch MyMoney
echo  Then open http://localhost:3005
echo ═══════════════════════════════════════
echo.
pause
