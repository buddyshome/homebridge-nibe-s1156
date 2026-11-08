import {dest, parallel, series, src, watch as gulpWatch} from 'gulp';
import * as ts from 'gulp-typescript';
import del from 'del';
import gulpESLintNew from 'gulp-eslint-new';
import nodemon from 'gulp-nodemon';
import jest from 'gulp-jest';
import sourcemaps from 'gulp-sourcemaps';
import { execSync } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const tsProject = ts.createProject('tsconfig.json', { rootDir: 'src/' });
const destDir = 'dist/';

exports.uiBuild = () => src('homebridge-ui/**')
  .pipe(dest(`${destDir}homebridge-ui/`));

exports.yamlBuild = () => src('+(config|lang)/*.yaml')
  .pipe(dest(`${destDir}`));

exports.typescriptBuild = () => src('src/**/*.ts')
  .pipe(sourcemaps.init())
  .pipe(tsProject())
  .pipe(sourcemaps.write('.', { includeContent: false, sourceRoot: '../src' }))
  .pipe(dest(`${destDir}`));

exports.eslint = () => src(['src/**/*.ts', 'gulpfile.ts'])
  .pipe(gulpESLintNew())
  .pipe(gulpESLintNew.format())
  .pipe(gulpESLintNew.failAfterError());

exports.eslintFix = () => src(['src/**/*.ts', 'gulpfile.ts'])
  .pipe(gulpESLintNew({ fix: true }))
  .pipe(gulpESLintNew.fix());

exports.clean = () => del([`${destDir}`]);

exports.build = parallel(exports.yamlBuild, exports.typescriptBuild, exports.uiBuild);

// Use the globally installed homebridge, not the local devDependency
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
// (gulp-nodemon's own `tasks` option spawns gulp via an unquoted shell path and
// breaks when the project path contains spaces.)
exports.watch = (done) => {
  gulpWatch('src/**/*.ts', exports.typescriptBuild);
  gulpWatch('homebridge-ui/**', exports.uiBuild);
  gulpWatch('+(config|lang)/*.yaml', exports.yamlBuild);

  nodemon({
    exec: `"${globalHomebridge()}" -I -D`,
    signal: 'SIGTERM',
    stdout: false,
    watch: [destDir],
    ext: 'js html yaml',
    delay: 1000,
    env: { 'NODE_OPTIONS': '--trace-warnings' },
    done: done,
  }).on('readable', function (this: { stdout: NodeJS.ReadableStream; stderr: NodeJS.ReadableStream }) {
    // Fires on each (re)start: mirror output to the console and to the UI log file.
    const logFile = fs.createWriteStream(homebridgeLogFile, { flags: 'a' });
    this.stdout.pipe(process.stdout, { end: false });
    this.stderr.pipe(process.stderr, { end: false });
    this.stdout.pipe(logFile);
    this.stderr.pipe(logFile, { end: false });
  });
};

exports.jest = () => {
  process.env.NODE_ENV = 'test';

  return src('tests/**/*.test.ts')
    .pipe(jest({
      preset: 'ts-jest',
      testEnvironment: 'node',
      transform: { '^.+\\.ts?$': 'ts-jest' },
      transformIgnorePatterns: ['<rootDir>/node_modules/'],
      collectCoverage: true,
      coverageReporters: ['json','html'],
    }));
};

exports.test = series(exports.eslint, exports.jest);
exports.default = exports.build;