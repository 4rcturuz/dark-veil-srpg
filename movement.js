// Interpolate each cardinal segment separately; never cut across a corner.
export function sampleMovement(track,time){
 const progress=Math.max(0,(time-track.time)/track.step),last=track.points.length-1,index=Math.min(Math.floor(progress),last-1),a=track.points[Math.max(0,index)],b=track.points[Math.max(0,index)+1]??a,t=Math.min(1,progress-index);
 return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,facing:{x:b.x-a.x,y:b.y-a.y},done:progress>=last};
}
