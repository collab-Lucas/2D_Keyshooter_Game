const { app, BrowserWindow } = require('electron');

let mainWindow;


app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1500,
        height: 1042,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,  // Permet d'accéder aux modules Node.js
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});