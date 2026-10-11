import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAt, cueProblems, estimateWords } from './lib/cues.mjs';
import { words, decimal, pct } from './lib/words.mjs';

// A beat's words in seconds from the beat start, as align.mjs writes them.
const W = [
  { word: 'Run', start: 0.0, end: 0.3 }, { word: 'it,', start: 0.3, end: 0.5 }, { word: 'and', start: 0.6, end: 0.7 },
  { word: 'it', start: 0.7, end: 0.8 }, { word: 'prints', start: 0.8, end: 1.2 }, { word: 'nine', start: 1.2, end: 1.5 },
  { word: 'words.', start: 1.5, end: 2.0 }, { word: 'Nine', start: 2.4, end: 2.7 },
];

test('a cue lands on the frame its word starts (30 fps), ignoring case and punctuation', () => {
  assert.equal(resolveAt('@prints', W), 24);
  assert.equal(resolveAt('@words', W), 45);
  assert.equal(resolveAt('@IT', W), 9);
});
test('occurrences, phrases and frame offsets', () => {
  assert.equal(resolveAt('@nine#2', W), 72);
  assert.equal(resolveAt('@nine#-1', W), 72);
  assert.equal(resolveAt('@and it prints', W), 18);
  assert.equal(resolveAt('@nine-4', W), 32);
  assert.equal(resolveAt('@nine+10', W), 46);
  assert.equal(resolveAt(12, W), 12);
});
test('a cue naming a word the narration does not contain is a problem, not a silent zero', () => {
  assert.throws(() => resolveAt('@ten', W), /not in the narration/);
  assert.throws(() => resolveAt('@nine#3', W), /occurrence 3/);
  assert.deepEqual(cueProblems([{ at: '@prints', do: 'point' }], W), []);
  assert.equal(cueProblems([{ at: '@printed', do: 'point' }], W).length, 1);
});
test('preview timing estimates an even 2.7 words a second', () => {
  const e = estimateWords('one two three');
  assert.equal(e.length, 3);
  assert.ok(Math.abs(e[2].start - 2 / 2.7) < 1e-9);
});
test('numbers are spelled the way the voice says them', () => {
  assert.equal(words(9), 'nine');
  assert.equal(words(248), 'two hundred forty-eight');
  assert.equal(words(248320), 'two hundred forty-eight thousand three hundred twenty');
  assert.equal(decimal(29.6), 'twenty-nine point six');
  assert.equal(decimal(99.7, 1), 'ninety-nine point seven');
  assert.equal(pct(0.9167), 'ninety-two percent');
});
