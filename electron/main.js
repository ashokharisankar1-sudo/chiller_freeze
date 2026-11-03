const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'public', 'icon-512.png'),
    title: 'Creator Assistant',
    show: false,
    backgroundColor: '#0a0a0a'
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Uncomment to open DevTools in development
    // mainWindow.webContents.openDevTools();
  } else {
    // In production, load from dist folder
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Quit app unless on macOS
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for future native features
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

// Handle certificate errors (for local Ollama HTTPS if needed)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.includes('localhost')) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});
