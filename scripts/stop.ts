// Stops every Homebridge running locally: `npm run stop`.
//
// Useful when a dev session was not ended with Ctrl+C (e.g. a closed terminal or a killed
// task) and Homebridge keeps running in the background, still holding its port
// ("EADDRINUSE" on the next start).
//
// Stops these Node processes, each with all its child processes:
//   - homebridge                (homebridge/bin/homebridge, also when run by `node --watch`)
//   - the dev session           (scripts/dev.ts, which also runs tsc --watch)
//   - the Homebridge UI         (homebridge-config-ui-x standalone / hb-service)
//
//   npm run stop                stop them
//   npm run stop -- --dry-run   only list what would be stopped
import { execFileSync } from 'node:child_process';

/** Command lines that belong to Homebridge. Matches / and \ as path separators. */
const homebridgePattern = /homebridge[\\/]bin[\\/]homebridge|homebridge-config-ui-x|scripts[\\/]dev\.(ts|mjs)/;

const dryRun = process.argv.includes('--dry-run');

interface NodeProcess {
  pid: number;
  commandLine: string;
}

/** Lists all running Node processes with their full command line. */
function listNodeProcesses(): NodeProcess[] {
  if (process.platform === 'win32') {
    // Windows has no `ps`: ask WMI via PowerShell, one "<pid> <command line>" per line.
    const script = 'Get-CimInstance Win32_Process -Filter "Name=\'node.exe\'" | '
      + 'ForEach-Object { "$($_.ProcessId) $($_.CommandLine)" }';
    const output = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
    return parseLines(output.toString());
  }
  // macOS / Linux: all processes ("-A") with pid and full command, no header ("=").
  const output = execFileSync('ps', ['-A', '-o', 'pid=,command=']);
  return parseLines(output.toString()).filter((p) => /\bnode\b/.test(p.commandLine));
}

/** Parses "<pid> <command line>" lines; skips empty lines. */
function parseLines(output: string): NodeProcess[] {
  return output.split(/\r?\n/).flatMap((line) => {
    const match = /^\s*(\d+)\s+(.*)$/.exec(line);
    return match ? [{ pid: Number(match[1]), commandLine: match[2] }] : [];
  });
}

/** Stops a process and its children. A process that is already gone is not an error. */
function stop(pid: number): void {
  try {
    if (process.platform === 'win32') {
      // Windows has no signals: /T also ends the child processes, /F forces it.
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      // SIGTERM lets Homebridge shut down cleanly (it saves its accessory cache).
      process.kill(pid, 'SIGTERM');
    }
  } catch {
    // Already ended, e.g. as the child of a process stopped just before.
  }
}

const targets = listNodeProcesses().filter((p) => p.pid !== process.pid && homebridgePattern.test(p.commandLine));

if (targets.length === 0) {
  console.log('No running Homebridge found.');
}
for (const { pid, commandLine } of targets) {
  console.log(`${dryRun ? 'Would stop' : 'Stopping'} ${pid}: ${commandLine}`);
  if (!dryRun) {
    stop(pid);
  }
}
