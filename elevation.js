// Elevation is independent of terrain. Rows use the runtime map's y coordinates.
export function createElevation(width,height,rows=null){
 if(rows==null)return Array.from({length:height},()=>Array(width).fill(0));
 if(!Array.isArray(rows)||rows.length!==height||rows.some(row=>!Array.isArray(row)||row.length!==width||row.some(n=>!Number.isSafeInteger(n))))throw Error('高度データはマップと同じ縦横サイズの整数配列で指定してください。');
 return rows.map(row=>[...row]);
}
export const elevationDelta=(from,to)=>to-from;
export const canTraverseElevation=(from,to)=>Math.abs(elevationDelta(from,to))<2;
export const elevationMoveCost=(cost,from,to)=>canTraverseElevation(from,to)?Math.max(1,cost+Math.sign(elevationDelta(from,to))):Infinity;
export const elevationRange=(range,from,to)=>Math.max(0,range-Math.abs(elevationDelta(from,to)));
export const elevationAccuracy=(from,to)=>Math.sign(from-to)*10;
