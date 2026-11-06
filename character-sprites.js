// Original 256×256 RGBA artwork, retained byte for byte. D0 faces the viewer.
export const ASTARTHE_FRAMES=Array.from({length:8},(_,d)=>`assets/astarthe/astarthe_bh_D${d}.png`);
export function directionFrame(facing,yaw=0,invertY=false){
 const dx=facing?.x??1,dy=(facing?.y??(invertY?-1:1))*(invertY?-1:1),c=Math.cos(yaw),s=Math.sin(yaw),rx=dx*c-dy*s,ry=dx*s+dy*c;
 return (Math.round(Math.atan2(rx-ry,rx+ry)/(Math.PI/4))+8)%8;
}
export class CharacterSprites{
 constructor(createImage=()=>typeof Image==='undefined'?null:new Image()){
  this.images=ASTARTHE_FRAMES.map(src=>{const img=createImage();if(img){img.src=new URL(src,import.meta.url).href;img.decoding='async';}return img;});
 }
 draw(ctx,direction){const img=this.images[direction];if(!img?.complete||!img.naturalWidth)return false;ctx.drawImage(img,-40,-75,80,80);return true;}
}
export const characterSprites=new CharacterSprites();

// Uploaded sheets are retained byte for byte. Rows are D0–D7, 256×256 each.
export const SHEET_SPRITES={
 // Midpoint of the two boot contacts in each source row, rather than the lowest pixel.
 hoshiyomi:{src:'assets/hoshiyomi/idle-sheet.png',frameWidth:256,frameHeight:256,frames:8,anchor:[125,241],anchors:[[125,241],[124,232],[132,235],[120,241],[126,241],[133,237],[120,229],[124,228]]},
 hoshiyomiWolf:{src:'assets/hoshiyomi/wolf-idle-sheet.png',frameWidth:256,frameHeight:256,frames:8,anchor:[128,240],anchors:[[130,242],[129,238],[128,232],[128,229],[128,230],[128,230],[128,230],[128,239]]},
 orion:{src:'assets/orion/idle-sheet.png',frameWidth:256,frameHeight:256,frames:8,anchor:[126,244],anchors:[[126,244],[133,240],[131,239],[130,239],[129,244],[121,239],[130,240],[142,240]]},
 umine:{src:'assets/umine/idle-sheet.png',frameWidth:256,frameHeight:256,frames:8,anchor:[128,246],anchors:[[128,246],[130,245],[129,241],[127,240],[128,245],[129,241],[129,241],[125,242]]}
};
export class SheetCharacterSprites{
 constructor(spec,createImage=()=>typeof Image==='undefined'?null:new Image()){
  this.spec=spec;this.image=createImage();
  if(this.image){this.image.src=new URL(spec.src,import.meta.url).href;this.image.decoding='async';}
 }
 draw(ctx,direction){
  const {image:img,spec:s}=this;
  if(!Number.isInteger(direction)||direction<0||direction>=s.frames||!img?.complete||img.naturalWidth!==s.frameWidth||img.naturalHeight!==s.frameHeight*s.frames)return false;
  const scale=80/s.frameWidth,anchor=s.anchors?.[direction]??s.anchor;
  ctx.drawImage(img,0,direction*s.frameHeight,s.frameWidth,s.frameHeight,-anchor[0]*scale,-anchor[1]*scale,s.frameWidth*scale,s.frameHeight*scale);return true;
 }
}
export const sheetCharacterSprites=Object.fromEntries(Object.entries(SHEET_SPRITES).map(([id,spec])=>[id,new SheetCharacterSprites(spec)]));
export function drawCharacterSprite(ctx,id,direction,form='human'){
 const key=id==='hoshiyomi'&&form==='wolf'?'hoshiyomiWolf':id;
 return id==='astarthe'?characterSprites.draw(ctx,direction):sheetCharacterSprites[key]?.draw(ctx,direction)??false;
}
