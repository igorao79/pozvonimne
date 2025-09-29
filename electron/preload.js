const { contextBridge, ipcRenderer } = require('electron');

// Listen for system theme changes
ipcRenderer.on('system-theme-changed', (event, theme) => {
  console.log('🎨 System theme changed to:', theme);
  // Dispatch custom event for React components
  window.dispatchEvent(new CustomEvent('system-theme-changed', { detail: theme }));
});

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // Dialogs
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // Window controls (if needed)
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),

  // File system (limited access)
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),

  // Notifications
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Network (for WebRTC troubleshooting)
  getNetworkInfo: () => ipcRenderer.invoke('get-network-info'),

  // Screen sharing (desktop capture)
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),

  // System theme
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
});

// Also expose a simple API for common operations
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});
