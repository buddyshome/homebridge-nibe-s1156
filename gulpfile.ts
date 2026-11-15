import {dest, parallel, series, src, watch as gulpWatch} from 'gulp';
import gulpESLintNew from 'gulp-eslint-new';
import nodemon from 'nodemon';
import { execFile, execSync, spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const destDir = 'dist/';

exports.uiBuild = () => src('homebridge-ui/**')
  .pipe(dest(`${destDir}homebridge-ui/`));

exports.yamlBuild = () => src('+(config|lang)/*.yaml')
  .pipe(dest(`${destDir}`));

// Compile with the TypeScript compiler itself; tsconfig.build.json limits it to src/
// and tsc writes the sourcemaps (pointing back to src/) on its own.
exports.typescriptBuild = () => new Promise<void>((resolve, reject) => {
  const tsc = require.resolve('typescript/bin/tsc');
  execFile(process.execPath, [tsc, '-p', 'tsconfig.build.json'], (error, stdout, stderr) => {
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    if (error) {
      reject(new Error('TypeScript compilation failed'));
    } else {
      resolve();
    }
  });
});

exports.eslint = () => src(['src/**/*.ts', 'gulpfile.ts'])
  .pipe(gulpESLintNew())
  .pipe(gulpESLintNew.format())
  .pipe(gulpESLintNew.failAfterError());

exports.eslintFix = () => src(['src/**/*.ts', 'gulpfile.ts'])
  .pipe(gulpESLintNew({ fix: true }))
  .pipe(gulpESLintNew.fix());

exports.clean = async () => fs.rmSync(destDir, { recursive: true, force: true });

exports.build = parallel(exports.yamlBuild, exports.typescriptBuild, exports.uiBuild);

// Use the globally installed homebridge
// (npm run puts node_modules/.bin first on PATH).
const globalHomebridge = () => {
  const prefix = execSync('npm prefix -g').toString().trim();
  return process.platform === 'win32'
    ? path.join(prefix, 'homebridge.cmd')
    : path.join(prefix, 'bin', 'homebridge');
};

// Homebridge UI (hb-service style) reads its log from <storage>/homebridge.log.
const homebridgeLogFile = path.join(os.homedir(), '.homebridge', 'homebridge.log');

// gulp rebuilds sources into dist/, nodemon restarts homebridge when dist/ changes.
exports.watch = (done) => {
  gulpWatch('src/**/*.ts', exports.typescriptBuild);
  gulpWatch('homebridge-ui/**', exports.uiBuild);
  gulpWatch('+(config|lang)/*.yaml', exports.yamlBuild);

  // nodemon's bundled types require `script` (not needed with `exec`) and lack the
  // 'readable'/'quit' events on the returned instance, so treat it as an EventEmitter.
  const startNodemon = nodemon as unknown as (settings: object) => NodeJS.EventEmitter;
  startNodemon({
    exec: `"${globalHomebridge()}" -I -D`,
    signal: 'SIGTERM',
    stdout: false,
    watch: [destDir],
    ext: 'js html yaml',
    delay: 1000,
    env: { 'NODE_OPTIONS': '--trace-warnings' },
  }).on('readable', function (this: { stdout: NodeJS.ReadableStream; stderr: NodeJS.ReadableStream }) {
    // Fires on each (re)start: mirror output to the console and to the UI log file.
    const logFile = fs.createWriteStream(homebridgeLogFile, { flags: 'a' });
    this.stdout.pipe(process.stdout, { end: false });
    this.stderr.pipe(process.stderr, { end: false });
    this.stdout.pipe(logFile);
    this.stderr.pipe(logFile, { end: false });
  }).on('quit', () => {
    done();
    process.exit();
  });
};

// Node's built-in test runner runs the .ts tests directly (type stripping, Node >= 22.18),
// with coverage for src/ printed to the console and written to coverage/lcov.info.
exports.unitTest = () => new Promise<void>((resolve, reject) => {
  const args = [
    '--test',
    '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
    '--experimental-test-coverage',
    '--test-coverage-include=src/**',
    '--test-reporter=spec', '--test-reporter-destination=stdout',
    '--test-reporter=lcov', '--test-reporter-destination=coverage/lcov.info',
    'tests/**/*.test.ts',
  ];
  spawn(process.execPath, args, { stdio: 'inherit' }).on('exit', (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(new Error('Tests failed'));
    }
  });
});

exports.test = series(exports.eslint, exports.unitTest);
exports.default = exports.build;