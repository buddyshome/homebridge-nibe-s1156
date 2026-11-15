// Development mode: `npm run develop` (builds and links the plugin first, then runs this).
//
// Three things run side by side until Ctrl+C:
//   1. tsc --watch      recompiles src/ into dist/ on every change
//   2. fs.watch         copies changed assets (lang/, homebridge-ui/) into dist/
//   3. homebridge       the globally installed one, started by Node's watch mode, which
//                       restarts it whenever a file in dist/ changes (so after 1. and 2.)
// Homebridge output goes to the console and to ~/.homebridge/homebridge.log, where the
// Homebridge UI reads its log from.
import { type ChildProcess, execSync, spawn } from 'node:child_process';
import { createWriteStream, watch } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { assetDirs, copyAssets, distDir, tscPath } from './tasks.ts';

// Homebridge is not a dependency of this project: use the globally installed one
// (npm install -g homebridge). `npm root -g` prints the global node_modules folder.
const globalModules = execSync('npm root -g').toString().trim();
const homebridge = path.join(globalModules, 'homebridge', 'bin', 'homebridge.js');

// Append (flags 'a'), so the log survives restarts and earlier output is kept.
// One stream is shared by all Homebridge restarts.
const logFile = createWriteStream(path.join(homedir(), '.homebridge', 'homebridge.log'), { flags: 'a' });

// Every started child process, so shutdown() can stop all of them.
const children: ChildProcess[] = [];

// 1. TypeScript in watch mode. --preserveWatchOutput keeps tsc from clearing the console
//    (which would also wipe the Homebridge output). stdout is piped so we can read it below.
const tsc = spawn(process.execPath, [tscPath, '-p', 'tsconfig.build.json', '--watch', '--preserveWatchOutput'], {
  stdio: ['ignore', 'pipe', 'inherit'],
});
children.push(tsc);

// tsc --watch rewrites all of dist/ once when it starts. Starting Homebridge before that
// would make Node's watch mode restart it right away, so wait for tsc's first
// "Watching for file changes" message, which it prints after each build.
let homebridgeStarted = false;
tsc.stdout?.on('data', (chunk: Buffer) => {
  process.stdout.write(chunk);
  if (!homebridgeStarted && chunk.toString().includes('Watching for file changes')) {
    homebridgeStarted = true;
    startHomebridge();
  }
});

// 2. Copy assets again whenever something in an asset folder changes. Copying all of them
//    is cheap, and the resulting change in dist/ triggers the Homebridge restart.
//    (recursive watching works on Windows, macOS and Linux with Node >= 20.)
for (const dir of Object.keys(assetDirs)) {
  watch(dir, { recursive: true }, () => copyAssets());
}

// 3. Start Homebridge under Node's watch mode.
function startHomebridge(): void {
  const child = spawn(process.execPath, [
    // Node flags: restart the script when dist/ changes, and don't clear the console then.
    '--watch-path', distDir,
    '--watch-preserve-output',
    // Print a stack trace for Node warnings (e.g. deprecations), to find where they come from.
    '--trace-warnings',
    homebridge,
    // Homebridge flags: -I insecure mode (lets the Homebridge UI control accessories),
    // -D debug logging (shows the plugin's debug messages).
    '-I', '-D',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);

  // Mirror Homebridge output to the console and to the UI log file.
  const outputs: [NodeJS.ReadableStream | null, NodeJS.WritableStream][] = [
    [child.stdout, process.stdout],
    [child.stderr, process.stderr],
  ];
  for (const [source, target] of outputs) {
    source?.on('data', (chunk: Buffer) => {
      target.write(chunk);
      logFile.write(chunk);
    });
  }

  // Node's watch mode keeps running across restarts. It only exits if it is stopped,
  // so then end the whole dev session (tsc and the asset watchers) as well.
  child.on('exit', () => shutdown());
}

// Stop all child processes and exit. Without this, Ctrl+C on Windows can leave tsc or
// Homebridge running in the background (and Homebridge keeps its port in use).
function shutdown(): void {
  for (const child of children) {
    child.kill();
  }
  process.exit();
}

process.on('SIGINT', shutdown);   // Ctrl+C
process.on('SIGTERM', shutdown);  // kill / task stop
