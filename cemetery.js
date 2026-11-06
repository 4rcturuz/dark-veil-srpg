import {Battle,clone,stats,addXp,key} from './engine.js';
import {ITEMS,TERRAIN} from './data.js';
import {CEMETERY_ENEMIES,ALL_ITEMS} from './database.js';
import {CEMETERY_PARTY} from './cemetery-preparation.js';
import {CEMETERY_MISSION,makeCemeteryMap,makeCemeteryInterior,CEMETERY_LEGEND} from './cemetery-map.js';
import {bossArea,bossStep,bossDanger,ordinaryStep} from './cemetery-combat.js';
import {scriptPages} from './cemetery-script.js';
const scene=action=>({kind:'cemetery-scene',action});
const mergeCounts=(a,b)=>{const out={...a};for(const [k,n]of Object.entries(b))out[k]=(out[k]||0)+n;return out;};

export class CemeteryBattle extends Battle{
 constructor(campaign,formation={},options={}){
  const c=clone(campaign);c.heroes.forEach(h=>h.rest=!CEMETERY_PARTY.includes(h.id));
  if(CEMETERY_PARTY.some(id=>!c.heroes.some(h=>h.id===id&&h.hp>0)))throw Error('灰の墓地には3人全員で出撃してください。');
  super(c,0,formation,{difficulty:options.debug&&options.bossUnlocked?'hard':c.difficulty==='story'?'light':'normal'});
  this.tutorial2=true;this.debug=!!options.debug;this.bossBranch=!!(this.debug&&options.bossUnlocked);
  this.flags={};this.lessons=[...(c.cemeteryTutorial?.lessons??[13,14,15])];this.triggerHistory=[];
  this.flow='opening';this.flowRevision=0;this.actionDepth=0;this.pendingDamage=new Set();this.pendingLow=new Set();this.highCandidate=null;
  this.defeated={};this.earnedXp=0;this.collected={...(c.tutorialLedger?.items??{})};this.prior=clone(c.tutorialLedger??{turns:0,runes:0,xp:0,defeated:{},items:{}});
  this.source=clone(c);this.messages=[];this.events=[];this.log=[];this.cinematicActors=[];
  this.queue([scene('opening'),...scriptPages(18,26).map((m,i)=>i===3?{...m,emote:'ears'}:m),scene('battle-start')]);
 }
 setupMap(options={}){
  this.mission=CEMETERY_MISSION;this.map=makeCemeteryMap(options.difficulty);this.units=this.units.filter(u=>u.team==='ally');
  this.units.forEach((u,i)=>{[u.x,u.y]=this.map.starts[u.slot??i];u.facing={x:0,y:1};});
  this.seen=new Set();this.visible=new Set();this.known={};this.memory={};this.elevationMemory={};
  for(const e of this.map.enemies)this.spawnCemeteryEnemy(e);
  this.updateVision();
 }
 spawnCemeteryEnemy({id,type,x,y,group,movementBounds}){
  const d=CEMETERY_ENEMIES[type];if(!d)throw Error(`未定義の灰の墓地敵ID: ${type}`);
  const factor=this.source.difficulty==='story'?d.storyFactor:1;
  const u={...clone(d),id:`cem-${id}`,tutorialType:type,group,movementBounds,heavy:type==='adarius',enemyType:d.enemyType,team:'enemy',x,y,origin:{x,y},hp:Math.floor(d.maxHp*factor),maxHp:Math.floor(d.maxHp*factor),atk:Math.floor(d.atk*factor),mag:Math.floor(d.mag*factor),lv:1,cd:{},uses:{},status:{},buffs:{},hate:{},equipped:[...d.skills],ap:1,mp:d.move,waited:false,active:false};
  this.units.push(u);return u;
 }
 party(){return CEMETERY_PARTY.map(id=>this.units.find(u=>u.id===id));}
 center(){const a=this.party();return {x:a.reduce((v,u)=>v+u.x,0)/a.length,y:a.reduce((v,u)=>v+u.y,0)/a.length};}
 queue(pages){for(const m of pages){if(m.lesson&&!this.lessons.includes(m.lesson))this.lessons.push(m.lesson);this.messages.push(m);}}
 mark(flag,reason,unit){this.flags[flag]=true;this.triggerHistory.push({flag,reason,unit:unit?.id,turn:this.turn,phase:this.phase});}
 get scripted(){return !['exploration','boss'].includes(this.flow);}
 objective(){return this.flow==='boss'||this.flags.bossStarted?'巨像を撃破せよ。':CEMETERY_MISSION.objective;}
 updateVision(){
  super.updateVision();
  if(this.sceneReveal){for(let y=0;y<this.map.height;y++)for(let x=0;x<this.map.width;x++){const k=key(x,y);this.visible.add(k);this.seen.add(k);this.known[k]=Number.isFinite(TERRAIN[this.tile(x,y)].cost);this.memory[k]=this.tile(x,y);this.elevationMemory[k]=this.elevationAt({x,y});}}
  if(this.tutorial2&&this.moving&&this.flow==='exploration'&&!this.flags.if1&&!this.highCandidate){const e=this.living('enemy').find(e=>this.elevationAt(e)===1&&this.isVisible(e));if(e)this.highCandidate={id:e.id,x:e.x,y:e.y};}
 }
 tile(x,y){const s=this.map.statue;if(s?.dormant&&s.cells.some(([sx,sy])=>x===sx&&y===sy))return 'dormantStatue';return super.tile(x,y);}
 moveCost(u,from,to,knowledge=false){
  const r=u.movementBounds;if(r&&this.cells({...u,...to}).some(p=>p.x<r.minX||p.x>r.maxX||p.y<r.minY||p.y>r.maxY))return Infinity;
  if(!u.footprint)return super.moveCost(u,from,to,knowledge);
  return Math.max(...u.footprint.map(([dx,dy])=>{const q={x:to.x+dx,y:to.y+dy},other=this.at(q.x,q.y);if(!this.inside(q.x,q.y)||other&&other.id!==u.id)return Infinity;return super.moveCost({...u,footprint:null},{x:from.x+dx,y:from.y+dy},q,knowledge);}));
 }
 area(u,id,target=null){return id.startsWith('adarius')?bossArea(this,u,id,target):super.area(u,id,target);}
 attackPair(a,b,id,target=b){if(!id.startsWith('adarius'))return super.attackPair(a,b,id,target);
  const origins=this.cells(a).sort((p,q)=>Math.max(Math.abs(p.x-b.x),Math.abs(p.y-b.y))-Math.max(Math.abs(q.x-b.x),Math.abs(q.y-b.y)));
  return {origin:origins.find(p=>this.lineClear(p,b))??origins[0],target:b};
 }
 danger(u){return bossDanger(this,u);}
 operation(reason,fn){
  this.actionDepth++;let value;try{value=fn();}finally{this.actionDepth--;}
  if(!this.actionDepth)this.resolveTriggers(reason);return value;
 }
 move(u,x,y){if(this.scripted||this.messages.some(m=>m.kind!=='combat'))return false;return this.operation('movement',()=>{this.moving=true;try{return super.move(u,x,y);}finally{this.moving=false;}});}
 onMove(u,path){if(u.team==='ally'&&path.length){this.completedMove=u.id;if(path.some(p=>this.inGoal(p)))this.arrivalCandidate=u.id;}}
 act(u,id,target){if(this.scripted)return false;return this.operation('action',()=>{const ok=super.act(u,id,target);if(ok&&id==='tideBlessing')u.lastHealTurn=this.turn;return ok;});}
 useItem(u,id,target){if(this.scripted)return false;return this.operation('item',()=>{const ok=super.useItem(u,id,target);if(ok&&ITEMS[id].effect==='heal')u.lastHealTurn=this.turn;if(ok&&this.collected[ITEMS[id].name]>0)this.collected[ITEMS[id].name]--;return ok;});}
 enemyStep(u){if(this.scripted)return;return this.operation('enemy-action',()=>{if(!u.ap||u.hp<=0||u.status.paralysis||this.phase!=='enemy')return;if(u.heavy)return bossStep(this,u);return ordinaryStep(this,u,()=>super.enemyStep(u));});}
 endPhase(){if(this.scripted||this.pendingExit)return;if(this.phase==='ally'&&this.flow==='exploration'&&this.shouldExit('end-ally')){this.pendingExit=true;return;}const reason=this.phase==='ally'?'end-ally':'end-enemy';return this.operation(reason,()=>super.endPhase());}
 hurt(u,n,source,detail=''){
  const before=u.hp;super.hurt(u,n,source,detail);if(u.heavy&&!u.hp)this.telegraph=null;
  if(this.tutorial2&&!this.scripted&&u.team==='ally'&&u.hp<before){this.pendingDamage.add(u.id);if(u.hp<this.effective(u,'maxHp')*.5)this.pendingLow.add(u.id);}
 }
 receiveLoot(u,item){
  const ok=super.receiveLoot(u,item);if(ok&&this.collected&&item.type!=='runes'){
   const name=ITEMS[item.type]?.name??ALL_ITEMS[item.type]?.name??this.weapons.at(-1);if(name)this.collected[name]=(this.collected[name]||0)+1;
  }return ok;
 }
 defeatLoot(u,source){if(this.defeated){this.defeated[u.name]=(this.defeated[u.name]||0)+1;this.earnedXp+=u.xp||0;}super.defeatLoot(u,source);}
 selectUnit(id){
  if(this.scripted||this.phase!=='ally'||this.result||this.messages.length)return;
  if(id==='umine'&&!this.flags.if2){this.mark('if2','select',this.units.find(u=>u.id===id));const p=scriptPages(36,40);p[2].diagram='sight';p[3].diagram='cover';this.queue(p);}
  this.resolveTriggers('select');
 }
 inGoal(u){return u.hp!==0&&this.map.exit.some(([x,y])=>x===u.x&&y===u.y);}
 checkEnd(){if(this.tutorial2&&!this.actionDepth)this.resolveTriggers('action');}
 resolveTriggers(reason='action'){
  if(!this.tutorial2||this.result||this.scripted)return;
  if(!this.living('ally').length){this.finish(false);return;}
  const low=this.party().find(u=>this.pendingLow.has(u.id)||u.hp<this.effective(u,'maxHp')*.5);
  if(!this.flags.if5&&low){const i=CEMETERY_PARTY.indexOf(low.id);this.mark('if5',reason,low);this.queue([...scriptPages(56+i*3,59+i*3),...scriptPages(65,67)]);this.pendingLow.clear();}
  else if(!this.flags.if4&&this.pendingDamage.size){const u=this.party().find(u=>this.pendingDamage.has(u.id)),i=CEMETERY_PARTY.indexOf(u.id);this.mark('if4',reason,u);this.queue([...scriptPages(40+i*3,43+i*3),...scriptPages(49,56)]);this.pendingDamage.clear();}
  if(this.flow==='boss'){
   if(!this.living('enemy').some(e=>e.id==='cem-adarius')){this.flow='ending';this.flowRevision++;this.queue([...scriptPages(96,98),scene('boss-collapse'),...scriptPages(98,100),scene('blood'),...scriptPages(100,103),scene('finish')]);}return;
  }
  if(this.highCandidate&&!this.flags.if1){this.mark('if1',reason,this.highCandidate);this.queue([scriptPages(26)[0],{...scene('focus-high'),target:clone(this.highCandidate)},...scriptPages(27,29),scene('focus-party'),...scriptPages(29,36)]);}
  const arrived=this.party().find(u=>this.inGoal(u));
  if((arrived||this.arrivalCandidate)&&!this.flags.if6){this.mark('if6',reason,arrived??this.units.find(u=>u.id===this.arrivalCandidate));this.queue(scriptPages(67,69));}
  const all=this.living('ally').every(u=>this.inGoal(u));
  if(this.shouldExit(reason)||all&&!this.allAtGate)this.pendingExit=true;
  this.allAtGate=all;this.arrivalCandidate=null;this.completedMove=null;
 }
 shouldExit(reason){
  const allies=this.living('ally'),occupied=allies.filter(u=>this.inGoal(u));if(!occupied.length)return false;
  const eligible=occupied.length===allies.length||!this.living('enemy').length;
  if(reason==='end-ally')return eligible;
  if(reason!=='movement'||!this.completedMove)return false;
  return occupied.length===allies.length||eligible&&occupied.some(u=>u.id===this.completedMove);
 }
 confirmExit(yes){if(!this.pendingExit)return false;this.pendingExit=false;return yes?this.beginEnding():true;}
 beginEnding(){
  if(this.flow!=='exploration')return false;
  this.flags.goalComplete=true;this.subComplete=this.living('enemy').length===0;this.flow='ending';this.flowRevision++;
  const normal=[scene('clear-stage'),scriptPages(69)[0],scene('look-building'),...scriptPages(70,72),scene('interior'),scriptPages(72)[0],{...scriptPages(73)[0],emote:'tears'}, {...scriptPages(74)[0],emote:'surprise'},...scriptPages(75,77),scene('backstep'),scriptPages(77)[0],{...scriptPages(78)[0],emote:'idea',sword:true},scene('stone-dark'),...scriptPages(79,81),scene('treasure'),...scriptPages(81,84),scene('finish')];
  const secret=[scene('clear-stage'),scriptPages(84)[0],scene('look-building'),...scriptPages(85,87),scene('enter-gate'),scene('statue-shift'),scriptPages(87)[0],scene('turn-back'),...scriptPages(88,91),scene('ambush'),...scriptPages(91,94),scene('boss-setup'),scriptPages(94)[0],scriptPages(95)[0],scene('enemy-first')];
  this.queue(this.bossBranch?secret:normal);return true;
 }
 stageClear(){
  this.explorationMap=this.map;this.sceneReveal=true;this.units=this.units.filter(u=>u.team==='ally');
  for(const u of this.party()){const p=CEMETERY_LEGEND.clearPositions[u.id];u.x=p[0]-1;u.y=p[1]-1;u.eventDirection=4;}
  this.cinematicActors=[];
  this.updateVision();
 }
 enterInterior(){
  this.map=makeCemeteryInterior();this.cinematicActors=[];
  this.party().forEach((u,i)=>{[u.x,u.y]=this.map.starts[i];u.eventDirection=[4,2,6][i];});
  this.seen=new Set();this.updateVision();
 }
 sceneMove(id,path,direction=null){
  const u=[...this.units,...this.cinematicActors].find(u=>u.id===id);if(!u||!path.length)return;
  const from={x:u.x,y:u.y};if(direction!==null)u.eventDirection=direction;
  this.events.push({type:'move',id,from,path:path.map(([x,y])=>({x,y})),to:{x:path.at(-1)[0],y:path.at(-1)[1]}});
  [u.x,u.y]=path.at(-1);this.updateVision();
 }
 startBoss(){
  if(!this.bossBranch||this.flags.bossStarted)return false;
  this.map=this.explorationMap;this.map.exit=[];this.map.gate.ruined=true;
  const st=this.map.statue;st.dormant=false;this.cinematicActors=[];this.sceneReveal=false;
  this.units=this.units.filter(u=>u.team==='ally');const boss=this.spawnCemeteryEnemy({...st,id:'adarius'});boss.facing={x:0,y:1};boss.firstTelegraph=true;
  for(const u of this.party()){const [x,y]=CEMETERY_LEGEND.battlePositions[u.id];Object.assign(u,{x:x-1,y:y-1});delete u.eventDirection;}
  this.flags.bossStarted=true;this.flow='boss';this.flowRevision++;this.phase='enemy';this.pendingExit=false;
  this.updateVision();return true;
 }
 finish(win){
  if(this.result)return;
  const defeated=mergeCounts(this.prior?.defeated??{},this.defeated??{}),remaining={};
  for(const [id,n]of Object.entries(this.items)){const name=ITEMS[id].name,count=Math.min(n,this.collected?.[name]||0);if(count>0)remaining[name]=count;}
  for(const name of this.weapons)if(this.collected?.[name])remaining[name]=1;
  for(const id of this.quest){const name=ALL_ITEMS[id]?.name;if(name&&this.collected?.[name])remaining[name]=1;}
  this.result={win,rank:this.bossBranch?'—':win?(this.subComplete?'S':'B'):'E',sub:!!this.subComplete,turns:(this.prior?.turns||0)+this.turn,cemeteryTurns:this.turn,runes:(this.prior?.runes||0)+this.runes,xp:(this.prior?.xp||0)+this.earnedXp,defeated,items:Object.entries(remaining).map(([name,count])=>({name,count})),kills:Object.values(defeated).reduce((a,b)=>a+b,0),casualties:this.casualties};
  this.flow='result';
 }
 commit(){
  if(!this.result)return null;const c=clone(this.source),r=this.result;if(this.bossBranch)return c;
  c.inventory=clone(this.items);c.weapons=clone(this.weapons);c.questItems=this.quest.filter(id=>ALL_ITEMS[id]?.persistent);c.runes=Math.min(9999999,c.runes+this.runes);
  for(const id of CEMETERY_PARTY){const h=c.heroes.find(h=>h.id===id),u=this.units.find(u=>u.id===id);h.hp=Math.min(u.hp,stats(h).maxHp);h.penalty=u.penalty;
   if(r.win)addXp(h,Math.max(0,r.xp-(this.prior.xpAwarded?.[id]||0)));
  }
  c.cemeteryTutorial={status:r.win?'complete':'failed',result:clone(r)};if(r.win)delete c.tutorialLedger;return c;
 }
}
