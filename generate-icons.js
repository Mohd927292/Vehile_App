const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = './assets/icons/app_icon_clean.svg';
const androidResPath = './android/app/src/main/res';

const iconSizes = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 }
];

async function generateIcons() {
  for (const { folder, size } of iconSizes) {
    const outputDir = path.join(androidResPath, folder);
    
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, 'ic_launcher.png'));
    
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_round.png'));
    
    console.log(`Generated ${size}x${size} icons for ${folder}`);
  }
  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);