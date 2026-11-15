// Unit tests: `npm test` runs lint and the type check first, then this script.
//
// Node's built-in test runner (node:test) runs the .ts tests directly (type stripping,
// Node >= 22.18), so no test framework or compile step is needed. It reports twice:
//   - spec: readable results on the console
//   - lcov: coverage of src/ in coverage/lcov.info (for editors and coverage services)
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

// The lcov reporter does not create its output folder, and coverage/ is not in git
// (a fresh clone or CI checkout does not have it).
mkdirSync('coverage', { recursive: true });

// Run the tests in a child Node process: the test runner options are Node CLI flags.
const { status } = spawnSync(process.execPath, [
  '--test',
  '--experimental-test-coverage',
  // Measure coverage for the plugin code only, not for the tests themselves.
  '--test-coverage-include=src/**',
  // Each --test-reporter pairs with the --test-reporter-destination that follows it.
  '--test-reporter=spec', '--test-reporter-destination=stdout',
  '--test-reporter=lcov', '--test-reporter-destination=coverage/lcov.info',
  // Node expands this glob itself (no shell involved), so it works on Windows too.
  'tests/**/*.test.ts',
], { stdio: 'inherit' });

// Pass the test result on to npm. status is null if the child was killed: count that as failed.
process.exit(status ?? 1);
