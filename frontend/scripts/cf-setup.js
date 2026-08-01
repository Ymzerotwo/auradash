const fs = require('fs');
const path = require('path');

const openNextDir = path.join(__dirname, '..', '.open-next');
const workerPath = path.join(openNextDir, 'worker.js');
const targetWorkerPath = path.join(openNextDir, '_worker.js');
const assetsDir = path.join(openNextDir, 'assets');
const routesPath = path.join(openNextDir, '_routes.json');

// 1. Rename worker.js to _worker.js
if (fs.existsSync(workerPath)) {
  fs.renameSync(workerPath, targetWorkerPath);
  console.log('✅ Renamed worker.js to _worker.js');
}

// 2. Copy assets to root of .open-next
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(assetsDir)) {
  copyDirectory(assetsDir, openNextDir);
  console.log('✅ Copied static assets to .open-next root');
}

// 3. Create _routes.json
const routes = {
  version: 1,
  include: ["/*"],
  exclude: [
    "/_next/*",
    "/favicon.ico",
    "/icon.png",
    "/logo.png"
  ]
};

fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));
console.log('✅ Created _routes.json for static routing');
