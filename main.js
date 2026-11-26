const { app, BrowserWindow, ipcMain, clipboard, systemPreferences, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const QRCode = require('qrcode');

const ACCOUNTS_FILE = path.join(app.getPath('userData'), 'accounts.json');

async function readAccounts() {
  try {
    const dir = path.dirname(ACCOUNTS_FILE);
    await fs.promises.mkdir(dir, { recursive: true });
    
    try {
      const data = await fs.promises.readFile(ACCOUNTS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (readErr) {
      if (readErr.code === 'ENOENT') {
        return [];
      }
      throw readErr;
    }
  } catch (err) {
    console.error('Error reading accounts file:', err);
  }
  return [];
}

async function writeAccounts(accounts) {
  try {
    const dir = path.dirname(ACCOUNTS_FILE);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing accounts file:', err);
    return false;
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 480,
    height: 720,
    minWidth: 400,
    minHeight: 600,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: "Authenticator Client",
    icon: path.join(__dirname, 'assets', 'icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Open target="_blank" links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  // Open DevTools only when explicitly requested in development mode
  if (!app.isPackaged) {
    if (process.env.OPEN_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools();
    }
  } else {
    // Actively prevent DevTools opening via keyboard shortcuts in production
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });
  }
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(path.join(__dirname, 'assets', 'icon.png'));
  }

  // Allow media (camera) permission requests from the local app renderer
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      return callback(true);
    }
    callback(false);
  });

  // IPC Handlers
  ipcMain.handle('request-camera-permission', async () => {
    if (process.platform !== 'darwin') {
      return { granted: true, status: 'granted' };
    }
    const status = systemPreferences.getMediaAccessStatus('camera');
    if (status === 'granted') {
      return { granted: true, status };
    }
    if (status === 'not-determined') {
      const granted = await systemPreferences.askForMediaAccess('camera');
      return { granted, status: granted ? 'granted' : 'denied' };
    }
    return { granted: false, status };
  });

  ipcMain.handle('get-accounts', () => {
    return readAccounts();
  });

  ipcMain.handle('save-accounts', (event, accounts) => {
    return writeAccounts(accounts);
  });

  ipcMain.on('write-clipboard', (event, text) => {
    clipboard.writeText(text);
  });

  ipcMain.handle('generate-qr', async (event, text) => {
    try {
      return await QRCode.toDataURL(text);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      return '';
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
