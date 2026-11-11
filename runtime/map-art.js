import {FieldArt,directionFrame} from './field-art.js';
import {surfaceMaterial,rubbleAppearance,faceMaterial,mapTheme} from './map-art-config.js';

let loading;
export function loadMapArt(){
  if(typeof Image==='undefined')return Promise.resolve(null);
  return loading??=FieldArt.load().catch(error=>{console.warn('Map artwork unavailable; using geometric fallback.',error);return null;});
}
const K=(x,y)=>`${x},${y}`;
const mod=(n,d)=>(n%d+d)%d;
const path=(c,p)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();};
const fill=(c,p,color)=>{path(c,p);c.fillStyle=color;c.fill();};
const edges=[[0,-1],[1,0],[0,1],[-1,0]];

// Orthographic mapping: texture pixels belong to a world plane, never to the screen.
export function planeTransform(q,u=0,v=0,w=256,h=256){
  const a=(q[1][0]-q[0][0])/w,b=(q[1][1]-q[0][1])/w,c=(q[3][0]-q[0][0])/h,d=(q[3][1]-q[0][1])/h;
  return [a,b,c,d,q[0][0]-a*u-c*v,q[0][1]-b*u-d*v];
}
export function stairDirection(view,x,y){
  const h=view.tileElevation(x,y),b=view.battle;
  const available=edges.map(([dx,dy])=>({dx,dy,h:view.tileElevation(x+dx,y+dy),t:b.memory?.[K(x+dx,y+dy)]??b.tile(x+dx,y+dy),known:b.visible.has(K(x+dx,y+dy))||b.seen.has(K(x+dx,y+dy))}))
    .filter(p=>b.inside(x+p.dx,y+p.dy)&&p.known&&!['wall','crack','door','pit','dormantStatue'].includes(p.t)).sort((a,b)=>a.h-b.h);
  const low=available.find(p=>p.h<h);
  return low?{x:low.dx,y:low.dy,drop:Math.min(1,h-low.h)*40}:{x:0,y:view.battle.map.invertY?-1:1,drop:8};
}
export class MapArtPainter{
  constructor(art){this.art=art;this.patterns=new WeakMap();}
  texture(c,id,q,uv=[0,0,256,256],shade=null){
    let patterns=this.patterns.get(c);if(!patterns){patterns=new Map();this.patterns.set(c,patterns);}
    if(!patterns.has(id))patterns.set(id,this.art.pattern(c,id));
    const [u,v,w,h]=uv,m=planeTransform(q,u,v,w,h);
    if(Math.abs(m[0]*m[3]-m[1]*m[2])<1e-7)return;
    c.save();path(c,q);c.clip();c.transform(...m);c.fillStyle=patterns.get(id);c.fillRect(u,v,w,h);c.restore();
    if(shade)fill(c,q,shade);
  }
  region(c,id,q,{content=true,alpha=1}={}){
    const m=planeTransform(q);if(Math.abs(m[0]*m[3]-m[1]*m[2])<1e-7)return;
    c.save();c.globalAlpha*=alpha;c.transform(...m);this.art.drawRegion(c,id,0,0,256,256,{contentOnly:content});c.restore();
  }
  localQuad(v,x,y,x0,y0,x1,y1,z=0){const p=v.iso(x,y);return [[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(([dx,dy])=>{const q=v.iso(x+dx,y+dy);return [q.x-p.x,q.y-p.y-z];});}
  ground(c,v,x,y,t,time){
    const material=surfaceMaterial(v.battle,x,y,t),q=v.groundPolygon(x,y);
    if(material)this.texture(c,material,q,[mod(x,4)*64,mod(y,4)*64,64,64],'#0b1a2320');
    else {fill(c,q,'#08121b');this.pit(c,v,x,y);return;}
    if(['stairsUp','stairsDown'].includes(t))this.stairs(c,v,x,y);
    if(['plain','road','grass','mud','sound','rubble','dormantStatue'].includes(t)){
      const n=(x*17+y*31)%13,id=t==='sound'?'D05':n===0?'D01':n===3?(mapTheme(v.battle)==='cemetery'?'D02':'D03'):n===7?'D07':null;
      if(id)this.region(c,id,q,{content:false,alpha:.6});
    }
    if(t==='charge')this.region(c,'D06',q,{content:false,alpha:.7+.2*Math.sin(time/180)});
    if(material==='G07'){
      // The existing road squares across the canal remain road; only the deck changes.
      const beam=this.localQuad(v,x,y,-.5,-.45,.5,-.34,2);this.texture(c,'F04',beam,[mod(x,4)*64,0,64,12]);
    }
    path(c,q);c.strokeStyle='#dce2cd18';c.lineWidth=.6;c.stroke();c.lineWidth=1;
  }
  cliffs(c,v,x,y,faces){
    for(const f of faces){
      const uv=[(f.i%2?y:x)*64,-v.tileElevation(x,y)*64,64,f.levels*64];
      this.texture(c,faceMaterial(v.battle),f.points,uv,f.i%2?'#09172255':'#09172230');
      c.strokeStyle='#b6c5ba35';path(c,f.points);c.stroke();
    }
  }
  pit(c,v,x,y){
    const q=v.groundPolygon(x,y);
    for(let i=0;i<4;i++){
      const [dx,dy]=edges[i],known=v.battle.visible.has(K(x+dx,y+dy))||v.battle.seen.has(K(x+dx,y+dy));
      if(known&&(v.battle.memory?.[K(x+dx,y+dy)]??v.battle.tile(x+dx,y+dy))==='pit')continue;
      const a=q[i],b=q[(i+1)%4],innerA=[a[0]*.84,a[1]*.84+4],innerB=[b[0]*.84,b[1]*.84+4];
      c.save();path(c,q);c.clip();this.texture(c,faceMaterial(v.battle),[a,b,innerB,innerA],[0,0,64,16],'#06131b77');c.restore();
    }
  }
  // Cuboids use world-aligned front/back/side planes with visible-face culling.
  solid(c,v,x,y,{w=.86,d=.86,h=40,z=0,face='F01',top='G01',front=null,back=null,side=null,alpha=1}={}){
    const base=this.localQuad(v,x,y,-w/2,-d/2,w/2,d/2,z),roof=base.map(([x,y])=>[x,y-h]);
    c.save();c.globalAlpha*=alpha;
    const order=base.map((p,i)=>({i,depth:(p[1]+base[(i+1)%4][1])/2+z})).sort((a,b)=>a.depth-b.depth);
    for(const {i,depth}of order){if(depth<-.001)continue;const j=(i+1)%4,q=[roof[i],roof[j],base[j],base[i]],id=i===2?front:i===0?back:side;
      if(id)this.region(c,id,q);else this.texture(c,face,q,[(i%2?y:x)*64,-h/40*64,(i%2?d:w)*64,h/40*64],i%2?'#07172355':'#07172322');
    }
    if(top){if(top.startsWith('P'))this.region(c,top,roof);else this.texture(c,top,roof,[x*64,y*64,w*64,d*64],'#10212c20');}
    c.restore();
  }
  block(c,v,x,y,t){
    if(t==='shrub'){this.art.drawSprite(c,'shrub_low',directionFrame({x:0,y:1},v.yaw,v.battle.map.invertY),0,0);return true;}
    if(t==='rubble'){
      const kind=rubbleAppearance(v.battle,x,y);
      if(kind==='fence')this.fence(c,v,x,y);
      else if(kind.includes('gravestone'))this.solid(c,v,x,y,{w:.5,d:.14,h:kind==='gravestone'?27:14,front:kind==='gravestone'?'P02_front':'P02_broken',back:kind==='gravestone'?'P02_back':'P02_broken',side:'P02_side',top:'P02_top'});
      else {
        this.solid(c,v,x,y,{w:.65,d:.55,h:7,face:'F03',top:null});
        this.region(c,(x+y)%2?'P01a_top':'P01b_top',this.localQuad(v,x,y,-.46,-.46,.46,.46,7),{content:false});
      }return true;
    }
    if(t==='door'){this.door(c,v,x,y);return true;}
    if(t==='wall'||t==='crack'){
      this.solid(c,v,x,y,{w:1,d:1,face:'F01'});
      const base=v.groundPolygon(x,y);
      for(let i=0;i<4;i++){const a=base[i],b=base[(i+1)%4];if((a[1]+b[1])/2<-.001)continue;
        const q=[[a[0],a[1]-40],[b[0],b[1]-40],b,a];
        if(t==='crack')this.region(c,'D04',q,{alpha:.85,content:false});
        else if((x*7+y*13)%9===0)this.region(c,'D08_branch',q,{alpha:.75,content:false});
        else if((x+y)%11===0)this.region(c,'D08_hang',q,{alpha:.65,content:false});
      }return true;
    }
    if(t==='thorn'){
      for(const [dx,dy]of [[-.25,-.2],[.22,-.2],[-.2,.22],[.23,.22]]){
        c.save();const p=v.iso(x+dx,y+dy),o=v.iso(x,y);c.translate(p.x-o.x,p.y-o.y);
        this.solid(c,v,x+dx,y+dy,{w:.12,d:.14,h:9,face:'F05',top:null,front:'P06_triangle',back:'P06_triangle'});c.restore();
      }return true;
    }
    return false;
  }
  fence(c,v,x,y){
    const base=this.localQuad(v,x,y,-.5,-.03,.5,.03),front=(base[0][1]+base[1][1])>(base[2][1]+base[3][1])?0:2,j=(front+1)%4;
    this.region(c,'P03_straight',[[base[front][0],base[front][1]-20],[base[j][0],base[j][1]-20],base[j],base[front]]);
    for(const dx of [-.47,.47]){
      c.save();const a=v.iso(x+dx,y),b=v.iso(x,y);c.translate(a.x-b.x,a.y-b.y);
      this.solid(c,v,x+dx,y,{w:.045,d:.045,h:27,face:'F05',top:'F05'});c.restore();
    }
  }
  door(c,v,x,y){
    this.solid(c,v,x,y,{w:1,d:.22,h:56,face:'F01',top:'G01',front:'P04_frame',back:'P04_frame'});
    for(const side of [-1,1]){
      c.save();const a=v.iso(x+side*.2,y),b=v.iso(x,y);c.translate(a.x-b.x,a.y-b.y);
      this.solid(c,v,x+side*.2,y,{w:.37,d:.08,h:44,face:'F04',top:'F04',front:side<0?'P04_left_front':'P04_right_front',back:side<0?'P04_right_back':'P04_left_back'});c.restore();
    }
  }
  stairs(c,v,x,y){
    const dir=stairDirection(v,x,y),h=dir.drop;
    // Lower half contains the risers. The center/upper landing stays at the tile's logical height.
    const p=v.iso(x,y),across={x:-dir.y,y:dir.x};
    const local=(a,b,z)=>{const q=v.iso(x+dir.x*a+across.x*b,y+dir.y*a+across.y*b);return [q.x-p.x,q.y-p.y-z];};
    for(let i=0;i<4;i++){
      const a=.5-i*.125,b=a-.125,z=-h+(i+1)*h/4;
      const tread=[local(a,-.5,z),local(a,.5,z),local(b,.5,z),local(b,-.5,z)];
      const riser=[local(a,-.5,z),local(a,.5,z),local(a,.5,z-h/4),local(a,-.5,z-h/4)];
      this.texture(c,'F03',riser,[x*64,i*16,64,16],'#07172344');this.texture(c,'G01',tread,[x*64,y*64+i*16,64,16]);
    }
  }
  scenery(v,time){
    const b=v.battle,objects=[],st=b.map.statue,gate=b.map.gate;
    const add=(x,y,cells,height,draw)=>{
      const visible=cells.some(([a,d])=>b.visible.has(K(a,d))),seen=cells.some(([a,d])=>b.seen.has(K(a,d)));
      if(!visible&&!seen)return;
      objects.push({fieldDraw:draw,p:v.surface(x,y),x,y,visible,height,depth:v.iso(x,y).y+.01});
    };
    if(st){
      const x=st.cells.reduce((n,p)=>n+p[0],0)/st.cells.length,y=st.cells.reduce((n,p)=>n+p[1],0)/st.cells.length,d=directionFrame({x:0,y:1},v.yaw,b.map.invertY);
      add(x,y,st.cells,32,c=>this.art.drawSprite(c,'adarius_pedestal',d,0,0));
      const visible=st.cells.some(([x,y])=>b.visible.has(K(x,y))),dormant=visible?st.dormant:st.cells.some(([x,y])=>b.memory?.[K(x,y)]==='dormantStatue');
      if(dormant){const elapsed=st.lungeStart==null?0:Math.max(0,time-st.lungeStart),shift=st.bodyDisplaced?3.5:Math.min(3.5,elapsed/240),mount=st.bodyDisplaced?0:32*Math.max(0,1-elapsed/320);
        add(x,y+shift,st.cells,128,c=>this.art.drawSprite(c,'adarius',d,st.shifting&&!shift?Math.sin(time/70):0,-mount));
      }
    }
    if(gate){
      const minX=Math.min(...gate.cells.map(p=>p[0])),maxX=Math.max(...gate.cells.map(p=>p[0])),y=gate.cells.reduce((n,p)=>n+p[1],0)/gate.cells.length,x=(minX+maxX)/2;
      // The three-cell opening remains clear. Each pier/header is sorted separately with units.
      for(const sx of [minX-.9,maxX+.9])add(sx,y,gate.cells,110,c=>{
        this.solid(c,v,sx,y,{w:.65,d:.8,h:gate.ruined?72:110,face:'F01',top:'G01'});
        if(gate.ruined)this.region(c,'P05_fracture',this.localQuad(v,sx,y,-.34,-.4,.34,.4,72));
      });
      const d=.32,w=maxX-minX+1.2,low=66,high=gate.ruined?108:142;
      add(x,y,gate.cells,high,c=>{
        // A shallow stone lintel supplies real side/top/back faces even edge-on.
        this.solid(c,v,x,y,{w,d,h:15,z:low,face:gate.ruined?'F03':'F01',top:'G01'});
        const base=this.localQuad(v,x,y,-w/2,-d/2,w/2,d/2),i=(base[0][1]+base[1][1])>(base[2][1]+base[3][1])?0:2,j=(i+1)%4;
        const q=[[base[i][0],base[i][1]-high],[base[j][0],base[j][1]-high],[base[j][0],base[j][1]-low],[base[i][0],base[i][1]-low]];
        this.region(c,gate.ruined?'P05_wall_collapsed':'P05_wall_weathered',q,{content:false});
        this.region(c,gate.ruined?'P05_timber_collapsed':'P05_timber_weathered',q,{content:false,alpha:.6});
      });
      if(gate.ruined)for(const sx of [minX-.9,maxX+.9])add(sx,y-.35,gate.cells,8,c=>this.region(c,'P05_fallen',this.localQuad(v,sx,y-.35,-.4,-.3,.4,.3,2)));
    }
    return objects;
  }
}
