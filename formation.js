// Preserve valid slots for deploying heroes; fill gaps for newly selected units.
export function arrangeFormation(heroes,current={}){
 const active=heroes.filter(h=>!h.rest&&h.hp>0).slice(0,4),used=new Set(),out={};
 for(const h of active){const slot=current[h.id];if(Number.isInteger(slot)&&slot>=0&&slot<4&&!used.has(slot)){out[h.id]=slot;used.add(slot);}}
 for(const h of active)if(out[h.id]===undefined){const slot=[0,1,2,3].find(i=>!used.has(i));out[h.id]=slot;used.add(slot);}
 return out;
}
