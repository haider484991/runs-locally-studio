import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, staticFile } from 'remotion';
import type { Visual } from '../types';
import { C, FONT } from '../theme';

// Capture content keeps its original aspect ratio. No simulated cursor, results, or application chrome.
export const Evidence: React.FC<{v:Extract<Visual,{type:'capture'}>;accent:string}> = ({v,accent}) => (
  <AbsoluteFill>
    <div style={{position:'absolute',left:120,top:75,right:120,fontFamily:FONT.body,color:C.ink,fontSize:46,fontWeight:700}}>{v.caption}</div>
    <div style={{position:'absolute',left:120,top:165,width:1680,height:700,background:'#080b12',border:`2px solid ${accent}`,borderRadius:18,overflow:'hidden'}}>
      {v.media==='image'
        ? <Img src={staticFile(v.src)} style={{width:'100%',height:'100%',objectFit:'contain'}} />
        : <OffthreadVideo src={staticFile(v.src)} startFrom={v.startFrom??0} muted style={{width:'100%',height:'100%',objectFit:'contain'}} />}
      {v.focus&&<div style={{position:'absolute',left:`${v.focus.x}%`,top:`${v.focus.y}%`,width:`${v.focus.width}%`,height:`${v.focus.height}%`,border:`4px solid ${accent}`,boxShadow:'0 0 0 9999px rgba(0,0,0,.2)',borderRadius:6}}/>}
    </div>
    <div style={{position:'absolute',left:120,top:890,right:120,fontFamily:FONT.body,fontSize:25,color:C.muted}}>
      {v.kind==='measured'?'MEASURED EVIDENCE':v.kind==='documented'?'DOCUMENTED SOURCE':'ILLUSTRATION'} · {v.source}
    </div>
  </AbsoluteFill>
);
