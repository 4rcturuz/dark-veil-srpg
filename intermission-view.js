import {drawEventCharacter} from './render.js';
import {intermissionStaging} from './intermission-state.js';
import {CATHEDRAL_CAMERA,CATHEDRAL_DOOR,CATHEDRAL_REAR,CATHEDRAL_ROAD_PATHS,cathedralCameraFrame,pathLength,sampleEventPath} from './intermission-camera.js';
import {roadEntranceActors,roadExitPaths,roadBackgroundFrame} from './intermission-road.js';
import {cemeteryEntrancePaths,cemeteryBackgroundFrame} from './intermission-cemetery.js';

const MOVEMENT_SPEED=.75,STEP_MS=320/MOVEMENT_SPEED;

function loadBackground(src){
 const image=typeof Image==='undefined'?null:new Image();let finish;
 const ready=new Promise(resolve=>finish=resolve);
 if(image){image.onload=()=>finish(true);image.onerror=()=>finish(false);image.src=new URL(src,import.meta.url).href;}else finish(false);
 return {image,ready,cancel:()=>finish(false)};
}

function polygon(c,points,color,stroke){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}}
function line(c,points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();c.lineWidth=1;}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}

export class IntermissionView{
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.stage=null;this.actors={};this.motion=null;this.alive=true;this.page=0;this.started=performance.now();
  this.camera={...CATHEDRAL_CAMERA};this.departure=null;
  const cathedral=loadBackground('assets/backgrounds/cathedral-front.png'),road=loadBackground('assets/backgrounds/forest-road.png'),cemetery=loadBackground('assets/backgrounds/ash-cemetery.png');
  this.background=cathedral.image;this.backgroundReady=cathedral.ready;this.resolveBackground=cathedral.cancel;
  this.roadBackground=road.image;this.roadBackgroundReady=road.ready;this.cancelRoadBackground=road.cancel;
  this.cemeteryBackground=cemetery.image;this.cemeteryBackgroundReady=cemetery.ready;this.cancelCemeteryBackground=cemetery.cancel;
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();this.frame();
 }
 resize(){const r=this.canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;this.dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);}
 destroy(){this.alive=false;cancelAnimationFrame(this.raf);this.observer.disconnect();this.motion?.resolve(false);this.motion=null;this.cancelDeparture();this.resolveBackground(false);this.cancelRoadBackground();this.cancelCemeteryBackground();}
 prepareScene(scene){return scene==='cathedral'?this.backgroundReady:scene==='road'?this.roadBackgroundReady:scene==='cemetery'?this.cemeteryBackgroundReady:Promise.resolve(true);}
 prepareEntrance(){if(this.page===0&&this.actors.astarthe)this.actors.astarthe={...CATHEDRAL_DOOR};}
 prepareRoadEntrance(){if(this.page===24)this.actors=roadEntranceActors();}
 prepareCemeteryEntrance(){
  if(this.page!==43)return;
  this.cemeteryEntering=true;this.actors=Object.fromEntries(Object.entries(cemeteryEntrancePaths()).map(([id,path])=>[id,{...path[0]}]));
 }
 cancelDeparture(){const d=this.departure;if(d){this.departure=null;d.resolve(false);d.fadeResolve(null);}}
 leaveCathedral(){
  if(!this.alive||this.stage?.scene!=='cathedral')return null;
  this.cancelDeparture();this.motion?.resolve(false);this.motion=null;this.stage={...this.stage,emotes:{}};
  const paths=Object.fromEntries(Object.entries(this.actors).map(([id,p])=>[id,[{...p},...CATHEDRAL_ROAD_PATHS[id]]])),duration=Math.max(...Object.values(paths).map(pathLength))*STEP_MS;
  const d={paths,duration,start:performance.now(),fadeAt:duration*.35,fadeSignalled:false};
  const done=new Promise(resolve=>d.resolve=resolve),fading=new Promise(resolve=>d.fadeResolve=resolve);this.departure=d;return {done,fading};
 }
 leaveRoad(){
  if(!this.alive||this.stage?.scene!=='road')return null;
  this.cancelDeparture();this.motion?.resolve(false);this.motion=null;this.stage={...this.stage,emotes:{},staff:false};
  const paths=roadExitPaths(this.actors),duration=Math.max(...Object.values(paths).map(pathLength))*STEP_MS;
  // Start darkening only once the last character has reached the right edge.
  const fadeAt=Math.max(0,12.8-Math.min(...Object.values(this.actors).map(p=>p.x)))*STEP_MS;
  const d={paths,duration,start:performance.now(),fadeAt,fadeSignalled:false,followCamera:false};
  const done=new Promise(resolve=>d.resolve=resolve),fading=new Promise(resolve=>d.fadeResolve=resolve);this.departure=d;return {done,fading};
 }
 updateDeparture(time){
  const d=this.departure;if(!d)return;
  const elapsed=Math.max(0,time-d.start);
  for(const [id,path]of Object.entries(d.paths))this.actors[id]=sampleEventPath(path,elapsed/STEP_MS);
  // Keep Astarthe at the opening composition while panning with her. The crop clamps to the image.
  if(d.followCamera!==false){const a=this.actors.astarthe;this.camera={x:a.x*100+25,y:a.y*100-195};}
  if(!d.fadeSignalled&&elapsed>=d.fadeAt){d.fadeSignalled=true;d.fadeResolve(Math.max(1,d.duration-elapsed));}
  if(elapsed>=d.duration){this.departure=null;d.resolve(true);}
 }
 setPage(index,animate=true){
  this.cancelDeparture();this.motion?.resolve(false);this.motion=null;const next=intermissionStaging(index),changed=this.stage?.scene!==next.scene;
  if(changed)this.camera={...CATHEDRAL_CAMERA};
  const from={};for(const [id,p]of Object.entries(next.actors))from[id]={...(changed?p:this.actors[id]??p)};
  if(index===0&&animate)from.astarthe={...CATHEDRAL_DOOR};
  if(index===5&&animate&&!this.actors.hoshiyomi)from.hoshiyomi={...CATHEDRAL_REAR};
  this.stage=next;this.page=index;this.pageTime=performance.now();
  const paths=index===43&&animate&&this.cemeteryEntering?cemeteryEntrancePaths():null;this.cemeteryEntering=false;
  const duration=animate?Math.max(0,...Object.keys(from).map(id=>(paths?pathLength(paths[id]):Math.hypot(next.actors[id].x-from[id].x,next.actors[id].y-from[id].y))*STEP_MS)):0;
  if(duration<1){this.actors=structuredClone(next.actors);return Promise.resolve(true);}
  this.actors=from;return new Promise(resolve=>this.motion={from,to:next.actors,paths,start:performance.now(),duration,resolve});
 }
 frame(){if(!this.alive)return;this.draw(performance.now());this.raf=requestAnimationFrame(()=>this.frame());}
 updateMotion(time){
  const motion=this.motion;if(!motion)return;
  const t=Math.max(0,Math.min(1,(time-motion.start)/motion.duration));
  for(const [id,to]of Object.entries(motion.to)){
   const from=motion.from[id],path=motion.paths?.[id],distance=Math.max(0,time-motion.start)/STEP_MS;
   this.actors[id]=path?(distance>=pathLength(path)?{...to}:sampleEventPath(path,distance)):{...to,x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t};
  }
  if(t>=1){this.actors=structuredClone(motion.to);this.motion=null;motion.resolve(true);}
 }
 draw(time){
  const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#162d35';c.fillRect(0,0,this.w,this.h);if(!this.stage)return;
  this.updateDeparture(time);
  this.updateMotion(time);
  const scale=Math.min(this.w/1280,this.h/600);c.save();c.translate((this.w-1280*scale)/2,(this.h-600*scale)/2);c.scale(scale,scale);
  c.beginPath();c.rect(0,0,1280,600);c.clip();
  const sky=c.createLinearGradient(0,0,0,600);sky.addColorStop(0,'#263c48');sky.addColorStop(.5,'#82908b');sky.addColorStop(1,'#263f42');c.fillStyle=sky;c.fillRect(0,0,1280,600);
  const cathedral=this.stage.scene==='cathedral';
  if(cathedral){const frame=cathedralCameraFrame(this.camera);c.save();c.scale(frame.scale,frame.scale);c.translate(-frame.sx,-frame.sy);this.cathedral(c);}else if(this.stage.scene==='road')this.forestRoad(c);else this.cemetery(c);
  for(const [id,p]of Object.entries(this.actors).sort((a,b)=>a[1].y-b[1].y)){
   const path=this.motion?.paths?.[id];
   const moving=path?(time-this.motion.start)/STEP_MS<pathLength(path):this.motion&&Math.hypot(this.motion.to[id].x-this.motion.from[id].x,this.motion.to[id].y-this.motion.from[id].y)>.001;
   const walking=moving||!!this.departure,bob=walking?Math.sin(time*MOVEMENT_SPEED/150+(id==='umine'?1:2))*2:0;
   const jump=id==='umine'&&this.page===9?Math.max(0,Math.sin(Math.min(1,(time-this.pageTime)/550)*Math.PI))*28:0;
   c.save();c.translate(p.x*100,p.y*100);c.scale(1.85,1.85);
   drawEventCharacter(c,id,0,0,time,p.direction,(jump-bob)/1.85);
   c.restore();const emote=this.stage.emotes[id];if(emote)this.emote(c,emote,p.x*100,p.y*100-160-jump,time);
  }
  if(cathedral)c.restore();
  if(this.stage.staff)this.staff(c);
  const shade=c.createLinearGradient(0,0,0,600);shade.addColorStop(0,'#07172235');shade.addColorStop(.65,'#07172200');shade.addColorStop(1,'#06182088');c.fillStyle=shade;c.fillRect(0,0,1280,600);c.restore();
 }
 cathedral(c){
  if(this.background?.complete&&this.background.naturalWidth)c.drawImage(this.background,0,0,1672,941);
 }
 forestRoad(c){
  if(!this.roadBackground?.complete||!this.roadBackground.naturalWidth)return;
  const f=roadBackgroundFrame();c.drawImage(this.roadBackground,f.sx,f.sy,f.sw,f.sh,0,0,1280,600);
 }
 cemetery(c){
  if(!this.cemeteryBackground?.complete||!this.cemeteryBackground.naturalWidth)return;
  const f=cemeteryBackgroundFrame();c.drawImage(this.cemeteryBackground,f.sx,f.sy,f.sw,f.sh,0,0,1280,600);
 }
 emote(c,kind,x,y,time){
  c.save();c.translate(x,y+Math.sin(time/270)*2);c.strokeStyle='#eee9d1';c.fillStyle='#eee9d1';c.lineWidth=3;
  if(kind==='flask'){line(c,[[-7,-22],[-7,-10],[-18,12],[-12,21],[12,21],[18,12],[7,-10],[7,-22],[-7,-22]],'#e0e4db',3);polygon(c,[[-12,13],[12,13],[9,17],[-9,17]],'#ac5960');line(c,[[-9,-23],[9,-23]],'#cfba8a',4);}
  else if(kind==='sword'){polygon(c,[[-5,-25],[5,-25],[5,7],[0,15],[-5,7]],'#dce3dc','#8398a6');line(c,[[-13,9],[13,9]],'#d6bc83',4);line(c,[[0,11],[0,25]],'#9d8065',5);}
  else if(kind==='relief'){c.beginPath();c.moveTo(-16,0);c.bezierCurveTo(5,-15,22,4,7,10);c.bezierCurveTo(-3,14,17,19,21,11);c.stroke();}
  else if(kind==='ears'){for(const sign of [-1,1])line(c,[[sign*17,0],[sign*27,-8]],'#ebe4bc',3);}
  else if(kind==='annoyed'){for(const sign of [-1,1]){line(c,[[sign*5,-18],[sign*5,-5],[sign*18,-5]],'#d79c8d',3);line(c,[[sign*5,18],[sign*5,5],[sign*18,5]],'#d79c8d',3);}}
  else{c.font='bold 32px serif';c.textAlign='center';c.fillText(kind==='surprise'?'！':'︙',0,8);}
  c.restore();
 }
 staff(c){
  c.save();c.translate(640,168);oval(c,0,4,232,66,'#142c36ed');c.strokeStyle='#dddfd2';c.lineWidth=7;
  c.beginPath();c.arc(-138,-7,29,.2,Math.PI*1.9);c.stroke();line(c,[[-112,6],[-44,24],[-37,17],[-31,26]],'#d3dbd6',7);
  line(c,[[32,-17],[40,-25],[46,-15],[175,21]],'#d3dbd6',7);
  for(const x of [-153,-137,-121]){line(c,[[x,18],[x,32]],'#d9d4be',2);oval(c,x,34,3,5,'#e0d9c6');}c.restore();
 }
}
