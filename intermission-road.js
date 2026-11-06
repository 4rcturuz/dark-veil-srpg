// Road staging uses the 1280×600 visual field; one stage unit is 100 display pixels.
// Each line advances only to its own mark, so reading time cannot run the party offscreen.
const LEAD_X=[3.6,4.2,4.2,4.2,4.7,5.2,5.8,6.6,7.2,7.8,8.3,8.3,8.3,8.8,9.3,9.8,9.8,9.8,9.8];
export function roadActors(index){
 const x=LEAD_X[index-24],whisper=index>=31&&index<=33,gift=index>=40;
 return {
  astarthe:{x,y:3.65,direction:index===26||index===27||index===35||gift?6:2},
  umine:{x:x-1.4,y:3.85,direction:whisper?6:2},
  hoshiyomi:{x:x-(gift?0.8:2.8),y:gift?3.3:3.55,direction:2}
 };
}
export function roadEntranceActors(){
 return Object.fromEntries(Object.entries(roadActors(24)).map(([id,p])=>[id,{...p,x:p.x-4.4}]));
}
export function roadExitPaths(actors){
 const distance=13.8-Math.min(...Object.values(actors).map(p=>p.x));
 return Object.fromEntries(Object.entries(actors).map(([id,p])=>[id,[{...p},{...p,x:p.x+distance,direction:2}]]));
}
export function roadBackgroundFrame(){
 const sw=1672,sh=sw*600/1280;
 return {sx:0,sy:(941-sh)/2,sw,sh};
}
