const { app, BrowserWindow, Menu, ipcMain, dialog, globalShortcut, desktopCapturer, nativeTheme } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Remove default menu
Menu.setApplicationMenu(null);

// Listen for system theme changes and notify renderer
nativeTheme.on('updated', () => {
  const isDarkMode = nativeTheme.shouldUseDarkColors;
  console.log('System theme changed:', isDarkMode ? 'dark' : 'light');

  // Notify all windows about theme change
  BrowserWindow.getAllWindows().forEach(window => {
    if (!window.isDestroyed()) {
      window.webContents.send('system-theme-changed', isDarkMode ? 'dark' : 'light');
    }
  });
});

// Import WebRTC fixes
const { applyWebRTCFixes, getNetworkInterfaces } = require('./webrtc-fix');

// Setup auto-updater
function setupAutoUpdater() {
  if (isDev) {
    console.log('Skipping auto-updater in development mode');
    return;
  }

  try {
    // Configure electron-updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Auto-updater event handlers
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info.version);
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Обновление доступно',
        message: `Доступна новая версия ${info.version}. Хотите загрузить?`,
        buttons: ['Да', 'Позже']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available');
    });

    autoUpdater.on('error', (err) => {
      console.error('Error in auto-updater:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      let log_message = "Download speed: " + progressObj.bytesPerSecond;
      log_message = log_message + ' - Downloaded ' + Math.round(progressObj.percent) + '%';
      log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
      console.log(log_message);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info.version);

      const dialogOpts = {
        type: 'info',
        buttons: ['Перезагрузить сейчас', 'Позже'],
        title: 'Обновление приложения',
        message: `Обновление до версии ${info.version} загружено`,
        detail: 'Перезагрузите приложение, чтобы применить обновления.'
      };

      dialog.showMessageBox(mainWindow, dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });

    // Check for updates after app is ready (with delay to ensure UI is ready)
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 5000);
  } catch (error) {
    console.error('Error setting up auto-updater:', error);
  }
}

// Keep a global reference of the window object
let mainWindow;
let splashWindow;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const splashPath = isDev 
    ? path.join(__dirname, 'splash.html')
    : path.join(__dirname, 'splash.html');

  splashWindow.loadFile(splashPath);

  // Центрируем окно
  splashWindow.center();

  splashWindow.on('closed', () => {
    splashWindow = null;
  });

  return splashWindow;
}

function updateSplashProgress(progress, message) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash-progress', { progress, message });
  }
}

function showSplashError(errorMessage) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash-error', errorMessage);
  }
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash-close');
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
    }, 500);
  }
}

async function createWindow() {
  try {
    updateSplashProgress(30, 'Инициализация WebRTC...');
    // Apply WebRTC fixes
    applyWebRTCFixes();

    updateSplashProgress(50, 'Создание главного окна...');
    // Create the browser window
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
        // Screen capture permissions
        experimentalFeatures: true,
      },
      icon: path.join(__dirname, '../public/logo.ico'),
      titleBarStyle: 'default',
      show: false, // Don't show until ready
    });
  } catch (error) {
    console.error('Error creating window:', error);
    showSplashError(`Ошибка создания окна: ${error.message}`);
    return;
  }

  // Load the Next.js app
  const loadApp = () => {
    try {
      updateSplashProgress(70, 'Подключение к серверу...');
      
      // Use localhost in development, production URL in release
      let startUrl = isDev ? 'http://localhost:3000' : 'https://pozvonimne.vercel.app/';
      
      console.log('Loading URL:', startUrl);
      console.log('Development mode:', isDev);

      let retryCount = 0;
      const maxRetries = isDev ? 15 : 5; // В dev больше попыток для localhost

      // Check if server is running
      const checkServer = async () => {
        try {
          updateSplashProgress(80, isDev ? 'Ожидание dev сервера...' : 'Подключение к сайту...');
          
          const response = await fetch(startUrl, { 
            timeout: isDev ? 5000 : 10000 // В dev меньше таймаут
          });
          
          if (response.ok) {
            console.log('Server is ready, loading app...');
            updateSplashProgress(90, 'Загрузка интерфейса...');
            await mainWindow.loadURL(startUrl);
          } else {
            throw new Error(`Server returned ${response.status}`);
          }
        } catch (error) {
          retryCount++;
          console.error(`Server check failed (${retryCount}/${maxRetries}):`, error.message);
          
          if (retryCount >= maxRetries) {
            if (isDev) {
              showSplashError(`Dev сервер не запущен!\n\nЗапустите: npm run dev\nИли используйте: npm run dev:electron`);
            } else {
              showSplashError(`Не удается подключиться к сайту.\nПроверьте интернет соединение.`);
            }
            return;
          }
          
          updateSplashProgress(75, `Попытка ${retryCount}/${maxRetries}...`);
          setTimeout(checkServer, isDev ? 2000 : 3000);
        }
      };

      checkServer();
    } catch (error) {
      console.error('Error in loadApp:', error);
      showSplashError(`Ошибка загрузки: ${error.message}`);
    }
  };

  // Initial load with delay to ensure Next.js server is ready
  setTimeout(loadApp, 2000);


  // Handle navigation errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Page failed to load:', errorCode, errorDescription, 'URL:', validatedURL);

    // If in development mode and it's a network error, retry
    if (isDev && errorCode === -102) { // ERR_CONNECTION_REFUSED
      console.log('Connection refused, retrying in 3 seconds...');
      setTimeout(() => {
        mainWindow.loadURL('http://localhost:3000');
      }, 3000);
    }
  });

  // Handle successful navigation
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    updateSplashProgress(100, 'Готово!');
    setTimeout(() => {
      closeSplash();
      mainWindow.show();
    }, 500);
  });

  // Handle load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
    showSplashError(`Ошибка загрузки: ${errorDescription}`);
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow external links to open in default browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Prevent new window creation (except for external links)
  mainWindow.webContents.on('new-window', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.origin !== 'http://localhost:3000' && !parsedUrl.hostname.includes('pozvonimne')) {
      event.preventDefault();
      require('electron').shell.openExternal(navigationUrl);
    }
  });

  // Security: Disable navigation to file:// URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.protocol === 'file:') {
      event.preventDefault();
    }
  });
}

// App event listeners
app.whenReady().then(async () => {
  // Create splash screen first
  createSplashWindow();
  updateSplashProgress(10, 'Запуск приложения...');
  
  // Add delay to show splash
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Create main window
  await createWindow();
  setupAutoUpdater();

  // Register global shortcuts
  if (process.platform === 'darwin') {
    globalShortcut.register('Command+Shift+I', () => {
      if (mainWindow) mainWindow.webContents.toggleDevTools();
    });
  } else {
    globalShortcut.register('Control+Shift+I', () => {
      if (mainWindow) mainWindow.webContents.toggleDevTools();
    });
  }
});

app.on('window-all-closed', () => {
  // On macOS, keep the app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('second-instance', () => {
  // Someone tried to run a second instance, focus our window instead
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Security: Disable hardware acceleration on some systems to prevent crashes
app.disableHardwareAcceleration();

// Handle app ready for production
if (!isDev) {
  app.setAboutPanelOptions({
    applicationName: 'Позвони.мне',
    applicationVersion: app.getVersion(),
    copyright: '© 2024 Позвони.мне',
    version: app.getVersion(),
  });
}

// IPC handlers for communication between main and renderer processes
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('get-network-info', () => {
  return getNetworkInterfaces();
});

ipcMain.handle('get-system-info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.version,
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  };
});

ipcMain.handle('get-screen-sources', async () => {
  try {
    console.log('📺 Getting screen sources via desktopCapturer...');

    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 150, height: 150 },
      fetchWindowIcons: true
    });

    console.log(`📺 Found ${sources.length} screen sources`);

    // Возвращаем только необходимые данные
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      display_id: source.display_id,
      appIcon: source.appIcon?.toDataURL(),
      thumbnail: source.thumbnail?.toDataURL()
    }));

  } catch (error) {
    console.error('❌ Error getting screen sources:', error);
    throw error;
  }
});

ipcMain.handle('get-system-theme', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

ipcMain.handle('show-message-box', async (event, options) => {
  return dialog.showMessageBox(mainWindow, options);
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  return dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  return dialog.showSaveDialog(mainWindow, options);
});

// Handle app updates
ipcMain.handle('check-for-updates', async () => {
  if (isDev) {
    return { updateAvailable: false, message: 'Обновления недоступны в режиме разработки' };
  }

  try {
    await autoUpdater.checkForUpdates();
    return { updateAvailable: false, message: 'Проверка обновлений запущена' };
  } catch (error) {
    console.error('Error checking for updates:', error);
    return { updateAvailable: false, message: 'Ошибка при проверке обновлений' };
  }
});
