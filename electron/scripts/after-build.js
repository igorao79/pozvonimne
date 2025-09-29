const fs = require('fs');
const path = require('path');

exports.default = async function afterBuild(context) {
  const { appOutDir, packager, electronPlatformName } = context;

  console.log('After build script running for:', electronPlatformName);

  // Create desktop shortcuts for Linux
  if (electronPlatformName === 'linux') {
    try {
      const desktopFile = `[Desktop Entry]
Name=Позвони.мне
Comment=Простое приложение для голосовых звонков
Exec=${appOutDir}/pozvonimne
Icon=${appOutDir}/resources/logo.png
Terminal=false
Type=Application
Categories=Network;Audio;Video;
`;

      fs.writeFileSync(path.join(appOutDir, 'pozvonimne.desktop'), desktopFile);
      console.log('Created desktop file for Linux');
    } catch (error) {
      console.error('Failed to create desktop file:', error);
    }
  }

  console.log('After build script completed');
};
