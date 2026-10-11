#!/usr/bin/env node
// content/how-ai-picks-the-next-word-short/publishing.json from the evidence of the long video. The description has NO link yet: the long video is not
// public when this is staged; the release step appends `appendAfterLongIsPublic` once the long video has its ID.
import fs from 'node:fs';
import { TITLE } from './build-short.mjs';
import { FACTS } from './build-script.mjs';
const { young, nYoung, distinct, draws, ollama, PROMPT } = FACTS;
const desc = `How does an AI pick the next word? It gives a score to every chip (token) it could write next and draws one: a higher score is only a better chance. Real scores from qwen3.5:4b in Ollama ${ollama} on my laptop (RTX 3050 Laptop GPU 4 GB): after "${PROMPT}", "young" gets ${young.p}%. I let it draw the first word ${draws.length} times (temperature 1, extra filters and penalties off): young came out ${nYoung} times, and ${distinct} different words came out in total.

"Chip" is my word for a token. Claude Code built the animation and ran the measurements. The narration is an AI voice (Kokoro).

#Shorts #AI #LLM`;
if (/[<>]/.test(desc) || /[<>]/.test(TITLE)) throw new Error('title or description contains < or >');
if (TITLE.length > 100 || desc.length > 4900) throw new Error('title or description too long');
const publishing = {
  slug: 'how-ai-picks-the-next-word-short', title: TITLE, privacy: 'private', categoryId: '28', madeForKids: false,
  tags: ['how does ai work', 'next word prediction', 'how do llms work', 'tokens', 'ollama', 'local ai', 'ai explained', 'shorts', 'Runs Locally'],
  description: desc,
  appendAfterLongIsPublic: '\n\nThe full explanation, with the real scores and the code to try it yourself: https://youtu.be/LONG_VIDEO_ID',
};
fs.writeFileSync('content/how-ai-picks-the-next-word-short/publishing.json', JSON.stringify(publishing, null, 2));
console.log('wrote how-ai-picks-the-next-word-short/publishing.json:', desc.length, 'characters');
