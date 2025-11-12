const { spawn } = require('node:child_process');
const waitOn = require('wait-on');
const electronPath = require('electron');

async function main() {
  // Ensure renderer knows we're running against the Vite dev server
  process.env.NODE_ENV = 'development';
  if (!process.env.VITE_DEV_SERVER_URL) {
    process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
  }

  // Wait for Vite to finish booting before launching Electron
  await waitOn({ resources: ['tcp:5173'] });

  const child = spawn(electronPath, ['.'], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error('[electron-dev] Failed to start Electron:', error);
  process.exit(1);
});
