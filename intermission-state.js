import {INTERMISSION_GIFT,INTERMISSION_PAGES} from './intermission-data.js';
import {roadActors} from './intermission-road.js';
import {cemeteryActors} from './intermission-cemetery.js';

export function beginIntermission(campaign){
 campaign.cathedralIntermission={page:0,completed:false};
 return campaign.cathedralIntermission;
}
export function grantIntermissionGift(campaign){
 if(!campaign.weapons.includes(INTERMISSION_GIFT)){campaign.weapons.push(INTERMISSION_GIFT);if(campaign.tutorialLedger)campaign.tutorialLedger.items[INTERMISSION_GIFT]=1;}
}
export function visitIntermissionPage(campaign,page){
 const state=campaign.cathedralIntermission;
 if(!state||state.completed||!Number.isInteger(page)||page<0||page>=INTERMISSION_PAGES.length)return false;
 state.page=page;if(INTERMISSION_PAGES[page].gift)grantIntermissionGift(campaign);return true;
}
export function finishIntermission(campaign){
 const state=campaign.cathedralIntermission;if(!state||state.completed)return false;
 grantIntermissionGift(campaign);state.page=INTERMISSION_PAGES.length-1;state.completed=true;return true;
}

// Stage coordinates are presentation-only and cannot alter battle units or fog.
export function intermissionStaging(index){
 const page=INTERMISSION_PAGES[index],actors={};
 if(page.scene==='cathedral'){
  actors.astarthe={x:7.35,y:5.75,direction:index===14?5:1};
  actors.umine={x:index>=4?9.0:11.2,y:5.75,direction:7};
  if(index>=5)actors.hoshiyomi={x:10.3,y:5.4,direction:7};
 }else if(page.scene==='road'){
  Object.assign(actors,roadActors(index));
 }else{
  Object.assign(actors,cemeteryActors(index));
 }
 return {scene:page.scene,actors,emotes:page.emotes??{},staff:!!page.staff};
}
