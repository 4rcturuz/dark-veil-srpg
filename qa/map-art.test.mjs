import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {FieldArt,directionFrame} from '../runtime/field-art.js';
import {MapArtPainter,planeTransform,stairDirection} from '../runtime/map-art.js';
import {surfaceMaterial} from '../runtime/map-art-config.js';
import {MapView} from '../render.js';
import {Battle,makeCampaign,key} from '../engine.js';
import {TutorialBattle} from '../tutorial.js';
import {CemeteryBattle} from '../cemetery.js';
import {TERRAIN} from '../data.js';
const manifest=JSON.parse(await readFile(new URL('../assets/field/manifest.json',import.meta.url)));
const images=new Map(manifest.files.map(f=>[f.src,{src:f.src,naturalWidth:f.width,naturalHeight:f.height}]));
const art=new FieldArt(manifest,images);
function context(){const calls=[],stack=[];const c={globalAlpha:1,calls,save(){stack.push(this.globalAlpha);},restore(){assert.ok(stack.length);this.globalAlpha=stack.pop();},drawImage(...args){assert.ok(args.slice(1).every(Number.isFinite));calls.push({image:args[0].src,args:args.slice(1),alpha:this.globalAlpha});},createPattern(img){return img;},measureText(t){return {width:t.length*10};}};for(const n of ['setTransform','clearRect','translate','scale','rotate','transform','beginPath','moveTo','lineTo','closePath','fill','stroke','clip','fillRect','strokeRect','ellipse','arc','bezierCurveTo','fillText','strokeText'])c[n]=(...args)=>{assert.ok(args.filter(x=>typeof x==='number').every(Number.isFinite),n);};return c;}
function reveal(b){for(let y=0;y<b.map.height;y++)for(let x=0;x<b.map.width;x++){const k=key(x,y);b.visible.add(k);b.seen.add(k);b.memory[k]=b.tile(x,y);b.elevationMemory[k]=b.map.elevation[y][x];b.known[k]=true;}}
function view(b){const v=Object.create(MapView.prototype);Object.assign(v,{battle:b,ctx:context(),w:1200,h:800,dpr:1,yaw:0,zoom:1,pan:{x:0,y:0},effects:[],lastEvents:b.events.length,movements:new Map(),itemHighlight:null,getState:()=>({mode:'move',selected:b.units[0],reachable:b.reachable(b.units[0]).costs,area:[],interactive:true}),art:new MapArtPainter(art)});return v;}
globalThis.window={matchMedia:()=>({matches:true})};
const snapshot=b=>JSON.stringify({map:b.map,units:b.units,seed:b.seed,events:b.events,seen:[...b.seen],visible:[...b.visible]});

test('29 supplied images retain original bytes, dimensions metadata and valid atlas bounds',async()=>{
 assert.equal(manifest.files.length,29);
 for(const f of manifest.files){const bytes=await readFile(new URL('../'+f.src,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256,f.src);}
 for(const [id,r] of Object.entries(manifest.regions))for(const [x,y,w,h]of [r.rect,r.contentRect]){const im=images.get(r.src);assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=im.naturalWidth&&y+h<=im.naturalHeight,id);}
});
for(const scenario of ['tutorial0','tutorial1','tutorial2','cemetery','boss','road','canal','chapel','defense'])test(`${scenario}: all eight camera angles render without changing rules, positions or visibility`,()=>{
 const c=makeCampaign();let b;
 if(scenario.startsWith('tutorial')){b=new TutorialBattle(c);b.stage=Number(scenario.at(-1));b.setupMap();}
 else if(['cemetery','boss'].includes(scenario)){b=new CemeteryBattle(c,{}, {debug:true,bossUnlocked:true});if(scenario==='boss'){b.explorationMap=b.map;b.startBoss();}}
 else {b=new Battle(c,scenario==='road'?0:scenario==='defense'?2:1);if(scenario==='chapel'){b.stage=1;b.setupMap();}}
 reveal(b);b.messages=[];const before=snapshot(b),v=view(b);
 for(let i=0;i<8;i++){v.yaw=i*Math.PI/4;v.draw(1000);}
 assert.equal(snapshot(b),before);assert.ok(v.ctx.calls.length>0);
});
test('floor UVs keep the same tile corners at every camera angle and coordinate orientation',()=>{
 for(const invertY of [false,true])for(let i=0;i<8;i++){
  const b=new Battle(makeCampaign());b.map.invertY=invertY;const v=view(b);v.yaw=i*Math.PI/4;
  for(const [x,y]of [[0,0],[1,2],[3,3],[4,5]]){const q=v.groundPolygon(x,y),u=x%4*64,w=y%4*64,m=planeTransform(q,u,w,64,64);
   for(const [j,xx,yy]of [[0,u,w],[1,u+64,w],[2,u+64,w+64],[3,u,w+64]]){assert.ok(Math.abs(m[0]*xx+m[2]*yy+m[4]-q[j][0])<1e-7);assert.ok(Math.abs(m[1]*xx+m[3]*yy+m[5]-q[j][1])<1e-7);}
  }
 }
});
test('dormant body and fixed pedestal remain separate through lunge and awakening',()=>{
 const b=new CemeteryBattle(makeCampaign(),{}, {debug:true,bossUnlocked:true});reveal(b);const v=view(b),p=v.art,center={x:11.5,y:17.5};
 let list=p.scenery(v,0),base=list.find(o=>o.height===32),body=list.find(o=>o.height===128);assert.equal(body.y,center.y);body.fieldDraw(v.ctx);assert.equal(v.ctx.calls.at(-1).args.at(-3),-144);
 b.map.statue.lungeStart=0;list=p.scenery(v,1000);assert.equal(list.find(o=>o.height===32).y,base.y);assert.equal(list.find(o=>o.height===128).y,21);list.find(o=>o.height===128).fieldDraw(v.ctx);assert.equal(v.ctx.calls.at(-1).args.at(-3),-112);
 b.explorationMap=b.map;b.startBoss();reveal(b);list=p.scenery(v,2000);assert.equal(list.filter(o=>o.height===128).length,0);assert.equal(list.find(o=>o.height===32).y,base.y);
 v.draw(2000);assert.ok(v.ctx.calls.some(o=>o.image==='assets/units/adarius/idle-sheet.webp'));assert.ok(!v.ctx.calls.some(o=>o.image?.includes('adarius-awake.svg')));
});
test('unseen scenery is not drawn; remembered dormant statue does not disclose awakening',()=>{
 const b=new CemeteryBattle(makeCampaign(),{}, {debug:true,bossUnlocked:true}),v=view(b);assert.equal(v.art.scenery(v,0).length,0);
 const s=b.map.statue;for(const [x,y]of s.cells){b.seen.add(key(x,y));b.memory[key(x,y)]='dormantStatue';}
 s.dormant=false;const objects=v.art.scenery(v,0);assert.ok(objects.some(o=>o.height===128));assert.ok(objects.every(o=>!o.visible));
});
test('stair direction derives from known lower neighbor, not camera yaw',()=>{
 const b=new Battle(makeCampaign());b.map.grid[4][4]='stairsUp';b.map.grid[4][5]='plain';b.map.elevation[4][4]=1;reveal(b);const v=view(b),d=stairDirection(v,4,4);assert.equal(d.drop,40);
 for(let i=0;i<8;i++){v.yaw=i*Math.PI/4;assert.deepEqual(stairDirection(v,4,4),d);}
});
test('all terrain types render and current bridge remains logical road',()=>{
 const b=new Battle(makeCampaign(),1),v=view(b);reveal(b);const before=snapshot(b);
 for(const t of Object.keys(TERRAIN)){v.art.ground(v.ctx,v,5,5,t,1000);v.art.block(v.ctx,v,5,5,t);}
 assert.equal(surfaceMaterial(b,6,5,'road'),'G07');assert.equal(b.tile(6,5),'road');assert.equal(snapshot(b),before);
});
test('eight body and pedestal directions have matching 32-unit mount and full 128 draw width',()=>{
 for(let i=0;i<8;i++){const c=context();art.drawDormantAdarius(c,i,0,0);assert.equal(c.calls.length,2);assert.equal(c.calls[0].args[1],i*256);assert.equal(c.calls[1].args[1],i*256);assert.equal(c.calls[1].args[5],-144);assert.equal(c.calls[1].args[6],128);}
 for(const inv of [false,true])for(const facing of [{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}])assert.equal(new Set(Array.from({length:8},(_,i)=>directionFrame(facing,i*Math.PI/4,inv))).size,8);
});
