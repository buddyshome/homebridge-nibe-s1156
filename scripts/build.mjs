// npm run build  -> clean dist/, compile src/ and copy assets
// npm run clean  -> only clean dist/
import { clean, compile, copyAssets } from './tasks.mjs';

clean();
if (process.argv[2] !== 'clean') {
  try {
    compile();
  } catch {
    console.error('TypeScript compilation failed');
    process.exit(1);
  }
  copyAssets();
}
