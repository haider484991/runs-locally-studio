import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {renderPreflight} from './lib/preflight.mjs';
import {validateEditorial,safeAsset} from './lib/editorial.mjs';

test('render rejects stale narration and staged script',()=>{
 const root=mkdtempSync(join(tmpdir(),'studio-preflight-'));
 for(const d of ['content/demo','public/demo'])mkdirSync(join(root,d),{recursive:true});
 const script={beats:[{id:'a',narration:'Actual new words'}]};
 const put=(p,v)=>writeFileSync(join(root,p),JSON.stringify(v));
 put('content/demo/script.json',script);put('public/demo/script.json',script);writeFileSync(join(root,'public/demo/a.wav'),'fixture');
 put('public/demo/timings.json',{a:{durationInSeconds:2,audioSrc:'demo/a.wav',words:[{word:'Old words',start:0,end:1}]}});
 assert.throws(()=>renderPreflight(root,'demo'),/narration changed/);
 put('public/demo/script.json',{beats:[]});assert.throws(()=>renderPreflight(root,'demo',{thumbnail:true}),/Staged script differs/);
 assert.equal(safeAsset(join(root,'public'),'../secret'),false);
});
const brief={version:2,...Object.fromEntries(['viewer','question','promise','earlyAnswer','newValue','evidencePlan','nextStep'].map(k=>[k,'A concrete editorial statement'])),packaging:[1,2,3].map(i=>({title:'Concept '+i,thumbnailText:'CHECK THIS',imageIdea:'Real terminal result'})),demand:[{platform:'YouTube',source:'snapshot.json',retrievedAt:'2026-09-10',observation:'Specific hardware questions lead views'}],evidence:[{id:'doc',claim:'Documented command behavior',kind:'documented',checkedAt:'2026-09-10',url:'https://docs.ollama.com/faq'}],nearestExistingVideos:[]};
const script={format:'explainer',title:'Check your GPU',thumb:{},beats:[{id:'a',purpose:'answer',narration:'Check the processor column.',visual:{type:'callout'}},{id:'b',purpose:'proof',narration:'This is the documented command.',evidenceIds:['doc'],visual:{type:'callout'}}]};
test('valid sourced answer-first outline is accepted',()=>assert.deepEqual(validateEditorial(script,brief).errors,[]));
test('unmeasured test claims and unlabelled speed packaging are rejected',()=>{
 const altered=structuredClone(script);altered.beats[1].narration='We tested this card.';altered.title='100 tok/s';
 const errors=validateEditorial(altered,{...brief,packagingEvidenceIds:['doc']}).errors.join('\n');
 assert.match(errors,/test claim has no measured evidence/);assert.match(errors,/explicit measured\/calculated wording/);
});
