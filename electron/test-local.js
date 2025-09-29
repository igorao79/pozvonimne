const { app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

console.log('🧪 TEST MODE: Simple Electron startup without splash screen');
console.log('📁 __dirname:', __dirname);
console.log('📁 process.cwd():', process.cwd());
console.log('📁 process.resourcesPath:', process.resourcesPath);
console.log('🔧 isDev:', isDev);

let mainWindow;

async function createWindow() {
  console.log('🪟 Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    show: false
  });

  console.log('⏳ Loading app...');
  
  // Test both prod and dev URLs
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : 'https://pozvonimne.vercel.app/';

  try {
    await mainWindow.loadURL(startUrl);
    console.log('✅ App loaded successfully from:', startUrl);
    
    mainWindow.show();
    mainWindow.focus();
    
    // Open DevTools for debugging
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
    
  } catch (error) {
    console.error('❌ Failed to load app:', error);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Simple app setup
app.whenReady().then(async () => {
  console.log('🚀 App ready, creating window...');
  await createWindow();
});

app.on('window-all-closed', () => {
  console.log('🔚 All windows closed, quitting...');
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});
