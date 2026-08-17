const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const QRCode = require('qrcode');

const ACCOUNTS_FILE = path.join(app.getPath('userData'), 'accounts.json');

function readAccounts() {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading accounts file:', err);
  }
  return [];
}

function writeAccounts(accounts) {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
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
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
  });

  mainWindow.loadFile('index.html');

  // Open target="_blank" links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  // IPC Handlers
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
