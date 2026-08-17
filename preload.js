const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  saveAccounts: (accounts) => ipcRenderer.invoke('save-accounts', accounts),
  copyToClipboard: (text) => ipcRenderer.send('write-clipboard', text),
  generateQRCode: (text) => ipcRenderer.invoke('generate-qr', text)
});
