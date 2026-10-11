import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {safeAsset} from './editorial.mjs';
const norm=s=>s.toLowerCase().replace(/[^a-z0-9']/g,'');
export function renderPreflight(root,slug,{thumbnail=false}={}) {
  if(!/^[a-z0-9-]+$/.test(slug))throw new Error('Invalid slug');
  const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
  const script=read(`content/${slug}/script.json`),staged=read(`public/${slug}/script.json`);
  if(JSON.stringify(script)!==JSON.stringify(staged))throw new Error('Staged script differs. Run stage before rendering.');
  if(thumbnail)return;
  if(!existsSync(resolve(root,`public/${slug}/timings.json`)))throw new Error('No measured timings; preview estimates cannot be published.');
  const timings=read(`public/${slug}/timings.json`);
  for(const b of script.beats) {
    const t=timings[b.id];
    if(!t||!Number.isFinite(t.durationInSeconds)||t.durationInSeconds<=0)throw new Error(`${b.id}: missing or invalid timing`);
    if(!safeAsset(resolve(root,'public'),t.audioSrc)||!existsSync(resolve(root,'public',t.audioSrc)))throw new Error(`${b.id}: audio missing/outside public`);
    if(!t.words?.length||norm(t.words.map(w=>w.word).join(' '))!==norm(b.narration))throw new Error(`${b.id}: narration changed after alignment; re-voice and align`);
    let previous=-1;
    for(const w of t.words){if(!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.start<previous||w.end<w.start||w.end>t.durationInSeconds+.1)throw new Error(`${b.id}: invalid word timing`);previous=w.start;}
  }
}
