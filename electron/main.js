const { app, BrowserWindow, Menu, ipcMain, dialog, globalShortcut, desktopCapturer, nativeTheme, Tray } = require('electron');
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
    // Configure electron-updater for differential updates
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowDowngrade = false;
    autoUpdater.allowPrerelease = false;
    
    // Enable differential downloads (smaller updates)
    autoUpdater.forceDevUpdateConfig = false;

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
      const percent = Math.round(progressObj.percent);
      let log_message = "Download speed: " + Math.round(progressObj.bytesPerSecond / 1024) + " KB/s";
      log_message = log_message + ' - Downloaded ' + percent + '%';
      log_message = log_message + ' (' + Math.round(progressObj.transferred / 1024 / 1024 * 100) / 100 + "/" + Math.round(progressObj.total / 1024 / 1024 * 100) / 100 + ' MB)';
    console.log(log_message);
      
      // Показать прогресс в главном окне (если есть)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', {
          percent: percent,
          speed: Math.round(progressObj.bytesPerSecond / 1024),
          transferred: Math.round(progressObj.transferred / 1024 / 1024 * 100) / 100,
          total: Math.round(progressObj.total / 1024 / 1024 * 100) / 100
        });
      }
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
let tray;

// Create system tray
function createTray() {
  try {
    // Используем иконку приложения для трея с fallback'ом
    let iconPath;
    if (isDev) {
      iconPath = path.join(process.cwd(), 'public/logo.png');
    } else {
      // В production ищем в extraResources
      iconPath = path.join(process.resourcesPath, 'public/logo.png');
      
      // Если не найдена, попробуем альтернативные пути
      if (!require('fs').existsSync(iconPath)) {
        const altPaths = [
          path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'logo.png'),
          path.join(__dirname, 'logo.png'),
          path.join(process.resourcesPath, 'logo.png')
        ];
        
        for (const altPath of altPaths) {
          if (require('fs').existsSync(altPath)) {
            iconPath = altPath;
            break;
          }
        }
      }
    }

    console.log('Creating tray with icon:', iconPath)
    console.log('Icon exists:', require('fs').existsSync(iconPath))

    // Если иконка не найдена, используем системную иконку
    if (!require('fs').existsSync(iconPath)) {
      console.warn('Tray icon not found, creating tray without custom icon')
      // Создаем простую белую иконку 16x16
      const nativeImage = require('electron').nativeImage;
      const emptyIcon = nativeImage.createEmpty();
      tray = new Tray(emptyIcon);
    } else {
      tray = new Tray(iconPath);
    }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Показать',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: 'Скрыть',
      click: () => {
        if (mainWindow) {
          mainWindow.hide()
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Выйти',
      click: () => {
        app.isQuiting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('Позвони.мне')
  tray.setContextMenu(contextMenu)

  // Клик по трею - показать/скрыть окно
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.show()
          mainWindow.focus()
        }
      }
    })
  } catch (error) {
    console.error('Failed to create tray:', error)
    // Continue without tray if icon is missing
  }
}

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

  // Правильные пути для splash screen
  let splashPath;
  if (isDev) {
    splashPath = path.join(__dirname, 'splash.html');
  } else {
    // В production файлы находятся в resources/app.asar.unpacked
    splashPath = path.join(__dirname, 'splash.html');
    
    // Если файл не найден, попробуем альтернативные пути
    if (!require('fs').existsSync(splashPath)) {
      const altPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'splash.html');
      if (require('fs').existsSync(altPath)) {
        splashPath = altPath;
      } else {
        // Создаем минимальный HTML прямо в коде
        const tempHtml = path.join(require('os').tmpdir(), 'splash.html');
        require('fs').writeFileSync(tempHtml, `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                background: linear-gradient(135deg, #1e293be6, #1e293bcc);
                color: white; 
                font-family: Arial, sans-serif; 
                text-align: center;
                display: flex;
                flex-direction: column;
                justify-content: center;
                height: 100vh;
              }
              .progress { 
                width: 80%; 
                height: 4px; 
                background: #333; 
                margin: 20px auto; 
                border-radius: 2px; 
              }
              .progress-bar { 
                height: 100%; 
                background: #0066cc; 
                width: 0%; 
                border-radius: 2px; 
              }
            </style>
          </head>
          <body>
            <h2>Позвони.мне</h2>
            <div class="progress"><div class="progress-bar" id="progressBar"></div></div>
            <p id="status">Запуск приложения...</p>
          </body>
          </html>
        `);
        splashPath = tempHtml;
      }
    }
  }

  console.log('Loading splash from:', splashPath)
  console.log('Splash file exists:', require('fs').existsSync(splashPath))

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
    try {
      splashWindow.webContents.send('splash-progress', { progress, message });
    } catch (error) {
      console.log('Could not update splash progress:', error.message)
    }
  }
}

function showSplashError(errorMessage) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    try {
      splashWindow.webContents.send('splash-error', errorMessage);
    } catch (error) {
      console.log('Could not show splash error:', error.message)
    }
  }
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    try {
      splashWindow.webContents.send('splash-close');
      setTimeout(() => {
        try {
          if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
          }
        } catch (error) {
          console.log('Could not close splash (timeout):', error.message)
        }
      }, 500);
      splashWindow = null;
    } catch (error) {
      console.log('Could not close splash:', error.message)
      splashWindow = null;
    }
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

  // Handle window minimize - hide to tray
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  // Handle window close - hide instead of quit
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

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
  console.log('🚀 App is ready, starting initialization...')
  console.log('📁 __dirname:', __dirname)
  console.log('📁 process.cwd():', process.cwd())
  console.log('📁 process.resourcesPath:', process.resourcesPath)
  console.log('🔧 isDev:', isDev)
  
  try {
    // Create system tray first
    console.log('🎯 Creating system tray...')
    createTray();
    console.log('✅ Tray created successfully')
  } catch (error) {
    console.error('❌ Tray creation failed:', error)
  }
  
  try {
    // Create splash screen first (optional - continue if fails)
    console.log('💫 Creating splash screen...')
    createSplashWindow();
    updateSplashProgress(10, 'Запуск приложения...');
    console.log('✅ Splash screen created')
  } catch (error) {
    console.error('❌ Splash screen creation failed, continuing without splash:', error)
    // Continue without splash screen
  }
  
  // Add delay to show splash
  await new Promise(resolve => setTimeout(resolve, 500));
  
  try {
    // Create main window
    console.log('🪟 Creating main window...')
    await createWindow();
    console.log('✅ Main window created')
  } catch (error) {
    console.error('❌ Main window creation failed:', error)
  }
  
  try {
    console.log('🔄 Setting up auto-updater...')
  setupAutoUpdater();
    console.log('✅ Auto-updater setup complete')
  } catch (error) {
    console.error('❌ Auto-updater setup failed:', error)
  }

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
  // Don't quit the app when all windows are closed - keep running in tray
  // except when explicitly quitting
  if (app.isQuiting) {
    app.quit();
  }
  // Keep app running in tray on all platforms
});

app.on('activate', () => {
  // Show main window when dock icon is clicked (macOS)
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else if (BrowserWindow.getAllWindows().length === 0) {
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

// Performance and memory optimizations
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');

// Memory optimization
app.commandLine.appendSwitch('--memory-pressure-off');
app.commandLine.appendSwitch('--max_old_space_size', '4096');

// Only disable hardware acceleration if needed
if (process.platform === 'linux') {
app.disableHardwareAcceleration();
}

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
