@echo off
echo ========================================
echo Creator Assistant - Android Build Script
echo ========================================
echo.

REM Check prerequisites
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

where java >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Java is not installed!
    echo Please install Java JDK 17+ from https://adoptium.net/
    pause
    exit /b 1
)

if "%ANDROID_HOME%"=="" (
    echo ERROR: ANDROID_HOME environment variable not set!
    echo Please install Android Studio and set ANDROID_HOME
    echo Example: setx ANDROID_HOME "C:\Users\YourName\AppData\Local\Android\Sdk"
    pause
    exit /b 1
)

echo [1/6] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo [2/6] Installing Capacitor...
call npm install @capacitor/core @capacitor/cli @capacitor/android
if errorlevel 1 (
    echo ERROR: Failed to install Capacitor!
    pause
    exit /b 1
)

echo.
echo [3/6] Initializing Capacitor...
call npx cap init "Creator Assistant" "com.creator.assistant" --web-dir=dist
if errorlevel 1 (
    echo Capacitor already initialized, continuing...
)

echo.
echo [4/6] Adding Android platform...
call npx cap add android
if errorlevel 1 (
    echo Android platform already exists, continuing...
)

echo.
echo [5/6] Building web application...
call npm run build
if errorlevel 1 (
    echo ERROR: Failed to build web app!
    pause
    exit /b 1
)

echo.
echo [6/6] Syncing with Android...
call npx cap sync android
if errorlevel 1 (
    echo ERROR: Failed to sync with Android!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Web Build Complete!
echo.
echo Next steps:
echo 1. Open Android Studio: npx cap open android
echo 2. Wait for Gradle sync to complete
echo 3. Click Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo 4. Find APK in: android\app\build\outputs\apk\debug\
echo ========================================
echo.
echo Opening Android Studio...
call npx cap open android

pause
