#!/usr/bin/env python3
"""
Kokoro TTS - one WAV per beat, fully local (hexgrad/Kokoro-82M, Apache-2.0).
Input: content/<slug>/script.json with beats[{id, narration}].
Output: public/<slug>/audio/<beat>.wav, trimmed and normalised to -16 LUFS.

    python scripts/tts.py <slug> --voice af_heart        (Windows: py -3 scripts/tts.py ...)

Only beats whose text (or voice settings) changed are re-voiced: the cache key
is stored in public/<slug>/audio/cache.json.

Voices by the model card's grading (below B- sounds synthetic on narration):
    af_heart   A     warm American female
    af_bella   A-    American female, brighter
    am_michael B-    American male, steady

Needs espeak-ng installed (Kokoro's fallback phonemizer for unknown words).
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

# espeak-ng ships as a DLL on Windows and phonemizer must be pointed at it.
if sys.platform == "win32":
    base = Path(r"C:\Program Files\eSpeak NG")
    if base.exists():
        os.environ.setdefault("PHONEMIZER_ESPEAK_LIBRARY", str(base / "libespeak-ng.dll"))
        os.environ.setdefault("PHONEMIZER_ESPEAK_PATH", str(base / "espeak-ng.exe"))
        os.environ["PATH"] = f"{base};{os.environ['PATH']}"

import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
from kokoro import KPipeline  # noqa: E402

SAMPLE_RATE = 24_000

parser = argparse.ArgumentParser()
parser.add_argument("slug")
parser.add_argument("--voice", default=os.environ.get("KOKORO_VOICE", "af_heart"))
parser.add_argument("--speed", type=float, default=float(os.environ.get("KOKORO_SPEED", "1.0")))
parser.add_argument("--flat", action="store_true", help="Disable the performance layer")
args = parser.parse_args()

pipeline = KPipeline(lang_code="b" if args.voice.startswith("b") else "a", repo_id="hexgrad/Kokoro-82M")


# Spoken-only respellings. Kokoro's G2P reads "Qwen" as k-yoo-wen (kjˈuwˈɛn); "Kwen" gives
# kwˈɛn. Applied only to the audio: captions and alignment keep the script's spelling, and
# word counts are unchanged so align.mjs still maps one-to-one.
# "Ollama": Kokoro's G2P gives ɑlˈɑmə ("ah-LAH-muh"; whisper hears "Allama"); the spelling "Ohlama" gives Olˈɑmə
# ("oh-LAH-muh"), which is how the product is said.
# Acronyms are spaced ("M C P") so Kokoro reads the letters, while the script, the burned-in captions and the SRT
# still show "MCP". Add your own words here when Kokoro mispronounces them, then run scripts/asr-check.mjs.
PRONOUNCE = [(re.compile(r"\bQwen\b"), "Kwen"), (re.compile(r"\bollama\b", re.IGNORECASE), "Ohlama"), (re.compile(r"\bMCP\b"), "M C P"),
             (re.compile(r"\bnpm\b"), "N P M"), (re.compile(r"\bTSX\b"), "T S X"), (re.compile(r"\bJSX\b"), "J S X"), (re.compile(r"\bCSV\b"), "C S V"),
             (re.compile(r"\bCSS\b"), "C S S"), (re.compile(r"\bSVG\b"), "S V G"),
             (re.compile(r"\bPNG\b"), "P N G"), (re.compile(r"\bJPEG\b"), "jay peg"), (re.compile(r"\bcrf\b"), "C R F"),
             (re.compile(r"\bH\.264\b"), "H two sixty four"), (re.compile(r"\b1080p\b"), "ten eighty p"),
             (re.compile(r"\bVRAM\b"), "vee ram"), (re.compile(r"\bGPU\b"), "G P U")]


def say(text: str) -> str:
    for pattern, spoken in PRONOUNCE:
        text = pattern.sub(spoken, text)
    return text


def synth(text: str, voice: str, speed: float) -> np.ndarray:
    chunks = [audio for _, _, audio in pipeline(say(text), voice=voice, speed=speed)]
    if not chunks:
        raise RuntimeError(f"Kokoro produced no audio for: {text[:60]!r}")
    return np.concatenate(chunks)


# ---------------------------------------------------------------------------
# THE PERFORMANCE LAYER (small per-sentence speed and pause variation; deterministic via hashing)
# Write narration as SHORT sentences - it works at sentence granularity.
# ---------------------------------------------------------------------------

GAP_SCALE = float(os.environ.get("KOKORO_GAP_SCALE", "1.0"))


def _h(seed: str) -> float:
    return int(hashlib.sha1(seed.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


def split_sentences(text: str) -> list:
    return [p for p in re.split(r"(?<=[.!?])\s+", text.strip()) if p]


# Optional pacing controls. Legacy defaults are preserved for reproducible renders.
# Version 2 uses the base rate unless explicitly directed by the editor.
# These multipliers are not YouTube engagement thresholds.
MODE_SPEED = {"FAST": 1.24, "SLOW": 0.84}
SPEED_FLOOR, SPEED_CEIL = 0.78, 1.32


def synth_performed(text: str, voice: str, base_speed: float, seed: str, position: str) -> np.ndarray:
    energy = {"open": +0.030, "close": -0.045}.get(position, 0.0)
    sentences = split_sentences(text)
    pieces = []

    for i, sentence in enumerate(sentences):
        drift = (_h(f"{seed}|{i}|speed") - 0.5) * 0.08              # +-4% wander
        final = -0.05 if i == len(sentences) - 1 and len(sentences) > 1 else 0.0
        question = -0.03 if sentence.rstrip().endswith("?") else 0.0
        speed = max(SPEED_FLOOR, min(SPEED_CEIL, base_speed + energy + drift + final + question))
        pieces.append(synth(sentence, voice, speed))

        if i < len(sentences) - 1:
            gap = 0.18 + _h(f"{seed}|{i}|gap") * 0.24               # 180-420 ms
            if re.search(r"\d[\d,.]*\s*(percent|times|a second)?[.!?]$", sentence):
                gap += 0.15                                          # let a number land
            pieces.append(np.zeros(int(gap * GAP_SCALE * SAMPLE_RATE), dtype=np.float32))

    return np.concatenate(pieces) if pieces else synth(text, voice, base_speed)


def master(path: Path) -> None:
    """Trim outer dead air and normalise to -16 LUFS, in place. Inner gaps
    survive (the align step measures them as real time)."""
    audio, sample_rate = sf.read(path, dtype="float32")
    level = np.max(np.abs(audio), axis=1) if audio.ndim > 1 else np.abs(audio)
    audible = np.flatnonzero(level >= 10 ** (-45 / 20))
    if len(audible):
        start = max(0, int(audible[0] - 0.12 * sample_rate))
        end = min(len(audio), int(audible[-1] + 0.15 * sample_rate) + 1)
        sf.write(path, audio[start:end], sample_rate)

    tmp = path.with_suffix(".mastered.wav")
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
         "-i", str(path), "-af", "loudnorm=I=-16:TP=-1.5:LRA=9",
         "-ar", str(SAMPLE_RATE), "-c:a", "pcm_s16le", str(tmp)],
        check=True,
    )
    tmp.replace(path)


script = json.loads(Path(f"content/{args.slug}/script.json").read_text(encoding="utf-8"))
beats = script["beats"]
audio_dir = Path(f"public/{args.slug}/audio")
audio_dir.mkdir(parents=True, exist_ok=True)

print(f"Voice: {args.voice}  ·  speed {args.speed}  ·  {len(beats)} beats\n")
total = 0.0

# Per-line cache keyed by everything that changes the audio (position and index
# included - the performance layer reads open/close differently).
cache_path = audio_dir / "cache.json"
try:
    cache = json.loads(cache_path.read_text(encoding="utf-8"))
except Exception:
    cache = {}
new_cache = {}

for i, beat in enumerate(beats):
    position = "open" if i == 0 else "close" if i == len(beats) - 1 else "mid"
    path = audio_dir / f"{beat['id']}.wav"
    # A beat's mode ("FAST" / "SLOW") multiplies the base speed; untagged beats keep the base rate.
    # Version-1 scripts (no "version": 2) also take a pace from the beat's movement
    # (open and proof fast, turn and landing slow); version 2 only changes pace when asked.
    mode = beat.get("mode") or (None if script.get("version") == 2 else {"open": "FAST", "proof": "FAST", "turn": "SLOW", "landing": "SLOW"}.get(beat.get("movement")))
    # Per-beat speed multiplies the mode and is included in the audio cache key.
    beat_speed = args.speed * MODE_SPEED.get(mode, 1.0) * float(beat.get("speed", 1.0))
    # ⚠ The mode MUST be in the cache key. Without it, adding a mode tag to an existing
    # script leaves the hash unchanged, the stage reports "cached", and the render keeps
    # the old pacing - a change that looks successful and does nothing. This project has
    # already shipped that exact bug once with the TTS engine field.
    key = hashlib.sha1(
        "|".join([
            beat["narration"], args.voice, str(args.speed), str(mode),
            str(beat.get("speed", 1.0)), f"{beat_speed:.4f}",
            str(args.flat), position, str(i), str(len(beats)),
            os.environ.get("KOKORO_GAP_SCALE", ""),
        ] + ([f"say:{say(beat['narration'])}"] if say(beat["narration"]) != beat["narration"] else [])).encode("utf-8")
    ).hexdigest()
    new_cache[beat["id"]] = key

    if cache.get(beat["id"]) == key and path.exists():
        seconds = sf.info(path).duration
        total += seconds
        print(f"  {beat['id']}  {seconds:5.2f}s  (cached)")
        continue

    if args.flat:
        audio = synth(beat["narration"], args.voice, beat_speed)
    else:
        audio = synth_performed(
            beat["narration"], args.voice, beat_speed,
            seed=f"{args.slug}|{beat['id']}", position=position,
        )
    sf.write(path, audio, SAMPLE_RATE)
    master(path)
    seconds = sf.info(path).duration
    total += seconds
    tag = f"  [{mode} x{MODE_SPEED.get(mode, 1.0):.2f}]" if mode else ""
    print(f"  {beat['id']}  {seconds:5.2f}s{tag}  {path}")

# Written only after every beat succeeded, so a crash cannot poison the cache.
cache_path.write_text(json.dumps(new_cache, indent=1), encoding="utf-8")

for wav in audio_dir.glob("*.wav"):
    if wav.stem not in new_cache:
        wav.unlink()
        print(f"  removed stale {wav.name}")

print(f"\n{total:.1f}s of narration written.")
print(f"Next: node scripts/align.mjs {args.slug}")
