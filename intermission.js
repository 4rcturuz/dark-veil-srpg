import {formatDialogueElement} from './dialogue-text.js';
import {dialogueBody,textField} from './screen-layout.js';
import {INTERMISSION_PAGES} from './intermission-data.js';
import {visitIntermissionPage,finishIntermission} from './intermission-state.js';
import {IntermissionView} from './intermission-view.js';
import {FACE_ICONS,faceIconMarkup} from './face-icons.js';

export class IntermissionPlayer{
 constructor({root,campaign,onSave,onFinish,createView=canvas=>new IntermissionView(canvas)}){
  this.root=root;this.campaign=campaign;this.onSave=onSave;this.onFinish=onFinish;this.alive=true;this.busy=true;this.generation=0;this.animations=new Set();
  root.innerHTML=`<main class="intermission-app scenario-screen" aria-label="廃墟の聖堂・幕間"><header class="intermission-header"><span class="eyebrow">INTERMISSION</span><span>廃墟の聖堂</span></header><button class="intermission-skip" data-intermission="skip">イベントをスキップ</button><section class="intermission-visual"><canvas id="intermission-canvas" tabindex="0" role="img" aria-label="聖堂を出たアスターテ、海音、星詠みのイベント場面。クリックで次へ。"></canvas><div class="intermission-vignette"></div></section>${textField(dialogueBody({portrait:'<div id="intermission-portrait" class="portrait" role="img" hidden></div>',ids:{speaker:'intermission-speaker',line:'intermission-line'},actions:'<span id="intermission-counter" class="dialogue-counter" aria-label="ページ数"></span><button class="primary" data-intermission="next">次へ</button>'}))}<div id="intermission-fade" aria-hidden="true"></div></main>`;
  this.speaker=root.querySelector('#intermission-speaker');this.portrait=root.querySelector('#intermission-portrait');this.line=root.querySelector('#intermission-line');this.counter=root.querySelector('#intermission-counter');this.nextButton=root.querySelector('[data-intermission="next"]');this.fadeElement=root.querySelector('#intermission-fade');
  this.nextButton.addEventListener('click',()=>this.next());root.querySelector('[data-intermission="skip"]').addEventListener('click',()=>this.skip());
  const canvas=root.querySelector('#intermission-canvas');canvas.addEventListener('click',()=>this.next());this.view=createView(canvas);
  this.ready=this.show(campaign.cathedralIntermission.page,true);
 }
 async fade(opacity,duration=450){
  const el=this.fadeElement;if(!this.alive)return false;
  const animation=el.animate?.([{opacity:Number(el.style.opacity||0)},{opacity}],{duration,fill:'forwards'});
  if(animation){this.animations.add(animation);try{await animation.finished;}catch{return false;}this.animations.delete(animation);if(!this.alive){animation.cancel();return false;}el.style.opacity=String(opacity);animation.cancel();}
  else el.style.opacity=String(opacity);
  return this.alive;
 }
 async show(index,initial=false){
  if(!this.alive)return;const generation=++this.generation,page=INTERMISSION_PAGES[index],changed=initial||this.scene!==page.scene;
  this.busy=true;this.nextButton.disabled=true;this.speaker.textContent='';this.line.textContent='';this.portrait.hidden=true;
  if(changed){
   if(initial)this.fadeElement.style.opacity='1';
   else{
    const departure=this.scene==='cathedral'&&page.scene==='road'?this.view.leaveCathedral?.():this.scene==='road'&&page.scene==='cemetery'?this.view.leaveRoad?.():null;
    if(departure){
     const [walked,dark]=await Promise.all([departure.done,departure.fading.then(duration=>duration===null?false:this.fade(1,duration))]);
     if(!walked||!dark)return;
    }else if(!await this.fade(1))return;
   }
   await this.view.prepareScene?.(page.scene);
  }
  if(!this.alive||generation!==this.generation)return;
  this.scene=page.scene;
  if(changed){await this.view.setPage(index,false);if(!this.alive||generation!==this.generation)return;if(initial&&index===0)this.view.prepareEntrance?.();if(!initial&&index===24)this.view.prepareRoadEntrance?.();if(!initial&&index===43)this.view.prepareCemeteryEntrance?.();this.view.draw(performance.now());if(!await this.fade(0))return;}
  // Reconstruct a saved page without replaying entrance movement; a fresh event walks out of the door.
  const movement=!initial||index===0||page.scene==='road'?this.view.setPage(index,true):Promise.resolve(true);
  // Road dialogue is readable during its walk; the gift is handed over after approaching.
  if(page.scene!=='road'||page.gift)await movement;
  if(!this.alive||generation!==this.generation)return;
  visitIntermissionPage(this.campaign,index);this.onSave();this.index=index;
  this.speaker.textContent=page.speaker;this.speaker.dataset.actor=page.actor;
  this.portrait.hidden=!page.speaker;this.portrait.dataset.actor=page.actor;
  this.portrait.ariaLabel=page.speaker?`${page.speaker}のアイコン${FACE_ICONS[page.actor]?'':'（仮）'}`:'';
  this.portrait.innerHTML=!page.speaker?'':faceIconMarkup(page.actor);
  this.line.textContent=page.speaker?(page.thought?'（':'「')+page.text+(page.thought?'）':'」'):page.text;
  formatDialogueElement(this.line);
  this.line.classList.toggle('thought',!!page.thought);this.line.classList.toggle('lesson-copy',!page.speaker);this.line.classList.toggle('dialogue-line',!!page.speaker);this.counter.textContent=`${index+1} / ${INTERMISSION_PAGES.length}`;
  this.nextButton.textContent=index===INTERMISSION_PAGES.length-1?'イベントを終える':'次へ';
  await movement;if(!this.alive||generation!==this.generation)return;
  this.nextButton.disabled=false;this.busy=false;
 }
 async next(){
  if(!this.alive||this.busy)return;
  if(this.index<INTERMISSION_PAGES.length-1){await this.show(this.index+1);return;}
  this.busy=true;this.nextButton.disabled=true;if(await this.fade(1))this.complete();
 }
 skip(){if(this.alive)this.complete();}
 complete(){
  if(!this.alive)return;const completed=finishIntermission(this.campaign);this.destroy();if(completed){this.onSave();this.onFinish();}
 }
 handleKey(e){
  if(e.repeat||!['Enter',' '].includes(e.key)||['BUTTON','INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  e.preventDefault();this.next();
 }
 destroy(){if(!this.alive)return;this.alive=false;this.generation++;for(const animation of this.animations)animation.cancel();this.animations.clear();this.view.destroy();}
}
