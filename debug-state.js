import {Battle,clone,makeCampaign,stats} from './engine.js';
import {TutorialBattle} from './tutorial.js';
import {ITEMS,MISSIONS,STATUS_NAMES,TERRAIN} from './data.js';
import {INTERMISSION_PAGES} from './intermission-data.js';
import {createElevation} from './elevation.js';

// A disposable campaign copy. The live campaign is never handed to debug actions.
export class DebugSession{
 constructor(){this.active=false;this.original=null;}
 start(campaign,context={}){
  if(this.active)throw Error('デバッグはすでに開始しています。');
  this.original={campaign,context:clone(context)};this.active=true;
  const copy=clone(campaign??makeCampaign());copy.autoSave=false;return copy;
 }
 end(){const original=this.original;this.active=false;this.original=null;return original;}
}
function integer(value,min,max,label){
 if(value===''||value==null||!Number.isInteger(Number(value))||Number(value)<min||Number(value)>max)throw Error(`${label}は${min}〜${max}の整数で入力してください。`);
 return Number(value);
}
export function createDebugBattle(campaign,kind,index){
 index=integer(index,0,2,'マップ');
 if(!['tutorial','mission'].includes(kind))throw Error('不明なマップです。');
 const c=clone(campaign);c.autoSave=false;delete c.cathedralIntermission;
 c.heroes.forEach(h=>{h.hp=stats(h).maxHp;h.rest=false;});
 const b=kind==='tutorial'?new TutorialBattle(c):new Battle(c,MISSIONS[index].id);
 b.debug=true;
 if(kind==='tutorial'&&index>0){
  const a=b.hero();delete a.pose;
  b.flags={moved:true,staff:true,attackUnlocked:true,sword:true};b.quest=['brokenStaff'];b.weapons=['折れた直剣'];b.lessons=[1,2,3,4,5,6,7,8];
  a.weapon='折れた直剣';const d=stats(a);a.atk=d.atk;a.mag=d.mag;a.range=d.range;a.equipped=['attack','sonar'];
  for(let stage=1;stage<=index;stage++){b.messages=[];b.preparing=true;b.nextMap();}
  b.checkpoint=b.snapshot();
 }
 return b;
}
export function setDebugIntermission(campaign,page){
 page=integer(page,1,INTERMISSION_PAGES.length,'ページ');
 campaign.tutorialCompleted=true;campaign.cathedralIntermission={page:page-1,completed:false};
}
export function canEditDebugBattle(b){return !!(b?.debug&&b.phase==='ally'&&!b.result&&!b.pendingExit&&!b.preparing&&!b.retryPending&&!b.messages.length);}
function editable(b){if(!canEditDebugBattle(b))throw Error('自軍の操作が可能になってから変更してください。');}
function unit(b,id){const u=b.units.find(u=>u.id===id);if(!u)throw Error('ユニットが見つかりません。');return u;}
export function debugRecover(b,kind){
 editable(b);
 if(!['hp','actions','cooldowns','status'].includes(kind))throw Error('不明な操作です。');
 for(const u of b.units.filter(u=>u.team==='ally')){
  if(kind==='hp')u.hp=b.effective(u,'maxHp');
  if(kind==='cooldowns'){u.cd={};u.uses={};}
  if(kind==='status'){u.status={};u.buffs={};u.hp=Math.min(u.hp,b.effective(u,'maxHp'));}
 }
 if(kind==='actions')b.refreshAreaActions();
 b.updateVision();
}
export function debugSetHp(b,id,value){editable(b);const u=unit(b,id);u.hp=integer(value,1,b.effective(u,'maxHp'),'HP');b.updateVision();}
export function debugElevation(b,x,y,value){
 editable(b);x=integer(x,1,b.map.width,'X')-1;y=integer(y,1,b.map.height,'Y')-1;
 const height=integer(value,-99,99,'高さ');b.map.elevation??=createElevation(b.map.width,b.map.height);
 b.map.elevation[y][x]=height;b.updateVision();
}
export function debugTeleport(b,id,x,y,trigger=false){
 editable(b);const u=unit(b,id);if(u.hp<=0)throw Error('戦闘不能ユニットは先に回復してください。');
 x=integer(x,1,b.map.width,'X')-1;y=integer(y,1,b.map.height,'Y')-1;
 const bounds=u.movementBounds;
 for(const p of b.cells({...u,x,y})){
  const occupant=b.at(p.x,p.y);
  if(!b.inside(p.x,p.y)||!Number.isFinite(TERRAIN[b.tile(p.x,p.y)].cost))throw Error('通行できない地形です。');
  if(occupant&&occupant!==u)throw Error('別のユニットが配置されています。');
  if(bounds&&(p.x<bounds.minX||p.x>bounds.maxX||p.y<bounds.minY||p.y>bounds.maxY))throw Error('この敵の移動可能範囲外です。');
 }
 Object.assign(u,{x,y});b.updateVision();
 // Explicit arrival test: no path traversal, movement cost, terrain damage or RNG.
 if(trigger){b.onMove?.(u,[{x,y}]);b.collectItems(u);b.checkEnd();}
 return u;
}
export function debugStatus(b,id,status,turns){
 editable(b);const u=unit(b,id);if(u.hp<=0)throw Error('戦闘不能ユニットには付与できません。');
 if(!Object.hasOwn(STATUS_NAMES,status))throw Error('不明な状態異常です。');
 turns=integer(turns,1,99,'残りターン');
 if(!b.setStatus(u,status,turns,u.team))throw Error('耐性により付与できません。');
 u.mp=Math.min(u.mp,b.movementLimit(u));b.updateVision();b.checkEnd();
}
export function debugItem(target,id,value){
 if(!Object.hasOwn(ITEMS,id))throw Error('不明な消費アイテムです。');
 target[id]=integer(value,0,ITEMS[id].stackLimit,'所持数');
}
export function debugCurrency(target,key,value){
 if(!['blood','runes'].includes(key))throw Error('不明な通貨です。');target[key]=integer(value,0,9999999,'所持数');
}
export function debugTutorialAction(b,action){
 editable(b);if(!b.tutorial)throw Error('チュートリアル専用の操作です。');
 if(action==='rubble')b.lessons=b.lessons.filter(n=>n!==6);
 else if(action==='skills'){b.flags.attackUnlocked=true;b.flags.waltzUnlocked=true;const a=b.hero();for(const id of ['attack','waltz'])if(!a.equipped.includes(id))a.equipped.push(id);}
 else throw Error('不明な操作です。');
}
export function debugReport(campaign,battle,screen){
 const b=['battle','tutorial-prep'].includes(screen)?battle:null;
 return {type:'DarkVeil-debug-report',version:'0.25',screen,campaign:clone(campaign),battle:b?{
  tutorial:!!b.tutorial,tutorial2:!!b.tutorial2,flow:b.flow,triggerHistory:clone(b.triggerHistory??[]),pendingDamage:[...(b.pendingDamage??[])],mission:b.mission.name,stage:b.stage+1,turn:b.turn,phase:b.phase,seed:b.seed,
  coordinates:'0-based (メニュー表示は1-based)',units:clone(b.units),map:clone(b.map),flags:clone(b.flags??{}),lessons:clone(b.lessons??[]),
  items:clone(b.items),quest:clone(b.quest??[]),weapons:clone(b.weapons??[]),runes:b.runes,
  pendingExit:!!b.pendingExit,preparing:!!b.preparing,retryPending:!!b.retryPending,result:clone(b.result??null),messages:clone(b.messages),log:[...b.log]
 }:null};
}
