
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  version: process.versions.electron,
  minimize: () => ipcRenderer.send('window-min'),
  toggleMaximize: () => ipcRenderer.send('window-max'),
  close: () => ipcRenderer.send('window-close'),
  onWindowStateChange: (callback) => ipcRenderer.on('window-state-change', (_event, value) => callback(value))
});
