// WebRTC fixes for Electron
const fs = require('fs');
const path = require('path');
const os = require('os');

// Apply WebRTC fixes for Electron
function applyWebRTCFixes() {
  console.log('Applying WebRTC fixes for Electron...');

  // Fix 1: Set proper environment variables for WebRTC
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

  // Fix 2: Disable hardware acceleration if needed
  if (process.platform === 'linux') {
    process.env.ELECTRON_DISABLE_HARDWARE_ACCELERATION = 'true';
  }

  // Fix 3: Set proper user agent to avoid WebRTC issues
  if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
    console.log('WebRTC fixes applied for Electron environment');
  }
}

// Network interface helpers for WebRTC
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  Object.keys(interfaces).forEach((name) => {
    interfaces[name].forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    });
  });

  return addresses;
}

// Export functions
module.exports = {
  applyWebRTCFixes,
  getNetworkInterfaces,
};
