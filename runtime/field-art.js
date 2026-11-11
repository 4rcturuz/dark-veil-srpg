/** Optional Canvas 2D loader for this asset pack. Does not mutate terrain or game state. */
export function directionFrame(facing, yaw=0, invertY=false) {
  const dx=facing?.x??1, dy=(facing?.y??(invertY?-1:1))*(invertY?-1:1);
  const c=Math.cos(yaw), s=Math.sin(yaw), rx=dx*c-dy*s, ry=dx*s+dy*c;
  return (Math.round(Math.atan2(rx-ry,rx+ry)/(Math.PI/4))+8)%8;
}

export class FieldArt {
  constructor(manifest, images) { this.manifest=manifest; this.images=images; }
  static async load({manifestUrl=new URL('../assets/field/manifest.json',import.meta.url), only=null}={}) {
    const url=new URL(manifestUrl,import.meta.url);
    const response=await fetch(url);
    if(!response.ok) throw new Error(`Field manifest: HTTP ${response.status}`);
    const manifest=await response.json(), root=new URL('../../',url), images=new Map();
    const allowed=only?new Set(only):null;
    await Promise.all(manifest.files.filter(f=>!allowed||allowed.has(f.src)).map(async f=>{
      const img=new Image(); img.decoding='async'; img.src=new URL(f.src,root).href;
      await img.decode();
      if(img.naturalWidth!==f.width||img.naturalHeight!==f.height)throw new Error(`Wrong dimensions: ${f.src}`);
      images.set(f.src,img);
    }));
    return new FieldArt(manifest,images);
  }
  image(src) {
    const img=this.images.get(src);
    if(!img)throw new Error(`Asset not loaded: ${src}`);
    return img;
  }
  pattern(ctx,id) {
    const spec=this.manifest.textures[id];
    if(!spec)throw new Error(`Unknown texture: ${id}`);
    return ctx.createPattern(this.image(spec.src),'repeat');
  }
  /** Draw a stored region in local coordinates. Project it onto its host plane separately. */
  drawRegion(ctx,id,x,y,width=null,height=null,{contentOnly=false}={}) {
    const r=this.manifest.regions[id];if(!r)throw new Error(`Unknown region: ${id}`);
    const [sx,sy,sw,sh]=contentOnly?r.contentRect:r.rect;
    const w=width??sw,h=height??(sh*w/sw);
    ctx.drawImage(this.image(r.src),sx,sy,sw,sh,x,y,w,h);
  }
  /** x,y is a world-projected foot point BEFORE MapView's pan/zoom transform. */
  drawSprite(ctx,id,direction,x,y,{drawWidth=null}={}) {
    const s=this.manifest.sprites[id];if(!s)throw new Error(`Unknown sprite: ${id}`);
    if(!Number.isInteger(direction)||direction<0||direction>=s.frames)throw new Error('Direction must be 0..7');
    const scale=(drawWidth??s.drawWidth)/s.frameWidth;
    const anchor=s.frameData[direction].anchor??s.anchor;
    ctx.drawImage(this.image(s.src),0,direction*s.frameHeight,s.frameWidth,s.frameHeight,
      x-anchor[0]*scale,y-anchor[1]*scale,s.frameWidth*scale,s.frameHeight*scale);
  }
  /** Reuse the enemy body above the separate stationary pedestal. */
  drawDormantAdarius(ctx,direction,x,y) {
    const s=this.manifest.sprites.adarius_pedestal, mount=s.mountAnchors[direction];
    const scale=s.drawWidth/s.frameWidth;
    this.drawSprite(ctx,'adarius_pedestal',direction,x,y);
    this.drawSprite(ctx,'adarius',direction,x+(mount[0]-s.anchor[0])*scale,y+(mount[1]-s.anchor[1])*scale);
  }
}
