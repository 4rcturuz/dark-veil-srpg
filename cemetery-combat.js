import {SKILLS,DIRS,TERRAIN} from './data.js';
const near=(p,q)=>Math.max(Math.abs(p.x-q.x),Math.abs(p.y-q.y)),key=p=>p.x+','+p.y;
const heading=(e,p)=>{if(p?.dir)return p.dir;if(!p)return e.facing??{x:0,y:1};const x=p.x-e.x-.5,y=p.y-e.y-.5;return Math.abs(x)>Math.abs(y)?{x:Math.sign(x),y:0}:{x:0,y:Math.sign(y)||1};};
export function bossArea(b,e,id,target){
 const s=SKILLS[id],orig=b.cells(e),cells=[],dir=heading(e,target);
 const distance=p=>Math.min(...orig.map(o=>near(o,p))),clear=(p,r)=>b.inside(p.x,p.y)&&orig.some(o=>near(o,p)<=r-Math.abs(b.elevationDifference(o,p))&&(!e.status.blind||near(o,p)<=1)&&b.lineClear(o,p));
 const add=(x,y)=>{const p={x,y};if(b.inside(x,y)&&!TERRAIN[b.tile(x,y)].block&&distance(p)>0)cells.push(p);};
 if(s.shape==='bossTomb'){
  if(!target||!clear(target,s.range)||!orig.some(o=>b.visibleTo({...e,...o},target)))return [];
  for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)if(clear({x:target.x+x,y:target.y+y},s.range)&&b.lineClear(target,{x:target.x+x,y:target.y+y}))add(target.x+x,target.y+y);
 }else if(s.shape==='bossRing'){
  for(let y=e.y-2;y<=e.y+3;y++)for(let x=e.x-2;x<=e.x+3;x++)if(clear({x,y},2))add(x,y);
 }else{
  const pad=(s.width-2)/2;
  for(let depth=1;depth<=s.range;depth++)for(let side=-pad;side<2+pad;side++){
   const x=e.x+(dir.x>0?1+depth:dir.x<0?-depth:side),y=e.y+(dir.y>0?1+depth:dir.y<0?-depth:side);
   const p={x,y},edge={x:Math.max(e.x,Math.min(e.x+1,x)),y:Math.max(e.y,Math.min(e.y+1,y))};
   if(b.inside(x,y)&&near(edge,p)<=s.range-Math.abs(b.elevationDifference(edge,p))&&(!e.status.blind||near(edge,p)<=1)&&b.lineClear(edge,p))add(x,y);
  }
 }return cells;
}
const intersects=(b,u,cells)=>b.cells(u).some(p=>cells.some(q=>p.x===q.x&&p.y===q.y));
function positions(b,e,budget=e.mp){return [...b.reachable(e,false,budget).costs].map(([k,c])=>{const [x,y]=k.split(',').map(Number);return {x,y,c};}).filter(p=>!b.at(p.x,p.y)||b.at(p.x,p.y)?.id===e.id);}
const facings=DIRS.map(([x,y])=>({dir:{x,y}}));
export function bossDanger(b,e){
 if(!e?.heavy||e.hp<=0||!b.isVisible(e))return null;
 const now=new Set(),after=new Set();for(const p of positions(b,{...e,waited:false},b.movementLimit(e)))for(const f of facings)for(const q of bossArea(b,{...e,...p},'adariusSweep',f))(p.c?after:now).add(key(q));
 return {now,after};
}
function mark(b,e,id,target){const cells=bossArea(b,e,id,target);b.telegraph={id,cells,target:structuredClone(target),turn:b.turn};e.ap=e.mp=0;if(target.dir)e.facing={...target.dir};b.report(e.name+'「'+SKILLS[id].name+'」予兆。',e);}
function strike(b,e,id,cells,target){b.report(e.name+'「'+SKILLS[id].name+'」',e);b.events.push({type:'skill',id:e.id,skill:id});
 for(const u of b.living('ally').filter(u=>intersects(b,u,cells)))b.hit(e,u,id,target);e.ap=e.mp=0;if(SKILLS[id].cd)e.cd[id]=SKILLS[id].cd;
}
export function bossStep(b,e){
 if(e.firstTelegraph){e.firstTelegraph=false;mark(b,e,'adariusProcession',{dir:{x:0,y:1}});return;}
 if(b.telegraph){const t=b.telegraph;if(b.turn===t.turn)return;b.telegraph=null;strike(b,e,t.id,t.cells,t.target);e.recoveryPhase=true;return;}
 const victims=b.enemySight(e),hits=cells=>victims.filter(u=>intersects(b,u,cells)),distance=(p,u)=>Math.min(...b.cells({...e,...p}).map(o=>near(o,u))),nearest=p=>Math.min(100,...victims.map(t=>distance(p,t)));
 const sweep=(p)=>facings.map(target=>({target,cells:bossArea(b,{...e,...p},'adariusSweep',target)})).map(o=>({...o,n:hits(o.cells).length})).sort((a,b)=>b.n-a.n)[0];
 if(!e.recoveryPhase&&victims.length){
  if(!e.cd.adariusFallingTomb){let best;const candidates=new Map();for(const t of victims)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const p={x:t.x+dx,y:t.y+dy};candidates.set(key(p),p);}
   for(const p of candidates.values()){const v=hits(bossArea(b,e,'adariusFallingTomb',p)),score=10*v.length+Number(v.some(u=>u.lastHealTurn>=b.turn-1));if(v.length>=2&&(!best||score>best.score))best={score,p};}if(best){mark(b,e,'adariusFallingTomb',best.p);return;}}
  if(!e.cd.adariusAshWave&&victims.filter(u=>distance(e,u)<=1).length>=2){mark(b,e,'adariusAshWave',{x:e.x,y:e.y});return;}
  if(!e.cd.adariusProcession){const dirs=facings.map(f=>({f,n:hits(bossArea(b,e,'adariusProcession',f)).length})).sort((a,b)=>b.n-a.n);if(dirs[0].n){mark(b,e,'adariusProcession',dirs[0].f);return;}}
 }
 e.recoveryPhase=false;const choices=positions(b,e).map(p=>({p,hit:sweep(p),d:nearest(p)})).sort((a,b)=>b.hit.n-a.hit.n||a.d-b.d||a.p.c-b.p.c),best=choices[0];
 if(best&&victims.length){if(best.p.c)b.move(e,best.p.x,best.p.y);const s=sweep(e);if(s.n){e.facing=s.target.dir;strike(b,e,'adariusSweep',s.cells,s.target);}}e.ap=e.mp=0;
}
export function ordinaryStep(b,e,fallback){
 const visible=b.enemySight(e),ready=id=>!b.available(e,id),type=e.tutorialType;
 if(type==='pilgrim_t2'&&e.hp<=e.maxHp/2&&ready('t2FirstAid'))return b.act(e,'t2FirstAid',e);
 if(type==='weed_t2'||!visible.length)return fallback();
 e.active=true;e.lastSeen={x:visible[0].x,y:visible[0].y};e.searchWait=0;
 if(type==='prisoner'&&!e.prepared&&ready('t2GuardStance')){e.prepared=true;return b.act(e,'t2GuardStance',e);}
 const ids=({shadow:['t2PoisonBlade','t2Slash','t2Flame'],caterpillar:['t2Flame','t2PoisonBlade','t2Slash'],pilgrim_t2:['t2MoonCurse','holyLight'],prisoner:['t2HeavyStrike','t2Slash']})[type];
 if(!ids)return fallback();
 const options=(u,targets)=>ids.flatMap((id,i)=>!ready(id)?[]:targets.filter(t=>b.inRange(u,t,id)&&(!(id==='t2MoonCurse')||!t.buffs.atk?.negative&&t.equipped.some(k=>SKILLS[k]?.kind==='attack'&&!(SKILLS[k].magic??t.magic)))).map(t=>({id,t,i})));
 const choices=positions(b,e).map(p=>({p,o:options({...e,...p},visible)[0],d:Math.min(...visible.map(t=>near(p,t)))})).sort((a,b)=>(a.o?.i??99)-(b.o?.i??99)||(type==='prisoner'&&a.o&&b.o?b.d-a.d:0)||a.d-b.d||a.p.c-b.p.c);
 const dest=choices[0];if(dest?.p.c)b.move(e,dest.p.x,dest.p.y);
 const o=options(e,b.enemySight(e))[0];if(o)b.act(e,o.id,o.t);else if(type==='prisoner'&&ready('t2GuardStance')&&!e.buffs.def?.positive)b.act(e,'t2GuardStance',e);e.ap=e.mp=0;
}
