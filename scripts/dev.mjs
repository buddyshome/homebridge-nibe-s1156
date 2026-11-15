// npm run develop: tsc rebuilds src/ into dist/ on change, assets are copied on change,
// and Node's watch mode restarts the globally installed homebridge whenever dist/ changes.
import { execSync, spawn } from 'node:child_process';
import { createWriteStream, watch } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { assetDirs, copyAssets, distDir, tscPath } from './tasks.mjs';

// Use the globally installed homebridge, not a local one.
const homebridge = path.join(execSync('npm root -g').toString().trim(), 'homebridge', 'bin', 'homebridge.js');

// Homebridge UI (hb-service style) reads its log from <storage>/homebridge.log.
const logFile = createWriteStream(path.join(homedir(), '.homebridge', 'homebridge.log'), { flags: 'a' });

const children = [];

const tsc = spawn(process.execPath, [tscPath, '-p', 'tsconfig.build.json', '--watch', '--preserveWatchOutput'], {
  stdio: ['ignore', 'pipe', 'inherit'],
});
children.push(tsc);

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

function startHomebridge() {
  const child = spawn(process.execPath, [
    '--watch-path', distDir,
    '--watch-preserve-output',
    '--trace-warnings',
    homebridge, '-I', '-D',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);

  // Mirror homebridge output to the console and to the UI log file (one stream across restarts).
  for (const [stream, target] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
    stream.on('data', (chunk) => {
      target.write(chunk);
      logFile.write(chunk);
    });
  }
  child.on('exit', () => shutdown());
}

function shutdown() {
  for (const child of children) {
    child.kill();
  }
  process.exit();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
