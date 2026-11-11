// Face icons use square 640 × 640 source artwork, without cropping or magnification.
export const FACE_ICON_SIZE=640;
export const FACE_ICONS={elena:'assets/elena-portrait.png',orion:'assets/orion-portrait.png',astarthe:'assets/astarthe-portrait.png',hoshiyomi:'assets/hoshiyomi-portrait.png',umine:'assets/umine-portrait.png',kanata:'assets/kanata-portrait.png'};
export function faceIconMarkup(id){
 const src=FACE_ICONS[id];
 return src?`<img src="${src}" width="640" height="640" alt="">`:'<svg viewBox="0 0 640 640" aria-hidden="true"><circle cx="320" cy="240" r="100"/><path d="M130 570v-40a190 190 0 0 1 380 0v40Z"/></svg>';
}
