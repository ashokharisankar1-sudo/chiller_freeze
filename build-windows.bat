@echo off
echo ========================================
echo  Creator Assistant - Windows EXE Build
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found: 
node --version
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm is not installed!
    pause
    exit /b 1
)

echo npm found:
npm --version
echo.

echo ========================================
echo  Starting Build Process
echo ========================================
echo.

REM Run the build script
node build-exe.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo  BUILD FAILED
    echo ========================================
    echo.
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  BUILD SUCCESSFUL!
echo ========================================
echo.
echo Your EXE files are in the "release" folder:
echo.
dir /b release\*.exe 2>nul
echo.
echo ========================================
echo.
pause
