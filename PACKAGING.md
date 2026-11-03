# Packaging Guide - EXE & APK

This guide explains how to package the Creator Assistant PWA as native desktop (EXE) and mobile (APK) applications.

## Prerequisites

### For Windows EXE:
- Node.js 18+ installed
- Windows 10/11 (for building)
- 2GB free disk space

### For Android APK:
- Node.js 18+ installed
- Android Studio installed
- Java JDK 17+ installed
- Android SDK installed
- 4GB free disk space

---

## Option 1: Electron (Windows EXE)

### Step 1: Install Electron

```bash
cd H:\playground_3112026
npm install --save-dev electron electron-builder
```

### Step 2: Create electron.js

Create a file named `electron.js` in the root directory:

```javascript
const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    frame: false,
    transparent: false,
    icon: path.join(__dirname, 'dist/icon.svg'),
    show: false
  });

  mainWindow.loadFile('dist/index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'dist/icon.svg'));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show App', 
      click: () => {
        mainWindow.show();
      }
    },
    { 
      label: 'Silent Mode', 
      click: () => {
        mainWindow.hide();
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Creator Assistant');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

### Step 3: Update package.json

Add these fields to your `package.json`:

```json
{
  "name": "creator-assistant",
  "version": "1.0.0",
  "main": "electron.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron": "electron .",
    "dist": "electron-builder"
  },
  "build": {
    "appId": "com.creator.assistant",
    "productName": "Creator Assistant",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron.js",
      "package.json"
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "icon": "dist/icon.svg"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0"
  }
}
```

### Step 4: Build the App

```bash
# Build the web app first
npm run build

# Test in Electron
npm run electron

# Build EXE installer
npm run dist
```

The EXE installer will be in the `release` folder.

---

## Option 2: Tauri (Lighter EXE)

Tauri creates smaller, faster executables.

### Step 1: Install Rust

Download from: https://rustup.rs

### Step 2: Install Tauri

```bash
npm install --save-dev @tauri-apps/cli @tauri-apps/api
```

### Step 3: Initialize Tauri

```bash
npx tauri init
```

Answer the prompts:
- App name: Creator Assistant
- Window title: Creator Assistant
- Web assets location: ../dist
- Dev server URL: http://localhost:5173
- Frontend dev command: npm run dev
- Frontend build command: npm run build

### Step 4: Configure Tauri

Edit `src-tauri/tauri.conf.json`:

```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "Creator Assistant",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.creator.assistant",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ]
    },
    "security": {
      "csp": null
    },
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "title": "Creator Assistant",
        "width": 1200,
        "height": 800,
        "decorations": false,
        "transparent": false
      }
    ],
    "systemTray": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true
    }
  }
}
```

### Step 5: Build

```bash
npx tauri build
```

The EXE will be in `src-tauri/target/release/bundle/nsis/`.

---

## Option 3: Android APK (Tauri)

### Step 1: Install Android Studio

Download from: https://developer.android.com/studio

### Step 2: Set Environment Variables

Add to your system PATH:
```
ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Java\jdk-17
```

### Step 3: Initialize Android in Tauri

```bash
npx tauri android init
```

### Step 4: Build APK

```bash
npx tauri android build
```

The APK will be in `src-tauri/gen/android/app/build/outputs/apk/`.

---

## Option 4: Capacitor (Alternative for APK)

### Step 1: Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Creator Assistant" "com.creator.assistant" --web-dir=dist
```

### Step 2: Add Android Platform

```bash
npm install @capacitor/android
npx cap add android
```

### Step 3: Build and Sync

```bash
npm run build
npx cap sync android
```

### Step 4: Open in Android Studio

```bash
npx cap open android
```

### Step 5: Build APK in Android Studio

1. Click "Build" → "Build Bundle(s) / APK(s)" → "Build APK(s)"
2. Wait for build to complete
3. Click "locate" to find the APK

---

## Quick Start Script

Create `build-all.bat` (Windows):

```batch
@echo off
echo Building Creator Assistant...
echo.

echo Step 1: Building web app...
call npm run build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Building Windows EXE...
call npx tauri build
if errorlevel 1 (
    echo EXE build failed!
    pause
    exit /b 1
)

echo.
echo Step 3: Building Android APK...
call npx tauri android build
if errorlevel 1 (
    echo APK build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build complete!
echo.
echo Windows EXE: src-tauri\target\release\bundle\nsis\
echo Android APK: src-tauri\gen\android\app\build\outputs\apk\
echo ========================================
pause
```

---

## Testing

### Test PWA:
1. Run `npm run build`
2. Run `npx serve dist`
3. Open in Chrome
4. Click install icon in address bar

### Test Electron:
1. Run `npm run electron`
2. Verify all modes work
3. Check system tray

### Test Android:
1. Connect Android device with USB debugging
2. Run `npx tauri android dev`
3. Test on device

---

## Distribution

### Windows EXE:
- Upload to GitHub Releases
- Or distribute via Microsoft Store (requires signing)

### Android APK:
- Upload to Google Play Store (requires $25 fee)
- Or distribute APK directly (enable "Unknown sources")

---

## Troubleshooting

### Electron Issues:
- **Blank screen**: Check console for errors, ensure `dist` folder exists
- **Tray not showing**: Verify icon path is correct
- **Build fails**: Clear `node_modules` and reinstall

### Tauri Issues:
- **Rust compilation error**: Update Rust with `rustup update`
- **WebView2 missing**: Install from https://developer.microsoft.com/en-us/microsoft-edge/webview2/
- **Android build fails**: Ensure Android SDK is properly installed

### Android Issues:
- **SDK not found**: Set ANDROID_HOME environment variable
- **Gradle build fails**: Use `./gradlew clean` in android folder
- **Device not detected**: Enable USB debugging on device

---

## File Sizes

- **PWA**: ~200KB (compressed)
- **Electron EXE**: ~150MB (includes Chromium)
- **Tauri EXE**: ~10MB (uses system WebView)
- **Android APK**: ~15MB (Tauri) or ~25MB (Capacitor)

---

## Next Steps

1. Choose your packaging method (Tauri recommended for smaller size)
2. Follow the steps above
3. Test thoroughly on target platforms
4. Sign your executables for production (optional but recommended)
5. Distribute to your users

For more information:
- Electron: https://www.electronjs.org/docs
- Tauri: https://tauri.app/v1/guides/
- Capacitor: https://capacitorjs.com/docs
