import {ALL_ITEMS,WEAPONS} from './database.js';
import {Battle,clone,stats,addXp,dist,near,key} from './engine.js';
import {ITEMS,SKILLS,DIRS,TERRAIN} from './data.js';
import {TUTORIAL_MISSION,TUTORIAL_ITEMS,TUTORIAL_ENEMIES,LESSONS,makeTutorialMap} from './tutorial-data.js';
export {LESSONS,TUTORIAL_ITEMS};
export class TutorialBattle extends Battle{
 constructor(campaign){
  const c=clone(campaign);c.heroes.forEach(h=>h.rest=h.id!=='astarthe');const a=c.heroes.find(h=>h.id==='astarthe');a.hp=stats(a).maxHp;a.weapon='素手';a.equipped=['sonar'];
  super(c,0);this.source=clone(campaign);this.tutorial=true;this.items=Object.fromEntries(Object.keys(ITEMS).map(id=>[id,0]));this.quest=[];this.weapons=[];this.runes=0;this.defeated={};this.earnedXp=0;this.lessons=[];this.flags={};this.messages=[];this.retryPending=false;this.preparing=false;this.exitDismissed=false;
  this.log=[];this.hero().pose='prone';this.say('ん……、ここは……？','awakening');this.say('私は一体？');this.say('落ちたんですね……','sunlight');this.say('こうしてはいられません。外に出ましょう');this.areaTitle();this.lesson(1);this.checkpoint=this.snapshot();
 }
 setupMap(){
  this.mission=TUTORIAL_MISSION;this.map=makeTutorialMap(this.stage);this.units=this.units.filter(u=>u.team==='ally');
  const a=this.units[0];[a.x,a.y]=this.map.starts[0];this.seen=new Set();this.visible=new Set();this.known={};this.memory={};this.elevationMemory={};
  for(const [i,spawn]of this.map.enemies.entries()){
   const d=TUTORIAL_ENEMIES[spawn.type],factor=this.source.difficulty==='story'?d.storyFactor:1;
   this.units.push({...clone(d),id:`t-${this.stage}-${i}`,enemyType:d.enemyType,tutorialType:spawn.type,movementBounds:spawn.movementBounds?clone(spawn.movementBounds):null,team:'enemy',title:d.role,x:spawn.x,y:spawn.y,origin:{x:spawn.x,y:spawn.y},hp:Math.floor(d.maxHp*factor),maxHp:Math.floor(d.maxHp*factor),atk:Math.floor(d.atk*factor),mag:Math.floor(d.mag*factor),lv:1,cd:{},uses:{},status:{},buffs:{},hate:{},equipped:[...d.skills],ap:1,mp:d.move,waited:false,active:false,lastMovedTurn:null});
  }
  this.updateVision();
 }
 hero(){return this.units.find(u=>u.team==='ally');}
 say(text,art=null,focus=null){this.messages.push({kind:'dialogue',text,art,focus});}
 system(text,art=null){this.messages.push({kind:'system',text,art});}
 lesson(n){if(this.lessons.includes(n))return;this.lessons.push(n);this.messages.push({kind:'lesson',n,...LESSONS[n]});}
 areaTitle(){this.messages.push({kind:'area',text:this.mission.place.split(' → ')[this.stage],focus:{...this.hero()}});}
 snapshot(){const out={};for(const k of ['stage','turn','phase','units','map','items','quest','weapons','runes','defeated','earnedXp','lessons','flags','messages','casualties','kills','pickups','log','seed','known','memory','elevationMemory'])out[k]=clone(this[k]);out.seen=[...this.seen];return out;}
 retry(){if(!this.checkpoint)return false;const snap=clone(this.checkpoint);for(const [k,v]of Object.entries(snap))this[k]=k==='seen'?new Set(v):v;this.events=[];this.result=null;this.pendingExit=false;this.preparing=false;this.retryPending=false;this.exitDismissed=false;this.updateVision();return true;}
 visibleTo(u,p){return (!u.cardinalSight||u.x===p.x||u.y===p.y)&&super.visibleTo(u,p);}
 moveCost(u,from,to,knowledge=false){
  const bounds=u.movementBounds;if(bounds&&this.cells({...u,...to}).some(p=>p.x<bounds.minX||p.x>bounds.maxX||p.y<bounds.minY||p.y>bounds.maxY))return Infinity;
  if(u.footprint)for(const p of this.cells({...u,...to})){const other=this.at(p.x,p.y);if(!this.inside(p.x,p.y)||!Number.isFinite(TERRAIN[this.tile(p.x,p.y)].cost)||(other&&other!==u))return Infinity;}
  return super.moveCost(u,from,to,knowledge);
 }
 available(u,id){if(u.team==='ally'&&id==='attack'&&!this.flags.attackUnlocked)return '未解放';if(u.team==='ally'&&id==='waltz'&&!this.flags.waltzUnlocked)return '未解放';return super.available(u,id);}
 receiveLoot(u,item){
  if(!u||u.team!=='ally'||u.hp<=0)return false;
  if(ITEMS[item.type]||item.type==='runes'){
   if(!super.receiveLoot(u,item))return false;
   if(ITEMS[item.type]&&this.stage>=1&&!this.lessons.includes(10))this.lesson(10);
   return true;
  }
  if(!TUTORIAL_ITEMS[item.type])return false;
  if(WEAPONS[item.type]?.collectible){const name=WEAPONS[item.type].name;if(this.weapons.includes(name))return false;this.weapons.push(name);}
  else{if(this.quest.includes(item.type))return false;this.quest.push(item.type);}
  this.pickups++;this.announcePickup(u,TUTORIAL_ITEMS[item.type].name,item.type==='brokenStaff'?'brokenStaff':null);
  if(item.type==='brokenStaff'&&!this.flags.staff){
   this.flags.staff=true;this.say('これは流石に……ショックですね','frustrated');this.say('とはいえ、早く外を目指さないと');
   this.say('っ！　何か来る……！','footsteps',{x:6,y:5});this.lesson(3);this.flags.attackUnlocked=true;u.equipped=['attack','sonar'];
   this.say('徒手空拳で……まぁなんとかなるでしょう。還り人は頑丈ですから');
  }
  if(item.type==='cathedralKey'){this.flags.keyFound=true;this.say('鍵、ですね。正面扉の鍵であればいいのですが','key');}
  return true;
 }
 collectItems(u){
  if(u.team!=='ally'||u.hp<=0)return;
  for(const item of this.map.items.filter(i=>!i.taken&&i.x===u.x&&i.y===u.y))if(this.receiveLoot(u,item)){
   item.taken=true;
   if(item.type==='brokenStaff'){this.checkpoint=this.snapshot();this.checkpoint.messages=[{kind:'dialogue',text:'徒手空拳で……まぁなんとかなるでしょう。還り人は頑丈ですから'}];}
  }
 }
 onMove(u,path){
  if(u.team!=='ally'||!path.length||!this.flags)return;
  delete u.eventDirection;
  this.exitDismissed=false;
  if(!this.flags.moved){this.flags.moved=true;this.say('頑丈さは還り人の取り柄です。怪我がないのは幸いでした');this.say('おや…');const staff=this.map.items.find(i=>i.type==='brokenStaff'&&!i.taken);if(staff)this.messages.push({kind:'focus',focus:{x:staff.x,y:staff.y},highlight:{x:staff.x,y:staff.y,type:staff.type},emote:'question'});this.lesson(2);}
  if(path.some(p=>this.tile(p.x,p.y)==='rubble')&&!this.lessons.includes(6))this.lesson(6);
 }
 defeatLoot(u,source){
  if(!this.defeated)return;
  this.defeated[u.name]=(this.defeated[u.name]||0)+1;this.earnedXp+=u.xp||0;
  const firstDrops=(u.drops??[]).filter(d=>d.condition==='tutorial_first'&&this.stage===0&&!this.flags.sword),firstSword=firstDrops.length>0;
  if(firstSword){this.flags.sword=true;this.lesson(5);for(const drop of firstDrops)if(drop.chance===1||this.random()<drop.chance)this.receiveLoot(this.hero(),drop);}
  super.defeatLoot(u,source);
  if(firstSword)this.say('ふぅ……。先に進みましょうか');
 }
 checkEnd(){
  if(!this.flags||this.result||this.preparing)return;const a=this.hero();if(!a||a.hp<=0){this.retryPending=true;return;}
  if(this.stage===0){
   if(this.flags.attackUnlocked&&!this.lessons.includes(4)&&this.living('enemy').some(e=>dist(a,e)===1))this.lesson(4);
   // Flag4 depends on arrival, independently of the item, combat and rubble lessons.
   if(this.map.exit.some(([x,y])=>a.x===x&&a.y===y)&&!this.exitDismissed)this.offerExit();
  }else if(this.stage===1){if(this.map.exit.some(([x,y])=>a.x===x&&a.y===y)&&!this.exitDismissed)this.offerExit();}
  else{
   if(!this.flags.waltzUnlocked&&this.living('enemy').filter(e=>(e.hate[a.id]||0)>=1).length>=2){this.flags.waltzUnlocked=true;if(!a.equipped.includes('waltz'))a.equipped.push('waltz');this.lesson(12);}
   const boss=this.living('enemy').find(e=>e.tutorialType==='gregor');
   if(boss&&this.isVisible(boss)&&!this.flags.bossSeen){this.flags.bossSeen=true;this.say('おっと。大物がいらっしゃいますね',null,{x:boss.x,y:boss.y});this.say('何かを隠している？　……ようですが、素通りさせてはくれなさそうです');}
   const atDoor=this.map.doors.some(p=>near(a,p)<=1);
   if(atDoor&&!this.flags.doorTried&&!this.flags.doorOpen&&!this.quest.includes('cathedralKey')){
    this.flags.doorTried=true;this.say('……そりゃそうですよね','locked');this.say('仕方ありません。聖堂内を探索して鍵を探しましょう');this.say('できるだけ1対1の状況を作りたいですね');this.system('聖堂内を探索し、鍵を見つけろ。');
   }
   if(this.quest.includes('cathedralKey')&&(atDoor||!this.living('enemy').length)&&!this.flags.doorOpen)this.unlockDoor();
   if(this.flags.doorOpen&&this.map.doors.some(p=>near(a,p)<=1)&&!this.exitDismissed)this.offerExit();
  }
 }
 offerExit(){if(this.pendingExit)return;this.pendingExit=true;if(this.stage<2){this.say('ここから下に降りられるようですね');if(this.stage===0)this.lesson(7);}}
 declineExit(){if(!this.pendingExit||this.preparing||this.result)return false;this.pendingExit=false;this.exitDismissed=true;delete this.hero().eventDirection;this.say('まだやり残したことがあるかも……');return true;}
 canAcceptExit(){return !!(this.pendingExit&&!this.preparing&&!this.result&&(this.stage!==0||this.weapons.includes('折れた直剣')));}
 acceptExit(){if(!this.canAcceptExit())return false;this.pendingExit=false;this.checkpoint=null;this.say('急ぎましょう');if(this.stage===2){this.finish(true);return true;}this.preparing=true;return true;}
 move(u,x,y){if(this.preparing)return false;return super.move(u,x,y);}
 equipSword(){if(!this.preparing||!this.weapons.includes('折れた直剣'))return false;const a=this.hero();a.weapon='折れた直剣';const d=stats(a);a.atk=d.atk;a.mag=d.mag;a.range=d.range;return true;}
 preparationHeal(id){const a=this.hero(),item=ITEMS[id];if(!this.preparing||!item?.fraction||!this.items[id]||a.hp>=this.effective(a,'maxHp'))return false;this.items[id]--;a.hp=Math.min(this.effective(a,'maxHp'),a.hp+Math.floor(this.effective(a,'maxHp')*item.fraction));return true;}
 nextMap(){
  if(!this.preparing||(this.stage===0&&this.hero().weapon!=='折れた直剣'))return false;
  this.stage++;this.preparing=false;this.exitDismissed=false;this.setupMap();this.refreshAreaActions();this.events=[];this.areaTitle();
  if(this.stage===1){this.say('見通しが効きません。慎重に進みましょうか');this.lesson(9);}
  else{for(const enemy of this.living('enemy').filter(e=>this.isVisible(e)))this.messages.push({kind:'focus',focus:{x:enemy.x,y:enemy.y}});for(const point of this.sonar())this.messages.push({kind:'focus',focus:point});this.say('数が多い……囲まれると厄介です');this.say('あちらが正面玄関でしょうか。こちらは武器も乏しいですし、出口を目指しましょう',null,{x:5,y:0});}
  this.checkpoint=this.snapshot();return true;
 }
 unlockDoor(){
  if(this.flags.doorOpen||this.flags.doorTransition||!this.quest.includes('cathedralKey'))return false;
  const occupant=this.at(5,1);if(occupant&&occupant!==this.hero())return false;
  this.flags.doorTransition=true;this.messages.push({kind:'door-transition'});return true;
 }
 relocateToDoor(){
  if(!this.flags.doorTransition||this.flags.doorOpen)return false;
  Object.assign(this.hero(),{x:5,y:1,facing:{x:0,y:-1},eventDirection:7});this.updateVision();return true;
 }
 completeDoorTransition(){
  if(!this.flags.doorTransition||this.flags.doorOpen)return false;
  for(const p of this.map.doors)this.map.grid[p.y][p.x]='plain';this.flags.doorOpen=true;this.flags.doorTransition=false;this.quest=this.quest.filter(id=>id!=='cathedralKey');this.updateVision();
  this.system('『聖堂の鍵』を使用した。','unlock');this.say('あら、良かった');this.system('『聖堂の鍵』が失われた。');this.checkEnd();return true;
 }
 enemyStep(e){
  if(this.phase!=='enemy'||e.hp<=0||this.retryPending||this.result||e.status.paralysis||this.stage===0&&!this.flags.staff)return;
  const a=this.hero(),visible=this.enemySight(e).includes(a);
  if(visible){e.hate[a.id]=Math.max(1,e.hate[a.id]||0);e.active=true;e.lastSeen={x:a.x,y:a.y};e.searchWait=0;}
  const available=e.equipped.filter(id=>!this.available(e,id));
  const canHit=(u,id)=>SKILLS[id].shape?this.area(u,id,a).some(p=>p.x===a.x&&p.y===a.y):this.inRange(u,a,id);
  let target=visible?a:e.lastSeen;
  if(!target&&e.role==='巡回型'){
   // A compact X patrol around the marked origin, using valid floor squares only.
   const points=[[0,0],[-1,1],[1,-1],[0,0],[1,1],[-1,-1]].map(([dx,dy])=>({x:e.origin.x+dx,y:e.origin.y+dy})).filter(p=>Number.isFinite(TERRAIN[this.tile(p.x,p.y)].cost));e.patrol??=0;target=points[e.patrol%points.length];if(dist(e,target)===0){e.patrol++;target=points[e.patrol%points.length];}
  }
  if(!target&&e.role==='徘徊型'){const options=DIRS.map(([dx,dy])=>({x:e.x+dx,y:e.y+dy})).filter(p=>Number.isFinite(this.moveCost(e,e,p,false)));target=options[Math.floor(this.random()*options.length)];}
  if(e.role!=='無動型'&&target){
   const choices=[...this.reachable(e,false).costs].map(([k,c])=>{const [x,y]=k.split(',').map(Number);return {x,y,c};}).filter(p=>!this.at(p.x,p.y)||this.at(p.x,p.y)===e);
   const field=this.distanceField(target,e),value=p=>(visible&&available.some(id=>canHit({...e,...p},id))?1000:0)-(field.get(key(p.x,p.y))??10000);
   choices.sort((p,q)=>value(q)-value(p)||p.c-q.c);const best=choices[0];if(best&&(best.x!==e.x||best.y!==e.y))this.move(e,best.x,best.y);
   if(!visible&&e.lastSeen&&dist(e,e.lastSeen)===0&&++e.searchWait>1){e.lastSeen=null;e.active=false;delete e.hate[a.id];}
  }
  if(this.enemySight(e).includes(a)){e.hate[a.id]=Math.max(1,e.hate[a.id]||0);const skill=[...available].reverse().find(id=>canHit(e,id));if(skill)this.act(e,skill,a);}
  e.ap=0;e.mp=0;this.updateVision();this.checkEnd();
 }
 finish(win){if(this.result)return;if(!win){this.retryPending=true;return;}this.result={win:true,rank:'COMPLETE',turns:this.turn,kills:this.kills,casualties:this.casualties,xp:this.earnedXp,runes:this.runes,defeated:clone(this.defeated),items:Object.entries(this.items).filter(([,n])=>n>0).map(([id,count])=>({name:ITEMS[id].name,count})).concat(this.weapons.map(name=>({name,count:1})),this.quest.map(id=>({name:TUTORIAL_ITEMS[id].name,count:1})))};}
 commit(){if(!this.result)return null;const c=clone(this.source),a=this.hero(),h=c.heroes.find(h=>h.id==='astarthe');h.hp=Math.min(a.hp,stats(h).maxHp);h.weapon=a.weapon;addXp(h,this.earnedXp);c.runes=Math.min(9999999,c.runes+this.runes);for(const [id,count]of Object.entries(this.items))c.inventory[id]=Math.min(ITEMS[id].stackLimit,(c.inventory[id]||0)+count);for(const id of this.quest)if(ALL_ITEMS[id]?.persistent&&!c.questItems.includes(id))c.questItems.push(id);for(const weapon of this.weapons)if(!c.weapons.includes(weapon))c.weapons.push(weapon);c.tutorialCompleted=true;delete c.cemeteryTutorial;c.tutorialLedger={turns:this.turn,runes:this.runes,xp:this.earnedXp,xpAwarded:{astarthe:this.earnedXp},defeated:clone(this.defeated),items:Object.fromEntries(this.result.items.map(i=>[i.name,i.count]))};return c;}
 objective(){return this.stage===2&&this.flags.doorTried&&!this.flags.doorOpen&&!this.quest.includes('cathedralKey')?'聖堂内を探索し、鍵を見つけろ。':'聖堂から脱出せよ';}
}
