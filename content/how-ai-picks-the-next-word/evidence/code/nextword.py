import math, requests
job = {"model": "qwen3.5:4b", "prompt": "Once upon a time, there was a",
       "raw": True, "stream": False, "logprobs": True, "top_logprobs": 5,
       "options": {"num_predict": 1, "temperature": 0}}
r = requests.post("http://localhost:11434/api/generate", json=job).json()
for chip in r["logprobs"][0]["top_logprobs"]:
    score = 100 * math.exp(chip["logprob"])
    print(repr(chip["token"]), f"{score:.1f}%")
