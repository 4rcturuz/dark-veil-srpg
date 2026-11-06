// Source-image coordinates keep the party on the foreground switchback, above the cemetery.
export function cemeteryBackgroundFrame(){
 const sw=1672,sh=sw*600/1280;
 return {sx:0,sy:(941-sh)/2,sw,sh};
}
function stagePoint(x,y,direction=5){
 const f=cemeteryBackgroundFrame(),scale=1280/f.sw;
 return {x:(x-f.sx)*scale/100,y:(y-f.sy)*scale/100,direction};
}
export function cemeteryActors(index){
 return {
  umine:stagePoint(1110,655),
  astarthe:stagePoint(1300,720,index===45?2:5),
  hoshiyomi:stagePoint(1480,780,index>=44?6:5)
 };
}
export function cemeteryEntrancePaths(){
 const marks={
  umine:[[1780,800],[1570,770],[1390,710],[1110,655]],
  astarthe:[[1950,840],[1660,825],[1510,785],[1300,720]],
  hoshiyomi:[[2120,880],[1730,850],[1580,820],[1480,780]]
 };
 return Object.fromEntries(Object.entries(marks).map(([id,path])=>[id,path.map(([x,y])=>stagePoint(x,y,6))]));
}
