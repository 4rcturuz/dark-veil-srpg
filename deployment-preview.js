import {TERRAIN} from './data.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function deploymentPreview(map,{action='cemetery-slot',formation={},heroes=[],disabled=false}={}){
 const points=map.starts,radius=5,minX=Math.max(0,Math.min(...points.map(p=>p[0]))-radius),maxX=Math.min(map.width-1,Math.max(...points.map(p=>p[0]))+radius),minY=Math.max(0,Math.min(...points.map(p=>p[1]))-radius),maxY=Math.min(map.height-1,Math.max(...points.map(p=>p[1]))+radius);
 let tiles='';for(let y=map.invertY?maxY:minY;map.invertY?y>=minY:y<=maxY;map.invertY?y--:y++)for(let x=minX;x<=maxX;x++){
  const known=points.some(([px,py])=>Math.max(Math.abs(px-x),Math.abs(py-y))<=radius),slot=points.findIndex(p=>p[0]===x&&p[1]===y),t=TERRAIN[map.grid[y][x]],h=map.elevation?.[y]?.[x]??0;
  const hero=heroes.find(u=>formation[u.id]===slot),label=slot<0?'':String.fromCharCode(65+slot),title=known?`${x+1},${y+1} ${t.name} 高さ${h}${label?' 配置'+label+' '+(hero?.name??'未配置'):''}`:'未踏';
  tiles+=slot<0?`<span title="${esc(title)}" style="background:${known?t.color:'#0c1b22'}">${known&&h?h:''}</span>`:`<button data-action="${action}" data-id="${slot}" ${disabled?'disabled':''} title="${esc(title)}" aria-label="配置${label}${hero?' '+esc(hero.name):''}" class="deployment-slot ${hero?'assigned':''}">${label}</button>`;
 }
 return `<div class="deployment-preview" role="group" aria-label="配置地点周囲5スクエアの地形" style="--cols:${maxX-minX+1}">${tiles}</div><p class="tiny muted">配置地点周囲5スクエア · 数字は高度</p>`;
}
export function cemeteryDiagram(kind){
 const board=(blocked=false,cover=false)=>{
  const cols=cover?3:4,rows=cover?1:4;
  const tile=(x,y)=>{const hero=x===0&&y===(cover?0:1),enemy=x===(cover?2:3)&&y===(cover?0:1),wall=!cover&&x===2&&y===1&&blocked;
   return `<span class="diagram-tile ${wall?'wall':''} ${enemy&&cover&&blocked?'rubble':''}">${hero?'<span class="diagram-umine" aria-label="海音"></span>':enemy?'<b class="diagram-enemy" aria-label="敵ユニット">◆</b>':wall?'■':y===(cover?0:1)?'<i class="diagram-ray">→</i>':''}</span>`;
  };
  return `<figure><div class="diagram-board" style="--cols:${cols}">${Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>tile(x,y)).join('')).join('')}</div><figcaption>${cover?(blocked?'タイル・平地＋瓦礫':'タイル・平地'):(blocked?'視界✕':'視界◯')}</figcaption></figure>`;
 };
 return `<section class="cemetery-diagram" aria-label="${kind==='sight'?'射線と遮蔽の比較':'平地と瓦礫の比較'}">${board(false,kind==='cover')}${board(true,kind==='cover')}</section>`;
}
