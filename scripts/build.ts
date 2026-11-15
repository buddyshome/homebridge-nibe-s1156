// Production build, used by npm publish (prepublishOnly) and before `npm run develop`.
//
//   npm run build  -> node scripts/build.ts        clean dist/, compile src/, copy assets
//   npm run clean  -> node scripts/build.ts clean  only clean dist/ (also runs after publish)
import { clean, compile, copyAssets } from './tasks.ts';

// argv[0] is node, argv[1] this script, argv[2] the first argument after it.
const onlyClean = process.argv[2] === 'clean';

// Always start from an empty dist/.
clean();

if (!onlyClean) {
  try {
    compile();
  } catch {
    // tsc has already printed the errors; just fail the npm script with a short summary.
    console.error('TypeScript compilation failed');
    process.exit(1);
  }
  copyAssets();
}
