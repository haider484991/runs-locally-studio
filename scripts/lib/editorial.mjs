import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';

export const PROFILES = {
  explainer: {min:45,max:240,maxBeat:20,maxBeats:40},
  guide: {min:90,max:600,maxBeat:40,maxBeats:90},
};
export const strings = (v) => typeof v==='string'?[v]:Array.isArray(v)?v.flatMap(strings):v&&typeof v==='object'?Object.values(v).flatMap(strings):[];
export const safeAsset = (root, file) => typeof file==='string' && !/^(?:[a-z]+:|[/\\])/i.test(file) && resolve(root,file).startsWith(resolve(root)+sep);

// Structural checks cannot judge whether a source proves a claim. A human/agent review still must.
export function validateEditorial(script, brief, {root=process.cwd(),timings=null}={}) {
  const errors=[],warnings=[];
  const profile=PROFILES[script.format];
  if(!profile)errors.push('format must be explainer or guide; vertical Shorts use the separate Shorts renderer');
  if(!brief || brief.version!==2)return {errors:[...errors,'brief.json version 2 required'],warnings};
  for(const key of ['viewer','question','promise','earlyAnswer','newValue','evidencePlan','nextStep'])
    if(typeof brief[key]!=='string'||brief[key].trim().length<12)errors.push(`brief.${key} needs a concrete statement`);
  if(!Array.isArray(brief.packaging)||brief.packaging.length<3)errors.push('prepare three distinct title/thumbnail concepts');
  else for(const [i,p] of brief.packaging.entries()) {
    if(!p.title||p.title.length>100||/[<>]/.test(p.title))errors.push(`packaging ${i+1}: invalid title`);
    if(!p.thumbnailText||p.thumbnailText.split(/\s+/).length>5)errors.push(`packaging ${i+1}: thumbnail text must be 1–5 words`);
    if(!p.imageIdea)errors.push(`packaging ${i+1}: image idea required`);
  }
  if(!Array.isArray(brief.demand)||!brief.demand.length)errors.push('demand evidence required; identify platform and retrieval date');
  for(const d of brief.demand??[])if(!d.platform||!d.source||!d.retrievedAt||!d.observation)errors.push('incomplete demand evidence');
  const evidence=new Map((brief.evidence??[]).map(e=>[e.id,e]));
  if(!evidence.size)errors.push('at least one evidence record required');
  for(const e of evidence.values()) {
    if(!e.claim||!['measured','documented','calculated','illustration'].includes(e.kind)||!e.checkedAt)errors.push(`${e.id}: incomplete claim record`);
    if(!e.url&&!e.file)errors.push(`${e.id}: URL or local evidence file required`);
    if(e.url&&!/^https:\/\//.test(e.url))errors.push(`${e.id}: source must be an HTTPS URL`);
    if(e.file&&(!safeAsset(root,e.file)||!existsSync(resolve(root,e.file))))errors.push(`${e.id}: local evidence file missing/outside project`);
    if(e.kind==='measured'&&!e.conditions)errors.push(`${e.id}: measured evidence needs hardware/runtime/model/task conditions`);
    if(e.kind==='calculated'&&!e.assumptions)errors.push(`${e.id}: calculation assumptions required`);
  }
  if(!Array.isArray(brief.nearestExistingVideos))errors.push('list nearest existing videos and explain newValue before producing another upload');
  const ids=new Set();let firstProof=Infinity,answer=Infinity,clock=0;
  for(const b of script.beats??[]) {
    if(ids.has(b.id))errors.push(`duplicate beat id ${b.id}`); ids.add(b.id);
    if(!b.narration?.trim())errors.push(`${b.id}: narration missing`);
    if(b.purpose==='answer')answer=Math.min(answer,clock);
    if(['proof','demonstration'].includes(b.purpose))firstProof=Math.min(firstProof,clock);
    if(['proof','demonstration'].includes(b.purpose)&&!b.evidenceIds?.length)errors.push(`${b.id}: proof needs evidenceIds`);
    for(const id of b.evidenceIds??[])if(!evidence.has(id))errors.push(`${b.id}: unknown evidence ${id}`);
    if(/\b(?:I|we) (?:tested|measured|ran)\b/i.test(b.narration)&&!(b.evidenceIds??[]).some(id=>evidence.get(id)?.kind==='measured'))errors.push(`${b.id}: test claim has no measured evidence`);
    const v=b.visual;
    if(v?.type==='capture') {
      if(!safeAsset(resolve(root,'public'),v.src)||!existsSync(resolve(root,'public',v.src)))errors.push(`${b.id}: capture must exist inside public/`);
      if(!['image','video'].includes(v.media)||!v.caption||!v.source)errors.push(`${b.id}: capture needs media, caption and source`);
      if(!['measured','documented','illustration'].includes(v.kind))errors.push(`${b.id}: invalid capture evidence kind`);
      if(v.startFrom!==undefined&&(!Number.isInteger(v.startFrom)||v.startFrom<0))errors.push(`${b.id}: startFrom must be a nonnegative frame`);
      if(v.focus&&(!['x','y','width','height'].every(k=>Number.isFinite(v.focus[k])&&v.focus[k]>=0)||v.focus.width<=0||v.focus.height<=0||v.focus.x+v.focus.width>100||v.focus.y+v.focus.height>100))errors.push(`${b.id}: focus must stay inside the image percentages`);
      if(v.kind==='measured'&&!(b.evidenceIds??[]).some(id=>evidence.get(id)?.kind==='measured'))errors.push(`${b.id}: measured capture needs measured evidence`);
    }
    const t=timings?.[b.id];clock+=(t?t.durationInSeconds:b.narration.split(/\s+/).length/2.6)+8/30;
  }
  if(answer>15)errors.push('give the useful answer within 15 seconds (estimated before alignment)');
  if(firstProof>30)errors.push('show evidence or a demonstration within 30 seconds');
  if((script.beats?.length??0)>(profile?.maxBeats??90))errors.push('too many beats for the declared format');
  const titleText=script.title+' '+strings(script.thumb).join(' ');
  if(/tok\/s|tokens? (?:a|per) second|\d+(?:\.\d+)?x (?:faster|slower)/i.test(titleText)) {
    if(!brief.packagingEvidenceIds?.length)errors.push('speed claim in packaging needs packagingEvidenceIds');
    if(!/\b(?:measured|calculated|theoretical)\b/i.test(titleText))errors.push('speed claim in packaging needs explicit measured/calculated wording');
    if(/\bmeasured\b/i.test(titleText)&&!(brief.packagingEvidenceIds??[]).some(id=>evidence.get(id)?.kind==='measured'))errors.push('measured packaging needs measured evidence');
  }
  for(const id of brief.packagingEvidenceIds??[])if(!evidence.has(id))errors.push(`unknown packaging evidence ${id}`);
  if(brief.evidence?.every(e=>e.kind!=='measured'))warnings.push('documentation/calculation-only video: do not package as a hands-on test');
  return {errors,warnings};
}
