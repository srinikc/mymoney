@echo off
REM graphify-enrich.bat - Run graphify LLM enrichment passes on demand.
REM Uses the OpenAI-compatible OpenCode Zen key via OPENCODE_ZEN_API_KEY.
REM Model default: gpt-5.4-nano (cheapest /responses model). Override with GRAPHIFY_MODEL.
REM Usage:
REM   scripts\graphify-enrich.bat label      - name the communities
REM   scripts\graphify-enrich.bat describe   - add per-node descriptions
REM   scripts\graphify-enrich.bat all        - label + describe
setlocal

if "%OPENCODE_ZEN_API_KEY%"=="" (
  echo ERROR: OPENCODE_ZEN_API_KEY is not set. Export it first and try again.
  exit /b 1
)

set "OPENAI_API_KEY=%OPENCODE_ZEN_API_KEY%"
set "OPENAI_BASE_URL=https://opencode.ai/zen/v1"
if "%GRAPHIFY_MODEL%"=="" set "GRAPHIFY_MODEL=gpt-5.4-nano"

if /i "%~1"=="label" goto label
if /i "%~1"=="describe" goto describe
if /i "%~1"=="all" goto all
echo Usage: %~nx0 label^|describe^|all
exit /b 1

:label
graphify label . --backend openai --model %GRAPHIFY_MODEL% --label-mode direct
exit /b %errorlevel%

:describe
graphify describe . --description-backend openai --description-model %GRAPHIFY_MODEL% --description-mode direct
exit /b %errorlevel%

:all
call :label
if errorlevel 1 exit /b 1
call :describe
exit /b %errorlevel%
