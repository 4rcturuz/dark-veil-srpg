import {CemeteryBattle} from './cemetery.js';
import {CemeteryPreparation,CEMETERY_PARTY} from './cemetery-preparation.js';
import {stats,clone} from './engine.js';
export const unlockCemeteryBoss=(active,password)=>active&&password==='aqnwhjjz';
export function prepareCemeteryDebug(campaign,kind='battle',bossUnlocked=false){
 const c=clone(campaign);delete c.cathedralIntermission;delete c.cemeteryTutorial;
 for(const h of c.heroes)h.hp=stats(h).maxHp;
 if(kind==='injured')c.heroes.find(h=>h.id==='astarthe').hp=Math.floor(stats(c.heroes.find(h=>h.id==='astarthe')).maxHp*.6);
 const p=new CemeteryPreparation(c,{restart:true});
 if(kind==='battle'){p.state.step='placement';p.state.lessons=[13,14,15];CEMETERY_PARTY.forEach((id,i)=>p.place(id,i));return {campaign:c,battle:new CemeteryBattle(c,p.state.formation,{debug:true,bossUnlocked})};}
 return {campaign:c};
}
export function testCemeteryCondition(b,id){
 if(!b?.tutorial2||!b.debug||b.scripted||b.messages.length||b.phase!=='ally'||b.result)throw Error('灰の墓地の自軍操作中に実行してください。');
 const a=b.party()[0];
 if(id==='select')b.selectUnit('umine');
 else if(id==='high'){
  const e=b.units.find(e=>e.id==='cem-g2_prisoner_01');if(!e||!e.hp)throw Error('高台の敵を倒す前に実行してください。');
  a.x=3;a.y=8;a.mp=20;a.waited=false;b.updateVision();b.move(a,3,9);
 }else if(id==='damage'||id==='low'){
  a.hp=b.effective(a,'maxHp');b.hurt(a,id==='low'?Math.floor(a.hp*.6):1,b.living('enemy')[0]);b.resolveTriggers('debug-damage');
 }else if(id==='goal-one'){
  a.x=11;a.y=21;a.mp=10;a.waited=false;b.updateVision();b.move(a,11,22);
 }else if(id==='goal-all'){
  b.party().forEach((u,i)=>{u.x=11+i;u.y=22;});b.updateVision();b.resolveTriggers('movement');
 }else if(id==='defeat-all'){
  for(const e of [...b.living('enemy')])b.hurt(e,e.hp,a);b.resolveTriggers('action');
 }else if(id==='normal-ending'){
  if(b.bossBranch)throw Error('通常分岐はボス解禁前の出撃から確認してください。');
  b.party().forEach((u,i)=>{u.x=11+i;u.y=22;});b.updateVision();b.resolveTriggers('movement');
 }else throw Error('不明な検証条件です。');
 return a;
}
