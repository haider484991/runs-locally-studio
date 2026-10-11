# The checks (gates)

A render that finishes is not a video that explains, and a number on screen is not a number that is true.
These checks run before anything is published. Each one exists because its failure shipped, or nearly shipped, once.
Never lower a gate to make a video pass: fix the video.

| check | command | what it refuses |
|---|---|---|
| source gates | `node scripts/check.mjs <slug>` (before voicing) | a cue naming a word the narration does not contain; an explain beat with no cues; a scene that shows numbers without a `source` line; a tok/s figure whose source does not start "Measured" or "Calculated ceiling"; a title over 100 characters or with `<` `>` |
| timing gates | `node scripts/check.mjs <slug>` (after `align.mjs`) | an explain beat where nothing moves for more than 7 seconds; a beat under 2 s or over the format's limit; a video outside its format's length; anything but the end card inside the reserved end-screen seconds |
| speech check | `node scripts/asr-check.mjs <slug>` | a stretch of 3+ script words that whisper did not hear in the voiced audio (a TTS engine can silently drop a sentence; the forced alignment alone does not notice) |
| render preflight | runs inside `render.mjs` | a staged script that differs from `content/`, missing timings, or narration edited after it was aligned |
| contact sheets | `node scripts/sheets.mjs <slug>` | nothing by itself: it writes three frames per beat of the RENDERED file. Open them and look at every scene |
| cue stills | `node scripts/frames.mjs <slug> --cues` | nothing by itself: a still right after every cue, before the render, to see the pointer, the dimming and the labels as the viewer will |

`node scripts/make.mjs <slug>` runs them in order and stops at the first failure.

## Strict mode: `content/<slug>/brief.json`

When a video has a `brief.json` (version 2), `check.mjs` also validates the editorial brief — this is how the
[Runs Locally](https://www.youtube.com/@RunsLocally) videos are made:

- `viewer`, `question`, `promise`, `earlyAnswer`, `newValue`, `evidencePlan`, `nextStep`: concrete sentences, written before the script.
- three distinct title/thumbnail concepts (thumbnail text 1-5 words).
- `demand`: where the topic's demand was measured and when.
- `evidence`: one record per claim, with its kind (`measured` / `documented` / `calculated` / `illustration`), a file or HTTPS source, a date, and the hardware/software conditions of a measurement.
- the script must give a useful answer within about 15 seconds and show evidence or a demonstration within about 30, and every `proof` / `demonstration` beat must name its `evidenceIds`.
- narration that says "I tested / measured / ran" needs measured evidence; a speed in the title needs explicit "measured" or "calculated" wording.

The flagship example (`content/how-ai-picks-the-next-word/`) has a full brief, its raw evidence and the harness that produced it.

## Rules the code cannot check (review them by eye, or with a fresh reviewer)
1. Show the thing, then name it: it is on screen at or before the word that names it.
2. Point at what you say: every sentence that names something on screen has a cue on that word.
3. Same colour, same meaning, in the whole video.
4. Real data only, labelled: a replay says "Replay of a real run"; a number says measured / documented / calculated in its source line; an illustration says it is one.
5. Concrete before abstract; at most one number per sentence; no equations.
6. Legible on a phone: lesson text at least 30 px at 1080p. Look at the stills at 640 px wide.
7. Define the key term on the picture, not only in the voice.
8. A counter or score on screen is derived from what is on screen at that frame.
9. Never type a measured number by hand into narration, a scene or a description: build it from the evidence file (see the example's `harness/build-script.mjs`).
