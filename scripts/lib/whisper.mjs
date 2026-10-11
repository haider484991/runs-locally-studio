// Where the whisper.cpp binary lives. @remotion/install-whisper-cpp 1.5.5 puts `main` (macOS/Linux, built from source)
// or `main.exe` (Windows, prebuilt) in the install folder; newer whisper.cpp builds call the same program `whisper-cli`.
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const WHISPER_MODEL = process.env.WHISPER_MODEL ?? 'small.en';
export const WHISPER_VERSION = '1.5.5';

const NAMES = process.platform === 'win32' ? ['main.exe', 'whisper-cli.exe'] : ['main', 'whisper-cli', 'build/bin/whisper-cli'];

/** The binary inside `dir`, or null. */
export const whisperBinary = (dir) => {
  if (!dir) return null;
  const hit = NAMES.map((n) => join(dir, n)).find((p) => existsSync(p));
  return hit ?? null;
};

/** The first folder (WHISPER_DIR, then ./.whisper) that has both the binary and the model. */
export const findWhisper = () => {
  for (const dir of [process.env.WHISPER_DIR, join(process.cwd(), '.whisper')].filter(Boolean)) {
    const bin = whisperBinary(dir);
    if (bin && existsSync(join(dir, `ggml-${WHISPER_MODEL}.bin`))) return { dir, bin, model: join(dir, `ggml-${WHISPER_MODEL}.bin`) };
  }
  return null;
};
