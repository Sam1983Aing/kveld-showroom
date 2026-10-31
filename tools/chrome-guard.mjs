// chrome-guard.mjs: headless Chrome must never outlive the script that started it.
// Copy this file into a project's tools/ folder and call it right after spawning Chrome.
// Without it, a crash, Ctrl+C or an agent stopping the script leaves Chrome rendering the page at
// full GPU for hours or days (October 2026: one ran 5 days, another burned 64 hours of CPU).
// Every way out closes it: a normal exit, an error, Ctrl+C or kill, and a time limit for a run that hangs.
// The one exit Node can't catch is kill -9. For that, a tiny shell watchdog holds a pipe from this
// process: when the pipe closes, Node is gone, so it shuts Chrome down and deletes the temp folders.
//   const chrome = spawn(CHROME, [..., `--user-data-dir=${PROFILE}`], { stdio: 'ignore' });
//   const chromeGuard = guardChrome(chrome, PROFILE, { timeout: 120000 });
//   chromeGuard.track(dir)  delete this temp folder too when we exit
//   chromeGuard.close()     close Chrome now, as soon as the page work is done (safe to call again)
// First written for piano-teacher/tools/record.mjs. Tested there against a crash, Ctrl+C, kill -9 and a hang.
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { constants } from 'node:os';

const WATCHDOG = `
pid=$1 exe=$2; shift 2
while IFS= read -r dir; do set -- "$@" "$dir"; done
[ "$(ps -p "$pid" -o comm=)" = "$exe" ] && kill -9 "$pid"
sleep 1
rm -rf "$@"`;

export const guardChrome = (chrome, profile, { timeout } = {}) => {
  const temp = [];
  const dog = spawn('/bin/sh', ['-c', WATCHDOG, 'chrome-guard', String(chrome.pid), chrome.spawnfile], { detached: true, stdio: ['pipe', 'ignore', 'ignore'] });
  dog.stdin.on('error', () => {});
  dog.unref();
  dog.stdin.unref();
  let open = true;
  const track = dir => { temp.push(dir); if (open) dog.stdin.write(dir + '\n'); };
  const close = () => {
    // The watchdog goes first, so it can never fire later at a pid the system has handed to something else.
    if (open) { open = false; clearTimeout(timer); try { dog.kill('SIGKILL'); } catch {} try { chrome.kill('SIGKILL'); } catch {} }
    while (temp.length) try { rmSync(temp.pop(), { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch {}
  };
  const timer = timeout ? setTimeout(() => { console.error(`gave up after ${Math.round(timeout / 1000)} s`); process.exit(1); }, timeout) : null;
  timer?.unref();
  track(profile);
  process.on('exit', close);
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => process.exit(128 + constants.signals[sig]));
  return { close, track };
};
