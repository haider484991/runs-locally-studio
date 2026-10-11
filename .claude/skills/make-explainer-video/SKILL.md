---
name: make-explainer-video
description: Make a narrated, word-synced explainer video with this repo (Runs Locally Studio) — pick one idea, collect real evidence, write content/<slug>/script.json with scenes whose cues name spoken words, voice it with Kokoro, align it with whisper.cpp, pass the gates, render, and look at every frame. Use when the user asks to make, script, voice, render, fix or check an explainer video, a Short, a thumbnail or a new lesson scene in this repository.
---

# Make an explainer video

You are working in **Runs Locally Studio**: a JSON script becomes a 1080p narrated explainer. A local voice (Kokoro) reads each
beat, whisper.cpp measures when every word is said, and Remotion renders scenes whose cues fire on spoken words. Read `README.md`,
`src/explain/README.md` (scenes, cue verbs, targets) and `docs/gates.md` (the checks) before your first video.

## 0. Check the machine (once)
- `node --version` (20+), `ffmpeg -version`, Python 3.10–3.12 with `pip install -r requirements.txt` (Windows: `py -3 -m pip ...`), espeak-ng installed.
- `npm install` if `node_modules/` is missing. The first `align` downloads whisper.cpp + the small.en model (~490 MB) into `.whisper/`
  (or set `WHISPER_DIR` to an existing install); the first render downloads Remotion's headless Chrome. Tell the user before these downloads.

## 1. One idea, said plainly
Agree on ONE thing the viewer should be able to say afterwards ("the AI scores every chip, picks one, adds it, repeats").
Concrete example first, no equations, at most one number per sentence. 45–240 s is an `explainer`, 90–600 s a `guide`.

## 2. Evidence before words
Anything the video shows as real must come from a real run on this machine:
- Run the thing (a program, a model, a measurement) and save every run, error and timing in `content/<slug>/evidence/`.
- Write a small builder (`content/<slug>/harness/build.mjs`) that reads the evidence and WRITES `script.json`, like
  `content/hello-world/harness/build.mjs`: code lines read from the file that ran, output from the captured run, numbers spelled
  out with `scripts/lib/words.mjs`. **Never type a measured number by hand** into narration, a scene or a description.
- A `code` scene replays a real run: its `lines` are the file, its `out` is the captured stdout. Badge it "Replay of a real run".
- An explanation you did not test is labelled as one (`source`: "Illustration ..."); a number says measured / documented / calculated.
- Strict mode: add `content/<slug>/brief.json` (see the flagship example) when the video makes claims; `check.mjs` then validates it.

## 3. The script
`content/<slug>/script.json` — start one with `node scripts/new.mjs <slug>`. Each beat: `id`, `narration` (short sentences, written
the way it should be spoken), `visual`. For lesson scenes (`type: "explain"`):
- Show the thing, then name it: a cue lands on the word that names what is on screen (`"at": "@word"`, `"@word#2"`, `"@two words"`, `"@word-4"`).
- Every sentence that names something on screen gets a cue (`point`, `focus` with a short `label`, `zoom`, or a scene verb).
- Something must move at least every 7 seconds; the key term appears on screen as a label the first time it is spoken.
- A new kind of picture is a new scene in `src/explain/` (follow "Adding a scene"), never a one-off hack inside a script.
- Words Kokoro mispronounces go in `PRONOUNCE` in `scripts/tts.py` (the script and captions keep the real spelling).

## 4. Look before you voice
```
node scripts/stage.mjs <slug> && node scripts/check.mjs <slug>
node scripts/frames.mjs <slug> --cues        # a still after every cue, estimated timing
```
OPEN the stills in `out/frames/`. Check: the pointer lands on the thing being said, labels do not cover other labels, nothing
overflows, text is readable at 640 px wide, source lines stay within two lines. Fix, re-stage, look again.

## 5. Make it
```
node scripts/make.mjs <slug>                 # stage, check, voice, align, check, speech check, render, captions, contact sheets
node scripts/make.mjs <slug> --from render   # after a visual-only change (narration unchanged)
```
A narration change needs the voice again (`--from tts`). Only changed beats are re-voiced.

## 6. Look after you render
Open every image in `out/review-sheets-<slug>/` and the thumbnail `out/<slug>-thumb.jpg` (also at 320x180). If a frame does not
explain, fix the scene and render again. `asr-check` warnings about digits ("9" for "nine"), joined code words ("math.exp") or
respelled names are transcription formatting; a missing stretch of real words is a defect.

## 7. Report honestly
Tell the user what was made (paths, length), what was measured (numbers verbatim, with conditions), which checks passed, what you
looked at, and what was NOT checked (nobody listened to the audio unless a person did). Never lower a gate in `scripts/check.mjs`
to make a video pass. Never claim the video proves more than its evidence.

## Shorts and thumbnails
- Short: a script whose beats use `{"type": "short", "headline", "sub", "clip"}` visuals renders vertical with
  `node scripts/render-short.mjs <slug>`; clips are cut from the rendered long video (see the flagship's `harness/build-short.mjs`).
- Hand-made thumbnail: write it as HTML (1280x720, 2-4 words, real objects) and run `node scripts/thumb-shot.mjs concept.html out.jpg`;
  copy the chosen one to `out/<slug>-thumb.jpg` after the render (`render.mjs` overwrites it unless run with `--video-only`).
