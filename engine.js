import {createElevation,elevationMoveCost,elevationRange,elevationAccuracy} from './elevation.js';
import {ALL_ITEMS,WEAPONS,WEAPONS_BY_NAME,ENEMY_TYPES,weaponOptions} from './database.js';
import {VERSION,DIRS,TERRAIN,HEROES,SKILLS,ITEMS,MISSIONS,STATUS_NAMES} from './data.js';
import {INTERMISSION_GIFT,INTERMISSION_PAGES} from './intermission-data.js';
export const clone=x=>JSON.parse(JSON.stringify(x));
export const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export const near=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
export const key=(x,y)=>`${x},${y}`;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function newHero(h,rest=true){return {id:h.id,hp:h.maxHp,lv:1,xp:0,upgrade:0,penalty:false,rest,weapon:h.weapon,armor:h.armor,equipped:[...h.skills]};}
export function makeCampaign(difficulty='normal'){
 return {version:VERSION,difficulty,blood:400,inventory:Object.fromEntries(Object.entries(ITEMS).map(([id,i])=>[id,i.initialCount])),runes:0,questItems:[],weapons:[],tutorialCompleted:false,cleared:{},unlocked:0,autoSave:true,heroes:HEROES.map((h,i)=>newHero(h,i>=4))};
}
export function validateCampaign(v){
 if(!v||![1,2,3,VERSION].includes(v.version)||!['normal','story'].includes(v.difficulty)||!Array.isArray(v.heroes)||v.heroes.length<1)throw Error('対応していないセーブデータです。');
 // Legacy identifiers are accepted only during migration; old skills have no live definition.
 v=clone(v);
 if(v.version===1){
  for(const h of v.heroes)if(h&&Array.isArray(h.equipped))h.equipped=h.equipped.map(id=>h.id==='orion'&&id==='attack'?'shieldstrike':h.id==='roland'&&id==='knightlure'?'hundredcuts':id);

 }
 if(v.version<3){for(const id of ['moonClear','moonDrop','feral','powder'])if(v.inventory)v.inventory[id]??=0;v.runes??=0;v.questItems??=[];v.weapons??=[];v.tutorialCompleted??=false;}
 if(v.version<4){
  for(const h of v.heroes)if(h?.id==='umine'){
   if(Array.isArray(h.equipped))h.equipped=h.equipped.map(id=>({attack:'seaAttack',aqua:'seaTrident',heal:'tideBlessing',waterlove:'seaHope'}[id]??id));
   if(h.weapon==='水紋の杖')h.weapon=WEAPONS.waterStaff.name;
   if(h.armor==='魔女の三角帽子')h.armor=ALL_ITEMS.witchHat.name;
  }
  v.version=VERSION;
 }
 if(new Set(v.heroes.map(h=>h?.id)).size!==v.heroes.length||v.heroes.some(h=>!HEROES.some(d=>d.id===h?.id)))throw Error('未定義または重複したユニットです。');
 if(['astarthe','umine','orion','roland'].some(id=>!v.heroes.some(h=>h.id===id)))throw Error('既存ユニットの記録が欠落しています。');
 for(const d of HEROES)if(!v.heroes.some(h=>h.id===d.id))v.heroes.push(newHero(d));
 v.heroes.sort((a,b)=>HEROES.findIndex(d=>d.id===a.id)-HEROES.findIndex(d=>d.id===b.id));
 if(v.inventory)for(const id of Object.keys(ITEMS))v.inventory[id]??=0;
 const number=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
 if(!Number.isInteger(v.blood)||!number(v.blood,0,9999999)||!Number.isInteger(v.unlocked)||!number(v.unlocked,0,2)||!v.inventory||Object.keys(v.inventory).some(k=>!ITEMS[k])||!v.cleared||typeof v.cleared!=='object'||Array.isArray(v.cleared))throw Error('進行データが壊れています。');
 if(!Number.isInteger(v.runes)||!number(v.runes,0,9999999)||!Array.isArray(v.questItems)||v.questItems.some(id=>ALL_ITEMS[id]?.category!=='key'||!ALL_ITEMS[id].persistent)||new Set(v.questItems).size!==v.questItems.length||!Array.isArray(v.weapons)||v.weapons.some(name=>!WEAPONS_BY_NAME[name]?.collectible)||new Set(v.weapons).size!==v.weapons.length||typeof v.tutorialCompleted!=='boolean')throw Error('チュートリアル記録が壊れています。');
 if(v.cathedralIntermission!=null){const s=v.cathedralIntermission;if(!v.tutorialCompleted||typeof s!=='object'||!Number.isInteger(s.page)||s.page<0||s.page>=INTERMISSION_PAGES.length||typeof s.completed!=='boolean'||s.completed&&(s.page!==INTERMISSION_PAGES.length-1||!v.weapons.includes(INTERMISSION_GIFT)))throw Error('幕間の記録が壊れています。');}
 if(typeof v.autoSave!=='boolean')throw Error('設定データが壊れています。');
 for(const [i,h] of v.heroes.entries()){
  const d=HEROES[i];
  if(!h||h.id!==d.id||!Number.isInteger(h.lv)||!number(h.lv,1,100)||!number(h.xp,0,10000)||!Number.isInteger(h.upgrade)||!number(h.upgrade,0,5)||!number(h.hp,0,stats(h).maxHp)||typeof h.rest!=='boolean'||typeof h.penalty!=='boolean'||!Array.isArray(h.equipped)||h.equipped.length>d.skills.length||new Set(h.equipped).size!==h.equipped.length||h.equipped.some(s=>!d.skills.includes(s))||![...weaponOptions(h,v).map(w=>w.name),...(h.id==='astarthe'?[WEAPONS.unarmed.name]:[])].includes(h.weapon)||!Object.values(ALL_ITEMS).some(i=>i.category==='armor'&&i.name===h.armor&&(i.usable_by.includes('*')||i.usable_by.includes(h.id))))throw Error('ユニットデータが壊れています。');
 }
 for(const k of Object.keys(ITEMS))if(!Number.isInteger(v.inventory[k])||!number(v.inventory[k],0,ITEMS[k].stackLimit))throw Error('アイテムデータが壊れています。');
 for(const [k,x] of Object.entries(v.cleared))if(!['0','1','2'].includes(k)||!x||!['S','A','B','C','D','E'].includes(x.rank)||!number(x.turns,1,200)||typeof x.win!=='boolean')throw Error('戦績データが壊れています。');
 if(v.cemeteryTutorial!=null){
  const t=v.cemeteryTutorial,ids=['astarthe','hoshiyomi','umine'];
  if(!t||typeof t!=='object'||!['preparation','complete','failed'].includes(t.status))throw Error('灰の墓地の記録が壊れています。');
  if(t.status==='preparation'&&(!['recovery','healing','briefing','placement'].includes(t.step)||!Number.isInteger(t.page)||t.page<0||t.page>7||typeof t.injured!=='boolean'||!t.formation||typeof t.formation!=='object'||Array.isArray(t.formation)||Object.entries(t.formation).some(([id,n])=>!ids.includes(id)||!Number.isInteger(n)||n<0||n>2)||new Set(Object.values(t.formation)).size!==Object.keys(t.formation).length||!Array.isArray(t.lessons)||t.lessons.some(n=>!Number.isInteger(n)||n<13||n>15)))throw Error('灰の墓地の出撃準備記録が壊れています。');
 }
 if(v.tutorialLedger!=null){
  const l=v.tutorialLedger,counts=o=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.values(o).every(n=>Number.isInteger(n)&&n>=0&&n<=9999999);
  if(!l||!['turns','runes','xp'].every(k=>Number.isInteger(l[k])&&l[k]>=0&&l[k]<=9999999)||!counts(l.defeated)||!counts(l.items)||!counts(l.xpAwarded??{}))throw Error('チュートリアル戦績が壊れています。');
 }
 return clone(v);
}
export function stats(h){
 const d=HEROES.find(x=>x.id===h.id),l=h.lv-1,g=d.growth,w=WEAPONS_BY_NAME[h.weapon];
 if(!w)throw Error('未定義の武器です');
 const baseStats={maxHp:Math.min(9999,d.maxHp+g[0]*l),atk:Math.min(999,d.atk+g[1]*l)*w.attackMultiplier,def:Math.min(999,d.def+g[2]*l),mag:Math.min(999,d.mag+g[3]*l),res:Math.min(999,d.res+g[4]*l),speed:d.speed+g[5]*l,move:d.move,sight:d.sight,crit:d.crit,resistance:d.resistance};
 return {...d,...baseStats,baseStats,atk:baseStats.atk+h.upgrade*8+w.attackBonus,mag:baseStats.mag+h.upgrade*8+w.magicBonus,range:w.rangeOverride||d.range};
}
export function xpNeeded(lv){return 100+(lv-1)*25;}
export function addXp(h,amount){
 if(h.lv>=100)return 0;
 let gained=0,remaining=amount;
 while(remaining>0&&h.lv<100){
  const factor=h.penalty?.75:1,need=xpNeeded(h.lv)-h.xp,raw=Math.min(remaining,Math.ceil(need/factor));
  const add=Math.min(need,Math.floor(raw*factor)); h.xp+=add;gained+=add;remaining-=raw;
  if(h.xp>=xpNeeded(h.lv)){const before=stats(h).maxHp;h.xp=0;h.lv++;h.penalty=false;if(h.hp>0)h.hp=Math.min(stats(h).maxHp,h.hp+stats(h).maxHp-before);}else break;
 }return gained;
}
export function recoveryCost(h,outside=false){return Math.ceil(((h.hp===0?65:20)+h.lv*5)*(outside?1.5:1));}
export function restoreHero(c,id,rebirth=false,outside=false){
 const h=c.heroes.find(x=>x.id===id);if(!h)return false;
 if(rebirth&&h.hp===0){h.hp=1;h.penalty=true;return true;}
 const cost=recoveryCost(h,outside);
 if(h.hp>=stats(h).maxHp||c.blood<cost)return false;
 c.blood-=cost;h.hp=stats(h).maxHp;return true;
}
export function makeMap(mission,stage){
 const n=12,grid=Array.from({length:n},()=>Array(n).fill('grass'));
 const set=(x,y,t)=>{grid[y][x]=t;};
 for(let i=0;i<n;i++){set(i,0,'wall');set(i,11,'wall');set(0,i,'wall');set(11,i,'wall');}
 for(let x=1;x<11;x++){set(x,5,'road');set(x,6,'road');}
 for(let y=1;y<11;y++)set(5,y,'road');
 const objects=[[2,2,'shrub'],[3,2,'shrub'],[2,3,'shrub'],[8,2,'shrub'],[9,2,'shrub'],[9,3,'shrub'],[8,8,'shrub'],[9,9,'shrub'],[2,8,'shrub'],[3,9,'rubble'],[7,3,'rubble'],[7,8,'rubble'],[8,9,'shrub']];
 objects.forEach(a=>set(...a));
 if(mission===0){set(6,2,'wall');set(6,3,'crack');set(8,4,'mud');set(9,4,'mud');set(7,7,'poison');set(8,7,'poison');set(4,8,'sound');}
 if(mission===1&&stage===0){for(let y=1;y<11;y++){set(6,y,'water');set(7,y,'water');}set(6,5,'road');set(7,5,'road');set(6,6,'road');set(7,6,'road');set(8,3,'mud');set(8,4,'mud');set(4,3,'ice');set(4,4,'ice');set(8,8,'thorn');}
 if(mission===1&&stage===1){for(let x=2;x<10;x++){set(x,2,'wall');set(x,9,'wall');}set(5,2,'road');set(6,2,'road');for(let y=3;y<9;y++)set(7,y,'wall');set(7,5,'crack');set(7,6,'crack');set(9,4,'charge');set(9,7,'thorn');set(4,3,'rubble');set(4,8,'rubble');}
 if(mission===2){for(let y=3;y<9;y++){set(8,y,'wall');}set(8,5,'crack');set(8,6,'crack');set(4,4,'rubble');set(4,7,'rubble');set(9,8,'lava');set(9,3,'poison');set(6,8,'sound');}
 const starts=[[2,5],[1,6],[3,5],[2,6]];
 starts.forEach(([x,y])=>set(x,y,'road'));
 return {width:n,height:n,grid,elevation:createElevation(n,n),starts,exit:mission===1&&stage===0?[[10,4],[10,5],[10,6],[10,7]]:[],items:[{x:4,y:3,type:mission===0?'potion':'revive',taken:false}]};
}
export class Battle{
 constructor(campaign,missionId=0,formation=null,mapOptions={}){
  this.source=clone(campaign);this.mission=MISSIONS[missionId];this.stage=0;this.turn=1;this.phase='ally';this.log=[];this.messages=[];this.events=[];this.result=null;this.pendingExit=false;this.casualties=0;this.kills=0;this.pickups=0;this.absent=[];this.items=clone(campaign.inventory);this.seed=Date.now()>>>0;
  this.runes=0;this.quest=clone(campaign.questItems);this.weapons=clone(campaign.weapons);
  this.units=campaign.heroes.filter(h=>!h.rest&&h.hp>0).slice(0,4).map((h,i)=>({...stats(h),...clone(h),team:'ally',cd:{},uses:{},status:{},buffs:{},hate:{},ap:1,mp:stats(h).move,waited:false,form:'human',movementSpent:0,movementLocked:false,slot:formation?.[h.id]??i}));
  if(!this.units.length)throw Error('出撃できる仲間がいません。');
  this.setupMap(mapOptions);this.addLog('月の光を頼りに、進軍を開始した。');
 }
 random(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
 inside(x,y){return x>=0&&y>=0&&x<this.map.width&&y<this.map.height;}
 tile(x,y){return this.inside(x,y)?this.map.grid[y][x]:'wall';}
 elevationAt(p,knowledge=false){
  if(!this.inside(p.x,p.y))return null;
  if(knowledge&&!this.visible.has(key(p.x,p.y)))return this.elevationMemory?.[key(p.x,p.y)]??null;
  return this.map.elevation?.[p.y]?.[p.x]??0;
 }
 elevationDifference(from,to){return this.elevationAt(to)-this.elevationAt(from);}
 elevationStepCost(u,from,to,cost,knowledge=false){
  // Every occupied cell must clear the step; the most expensive edge determines the move.
  return Math.max(...(u.footprint||[[0,0]]).map(([dx,dy])=>{
   const a={x:from.x+dx,y:from.y+dy},b={x:to.x+dx,y:to.y+dy};
   if(!this.inside(a.x,a.y)||!this.inside(b.x,b.y))return Infinity;
   const h1=this.elevationAt(a,knowledge),h2=this.elevationAt(b,knowledge);
   return h1==null||h2==null?Math.max(1,cost):elevationMoveCost(cost,h1,h2);
  }));
 }
 attackOrigin(u,id,target){
  if(!u.footprint||!SKILLS[id].directional||!target)return u;
  const cells=this.cells(u),cx=cells.reduce((n,p)=>n+p.x,0)/cells.length,cy=cells.reduce((n,p)=>n+p.y,0)/cells.length;
  const dx=target.x-cx,dy=target.y-cy,dir=Math.abs(dx)>=Math.abs(dy)?{x:Math.sign(dx),y:0}:{x:0,y:Math.sign(dy)};
  cells.sort((a,b)=>(b.x*dir.x+b.y*dir.y)-(a.x*dir.x+a.y*dir.y));
  return {...u,...cells[0],footprint:null};
 }
 skillRange(id,u){const s=SKILLS[id];return s.range??({front3:1,front6:2,cone:3,adjacent:1,area2:2,self:0}[s.shape])??u.range;}
 effectiveRange(u,t,id){return elevationRange(this.skillRange(id,u),this.elevationAt(u),this.elevationAt(t));}
 attackPair(a,b,id,target=b){
  const origins=SKILLS[id].directional?[this.attackOrigin(a,id,target)]:this.cells(a).map(p=>({...a,...p,footprint:null}));
  const pairs=origins.flatMap(origin=>this.cells(b).map(target=>({origin,target}))).sort((x,y)=>dist(x.origin,x.target)-dist(y.origin,y.target));
  return pairs.find(p=>SKILLS[id].shape?this.area(p.origin,id,target).some(q=>q.x===p.target.x&&q.y===p.target.y):this.inRange(p.origin,p.target,id))??pairs[0];
 }
 itemInRange(u,p,item){return dist(u,p)<=elevationRange(item.range,this.elevationAt(u),this.elevationAt(p))&&this.lineClear(u,p);}
 living(team){return this.units.filter(u=>u.hp>0&&(!team||u.team===team));}
 cells(u){return (u.footprint||[[0,0]]).map(([dx,dy])=>({x:u.x+dx,y:u.y+dy}));}
 at(x,y,dead=false){return this.units.find(u=>(dead||u.hp>0)&&this.cells(u).some(p=>p.x===x&&p.y===y));}
 addLog(text){this.log.push(text);if(this.log.length>100)this.log.shift();}
 report(text,u=null){if(u&&u.team!=='ally'&&!this.isVisible(u))return;this.addLog(text);this.messages.push({kind:'combat',text});}
 unitName(u){return u.team==='ally'||this.isVisible(u)?u.name:'敵ユニット';}
 announcePickup(u,name,art=null){const text=`${u.name}が『${name}』を拾った。`;this.addLog(text);this.messages.push({kind:'system',text,art});}
 receiveLoot(u,item){
  if(!u||u.team!=='ally'||u.hp<=0)return false;
  if(item.type==='runes'){
   if(!Number.isInteger(item.amount)||item.amount<=0)return false;
   this.runes+=item.amount;this.announcePickup(u,`${item.amount}ルーン`);
  }else if(ITEMS[item.type]){
   if((this.items[item.type]||0)>=ITEMS[item.type].stackLimit)return false;
   this.items[item.type]=(this.items[item.type]||0)+1;this.announcePickup(u,ITEMS[item.type].name);
  }else if(WEAPONS[item.type]?.collectible){
   const name=WEAPONS[item.type].name;if(this.weapons.includes(name))return false;this.weapons.push(name);this.announcePickup(u,name);
  }else if(ALL_ITEMS[item.type]?.category==='key'){
   if(this.quest.includes(item.type))return false;this.quest.push(item.type);this.announcePickup(u,ALL_ITEMS[item.type].name);
  }else return false;
  this.pickups++;return true;
 }
 defeatLoot(enemy,source){
  const recipient=this.living('ally').find(u=>u.id===source||u.name===source)??this.living('ally')[0];
  if(enemy.runes)this.receiveLoot(recipient,{type:'runes',amount:enemy.runes});
  for(const item of enemy.drops??[])if((!item.condition||item.condition==='always')&&(item.chance===undefined||item.chance===1||this.random()<item.chance))this.receiveLoot(recipient,item);
 }
 setupMap(){
  this.map=makeMap(this.mission.id,this.stage);this.seen=new Set();this.known={};this.memory={};this.elevationMemory={};this.visible=new Set();
  this.units=this.units.filter(u=>u.team==='ally'&&(!u.leftBehind));
  this.units.forEach((u,i)=>{const pos=this.map.starts[u.slot??i];u.x=pos[0];u.y=pos[1];});
  let spawn=this.mission.id===0?[[6,5,'beast'],[8,3,'beast'],[8,6,'archer'],[9,8,'beast'],[5,9,'sentinel']]:this.mission.id===1&&this.stage===0?[[5,4,'beast'],[8,5,'shade'],[9,2,'archer'],[9,8,'sentinel']]:this.mission.id===1?[[6,5,'sentinel'],[5,3,'shade'],[5,8,'beast'],[9,5,'boss'],[9,7,'archer']]:[[6,5,'beast'],[6,9,'beast'],[6,2,'archer'],[9,6,'shade']];
  spawn.forEach(([x,y,t],i)=>this.spawnEnemy(x,y,t,`${this.stage}-${i}`));this.updateVision();
 }
 spawnEnemy(x,y,type,id){
  const d=ENEMY_TYPES[type];if(!d)throw Error(`未定義の敵ID: ${type}`);const factor=this.source.difficulty==='story'?d.storyFactor:1;
  const u={...clone(d),id:`e-${id}`,enemyType:d.enemyType,title:d.role,team:'enemy',x,y,origin:{x,y},maxHp:Math.floor(d.hp*factor),hp:Math.floor(d.hp*factor),atk:Math.floor(d.atk*factor),mag:Math.floor(d.mag*factor),cd:{},uses:{},status:{},buffs:{},hate:{},ap:1,mp:d.move,lv:1,equipped:[...d.skills],active:false,lastSeen:null,searchWait:0};
  this.units.push(u);return u;
 }
 lineClear(a,b){
  let x=a.x,y=a.y,dx=Math.abs(b.x-x),dy=Math.abs(b.y-y),sx=x<b.x?1:-1,sy=y<b.y?1:-1,err=dx-dy;
  while(x!==b.x||y!==b.y){const e=2*err;const ox=x,oy=y;if(e>-dy){err-=dy;x+=sx;}if(e<dx){err+=dx;y+=sy;}
   if(x!==ox&&y!==oy&&TERRAIN[this.tile(x,oy)].block&&TERRAIN[this.tile(ox,y)].block)return false;
   if(x===b.x&&y===b.y)return true;if(TERRAIN[this.tile(x,y)].block)return false;
  }return true;
 }
 visibleTo(u,p){return near(u,p)<=(u.status.blind?0:this.effective(u,'sight'))&&this.lineClear(u,p);}
 updateVision(){
  this.syncFormResources();
  const vis=new Set();for(const u of this.living('ally'))for(let y=0;y<this.map.height;y++)for(let x=0;x<this.map.width;x++)if(this.visibleTo(u,{x,y}))vis.add(key(x,y));
  this.visible=vis;for(const k of vis){this.seen.add(k);const [x,y]=k.split(',').map(Number);this.memory[k]=this.tile(x,y);(this.elevationMemory??={})[k]=this.elevationAt({x,y});this.known[k]=Number.isFinite(TERRAIN[this.tile(x,y)].cost);}
 }
 isVisible(u){return u.team==='ally'||this.cells(u).some(p=>this.visible.has(key(p.x,p.y)))||!!u.status.exposed;}
 sonar(){
  const listeners=this.living('ally').filter(u=>this.skills(u).includes('sonar'));if(!listeners.length)return [];
  return this.living('enemy').filter(e=>e.lastMovedTurn===this.turn-1&&!this.isVisible(e)&&listeners.some(u=>dist(u,e)<=SKILLS.sonar.range)).map(e=>{
   let hash=[...e.id].reduce((s,c)=>s+c.charCodeAt(0),this.turn*13+this.stage*7),dx=hash%5-2,dy=(Math.abs(dx)===2?0:((hash*7)%3)-1);
   return {x:clamp(e.x+dx,0,this.map.width-1),y:clamp(e.y+dy,0,this.map.height-1)};
  });
 }
 moveCost(u,from,to,knowledge=false){
  const k=key(to.x,to.y),unseen=knowledge&&!this.visible.has(k);
  let t=unseen?(this.known[k]===false?'wall':'plain'):this.tile(to.x,to.y),d=TERRAIN[t];
  if(!Number.isFinite(d.cost))return Infinity;
  let cost=d.cost;
  if(t==='water')cost+=to.y>from.y?0:to.y<from.y?2:1;
  const zone=this.living(u.team==='ally'?'enemy':'ally').some(e=>(!knowledge||this.isVisible(e))&&this.cells(e).some(p=>dist(p,to)===1));
  return this.elevationStepCost(u,from,to,cost+(zone?2:0),knowledge);
 }
 reachable(u,knowledge=true,budget=u.mp){
  const start=key(u.x,u.y),costs=new Map([[start,0]]),prev=new Map(),queue=[{x:u.x,y:u.y,c:0}];
  if(u.status.paralysis||u.waited)return {costs,prev};
  while(queue.length){queue.sort((a,b)=>a.c-b.c);const p=queue.shift();if(p.c>costs.get(key(p.x,p.y)))continue;
   for(const [dx,dy]of DIRS){const q={x:p.x+dx,y:p.y+dy};if(!this.inside(q.x,q.y))continue;const occupant=this.at(q.x,q.y);
    if(occupant&&occupant.team!==u.team&&(!knowledge||this.isVisible(occupant)))continue;
    const c=p.c+this.moveCost(u,p,q,knowledge),k=key(q.x,q.y);if(c>budget||c>=(costs.get(k)??Infinity))continue;
    costs.set(k,c);prev.set(k,key(p.x,p.y));queue.push({...q,c});
   }
  }return {costs,prev};
 }
 remainingTurnOptions(u){
  if(u.hp<=0||u.waited||u.status.paralysis)return {move:false,action:false};
  const move=[...this.reachable(u,false).costs.keys()].some(k=>{const [x,y]=k.split(',').map(Number);return (x!==u.x||y!==u.y)&&!this.at(x,y);});
  return {move,action:u.ap>0};
 }
 endTurnPrompts(){return this.living('ally').flatMap(u=>{const {move,action}=this.remainingTurnOptions(u);return move||action?[`${u.name}は${move&&action?'移動力、行動回数':move?'移動力':'行動回数'}を残していますが、ターンを終了しますか？`]:[];});}
 route(u,x,y,knowledge=true){
  const {costs,prev}=this.reachable(u,knowledge),end=key(x,y),start=key(u.x,u.y);if(!costs.has(end))return null;
  const path=[];let k=end;while(k!==start){const [px,py]=k.split(',').map(Number);path.unshift({x:px,y:py});k=prev.get(k);if(!k)return null;}return path;
 }
 distanceField(goal,u=null){
  const queue=[{...goal,c:0}],out=new Map([[key(goal.x,goal.y),0]]),walker=u?{...u,footprint:null}:null;
  while(queue.length){queue.sort((a,b)=>a.c-b.c);const p=queue.shift();if(p.c!==out.get(key(p.x,p.y)))continue;
   for(const [dx,dy]of DIRS){const q={x:p.x+dx,y:p.y+dy},k=key(q.x,q.y);
    if(!this.inside(q.x,q.y)||!Number.isFinite(TERRAIN[this.tile(q.x,q.y)].cost))continue;
    // Reverse traversal must pay the cost from the candidate toward the goal.
    const step=walker?this.moveCost(walker,q,p,false):elevationMoveCost(TERRAIN[this.tile(p.x,p.y)].cost,this.elevationAt(q),this.elevationAt(p)),cost=p.c+step;
    if(cost>=(out.get(k)??Infinity))continue;out.set(k,cost);queue.push({...q,c:cost});
   }
  }return out;
 }
 move(u,x,y){
  if(this.result||this.pendingExit||u.team!==this.phase||u.hp<=0||u.waited||u.status.paralysis)return false;
  if(x===u.x&&y===u.y)return false;const endOccupant=this.at(x,y);if(endOccupant&&endOccupant!==u&&(endOccupant.team===u.team||u.team==='enemy'||this.isVisible(endOccupant)))return false;
  const path=this.route(u,x,y,u.team==='ally');if(!path)return false;
  let moved=0;const travelled=[];const origin={x:u.x,y:u.y};let lastFree={...origin},observed=this.isVisible(u);
  for(const q of path){
   const occupant=this.at(q.x,q.y);if(occupant&&occupant.team!==u.team){this.addLog('進路を塞ぐ敵を発見した。移動を停止。');break;}
   const cost=this.moveCost(u,u,q,false);if(cost>u.mp){this.addLog('実際の地形により、ここで移動を停止。');break;}
   u.mp-=cost;if(u.wolf_move)u.movementSpent=(u.movementSpent||0)+cost;u.facing={x:q.x-u.x,y:q.y-u.y};u.x=q.x;u.y=q.y;moved++;travelled.push({...q});if(!occupant||occupant===u)lastFree={...q};
   this.enterTerrain(u);
   this.updateVision();observed||=this.isVisible(u);if(u.hp<=0||u.status.paralysis)break;
  }
  if(this.units.some(v=>v!==u&&v.hp>0&&v.x===u.x&&v.y===u.y)){u.x=lastFree.x;u.y=lastFree.y;}
  if(moved){while(travelled.length&&(travelled.at(-1).x!==u.x||travelled.at(-1).y!==u.y))travelled.pop();u.lastMovedTurn=this.turn;this.events.push({type:'move',id:u.id,from:origin,path:travelled,to:{x:u.x,y:u.y}});if(observed)this.addLog(u.team==='ally'?`${u.name}が(${origin.x+1},${origin.y+1})から(${u.x+1},${u.y+1})へ移動した。`:`${u.name}が移動した。`);if(u.team==='ally'&&u.hp>0)this.collectItems(u);}
  this.onMove?.(u,travelled);
  this.updateVision();this.checkEnd();return moved>0;
 }
 collectItems(u){if(u.team!=='ally'||u.hp<=0)return;for(const item of this.map.items.filter(i=>!i.taken&&i.x===u.x&&i.y===u.y)){if(this.receiveLoot(u,item))item.taken=true;else if(ITEMS[item.type])this.addLog('所持上限のためアイテムを残した。');}}
 effective(u,stat,ranged=false){
  const formBase=u.form==='wolf'&&stat==='move'?u.wolf_move:u.form==='wolf'&&stat==='sight'?u.wolf_sight:u[stat];
  const base=(u.form==='wolf'&&['move','sight'].includes(stat))?formBase:(u.baseStats?.[stat]??u[stat]);
  let v=(formBase+base*this.courtshipBonus(u))*(u.status.feral?(u.status.feral.multiplier??ITEMS.feral.statMultiplier):1),buff=u.buffs[stat],amount=(buff?.positive?.amount??0)+(buff?.negative?.amount??0);
  if(stat==='move')return Math.max(0,v+amount);
  v*=Math.max(0,1+amount);
  if(stat==='speed'){if(u.status.paralysis)v*=.25;if(u.status.blind)v*=.5;const t=TERRAIN[this.tile(u.x,u.y)];v*=1+(t.speed||0)+(ranged?(t.cover||0):0);}
  if(stat==='maxHp'&&u.wolf_move)return Math.max(1,Math.floor(v));
  return Math.max(.001,Math.floor(v*1000)/1000);
 }
 skills(u){return u.equipped.map(id=>u.form==='wolf'&&u.wolf_passive&&SKILLS[id]?.passive?u.wolf_passive:id);}
 courtshipBonus(u){
  if(u.hp<=0||u.form==='wolf'||!u.equipped.includes('moonSuitor'))return 0;
  const women=this.living().filter(v=>v!==u&&v.gender==='female'&&this.cells(v).some(p=>dist(u,p)===1));
  return Math.round(Math.min(SKILLS.moonSuitor.maxStacks,women.length)*SKILLS.moonSuitor.amount*1000)/1000;
 }
 syncFormResources(){
  for(const u of this.units.filter(u=>u.wolf_move>0)){
   u.hp=Math.min(u.hp,Math.floor(this.effective(u,'maxHp')));
   u.mp=u.hp>0&&!u.waited&&!u.movementLocked&&!u.status.paralysis?Math.max(0,this.movementLimit(u)-(u.movementSpent||0)):0;
  }
 }
 transform(u){
  if(!u.wolf_move)return false;
  u.form=u.form==='wolf'?'human':'wolf';u.transformedTurn=this.turn;
  this.updateVision();this.events.push({type:'skill',id:u.id,skill:'metamorphosis'});
  this.report(`${u.name}は${u.form==='wolf'?'狼':'ヒト'}の姿になった。`,u);this.checkEnd();return true;
 }
 // Area travel is not a turn: refill budgets without ticking any duration or CT.
 refreshAreaActions(){for(const u of this.units.filter(u=>u.team==='ally')){u.waited=false;u.movementSpent=0;u.movementLocked=false;u.ap=u.hp>0&&!u.status.paralysis?1:0;u.mp=u.hp>0?this.movementLimit(u):0;}}
 movementLimit(u){if(u.status.paralysis)return 0;const base=Math.max(0,Math.floor((this.effective(u,'move')-(u.status.lavaSlow?2:0))*(u.status.freeze?.5:1)));return u.status.shadowPin?Math.max(1,base-2):base;}
 setBuff(u,stat,amount,turns,source){u.buffs[stat]??={};u.buffs[stat][amount<0?'negative':'positive']={amount,turns,source};const name={atk:'攻撃',def:'防御',mag:'神秘',res:'抗秘',speed:'迅速',move:'移動力'}[stat]??stat;this.report(`${u.name}：${name}${amount<0?'低下':'上昇'} ${stat==='move'?Math.abs(amount):Math.round(Math.abs(amount)*100)+'%'}（${turns}ターン）。`,u);}
 triggerHundredCuts(u){
  const s=SKILLS.hundredcuts,before=this.movementLimit(u);
  this.setBuff(u,'move',s.move,s.duration,u.team);this.setBuff(u,'atk',s.amount,s.duration,u.team);
  if(u.hp>0&&!u.waited&&!u.status.paralysis)u.mp=Math.min(this.movementLimit(u),u.mp+Math.max(0,this.movementLimit(u)-before));
  this.addLog(`${u.name}「${s.name}」：移動力 +${s.move}・物理攻撃 +${s.amount*100}%（${s.duration}ターン）。`);
 }
 forecast(a,b,skill='attack',target=b){
  const s=SKILLS[skill],magic=s.magic??a.magic,ranged=dist(a,b)>1;
  const offense=this.effective(a,magic?'mag':'atk'),defense=this.effective(b,magic?'res':'def');
  const baseEvade=clamp(15+(this.effective(b,'speed',ranged)/(this.effective(a,'speed')*(s.accuracySpeedMultiplier??1))-1)*50,5,75),pair=this.attackPair(a,b,skill,target),heightDifference=this.elevationDifference(pair.origin,pair.target),accuracyModifier=elevationAccuracy(this.elevationAt(pair.origin),this.elevationAt(pair.target)),evade=clamp(baseEvade-accuracyModifier,0,100),multiplier=s.damageMultiplier??1;
  return {damage:Math.max(0,Math.floor((offense*(s.power??1)-defense*.5)*multiplier)),min:Math.max(0,Math.floor((offense*(s.power??1)*.95-defense*.5)*multiplier)),max:Math.max(0,Math.floor((offense*(s.power??1)*1.05-defense*.5)*multiplier)),hit:Math.floor(100-evade),evade,accuracyModifier,heightDifference,effectiveRange:this.effectiveRange(pair.origin,pair.target,skill),crit:this.effective(a,'crit'),magic};
 }
 available(u,id){
  const s=SKILLS[id];if(!s||!u.equipped.includes(id))return '未装着';
  if(u.hp<=0||u.waited||u.status.paralysis||!u.ap&&!s.freeAction)return '行動済み';
  if(s.kind==='transform'&&!u.wolf_move)return '形態未設定';
  if(s.oncePerTurn&&u.transformedTurn===this.turn)return 'このターン使用済み';
  if(s.excludesWeapon&&u.weapon===s.excludesWeapon)return '固有武器装備中';
  if(s.requires&&u.weapon!==s.requires&&u.armor!==s.requires)return '必要装備なし';
  if(u.cd[id]>0)return `CT ${u.cd[id]}`;if(s.uses&&(u.uses[id]||0)>=s.uses)return '残り0回';return '';
 }
 area(u,id,target=null){
  const s=SKILLS[id],occupied=this.cells(u);u=this.attackOrigin(u,id,target);const cells=[];const add=(x,y)=>{if(this.inside(x,y))cells.push({x,y});};
  if(s.shape==='targetArea'){
   if(!this.canTarget(u,id,target))return [];
   for(let dy=-s.radius;dy<=s.radius;dy++)for(let dx=-s.radius;dx<=s.radius;dx++)add(target.x+dx,target.y+dy);
  }
  else if(s.shape==='line2'){
   if(!this.canTarget(u,id,target))return [];
   const dx=Math.sign(target.x-u.x),dy=Math.sign(target.y-u.y);
   for(let i=0;i<2;i++)add(target.x+dx*i,target.y+dy*i);
  }
  else if(s.shape==='self')add(u.x,u.y);
  else if(s.shape==='adjacent'||s.shape==='area2'){const r=s.shape==='adjacent'?1:2;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(s.shape==='area2'||dx||dy)add(u.x+dx,u.y+dy);}
  else if(s.shape==='rays'){for(const [dx,dy]of DIRS)for(let i=1;i<=s.range;i++)add(u.x+dx*i,u.y+dy*i);}
  else if(s.directional){
   if(target&&near(u,target)>0){const dx=target.x-u.x,dy=target.y-u.y,dir=Math.abs(dx)>=Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)];
    if(s.shape==='front3'||s.shape==='front6')for(let depth=1;depth<=(s.shape==='front6'?2:1);depth++)for(let side=-1;side<=1;side++)add(u.x+dir[0]*depth-dir[1]*side,u.y+dir[1]*depth+dir[0]*side);
    else if(s.shape==='rectangle')for(let depth=1;depth<=s.depth;depth++)for(let side=-Math.floor(s.width/2);side<=Math.floor(s.width/2);side++)add(u.x+dir[0]*depth-dir[1]*side,u.y+dir[1]*depth+dir[0]*side);
    else if(s.shape==='cone')for(let depth=1;depth<=3;depth++)for(let side=-Math.floor((depth-1)/2);side<=Math.ceil((depth-1)/2);side++){const x=u.x+dir[0]*depth-dir[1]*side,y=u.y+dir[1]*depth+dir[0]*side;if(this.lineClear(u,{x,y}))add(x,y);}
   }
  }
  else if(target)add(target.x,target.y);
  return cells.filter(p=>(!s.directional||!occupied.some(q=>q.x===p.x&&q.y===p.y))&&(!s.lineOfSight||this.lineClear(u,p))&&(!u.status.blind||dist(u,p)<=1)&&(!['attack','debuff'].includes(s.kind)||(s.shape==='rays'?dist(u,p):near(u,p))<=this.effectiveRange(u,p,id)));
 }
 // Spatial casting range is independent of the unit required as an effect center.
 inTargetRange(u,id,target){
  const s=SKILLS[id];if(!target||!this.inside(target.x,target.y)||u.status.blind&&dist(u,target)>1)return false;
  if(s.shape==='targetArea'||s.kind==='relocate')return dist(u,target)<=s.range&&this.lineClear(u,target);
  if(s.shape==='line2')return dist(u,target)>0&&dist(u,target)<=this.effectiveRange(u,target,id)&&(u.x===target.x||u.y===target.y)&&this.lineClear(u,target);
  return true;
 }
 targetRange(u,id){
  if(!SKILLS[id]?.targeted)return [];
  const cells=[];
  for(let y=0;y<this.map.height;y++)for(let x=0;x<this.map.width;x++)if(this.inTargetRange(u,id,{x,y}))cells.push({x,y});
  return cells;
 }
 canTarget(u,id,target){
  if(!this.inTargetRange(u,id,target))return false;
  if(SKILLS[id].shape==='targetArea'||SKILLS[id].kind==='relocate')return this.units.some(v=>v.id===target.id&&v.hp>0&&v.team===u.team&&v.x===target.x&&v.y===target.y);
  return true;
 }
 inRange(u,t,id){
  const s=SKILLS[id];if(u.footprint&&!s.shape)return this.cells(u).some(p=>this.inRange({...u,...p,footprint:null},t,id));if(t.footprint)return this.cells(t).some(p=>this.inRange(u,p,id));if(u.status.blind&&dist(u,t)>1)return false;
  if(s.targeted)return this.canTarget(u,id,t);
  if(s.shape)return this.area(u,id,t).some(p=>p.x===t.x&&p.y===t.y);
  const d=dist(u,t),r=s.kind==='heal'?(s.range??u.range):this.effectiveRange(u,t,id);
  if(s.kind==='heal')return near(u,t)<=r&&this.lineClear(u,t);
  return d>0&&d<=r&&(u.x===t.x||u.y===t.y)&&this.lineClear(u,t);
 }
 targets(u,id,target=null,resolve=false){
  const s=SKILLS[id];if(s.kind==='relocate')return this.living(u.team).filter(v=>this.canTarget(u,id,v));if(s.kind==='transform')return [u];if(s.kind==='buff')return this.living(u.team).filter(v=>this.area(u,id,target).some(p=>p.x===v.x&&p.y===v.y));
  if(s.kind==='heal'){if(!s.shape)return this.living(u.team).filter(v=>this.inRange(u,v,id));const area=this.area(u,id,target);return this.living(u.team).filter(v=>this.cells(v).some(q=>area.some(p=>p.x===q.x&&p.y===q.y)));}
  let enemies=this.living(u.team==='ally'?'enemy':'ally').filter(v=>s.pierce||resolve&&s.hitsUnseen||u.team==='enemy'||this.isVisible(v));
  if(s.water)enemies.push(...this.living(u.team).filter(v=>v.status.burn));
  if(s.shape){const cells=this.area(u,id,target);return enemies.filter(v=>this.cells(v).some(q=>cells.some(p=>p.x===q.x&&p.y===q.y)));}
  return enemies.filter(v=>this.inRange(u,v,id));
 }
 setStatus(u,id,turns,source){
  if(id==='paralysis'&&u.status.immune)return false;
  if(id==='doom'){if(u.doomImmune??u.enemyType==='shade')return false;const stacks=u.status.doom?.stacks||[];stacks.push({turns,source});u.status.doom={stacks};this.report(`${u.name}に呪死を付与（蓄積${stacks.length}）。`,u);if(stacks.length>=5)this.hurt(u,u.hp,'呪死');return true;}
  u.status[id]={turns,source};this.report(`${u.name}に${STATUS_NAMES[id]??id}を付与（${turns}ターン）。`,u);if(id==='paralysis'){u.mp=0;u.ap=0;u.movementLocked=true;}return true;
 }
 removeStatus(u,id){if(!u.status[id])return;delete u.status[id];this.report(`${u.name}の${STATUS_NAMES[id]??id}が解除された。`,u);if(id==='feral')u.hp=Math.min(u.hp,u.maxHp);if(id==='paralysis')this.setStatus(u,'immune',3,u.team);}
 hurt(u,n,source,detail=''){
  if(u.hp<=0)return;u.hp=Math.max(0,u.hp-n);this.events.push({type:'damage',id:u.id,value:n});this.report(`${u.name}に${n}ダメージ。${detail}`,u);
  if(u.hp===0){u.mp=0;u.ap=0;this.report(`${u.name}は戦闘不能になった。`,u);if(u.team==='ally')this.casualties++;else{this.kills++;this.defeatLoot(u,source);}for(const e of this.units)delete e.hate[u.id];}
 }
 hit(a,b,id,target=b){
  const s=SKILLS[id],f=this.forecast(a,b,id,target),roll=this.random()*100,wasUnhurt=b.hp>0&&b.hp===b.maxHp;
  if(roll<f.evade){this.report(`${this.unitName(a)} → ${this.unitName(b)}：回避。`,b);this.events.push({type:'miss',id:b.id});return;}
  const partial=roll<f.evade+10,crit=this.random()*100<this.effective(a,'crit');
  const offense=this.effective(a,f.magic?'mag':'atk'),defense=this.effective(b,f.magic?'res':'def');
  const n=Math.max(0,Math.floor((offense*(s.power??1)*(crit?1.5:1)*(.95+this.random()*.1)-defense*.5)*(s.damageMultiplier??1)*(partial?.5:1)));
  this.hurt(b,n,a.name,`${crit?' 会心。':''}${partial?' 部分回避。':''}`);
  if(wasUnhurt&&b.hp===0&&b.team!==a.team&&a.equipped.includes('hundredcuts'))this.triggerHundredCuts(a);
  if(b.team!==a.team)b.hate[a.id]=(b.hate[a.id]||0)+2;
  if(b.enemyType==='boss')for(const e of this.living('enemy'))e.hate[a.id]=(e.hate[a.id]||0)+4;
  const resistance=(b.resistance||0)*(1+this.courtshipBonus(b))*(b.status.feral?(b.status.feral.multiplier??ITEMS.feral.statMultiplier):1);
  if(s.paralysis&&b.hp>0&&this.random()*100<s.paralysis-resistance){this.setStatus(b,'paralysis',3,a.team);}
  if(s.poison&&b.hp>0&&this.random()*100<s.poison-resistance)this.setStatus(b,'poison',5,a.team);
  if(s.shadowPin&&b.hp>0)this.setStatus(b,'shadowPin',1,a.team);
  if(s.water&&!partial&&b.status.burn)this.removeStatus(b,'burn');
  if(b.hp>0&&b.heavy)return;
  if(b.hp>0&&s.push)this.pushAway(a,b,id,target);
  else if(b.hp>0&&this.tile(b.x,b.y)==='ice'){
   const dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y),steps=dx&&dy?2:3;
   for(let i=0;i<steps;i++){const x=b.x+dx,y=b.y+dy;if(!this.inside(x,y)||!Number.isFinite(TERRAIN[this.tile(x,y)].cost)||this.at(x,y)||!Number.isFinite(this.elevationStepCost(b,b,{x,y},1)))break;b.x=x;b.y=y;}
  }
 }
 pushAway(a,b,id,target){
  const origin=this.attackOrigin(a,id,target),dx=(SKILLS[id].pushFromCaster?b:target).x-origin.x,dy=(SKILLS[id].pushFromCaster?b:target).y-origin.y,dir=Math.abs(dx)>=Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)];
  const from={x:b.x,y:b.y},to={x:b.x+dir[0],y:b.y+dir[1]};
  if(this.cells({...b,...to}).some(p=>!this.inside(p.x,p.y)||!Number.isFinite(TERRAIN[this.tile(p.x,p.y)].cost)||this.at(p.x,p.y)&&this.at(p.x,p.y)!==b)||!Number.isFinite(this.elevationStepCost(b,b,to,1)))return false;
  b.x=to.x;b.y=to.y;b.lastMovedTurn=this.turn;this.events.push({type:'move',id:b.id,from,path:[to],to});this.report(`${this.unitName(b)}が1マス押し出された。`,b);return true;
 }
 healAmount(u,s){const max=this.effective(u,'maxHp');return Math.max(0,Math.min(s.heal??Math.floor(max*s.healFraction),max-u.hp));}
 healUnit(u,amount){if(u.hp<=0||amount<=0)return false;u.hp+=amount;this.events.push({type:'heal',id:u.id,value:amount});this.report(`${u.name}のHPが${amount}回復。`,u);return true;}
 healAura(team){
  const s=SKILLS.seaHope,sources=this.living(team).filter(u=>this.skills(u).includes('seaHope'));
  for(const u of this.living(team))if(sources.some(source=>this.cells(u).some(p=>near(source,p)<=s.range))){
   const max=this.effective(u,'maxHp'),fraction=u.hp<=max*s.threshold?s.lowHealthFraction:s.healFraction;
   this.healUnit(u,this.healAmount(u,{healFraction:fraction}));
  }
 }
 // Pulls follow a shortest cardinal path; walls, cliffs and occupied cells cannot be crossed.
 pullPath(caster,target,destination){
  if(!this.canTarget(caster,'curtainPull',target)||!destination||dist(caster,destination)!==1||dist(target,destination)===0||!this.lineClear(target,destination))return null;
  const max=dist(target,destination),queue=[{x:target.x,y:target.y,path:[]}],visited=new Set([key(target.x,target.y)]);
  for(let i=0;i<queue.length;i++){
   const p=queue[i];if(p.x===destination.x&&p.y===destination.y)return p.path;
   for(const [dx,dy]of DIRS){
    const q={x:p.x+dx,y:p.y+dy},k=key(q.x,q.y);
    if(visited.has(k)||p.path.length+1+dist(q,destination)>max)continue;
    if(this.cells({...target,...q}).some(cell=>!this.inside(cell.x,cell.y)||!Number.isFinite(TERRAIN[this.tile(cell.x,cell.y)].cost)||(this.at(cell.x,cell.y)&&this.at(cell.x,cell.y)!==target)))continue;
    if(!Number.isFinite(this.elevationStepCost(target,p,q,1)))continue;
    visited.add(k);queue.push({...q,path:[...p.path,q]});
   }
  }
  return null;
 }
 pullDestinations(caster,target){return DIRS.map(([dx,dy])=>({x:caster.x+dx,y:caster.y+dy})).filter(p=>this.pullPath(caster,target,p));}
 pullAlly(caster,id,target,destination){
  const path=this.pullPath(caster,target,destination);if(!path)return false;
  const s=SKILLS[id],from={x:target.x,y:target.y},travelled=[];
  caster.ap=0;caster.cd[id]=s.cd;caster.uses[id]=(caster.uses[id]||0)+1;
  this.events.push({type:'skill',id:caster.id,skill:id});this.report(`${caster.name}「${s.name}」`,caster);
  for(const p of path){
   target.facing={x:p.x-target.x,y:p.y-target.y};target.x=p.x;target.y=p.y;travelled.push({...p});
   this.enterTerrain(target);if(target.hp<=0)break;
  }
  target.lastMovedTurn=this.turn;this.events.push({type:'move',id:target.id,from,path:travelled,to:{x:target.x,y:target.y}});
  this.report(`${target.name}を(${target.x+1},${target.y+1})へ移動させた。`,target);
  if(target.hp>0)this.collectItems(target);this.onMove?.(target,travelled);this.updateVision();this.checkEnd();return true;
 }
 enterTerrain(u){
  const t=this.tile(u.x,u.y);
  if(t==='thorn'||t==='charge')this.hurt(u,Math.floor(u.maxHp*.1),'地形');
  if(t==='charge'&&this.random()<.5)this.setStatus(u,'paralysis',3,u.team);
  if(t==='lava'){this.setStatus(u,'burn',5,u.team);this.setStatus(u,'lavaSlow',3,u.team);}
  if(t==='sound')this.setStatus(u,'exposed',3,u.team);
 }
 act(u,id,target=null,destination=null){
  if(this.result||this.pendingExit||u.team!==this.phase||this.available(u,id))return false;
  const s=SKILLS[id];if(s.passive)return false;if(s.kind==='transform')return this.transform(u);if(s.kind==='relocate')return this.pullAlly(u,id,target,destination);
  let targets=this.targets(u,id,target,true);
  if(!s.shape||s.singleTarget){if(!target)return false;targets=targets.filter(v=>v.id===target.id);}
  if(!targets.length&&id!=='phenomena')return false;
  if(s.kind==='heal'&&targets.every(t=>t.hp>=this.effective(t,'maxHp')))return false;
  if(s.directional&&(!target||near(u,target)===0))return false;
  if(target&&near(u,target)>0)u.facing={x:target.x-u.x,y:target.y-u.y};
  u.ap=0;if(s.cd)u.cd[id]=s.cd;if(s.uses)u.uses[id]=(u.uses[id]||0)+1;this.events.push({type:'skill',id:u.id,skill:id});this.report(`${this.unitName(u)}「${s.name}」`,u.team==='ally'||this.isVisible(u)?u:targets.find(t=>t.team==='ally')??u);
  if(id==='phenomena')for(const p of this.area(u,id)){const t=this.tile(p.x,p.y);if(TERRAIN[t].breakable)this.map.grid[p.y][p.x]=t==='crack'?'rubble':'plain';}
  for(const t of targets){
   if(s.kind==='attack')this.hit(u,t,id,target);
   if(s.kind==='heal'&&this.healUnit(t,this.healAmount(t,s)))for(const e of this.living(u.team==='ally'?'enemy':'ally'))if(e.hate[t.id]>0)e.hate[u.id]=(e.hate[u.id]||0)+1;
   if(s.kind==='debuff'){if(s.checkHit&&this.random()*100<this.forecast(u,t,id).evade){this.report(t.name+'：回避。',t);this.events.push({type:'miss',id:t.id});continue;}const before=this.movementLimit(t);this.setBuff(t,s.stat,s.amount,s.duration,u.team);t.mp=Math.max(0,t.mp-Math.max(0,before-this.movementLimit(t)));}
   if(s.kind==='buff')for(const stat of s.stat==='guard'?['def','res']:[s.stat])this.setBuff(t,stat,s.amount,s.duration,u.team);
  }
  if(s.kind==='attack'&&targets.some(t=>t.hp===0)&&this.skills(u).includes('cleanup')&&u.cleanupTurn!==this.turn){
   u.cleanupTurn=this.turn;const before=u.mp;u.mp=Math.min(this.movementLimit(u),u.mp+SKILLS.cleanup.move);u.cleanupRecovery=u.mp-before;
   this.report(`${u.name}「後片づけ」：移動力が${u.cleanupRecovery}回復した。`,u);
  }
  this.updateVision();this.checkEnd();return true;
 }
 itemUseReason(u,id,target){
  const item=ITEMS[id];if(!item||!this.items[id])return '所持していません';
  if(!u||this.result||this.pendingExit||u.team!==this.phase||!u.ap||u.waited||u.status.paralysis||u.hp<=0)return '行動できません';
  if(!target||!this.units.includes(target))return '対象がいません';
  if(item.target==='self'&&target!==u)return '自分専用';
  if(item.target==='enemy'){if(target.hp<=0||target.team===u.team||!this.isVisible(target))return '対象外';if(!this.cells(target).some(p=>this.itemInRange(u,p,item)))return '射程外・遮蔽';}
  else{if(target.team!==u.team)return '対象外';if(dist(u,target)>item.range)return '射程外';}
  if(item.effect==='revive')return target.hp!==0?'戦闘不能ではありません':this.at(target.x,target.y)?'他のユニットが占有中':'';
  if(target.hp<=0)return '戦闘不能';
  if(item.effect==='heal')return target.hp>=this.effective(target,'maxHp')?'HPは全快':'';
  if(item.effect==='cure')return item.cureStatuses.some(k=>target.status[k])?'':'解除対象の状態異常なし';
  return ['status','feral'].includes(item.effect)?'':'対象外';
 }
 useItem(u,id,target){
  const item=ITEMS[id];if(this.itemUseReason(u,id,target))return false;const hpBefore=target.hp;
  this.report(`${u.name}が${this.unitName(target)}に${item.name}を使った。`,u);
  if(item.effect==='revive'){target.hp=Math.min(target.maxHp,item.reviveHp);target.ap=0;target.mp=0;target.waited=true;target.status={};}
  else if(item.effect==='heal'){const max=this.effective(target,'maxHp');target.hp=Math.min(max,target.hp+(item.heal||Math.floor(max*item.fraction)));}
  else if(item.effect==='cure'){for(const k of item.cureStatuses)if(target.status[k])this.removeStatus(target,k);}
  else if(item.effect==='feral'){const before=this.movementLimit(target);this.setStatus(target,item.statusId,item.duration,u.team);target.status.feral.multiplier=item.statMultiplier;target.mp+=Math.max(0,this.movementLimit(target)-before);}
  else if(item.effect==='status')this.setStatus(target,item.statusId,item.duration,u.team);
  this.items[id]--;u.ap=0;if(target.hp>hpBefore){this.events.push({type:'heal',id:target.id,value:target.hp-hpBefore});this.report(`${target.name}のHPが${target.hp-hpBefore}回復。`,target);}this.updateVision();return true;
 }
 wait(u){if(u.team===this.phase&&u.hp>0&&!this.result&&!this.pendingExit&&!u.waited){u.waited=true;u.mp=0;u.ap=0;if(this.isVisible(u))this.addLog(`${u.name}が待機した。`);return true;}return false;}
 endPhase(){
  if(this.result||this.pendingExit)return;
  const team=this.phase;
  for(const u of this.living(team)){
   if(this.tile(u.x,u.y)==='poison'&&this.random()<.5)this.setStatus(u,'poison',5,u.team);
   for(const id of ['poison','burn'])if(u.status[id]){const n=Math.floor(u.maxHp*.025);this.hurt(u,n,id);this.addLog(`${u.name}：${id==='poison'?'毒':'炎上'} ${n}`);}
  }
  this.healAura(team);this.checkEnd();if(this.result)return;
  if(team==='enemy'){
   if(this.mission.id===2&&this.turn>=8){this.finish(true);return;}
   this.turn++;if(this.turn>this.mission.turns){this.finish(false);return;}
  }
  this.phase=team==='ally'?'enemy':'ally';this.beginPhase();
 }
 beginPhase(){
  const team=this.phase;
  for(const u of this.units){
   for(const [id,s]of Object.entries(u.status)){
    if(id==='doom'){s.stacks=s.stacks.map(v=>({...v,turns:v.turns-(v.source===team?1:0)})).filter(v=>v.turns>0);if(!s.stacks.length)this.removeStatus(u,'doom');continue;}
    if(s.source===team&&--s.turns<=0){this.removeStatus(u,id);if(id==='freeze')this.hurt(u,Math.floor(u.maxHp*.15),'凍傷');}
   }
   for(const [stat,b]of Object.entries(u.buffs))for(const sign of ['positive','negative'])if(b[sign]?.source===team&&--b[sign].turns<=0){delete b[sign];this.report(`${u.name}の${{atk:'攻撃',def:'防御',mag:'神秘',res:'抗秘',speed:'迅速',move:'移動力'}[stat]??stat}${sign==='negative'?'低下':'上昇'}が終了した。`,u);}
   if(u.team!==team||u.hp<=0)continue;
   for(const id of Object.keys(u.cd))u.cd[id]=Math.max(0,u.cd[id]-1);
   u.cleanupRecovery=0;u.waited=false;u.movementSpent=0;u.movementLocked=false;u.ap=u.status.paralysis?0:1;u.mp=this.movementLimit(u);
   if(this.turn%2===0)for(const id of Object.keys(u.hate))u.hate[id]=Math.max(0,u.hate[id]-1);
  }
  for(const u of this.living(team))if(u.status.burn)for(const v of this.living())if(v!==u&&dist(u,v)===1&&!v.status.burn&&this.random()<.15)this.setStatus(v,'burn',5,team);
  if(team==='enemy'&&this.mission.id===2&&[3,5,7].includes(this.turn)){
   for(const [i,pos]of [[10,2],[10,9]].entries())if(!this.at(...pos)){this.spawnEnemy(...pos,this.turn===7?'sentinel':'beast',`r${this.turn}-${i}`);}
   this.addLog('帳の奥から、新たな足音が迫る。');
  }
  this.addLog(`${this.turn}ターン：${team==='ally'?'自軍':'敵軍'}フェイズ`);this.updateVision();this.checkEnd();
 }
 enemySight(e){const observers=this.living('enemy').filter(v=>(v.group??'default')===(e.group??'default'));return this.living('ally').filter(a=>a.status.exposed||observers.some(v=>this.cells(v).some(p=>this.cells(a).some(q=>this.visibleTo({...v,...p},q)))));}
 enemyStep(e){
  if(e.team!=='enemy'||this.phase!=='enemy'||this.result||e.hp<=0||e.status.paralysis)return;
  const attacks=e.equipped.filter(id=>['attack','debuff'].includes(SKILLS[id]?.kind)&&!this.available(e,id));
  const canHit=(u,t,id)=>SKILLS[id].shape?this.area(u,id,t).some(p=>this.cells(t).some(q=>p.x===q.x&&p.y===q.y)):this.inRange(u,t,id);
  const strike=t=>{const id=[...attacks].reverse().find(id=>canHit(e,t,id));return id?this.act(e,id,t):false;};
  const visible=this.enemySight(e);
  const score=a=>((e.hate[a.id]||0)+1+Math.max(0,5-dist(e,a)*5/e.sight)+Object.keys(a.status).length+Object.values(a.buffs).filter(b=>b.positive||b.negative).length)*(a.equipped.includes('lure')?1.1:1);
  visible.sort((a,b)=>score(b)-score(a)||dist(e,a)-dist(e,b));let target=visible[0];
  if(target){e.active=true;e.lastSeen={x:target.x,y:target.y};e.searchWait=0;}
  if(e.role==='無動型'){
   if(e.selfHeal>0&&e.hp<e.maxHp){this.healUnit(e,Math.min(e.selfHeal,e.maxHp-e.hp));e.ap=0;}else if(target)strike(target);return;
  }
  if(target){
   let dest=null;const {costs}=this.reachable(e,false);
   const choices=[...costs].map(([k,c])=>{const [x,y]=k.split(',').map(Number);return {x,y,c};}).filter(p=>!this.at(p.x,p.y)||this.at(p.x,p.y)===e);
   if(e.role==='回避型')choices.sort((a,b)=>dist(b,target)-dist(a,target)||a.c-b.c);
   else{const field=this.distanceField(target,e);const value=p=>(attacks.some(id=>canHit({...e,...p},target,id))?1000:0)-(field.get(key(p.x,p.y))??10000);choices.sort((a,b)=>value(b)-value(a)||a.c-b.c);}
   dest=choices[0];if(dest&&(dest.x!==e.x||dest.y!==e.y))this.move(e,dest.x,dest.y);
   const victims=this.enemySight(e).filter(t=>attacks.some(id=>canHit(e,t,id))).sort((a,b)=>score(b)-score(a));if(victims[0])strike(victims[0]);
  }else{
   let goal=null;
   if(e.active&&e.lastSeen){if(dist(e,e.lastSeen)===0){e.searchWait++;if(e.searchWait>1)e.active=false;}else goal=e.lastSeen;}
   if(!goal&&!e.active){if(e.role==='待機型')goal=e.origin;else if(e.role==='巡回型'){e.patrol=(e.patrol??0);const points=[e.origin,{x:clamp(e.origin.x-3,1,10),y:e.origin.y},{x:clamp(e.origin.x-3,1,10),y:clamp(e.origin.y+2,1,10)}];goal=points[e.patrol%3];if(dist(e,goal)===0){e.patrol++;goal=points[e.patrol%3];}}}
   const {costs}=this.reachable(e,false);let cells=[...costs.keys()].map(k=>{const [x,y]=k.split(',').map(Number);return {x,y};}).filter(p=>!this.at(p.x,p.y));
   if(goal){const field=this.distanceField(goal,e);cells.sort((a,b)=>(field.get(key(a.x,a.y))??10000)-(field.get(key(b.x,b.y))??10000));}else if(e.role==='徘徊型'||e.role==='回避型')cells=cells.sort((a,b)=>(a.x*13+a.y*7+this.turn*11)%31-(b.x*13+b.y*7+this.turn*11)%31);else cells=[];
   if(cells[0])this.move(e,cells[0].x,cells[0].y);
  }
  e.ap=0;e.mp=0;this.updateVision();this.checkEnd();
 }
 checkEnd(){
  if(this.result)return;
  if(!this.living('ally').length||(this.mission.id===2&&!this.living('ally').some(u=>u.id==='astarthe'))){this.finish(false);return;}
  if(this.mission.id===0&&!this.living('enemy').length)this.finish(true);
  if(this.mission.id===1&&this.stage===1&&!this.living('enemy').some(e=>e.enemyType==='boss'))this.finish(true);
  if(this.mission.id===1&&this.stage===0&&this.living('ally').every(u=>this.map.exit.some(([x,y])=>x===u.x&&y===u.y)))this.pendingExit=true;
 }
 nextMap(rebirth=true){
  if(!this.pendingExit)return false;
  for(const u of this.units.filter(u=>u.team==='ally'&&u.hp===0)){if(rebirth){u.hp=1;u.penalty=true;u.status={};u.waited=false;}else{u.leftBehind=true;this.absent.push(u);}}
  this.stage++;this.pendingExit=false;this.setupMap();this.refreshAreaActions();return true;
 }
 finish(win){
  if(this.result)return;
  const sub=this.mission.id===0?this.pickups>=1:this.mission.id===1?this.pickups>=2:this.kills>=6;
  const score=Math.max(0,1000+this.kills*100-this.turn*25-this.casualties*150),par=this.turn<=this.mission.par;
  const rank=!win?'E':this.absent.length||this.units.some(u=>u.team==='ally'&&u.hp===0)?'D':sub&&par?(this.casualties===0?'S':'A'):par?'B':'C';
  const xp=win?this.mission.xp:this.source.difficulty==='story'?Math.floor(this.mission.xp*.3):0;
  this.result={win,rank,score,sub,turns:this.turn,kills:this.kills,casualties:this.casualties,xp,blood:win?this.mission.reward:0};
 }
 commit(){
  if(!this.result)return null;const c=clone(this.source),r=this.result;c.inventory=clone(this.items);c.weapons=clone(this.weapons);c.questItems=this.quest.filter(id=>ALL_ITEMS[id]?.persistent);c.blood+=r.blood;c.runes=Math.min(9999999,c.runes+this.runes);
  for(const h of c.heroes){const u=[...this.units,...this.absent].find(u=>u.id===h.id);if(u){h.hp=Math.min(u.hp,stats(h).maxHp);h.penalty=u.penalty;addXp(h,r.xp);}else if(h.rest)h.hp=stats(h).maxHp;}
  c.cleared[this.mission.id]={rank:r.rank,turns:r.turns,win:r.win};if(r.win)c.unlocked=Math.max(c.unlocked,Math.min(2,this.mission.id+1));return c;
 }
}
