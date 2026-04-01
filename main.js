'use strict';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        backgroundColor: '#0d1117',
        title: 'Pexels Browser',
        webPreferences: {
            nodeIntegration: true,      // Required: download.js & app.js use require('fs'), require('path'), etc.
            contextIsolation: false,    // Required when nodeIntegration is true
            webSecurity: false,         // Allow fetch() to Pexels API from file:// context (CORS bypass)
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Handle folder selection IPC
ipcMain.handle('select-folder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Download Folder',
        buttonLabel: 'Select Folder',
    });

    if (canceled || filePaths.length === 0) {
        return null; // User cancelled
    }
    return filePaths[0]; // Return the first selected directory
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    // On Windows, keep the app process alive even when the window is closed,
    // so Resolve can re-open the panel without reloading the plugin.
    if (process.platform !== 'win32') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
