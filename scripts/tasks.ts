// Build steps shared by build.ts (one-off build) and dev.ts (watch mode).
//
// These scripts are run directly by Node (type stripping, Node >= 22.18): no compile step.
// Keep to "erasable" TypeScript only (types and annotations, no enums or parameter
// properties) and use the .ts extension in relative imports. tsconfig.json enforces both.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';

/** Output folder of the build; "main" in package.json points into it (dist/index.js). */
export const distDir = 'dist';

/**
 * Decides per file whether it is copied. Gets the full source path; folders are passed too,
 * so a filter must let folders through or their content is skipped.
 */
type CopyFilter = (file: string) => boolean;

/**
 * Non-TypeScript files the plugin needs at runtime: source folder -> copy filter.
 * Each folder is copied to dist/<folder>. To ship another asset folder, add it here;
 * dev.ts watches the same folders.
 */
export const assetDirs: Record<string, CopyFilter> = {
  // Translations: only the .yaml files (and folders, which have no "." in their name).
  lang: (file) => !file.includes('.') || file.endsWith('.yaml'),
  // Custom Homebridge UI, if present: copied as is.
  'homebridge-ui': () => true,
};

/**
 * Path to the TypeScript compiler of this project (node_modules/typescript), so the build
 * never depends on a globally installed tsc. It is run with the current Node binary.
 */
export const tscPath = createRequire(import.meta.url).resolve('typescript/bin/tsc');

/** Deletes dist/ completely, so no files of removed sources are left behind. */
export function clean(): void {
  rmSync(distDir, { recursive: true, force: true });
}

/**
 * Compiles src/ to dist/ (JavaScript, declarations and sourcemaps).
 * tsconfig.build.json limits the build to src/: tests and scripts are not shipped.
 * Throws if tsc reports errors (noEmitOnError: nothing is written then).
 */
export function compile(): void {
  execFileSync(process.execPath, [tscPath, '-p', 'tsconfig.build.json'], { stdio: 'inherit' });
}

/** Copies the asset folders (see assetDirs) into dist/, skipping folders that don't exist. */
export function copyAssets(): void {
  for (const [dir, filter] of Object.entries(assetDirs)) {
    if (existsSync(dir)) {
      cpSync(dir, `${distDir}/${dir}`, { recursive: true, filter });
    }
  }
}
