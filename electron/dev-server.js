const { spawn } = require('child_process');
const path = require('path');

// Function to start Next.js dev server and Electron
async function startDevEnvironment() {
  console.log('🚀 Starting development environment...');

  // Start Next.js dev server
  console.log('📦 Starting Next.js development server...');
  const nextProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: '3000' }
  });

  // Wait for Next.js to be ready
  console.log('⏳ Waiting for Next.js server to be ready...');
  let retries = 0;
  const maxRetries = 30;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch('http://localhost:3000');
      if (response.ok) {
        console.log('✅ Next.js server is ready!');
        break;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    retries++;
    
    if (retries >= maxRetries) {
      console.error('❌ Next.js server failed to start after 30 seconds');
      process.exit(1);
    }
  }

  // Start Electron
  console.log('⚡ Starting Electron app...');
  const electronProcess = spawn('npm', ['run', 'electron'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });

  // Handle process cleanup
  process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down development environment...');
    nextProcess.kill();
    electronProcess.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    nextProcess.kill();
    electronProcess.kill();
    process.exit(0);
  });
}

startDevEnvironment().catch(console.error);
