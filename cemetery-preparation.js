import {stats,recoveryCost,restoreHero,clone} from './engine.js';
import {scriptPages} from './cemetery-script.js';
export const CEMETERY_PARTY=['astarthe','hoshiyomi','umine'];
export class CemeteryPreparation{
 constructor(campaign,{restart=false}={}){
  this.campaign=campaign;
  if(restart||!campaign.cemeteryTutorial||campaign.cemeteryTutorial.status==='complete'){
   const a=campaign.heroes.find(h=>h.id==='astarthe');
   campaign.cemeteryTutorial={status:'preparation',step:'recovery',page:0,injured:a.hp<stats(a).maxHp,formation:{},lessons:[]};
   for(const id of ['hoshiyomi','umine']){const h=campaign.heroes.find(h=>h.id===id);h.hp=stats(h).maxHp;}
  }
  this.state=campaign.cemeteryTutorial;
 }
 hero(){return this.campaign.heroes.find(h=>h.id==='astarthe');}
 pages(){return this.state.step==='recovery'?scriptPages(this.state.injured?0:4,this.state.injured?4:9):this.state.step==='briefing'?scriptPages(9,17):[];}
 message(){const m=this.pages()[this.state.page];if(m?.lesson&&!this.state.lessons.includes(m.lesson))this.state.lessons.push(m.lesson);return m;}
 advance(){if(!this.message())return false;this.state.page++;if(this.state.page>=this.pages().length){this.state.step=this.state.step==='recovery'&&this.state.injured?'healing':this.state.step==='recovery'?'briefing':'placement';this.state.page=0;}return true;}
 cost(){return recoveryCost(this.hero(),true);}
 heal(){
  if(this.state.step!=='healing')return false;
  const h=this.hero(),cost=this.cost();
  // Script-specific shortage fallback: spend all remaining blood, never trap the tutorial.
  if(this.campaign.blood<cost){this.campaign.blood=0;h.hp=stats(h).maxHp;}
  else if(!restoreHero(this.campaign,h.id,false,true))return false;
  this.state.step='briefing';this.state.page=0;return true;
 }
 place(id,slot){
  if(this.state.step!=='placement'||!CEMETERY_PARTY.includes(id)||!Number.isInteger(slot)||slot<0||slot>2)return false;
  const other=Object.keys(this.state.formation).find(k=>this.state.formation[k]===slot),old=this.state.formation[id];
  if(other){if(old===undefined)delete this.state.formation[other];else this.state.formation[other]=old;}
  this.state.formation[id]=slot;return true;
 }
 ready(){return this.state.step==='placement'&&CEMETERY_PARTY.every(id=>Number.isInteger(this.state.formation[id]))&&new Set(Object.values(this.state.formation)).size===3;}
 deployment(){if(!this.ready())return null;const c=clone(this.campaign);c.heroes.forEach(h=>h.rest=!CEMETERY_PARTY.includes(h.id));return c;}
}
