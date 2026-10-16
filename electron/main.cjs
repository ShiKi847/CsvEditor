const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    title: 'CsvEditor',
    backgroundColor: '#0f172a',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Check if we should load local dist build or dev server
  const isDev = process.env.NODE_ENV === 'development';
  const distPath = path.join(__dirname, '../dist/index.html');

  if (!isDev && fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
  }

  // Handle file opened from Windows command line (e.g. Right click -> Open With)
  const args = process.argv;
  const filePathArg = args.find(arg => arg.endsWith('.csv') || arg.endsWith('.tsv') || arg.endsWith('.txt'));
  if (filePathArg && fs.existsSync(filePathArg)) {
    mainWindow.webContents.on('did-finish-load', () => {
      try {
        const content = fs.readFileSync(filePathArg, 'utf-8');
        mainWindow.webContents.send('file:opened-from-cli', {
          filePath: filePathArg,
          fileName: path.basename(filePathArg),
          content,
        });
      } catch (err) {
        console.error('Failed to read CLI file argument', err);
      }
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for native file operations
ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Delimited Data File',
    properties: ['openFile'],
    filters: [
      { name: 'CSV & TSV Files', extensions: ['csv', 'tsv', 'tab', 'txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (canceled || filePaths.length === 0) return null;

  const targetPath = filePaths[0];
  try {
    const content = fs.readFileSync(targetPath, 'utf-8');
    return {
      filePath: targetPath,
      fileName: path.basename(targetPath),
      content,
    };
  } catch (err) {
    console.error('Failed to read file:', err);
    throw err;
  }
});

ipcMain.handle('dialog:saveFile', async (event, { content, suggestedName, existingPath }) => {
  let savePath = existingPath;

  if (!savePath) {
    if (!mainWindow) return null;
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save CSV File',
      defaultPath: suggestedName || 'untitled.csv',
      filters: [
        { name: 'CSV File (*.csv)', extensions: ['csv'] },
        { name: 'TSV File (*.tsv)', extensions: ['tsv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (canceled || !filePath) return null;
    savePath = filePath;
  }

  try {
    fs.writeFileSync(savePath, content, 'utf-8');
    return {
      filePath: savePath,
      fileName: path.basename(savePath),
    };
  } catch (err) {
    console.error('Failed to write file:', err);
    throw err;
  }
});

ipcMain.handle('fs:writeFile', async (event, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to write file:', err);
    return false;
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
