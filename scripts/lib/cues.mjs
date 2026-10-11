// Node twin of src/explain/ctx.tsx (keep the two in step): resolve "@word" cues against a beat's words. Used by check.mjs and the builders so a
// cue that names a word the narration does not contain fails BEFORE voicing, not in the middle of a render.
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export const estimateWords = (narration, wps = 2.7) =>
  narration.split(/\s+/).filter(Boolean).map((word, k) => ({ word, start: k / wps, end: (k + 1) / wps }));

/** frames from the beat start, or throws */
export function resolveAt(at, words, fps = 30, where = '') {
  if (typeof at === 'number') return at;
  const m = String(at).match(/^@(.+?)(?:#(-?\d+))?(?:([+-]\d+))?$/);
  if (!m) throw new Error(`cue ${where}: cannot read "${at}"`);
  const phrase = m[1].split(/\s+/).map(norm).filter(Boolean);
  const nth = m[2] ? Number(m[2]) : 1, off = m[3] ? Number(m[3]) : 0;
  const hits = [];
  for (let i = 0; i + phrase.length <= words.length; i++) if (phrase.every((p, k) => norm(words[i + k].word) === p)) hits.push(i);
  const i = nth > 0 ? hits[nth - 1] : hits[hits.length + nth];
  if (i === undefined) throw new Error(`cue ${where}: "${m[1]}" (occurrence ${nth}) is not in the narration`);
  return Math.max(0, Math.round(words[i].start * fps) + off);
}

export const cueProblems = (cues, words, fps = 30) => {
  const out = [];
  (cues ?? []).forEach((c, i) => { try { resolveAt(c.at, words, fps, `#${i} (${c.do})`); } catch (e) { out.push(e.message); } });
  return out;
};
