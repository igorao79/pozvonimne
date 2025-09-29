const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const next = require('next');

const isDev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;

let mainWindow;
let server;

// Create standalone Next.js app
const nextApp = next({ 
  dev: false, // Always use production build for standalone
  dir: path.join(__dirname, '..'),
  quiet: false
});

const handle = nextApp.getRequestHandler();

async function createWindow() {
  // Apply WebRTC fixes
  const { applyWebRTCFixes } = require('./webrtc-fix');
  applyWebRTCFixes();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    icon: path.join(__dirname, '../public/logo.ico'),
    show: false,
  });

  // Start internal server
  await startInternalServer();

  // Load the app
  const appUrl = `http://localhost:${port}`;
  console.log('Loading standalone app from:', appUrl);
  
  mainWindow.loadURL(appUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Standalone Electron app ready!');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (server) {
      server.close();
    }
  });
}

async function startInternalServer() {
  try {
    console.log('🚀 Preparing Next.js app...');
    await nextApp.prepare();

    const expressApp = express();

    // Handle static files
    expressApp.use('/_next', express.static(path.join(__dirname, '../.next')));
    expressApp.use('/public', express.static(path.join(__dirname, '../public')));

    // Handle all requests with Next.js
    expressApp.all('*', (req, res) => {
      return handle(req, res);
    });

    server = expressApp.listen(port, 'localhost', () => {
      console.log(`📡 Internal server running on http://localhost:${port}`);
    });

  } catch (error) {
    console.error('❌ Failed to start internal server:', error);
    throw error;
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (server) {
      server.close();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
