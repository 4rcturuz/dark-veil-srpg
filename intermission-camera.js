// Coordinates are in the supplied 1672×941 background, with 100 px per stage unit.
export const CATHEDRAL_CAMERA={x:760,y:380};
export const CATHEDRAL_DOOR={x:5.9,y:3.75,direction:1};
export const CATHEDRAL_REAR={x:10.4,y:4.0,direction:0};
export const CATHEDRAL_ROAD_PATHS={
 astarthe:[{x:9.6,y:6.1},{x:12.2,y:5.6},{x:14.0,y:5.0},{x:14.75,y:3.9}],
 umine:[{x:10.8,y:5.9},{x:13.0,y:5.35},{x:14.3,y:4.65},{x:15.0,y:3.5}],
 hoshiyomi:[{x:11.9,y:5.6},{x:13.75,y:5.1},{x:14.6,y:4.1},{x:15.1,y:3.0}]
};
export function cathedralCameraFrame(camera=CATHEDRAL_CAMERA){
 const sw=1200,sh=sw*600/1280;
 return {sx:Math.max(0,Math.min(1672-sw,camera.x-sw/2)),sy:Math.max(0,Math.min(941-sh,camera.y-sh/2)),sw,sh,scale:1280/sw};
}
export function pathLength(points){return points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-points[i].x,p.y-points[i].y),0);}
export function sampleEventPath(points,distance){
 let remaining=Math.max(0,distance);
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y);
  if(remaining<=length||i===points.length-1){
   const t=length?Math.min(1,remaining/length):1,angle=Math.atan2(b.x-a.x,b.y-a.y);
   return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,direction:(Math.round(angle/(Math.PI/4))+8)%8};
  }
  remaining-=length;
 }
 return {...points[0]};
}
