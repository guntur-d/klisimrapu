@echo off
echo =====================================================
echo SIMRA-PU Development Environment Launcher
echo =====================================================
echo.
echo This script will start:
echo - JS build watcher (esbuild) [separate window]
echo - CSS build watcher (Tailwind) [separate window]
echo - Vercel dev server with logging [main window]
echo.
echo To stop processes:
echo - Press Ctrl+C in each window to stop individual processes
echo.
echo Log files:
echo - server.log: Main application logs
echo - port_cleanup.log: Port cleanup operations
echo.

REM Check if yarn is available
where yarn >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Yarn is not installed or not in PATH
    echo Please install Yarn first: npm install -g yarn
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

REM Check if required scripts exist
if not exist "run-log.ps1" (
    echo ERROR: run-log.ps1 not found. Please ensure the PowerShell logging script exists.
    pause
    exit /b 1
)

echo Starting development environment...

REM Start JS build watcher in new window
echo Starting JS build watcher...
start "SIMRA-PU JS Build Watcher" cmd /c "title JS Build Watcher && echo Watching JavaScript files... && yarn wj"

REM Start CSS build watcher in new window
echo Starting CSS build watcher...
start "SIMRA-PU CSS Build Watcher" cmd /c "title CSS Build Watcher && echo Watching CSS files... && yarn wc"

REM Wait a moment for watchers to initialize
timeout /t 3 /nobreak >nul

REM Start dev server with logging
echo Starting Vercel dev server...
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { & ./run-log.ps1 }" || goto error

echo.
echo All processes have stopped.
pause
goto end

:error
echo.
echo An error occurred while starting the development environment.
echo Check the error messages above and ensure all dependencies are installed.
pause
end
