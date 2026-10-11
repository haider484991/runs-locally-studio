// Runs the lesson file for real (twice: the first run also loads the model) and keeps what the SECOND run printed:
// the terminal in the video replays THIS output, not a typed copy.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
// Windows has the `py` launcher; macOS and Linux have python3. The command shown in the video is the one that ran.
const PY = process.platform === 'win32' ? 'py' : 'python3';
const code0Cmd = `${PY} nextword.py`;
const dir = new URL('../evidence/code/', import.meta.url);
const run = () => { const t0 = Date.now(); const r = spawnSync(PY, ['nextword.py'], { cwd: dir, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }); return { r, s: +((Date.now() - t0) / 1000).toFixed(2) }; };
const first = run(); if (first.r.status !== 0) throw new Error('the lesson file failed: ' + first.r.stderr);
const { r, s } = run(); if (r.status !== 0) throw new Error('the lesson file failed: ' + r.stderr);
const lines = fs.readFileSync(new URL('nextword.py', dir), 'utf8').replace(/\r/g, '').trimEnd().split('\n');
const ver = spawnSync(PY, ['-c', 'import requests,sys;print(sys.version.split()[0], requests.__version__)'], { encoding: 'utf8' }).stdout.trim();
const out = { file: 'nextword.py', lines, cmd: code0Cmd, exit: r.status, stdout: r.stdout.replace(/\r/g, '').trimEnd().split('\n'), firstRunStdout: first.r.stdout.replace(/\r/g, '').trimEnd().split('\n'), stderr: r.stderr.trim(), seconds: s, python_and_requests: ver, ts: new Date().toISOString() };
fs.writeFileSync(new URL('../evidence/code-run.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
