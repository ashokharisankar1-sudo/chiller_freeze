@echo off
echo ========================================
echo Creator Assistant - Windows Build Script
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo [2/5] Installing Electron...
call npm install --save-dev electron electron-builder
if errorlevel 1 (
    echo ERROR: Failed to install Electron!
    pause
    exit /b 1
)

echo.
echo [3/5] Building web application...
call npm run build
if errorlevel 1 (
    echo ERROR: Failed to build web app!
    pause
    exit /b 1
)

echo.
echo [4/5] Creating electron.js...
(
echo const { app, BrowserWindow, Tray, Menu } = require^('electron'^);
echo const path = require^('path'^);
echo.
echo let mainWindow;
echo let tray;
echo.
echo function createWindow^(^) {
echo   mainWindow = new BrowserWindow^({
echo     width: 1200,
echo     height: 800,
echo     webPreferences: {
echo       nodeIntegration: false,
echo       contextIsolation: true
echo     },
echo     frame: false,
echo     icon: path.join^(__dirname, 'dist/icon.svg'^)
echo   }^);
echo.
echo   mainWindow.loadFile^('dist/index.html'^);
echo.
echo   mainWindow.on^('closed', ^(^) =^> {
echo     mainWindow = null;
echo   }^);
echo }
echo.
echo app.whenReady^(^).then^(createWindow^);
echo.
echo app.on^('window-all-closed', ^(^) =^> {
echo   if ^(process.platform !== 'darwin'^) app.quit^(^);
echo }^);
) > electron.js

echo.
echo [5/5] Building Windows installer...
call npx electron-builder --win --x64
if errorlevel 1 (
    echo ERROR: Failed to build installer!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build Complete!
echo.
echo Your installer is in the 'dist_electron' folder.
echo ========================================
pause
