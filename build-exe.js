const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Creator Assistant Build Process...\n');

// Check prerequisites
console.log('🔍 Checking prerequisites...');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Node.js ${nodeVersion} found`);
} catch (error) {
  console.error('❌ Node.js is not installed!');
  console.error('Please install Node.js from https://nodejs.org/');
  process.exit(1);
}

// Check if node_modules exists
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('\n📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
  }
}

// Step 1: Build the web app
console.log('📦 Step 1: Building web application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Web app built successfully\n');
} catch (error) {
  console.error('❌ Failed to build web app');
  process.exit(1);
}

// Step 2: Prepare Electron files
console.log('📁 Step 2: Preparing Electron files...');

// Copy main.js and preload.js to root (electron-builder expects them there)
const filesToCopy = [
  { from: 'electron/main.js', to: 'main.js' },
  { from: 'electron/preload.js', to: 'preload.js' }
];

filesToCopy.forEach(({ from, to }) => {
  const src = path.join(__dirname, from);
  const dest = path.join(__dirname, to);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✓ Copied ${from} → ${to}`);
  } else {
    console.warn(`  ⚠ Warning: ${from} not found`);
  }
});

console.log('✅ Electron files prepared\n');

// Step 3: Build the Electron app
console.log('🔨 Step 3: Building Electron application...');
console.log('   This may take 2-5 minutes...\n');

try {
  // Use the electron-package.json for the build
  const packageJsonPath = path.join(__dirname, 'electron-package.json');
  
  if (fs.existsSync(packageJsonPath)) {
    // Copy electron-package.json to package.json temporarily
    const originalPackageJson = path.join(__dirname, 'package.json');
    const backupPackageJson = path.join(__dirname, 'package.json.backup');
    
    // Backup original package.json
    if (fs.existsSync(originalPackageJson)) {
      fs.copyFileSync(originalPackageJson, backupPackageJson);
    }
    
    // Copy electron package.json
    fs.copyFileSync(packageJsonPath, originalPackageJson);
    
    try {
      execSync('npx electron-builder --win --config electron-builder.json', { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
    } finally {
      // Restore original package.json
      if (fs.existsSync(backupPackageJson)) {
        fs.copyFileSync(backupPackageJson, originalPackageJson);
        fs.unlinkSync(backupPackageJson);
      }
    }
  } else {
    // Fallback: build without modifying package.json
    execSync('npx electron-builder --win --config electron-builder.json', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
  }
  
  console.log('✅ Electron app built successfully\n');
} catch (error) {
  console.error('❌ Failed to build Electron app');
  console.error('\nCommon solutions:');
  console.error('  1. Make sure you have 2GB free disk space');
  console.error('  2. Try running as Administrator');
  console.error('  3. Close other applications to free up RAM');
  console.error('  4. Check the error messages above for specific issues');
  process.exit(1);
}

// Step 4: Show results
console.log('🎉 Build complete!\n');
console.log('📂 Your EXE files are in the "release" folder:\n');

const releaseDir = path.join(__dirname, 'release');
if (fs.existsSync(releaseDir)) {
  const files = fs.readdirSync(releaseDir);
  const exeFiles = files.filter(f => f.endsWith('.exe'));
  
  if (exeFiles.length > 0) {
    exeFiles.forEach(file => {
      const stats = fs.statSync(path.join(releaseDir, file));
      const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
      console.log(`  📄 ${file} (${sizeMB} MB)`);
    });
  } else {
    console.log('  ⚠ No EXE files found in release folder');
    console.log('  Check the build output for errors');
  }
} else {
  console.log('  ⚠ Release folder not found');
  console.log('  The build may have failed');
}

console.log('\n✅ Done!');
console.log('\nNext steps:');
console.log('  1. Open the "release" folder');
console.log('  2. Run the Setup.exe to install');
console.log('  3. Or run the Portable.exe directly');
