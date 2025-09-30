const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  console.log('🧹 Cleaning electron build...');

  const appOutDir = context.appOutDir;

  try {
    // Remove problematic sharp directories for other platforms
    const sharpDirs = [
      'node_modules/@img/sharp-darwin-arm64',
      'node_modules/@img/sharp-darwin-x64',
      'node_modules/@img/sharp-linux-arm64',
      'node_modules/@img/sharp-linux-x64',
      'node_modules/@img/sharp-win32-ia32'
    ];

    sharpDirs.forEach(dir => {
      const fullPath = path.join(appOutDir, dir);
      if (fs.existsSync(fullPath)) {
        console.log(`🗑️ Removing ${dir}...`);
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    });

    // Clean up other unnecessary files
    function cleanDirectory(dirPath, patterns) {
      if (!fs.existsSync(dirPath)) return;

      const items = fs.readdirSync(dirPath);

      items.forEach(item => {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          // Check if directory matches patterns
          if (patterns.some(pattern => item.includes(pattern.replace('**/', '').replace('/**', '')))) {
            console.log(`🗑️ Removing directory: ${item}`);
            fs.rmSync(itemPath, { recursive: true, force: true });
          } else {
            // Recursively clean subdirectories
            cleanDirectory(itemPath, patterns);
          }
        } else if (stat.isFile()) {
          // Check if file matches patterns
          if (patterns.some(pattern => {
            const ext = pattern.replace('node_modules/**/*.', '');
            return item.endsWith('.' + ext) || pattern.includes(item);
          })) {
            console.log(`🗑️ Removing file: ${item}`);
            fs.unlinkSync(itemPath);
          }
        }
      });
    }

    const nodeModulesPath = path.join(appOutDir, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      cleanDirectory(nodeModulesPath, ['.md', '.txt', '.map', '.ts', '.coffee', '.cache']);
    }

    console.log('✅ Electron build cleaned successfully!');
  } catch (error) {
    console.error('❌ Error cleaning electron build:', error);
  }
};
