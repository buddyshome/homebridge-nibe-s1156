// Build steps shared by build.mjs and dev.mjs.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';

export const distDir = 'dist';

// Non-TypeScript files that belong in dist/: source folder -> copy filter.
export const assetDirs = {
  lang: (file) => !file.includes('.') || file.endsWith('.yaml'),
  'homebridge-ui': () => true,
};

export const tscPath = createRequire(import.meta.url).resolve('typescript/bin/tsc');

export function clean() {
  rmSync(distDir, { recursive: true, force: true });
}

// tsconfig.build.json limits tsc to src/; tsc also writes the sourcemaps.
export function compile() {
  execFileSync(process.execPath, [tscPath, '-p', 'tsconfig.build.json'], { stdio: 'inherit' });
}

export function copyAssets() {
  for (const [dir, filter] of Object.entries(assetDirs)) {
    if (existsSync(dir)) {
      cpSync(dir, `${distDir}/${dir}`, { recursive: true, filter });
    }
  }
}
