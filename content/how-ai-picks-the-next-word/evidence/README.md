# how-ai-picks-the-next-word — evidence

Measured 2026-10-12 on the Runs Locally laptop: RTX 3050 Laptop GPU 4 GB (4,096 MiB), Ryzen 7 6800HS, 16 GB RAM, Windows 11, Ollama 0.40.2 (it was 0.35.1 in the VRAM video; updated in between, not by this run), model qwen3.5:4b (Q4_K_M, digest 2a654d98e6fb).
Harness: `harness/nextword-runs.py` (Ollama /api/generate, raw: true = plain text continuation without the chat template, logprobs: true, top_logprobs: 5, num_ctx 4096).

| file | what |
|---|---|
| pilot.json | 6 candidate prompts, temperature 0, seed 1, 10 chips each; no penalty options were sent (see harness/nextword-runs.py, mode pilot), so the MODEL DEFAULT penalties applied (presence_penalty 1.5, model-defaults.json). Used only to choose the prompt; never pooled. It shows the penalty effect: at temperature 0 several pilot steps picked a chip that was NOT the top score (e.g. "The best way to learn to code is" -> " by" while " to" scored 61.0%), because the penalty lowers chips already in the text. |
| model-defaults.json | the model's default parameters as Ollama 0.40.2 reports them (/api/show), read 2026-10-12. |
| greedy.json | THE prompt "Once upon a time, there was a", temperature 0, presence_penalty 0, repeat_penalty 1, 10 chips, top 5 per step; requested twice (seeds 1 and 2): identical output. |
| sample.json | 100 requests of ONE chip, temperature 1, top_k 0, top_p 1, min_p 0, penalties off, seed = run number. One row per run; counts. |
| code-run.json | evidence/code/nextword.py run twice with `py nextword.py`; the second run's stdout is what the video replays. |

Scores: Ollama returns natural-log probabilities; percent = 100 * exp(logprob), rounded to 0.1. The top-5 logprobs are the same whether penalties are on or off (the penalty changes the pick, not the reported score: pilot vs greedy step 1 agree).
Vocabulary: 248,320 entries in the GGUF metadata = 248,044 text chips + 26 special markers + 250 padding slots (evidence/vocab.json, read for the earlier video "What Is a Token?").
qwen3.5:4b: Ollama reports parameter_size 4.7B (the file includes a vision part); the video uses the tag name.

NOT tested: the model's default sampler (top_k 20, top_p 0.95, presence_penalty 1.5) for the 100 draws; the chat template (a chat app wraps the message, which changes the scores); other models or sizes; more than 100 draws; thinking mode; whether Ollama's logprobs are computed before or after temperature (only temperature-0 scores are shown as scores).
