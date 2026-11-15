// Node's built-in test runner runs the .ts tests directly (type stripping, Node >= 22.18),
// with coverage for src/ printed to the console and written to coverage/lcov.info.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

// The lcov reporter does not create its output folder (coverage/ is not in git).
mkdirSync('coverage', { recursive: true });

const { status } = spawnSync(process.execPath, [
  '--test',
  '--experimental-test-coverage',
  '--test-coverage-include=src/**',
  '--test-reporter=spec', '--test-reporter-destination=stdout',
  '--test-reporter=lcov', '--test-reporter-destination=coverage/lcov.info',
  'tests/**/*.test.ts',
], { stdio: 'inherit' });

process.exit(status ?? 1);
