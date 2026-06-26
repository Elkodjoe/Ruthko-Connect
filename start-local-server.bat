@echo off
echo Starting Ruthko Connect local server...
echo.

REM Try Python first
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python HTTP server
    echo Open: http://localhost:5500
    echo Press Ctrl+C to stop.
    python -m http.server 5500
    goto end
)

REM Try Python3
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python3 HTTP server
    echo Open: http://localhost:5500
    echo Press Ctrl+C to stop.
    python3 -m http.server 5500
    goto end
)

REM Try Node npx serve
npx --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using npx serve
    echo Open: http://localhost:5500
    echo Press Ctrl+C to stop.
    npx serve -l 5500 .
    goto end
)

echo -----------------------------------------------
echo No local server found.
echo Install one of:
echo   Python:  https://python.org
echo   Node.js: https://nodejs.org
echo.
echo OR just open index.html directly in Chrome.
echo -----------------------------------------------
pause

:end
