# src/explain — the lesson kit

A scene here is **data plus cues**. It never says "at frame 120"; it says "when the voice says *strawberry*".

```jsonc
{ "type": "explain", "scene": "chips", "title": "What the AI actually reads", "badge": "Real tokenizer · Qwen 3.5",
  "source": "Measured . ...",                       // required: says what the numbers are and how they were obtained
  "data":  { ... },                                  // everything the scene draws, from evidence/ files, never typed by hand
  "cues":  [ { "at": "@strawberry", "do": "focus", "target": "chip:8", "label": "one chip" }, ... ] }
```

## Cue words (`at`)
`"@word"` first time the narration says it · `"@word#2"` second time (`#-1` last) · `"@two words"` a phrase · `"@word-4"` four frames earlier · a number = frames from the beat start.
Punctuation and case are ignored; `twenty-seven` is one word. Resolved when the frame renders from `public/<slug>/timings.json` (preview: an even 2.7 words a second). `scripts/check.mjs` fails a cue whose word is not in the narration, and an explain beat that goes more than 7 s without a cue.

## Cue verbs (`do`) that work in every scene (Overlay.tsx)
| verb | what the viewer sees |
|---|---|
| `point` `{target, click?, anchor?}` | a cursor glides over (curved path, 14-40 frames) and ARRIVES on the word; `click:true` ripples; `anchor: [x, y]` (0-1) picks the spot inside the target |
| `focus` `{target \| [targets] \| null, label?, pad?, side?}` | everything else dims, the target gets a border, `label` (a short bubble) says what it is; `side: "right" \| "above" \| "below"` places the bubble (default: below, or above near the bottom); `null` clears |
| `zoom` `{target \| null, scale?}` | the camera pushes in on the target (1.35 by default), `null` backs out |

Targets are names the scene exposes (`chip:8`, `line:3:17-64`, `out:0:0:9-10`, `count:1`, `rate:2`, `score:0`, `row:4`, `grid`, ...). An unknown name fails the render and lists the known ones.

## Scenes
| scene | data | scene verbs | what it explains |
|---|---|---|---|
| `chips` mode `type` | `text`, `prefixes[k]` = chips of the first k+1 characters, `typed?`, `legend?` (a muted line next to the row label, e.g. "· marks a space"), `spell?` `{chip, text, mark?}` | `type`, `spell`, `mark` | what a model receives: chips (tokens) regroup after every keystroke. `spell` draws the letters of one chip in a dashed "from memory" box under it (target `spell`), `mark` lights and numbers the letters equal to `mark`: an ILLUSTRATION of an explanation, its `source` must say so |
| `chips` mode `rows` | `rows[{label, sub, subColor?, tokens, ids}]`, `header?`, `chipFont` | `row`, `header` | the same chips for several texts; the count at the right equals the chips on screen |
| `code` | `file`, `lines`, `lang` (`python` / `js` / `bash` / `text`), `runs[{cmd, out}]`, `prompt`, `fontSize`, `termFontSize` | `line`, `run` | an editor and terminal that REPLAY a real run (captured stdout, verbatim) |
| `race` | `prompt`, `lanes[{label, chunks[{t,text}], tokensPerSecond, seconds}]` | `start` | streamed text at its real arrival times; old lines scroll up (no line is ever cut); a labelled stopwatch; badge it "Replay of recorded runs" |
| `vocab` | `size`, `sample[{id,text}]`, `cols` | `fill` | a fixed box of chips (the label of a `focus` becomes the big note) |
| `trials` | `prompt`, `rows[{label, sub, results[bool]}]`, `legend?` `{right, wrong}` (target `legend`) | `show`, `row` | every real trial as a square, a score per row; say what counts as right in `legend` |
| `window` | `unit`, `window`, `start`, `rule`, `maxChips`, `caption?` | `grow`, `windowOn`, `say` | a context window: a frame that covers only the newest chips of a growing chat; what falls out of the frame is not read |
| `bars` | `unit`, `max`, `rows[{label, sub?, value, base?}]` | `row` | sizes as lengths on one axis; `base` draws the part a row shares with the row above, so a small difference is seen as what it is |
| `memory` | `cardGB`, `rows[{label, desktop, vram, other?, ram, speed?}]` (GB, one scale for both boxes) | `card`, `ram`, `legend`, `row`, `speed` | where a model sits: the graphics card's memory (to scale), what was already in use, the model's part and the part spilled to system RAM |
| `nextword` | `prompt`, `steps[{chosen, top[{text, p}]}]` (p = percent), `startPicked?`, `startStep?`, `legend?`, `heading?`, `tally?` `{draws[], rate?, heading?}` | `step`, `pick`, `tally` | how a model writes: the scores of the next-chip candidates as bars, the pick flying into the sentence, and an optional grid of real random draws whose counts are counted from the squares on screen |

## Adding a scene (when a topic needs a new picture)
1. Copy `trials.tsx` or `nextword.tsx`. Compute **geometry first** (x, y, w, h of every thing a cue may name) and return it as `targets`; wrap the drawing in `<Overlay cues targets accent dur>`.
2. Text is measured with `measure()` (canvas); `index.tsx` holds the first paint until the fonts are loaded (`useFontsReady`). Code ligatures are off (`NO_LIG`): a lesson must show exactly what was typed.
3. State at frame f is a pure function of `f`, the data and the resolved cues (Remotion renders frames independently, in parallel).
4. Register: `explain/index.tsx` (switch + `EXPLAIN_SCENES`), `src/types.ts` (the `scene` union), `scripts/check.mjs` (`EXPLAIN_SCENES`), this table.
5. Keep content between y 150 and y 880 and x 160 and x 1760; the source line sits at about y 900 and the captions at about y 990.
6. Look at it: `node scripts/frames.mjs <slug> --cues [b03 b05]` renders a still after every cue (the pointer, the dimming and the label as the viewer sees them).

## Layout rules (look at stills, `frames.mjs --cues`)
- A `source` line is 22 px uppercase, about 92 characters per line, anchored at y 930 and growing UP: keep it to 2 lines (about 180 characters) or it runs into the scene's bottom. Put long conditions in the video description and `evidence/README.md`.
- A focus label bubble sits under its target unless the target ends below y 790; a bubble over another label hides it: use `side`, or no label when the highlight alone says it.
- Anything that counts (a counter next to chips, a score next to squares) must be derived from what is on screen at that frame, never animated on its own clock.

## Honesty rules that live in the code
- The cursor is an annotation pointer drawn by Overlay.tsx; it never claims to be a recorded mouse. A `code` scene says "Replay of a real run" in its badge and its output lines are the captured stdout.
- Chips show what a tokenizer really produced; half-characters are shown as hex, never as a wrong letter.
