// npm run develop: tsc rebuilds src/ into dist/ on change, assets are copied on change,
// and nodemon restarts the globally installed homebridge whenever dist/ changes.
import { execSync, spawn } from 'node:child_process';
import { createWriteStream, watch } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import nodemon from 'nodemon';
import { assetDirs, copyAssets, distDir, tscPath } from './tasks.mjs';

// Use the globally installed homebridge (npm run puts node_modules/.bin first on PATH).
const prefix = execSync('npm prefix -g').toString().trim();
const homebridge = process.platform === 'win32'
  ? path.join(prefix, 'homebridge.cmd')
  : path.join(prefix, 'bin', 'homebridge');

// Homebridge UI (hb-service style) reads its log from <storage>/homebridge.log.
const homebridgeLogFile = path.join(homedir(), '.homebridge', 'homebridge.log');

const tsc = spawn(process.execPath, [tscPath, '-p', 'tsconfig.build.json', '--watch', '--preserveWatchOutput'], {
  stdio: ['ignore', 'pipe', 'inherit'],
});

// tsc --watch rewrites dist/ once on start: launch homebridge only after that first build.
let started = false;
tsc.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  if (!started && chunk.toString().includes('Watching for file changes')) {
    started = true;
    startHomebridge();
  }
});

for (const dir of Object.keys(assetDirs)) {
  watch(dir, { recursive: true }, () => copyAssets());
}

const startHomebridge = () => nodemon({
  exec: `"${homebridge}" -I -D`,
  signal: 'SIGTERM',
  stdout: false,
  watch: [distDir],
  ext: 'js html yaml',
  delay: 1000,
  env: { NODE_OPTIONS: '--trace-warnings' },
}).on('readable', function () {
  // Fires on each (re)start: mirror output to the console and to the UI log file.
  const logFile = createWriteStream(homebridgeLogFile, { flags: 'a' });
  this.stdout.pipe(process.stdout, { end: false });
  this.stderr.pipe(process.stderr, { end: false });
  this.stdout.pipe(logFile);
  this.stderr.pipe(logFile, { end: false });
}).on('quit', () => {
  tsc.kill();
  process.exit();
});
