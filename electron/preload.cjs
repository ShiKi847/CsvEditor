const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (content, suggestedName, existingPath) =>
    ipcRenderer.invoke('dialog:saveFile', { content, suggestedName, existingPath }),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke('fs:writeFile', { filePath, content }),
  setZoomFactor: (factor) => {
    try {
      webFrame.setZoomFactor(factor);
    } catch (e) {
      console.warn('Failed to set zoom factor', e);
    }
  },
  getZoomFactor: () => {
    try {
      return webFrame.getZoomFactor();
    } catch {
      return 1.0;
    }
  },
  onFileOpenedFromCli: (callback) => {
    ipcRenderer.on('file:opened-from-cli', (event, data) => callback(data));
  },
});
