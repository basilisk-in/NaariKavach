const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Read the SVG file
const svgBuffer = fs.readFileSync(path.join(__dirname, 'assets', 'landing.svg'));

// Function to generate PNG icons
async function generateIcons() {
  try {
    // App Icon (1024x1024) - for app stores
    await sharp(svgBuffer)
      .resize(1024, 1024)
      .png()
      .toFile(path.join(__dirname, 'assets', 'app-icon.png'));
    
    // Icon (512x512) - main app icon
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(__dirname, 'assets', 'icon.png'));
    
    // Adaptive Icon (192x192) - Android
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(__dirname, 'assets', 'adaptive-icon.png'));
    
    // Splash Icon (200x200) - splash screen
    await sharp(svgBuffer)
      .resize(200, 200)
      .png()
      .toFile(path.join(__dirname, 'assets', 'splash-icon.png'));
    
    // Favicon (32x32) - web
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, 'assets', 'favicon.png'));
    
    console.log('✅ All app icons generated successfully!');
    console.log('Generated files:');
    console.log('  - app-icon.png (1024x1024)');
    console.log('  - icon.png (512x512)');
    console.log('  - adaptive-icon.png (192x192)');
    console.log('  - splash-icon.png (200x200)');
    console.log('  - favicon.png (32x32)');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
}

generateIcons();
