import {TERRAIN,STATUS_NAMES} from './data.js';
import {key} from './engine.js';
import {drawCharacterSprite,directionFrame} from './character-sprites.js';
import {sampleMovement} from './movement.js';
export const ELEVATION_STEP_HEIGHT=40; // One elevation level equals one impassable wall.
const containsPoint=(pts,x,y)=>{let sign=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],cross=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);if(Math.abs(cross)<1e-7)continue;const side=Math.sign(cross);if(sign&&sign!==side)return false;sign=side;}return !!sign;};
const poly=(c,pts,fill,stroke=null)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}};
const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
export function unitStatusLabels(u){
 if(u.hp<=0)return [];
 const labels=Object.entries(u.status).filter(([id])=>STATUS_NAMES[id]).map(([id,s])=>`${STATUS_NAMES[id]} ${id==='doom'?s.stacks.length:s.turns}`);
 for(const [id,b]of Object.entries(u.buffs))if(b.negative)labels.push(`${{move:'移動',atk:'攻撃',def:'防御',mag:'神秘',res:'抗秘',speed:'迅速'}[id]??id}低下 ${b.negative.turns}`);
 return labels;
}
export const EMOTE_SYMBOLS={awakening:'☾',sunlight:'！',question:'？',frustrated:'〰',footsteps:'♪',key:'⚿',locked:'〰',unlock:'⚿',tears:'💧',surprise:'！',idea:'💡',ears:'♪'};
export const HP_FEEDBACK={damage:'#ff9a3d',heal:'#6fe394',duration:1400};
export function overheadLabels(u,state={}){
 if(u.hp<=0)return [];
 if(state.interactive!==false)return unitStatusLabels(u);
 return state.emote?.unitId===u.id&&EMOTE_SYMBOLS[state.emote.kind]?[EMOTE_SYMBOLS[state.emote.kind]]:[];
}
function line(c,pts,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.lineWidth=1;}
const cemeteryArt=new Map();
function drawScenery(c,name,x,y,gate=false){
 if(typeof Image==='undefined')return false;
 let img=cemeteryArt.get(name);if(!img){img=new Image();img.src=new URL('./assets/cemetery/'+name+'.svg',import.meta.url).href;cemeteryArt.set(name,img);}
 if(!img.complete||!img.naturalWidth)return false;
 if(gate)c.drawImage(img,x-62.5,y-86,125,99);else c.drawImage(img,x-46,y-91,91,101);return true;
}
function sprite(c,u,x,y,selected,time,direction=0,battleUi=true,elevation=0,effectiveMaxHp=null){
 c.save();c.translate(x,y);const dead=u.hp<=0,spent=u.ap===0&&u.mp===0;
 if(dead)c.globalAlpha=.3;else if(spent&&u.team==='ally')c.globalAlpha=.65;
 if(u.footprint&&!u.heavy)c.scale(1.55,1.35);if(u.pose==='prone'){c.rotate(-Math.PI/2);c.scale(.8,.8);}
 ellipse(c,0,0,16,7,'#06181cb0');if(battleUi){ellipse(c,0,-1,14,6,u.team==='ally'?'#7bc6d043':'#d67d7043');
 c.strokeStyle=selected?'#e5ce93':u.team==='ally'?'#9dd7d9':'#d68d84';c.lineWidth=selected?2:1;c.beginPath();c.ellipse(0,-1,15+(selected?Math.sin(time/250):0),6,0,0,Math.PI*2);c.stroke();c.lineWidth=1;}
 if(elevation)c.translate(0,-elevation); // Event bob/jump moves the body; its shadow stays on the ground.
 if(u.heavy&&drawScenery(c,'adarius-awake',0,0)||drawCharacterSprite(c,u.id,direction,u.form)||u.id==='hoshiyomi'){
  // Rings and status UI are independent of the supplied character art.
 }else if(u.team==='enemy'){
  if(u.enemyType==='beast'){
   poly(c,[[-14,-9],[-8,-22],[5,-26],[14,-15],[10,-6]],'#3b3437','#b89686');poly(c,[[-9,-20],[-13,-34],[-2,-28],[7,-32],[14,-28],[11,-15]],'#7c6864','#c0a497');
   poly(c,[[-12,-31],[-10,-40],[-5,-30]],'#60525b');poly(c,[[6,-32],[13,-39],[11,-27]],'#60525b');line(c,[[-7,-24],[-2,-23]],'#f3bb96',2);line(c,[[4,-24],[9,-25]],'#f3bb96',2);line(c,[[-10,-8],[-13,-2]],'#938783',4);line(c,[[8,-9],[12,-3]],'#938783',4);
  }else if(u.enemyType==='shade'){
   poly(c,[[-13,-4],[-9,-32],[0,-40],[11,-30],[16,-1],[2,-7],[-7,-1]],'#5c5270','#a49bb5');ellipse(c,0,-28,6,8,'#1c2334');line(c,[[-3,-29],[3,-29]],'#b2c4e4',2);line(c,[[13,-8],[17,-38]],'#a6a1b2',2);ellipse(c,17,-40,3,4,'#a6bfd3');
  }else{
   poly(c,[[-11,-3],[-10,-25],[8,-26],[12,-2]],u.enemyType==='boss'?'#73526a':'#6a5b53','#af9e8b');ellipse(c,0,-32,8,10,'#b1a38d');poly(c,[[-8,-34],[0,-44],[8,-34],[6,-24],[-6,-24]],'#5c5962','#c6b29b');line(c,[[-5,-31],[5,-31]],'#edbc96',2);line(c,[[-6,-3],[-7,0]],'#b5a38c',4);line(c,[[6,-3],[8,0]],'#b5a38c',4);
   if(u.enemyType==='archer'){c.strokeStyle='#c7a88a';c.lineWidth=2;c.beginPath();c.arc(8,-20,15,-1.3,1.3);c.stroke();line(c,[[12,-35],[12,-5]],'#dfc9a3');}else{line(c,[[16,-4],[16,-35]],'#b7ad99',3);poly(c,[[12,-34],[16,-48],[20,-34]],'#c3b8a4');}
   if(u.enemyType==='boss'){poly(c,[[-9,-43],[-9,-52],[-3,-47],[0,-55],[4,-47],[10,-51],[8,-41]],'#d0af7a');ellipse(c,0,-49,2,2,'#edcab1');}
  }
 }else if(u.id==='astarthe'){
  line(c,[[-6,-4],[-6,-1]],'#d5d5c6',4);line(c,[[6,-4],[7,-1]],'#d5d5c6',4);
  poly(c,[[-7,-27],[7,-27],[14,-4],[0,-6],[-13,-3]],'#344e6f','#b0c3c5');poly(c,[[-5,-24],[4,-24],[7,-7],[-7,-6]],'#c3d2d5');
  c.strokeStyle='#dce0d8';c.lineWidth=4;c.beginPath();c.moveTo(10,-8);c.bezierCurveTo(24,-5,24,-19,18,-20);c.stroke();c.lineWidth=1;
  ellipse(c,0,-33,9,10,'#eee9db');poly(c,[[-9,-33],[-9,-40],[-5,-44],[5,-44],[10,-38],[8,-26],[5,-34],[1,-32],[-3,-36],[-7,-26]],'#e1e7df','#c1d1d0');poly(c,[[-9,-40],[-10,-51],[-3,-44]],'#e8eee5');poly(c,[[3,-44],[10,-50],[10,-39]],'#e8eee5');
  ellipse(c,-3,-32,1.4,2,'#688fa5');ellipse(c,4,-32,1.4,2,'#688fa5');if(u.weapon==='素手'){ellipse(c,12,-19,3,3,'#eee9db');ellipse(c,-12,-19,3,3,'#eee9db');}else if(u.weapon==='折れた直剣'){line(c,[[12,-10],[17,-29]],'#d5dad6',3);line(c,[[10,-16],[19,-13]],'#b8a273',2);}else{line(c,[[12,-5],[19,-48]],'#baac87',2);c.strokeStyle='#d7ddd3';c.lineWidth=3;c.beginPath();c.arc(11,-44,16,Math.PI*1.12,Math.PI*1.9);c.stroke();c.lineWidth=1;}ellipse(c,0,-25,2,2,'#c5b277');
 }else if(u.id==='umine'){
  poly(c,[[-7,-25],[8,-25],[14,-2],[-13,-2]],'#527a84','#adc8bf');poly(c,[[-5,-23],[4,-23],[7,-4],[-8,-4]],'#a4b8bd');ellipse(c,0,-32,8,9,'#d8c7bb');poly(c,[[-9,-32],[-9,-20],[-5,-23],[-5,-35],[5,-35],[6,-20],[10,-24],[9,-34]],'#665b65');poly(c,[[-17,-35],[15,-35],[5,-45],[-2,-59],[-8,-44]],'#344456','#a1b4b7');line(c,[[-8,-41],[7,-41]],'#9ec3bf',3);line(c,[[15,-1],[18,-40]],'#baa986',2);ellipse(c,18,-42,4,6,'#a5ded8');ellipse(c,18,-43,2,3,'#effcf1');
 }else if(u.id==='orion'){
  poly(c,[[-12,-26],[12,-26],[15,-6],[-15,-6]],'#737f7d','#c4c2a6');poly(c,[[-12,-26],[0,-32],[12,-26],[5,-17],[-5,-17]],'#c2c5b0');ellipse(c,0,-35,9,10,'#a3aca6');poly(c,[[-9,-36],[0,-46],[9,-36],[7,-26],[-7,-26]],'#7b8d8e','#c7ccba');line(c,[[-6,-34],[6,-34]],'#172f39',3);line(c,[[0,-44],[0,-27]],'#c9c3a4',2);
  for(const sx of [-1,1]){const xx=sx*13;poly(c,[[xx-7,-28],[xx+7,-29],[xx+8,-6],[xx,-1],[xx-8,-7]],'#4a676c','#d2c39f');line(c,[[xx,-25],[xx,-6]],'#c9b987',2);line(c,[[xx-4,-16],[xx+4,-16]],'#c9b987',2);}line(c,[[-6,-4],[-6,0]],'#a7b6ad',4);line(c,[[6,-4],[6,0]],'#a7b6ad',4);
 }else{
  poly(c,[[-9,-28],[8,-28],[13,-3],[-13,-3]],'#6d6b88','#b7bcd0');poly(c,[[-7,-27],[7,-27],[6,-15],[-6,-15]],'#ccd1cf','#70858e');line(c,[[-6,-13],[-7,-1]],'#bcc7c5',5);line(c,[[6,-13],[8,-1]],'#bcc7c5',5);ellipse(c,0,-35,8,10,'#bec6c8');poly(c,[[-8,-39],[0,-45],[8,-39],[7,-31],[-7,-31]],'#e0e0d0');line(c,[[-5,-35],[5,-35]],'#3e5261',2);poly(c,[[-1,-45],[3,-54],[9,-56],[6,-47]],'#a4b1c2');line(c,[[14,-4],[20,-35]],'#bbbdc6',3);poly(c,[[16,-35],[23,-52],[23,-33]],'#e5e4d0');line(c,[[13,-32],[25,-29]],'#cab989',3);
 }
 if(u.eventSword){line(c,[[19,-15],[31,-58]],'#e4e6dc',4);line(c,[[16,-25],[29,-20]],'#c8b27d',3);}
 if(battleUi&&!dead){const ratio=Math.min(1,u.hp/(effectiveMaxHp??u.maxHp*(u.status.feral?1.5:1)));c.fillStyle='#0a1b24';c.fillRect(-16,6,32,4);c.fillStyle=ratio<.3?'#e5a393':u.team==='ally'?'#a5d3b6':'#d89f8c';c.fillRect(-15,7,30*ratio,2);if(u.team==='ally'&&u.ap){ellipse(c,20,-10,2.4,2.4,'#e4d5a3');}}
 c.restore();
}
export function drawEventCharacter(c,id,x,y,time,direction=0,elevation=0){
 sprite(c,{id,team:'ally',hp:1,maxHp:1,ap:1,mp:1,status:{},weapon:'折れた直剣'},x,y,false,time,direction,false,elevation);
}
function convexHull(points){
 const sorted=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const half=points=>{const h=[];for(const p of points){while(h.length>1&&cross(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}return h;};
 return [...half(sorted).slice(0,-1),...half([...sorted].reverse()).slice(0,-1)];
}
function polygonsOverlap(a,b){
 for(const shape of [a,b])for(let i=0;i<shape.length;i++){
  const p=shape[i],q=shape[(i+1)%shape.length],axis=[p[1]-q[1],q[0]-p[0]],project=points=>points.map(v=>v[0]*axis[0]+v[1]*axis[1]),pa=project(a),pb=project(b);
  if(Math.max(...pa)<=Math.min(...pb)+.01||Math.max(...pb)<=Math.min(...pa)+.01)return false;
 }
 return true;
}
export class MapView{
 constructor(canvas,battle,getState,onHover,onClick){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.battle=battle;this.getState=getState;this.yaw=0;this.zoom=1;this.pan={x:0,y:0};this.focusElevation=0;this.hover=null;this.alive=true;this.effects=[];this.lastEvents=battle.events.length;this.movements=new Map();this.motionWaiters=[];this.itemHighlight=null;
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
  canvas.addEventListener('mousemove',e=>{const p=this.pick(e);this.hover=p;onHover(p);});canvas.addEventListener('mouseleave',()=>{this.hover=null;onHover(null);});canvas.addEventListener('click',e=>onClick(this.pick(e)));
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.setZoom(e.deltaY<0?.12:-.12);},{passive:false});canvas.addEventListener('contextmenu',e=>e.preventDefault());
  this.resize();this.frame();
 }
 resize(){const r=this.canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;this.dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);}
 destroy(){this.alive=false;cancelAnimationFrame(this.raf);this.resizeObserver.disconnect();this.movements.clear();this.resolveMotionWaiters();this.cancelCameraPan();}
 setZoom(delta){this.zoom=Math.max(.65,Math.min(2,this.zoom+delta));}
 reset(){this.cancelCameraPan();this.yaw=0;this.zoom=1;this.pan={x:0,y:0};this.focusElevation=0;}
 // Rotate only the ground plane; sprites and vertical block edges stay upright.
 iso(x,y){
  const yy=this.battle.map.invertY?this.battle.map.height-1-y:y,c=Math.cos(this.yaw),s=Math.sin(this.yaw),rx=x*c-yy*s,ry=x*s+yy*c;
  return {x:(rx-ry)*29,y:(rx+ry)*14.5};
 }
 unproject(px,py){const rx=(px/29+py/14.5)/2,ry=(py/14.5-px/29)/2,c=Math.cos(this.yaw),s=Math.sin(this.yaw),x=rx*c+ry*s,yy=-rx*s+ry*c;return {x,y:this.battle.map.invertY?this.battle.map.height-1-yy:yy};}
 // Geometry uses only visible or remembered elevations; unknown cells remain a flat fog surface.
 tileElevation(x,y){
  const b=this.battle;if(!b.inside(x,y))return 0;
  return b.elevationAt?b.elevationAt({x,y},true)??0:b.map.elevation?.[y]?.[x]??0;
 }
 surfaceElevation(x,y){
  const x0=Math.floor(x),y0=Math.floor(y),tx=x-x0,ty=y-y0,h=(dx,dy)=>this.tileElevation(x0+dx,y0+dy);
  return (h(0,0)*(1-tx)+h(1,0)*tx)*(1-ty)+(h(0,1)*(1-tx)+h(1,1)*tx)*ty;
 }
 surface(x,y,elevation=this.surfaceElevation(x,y)){const p=this.iso(x,y);return {x:p.x,y:p.y-elevation*ELEVATION_STEP_HEIGHT};}
 elevationBounds(){let min=0,max=0;for(let y=0;y<this.battle.map.height;y++)for(let x=0;x<this.battle.map.width;x++){const h=this.tileElevation(x,y);min=Math.min(min,h);max=Math.max(max,h);}return {min,max};}
 transform(){
  const m=this.battle.map,span=m.width+m.height,{min,max}=this.elevationBounds(),fit=Math.min((this.w-40)/(span*29+24),(this.h-65)/(span*14.5+42+(max-min)*ELEVATION_STEP_HEIGHT));
  this.scale=Math.max(.15,fit)*this.zoom;const center=this.surface((m.width-1)/2,(m.height-1)/2,(min+max)/2);
  this.ox=this.w/2-center.x*this.scale+this.pan.x;this.oy=this.h/2-center.y*this.scale+this.pan.y;
 }
 point(x,y,elevation){const p=this.surface(x,y,elevation);return {x:this.ox+p.x*this.scale,y:this.oy+p.y*this.scale};}
 focus(p){this.transform();const elevation=p.elevation??this.surfaceElevation(p.x,p.y),q=this.point(p.x,p.y,elevation);this.pan.x+=this.w/2-q.x;this.pan.y+=this.h/2-q.y;this.focusElevation=elevation;}
 cameraAnchor(){this.transform();const elevation=this.focusElevation??0;return {...this.unproject((this.w/2-this.ox)/this.scale,(this.h/2-this.oy)/this.scale+elevation*ELEVATION_STEP_HEIGHT),elevation};}
 cancelCameraPan(){const track=this.cameraTrack;this.cameraTrack=null;track?.resolve(false);}
 panTo(p){
  this.cancelCameraPan();this.transform();
  const from=this.cameraAnchor(),duration=Math.hypot(p.x-from.x,p.y-from.y)*((this.battle.tutorial||this.battle.tutorial2)?320:240);
  if(duration<1){this.focus(p);return Promise.resolve(true);}
  return new Promise(resolve=>{this.cameraTrack={from,to:{x:p.x,y:p.y,elevation:p.elevation??this.surfaceElevation(p.x,p.y)},time:performance.now(),duration,resolve};});
 }
 updateCamera(time){
  const t=this.cameraTrack;if(!t)return;
  const progress=time>=t.time+t.duration?1:Math.max(0,Math.min(1,(time-t.time)/t.duration));this.focus({x:t.from.x+(t.to.x-t.from.x)*progress,y:t.from.y+(t.to.y-t.from.y)*progress,elevation:t.from.elevation+(t.to.elevation-t.from.elevation)*progress});
  if(progress===1){this.cameraTrack=null;t.resolve(true);}
 }
 rotate(steps){
  this.cancelCameraPan();
  this.transform();const anchor=this.cameraAnchor();
  this.yaw=((Math.round(this.yaw/(Math.PI/4))+steps)%8+8)%8*Math.PI/4;this.focus(anchor);
 }
 panBy(x,y){this.cancelCameraPan();this.pan.x+=x;this.pan.y+=y;}
 terrainTiles(){const tiles=[];for(let y=0;y<this.battle.map.height;y++)for(let x=0;x<this.battle.map.width;x++)tiles.push({x,y,depth:this.iso(x,y).y});return tiles.sort((a,b)=>a.depth-b.depth);}
 pick(e){
  this.transform();const r=this.canvas.getBoundingClientRect(),px=(e.clientX-r.left-this.ox)/this.scale,py=(e.clientY-r.top-this.oy)/this.scale;
  const state=this.getState?.()??{},shapes=this.protectedShapes(state),bottom=this.elevationBounds().min;let fallback=null;
  // Resolve overlapping raised surfaces in their actual painter order; a cliff is not a destination behind it.
  for(const {x,y}of this.terrainTiles().reverse()){
   const p=this.surface(x,y),faces=this.cliffFaces(x,y,bottom),top=this.groundPolygon(x,y),hit=pts=>containsPoint(pts,px-p.x,py-p.y);
   const opaque=this.terrainOpacity(x,y,faces,shapes)===1,ownTarget=state.reachable?.has(key(x,y))||state.area?.some(p=>p.x===x&&p.y===y)||(state.selected?.x===x&&state.selected?.y===y);
   if(hit(top)){if(opaque||ownTarget)return {x,y};fallback??={x,y};}
   if(opaque&&faces.some(f=>hit(f.points)))return {x,y};
  }
  return fallback;
 }
 cliffFaces(x,y,bottom=this.elevationBounds().min){
  const h=this.tileElevation(x,y),corners=this.groundPolygon(x,y),neighbors=[[0,-1],[1,0],[0,1],[-1,0]],faces=[];
  for(let i=0;i<4;i++){
   const j=(i+1)%4,a=corners[i],b=corners[j],[dx,dy]=neighbors[i],neighbor=this.battle.inside(x+dx,y+dy)?this.tileElevation(x+dx,y+dy):bottom,levels=h-neighbor;
   if(levels<=0||(a[1]+b[1])/2<=.001)continue;
   const drop=levels*ELEVATION_STEP_HEIGHT;
   faces.push({i,levels,points:[a,b,[b[0],b[1]+drop],[a[0],a[1]+drop]]});
  }
  return faces;
 }
 terrainOpacity(x,y,faces,shapes){
  if(!faces.length)return 1;
  const p=this.surface(x,y),hull=convexHull([...this.groundPolygon(x,y),...faces.flatMap(f=>f.points)].map(([dx,dy])=>[p.x+dx,p.y+dy])),depth=this.iso(x,y).y;
  return shapes.some(s=>depth>s.depth+.01&&polygonsOverlap(hull,s.points))?.28:1;
 }
 drawCliffs(c,faces,visible,seen){
  for(const f of faces){
   poly(c,f.points,visible?(f.i%2?'#3f5359':'#536263'):seen?'#1b2b34':'#10242c',visible?'#a8b8ad77':'#59747622');
   const [a,b]=f.points;for(let level=1;level<f.levels&&level<64;level++)line(c,[[a[0],a[1]+level*ELEVATION_STEP_HEIGHT],[b[0],b[1]+level*ELEVATION_STEP_HEIGHT]],visible?'#a8b8ad44':'#59747616');
  }
 }
 groundPolygon(x,y,r=.5){const center=this.iso(x,y);return [[-r,-r],[r,-r],[r,r],[-r,r]].map(([dx,dy])=>{const p=this.iso(x+dx,y+dy);return [p.x-center.x,p.y-center.y];});}
 protectedShapes(st,time=performance.now()){
  const shapes=[],u=st.selected;
  if(!u||u.team!=='ally'||u.hp<=0)return shapes;
  const p=this.movingPosition(u,time);
  shapes.push({depth:this.iso(this.movingPose(u,time).x,this.movingPose(u,time).y).y,points:[[p.x-24,p.y-74],[p.x+24,p.y-74],[p.x+24,p.y+9],[p.x-24,p.y+9]]});
  const cells=new Set((st.area??[]).filter(p=>this.battle.visible.has(key(p.x,p.y))).map(p=>key(p.x,p.y)));
  if(st.mode==='move')for(const k of (st.reachable??new Map()).keys())cells.add(k);
  for(const k of cells){const [x,y]=k.split(',').map(Number),p=this.surface(x,y);shapes.push({depth:this.iso(x,y).y,points:this.groundPolygon(x,y).map(([dx,dy])=>[p.x+dx,p.y+dy])});}
  return shapes;
 }
 blockHeight(t){return t==='door'?48:t==='shrub'?38:t==='rubble'?14:ELEVATION_STEP_HEIGHT;}
 blockOpacity(x,y,shapes){
  const p=this.surface(x,y),height=this.blockHeight(this.battle.tile(x,y)),base=this.groundPolygon(x,y,.44).map(([dx,dy])=>[p.x+dx,p.y+dy]);
  const hull=convexHull([...base,...base.map(([x,y])=>[x,y-height])]);
  return shapes.some(s=>this.iso(x,y).y>s.depth+.01&&polygonsOverlap(hull,s.points))?.28:1;
 }
 drawBlock(c,x,y,t){
  const base=this.groundPolygon(x,y,.43),h=this.blockHeight(t),top=base.map(([x,y])=>[x,y-h]);
  const faces=base.map((p,i)=>({i,depth:(p[1]+base[(i+1)%4][1])/2})).sort((a,b)=>a.depth-b.depth);
  for(const {i,depth}of faces)if(depth>=-.01){const j=(i+1)%4;poly(c,[base[i],base[j],top[j],top[i]],t==='door'?'#584c43':i%2?'#3f5359':'#536263','#93a09a66');}
  poly(c,top,t==='door'?'#8e7957':t==='crack'?'#8c8576':'#81908a','#b5b9a388');
  if(t==='crack')line(c,[[0,-h+3],[-7,-h/2],[3,-h/2+4],[-5,-3]],'#192f38',2);
  if(t==='door'){line(c,[[0,-h],[0,0]],'#b49b70',2);ellipse(c,4,-20,2,3,'#ddc784');}
 }
 highlightItem(item,focus=true){this.itemHighlight={x:item.x,y:item.y,type:item.type};if(focus)this.focus(item);}
 currentHighlight(){const h=this.itemHighlight;return h&&this.battle.map.items.some(i=>i.x===h.x&&i.y===h.y&&i.type===h.type&&!i.taken)?h:null;}
 ingestEvents(time){
  while(this.lastEvents<this.battle.events.length){
   const e=this.battle.events[this.lastEvents++],u=[...this.battle.units,...(this.battle.cinematicActors??[])].find(u=>u.id===e.id);if(!u)continue;
   if(e.type==='move'&&e.path?.length){
    const prior=this.movements.get(e.id);
    if(prior&&!sampleMovement(prior,time).done)prior.points.push(...e.path);
    else this.movements.set(e.id,{points:[e.from,...e.path],time,step:(this.battle.tutorial||this.battle.tutorial2)?320:240});
   }else if(['damage','heal','miss','skill'].includes(e.type)&&this.battle.isVisible(u)){
    // Reserve separate rows for concurrent changes to the same unit.
    const used=new Set(this.effects.filter(f=>f.id===e.id&&['damage','heal'].includes(f.type)&&time-f.time<HP_FEEDBACK.duration).map(f=>f.lane));
    let lane=0;while(used.has(lane))lane++;
    this.effects.push({...e,x:u.x,y:u.y,time,lane});
   }
  }
 }
 movingPose(u,time){const track=this.movements.get(u.id);return track?sampleMovement(track,time):{x:u.x,y:u.y,facing:u.facing};}
 movingPosition(u,time){const p=this.movingPose(u,time);return this.surface(p.x,p.y);}
 resolveMotionWaiters(){for(const resolve of this.motionWaiters??[])resolve();this.motionWaiters=[];}
 finishMoves(time){for(const [id,track]of this.movements)if(sampleMovement(track,time).done)this.movements.delete(id);if(!this.movements.size)this.resolveMotionWaiters();}
 async animateMoves(){
  this.ingestEvents(performance.now());
  // Movement is essential information, including under reduced-motion settings.
  if(this.movements.size)await new Promise(resolve=>this.motionWaiters.push(resolve));
 }

 drawHpFeedback(time,objects){
  const c=this.ctx;
  for(const e of this.effects){
   if(!['damage','heal'].includes(e.type))continue;
   // Use the same visible, interpolated chip position as the unit renderer.
   const object=objects.find(o=>o.u?.id===e.id);if(!object)continue;
   const {u,p}=object,age=Math.max(0,time-e.time),text=`${e.type==='heal'?'+':'−'}${e.value}`;
   c.save();c.font='bold 20px sans-serif';c.textBaseline='middle';c.textAlign='left';
   c.globalAlpha=Math.min(1,Math.max(0,(HP_FEEDBACK.duration-age)/400));
   const center=this.ox+p.x*this.scale,gap=(u.footprint?62:40)*this.scale+8,width=c.measureText(text)?.width??text.length*12;
   let x=center+gap;if(x+width>this.w-6){x=center-gap;c.textAlign='right';}
   const y=this.oy+(p.y-(u.footprint?43:32))*this.scale-(e.lane??0)*24-Math.min(12,age/70);
   c.lineJoin='round';c.lineWidth=4;c.strokeStyle='#102029';c.fillStyle=HP_FEEDBACK[e.type];
   c.strokeText(text,x,y);c.fillText(text,x,y);c.restore();
  }
 }

 frame(){if(!this.alive)return;const time=performance.now();this.draw(time);this.finishMoves(time);this.raf=requestAnimationFrame(()=>this.frame());}
 draw(time){
  const c=this.ctx,b=this.battle,st=this.getState();this.updateCamera(time);this.transform();this.ingestEvents(time);c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.w,this.h);
  c.save();c.translate(this.ox,this.oy);c.scale(this.scale,this.scale);
  ellipse(c,0,180,340,165,'#071b2444');
  const tiles=this.terrainTiles(),bottom=this.elevationBounds().min,protectedShapes=this.protectedShapes(st,time),objects=[...tiles];
  for(const [object,gate] of [[b.map.gate,true],[b.map.statue,false]]){if(!object||!gate&&!object.dormant)continue;
   const cells=object.cells,visible=cells.some(([x,y])=>b.visible.has(key(x,y)));
   if(!visible&&!cells.some(([x,y])=>b.seen.has(key(x,y))))continue;
   const x=cells.reduce((a,p)=>a+p[0],0)/cells.length,y=cells.reduce((a,p)=>a+p[1],0)/cells.length+(object.lungeStart==null?0:Math.min(3.5,Math.max(0,(time-object.lungeStart)/240))),p=this.surface(x,y);
   objects.push({art:gate?(object.ruined?'gate-ruined':'gate'):'adarius-dormant',gate,p,visible,wiggle:object.shifting?Math.sin(time/70):0,depth:Math.max(...cells.map(([cx,cy])=>this.iso(cx,cy).y))+.01});
  }
  const warning=new Set((b.telegraph?.cells??[]).map(p=>key(p.x,p.y)));
  for(const u of [...b.units,...(b.cinematicActors??[])]){const pose=this.movingPose(u,time),p=this.surface(pose.x+(u.heavy ? .5 : 0),pose.y+(u.heavy ? .5 : 0)),visible=this.movements.has(u.id)&&u.team==='enemy'?b.cells({...u,x:Math.round(pose.x),y:Math.round(pose.y)}).some(p=>b.visible.has(key(p.x,p.y))):(b.cinematicActors?.includes(u)||b.isVisible(u));if(visible)objects.push({u,pose,p,depth:this.iso(pose.x+(u.heavy ? .5 : 0),pose.y+(u.heavy ? .5 : 0)).y+.02});}
  objects.sort((a,b)=>a.depth-b.depth||Number(!!a.u)-Number(!!b.u));
  const reachable=st.reachable??new Map(),area=st.area??[],areaSet=new Set(area.map(p=>key(p.x,p.y)));
  for(const object of objects){
   if(object.art){c.save();c.globalAlpha=object.visible?(object.gate ? .85 : 1):.4;drawScenery(c,object.art,object.p.x+object.wiggle,object.p.y,object.gate);c.restore();continue;}
   if(object.u){const {u,pose,p}=object,direction=st.interactive===false&&Number.isInteger(u.eventDirection)?u.eventDirection:directionFrame(pose.facing,this.yaw,b.map.invertY);sprite(c,u,p.x,p.y,u.id===st.selected?.id,time,direction,!b.scripted,0,b.effective(u,'maxHp'));continue;}
   const {x,y}=object;
   const k=key(x,y),visible=b.visible.has(k),seen=b.seen.has(k),t=b.tile(x,y),d=TERRAIN[t],px=this.surface(x,y).x,py=this.surface(x,y).y;
   c.save();c.translate(px,py);const diamond=this.groundPolygon(x,y),faces=this.cliffFaces(x,y,bottom);
   c.globalAlpha=this.terrainOpacity(x,y,faces,protectedShapes);this.drawCliffs(c,faces,visible,seen);

   poly(c,diamond,visible?d.color:seen?'#20333b':'#142a33',visible?'#c4c9b218':'#59747616');
   if(visible){
    const variation=((x*19+y*31)%11)/110;c.fillStyle=`rgba(0,0,0,${variation})`;c.beginPath();diamond.forEach(([xx,yy],i)=>i?c.lineTo(xx,yy):c.moveTo(xx,yy));c.closePath();c.fill();
    if(t==='road'||t==='plain'||t==='sound'){line(c,[[-14,-6],[-2,0],[-10,6]],'#b9c0ae30');line(c,[[10,-8],[5,-2],[19,4]],'#35484350');if(t==='sound'){line(c,[[-15,2],[0,-6],[14,1],[0,9]],'#c8c3a4',1);}}
    if(['grass','shrub','mud'].includes(t)){for(let j=0;j<4;j++){const xx=(x*17+y*13+j*11)%35-17,yy=(x+y+j*4)%12-6;line(c,[[xx-2,yy],[xx,yy-4],[xx+1,yy]],t==='mud'?'#8c807330':'#a1b49145');}}
    if(t==='water'||t==='poison'||t==='ice'||t==='lava'){for(let j=0;j<3;j++){const xx=-14+j*10,yy=2-j*2;line(c,[[xx-4,yy],[xx+4,yy+2]],t==='water'?'#8cb9be60':t==='ice'?'#cfede2a0':t==='lava'?'#efb678a0':'#9a81a980',1);}if(t==='water')line(c,[[0,-2],[3,1],[7,-1]],'#aacfd360');}
    if(t==='thorn'){for(let j=0;j<4;j++)poly(c,[[j*7-12,4],[j*7-10,-5],[j*7-7,5]],'#b6b8ac');}
    if(t==='charge'){line(c,[[-15,0],[-3,-2],[-7,4],[9,0],[14,1]],'#ddc8e3',2);}
    if(b.sceneBlood?.x===x&&b.sceneBlood?.y===y)ellipse(c,0,0,18,8,'#641c31');
    if(t==='pit')poly(c,[[0,-11],[23,0],[0,11],[-23,0]],'#0b1d28');
    if(b.map.exit.some(([ex,ey])=>ex===x&&ey===y)){poly(c,[[0,-10],[20,0],[0,10],[-20,0]],'#d4c58d33','#d4c58d');c.fillStyle='#e8d9a6';c.font='13px serif';c.textAlign='center';c.fillText('◇',0,4);}
   }
   c.globalAlpha=1;
   if(reachable.has(k)&&st.selected?.team==='ally'&&st.mode==='move'&&k!==key(st.selected.x,st.selected.y)){poly(c,diamond,'#4797d9eb','#b7e0ff');}
   if(areaSet.has(k)&&visible)poly(c,diamond,['tideBlessing','waltz','bastion','guidance'].includes(st.mode)?'#5ea984eb':'#d66d57eb','#ffe0c7');
   if(visible&&st.danger){if(st.danger.now.has(k))poly(c,diamond,'#c34c49bf','#ffc1a4');else if(st.danger.after.has(k))poly(c,diamond,'#aa41455e','#ce837e');}
   if(visible&&warning.has(k)){poly(c,diamond,'#ec8732af','#ffe5a3');c.save();c.beginPath();diamond.forEach(([xx,yy],i)=>i?c.lineTo(xx,yy):c.moveTo(xx,yy));c.closePath();c.clip();for(let v=-42;v<43;v+=8)line(c,[[v-12,16],[v+12,-16]],'#ffe6adb0',2);c.restore();}
   if(this.hover?.x===x&&this.hover?.y===y){poly(c,diamond,'#dbc89918','#efdb9c');}
   c.restore();
   if(!visible)continue;
   c.save();c.translate(px,py);
   c.save();if(['wall','crack','door','shrub','rubble'].includes(t))c.globalAlpha=this.blockOpacity(x,y,protectedShapes);
   if(['wall','crack','door'].includes(t))this.drawBlock(c,x,y,t);
   if(t==='stairsDown'||t==='stairsUp'){for(let i=0;i<5;i++){const yy=-8+i*4,down=t==='stairsDown';poly(c,[[-18,yy],[1,yy-8],[20,yy],[1,yy+8]],down?`hsl(205,12%,${40-i*5}%)`:`hsl(205,12%,${20+i*6}%)`,'#b4b6a166');}c.fillStyle='#e3d3a9';c.font='12px serif';c.textAlign='center';c.fillText(t==='stairsDown'?'↓':'↑',0,-18);}
   if(t==='shrub')for(let j=0;j<3;j++){const xx=(j-1)*10,yy=j===1?-6:2;line(c,[[xx,yy],[xx,yy-19]],'#706e55',3);poly(c,[[xx-13,yy-8],[xx-6,yy-19],[xx-9,yy-19],[xx,yy-36],[xx+9,yy-18],[xx+6,yy-18],[xx+13,yy-8]],j%2?'#3b5d52':'#48695a','#a3b59c20');}
   if(t==='rubble'){poly(c,[[-18,2],[-18,-6],[-8,-11],[0,-6],[0,3],[-8,8]],'#87948a','#b2bb9c44');poly(c,[[3,3],[2,-5],[11,-10],[19,-4],[19,3],[11,7]],'#6f7c75');}
   c.restore();
   const item=b.map.items.find(i=>!i.taken&&i.x===x&&i.y===y);if(item){ellipse(c,0,-3,11,5,'#e8d39335');poly(c,[[-7,-3],[-7,-12],[0,-16],[7,-12],[7,-3],[0,1]],'#a6905c','#edd39c');line(c,[[-7,-9],[0,-5],[7,-9]],'#efcf8c');}
   c.restore();
  }
  const highlight=this.currentHighlight();
  if(highlight){const p=this.surface(highlight.x,highlight.y);c.save();c.translate(p.x,p.y);c.lineWidth=2;poly(c,this.groundPolygon(highlight.x,highlight.y),'#e4c46a55','#ffe2a0');ellipse(c,0,-3,15,7,'#ffe7a455');c.restore();}

  for(const p of b.sonar()){const q=this.surface(p.x,p.y),px=q.x,py=q.y;c.strokeStyle='#d5bd8644';c.beginPath();c.ellipse(px,py,18,9,0,0,Math.PI*2);c.stroke();c.font='bold 17px Georgia';c.fillStyle='#dcc799';c.textAlign='center';c.fillText('?',px,py-10);}
  if(st.path)for(const p of st.path){const q=this.surface(p.x,p.y);ellipse(c,q.x,q.y,2.5,1.6,'#eedeb5');}
  this.effects=this.effects.filter(e=>time-e.time<(['damage','heal'].includes(e.type)?HP_FEEDBACK.duration:1100));
  for(const e of this.effects){if(['damage','heal'].includes(e.type))continue;const age=time-e.time,p=this.surface(e.x,e.y);c.globalAlpha=1-age/1100;if(e.type==='skill'){c.strokeStyle='#d7c68c';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y,15+age/35,7+age/70,0,0,Math.PI*2);c.stroke();c.lineWidth=1;}else{c.font='bold 18px Georgia';c.textAlign='center';c.fillStyle='#ede4c8';c.strokeStyle='#12252a';c.lineWidth=3;c.strokeText('MISS',p.x,p.y-55-age/30);c.fillText('MISS',p.x,p.y-55-age/30);c.lineWidth=1;}c.globalAlpha=1;}
  c.restore();
  this.drawHpFeedback(time,objects);
  // Screen-sized labels stay readable at every zoom and render above obstacles.
  for(const {u,p}of objects.filter(o=>o.u)){
   const labels=overheadLabels(u,st);if(!labels.length)continue;
   const emote=st.interactive===false;
   c.save();c.font=emote?'bold 24px sans-serif':'bold 12px sans-serif';c.textAlign='center';c.textBaseline='middle';
   const x=this.ox+p.x*this.scale,bottom=this.oy+(p.y-(u.footprint?92:75))*this.scale-(emote?22:14);
   labels.forEach((text,i)=>{const width=(c.measureText(text)?.width??text.length*12)+12,y=bottom-(labels.length-1-i)*19;
    const h=emote?34:18;c.fillStyle='#14202cf2';c.fillRect(x-width/2,y-h/2,width,h);c.strokeStyle='#d3bb94';c.lineWidth=1;c.strokeRect(x-width/2,y-h/2,width,h);c.fillStyle=emote?'#e7edf2':'#fff0cf';c.fillText(text,x,y);
   });c.restore();
  }
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){for(let i=0;i<15;i++){const xx=((i*127+time*.007)%this.w),yy=(i*79+Math.sin(time/5000+i)*15)%this.h;ellipse(c,xx,yy,.8,.8,`rgba(196,211,184,${.15+Math.sin(i+time/2000)*.1})`);}}
 }
}
export function drawMinimap(canvas,b){
 if(!canvas)return;const c=canvas.getContext('2d'),unit=10;canvas.width=b.map.width*unit;canvas.height=b.map.height*unit;const py=y=>(b.map.invertY?b.map.height-1-y:y)*unit;
 c.fillStyle='#0b2028';c.fillRect(0,0,canvas.width,canvas.height);
 for(let y=0;y<b.map.height;y++)for(let x=0;x<b.map.width;x++){const k=key(x,y);if(b.seen.has(k)){c.fillStyle=TERRAIN[b.memory[k]||'plain'].color;c.globalAlpha=b.visible.has(k)?1:.45;c.fillRect(x*unit+1,py(y)+1,8,8);c.globalAlpha=1;}}
 for(const [x,y]of b.map.exit)if(b.seen.has(key(x,y))){c.strokeStyle='#f7df99';c.strokeRect(x*unit+1,py(y)+1,8,8);}
 for(const p of b.map.doors||[])if(b.seen.has(key(p.x,p.y))){c.fillStyle='#dfc78a';c.fillRect(p.x*unit+2,py(p.y)+2,6,6);}
 for(const i of b.map.items)if(!i.taken&&b.seen.has(key(i.x,i.y))){c.fillStyle='#e6cb86';c.fillRect(i.x*unit+3,py(i.y)+3,4,4);}
 for(const u of b.living())if(b.isVisible(u))for(const p of b.cells(u)){c.fillStyle=u.team==='ally'?'#b7e5de':'#e59f8c';c.fillRect(p.x*unit+2,py(p.y)+2,6,6);}
}
