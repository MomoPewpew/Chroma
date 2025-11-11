@echo off
setlocal

echo === Chroma Production Build ===

if not exist package.json (
  echo [error] Run this script from the project root where package.json resides.
  exit /b 1
)

echo Installing dependencies...
call npm install || exit /b 1

echo Building production bundle...
call npm run build || exit /b 1

echo Build complete. Output available in the dist\ directory.
endlocal

