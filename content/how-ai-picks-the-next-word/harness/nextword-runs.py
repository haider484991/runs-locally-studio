# How an AI picks the next word: the real scores (log-probabilities) qwen3.5:4b gives its top candidates at every step,
# and what happens when the pick is a weighted random draw.
#   py -3 nextword-runs.py pilot      -> ../evidence/pilot.json   (several prompts, greedy, 10 steps, top 5 each; pilots are never pooled)
#   py -3 nextword-runs.py greedy     -> ../evidence/greedy.json  (THE prompt, temperature 0, N steps, top 5 per step)
#   py -3 nextword-runs.py sample     -> ../evidence/sample.json  (THE prompt, 100 draws of ONE chip, temperature 1, no top-k/top-p/min-p filter, seed = run)
# Presence/repeat penalties are switched OFF (the model default has presence_penalty 1.5, which lowers chips already used and made a
# temperature-0 pilot pick a chip that was not the top score). Raw completion (raw: true): the model continues the text as given, with no chat wrapper. Ollama's own logprobs field (top_logprobs=5).
import json, sys, time, subprocess, urllib.request, platform

HOST = "http://127.0.0.1:11434"
MODEL = "qwen3.5:4b"
CTX = 4096
PROMPT = "Once upon a time, there was a"
PILOTS = ["The capital of France is", "Once upon a time, there was a", "My favourite food is", "The best way to learn to code is",
          "The sky is", "I opened the fridge and found a"]

def call(path, body=None, timeout=1800):
    req = urllib.request.Request(HOST + path, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=timeout))

def gen(prompt, n, options):
    body = {"model": MODEL, "prompt": prompt, "raw": True, "stream": False, "logprobs": True, "top_logprobs": 5,
            "keep_alive": "10m", "options": {"num_ctx": CTX, "num_predict": n, **options}}
    t0 = time.time()
    r = call("/api/generate", body)
    r["_wall_s"] = round(time.time() - t0, 3)
    return r

def steps(r):
    return [{"chosen": s["token"], "logprob": s["logprob"],
             "top": [{"token": t["token"], "logprob": t["logprob"]} for t in s["top_logprobs"]]} for s in r["logprobs"]]

def meta():
    v = call("/api/version")["version"]
    smi = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader"], capture_output=True, text=True).stdout.strip()
    show = call("/api/show", {"model": MODEL})
    return {"ollama": v, "model": MODEL, "digest_details": show.get("details"), "gpu": smi, "os": platform.platform(),
            "num_ctx": CTX, "raw": True, "top_logprobs": 5, "date": time.strftime("%Y-%m-%dT%H:%M:%S%z")}

mode = sys.argv[1]
out = {"meta": meta()}
if mode == "pilot":
    out["runs"] = []
    for p in PILOTS:
        r = gen(p, 10, {"temperature": 0, "seed": 1})
        out["runs"].append({"prompt": p, "response": r["response"], "steps": steps(r)})
        print(p, "->", repr(r["response"]))
elif mode == "greedy":
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 12
    r = gen(PROMPT, n, {"temperature": 0, "presence_penalty": 0, "repeat_penalty": 1, "seed": 1})
    r2 = gen(PROMPT, n, {"temperature": 0, "presence_penalty": 0, "repeat_penalty": 1, "seed": 2})   # the same request again: temperature 0 must give the same chips
    out.update({"prompt": PROMPT, "options": {"temperature": 0, "presence_penalty": 0, "repeat_penalty": 1, "num_predict": n}, "response": r["response"], "steps": steps(r),
                "repeat_response": r2["response"], "repeat_identical": r["response"] == r2["response"],
                "eval_count": r["eval_count"], "eval_duration_ns": r["eval_duration"]})
    print(repr(r["response"]), "repeat identical:", out["repeat_identical"])
elif mode == "sample":
    N = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    opts = {"temperature": 1.0, "top_k": 0, "top_p": 1.0, "min_p": 0.0, "presence_penalty": 0, "repeat_penalty": 1}
    rows = []
    for i in range(N):
        r = gen(PROMPT, 1, {**opts, "seed": i + 1})
        rows.append({"run": i + 1, "seed": i + 1, "chip": r["logprobs"][0]["token"], "logprob": r["logprobs"][0]["logprob"], "wall_s": r["_wall_s"]})
    counts = {}
    for x in rows: counts[x["chip"]] = counts.get(x["chip"], 0) + 1
    out.update({"prompt": PROMPT, "options": {**opts, "num_predict": 1, "seed": "run number 1..N"}, "n": N, "rows": rows,
                "counts": dict(sorted(counts.items(), key=lambda kv: -kv[1]))})
    print(out["counts"])
json.dump(out, open(f"../evidence/{mode}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
