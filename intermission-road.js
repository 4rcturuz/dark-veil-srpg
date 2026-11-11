// Road staging uses the 1280×600 visual field; one stage unit is 100 display pixels.
// Dialogue pages share a continuous walk, with pauses for the broken staff and weapon handoff.
// Shared marks are key beats, never per-dialogue destinations.
export const ROAD_SPEED=.6; // stage units/second (60 px/s before viewport scaling)
export const ROAD_STEP_MS=1000/ROAD_SPEED;
export function roadBeat(index){return index<=25?'approach':index<=27?'staff':index<40?'walk':'gift';}
export function roadActors(index,x=index<=27?3.6:index<40?6.2:9.8){
 const whisper=index>=31&&index<=33,gift=index>=40;
 return {
  astarthe:{x,y:3.65,direction:index===26||index===27||index===35||gift?6:2},
  umine:{x:x-1.4,y:3.85,direction:whisper?6:2},
  hoshiyomi:{x:x-(gift?0.8:2.8),y:gift?3.3:3.55,direction:2}
 };
}
// Time continues across ordinary page changes; reading cannot move actors out of frame.
export class RoadWalk{
 constructor(actors,index,time){this.actors=actors;this.index=index;this.lastTime=time;this.moving=false;}
 setPage(index,time){this.update(time);this.index=index;this.applyFacing();}
 applyFacing(){const poses=roadActors(this.index,this.actors.astarthe.x);for(const [id,p]of Object.entries(this.actors))p.direction=poses[id].direction;}
 update(time){
  const dt=Math.max(0,time-this.lastTime)/1000;this.lastTime=time;
  const beat=roadBeat(this.index),limit=beat==='approach'?4.2:9.8;
  const dx=['approach','walk'].includes(beat)?Math.min(Math.max(0,limit-this.actors.astarthe.x),dt*ROAD_SPEED):0;
  this.moving=dx>0;
  for(const p of Object.values(this.actors))p.x+=dx;
  this.applyFacing();if(this.ready&&this.actors.hoshiyomi.x>=.4){this.ready(true);this.ready=null;}return this.actors;
 }
}
export function roadEntranceActors(){
 return Object.fromEntries(Object.entries(roadActors(24,3.6)).map(([id,p])=>[id,{...p,x:p.x-4.4}]));
}
export function roadExitPaths(actors){
 const distance=13.8-Math.min(...Object.values(actors).map(p=>p.x));
 return Object.fromEntries(Object.entries(actors).map(([id,p])=>[id,[{...p},{...p,x:p.x+distance,direction:2}]]));
}
export function roadBackgroundFrame(){
 const sw=1672,sh=sw*600/1280;
 return {sx:0,sy:(941-sh)/2,sw,sh};
}
