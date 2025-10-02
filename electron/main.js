const { app, BrowserWindow, Menu, ipcMain, dialog, globalShortcut, desktopCapturer, nativeTheme, Tray } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Флаг для отслеживания первого запуска
let isFirstLaunch = true;
let isQuitting = false;

// Remove default menu
Menu.setApplicationMenu(null);

// Listen for system theme changes and notify renderer
nativeTheme.on('updated', () => {
  const isDarkMode = nativeTheme.shouldUseDarkColors;
  if (isDev) console.log('System theme changed:', isDarkMode ? 'dark' : 'light');

  // Notify all windows about theme change
  BrowserWindow.getAllWindows().forEach(window => {
    if (!window.isDestroyed()) {
      window.webContents.send('system-theme-changed', isDarkMode ? 'dark' : 'light');
    }
  });
});

// Import WebRTC fixes
const { applyWebRTCFixes, getNetworkInterfaces } = require('./webrtc-fix');

// Переменная для отслеживания статуса обновления
let updateCheckComplete = false;
let updateRequired = false;

// Определяем, является ли это portable версией
function isPortableVersion() {
  // Portable версия запускается из .exe файла напрямую
  // Установленная версия находится в Program Files или AppData
  const appPath = app.getAppPath();
  const exePath = app.getPath('exe');
  
  // Проверяем наличие папки установки
  const isInstalled = exePath.includes('AppData') || 
                      exePath.includes('Program Files') ||
                      exePath.includes('Program Files (x86)');
  
  log.info(`App path: ${appPath}`);
  log.info(`Exe path: ${exePath}`);
  log.info(`Is installed: ${isInstalled}`);
  
  return !isInstalled;
}

// Setup auto-updater - БЛОКИРУЮЩАЯ проверка при запуске
async function checkForUpdatesOnStartup() {
  if (isDev) {
    log.info('Skipping auto-updater in development mode');
    return true; // Разрешаем продолжить в dev режиме
  }

  // Проверяем, является ли это portable версией
  const isPortable = isPortableVersion();
  
  if (isPortable) {
    log.info('📦 Portable version detected - manual update only');
    updateSplashProgress(20, 'Portable версия - ручное обновление');
    
    // Все равно проверяем обновления, но не блокируем
    return new Promise((resolve) => {
      try {
        autoUpdater.logger = log;
        autoUpdater.autoDownload = false;
        
        autoUpdater.on('update-available', (info) => {
          log.info('✨ Update available for portable:', info.version);
          
          // Показываем уведомление с ссылкой
          if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.webContents.send('update-available-portable', {
              version: info.version,
              downloadUrl: `https://github.com/igorao79/pozvonimne/releases/latest`
            });
          }
        });
        
        autoUpdater.on('update-not-available', () => {
          log.info('✅ Portable app is up to date');
        });
        
        autoUpdater.on('error', (err) => {
          log.error('❌ Error checking portable update:', err);
        });
        
        // Проверяем, но не блокируем
        autoUpdater.checkForUpdates().catch(() => {});
        
        // Через 5 секунд продолжаем в любом случае
        setTimeout(() => {
          resolve(true);
        }, 5000);
        
      } catch (error) {
        log.error('Error in portable update check:', error);
        resolve(true);
      }
    });
  }

  return new Promise((resolve) => {
    try {
      // Configure logging
      log.transports.file.level = 'info';
      autoUpdater.logger = log;
      
      // Configure electron-updater
      autoUpdater.autoDownload = false; // Не скачиваем автоматически
      autoUpdater.autoInstallOnAppQuit = false;
      autoUpdater.allowDowngrade = false;
      autoUpdater.allowPrerelease = false;
      autoUpdater.disableDifferentialDownload = false; // Дифференциальные обновления как в Discord

      updateSplashProgress(15, 'Проверка обновлений...');

      // Проверяем обновления
      autoUpdater.on('checking-for-update', () => {
        log.info('🔍 Checking for updates...');
        updateSplashProgress(20, 'Поиск обновлений...');
      });

      autoUpdater.on('update-available', (info) => {
        log.info('✨ Update available:', info.version);
        updateRequired = true;
        
        // Показываем уведомление в splash screen
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.webContents.send('update-available', {
            version: info.version,
            releaseNotes: info.releaseNotes,
            releaseDate: info.releaseDate
          });
        }
      });

      autoUpdater.on('update-not-available', () => {
        log.info('✅ App is up to date');
        updateSplashProgress(25, 'Приложение актуально');
        updateCheckComplete = true;
        resolve(true); // Продолжаем запуск
      });

      autoUpdater.on('error', (err) => {
        log.error('❌ Error in auto-updater:', err);
        updateSplashProgress(25, 'Ошибка проверки обновлений');
        updateCheckComplete = true;
        resolve(true); // Продолжаем запуск даже при ошибке
      });

      autoUpdater.on('download-progress', (progressObj) => {
        const percent = Math.round(progressObj.percent);
        const speed = Math.round(progressObj.bytesPerSecond / 1024);
        const transferred = Math.round(progressObj.transferred / 1024 / 1024 * 100) / 100;
        const total = Math.round(progressObj.total / 1024 / 1024 * 100) / 100;
        
        log.info(`📥 Downloading: ${percent}% (${transferred}/${total} MB) @ ${speed} KB/s`);
        
        // Обновляем прогресс в splash
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.webContents.send('update-download-progress', {
            percent,
            speed,
            transferred,
            total
          });
        }
      });

      autoUpdater.on('update-downloaded', (info) => {
        log.info('✅ Update downloaded:', info.version);
        
        // Уведомляем splash что обновление скачано
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.webContents.send('update-downloaded', {
            version: info.version
          });
        }
        
        // Автоматически перезапускаем через 2 секунды
        setTimeout(() => {
          log.info('🔄 Restarting to apply update...');
          autoUpdater.quitAndInstall(false, true);
        }, 2000);
      });

      // Запускаем проверку
      autoUpdater.checkForUpdates().catch((error) => {
        log.error('Failed to check for updates:', error);
        updateCheckComplete = true;
        resolve(true);
      });

      // Таймаут на проверку обновлений - 10 секунд
      setTimeout(() => {
        if (!updateCheckComplete && !updateRequired) {
          log.info('⏱️ Update check timeout, continuing...');
          updateCheckComplete = true;
          resolve(true);
        }
      }, 10000);

    } catch (error) {
      log.error('Error in checkForUpdatesOnStartup:', error);
      resolve(true); // Продолжаем запуск при ошибке
    }
  });
}

// Обработчик для кнопки "Обновить" из splash screen
ipcMain.on('start-update-download', () => {
  log.info('🚀 User confirmed update download');
  updateSplashProgress(30, 'Скачивание обновления...');
  autoUpdater.downloadUpdate();
});

// Обработчик для отмены обновления (продолжить со старой версией)
ipcMain.on('skip-update', () => {
  log.info('⏭️ User skipped update');
  updateRequired = false;
  updateCheckComplete = true;
  // Отправляем событие для продолжения загрузки
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('update-skipped');
  }
});

// Keep a global reference of the window object
let mainWindow;
let splashWindow;
let tray = null;

// Создание системного трея
function createTray() {
  if (tray) return; // Трей уже создан

  // Для Windows нужен .ico файл
  let iconPath;
  if (isDev) {
    // В dev режиме используем ico из public
    iconPath = path.join(__dirname, '..', 'public', 'logo.ico');
  } else {
    // В production пробуем разные пути
    const possiblePaths = [
      path.join(process.resourcesPath, 'public', 'logo.ico'),
      path.join(process.resourcesPath, 'app.asar.unpacked', 'public', 'logo.ico'),
      path.join(__dirname, '..', 'public', 'logo.ico'),
      path.join(process.resourcesPath, 'electron', 'logo.png')
    ];
    
    // Находим первый существующий файл
    const fs = require('fs');
    iconPath = possiblePaths.find(p => {
      try {
        return fs.existsSync(p);
      } catch (e) {
        return false;
      }
    }) || possiblePaths[0];
    
    log.info('Tray icon path:', iconPath);
  }
  
  try {
    const { nativeImage } = require('electron');
    const fs = require('fs');
    
    // Проверяем, существует ли файл
    if (fs.existsSync(iconPath)) {
      const icon = nativeImage.createFromPath(iconPath);
      if (!icon.isEmpty()) {
        tray = new Tray(icon);
        log.info('✅ Tray created successfully with icon:', iconPath);
        if (isDev) console.log('✅ Системный трей создан с иконкой:', iconPath);
      } else {
        throw new Error('Icon is empty');
      }
    } else {
      throw new Error('Icon file not found: ' + iconPath);
    }
  } catch (error) {
    log.error('❌ Failed to create tray:', error.message);
    if (isDev) console.error('❌ Ошибка создания трея:', error.message);
    
    // Пробуем создать с пустой иконкой (fallback)
    try {
      const { nativeImage } = require('electron');
      // Создаем простую квадратную иконку 16x16
      const canvas = require('electron').nativeImage.createEmpty();
      tray = new Tray(canvas);
      log.info('⚠️ Tray created with empty icon (fallback)');
      if (isDev) console.warn('⚠️ Трей создан с пустой иконкой (запасной вариант)');
    } catch (e) {
      log.error('❌ Failed to create tray even with empty icon:', e);
      if (isDev) console.error('❌ Не удалось создать трей даже с пустой иконкой:', e);
      return;
    }
  }
  
  if (!tray) {
    log.error('❌ Tray is null after creation attempt');
    return;
  }
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Показать приложение',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Проверить обновления',
      click: async () => {
        if (!isDev) {
          try {
            const result = await autoUpdater.checkForUpdates();
            if (result && result.updateInfo) {
              dialog.showMessageBox({
                type: 'info',
                title: 'Обновление доступно',
                message: `Доступна новая версия ${result.updateInfo.version}`,
                buttons: ['OK']
              });
            } else {
              dialog.showMessageBox({
                type: 'info',
                title: 'Обновлений нет',
                message: 'У вас установлена последняя версия',
                buttons: ['OK']
              });
            }
          } catch (error) {
            log.error('Error checking updates from tray:', error);
          }
        }
      }
    },
    { type: 'separator' },
    {
      label: `Позвони.мне v${app.getVersion()}`,
      enabled: false,
      icon: null
    },
    {
      label: `Electron v${process.versions.electron}`,
      enabled: false,
      visible: isDev // Показываем только в dev режиме
    },
    { type: 'separator' },
    {
      label: 'Выход',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  const appVersion = app.getVersion();
  tray.setToolTip(`Позвони.мне v${appVersion} - Аудио звонки`);
  tray.setContextMenu(contextMenu);
  
  if (isDev) {
    console.log(`📱 Версия приложения: ${appVersion}`);
    console.log(`⚡ Версия Electron: ${process.versions.electron}`);
    console.log(`🟢 Версия Node: ${process.versions.node}`);
  }
  log.info(`App version in tray: ${appVersion}`);

  // Показать окно при клике на иконку в трее
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Двойной клик - показать окно
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
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
      
      if (isDev) console.log('Loading URL:', startUrl);
      if (isDev) console.log('Development mode:', isDev);

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
            if (isDev) console.log('Server is ready, loading app...');
            updateSplashProgress(90, 'Загрузка интерфейса...');
            await mainWindow.loadURL(startUrl);
          } else {
            throw new Error(`Server returned ${response.status}`);
          }
        } catch (error) {
          retryCount++;
          if (isDev) console.error(`Server check failed (${retryCount}/${maxRetries}):`, error.message);
          
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
      if (isDev) console.error('Error in loadApp:', error);
      showSplashError(`Ошибка загрузки: ${error.message}`);
    }
  };

  // Initial load with delay to ensure Next.js server is ready
  setTimeout(loadApp, 2000);


  // Handle navigation errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (isDev) console.error('Page failed to load:', errorCode, errorDescription, 'URL:', validatedURL);

    // If in development mode and it's a network error, retry
    if (isDev && errorCode === -102) { // ERR_CONNECTION_REFUSED
      if (isDev) console.log('Connection refused, retrying in 3 seconds...');
      setTimeout(() => {
        mainWindow.loadURL('http://localhost:3000');
      }, 3000);
    }
  });

  // Handle successful navigation
  mainWindow.webContents.on('did-finish-load', () => {
    if (isDev) console.log('Page loaded successfully');
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
    if (isDev) console.error('Failed to load:', errorCode, errorDescription);
    showSplashError(`Ошибка загрузки: ${errorDescription}`);
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close - минимизируем в трей вместо закрытия
  mainWindow.on('close', (event) => {
    if (isDev) console.log('🔻 Window close event. isQuitting:', isQuitting, 'Tray exists:', !!tray);
    
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      log.info('Window hidden to tray');
      if (isDev) console.log('✅ Окно спрятано в трей');
      
      // Показываем уведомление при сворачивании
      if (tray && !tray.isDestroyed()) {
        try {
          tray.displayBalloon({
            title: 'Позвони.мне',
            content: 'Приложение свернуто в системный трей. Кликните на иконку для открытия.'
          });
          if (isDev) console.log('💬 Balloon notification displayed');
        } catch (error) {
          log.error('Failed to display balloon:', error);
          if (isDev) console.error('❌ Ошибка показа уведомления:', error);
        }
      } else {
        log.warn('Tray is not available for balloon notification');
        if (isDev) console.warn('⚠️ Трей недоступен для уведомления');
      }
      return false;
    }
  });

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
  // Создаем системный трей сразу
  log.info('🚀 App ready, creating tray...');
  if (isDev) console.log('🚀 Приложение готово, создаем трей...');
  createTray();
  
  if (tray) {
    log.info('✅ Tray is ready');
    if (isDev) console.log('✅ Трей создан и готов');
  } else {
    log.error('❌ Tray creation failed!');
    if (isDev) console.error('❌ Не удалось создать трей!');
  }
  
  // Splash screen показываем ТОЛЬКО при первом запуске приложения
  if (isFirstLaunch) {
    // Create splash screen first
    createSplashWindow();
    updateSplashProgress(10, 'Запуск приложения...');
    
    // ВАЖНО: Проверяем обновления ДО создания главного окна
    const canProceed = await checkForUpdatesOnStartup();
    
    // Если обновление найдено, ждем действия пользователя
    if (updateRequired && !isDev) {
      log.info('⏸️ Waiting for user to handle update...');
      // Ждем пока пользователь не нажмет кнопку в splash
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!updateRequired || updateCheckComplete) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 500);
      });
    }
    
    // Продолжаем только если проверка завершена
    if (updateCheckComplete || isDev) {
      // Add delay to show splash
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create main window
      await createWindow();
      
      // Сбрасываем флаг первого запуска после создания окна
      isFirstLaunch = false;
    }
  } else {
    // При повторном открытии (из трея) - без splash screen
    if (!mainWindow) {
      await createWindow();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
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

// Устанавливаем флаг при выходе из приложения
app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  // НЕ закрываем приложение - оно работает в трее
  // Приложение закроется только при выборе "Выход" из меню трея
  if (process.platform !== 'darwin' && isQuitting) {
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

// Handle app updates - ручная проверка из приложения
ipcMain.handle('check-for-updates', async () => {
  if (isDev) {
    return { updateAvailable: false, message: 'Обновления недоступны в режиме разработки' };
  }

  try {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo) {
      return { 
        updateAvailable: true, 
        version: result.updateInfo.version,
        message: `Доступна версия ${result.updateInfo.version}` 
      };
    }
    return { updateAvailable: false, message: 'У вас последняя версия' };
  } catch (error) {
    log.error('Error checking for updates:', error);
    return { updateAvailable: false, message: 'Ошибка при проверке обновлений' };
  }
});
