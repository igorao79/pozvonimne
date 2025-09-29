const { spawn } = require('child_process');
const path = require('path');

async function runElectronApp() {
  console.log('🚀 Starting simple Electron development...');

  try {
    // Check if Next.js server is running
    console.log('🔍 Checking Next.js server...');
    
    try {
      const response = await fetch('http://localhost:3000');
      if (response.ok) {
        console.log('✅ Next.js server is running, starting Electron...');
      } else {
        throw new Error('Server returned non-OK status');
      }
    } catch (error) {
      console.log('❌ Next.js server not found. Please run "npm run dev" first.');
      console.log('📋 Instructions:');
      console.log('   1. Open terminal 1: npm run dev');
      console.log('   2. Wait for "Ready on http://localhost:3000"');
      console.log('   3. Open terminal 2: npm run electron:simple');
      process.exit(1);
    }

    // Start Electron
    const electronProcess = spawn('electron', ['electron/main.js'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' }
    });

    electronProcess.on('close', (code) => {
      console.log(`Electron exited with code ${code}`);
    });

    electronProcess.on('error', (error) => {
      console.error('Electron error:', error);
    });

  } catch (error) {
    console.error('❌ Failed to start Electron:', error);
  }
}

// Add fetch polyfill for older Node.js versions
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

runElectronApp();
