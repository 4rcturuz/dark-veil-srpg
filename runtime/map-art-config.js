// Appearance only. All coordinates are internal, zero based; no collision data lives here.
export function mapTheme(b) {
  if (b.tutorial2 && b.map.statue) return 'cemetery';
  if (b.tutorial || b.tutorial2 || b.mission?.id === 2 || b.mission?.id === 1 && b.stage === 1) return 'chapel';
  return 'outdoors';
}
export function surfaceMaterial(b,x,y,t) {
  const theme=mapTheme(b);
  if(t==='pit')return null;
  if(t==='road' && b.mission?.id===1 && b.stage===0 && (x===6||x===7))return 'G07';
  return ({water:'G09',poison:'G10',ice:'G11',lava:'G12',mud:'G08',sand:'G03',grass:'G06',shrub:'G06',sound:'G02',charge:'G02',wall:'G01',crack:'G01',door:'G02',stairsUp:'G01',stairsDown:'G01'})[t]
    ?? (theme==='cemetery'?'G05':theme==='chapel'?'G02':t==='road'?'G04':'G03');
}
export function rubbleAppearance(b,x,y) {
  if(mapTheme(b)!=='cemetery')return 'rubble';
  // The contiguous rubble row at (2..6,8) in the authored map is a low fence.
  if(y===7 && x>=1 && x<=5)return 'fence';
  return (x+y)%4===0?'broken-gravestone':'gravestone';
}
export function faceMaterial(b){return mapTheme(b)==='chapel'?'F03':'F02';}
