#!/usr/bin/env node
/**
 * ALIGN — whisper.cpp forced alignment, script-authoritative anchoring.
 *   · input is content/<slug>/script.json (beats[{id, narration}]) and the voiced
 *     beats in public/<slug>/audio/ (scripts/tts.py)
 *   · copies script.json into public/<slug>/ so a render always matches the
 *     timings it was aligned against
 *
 *   node scripts/align.mjs <slug>
 *
 * Output: public/<slug>/timings.json — for every beat, its measured duration
 * and the real start/end of every spoken word. The script text is
 * authoritative; whisper only supplies the clock. Scene cues ("@word") are
 * resolved against these timings when a frame renders.
 *
 * whisper.cpp: installed into ./.whisper on first run (@remotion/install-whisper-cpp,
 * about 470 MB with the small.en model). Already have one? Point WHISPER_DIR at a
 * folder that holds the binary and ggml-<model>.bin.
 */
import { readFile, writeFile, readdir, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { whisperBinary, WHISPER_MODEL as MODEL, WHISPER_VERSION } from './lib/whisper.mjs';

const slug = process.argv[2];
if (!slug) {
  console.error('usage: node scripts/align.mjs <slug>');
  process.exit(1);
}

const pickWhisperDir = () => {
  for (const dir of [process.env.WHISPER_DIR, join(process.cwd(), '.whisper')].filter(Boolean)) {
    const bin = whisperBinary(dir);
    if (bin && existsSync(join(dir, `ggml-${MODEL}.bin`))) return { dir, bin, ready: true };
  }
  return { dir: join(process.cwd(), '.whisper'), bin: null, ready: false };
};

const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '');

// Spoken numbers can never anchor (whisper rewrites "one thousand…" → "$1,000")
// and that is not a defect — they are excluded from the coverage denominator.
const NUMBER_WORDS = new Set(
  ('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen ' +
    'seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand ' +
    'million billion point dollars dollar percent and a')
    .split(' '),
);
const isNumberish = (w) => NUMBER_WORDS.has(norm(w));

const STOPWORDS = new Set(
  ('the and for that this with from they have here just what your you are was but not its it is to of in on or as at be an a i' +
    ' does did has had will can now one two six ten').split(' '),
);
const isAnchorable = (n) => n.length >= 4 && !STOPWORDS.has(n);

// True when two words differ by at most one edit (whisper Americanises).
function nearMatch(a, b) {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5) return false;
  if (Math.abs(a.length - b.length) > 1) return false;
  const [s, t] = a.length >= b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < s.length && j < t.length) {
    if (s[i] === t[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (s.length === t.length) {
      i++;
      j++;
    } else {
      i++;
    }
  }
  return edits + (s.length - i) + (t.length - j) <= 1;
}

// Anchor-based forced alignment: matched distinctive words take whisper's
// timings; runs between anchors are distributed across the real elapsed time
// weighted by word length. Output always has exactly the script's word count.
function alignToScript(scriptWords, whisperWords) {
  const S = scriptWords.map(norm);
  const W = whisperWords.map((w) => norm(w.word));

  const anchors = [];
  let wi = 0;
  for (let si = 0; si < S.length; si++) {
    if (!isAnchorable(S[si])) continue;
    for (let j = wi; j < Math.min(W.length, wi + 8); j++) {
      if (nearMatch(S[si], W[j])) {
        anchors.push([si, j]);
        wi = j + 1;
        break;
      }
    }
  }

  const out = new Array(scriptWords.length);
  const lastEnd = whisperWords.at(-1)?.end ?? 0;
  const bounds = [[-1, -1], ...anchors, [S.length, W.length]];

  for (let k = 0; k < bounds.length - 1; k++) {
    const [s0, w0] = bounds[k];
    const [s1, w1] = bounds[k + 1];

    if (s1 < S.length && w1 < W.length) {
      out[s1] = { word: scriptWords[s1], start: whisperWords[w1].start, end: whisperWords[w1].end };
    }

    const gapStart = w0 >= 0 ? whisperWords[w0].end : 0;
    const gapEnd = w1 < W.length ? whisperWords[w1].start : lastEnd;
    const span = Math.max(0, gapEnd - gapStart);

    const idx = [];
    for (let i = s0 + 1; i < s1; i++) idx.push(i);
    if (!idx.length) continue;

    const weights = idx.map((i) => Math.max(1, norm(scriptWords[i]).length));
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    let t = gapStart;
    idx.forEach((i, n) => {
      const dur = (weights[n] / total) * span;
      out[i] = { word: scriptWords[i], start: t, end: t + dur };
      t += dur;
    });
  }

  return { words: out, anchored: anchors.length };
}

// Guarantee every word occupies at least one frame (repair, not mask — the
// caller measures collapsed words BEFORE this runs).
function enforceMinDuration(words, clipEnd, min = 1 / 30) {
  let prevEnd = 0;
  for (const w of words) {
    if (!w) continue;
    if (w.start < prevEnd) w.start = prevEnd;
    if (w.end - w.start < min) w.end = w.start + min;
    prevEnd = w.end;
  }
  if (clipEnd > 0 && prevEnd > clipEnd) {
    for (const w of words) {
      if (!w) continue;
      w.start = Math.min(w.start, clipEnd);
      w.end = Math.min(w.end, clipEnd);
    }
  }
  return words;
}

const scriptPath = join('content', slug, 'script.json');
const video = JSON.parse(await readFile(scriptPath, 'utf8'));
const audioDir = join('public', slug, 'audio');

if (!existsSync(audioDir)) {
  console.error(`No audio at ${audioDir}. Run: python scripts/tts.py ${slug}`);
  process.exit(1);
}
const files = (await readdir(audioDir)).filter((f) => /\.(wav|mp3)$/i.test(f) && !f.includes('.16k.'));

const workDir = join('public', slug, '.align');
await mkdir(workDir, { recursive: true });

function durationOf(path) {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path],
    { encoding: 'utf8' },
  );
  return parseFloat(out.trim());
}

function to16k(src, id) {
  const dst = join(workDir, `${id}.16k.wav`);
  execFileSync('ffmpeg', ['-y', '-i', src, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', dst], {
    stdio: 'ignore',
  });
  return dst;
}

const whisper = pickWhisperDir();
if (!whisper.ready) {
  console.log(`Installing whisper.cpp ${WHISPER_VERSION} + ${MODEL} into ${whisper.dir} (first run only, about 470 MB)…`);
  const installer = await import('@remotion/install-whisper-cpp');
  await installer.installWhisperCpp({ to: whisper.dir, version: WHISPER_VERSION });
  await installer.downloadWhisperModel({ model: MODEL, folder: whisper.dir });
  whisper.bin = whisperBinary(whisper.dir);
  if (!whisper.bin) {
    console.error(`whisper.cpp did not install a binary into ${whisper.dir}. On macOS/Linux it is built from source: install git, make and a C++ compiler, delete ${whisper.dir} and run again.`);
    process.exit(1);
  }
  console.log('');
} else {
  console.log(`whisper: ${whisper.bin}`);
}

const timings = {};
const problems = [];
const repaired = [];

for (const beat of video.beats) {
  const file = files.find((f) => f.startsWith(`${beat.id}.`) && !f.includes('.16k.'));
  if (!file) {
    problems.push(`${beat.id}: no audio file`);
    continue;
  }
  const path = join(audioDir, file);
  const durationInSeconds = durationOf(path);
  const expected = beat.narration.trim().split(/\s+/).filter(Boolean).length;

  const wav = to16k(path, beat.id);
  const prefix = join(workDir, beat.id);
  execFileSync(
    whisper.bin,
    ['-m', join(whisper.dir, `ggml-${MODEL}.bin`), '-f', wav, '-ml', '1', '-sow', '-oj', '-of', prefix, '-np'],
    { stdio: 'ignore' },
  );

  const json = JSON.parse(await readFile(`${prefix}.json`, 'utf8'));
  const heard = (json.transcription ?? [])
    .map((s) => ({
      word: (s.text ?? '').trim(),
      start: s.offsets.from / 1000,
      end: s.offsets.to / 1000,
    }))
    .filter((w) => w.word && !/^\[.*\]$/.test(w.word));

  const scriptWords = beat.narration.trim().split(/\s+/).filter(Boolean);
  const aligned = alignToScript(scriptWords, heard);
  const words = aligned.words;

  const anchorable = scriptWords.filter((w) => isAnchorable(norm(w)) && !isNumberish(w)).length;
  const anchoredPct = anchorable ? Math.min(1, aligned.anchored / anchorable) : 1;

  const collapsed = words.filter((w) => w.end - w.start < 0.01).length;
  enforceMinDuration(words, durationInSeconds);

  if (anchoredPct < 0.6 && collapsed > Math.max(1, words.length * 0.1)) {
    problems.push(
      `${beat.id}: ${collapsed} words have zero duration and only ${Math.round(anchoredPct * 100)}% anchored — alignment is scrambled`,
    );
  } else if (collapsed) {
    repaired.push(`${beat.id}: ${collapsed} word${collapsed > 1 ? 's' : ''} widened to one frame`);
  }

  timings[beat.id] = {
    durationInSeconds,
    audioSrc: `${slug}/audio/${file}`,
    words,
  };

  console.log(
    `  ${beat.id}  ${durationInSeconds.toFixed(2)}s  ${words.length}/${expected} words  ${Math.round(anchoredPct * 100)}% anchored`,
  );
}

await writeFile(join('public', slug, 'timings.json'), JSON.stringify(timings, null, 2));
// A render must always see the script its timings were measured against.
await copyFile(scriptPath, join('public', slug, 'script.json'));

const total = Object.values(timings).reduce((s, t) => s + t.durationInSeconds, 0);
console.log(`\nWrote public/${slug}/timings.json — ${total.toFixed(1)}s of narration.`);

if (repaired.length) {
  console.log('\nRepaired (well-anchored beats where words were packed too tightly):');
  for (const r of repaired) console.log(`  ~ ${r}`);
}

if (problems.length) {
  console.log('\nAlignment problems — do NOT render until these are resolved:');
  for (const p of problems) console.log(`  ! ${p}`);
  process.exitCode = 1;
}
