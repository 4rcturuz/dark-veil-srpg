import {faceIconMarkup} from './face-icons.js';

// Staging uses replaceable geometric scenery until the final event artwork arrives.
export async function playCemeteryScene(action,{battle:b,view:v,fade,banner,sound,alive,caption,cutin}){
 const pan=p=>v.panTo(p),walk=async moves=>{for(const [id,path,direction]of moves)b.sceneMove(id,path,direction);await v.animateMoves();};
 switch(action){
  case 'opening':{
   v.zoom=1.7;v.focus(b.center());await banner('灰の墓地',2600);if(!alive())return;
   const points=[...b.visible].map(k=>{const [x,y]=k.split(',').map(Number);return {x,y};});
   const extremes=[points.reduce((a,p)=>p.x<a.x?p:a),points.reduce((a,p)=>p.y>a.y?p:a),points.reduce((a,p)=>p.x>a.x?p:a)];
   for(const p of extremes){await pan(p);if(!alive())return;}await pan(b.center());break;
  }
  case 'battle-start':b.flow='exploration';b.flags.started=true;for(const u of b.party())delete u.eventDirection;await banner('BATTLE START',1000);break;
  case 'focus-high':await pan(b.units.find(u=>u.id==='umine'));if(alive())await pan(b.highCandidate);break;
  case 'focus-party':await pan(b.center());break;
  case 'clear-stage':await fade(1);if(!alive())return;b.stageClear();v.reset();v.zoom=1.7;v.focus({x:12,y:22});v.draw(performance.now());await fade(0);break;
  case 'look-building':for(const p of [{x:10,y:23},{x:15,y:23},{x:12,y:22}]){await pan(p);if(!alive())return;}break;
  case 'interior':
   await fade(1);if(!alive())return;b.enterInterior();v.reset();v.focus({x:6,y:6});caption('建物の中 · 仮背景');v.draw(performance.now());await fade(0);if(!alive())return;
   await walk([['astarthe',[[4,7],[4,6]],4],['hoshiyomi',[[6,7],[7,7],[8,7]],2],['umine',[[7,7],[7,6],[7,5]],6]]);break;
  case 'backstep':{const u=b.units.find(u=>u.id==='umine');await walk([['umine',[[u.x+1,u.y],[u.x+2,u.y]],u.eventDirection??6]]);break;}
  case 'stone-dark':await fade(1);sound('stone');break;
  case 'treasure':
   sound('blood');caption('終幕一枚絵 · 仮表示');cutin(`<div class="treasure-placeholder" role="img" aria-label="血の澱を発見した3人の仮演出"><div class="treasure-party">${['astarthe','hoshiyomi','umine'].map(id=>`<div class="portrait">${faceIconMarkup(id)}</div>`).join('')}</div><svg viewBox="0 0 180 180" aria-label="血の澱のフラスコ"><path d="M72 15h36v12h-6v45c70 64 43 91-12 91S8 136 78 72V27h-6Z" fill="#c4d2d42a" stroke="#cad7d5" stroke-width="3"/><path d="M50 104q40 13 80 0c39 43 8 54-40 54s-79-11-40-54" fill="#811d34"/><path d="M58 120q-15 18 9 22" fill="none" stroke="#da6377" stroke-width="4"/></svg></div>`);await fade(0);break;
  case 'enter-gate':await walk([['hoshiyomi',[[12,23]],4],['umine',[[13,23]],4]]);if(alive())await walk([['astarthe',[[11,23]],4]]);break;
  case 'statue-shift':sound('stone');b.map.statue.shifting=true;await pan(b.map.statue);break;
  case 'turn-back':b.units.find(u=>u.id==='astarthe').eventDirection=0;await new Promise(r=>setTimeout(r,240));if(alive())b.units.find(u=>u.id==='hoshiyomi').eventDirection=0;break;
  case 'ambush':
   b.map.statue.lungeStart=performance.now();await walk([['astarthe',[[10,23],[10,22],[11,22]],2],['hoshiyomi',[[12,22],[12,21]],0],['umine',[[14,23],[14,22],[13,22]],6]]);
   if(!alive())return;sound('stone');await fade(1,100,'#fff');if(!alive())return;delete b.map.statue.lungeStart;b.map.gate.ruined=true;v.draw(performance.now());await fade(0,250,'#fff');break;
  case 'boss-setup':b.startBoss();await pan(b.center());if(alive())await banner('BATTLE START',1000);break;
  case 'enemy-first':return {enemyFirst:true};
  case 'boss-collapse':{
   const boss=b.units.find(u=>u.id==='cem-adarius');if(boss){await pan(boss);if(!alive())return;sound('stone');b.sceneBlood={x:boss.x,y:boss.y};b.units=b.units.filter(u=>u!==boss);}break;
  }
  case 'blood':sound('blood');break;
  case 'finish':b.finish(true);break;
 }
}
