// All external coordinates are lower-left and one-based. Convert only at the file boundary.
const url=new URL('./specs/maps/ash-cemetery.txt',import.meta.url);
async function readMap(){if(url.protocol==='file:')return (await import('node:fs/promises')).readFile(url,'utf8');const r=await fetch(url);if(!r.ok)throw Error('灰の墓地のマップを読み込めません');return r.text();}
export function parseCemetery(source){
 const sections={header:[]};let s='header';
 for(const raw of source.split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith(';'))continue;if(/^\[.+\]$/.test(line)){s=line.slice(1,-1);sections[s]=[];}else sections[s].push(line);}
 const terrain={F:'plain','%':'rubble','#':'wall','$':'stairsUp','.':'pit'},size=sections.header.find(x=>x.startsWith('size:')).match(/(\d+)x(\d+)/),width=+size[1],height=+size[2];
 const grid=sections.terrain.map(r=>[...r].map(c=>terrain[c])).reverse(),elevation=sections.height.map(r=>r.split(/\s+/).map(Number)).reverse(),markers=sections.markers.slice().reverse();
 for(const layer of [grid,elevation,markers])if(layer.length!==height||layer.some(r=>r.length!==width))throw Error('灰の墓地のレイヤー寸法不一致');
 if(grid.flat().some(x=>!x)||elevation.flat().some(x=>!Number.isInteger(x)))throw Error('未知の地形・高度');
 const starts=[],enemies=[],exit=[],placed=new Set();let statue;
 for(const row of sections.units){
  const [loc,...rest]=row.split(';'),symbol=loc[0],attrs=Object.fromEntries(rest.map(v=>v.trim().split('='))),coords=[...loc.split('=')[0].matchAll(/\((\d+),(\d+)\)/g)].map(m=>[+m[1]-1,+m[2]-1]);
  for(const [x,y] of coords){const k=x+','+y;if(markers[y]?.[x]!==symbol||placed.has(k)||!['plain','stairsUp','rubble'].includes(grid[y][x]))throw Error('配置不整合: '+row);placed.add(k);}
  const [x,y]=coords[0],n=attrs.movement_bounds?.match(/\d+/g)?.map(v=>+v-1),movementBounds=n?{minX:n[0],minY:n[1],maxX:n[2],maxY:n[3]}:null;
  if(movementBounds&&coords.some(([x,y])=>x<n[0]||x>n[2]||y<n[1]||y>n[3]))throw Error('担当区域外: '+row);
  if(symbol==='P')starts[Number(attrs.slot)-1]=coords[0];else if(symbol==='T')exit.push(coords[0]);else{
   const unit={id:attrs.spawn_id,type:attrs.enemy_id,x,y,group:attrs.group,movementBounds,difficulties:attrs.difficulty.split('|')};
   if(symbol==='B')statue={...unit,cells:coords,dormant:true};else enemies.push(unit);
  }
 }
 if(placed.size!==markers.reduce((n,r)=>n+[...r].filter(c=>c!=='.').length,0))throw Error('座標宣言のないマーカー');
 return {width,height,grid,elevation,starts,enemies,exit,statue,items:[],doors:[],invertY:true,provisional:false};
}
const source=parseCemetery(await readMap());
export const CEMETERY_LEGEND={clearPositions:{astarthe:[12,23],hoshiyomi:[13,23],umine:[14,23]},battlePositions:{astarthe:[12,23],hoshiyomi:[13,22],umine:[14,23]}};
export const CEMETERY_MISSION={id:'cemetery',name:'灰の墓地',place:'灰の墓地',subtitle:'ASHEN CEMETERY',objective:'『灰の墓地』最深部を目指せ。',sub:'全ての敵ユニットを撃破せよ。',turns:Infinity,stages:1,story:[]};
export function makeCemeteryMap(difficulty='normal'){const m=structuredClone(source);m.enemies=m.enemies.filter(e=>e.difficulties.includes(difficulty==='story'?'light':difficulty));m.gate={cells:structuredClone(m.exit),ruined:false};return m;}
export function makeCemeteryInterior(){
 const n=12,grid=Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>x===0||y===0||x===n-1||y===n-1?'wall':'plain'));
 for(const x of [3,8])for(const y of [3,7])grid[y][x]='rubble';
 return {width:n,height:n,grid,elevation:Array.from({length:n},()=>Array(n).fill(0)),starts:[[4,8],[6,8],[7,8]],exit:[],items:[],doors:[],provisional:true};
}
