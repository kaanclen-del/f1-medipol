/* F1 SOCIAL Kart Rush Graphics 2.0 Stage 1: textured WebGL material pipeline.
 * Dependency-free WebGL; no Supabase calls in the animation/render loop.
 * V11 visuals: fuller F1-style 22-car field, cleaner broadcast HUD, richer environment and reduced auto-assist feel.
 */
export type KartPower = 'turbo' | 'shield' | 'emp' | 'repair' | 'pulse' | 'magnet';
export type KartDifficulty = 'easy' | 'normal' | 'hard';
export type KartGraphics = 'low' | 'balanced' | 'high';
export type KartPace = 'fast' | 'standard' | 'long';
export type KartWeather = 'clear' | 'rain';
export type KartState = { id: string; progress: number; lane: number; speed: number; color: string; name: string; finished?: boolean };
export type KartHud = {
 speed: number; lap: number; totalLaps: number; remaining: number; cornerSpeed?: number; camera?: string; health: number; pit: boolean; pitProgress: number; magnet: boolean; lights: number;
 power: KartPower | null; rank: number; total: number; elapsed: number; started: boolean; countdown: number;
 shield: boolean; turbo: boolean; fps?: number; bestLapMs?: number; offroad?: boolean; progress?: number; throttle?: boolean; braking?: boolean; contact?: boolean;
 rivals?: { id: string; name: string; color: string; progress: number }[];
};
export type KartOptions = {
 id: string; color: string; name: string; startAt: number; gridSlot?:number; laps?: number; pace?: KartPace; bots?: boolean; difficulty?: KartDifficulty; graphics?: KartGraphics; weather?: KartWeather;
 onHud: (hud: KartHud) => void; onFinish: (durationMs: number, bestLapMs: number) => void;
 onSnapshot?: (s: KartState) => void; onPower?: (power: KartPower, targets?: string[]) => void; onEffect?: (effect:'pickup'|'boost'|'shield'|'emp'|'collision'|'horn'|'repair'|'pulse'|'magnet'|'rival-turbo'|'rival-shield'|'overtake'|'position-lost') => void;
};
type Vec={x:number;y:number;z:number};type Vertex=number[];
type C=[number,number,number];
const TAU=Math.PI*2;
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const wrap=(x:number)=>((x%1)+1)%1;
const mix=(a:number,b:number,k:number)=>a+(b-a)*k;
const angleDiff=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const ease=(rate:number,dt:number)=>1-Math.exp(-rate*dt);
const rgb=(hex:string):C=>{const t=hex.replace('#','');const n=parseInt(t,16);return Number.isFinite(n)?[((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255]:[1,.18,.25]};
// V9: physical arc-length sampling. All driving, road mesh, grid and mini-map share one track.
// A progress delta now represents the SAME world distance on straights and in hairpins.
export const TRACK_POINTS:{x:number;z:number}[]=[
 {x:-260,z:-520},{x:0,z:-520},{x:260,z:-520},{x:590,z:-505},
 {x:780,z:-475},{x:840,z:-405},{x:1010,z:-180},{x:928,z:-45},
 {x:1008,z:160},{x:790,z:450},{x:510,z:550},{x:415,z:460},
 {x:440,z:315},{x:505,z:190},{x:315,z:114},
 {x:80,z:183},{x:-160,z:370},{x:-500,z:580},{x:-850,z:480},
 {x:-1040,z:190},{x:-970,z:0},{x:-1045,z:-150},
 {x:-855,z:-337},{x:-730,z:-450},{x:-610,z:-407},{x:-480,z:-520},
];
function catmull(a:number,b:number,c:number,d:number,t:number){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)}
function rawTrack(p:number){
 const n=TRACK_POINTS.length,q=wrap(p)*n,i=Math.floor(q),f=q-i;
 const p0=TRACK_POINTS[(i-1+n)%n],p1=TRACK_POINTS[i%n],p2=TRACK_POINTS[(i+1)%n],p3=TRACK_POINTS[(i+2)%n];
 return {x:catmull(p0.x,p1.x,p2.x,p3.x,f),z:catmull(p0.z,p1.z,p2.z,p3.z,f)};
}
const ARC_STEPS=4800;
const ARC_LENGTHS=new Float64Array(ARC_STEPS+1);
let TRACK_LENGTH=0;
{let prev=rawTrack(0);for(let i=1;i<=ARC_STEPS;i++){
 const next=rawTrack(i/ARC_STEPS);TRACK_LENGTH+=Math.hypot(next.x-prev.x,next.z-prev.z);ARC_LENGTHS[i]=TRACK_LENGTH;prev=next;
}}
function trackRawProgress(progress:number){
 const target=wrap(progress)*TRACK_LENGTH;
 let lo=0,hi=ARC_STEPS;
 while(lo+1<hi){const mid=(lo+hi)>>>1;if(ARC_LENGTHS[mid]<target)lo=mid;else hi=mid;}
 const length=ARC_LENGTHS[hi]-ARC_LENGTHS[lo]||1;
 return (lo+clamp((target-ARC_LENGTHS[lo])/length,0,1))/ARC_STEPS;
}
export function trackPosition(progress:number){return rawTrack(trackRawProgress(progress));}
function pt(p:number):Vec{
 const {x,z}=trackPosition(p),q=wrap(p);
 return {x,y:.15+1.15*Math.sin(TAU*q*2+.25)+.34*Math.sin(TAU*q*6+.9),z};
}
function tangent(p:number):Vec{const a=pt(p-.00006),b=pt(p+.00006),d=Math.hypot(b.x-a.x,b.z-a.z)||1;return{x:(b.x-a.x)/d,y:0,z:(b.z-a.z)/d};}
function place(p:number,lane:number):Vec{const c=pt(p),t=tangent(p);return{x:c.x-t.z*lane,y:c.y,z:c.z+t.x*lane};}
function yawFor(p:number):number{const t=tangent(p);return Math.atan2(t.x,-t.z);}
// G4.0.1 floodlights: stable track-relative masts, no extra network textures.
const FLOOD_SITES=Array.from({length:56},(_,i)=>{
 const progress=(i+.39)/56, side=i%2===0?1:-1;
 const pole=place(progress,side*43),head=place(progress,side*16.5);
 return {progress,side,pole,head};
});
function floodSiteVisible(index:number,quality:KartGraphics){
 return quality==='high'||(quality==='balanced'?index%4!==0:index%2===0&&index%3!==0);
}
function cornerInfo(progress:number){
 // 28 m and 65 m look-ahead, independent of spline control point spacing.
 const near=28/TRACK_LENGTH,far=78/TRACK_LENGTH;
 const t0=tangent(progress),t1=tangent(progress+near),t2=tangent(progress+far);
 const dot=clamp(t0.x*t2.x+t0.z*t2.z,-1,1);
 const sharp=Math.max(Math.acos(dot),Math.acos(clamp(t0.x*t1.x+t0.z*t1.z,-1,1))*2.3);
 const recommended=sharp>.95?13:sharp>.72?17:sharp>.55?22:sharp>.39?28:sharp>.27?35:sharp>.17?43:sharp>.10?51:65;
 const cross=t0.x*t2.z-t0.z*t2.x;
 return {sharp,recommended,turn:Math.sign(cross)};
}

// G3.2: Actual corner apex markers derived once from the physical track geometry.
// Unlike a fixed "AI lane", these feed corner-by-corner entry/apex/exit decisions.
type AiCornerMark={progress:number;turn:number;severity:number};
function buildAiCornerMarks():AiCornerMark[]{
 const sampleCount=Math.max(400,Math.floor(TRACK_LENGTH/10));
 const samples:{progress:number;angle:number}[]=[];
 const delta=10/TRACK_LENGTH;
 for(let k=0;k<sampleCount;k++){
  const progress=k/sampleCount,left=tangent(progress-delta),right=tangent(progress+delta);
  const signed=Math.atan2(left.x*right.z-left.z*right.x,clamp(left.x*right.x+left.z*right.z,-1,1));
  samples.push({progress,angle:signed});
 }
 const candidates:{progress:number;angle:number}[]=[];
 for(let k=0;k<sampleCount;k++){
  const prev=samples[(k-2+sampleCount)%sampleCount],cur=samples[k],next=samples[(k+2)%sampleCount];
  if(Math.abs(cur.angle)>.085&&Math.abs(cur.angle)>=Math.abs(prev.angle)&&Math.abs(cur.angle)>=Math.abs(next.angle))candidates.push(cur);
 }
 const grouped:{progress:number;angle:number}[]=[];
 for(const peak of candidates){
  const last=grouped[grouped.length-1];
  if(!last||(peak.progress-last.progress)*TRACK_LENGTH>65)grouped.push({...peak});
  else if(Math.abs(peak.angle)>Math.abs(last.angle))grouped[grouped.length-1]={...peak};
 }
 return grouped.map(p=>({progress:p.progress,turn:p.angle>=0?1:-1,severity:Math.abs(p.angle)}));
}
const AI_CORNER_MARKS=buildAiCornerMarks();
function aiCornerMoment(progress:number):{index:number;distance:number;corner:AiCornerMark}|null{
 let best:{index:number;distance:number;corner:AiCornerMark}|null=null;
 for(let i=0;i<AI_CORNER_MARKS.length;i++){
  const corner=AI_CORNER_MARKS[i];
  let delta=wrap(corner.progress-wrap(progress))*TRACK_LENGTH;
  if(delta>TRACK_LENGTH*.5)delta-=TRACK_LENGTH;
  if(delta < -86 || delta > 166)continue;
  if(!best||Math.abs(delta)<Math.abs(best.distance))best={index:i,distance:delta,corner};
 }
 return best;
}
function aiSmoothstep(x:number){const u=clamp(x,0,1);return u*u*(3-2*u);}
function aiTurnLine(distance:number,turn:number,severity:number,style:number,courage:number):number{
 const extra=clamp(severity*.65,0,.65);
 // The car first sets up WIDE on entry, CUTS toward the inside at the apex,
 // then opens its steering on the outside on exit. Styles change commitment.
 const wide=-(5.4+2.0*courage+(style===3?2.7:0))*turn;
 const apex=(5.2+2.0*courage+2.8*extra+(style===2?2.0:0))*turn;
 const exit=-(2.8+1.6*courage)*turn;
 if(distance>55)return mix(wide,apex,aiSmoothstep((138-distance)/83));
 if(distance>-10)return apex;
 return mix(apex,exit,aiSmoothstep((-distance-10)/76));
}
// Interleaved geometry: xyz + RGB + surface normal + material id.
// Normal-based directional light and procedural fragment materials upgrade the flat V2 palette.
const STRIDE=10;
const MAT_BASIC=0, MAT_GRASS=1, MAT_ASPHALT=2, MAT_METAL=3, MAT_GLOW=4, MAT_GLASS=5, MAT_WATER=6, MAT_SKY=7, MAT_CARBON=8, MAT_TYRE=9, MAT_KERB=10, MAT_CONCRETE=11, MAT_FLAG=12;
function vertex(v:Vertex,p:Vec,c:C,n:Vec,mat=MAT_BASIC){v.push(p.x,p.y,p.z,...c,n.x,n.y,n.z,mat)}
function tri(v:Vertex,a:Vec,b:Vec,c:Vec,col:C,mat=MAT_BASIC){
 const u={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},w={x:c.x-a.x,y:c.y-a.y,z:c.z-a.z};
 const nx=u.y*w.z-u.z*w.y,ny=u.z*w.x-u.x*w.z,nz=u.x*w.y-u.y*w.x,len=Math.hypot(nx,ny,nz)||1;
 const flip=(Math.abs(ny)>Math.abs(nx)+Math.abs(nz)&&ny<0)?-1:1;const n={x:nx/len*flip,y:ny/len*flip,z:nz/len*flip};vertex(v,a,col,n,mat);vertex(v,b,col,n,mat);vertex(v,c,col,n,mat);
}
function quad(v:Vertex,a:Vec,b:Vec,c:Vec,d:Vec,col:C,mat=MAT_BASIC){tri(v,a,b,c,col,mat);tri(v,a,c,d,col,mat)}
// Flags encode how far the cloth is from the mast into the fractional material id.
// The main vertex shader reads this lightweight per-vertex value and waves the flag on GPU.
// All ordinary surfaces still use unchanged integer material ids.
function wavingFlagTri(v:Vertex,a:Vec,b:Vec,c:Vec,col:C,weightA:number,weightB:number,weightC:number){
 const start=v.length;
 tri(v,a,b,c,col,MAT_FLAG);
 v[start+9]=MAT_FLAG+clamp(weightA,0,.93);
 v[start+STRIDE+9]=MAT_FLAG+clamp(weightB,0,.93);
 v[start+STRIDE*2+9]=MAT_FLAG+clamp(weightC,0,.93);
}
function wavingFlagQuad(v:Vertex,a:Vec,b:Vec,c:Vec,d:Vec,col:C,weightA:number,weightB:number,weightC:number,weightD:number){
 wavingFlagTri(v,a,b,c,col,weightA,weightB,weightC);
 wavingFlagTri(v,a,c,d,col,weightA,weightC,weightD);
}

const light=(c:C,f:number):C=>[clamp(c[0]*f,0,1),clamp(c[1]*f,0,1),clamp(c[2]*f,0,1)];
function box(v:Vertex,x:number,y:number,z:number,w:number,h:number,d:number,col:C,yaw=0,mat=MAT_BASIC){
 const ca=Math.cos(yaw),sa=Math.sin(yaw);
 const q=(dx:number,dy:number,dz:number):Vec=>({x:x+dx*ca-dz*sa,y:y+dy,z:z+dx*sa+dz*ca});
 const a=q(-w/2,0,-d/2),b=q(w/2,0,-d/2),c=q(w/2,h,-d/2),e=q(-w/2,h,-d/2);
 const f=q(-w/2,0,d/2),g=q(w/2,0,d/2),h2=q(w/2,h,d/2),j=q(-w/2,h,d/2);
 quad(v,a,b,c,e,light(col,1),mat);quad(v,g,f,j,h2,light(col,.68),mat);quad(v,f,a,e,j,light(col,.82),mat);quad(v,b,g,h2,c,light(col,.74),mat);quad(v,e,c,h2,j,light(col,1.14),mat);quad(v,f,g,b,a,light(col,.52),mat);
}
function ring(v:Vertex,c:Vec,r:number,height:number,color:C){const n=20;for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;const p={x:c.x+Math.cos(a)*r,y:c.y+height,z:c.z+Math.sin(a)*r};const q={x:c.x+Math.cos(b)*r,y:c.y+height,z:c.z+Math.sin(b)*r};const r2={x:c.x+Math.cos(b)*(r+.13),y:c.y+height,z:c.z+Math.sin(b)*(r+.13)};const s={x:c.x+Math.cos(a)*(r+.13),y:c.y+height,z:c.z+Math.sin(a)*(r+.13)};quad(v,p,q,r2,s,color);}}
const PICKUP_POS=[.082,.175,.265,.36,.46,.555,.65,.745,.845,.935];
const PICKUP_LANES=[-5.0,5.0];
const POWER_POOL:KartPower[]= ['turbo','shield','emp','repair','pulse','magnet'];
const randomPower=():KartPower=>POWER_POOL[Math.floor(Math.random()*POWER_POOL.length)];
// V12: every car occupies one of the 22 painted grid slots.
const GRID_FIRST=-.0016,GRID_STEP=.00098,GRID_PLAYER_SLOT=10,GRID_LANE=4.5;
const AI_DRIVERS=[
 {name:'Max Verstappen',color:'#173B8A'},{name:'Lando Norris',color:'#FF8000'},
 {name:'Oscar Piastri',color:'#FF8000'},{name:'Charles Leclerc',color:'#E32636'},
 {name:'Lewis Hamilton',color:'#E32636'},{name:'George Russell',color:'#00D2BE'},
 {name:'Kimi Antonelli',color:'#00D2BE'},{name:'Fernando Alonso',color:'#006A4E'},
 {name:'Lance Stroll',color:'#006A4E'},{name:'Isack Hadjar',color:'#173B8A'},
 {name:'Liam Lawson',color:'#F4F5F7'},{name:'Arvid Lindblad',color:'#F4F5F7'},
 {name:'Pierre Gasly',color:'#FF6DAE'},{name:'Esteban Ocon',color:'#C4CFD8'},
 {name:'Oliver Bearman',color:'#C4CFD8'},{name:'Alex Albon',color:'#2B7BFF'},
 {name:'Carlos Sainz',color:'#2B7BFF'},{name:'Nico Hulkenberg',color:'#B11F26'},
 {name:'Gabriel Bortoleto',color:'#B11F26'},{name:'Valtteri Bottas',color:'#B4AA78'},
 {name:'Sergio Perez',color:'#B4AA78'}
] as const;
// Mystery pickups are visually identical; reward is determined at collection time.
function tower(v:Vertex,x:number,y:number,z:number,h:number,palette:number){
 const main:C=palette===0?[.13,.24,.32]:palette===1?[.82,.23,.30]:[.25,.38,.49];
 box(v,x,y,z,5,h,6,main,0,MAT_METAL);
 for(let k=1;k<Math.floor(h/2);k++)for(const side of [-1,1]){
  box(v,x+side*2.53,y+k*2,z,0.07,.9,3.7,[.58,.84,.95],0,MAT_GLASS);
 }
 box(v,x,y+h,z,6,.35,7,[.76,.85,.91],0,MAT_METAL);
}
function cone(v:Vertex,x:number,y:number,z:number,r:number,h:number,c:C,segments=8){
 const top={x,y:y+h,z};for(let i=0;i<segments;i++){
  const a=i*TAU/segments,b=(i+1)*TAU/segments;
  tri(v,{x:x+Math.cos(a)*r,y,z:z+Math.sin(a)*r},top,{x:x+Math.cos(b)*r,y,z:z+Math.sin(b)*r},light(c,.85+.22*Math.cos(a)),MAT_GRASS);
 }
}
function cylinder(v:Vertex,x:number,y:number,z:number,r:number,h:number,col:C,n=10,mat=MAT_METAL){
 for(let i=0;i<n;i++){
  const a=i*TAU/n,b=(i+1)*TAU/n;
  quad(v,{x:x+r*Math.cos(a),y,z:z+r*Math.sin(a)},{x:x+r*Math.cos(b),y,z:z+r*Math.sin(b)},{x:x+r*Math.cos(b),y:y+h,z:z+r*Math.sin(b)},{x:x+r*Math.cos(a),y:y+h,z:z+r*Math.sin(a)},col,mat);
 }
}
function makeFlag(v:Vertex,x:number,y:number,z:number,col:C){
 cylinder(v,x,y,z,.10,6.6,[.70,.76,.83],7);
 quad(v,{x,y:y+6.3,z},{x:x+3.4,y:y+5.9,z},{x:x+3.4,y:y+4.7,z},{x,y:y+5.0,z},col,MAT_GLOW);
}
function cottage(v:Vertex,x:number,y:number,z:number,scale:number,yaw:number,palette=0){
 const palettes:[C,C,C,C][]=[
  [[.83,.78,.69],[.64,.30,.24],[.95,.94,.88],[.38,.24,.18]],
  [[.66,.77,.88],[.42,.24,.24],[.93,.95,.98],[.35,.22,.18]],
  [[.86,.69,.62],[.27,.34,.45],[.97,.94,.86],[.42,.28,.20]],
  [[.72,.83,.71],[.54,.26,.22],[.96,.95,.90],[.40,.27,.18]],
 ];
 const [body,roof,trim,door]=palettes[palette%palettes.length];
 const w=4.8*scale,d=5.3*scale,h=3.4*scale;
 box(v,x,y,z,w,h,d,body,yaw,MAT_BASIC);
 box(v,x,y+h,z,w*1.08,.32*scale,d*1.1,trim,yaw,MAT_METAL);
 box(v,x,y+h+.22*scale,z,w*1.18,.95*scale,d*1.16,roof,yaw,MAT_METAL);
 box(v,x,y+h+1.04*scale,z,w*.84,.40*scale,d*.82,light(roof,1.18),yaw,MAT_METAL);
 const ca=Math.cos(yaw),sa=Math.sin(yaw);
 const local=(dx:number,dy:number,dz:number):Vec=>({x:x+dx*ca-dz*sa,y:y+dy,z:z+dx*sa+dz*ca});
 for(const sx of [-1,1]){
  const front=local(sx*w*.22,h*.42,d*.51); box(v,front.x,front.y,front.z,w*.18,h*.34,.12*scale,[.60,.88,.96],yaw,MAT_GLASS);
  const side=local(sx*w*.53,h*.42,0); box(v,side.x,side.y,side.z,.12*scale,h*.34,d*.22,[.62,.90,.98],yaw,MAT_GLASS);
 }
 const front2=local(0,h*.46,d*.51); box(v,front2.x,front2.y,front2.z,w*.22,h*.36,.12*scale,[.62,.90,.98],yaw,MAT_GLASS);
 const porch=local(0,0,d*.63); box(v,porch.x,porch.y,porch.z,w*.34,h*.62,.16*scale,door,yaw,MAT_METAL);
 const chimney=local(w*.23,h+1.10*scale,-d*.14); box(v,chimney.x,chimney.y,chimney.z,.55*scale,1.45*scale,.55*scale,[.66,.66,.70],yaw,MAT_METAL);
}
function archway(v:Vertex,x:number,y:number,z:number,w:number,h:number,d:number,yaw:number,stone:C,accent:C){
 const ca=Math.cos(yaw),sa=Math.sin(yaw);
 const local=(dx:number,dy:number,dz:number):Vec=>({x:x+dx*ca-dz*sa,y:y+dy,z:z+dx*sa+dz*ca});
 const left=local(-w/2+.9,0,0),right=local(w/2-.9,0,0),top=local(0,h-.8,0);
 box(v,left.x,left.y,left.z,1.8,h,d,stone,yaw,MAT_METAL);
 box(v,right.x,right.y,right.z,1.8,h,d,stone,yaw,MAT_METAL);
 box(v,top.x,top.y,top.z,w,1.6,d,stone,yaw,MAT_METAL);
 box(v,top.x,top.y+.95,top.z,w*1.06,.30,d*1.08,accent,yaw,MAT_GLOW);
 for(const sx of [-1,1]) for(let i=0;i<3;i++){
  const lamp=local(sx*(w*.5-.95),h-2.1-i*.9,d*.58);
  box(v,lamp.x,lamp.y,lamp.z,.26,.26,.20,[1,.78,.32],yaw,MAT_GLOW);
 }
}
function grandstand(v:Vertex,x:number,y:number,z:number,yaw:number,rows:number,accent:C,empty=false){
 for(let r=0;r<rows;r++){
  box(v,x,y+r*.52,z-r*.70,9.8-r*.8,.48,3.2,r%2?[.37,.43,.50]:[.23,.28,.35],yaw,MAT_METAL);
  for(let seat=0;!empty&&seat<8-r;seat++){
   const ox=-3.6+seat*1.0,oy=.22+r*.52,oz=.82-r*.70;
   const ca=Math.cos(yaw),sa=Math.sin(yaw);
   const px=x+ox*ca-oz*sa,pz=z+ox*sa+oz*ca;
   box(v,px,y+oy,pz,.46,.34,.44,seat%4===0?[.98,.76,.26]:seat%3===0?[.96,.31,.42]:[.45,.80,.97],yaw,MAT_BASIC);
  }
 }
 box(v,x,y+rows*.58+1.5,z-rows*.95,10.5,.42,4.6,[.88,.92,.96],yaw,MAT_METAL);
 box(v,x,y+rows*.58+1.05,z-rows*.95,10.1,.18,4.3,accent,yaw,MAT_GLOW);
}
function lampPost(v:Vertex,x:number,y:number,z:number,h:number,yaw:number=0){
 cylinder(v,x,y,z,.12,h,[.63,.69,.75],7,MAT_METAL);
 const head={x:x+Math.cos(yaw)*.5,y:y+h-.25,z:z+Math.sin(yaw)*.5};
 box(v,head.x,head.y,head.z,1.05,.18,.42,[.75,.80,.85],yaw,MAT_METAL);
 box(v,head.x,head.y-.02,head.z,1.0,.10,.30,[1.,.86,.55],yaw,MAT_GLOW);
}
function flowerBed(v:Vertex,x:number,y:number,z:number,w:number,d:number,petal:C){
 box(v,x,y,z,w,.18,d,[.28,.34,.18],0,MAT_GRASS);
 for(let i=0;i<8;i++){
  const px=x-w*.35+(i%4)*(w*.23),pz=z-d*.18+Math.floor(i/4)*(d*.32);
  box(v,px,y+.12,pz,.23,.18,.23,petal,0,MAT_GLOW);
 }
}

function stadiumRibbon(v:Vertex,quality:KartGraphics){
 // Continuous banked grandstand ribbons rather than scattered small stands.
 // Guards use samples of the actual racing route to avoid covering adjacent portions of the circuit.
 const count=quality==='high'?220:quality==='balanced'?165:108;
 const rows=quality==='high'?10:quality==='balanced'?9:7;
 const route=Array.from({length:240},(_,i)=>pt(i/240));
 const safe=(f:number,side:number)=>{
  const center=place(f,side*76);
  for(let j=0;j<route.length;j++){
   const delta=Math.abs(wrap(f-j/route.length+.5)-.5);
   if(delta<.029)continue;
   if(Math.hypot(center.x-route[j].x,center.z-route[j].z)<28)return false;
  }
  return true;
 };
 const ground=(progress:number,lane:number,y:number):Vec=>{const p=place(progress,lane);return{x:p.x,y:p.y+y,z:p.z};};
 for(let i=0;i<count;i++){
  const a=i/count,b=(i+1)/count,mid=(a+b)*.5;
  for(const side of [-1,1]){
   const pitZone=side===1&&(mid>.942||mid<.049);
   if(pitZone||!safe(mid,side))continue;
   const accent:C=(i%18<9)?[.85,.16,.23]:[.24,.47,.70];
   const p=(f:number,lane:number,height:number)=>ground(f,side*lane,height);
   // Outer apron and unbroken lower venue wall.
   quad(v,p(a,42,-.50),p(b,42,-.50),p(b,42,4.2),p(a,42,4.2),[.20,.24,.28],MAT_CONCRETE);
   quad(v,p(a,42,4.2),p(b,42,4.2),p(b,44,4.45),p(a,44,4.45),[.76,.79,.82],MAT_METAL);
   quad(v,p(a,44,3.1),p(b,44,3.1),p(b,44,3.9),p(a,44,3.9),accent,MAT_METAL);
   // Terraced seating, with visible stair bands and crowds. Width ~55 metres, 25m high.
   for(let row=0;row<rows;row++){
    const inner=48+row*6.0,outer=inner+6.0,h0=4.2+row*2.25,h1=h0+2.1;
    const seat:C=row%4===0?[.60,.65,.70]:row%4===1?[.15,.27,.40]:row%4===2?[.39,.13,.21]:[.24,.26,.29];
    quad(v,p(a,inner,h0),p(b,inner,h0),p(b,outer,h1),p(a,outer,h1),seat,MAT_METAL);
    quad(v,p(a,inner,h0),p(b,inner,h0),p(b,inner,h0+1.1),p(a,inner,h0+1.1),row%2?[.13,.17,.21]:[.17,.20,.24],MAT_CONCRETE);
    // Distant spectator sprites as low-poly silhouettes with bright team shirts and heads.
    // Built as world-space quads: 1/4 the geometry of box-based crowds.
    if(quality!=='low' && i%(quality==='high'?2:3)===0 && row<rows-1){
     const crowdCount=quality==='high'?10:quality==='balanced'?8:5;
     for(let j=0;j<crowdCount;j++){
      const f=mid+(j-(crowdCount-1)/2)/count*.21;
      const lane=inner+2.6+(j%2)*1.7;
      const feet=p(f,lane,h0+.1),shoulder=p(f,lane,h0+2.65);
      const a=place(f-.000135,side*lane),b=place(f+.000135,side*lane);
      const dx=(b.x-a.x)*.78,dz=(b.z-a.z)*.78;
      const shirt:C=j%6===0?[.93,.24,.29]:j%6===1?[.93,.85,.68]:j%6===2?[.26,.62,.90]:j%6===3?[.93,.72,.20]:j%6===4?[.65,.75,.80]:[.32,.71,.53];
      quad(v,{x:feet.x-dx,y:feet.y+.35,z:feet.z-dz},{x:feet.x+dx,y:feet.y+.35,z:feet.z+dz},{x:shoulder.x+dx*.70,y:shoulder.y,z:shoulder.z+dz*.70},{x:shoulder.x-dx*.70,y:shoulder.y,z:shoulder.z-dz*.70},shirt,MAT_BASIC);
      const head=p(f,lane,h0+2.88);
      quad(v,{x:head.x-dx*.45,y:head.y-.16,z:head.z-dz*.45},{x:head.x+dx*.45,y:head.y-.16,z:head.z+dz*.45},{x:head.x+dx*.45,y:head.y+.65,z:head.z+dz*.45},{x:head.x-dx*.45,y:head.y+.65,z:head.z-dz*.45},[.72,.57,.43],MAT_BASIC);
     }
    }
   }
   const back=48+rows*6;
   const roofHeight=8+rows*2.45;
   // G3.9: tall, visible crowd flags. Each is a *subdivided cloth mesh*, rather than
   // static metallic triangles. Fractions stored in MAT_FLAG encode how free each
   // vertex is to flap in the GPU shader; pole-side vertices never move.
   const flagGap=quality==='high'?2:quality==='balanced'?3:6;
   if(i%flagGap===0){
    const poleLane=(i%4===0?45:back+7.4);
    const poleHeight=roofHeight+10.1;
    const mast=ground(mid,side*poleLane,0);
    box(v,mast.x,mast.y,mast.z,.24,poleHeight,.24,[.57,.62,.68],yawFor(mid),MAT_METAL);
    // Broad 12-15 metre banners, 6 metres high, coloured by team sector.
    const red:C=[.92,.14,.21],blue:C=[.12,.39,.87],white:C=[.93,.94,.96],gold:C=[.97,.76,.18],green:C=[.11,.60,.37];
    const palette:C[]=i%5===0?[red,white,red]:i%5===1?[blue,white,blue]:i%5===2?[gold,red,gold]:i%5===3?[green,white,green]:[white,red,blue];
    const banner=(u:number,v0:number)=>ground(mid+u*.00175,side*poleLane,poleHeight-.8-v0*6.5 + .12*Math.sin(u*7.));
    const sections=quality==='high'?9:quality==='balanced'?7:5;
    for(let stripe=0;stripe<3;stripe++){
     const y0=stripe/3,y1=(stripe+1)/3;
     for(let seg=0;seg<sections;seg++){
      const u0=seg/sections,u1=(seg+1)/sections;
      wavingFlagQuad(v,banner(u0,y0),banner(u1,y0),banner(u1,y1),banner(u0,y1),palette[stripe],u0*.93,u1*.93,u1*.93,u0*.93);
     }
    }
    // Two contrasting borders also flutter with the body of the cloth.
    for(const edge of [0,1])for(let seg=0;seg<sections;seg++){
     const u0=seg/sections,u1=(seg+1)/sections;
     const e0=edge===0?0:.97,e1=edge===0?.03:1;
     wavingFlagQuad(v,banner(u0,e0),banner(u1,e0),banner(u1,e1),banner(u0,e1),gold,u0*.93,u1*.93,u1*.93,u0*.93);
    }
   }
   // Tall silhouette behind spectators hides the empty field beyond the track.
   quad(v,p(a,back,0),p(b,back,0),p(b,back,4+rows*2.4),p(a,back,4+rows*2.4),[.15,.19,.24],MAT_CONCRETE);
   // Floating canopy and glowing red/white outer fascia run the full stand length.
   quad(v,p(a,44,roofHeight),p(b,44,roofHeight),p(b,back+5,roofHeight+4.1),p(a,back+5,roofHeight+4.1),[.22,.27,.32],MAT_METAL);
   quad(v,p(a,44,roofHeight-.13),p(b,44,roofHeight-.13),p(b,44,roofHeight+.12),p(a,44,roofHeight+.12),i%4===0?[.92,.91,.84]:accent,MAT_GLOW);
   if(i%4===0){
    // Vertical structural ribs / glass boxes near every 100 metres.
    const f=mid,q=place(f,side*(back-3)),z=yawFor(f);
    box(v,q.x,q.y+1.0,q.z,.32,roofHeight,1.1,[.43,.48,.54],z,MAT_METAL);
    const cam=place(f,side*40);
    box(v,cam.x,cam.y+8.0,cam.z,1.8,.8,1.9,[.15,.19,.25],z,MAT_METAL);
    box(v,cam.x,cam.y+8.8,cam.z,.8,.65,.8,[.55,.76,.82],z,MAT_GLASS);
   }
  }
 }
}
function venuePitBuilding(v:Vertex,quality:KartGraphics){
 // Proper two-storey pit building and hospitality deck behind the working pit lane.
 for(let bay=0;bay<24;bay++){
  const f=wrap(.976+bay*.00315),p=place(f,62),angle=yawFor(f);
  const red:C=bay%4===0?[.83,.15,.24]:[.54,.60,.67];
  box(v,p.x,p.y-1.25,p.z,12,.70,10,[.22,.24,.26],angle,MAT_ASPHALT);
  box(v,p.x,p.y-.6,p.z,12,6.9,10,[.33,.38,.43],angle,MAT_CONCRETE);
  box(v,p.x,p.y+5.6,p.z,12,1.7,10,[.63,.74,.80],angle,MAT_GLASS);
  box(v,p.x,p.y+7.3,p.z,12,4.0,10,[.20,.28,.34],angle,MAT_CONCRETE);
  box(v,p.x,p.y+11.3,p.z,13,.75,11,[.70,.74,.78],angle,MAT_METAL);
  box(v,p.x,p.y+12.15,p.z,13,.16,11,red,angle,MAT_GLOW);
  if(bay%2===0){
   const q=place(f,53);
   box(v,q.x,q.y-.65,q.z,7,4.7,4.2,[.15,.17,.19],angle,MAT_CONCRETE);
   box(v,q.x,q.y+2.85,q.z,6.4,.18,3.6,[.83,.17,.25],angle,MAT_GLOW);
  }
  if(quality!=='low'&&bay%3===0){
   const q=place(f,66);
   box(v,q.x,q.y+12.15,q.z,8,2.7,8,[.18,.30,.41],angle,MAT_GLASS);
   box(v,q.x,q.y+14.8,q.z,8.4,.28,8.4,[.80,.83,.85],angle,MAT_METAL);
  }
 }
 // Race control tower beside the start grid, camera-facing glass.
 const ct=place(.992,-100),yaw=yawFor(.992);
 box(v,ct.x,ct.y-1.5,ct.z,25,17.0,20,[.23,.28,.34],yaw,MAT_CONCRETE);
 for(let level=0;level<4;level++){
  box(v,ct.x,ct.y+1.4+level*3.6,ct.z,26,.75,21,[.67,.74,.81],yaw,MAT_GLASS);
  box(v,ct.x,ct.y+2.3+level*3.6,ct.z,24.7,.26,20.8,level%2?[.81,.17,.25]:[.17,.54,.83],yaw,MAT_GLOW);
 }
 box(v,ct.x,ct.y+15.5,ct.z,30,2.4,24,[.18,.21,.26],yaw,MAT_METAL);
}
function buildWorld(quality:KartGraphics='balanced'):Vertex{
 const v:Vertex=[];
 // Dark stadium sub-base: no distant grass meadow or triangular mountain peaks.
 quad(v,{x:-1800,y:-8,z:-1800},{x:1800,y:-8,z:-1800},{x:1800,y:-8,z:1800},{x:-1800,y:-8,z:1800},[.13,.15,.16],MAT_CONCRETE);
 const N=quality==='low'?310:quality==='high'?820:550;
 const strip=(a:number,b:number,left:number,right:number,rise:number,color:C,mat:number)=>{
  const aa=place(a,left),ab=place(a,right),bb=place(b,right),ba=place(b,left);
  aa.y+=rise;ab.y+=rise;bb.y+=rise;ba.y+=rise;
  quad(v,aa,ab,bb,ba,color,mat);
 };
 for(let i=0;i<N;i++){
  const a=i/N,b=(i+1)/N;
  // Entire route now has generous paved race-venue aprons instead of grass.
  strip(a,b,-46,-17,-.29,[.19,.20,.22],MAT_CONCRETE);
  strip(a,b,17,46,-.29,[.19,.20,.22],MAT_CONCRETE);
  strip(a,b,-29,-24,-.04,[.16,.18,.19],MAT_ASPHALT);
  strip(a,b,24,29,-.04,[.16,.18,.19],MAT_ASPHALT);
  if(wrap(a)>.962||wrap(a)<.052){
   strip(a,b,17,23,.035,[.14,.15,.16],MAT_ASPHALT);
   strip(a,b,18.4,18.65,.148,[.89,.87,.82],MAT_KERB);
  }
  strip(a,b,-17,-15.4,.028,[.24,.26,.27],MAT_ASPHALT);
  strip(a,b,15.4,17,.028,[.24,.26,.27],MAT_ASPHALT);
  strip(a,b,-15.4,-14.25,.145,Math.floor(i/7)%2?[.93,.92,.88]:[.74,.10,.15],MAT_KERB);
  strip(a,b,14.25,15.4,.145,Math.floor(i/7)%2?[.93,.92,.88]:[.74,.10,.15],MAT_KERB);
  // Original Graphics 2.0 atlas material and albedo on road (high resolution asphalt).
  strip(a,b,-14.25,14.25,.105,[.36,.37,.39],MAT_ASPHALT);
  strip(a,b,-14.12,-13.99,.124,[.88,.88,.84],MAT_BASIC);
  strip(a,b,13.99,14.12,.124,[.88,.88,.84],MAT_BASIC);
  if(quality!=='low'&&i%9===0)for(const side of [-1,1])strip(a,b,side*13.2-.12,side*13.2+.12,.144,[.65,.66,.64],MAT_BASIC);
  if(quality!=='low'&&i%4!==0){
   const rubber=.025*Math.sin(i*.35);
   strip(a,b,-2.8+rubber,-2.70+rubber,.129,[.20,.20,.21],MAT_ASPHALT);
   strip(a,b,2.5-rubber,2.57-rubber,.129,[.20,.20,.21],MAT_ASPHALT);
  }
  if(i%Math.max(3,Math.round(N/140))===0){
   for(const side of [-1,1]){
    const q=place(a,side*24),y=yawFor(a);
    box(v,q.x,q.y-.36,q.z,.24,1.06,TRACK_LENGTH/N*2.4,[.47,.50,.53],y,MAT_METAL);
    box(v,q.x,q.y+.69,q.z,.30,.15,TRACK_LENGTH/N*2.4,[.86,.86,.85],y,MAT_METAL);
    if(i%Math.max(14,Math.round(N/32))===0){
     const f=place(a,side*31);
     box(v,f.x,f.y-.5,f.z,.35,7.8,.35,[.37,.43,.48],y,MAT_METAL);
     box(v,f.x,f.y+3.4,f.z,.24,6.0,1.5,[.42,.47,.51],y,MAT_GLASS);
    }
   }
  }
  // Service-lane stripes reinforce the sense of a professional motorsport complex.
  if(i%16<8){
   for(const side of [-1,1])strip(a,b,side*26.6-.12,side*26.6+.12,-.01,[.78,.76,.66],MAT_KERB);
  }
 }
 // 22 starting boxes and checkerboard finish line.
 for(let k=0;k<22;k++){
  const progress=wrap(-.0016-k*.00098),lane=k%2===0?-4.5:4.5,half=2.25;
  strip(progress-.00034,progress+.00034,lane-half,lane-half+.14,.155,[.88,.90,.88],MAT_BASIC);
  strip(progress-.00034,progress+.00034,lane+half-.14,lane+half,.155,[.88,.90,.88],MAT_BASIC);
  strip(progress-.00034,progress-.00030,lane-half,lane+half,.155,[.88,.90,.88],MAT_BASIC);
 }
 for(let l=-13;l<13;l+=2)for(let row=0;row<2;row++)if((Math.floor((l+13)/2)+row)%2===0)
  strip(.9996+row*.00026,.99986+row*.00026,l,l+2,.16,[.92,.92,.90],MAT_BASIC);
 for(const side of [-1,1]){
  const p=place(0,side*26);box(v,p.x,p.y-.8,p.z,.9,12.3,.9,[.18,.20,.24],yawFor(0),MAT_METAL);
 }
 const cp=pt(0);
 box(v,cp.x,cp.y+10.3,cp.z,53,1.15,2.5,[.18,.21,.25],yawFor(0),MAT_METAL);
 for(let l=-8;l<=8;l+=4){const pp=place(0,l);box(v,pp.x,pp.y+9.55,pp.z,1.8,1,.48,[.06,.065,.07],yawFor(0),MAT_METAL);}
 stadiumRibbon(v,quality);
 venuePitBuilding(v,quality);
 // Camera nests and television production platforms, distributed at spectator decks.
 for(let i=0;i<36;i++){
  const progress=(i+.5)/36,side=i%2?1:-1;
  if(side===1&&(progress>.942||progress<.05))continue;
  const base=place(progress,side*40),a=yawFor(progress);
  box(v,base.x,base.y-.9,base.z,.9,12.0,.9,[.28,.32,.36],a,MAT_METAL);
  box(v,base.x,base.y+11.1,base.z,5.5,.6,3.8,[.18,.21,.26],a,MAT_METAL);
  box(v,base.x,base.y+11.5,base.z,2.0,1.2,1.8,[.49,.72,.84],a,MAT_GLASS);
  // Small road lamps removed: the overhead broadcast floodlight rigs provide track illumination.
 }
 // G4.0.2: true Grand Prix-style overhead stadium floodlight arrays (36m masts).
 // Large multi-row LED banks illuminate the circuit from above, not like streetlights.
 for(let i=0;i<FLOOD_SITES.length;i++){
  if(!floodSiteVisible(i,quality))continue;
  const {progress,pole,head,side}=FLOOD_SITES[i],angle=yawFor(progress),h=36.0;
  const steel:C=[.40,.46,.52],coldWhite:C=[1.0,.985,.90];
  const tt=tangent(progress);
  const beam=(a:Vec,b:Vec,w:number,col:C)=>{

   // Angled truss is drawn with actual 3D triangles; body is a vertical tower.
   const along={x:tt.x*w*.5,z:tt.z*w*.5};
   tri(v,{x:a.x-along.x,y:a.y,z:a.z-along.z},{x:a.x+along.x,y:a.y,z:a.z+along.z},{x:b.x+along.x,y:b.y,z:b.z+along.z},col,MAT_METAL);
   tri(v,{x:a.x-along.x,y:a.y,z:a.z-along.z},{x:b.x+along.x,y:b.y,z:b.z+along.z},{x:b.x-along.x,y:b.y,z:b.z-along.z},col,MAT_METAL);
  };
  box(v,pole.x,pole.y-.6,pole.z,3.2,1.1,3.2,[.24,.29,.34],angle,MAT_CONCRETE);
  // Triangulated 4-leg tower silhouette with cross braces.
  for(const sign of [-1,1]){
   const root=place(progress,side*43+sign*1.30);
   cylinder(v,root.x,root.y,root.z,.21,h,steel,7,MAT_METAL);
  }
  for(let j=0;j<6;j++){
   const y=pole.y+5+j*5.0;
   box(v,pole.x,y,pole.z,2.6,.16,.23,[.52,.59,.65],angle,MAT_METAL);
   box(v,pole.x,y+1.8,pole.z,.22,.16,2.4,[.34,.40,.46],angle,MAT_METAL);
  }
  // Cantilever rises from mast toward lane centre, far beyond the old low street-lamp reach.
  const neck=place(progress,side*32);
  beam({x:pole.x,y:pole.y+h-1,z:pole.z},{x:head.x,y:head.y+h-3,z:head.z},.84,[.63,.68,.72]);
  box(v,neck.x,neck.y+h-2.5,neck.z,1.25,.26,17,[.52,.58,.64],angle,MAT_METAL);
  // 17 metre wide stadium floodlight rack, with 18 separately illuminated reflectors.
  box(v,head.x,head.y+h-4.25,head.z,17.8,4.65,3.25,[.13,.17,.21],angle,MAT_METAL);
  box(v,head.x,head.y+h-4.0,head.z,18.2,.24,3.5,[.49,.57,.64],angle,MAT_METAL);
  for(let row=0;row<3;row++)for(let col=0;col<6;col++){
   const along=(col-2.5)*2.78, px=head.x+tt.x*along,pz=head.z+tt.z*along;
   const ledY=head.y+h-3.85+row*1.25;
   box(v,px,ledY,pz,2.24,.94,1.8,[.54,.60,.66],angle,MAT_METAL);
   box(v,px,ledY+.07,pz,1.98,.78,1.88,coldWhite,angle,MAT_GLOW);
   box(v,px,ledY+.08,pz,1.24,.82,1.98,[.93,.97,1.0],angle,MAT_GLOW);
  }
 }
 // Spectator roof lighting: stadium-style linear LED banks over the grandstand front.
 for(let i=0;i<20;i++){
  const p=(i+.65)/20,side=i%2?1:-1,a=yawFor(p);
  const s=place(p,side*43);
  box(v,s.x,s.y+25.4,s.z,17.2,.36,2.2,[.25,.30,.35],a,MAT_METAL);
  box(v,s.x,s.y+25.1,s.z,16.1,.18,1.8,[1.0,.97,.86],a,MAT_GLOW);
 }
 // A few substantial over-track light gantries make the circuit read like a lit Grand Prix venue.
 for(let i=0;i<8;i++){
  const p=(i+.4)/8,a=yawFor(p),left=place(p,-33),right=place(p,33),center=place(p,0);
  for(const end of [left,right]){
   box(v,end.x,end.y-.4,end.z,1.5,32.8,1.5,[.37,.43,.49],a,MAT_METAL);
   box(v,end.x,end.y+9.0,end.z,1.85,.17,2.2,[.52,.60,.67],a,MAT_METAL);
  }
  box(v,center.x,center.y+32.0,center.z,1.25,1.15,68.0,[.35,.41,.47],a,MAT_METAL);
  for(let lane=-21;lane<=21;lane+=7){
   const fixture=place(p,lane);
   box(v,fixture.x,fixture.y+30.85,fixture.z,3.5,.92,3.3,[.48,.55,.60],a,MAT_METAL);
   box(v,fixture.x,fixture.y+30.65,fixture.z,3.10,.37,3.1,[1.0,.99,.92],a,MAT_GLOW);
  }
 }
 // Industrial venue fences and consistent sponsor gantries at technical sectors.
 for(const progress of [.08,.21,.37,.55,.72,.86]){
  const p=pt(progress);
  archway(v,p.x,p.y-.35,p.z,51,12.8,1.8,yawFor(progress),[.22,.25,.30],[.89,.17,.25]);
 }
 return v;
}
function billboardGeometry(quality:KartGraphics):Float32Array{
 const arr:number[]=[];
 const push=(p:Vec,u:number,v:number)=>{arr.push(p.x,p.y,p.z,u,v)};
 const sign=(progress:number,lane:number,w:number,h:number,index:number,cross=false,lift=0)=>{
  const p=place(progress,lane),tan=tangent(progress);
  const horizontal=cross?{x:-tan.z,z:tan.x}:{x:tan.x,z:tan.z};
  const centerY=p.y+h*.62+lift;
  const left={x:p.x-horizontal.x*w/2,y:centerY-h/2,z:p.z-horizontal.z*w/2};
  const right={x:p.x+horizontal.x*w/2,y:centerY-h/2,z:p.z+horizontal.z*w/2};
  const topL={x:left.x,y:left.y+h,z:left.z},topR={x:right.x,y:right.y+h,z:right.z};
  const row=index%4,a=row*.25+.005,b=(row+1)*.25-.005;
  push(left,0,b);push(right,1,b);push(topR,1,a);push(left,0,b);push(topR,1,a);push(topL,0,a);
 };
 const n=quality==='low'?14:quality==='high'?42:30;
 for(let i=0;i<n;i++)sign(.028+i/n*.94,i%2?-30:30,8.8,2.35,i%4,false,.72);
 sign(0,0,44,3.4,0,true,13.9);
 sign(.5,0,20,1.75,1,true,10.2);
 for(let i=0;i<5;i++)sign(.90+i*.014,72,10.4,2.55,(i+1)%4,false,1.4);
 for(let i=0;i<5;i++)sign(.22+i*.17,-72,10.4,2.55,(i+2)%4,false,1.4);
 for(const prog of [.12,.31,.53,.79])sign(prog,0,24,1.65,2,true,9.8);
 return new Float32Array(arr);
}
function makeSponsorAtlas():HTMLCanvasElement{
 const cvs=document.createElement('canvas');cvs.width=512;cvs.height=512;
 const ctx=cvs.getContext('2d');if(!ctx)throw Error('Pist tabela Ã§izimi desteklenmiyor');
 const rows:[string,string,string,string,string][]=[
  ['#140f16','#ffffff','F1 SOCIAL','OFFICIAL TRACKSIDE PARTNER','#ef304c'],
  ['#131c2a','#f4f7fb','KART RUSH 3D','NIGHT GRAND PRIX','#71c8ff'],
  ['#1e232b','#fff3c2','PIT ENTRY','PRECISION + CONTROL','#f1c15d'],
  ['#edf1f4','#182432','APEX CLUB','FULL SEND Â· NO LIFT','#ef304c']
 ];
 rows.forEach((r,i)=>{
  const y=i*128;
  const grad=ctx.createLinearGradient(0,y,512,y+128);
  grad.addColorStop(0,r[0]);
  grad.addColorStop(1,i===0?'#3a0d16':i===1?'#10253d':i===2?'#2d2412':'#cfd8e0');
  ctx.fillStyle=grad;ctx.fillRect(0,y,512,128);
  ctx.fillStyle='rgba(255,255,255,.045)';
  for(let stripe=0;stripe<9;stripe++)ctx.fillRect(-20+stripe*66,y+18+stripe%2*6,54,2);
  ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(0,y,512,24);
  ctx.fillStyle=r[4];ctx.fillRect(0,y,14,128);ctx.fillRect(498,y,14,128);
  ctx.strokeStyle='rgba(255,255,255,.16)';ctx.strokeRect(19.5,y+14.5,473,99);
  ctx.fillStyle=r[1];ctx.font=i===0?'900 62px Arial, sans-serif':'900 54px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(r[2],256,y+50,470);
  ctx.font='900 18px Arial, sans-serif';ctx.fillText(r[3],256,y+90,440);
  ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(42,y+102,428,1);
  ctx.fillStyle=r[4];ctx.fillRect(42,y+110,428,4);
  if(i===0){
   ctx.fillStyle='rgba(255,255,255,.95)';
   ctx.beginPath();ctx.moveTo(60,y+74);ctx.lineTo(112,y+28);ctx.lineTo(188,y+28);ctx.lineTo(136,y+74);ctx.closePath();ctx.fill();
   ctx.fillRect(96,y+74,84,12);
  }
 });
 return cvs;
}
const SIGN_VERT=`attribute vec3 aPosition;attribute vec2 aUV;uniform mat4 uViewProj;varying vec2 vUV;varying float vFog;
void main(){vec4 pos=uViewProj*vec4(aPosition,1.);gl_Position=pos;vUV=aUV;vFog=clamp((pos.w-100.)/180.,0.,.72);}`;
const SIGN_FRAG=`precision mediump float;varying vec2 vUV;varying float vFog;uniform sampler2D uTexture;
void main(){vec4 c=texture2D(uTexture,vUV);gl_FragColor=vec4(c.rgb,1.);}`;
// Fragment pipeline: fog, directional sun + cool sky fill, rough asphalt, grass and water microdetail.
// No external textures or network requests: all surface variation is generated on the GPU.
const VERT=`attribute vec3 aPos;attribute vec3 aColor;attribute vec3 aNormal;attribute float aMat;
uniform mat4 uViewProj;uniform float uTime;
varying vec3 vColor;varying vec3 vNormal;varying vec3 vWorld;varying float vDistance;varying float vMat;
void main(){
 vec3 position=aPos;
 if(aMat>11.95&&aMat<13.0){
  // Wave amplitude grows from the pole to the free edge; includes a secondary flutter.
  float freeEdge=clamp((aMat-12.0)/.93,0.0,1.0);
  float phase=uTime*3.6+aPos.x*.18+aPos.z*.12+aPos.y*.08;
  float flutter=sin(phase)+.38*sin(phase*1.74+1.05);
  position.y+=freeEdge*freeEdge*(1.08*flutter);
  position.x+=freeEdge*(.44*sin(phase*.81+1.13));
  position.z+=freeEdge*(.62*cos(phase*.91+.43));
 }
 vec4 p=uViewProj*vec4(position,1.0);
 gl_Position=p;vColor=aColor;vNormal=aNormal;vWorld=position;vDistance=p.w;vMat=aMat;
}`;

const FRAG=`precision highp float;
varying vec3 vColor;varying vec3 vNormal;varying float vDistance;varying float vMat;varying vec3 vWorld;
uniform float uTime;uniform float uDetail;uniform float uAtlasReady;uniform float uRain;
uniform sampler2D uAlbedoAtlas;uniform sampler2D uNormalRoughAtlas;
uniform vec3 uCameraPos;
uniform vec4 uFloodLights[4]; // x, z, radius, intensity
uniform vec4 uBrakeLights[4]; // x, z, radius, intensity
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} 
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);} 
vec2 atlasUv(float idx,vec2 worldUv){
 float column=mod(idx,4.0),row=floor(idx/4.0);
 return (vec2(column,row)+.004+.992*fract(worldUv))/vec2(4.0,2.0);
}
void main(){
 float kind=floor(vMat+.01);
 vec3 n=normalize(vNormal);
 vec3 sunlight=normalize(vec3(-.40,1.35,-.28));
 vec3 skylight=normalize(vec3(.18,1.00,.35));
 vec3 albedo=vColor;
 float roughness=.82;
 bool asphalt=(kind>1.5&&kind<2.5);
 bool grass=(kind>.5&&kind<1.5);
 bool metal=(kind>2.5&&kind<3.5);
 bool glow=(kind>3.5&&kind<4.5);
 bool glass=(kind>4.5&&kind<5.5);
 bool water=(kind>5.5&&kind<6.5);
 bool carbon=(kind>7.5&&kind<8.5);
 bool tyre=(kind>8.5&&kind<9.5);
 bool kerb=(kind>9.5&&kind<10.5);
 bool concrete=(kind>10.5&&kind<11.5);
 if(uAtlasReady>.5&&uDetail>.05&&(asphalt||grass||metal||carbon||tyre||kerb||concrete)){
  float texId=asphalt?0.0:grass?1.0:carbon?2.0:tyre?3.0:kerb?4.0:metal?5.0:7.0;
  float meters=asphalt?4.1:grass?5.2:carbon?.55:tyre?.88:kerb?1.7:metal?2.5:3.0;
  vec3 a=abs(n);
  vec2 coord=a.y>.62?vWorld.xz:(a.z>a.x?vWorld.xy:vWorld.zy);
  vec2 uv=atlasUv(texId,coord/meters);
  vec3 texColor=texture2D(uAlbedoAtlas,uv).rgb;
  vec4 normalRoughSample=texture2D(uNormalRoughAtlas,uv);
  vec2 perturb=normalRoughSample.xy*2.0-1.0;
  if(a.y>.62){n=normalize(n+vec3(perturb.x,0.0,perturb.y)*(asphalt?.34:grass?.38:.20));}
  else{n=normalize(n+vec3(perturb.x,perturb.y,0.0)*.13);}
  roughness=normalRoughSample.a;
  if(asphalt){albedo=mix(vColor,texColor*vec3(.82,.84,.88),.92);} 
  else if(grass){albedo=mix(vColor,texColor*vec3(.58,.62,.56),.82);} 
  else if(kerb){albedo*=.56+dot(texColor,vec3(.333))*.72;} 
  else if(tyre){albedo=mix(vColor,texColor*vec3(.14,.14,.15),.62);} 
  else if(carbon){albedo*=.54+dot(texColor,vec3(.333))*1.10;} 
  else if(metal){albedo*=.70+dot(texColor,vec3(.333))*.48;} 
  else if(concrete){albedo=mix(vColor,texColor*.70,.78);} 
 }else{
  if(asphalt){float a=noise(vWorld.xz*.60)*.16;float b=noise(vWorld.xz*23.0)*.12;float c=noise(vWorld.xz*74.0)*.035;albedo*=.76+a+b+c;}
  if(grass){albedo*=.70+noise(vWorld.xz*1.4)*.28+noise(vWorld.xz*7.0)*.08;}
  if(carbon){albedo*=.92;}
 }
 if(asphalt){
  float rubber=noise(vWorld.xz*.18+vec2(6.2,3.4))*noise(vWorld.xz*1.25+vec2(1.3,8.6));
  float grain=noise(vWorld.xz*24.0+vec2(3.7,1.2))*.070+noise(vWorld.xz*71.0+vec2(9.4,5.1))*.028;
  float pebble=noise(vWorld.xz*132.0+vec2(2.1,7.4))*.016;
  albedo*=(.94+grain+pebble)*(1.0-rubber*(uRain>.5?.022:.120));
 }
 if(concrete){
  float dust=noise(vWorld.xz*11.0+vec2(4.0,8.0))*.08;
  float wear=noise(vWorld.xz*37.0+vec2(1.8,5.2))*.03;
  albedo*=.95+dust+wear;
 }
 if(kerb){
  float wear=noise(vWorld.xz*14.0+vec2(8.0,2.0))*.07;
  albedo*=.95+wear;
 }
 if(grass){
  float patch=noise(vWorld.xz*4.2+vec2(3.3,9.9))*.10;
  albedo*=.94+patch;
 }
 if(metal){roughness=.32;}
 if(carbon){roughness=.38;}
 if(glass){roughness=.17;albedo=mix(albedo,vec3(.43,.72,.87),.24);} 
 if(tyre){roughness=.94;}
 if(glow){albedo*=1.14;}
 if(water){albedo*=.78+.34*noise(vWorld.xz*.26+vec2(uTime*.08));}
 float direct=max(0.,dot(n,sunlight));
 float ambient=max(0.,dot(n,skylight));
 float lightAmount=(.70+.86*direct+.24*ambient)*mix(1.0,.53,uRain);
 if(uRain>.5){
  // Wet race: asphalt keeps its natural tone and only gets slightly darker/glossier.
  if(asphalt){
   albedo*=vec3(.95,.95,.96);
   roughness=mix(roughness,.08,.92);
  }else if(kerb||concrete){
   roughness=mix(roughness,.66,.10);
  }else if(metal||carbon){
   roughness*=.92;
  }
 }
 vec3 color=albedo*lightAmount;
 vec3 viewDir=normalize(uCameraPos-vWorld);
 vec3 halfway=normalize(sunlight+viewDir);
 float gloss=1.0-roughness;
 float shininess=mix(12.0,92.0,gloss);
 float specular=pow(max(dot(n,halfway),0.),shininess);
 float metalLevel=(metal||carbon)?.70:(glass?.45:.075);
 color+=vec3(1.0,.87,.73)*specular*(metalLevel+uRain*(asphalt?.30:concrete?.04:kerb?.05:.03))*(.3+.70*gloss);
 float rim=pow(1.0-max(0.,dot(n,viewDir)),3.0);
 color+=vec3(.15,.21,.26)*rim*(metal||carbon?.14:.035);
 if(glass){color+=vec3(.035,.07,.085);}
 if(glow){color+=albedo*.33;}
 if(asphalt||kerb||concrete||grass||water){
  float lamps=0.0;
  for(int i=0;i<4;i++){
   float d=length(vWorld.xz-uFloodLights[i].xy);
   float spot=max(0.0,1.0-d/max(1.0,uFloodLights[i].z));
   lamps+=spot*spot*uFloodLights[i].w;
  }
  float horizontal=clamp(n.y*.7+.30,0.,1.);
  vec3 stadiumWhite=vec3(.91,.95,1.00);
  if(uRain>.5){
   color+=stadiumWhite*lamps*horizontal*1.10*(asphalt?1.0:kerb?.48:concrete?.26:.12);
   if(asphalt){
    float streak=(.58+.28*noise(vWorld.xz*1.7));
    color+=vec3(.72,.78,.86)*lamps*lamps*streak*.08;
   }
  }
  float brakes=0.0;
  for(int i=0;i<4;i++){
   float d=length(vWorld.xz-uBrakeLights[i].xy);
   float pool=max(0.0,1.0-d/max(1.0,uBrakeLights[i].z));
   brakes+=pool*pool*uBrakeLights[i].w;
  }
  if(uRain>.5){color+=vec3(1.0,.035,.018)*brakes*horizontal*(asphalt?1.18:.08);}
 }
 if(uRain>.5&&asphalt){
  float riv=noise(vWorld.xz*2.1+vec2(uTime*.03,-uTime*.05));
  color+=vec3(.06,.08,.09)*smoothstep(.74,1.0,riv)*.12;
 }
 // Rain alone has atmospheric fog; clear weather retains crisp distant detail.
 if(uRain>.5){
  float fog=1.0-exp(-pow(max(0.0,vDistance-65.0)/300.0,1.32));
  vec3 fogColor=vec3(.24,.31,.40);
  color=mix(color,fogColor,clamp(fog,0.,.84));
 }
 if(uRain>.5){
  vec2 suv=gl_FragCoord.xy/vec2(1280.0,720.0);
  float lens=0.0;
  vec2 q1=fract(vec2(suv.x*8.0+noise(vec2(suv.y*5.0,1.3)),suv.y*5.2-uTime*.12));
  lens+=smoothstep(.34,.0,length((q1-vec2(.52,.58))*vec2(.85,2.6))-.08)*.55;
  vec2 q2=fract(vec2(suv.x*5.5+1.7,suv.y*3.8-uTime*.08));
  lens+=smoothstep(.28,.0,length((q2-vec2(.35,.44))*vec2(.70,2.2))-.06)*.42;
  float streak=step(.985,noise(vec2(floor(suv.x*42.0),floor(suv.y*16.0-uTime*8.0))));
  lens=clamp(lens+streak*.22,0.,1.0);
  color=mix(color,color*0.84+vec3(.14,.17,.19),lens*.20);
  color+=vec3(.20,.24,.28)*lens*.10;
 }
 color=(color*(2.51*color+.03))/(color*(2.43*color+.59)+.14);
 gl_FragColor=vec4(pow(clamp(color,0.,1.),vec3(.96)),1.0);
}`;
const SKY_VERT=`attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;

const SKY_FRAG=`precision mediump float;varying vec2 vUv;uniform float uTime;uniform float uYaw;uniform float uRain;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.;v+=n(p)*.52;p*=2.03;v+=n(p)*.27;p*=2.01;v+=n(p)*.13;p*=2.08;v+=n(p)*.08;return v;}
void main(){
 float y=clamp(vUv.y,0.,1.);float wx=vUv.x+uYaw*.159155;
 vec3 col;
 if(uRain<.5){
  // Clear daytime Formula circuit: bright sun, rich blue sky and scattered white cumulus.
  vec3 horizon=vec3(.65,.85,1.0),middle=vec3(.21,.56,.92),zenith=vec3(.035,.24,.65);
  col=mix(horizon,middle,smoothstep(.03,.55,y));
  col=mix(col,zenith,smoothstep(.46,1.0,y));
  float p1=fbm(vec2(wx*5.2+uTime*.00026,y*10.5+4.));
  float p2=fbm(vec2(wx*12.0-uTime*.00045,y*18.0+10.));
  float cumulus=smoothstep(.49,.65,p1*.78+p2*.22);
  float cloudBand=smoothstep(.21,.38,y)*(1.-smoothstep(.80,.98,y));
  float cloudMask=cumulus*cloudBand;
  vec3 cloudShade=mix(vec3(.72,.85,.96),vec3(1.0,1.0,1.0),smoothstep(.44,.72,p1));
  col=mix(col,cloudShade,cloudMask*.94);
  // Sun stays in world space as the car turns. Crisp white disk plus golden corona.
  float sunX=abs(fract(wx-.22+.5)-.5);
  float sunD=length(vec2(sunX*1.72,(y-.76)*1.5));
  float sunHalo=exp(-sunD*12.0);
  float sunCore=1.-smoothstep(.023,.041,sunD);
  col+=vec3(1.0,.91,.69)*sunHalo*.54;
  col=mix(col,vec3(1.0,.99,.90),sunCore);
 }else{
  // Rain weather: heavy overcast layers, cold gray storm light, low moving rain cloudbanks.
  vec3 dark=vec3(.065,.092,.133),low=vec3(.22,.27,.32),bottom=vec3(.32,.39,.45);
  col=mix(bottom,low,smoothstep(.0,.28,y));
  col=mix(col,dark,smoothstep(.35,.95,y));
  float f1=fbm(vec2(wx*5.0+uTime*.0028,y*9.0));
  float f2=fbm(vec2(wx*12.0-uTime*.0040,y*17.0+7.8));
  float heavy=smoothstep(.31,.69,f1*.77+f2*.23);
  float band=1.-smoothstep(.66,.98,y);
  col=mix(col,mix(vec3(.26,.30,.36),vec3(.47,.52,.56),f2),heavy*band*.72);
  float mist=fbm(vec2(wx*6.-uTime*.014,y*12.+3.));
  col=mix(col,vec3(.51,.57,.61),smoothstep(.50,.78,mist)*(1.-smoothstep(.11,.47,y))*.25);
  float rainNear=step(.973,h(floor(vec2(vUv.x*365.,(y+uTime*.62)*135.))));
  float rainFar=step(.988,h(floor(vec2(vUv.x*640.+17.,(y+uTime*.88)*215.))));
  col+=vec3(.37,.42,.49)*rainNear*.57;
  col+=vec3(.43,.48,.55)*rainFar*.34;
 }
 gl_FragColor=vec4(clamp(col,0.,1.),1.);
}`;
function shader(gl:WebGLRenderingContext,type:number,src:string){const s=gl.createShader(type);if(!s)throw Error('Shader oluÅŸturulamadÄ±');gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Shader derlenemedi');return s;}
function projection(fov:number,aspect:number,near:number,far:number){const m=new Float32Array(16),f=1/Math.tan(fov/2);m[0]=f/aspect;m[5]=f;m[10]=(far+near)/(near-far);m[11]=-1;m[14]=2*far*near/(near-far);return m;}
function lookAt(eye:Vec,target:Vec):Float32Array{
 const sub=(a:Vec,b:Vec)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});const norm=(a:Vec)=>{const d=Math.hypot(a.x,a.y,a.z)||1;return{x:a.x/d,y:a.y/d,z:a.z/d}};
 const cross=(a:Vec,b:Vec)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
 const z=norm(sub(eye,target)),x=norm(cross({x:0,y:1,z:0},z)),y=cross(z,x),m=new Float32Array(16);
 m[0]=x.x;m[1]=y.x;m[2]=z.x;m[4]=x.y;m[5]=y.y;m[6]=z.y;m[8]=x.z;m[9]=y.z;m[10]=z.z;m[12]=-x.x*eye.x-x.y*eye.y-x.z*eye.z;m[13]=-y.x*eye.x-y.y*eye.y-y.z*eye.z;m[14]=-z.x*eye.x-z.y*eye.y-z.z*eye.z;m[15]=1;return m;
}
function mul(a:Float32Array,b:Float32Array){const r=new Float32Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++){let x=0;for(let k=0;k<4;k++)x+=a[k*4+row]*b[c*4+k];r[c*4+row]=x;}return r;}
function ellipseShadow(v:Vertex,pos:Vec,yaw:number,r:number,a:number){
 // Layered ground shadow, slightly blue; opaque surface remains deterministic with depth enabled.
 for(let j=0;j<2;j++){
  const width=r*(1+j*.17),length=(r+1.30)*(1+j*.12),yy=pos.y+.052-j*.008;
  const center={x:pos.x,y:yy,z:pos.z};
  const segments=16;
  for(let i=0;i<segments;i++){
   const f=(ang:number)=>({x:pos.x+Math.cos(ang)*width*Math.cos(yaw)-Math.sin(ang)*length*Math.sin(yaw),y:yy,z:pos.z+Math.cos(ang)*width*Math.sin(yaw)+Math.sin(ang)*length*Math.cos(yaw)});
   tri(v,center,f(i*TAU/segments),f((i+1)*TAU/segments),j===0?[.043,.058,.068]:j===1?[.065,.088,.10]:[.085,.104,.113]);
  }
 }
}
function f1Wheel(v:Vertex,at:(x:number,y:number,z:number)=>Vec,x:number,y:number,z:number,quality:KartGraphics,spin=0,steer=0){
 const segments=quality==='low'?12:quality==='high'?32:20,r=.57,width=.69;
 const tyre:C=[.035,.038,.043],sidewall:C=[.075,.08,.087],hub:C=[.19,.21,.24];
 const ring=(dx:number,angle:number,radius:number)=>{
  const zz=Math.cos(angle)*radius,xx=dx;
  return at(x+xx*Math.cos(steer)-zz*Math.sin(steer),y+Math.sin(angle)*radius,z+xx*Math.sin(steer)+zz*Math.cos(steer));
 };
 for(let i=0;i<segments;i++){
  const a=i*TAU/segments,b=(i+1)*TAU/segments;
  quad(v,ring(-width/2,a,r),ring(width/2,a,r),ring(width/2,b,r),ring(-width/2,b,r),i%3===0?[.043,.048,.054]:tyre,MAT_TYRE);
  for(const sign of [-1,1]){
   const sx=sign*width/2;
   quad(v,ring(sx,a,r),ring(sx,b,r),ring(sx,b,r*.53),ring(sx,a,r*.53),sidewall,MAT_TYRE);
   if(quality!=='low')quad(v,ring(sx+sign*.006,a,r*.78),ring(sx+sign*.006,b,r*.78),ring(sx+sign*.006,b,r*.75),ring(sx+sign*.006,a,r*.75),[.80,.67,.18],MAT_BASIC);
   tri(v,ring(sx,a,r*.42),ring(sx,b,r*.42),at(x+sx+sign*.016,y,z),hub,MAT_METAL);
  }
 }
 // Hub-centred, rotating five-spoke alloy wheel. Distinct asymmetry makes spin visible.
 for(const sign of [-1,1]){
  const sx=sign*(width/2+.014);
  for(let k=0;k<5;k++){
   const a=spin+k*TAU/5,b=a+.115;
   quad(v,ring(sx,a,.12),ring(sx,b,.12),ring(sx,b+.13,.46),ring(sx,a+.13,.46),[.55,.60,.62],MAT_METAL);
  }
  const a=spin+.28;
  quad(v,ring(sx,a,.37),ring(sx,a+.20,.37),ring(sx,a+.22,.49),ring(sx,a-.02,.49),[.94,.75,.26],MAT_GLOW);
 }
}
// Colour-driven liveries work for both offline AI and Supabase lobby colours.
// Extra geometry is attached to the car rather than drawn as floating HUD decals.
const TEAM_ACCENTS:Record<string,{secondary:C;tertiary:C;dark:C}>={
 '#E32636':{secondary:[.97,.79,.20],tertiary:[.94,.96,.96],dark:[.12,.02,.04]}, // Ferrari
 '#FF8000':{secondary:[.28,.75,.95],tertiary:[.08,.12,.17],dark:[.07,.08,.10]}, // McLaren
 '#00D2BE':{secondary:[.95,.97,.98],tertiary:[.10,.15,.19],dark:[.035,.05,.065]}, // Mercedes
 '#173B8A':{secondary:[.98,.78,.21],tertiary:[.93,.20,.23],dark:[.045,.07,.14]}, // Red Bull
 '#006A4E':{secondary:[.77,.86,.63],tertiary:[.94,.96,.89],dark:[.035,.10,.08]}, // Aston Martin
 '#2B7BFF':{secondary:[.94,.96,.99],tertiary:[.07,.27,.57],dark:[.06,.09,.17]}, // Williams
 '#FF6DAE':{secondary:[.11,.42,.81],tertiary:[.97,.90,.95],dark:[.09,.13,.23]}, // Alpine
 '#C4CFD8':{secondary:[.83,.12,.21],tertiary:[.09,.11,.15],dark:[.10,.12,.15]}, // Haas
 '#F4F5F7':{secondary:[.20,.37,.77],tertiary:[.09,.11,.18],dark:[.05,.08,.14]}, // Racing Bulls
 '#B11F26':{secondary:[.80,.82,.85],tertiary:[.06,.06,.07],dark:[.07,.07,.08]}, // Audi
 '#B4AA78':{secondary:[.97,.95,.85],tertiary:[.08,.10,.15],dark:[.055,.07,.10]}, // Cadillac
};
const carAccent=(col:string)=>TEAM_ACCENTS[col.toUpperCase()]||{
 secondary:[.89,.92,.94] as C,tertiary:[.12,.16,.19] as C,dark:[.07,.08,.10] as C
};
function car(v:Vertex,p:number,lane:number,color:string,shield=false,boost=false,drift=0,quality:KartGraphics='balanced',time=0,wheelSpin=0,braking=false,steer=0){
 const pos=place(p,lane),yaw=yawFor(p)+clamp(drift,-1.15,1.15),baseY=pos.y+.12,c=rgb(color);
 const ca=Math.cos(yaw),sa=Math.sin(yaw);
 const at=(x:number,y:number,z:number):Vec=>({x:pos.x+x*ca-z*sa,y:baseY+y,z:pos.z+x*sa+z*ca});
 const block=(x:number,z:number,y:number,w:number,h:number,d:number,col:C,mat=MAT_METAL)=>{const t=at(x,y,z);box(v,t.x,t.y,t.z,w,h,d,col,yaw,mat)};
 const panel=(a:Vec,b:Vec,d:Vec,e:Vec,col:C,mat=MAT_METAL)=>quad(v,a,b,d,e,col,mat);
 const carbon:C=[.035,.046,.054],rubber:C=[.042,.047,.052],stripe=light(c,1.22),trim=carAccent(color);
 ellipseShadow(v,{x:pos.x,y:pos.y+.12,z:pos.z},yaw,1.38,.90);
 // Low, slender Formula-style monocoque; tapered nose geometry replaces the old rectangular 'tank' body.
 const hull=(zFront:number,zBack:number,frontW:number,backW:number,y0:number,y1:number,col:C)=>{
  const L=at(-frontW/2,y0,zFront),R=at(frontW/2,y0,zFront),BL=at(-backW/2,y0,zBack),BR=at(backW/2,y0,zBack);
  const lt=at(-frontW/2,y1,zFront),rt=at(frontW/2,y1,zFront),bl=at(-backW/2,y1,zBack),br=at(backW/2,y1,zBack);
  panel(lt,rt,br,bl,light(col,1.10));panel(L,lt,bl,BL,light(col,.75));panel(rt,R,BR,br,light(col,.79));panel(L,R,rt,lt,light(col,.88));
 };
 // Rounded sculpted cover panels have curved normals rather than cuboid silhouette.
 // This mesh is local to the car and uses the same body colour as the livery.
 const sculptTop=(stations:{z:number;w:number;y:number;bulge:number}[],tone:C)=>{
  const sections=quality==='low'?6:quality==='high'?16:11;
  const point=(st:{z:number;w:number;y:number;bulge:number},u:number)=>at(
   Math.cos(u)*st.w,st.y+Math.sin(u)*st.bulge,st.z);
  for(let k=0;k<stations.length-1;k++)for(let j=0;j<sections;j++){
   const a=Math.PI*j/sections,b=Math.PI*(j+1)/sections;
   quad(v,point(stations[k],a),point(stations[k+1],a),point(stations[k+1],b),point(stations[k],b),tone,MAT_METAL);
  }
 };
 // Floor, rear diffuser and two different tapers on the survival cell.
 block(0,.10,.22,1.48,.17,5.55,carbon,MAT_CARBON);
 hull(-3.42,-3.00,.13,.19,.37,.53,c);
 hull(-3.00,-1.20,.18,.62,.34,.55,c);
 hull(-1.20,.70,.62,.98,.30,.77,c);
 hull(.70,2.46,.98,.56,.30,.68,c);
 sculptTop([{z:-3.42,w:.14,y:.50,bulge:.08},{z:-2.7,w:.24,y:.54,bulge:.14},{z:-2.05,w:.40,y:.56,bulge:.19},{z:-1.3,w:.57,y:.56,bulge:.25}],light(c,1.12));
 sculptTop([{z:.78,w:.49,y:.72,bulge:.13},{z:1.24,w:.61,y:.69,bulge:.19},{z:1.70,w:.57,y:.66,bulge:.16},{z:2.10,w:.43,y:.62,bulge:.10},{z:2.42,w:.30,y:.58,bulge:.04}],light(c,1.07));
 sculptTop([{z:-.44,w:.74,y:.60,bulge:.07},{z:.18,w:.82,y:.63,bulge:.09},{z:.90,w:.73,y:.66,bulge:.07}],light(c,.96));

 block(0,-1.85,.56,.14,.04,2.20,stripe,MAT_GLOW);
 block(0,1.1,.82,.14,.035,2.05,stripe,MAT_GLOW);
 // Sharper livery decals and specular accents to move away from a flat toy-like finish.
 block(0,-.42,.90,.26,.04,2.98,[.94,.95,.97],MAT_METAL);
 block(0,.86,.90,.22,.032,1.18,[.18,.19,.21],MAT_GLOW);
 for(const sign of [-1,1]){
  block(sign*.93,.24,.54,.06,.08,2.44,[.92,.93,.95],MAT_METAL);
  block(sign*.78,1.10,.62,.055,.05,.64,[.18,.20,.22],MAT_GLOW);
  block(sign*.62,-1.08,.46,.11,.04,.92,[.88,.90,.93],MAT_METAL);
 }
 for(const sign of [-1,1]){
  // Slim sidepods with radiators, tapered toward the gearbox.
  const a=at(sign*.50,.35,-.78),b=at(sign*.90,.38,-.22),d=at(sign*.84,.59,1.46),e=at(sign*.42,.65,1.22);
  panel(a,b,d,e,light(c,.71));
  // Soft three-station 'coke-bottle' sidepod instead of a rectangular slab.
  quad(v,at(sign*.66,.35,-.94),at(sign*.98,.35,-.30),at(sign*.90,.44,.70),at(sign*.52,.48,.88),light(c,.78),MAT_METAL);
  quad(v,at(sign*.52,.48,.88),at(sign*.90,.44,.70),at(sign*.72,.39,1.78),at(sign*.40,.43,1.86),light(c,.66),MAT_METAL);
  block(sign*.70,.68,.48,.06,.20,.98,[.10,.13,.16],MAT_GLASS);
  block(sign*.66,1.03,.54,.13,.06,.62,light(c,1.15),MAT_GLOW);
 }
 // Open cockpit, visible halo Y arms and centre roll hoop.
 block(0,-.11,.82,.66,.25,1.24,[.038,.054,.067],MAT_GLASS);
 block(0,-.19,1.00,.28,.26,.54,[.10,.13,.16]);
 const haloColor:C=[.13,.15,.17];
 for(const sign of [-1,1]){
  const aa=at(0,1.34,-.80),bb=at(sign*.43,1.26,-.34),cc=at(sign*.43,1.17,.50),dd=at(0,1.29,.86);
  panel(aa,bb,cc,dd,haloColor);
  block(sign*.42,.20,1.00,.09,.28,.13,haloColor);
 }
 block(0,-.70,.98,.11,.34,.50,haloColor);
 block(0,1.05,.84,.44,.47,.66,light(c,.67));
 // Front wing assembly with multiple separated aero profiles and end plates.
 for(const z of [-3.15,-2.88]){
  block(0,z,.28,3.42,.075,.28,z===-3.15?carbon:stripe,z===-3.15?MAT_CARBON:MAT_METAL);
  block(0,z+.16,.34,2.47,.055,.14,light(c,.85));
 }
 for(const sign of [-1,1]){
  block(sign*1.72,-3.00,.27,.075,.41,.66,carbon,MAT_CARBON);
  block(sign*.84,-2.91,.49,.10,.22,.32,carbon,MAT_CARBON);
 }
 // Rear wing and diffuser: explicitly elevated, with open air underneath.
 for(const sign of [-1,1]){
  block(sign*.67,2.55,.63,.10,.78,.16,carbon,MAT_CARBON);
  block(sign*1.65,2.66,.99,.08,.69,.65,carbon,MAT_CARBON);
 }
 block(0,2.70,1.29,3.40,.12,.58,carbon,MAT_CARBON);
 block(0,2.75,1.14,2.80,.055,.24,stripe);
 block(0,2.48,.40,1.92,.18,.57,[.10,.13,.16]);
 block(0,2.96,.43,1.4,.075,.30,carbon,MAT_CARBON);
 for(const sign of [-1,1]){
  // Two suspension arms for every wheel visibly connect the upright to the chassis.
  for(const z of [-1.98,1.72]){
   const inner=at(sign*.50,.37,z+((z<0)?.15:-.05));
   const outer=at(sign*1.42,.52,z);
   const spoke=at(sign*.86,.36,z+.22);
   tri(v,inner,outer,spoke,[.18,.20,.23],MAT_METAL);
   tri(v,inner,at(sign*.88,.48,z-.24),outer,[.20,.22,.25],MAT_METAL);
   f1Wheel(v,at,sign*1.49,.59,z,quality,wheelSpin,z<0?steer*.32:0);
  }
  block(sign*.71,2.40,.45,.09,.19,.40,braking?[1,.12,.14]:[.22,.035,.06],braking?MAT_GLOW:MAT_METAL);
 }
 // Central rear rain lamp pulses under heavy braking; separate brake ducts glow on either wing endplate.
 block(0,2.61,.61,braking?.69:.49,braking?.25:.13,.13,
  braking?[1,.095,.12]:[.21,.032,.055],braking?MAT_GLOW:MAT_METAL);
 if(braking&&quality!=='low'){
  const flash=.78+.22*Math.sin(time*18);
  block(0,2.84,.61,.76,.14,.09,[1*flash,.05,.07],MAT_GLOW);
  for(const sign of [-1,1])block(sign*1.51,2.68,1.05,.15,.20,.07,[.95,.06,.07],MAT_GLOW);
 }

 if(quality!=='low'){
  for(const sign of [-1,1]){
   block(sign*1.08,-1.74,.42,.06,.10,.88,[.84,.86,.88],MAT_METAL);
   block(sign*1.08,1.55,.46,.06,.10,.86,[.84,.86,.88],MAT_METAL);
  }
 }
 // G2 balanced and high profiles both gain visible silhouette geometry.
 if(quality!=='low'){
  for(const sign of [-1,1]){
   block(sign*1.18,-3.32,.21,1.01,.06,.17,[.058,.067,.078],MAT_CARBON);
   block(sign*1.14,-2.97,.36,.82,.045,.16,light(c,.82),MAT_METAL);
   block(sign*.94,2.66,1.39,.72,.035,.16,[.055,.065,.079],MAT_CARBON);
   block(sign*.91,1.07,.72,.12,.055,.73,[.06,.08,.09],MAT_CARBON);
  }
 }
 if(quality==='high'){
  // New G2 high-poly aerodynamic pieces are actual geometry, not color/noise patches.
  // Carbon floor strakes, a 3-plane front wing, rear diffuser fences and machined wheel details.
  for(const sign of [-1,1]){
   for(let k=0;k<3;k++){
    const z=-3.39+k*.17;
    const w=3.48-k*.15;
    block(sign*(w*.26),z,.18+k*.046,w*.45,.055,.13,k===2?light(c,.72):[.044,.052,.062],k===2?MAT_METAL:MAT_CARBON);
   }
   for(let k=0;k<4;k++){
    const z=2.36+k*.16;
    block(sign*(.33+k*.12),z,.28,.045,.23,.13,[.044,.055,.064],MAT_CARBON);
   }
   block(sign*.84,.38,.27,.07,.06,3.4,[.025,.040,.049],MAT_CARBON);
   block(sign*1.03,.13,.23,.035,.16,2.4,[.18,.22,.27],MAT_METAL);
   // Sculpted sidepod gills and cooling vents, located ABOVE body instead of projected onto track.
   for(let vent=0;vent<4;vent++){
    block(sign*(.64+vent*.035),.56+vent*.23,.76,.14,.02,.095,[.05,.072,.087],MAT_CARBON);
   }
   // Close-up wheel nut + brake ventilation on four exposed uprights.
   for(const z of [-1.98,1.72]){
    const center=at(sign*1.55,.61,z);
    box(v,center.x,center.y-.025,center.z,.135,.135,.135,[.87,.71,.30],yaw,MAT_METAL);
   }
  }
  block(0,-2.08,.58,.16,.045,.64,[.98,.97,.95],MAT_GLOW);
  block(0,.94,1.42,.38,.14,.24,[.13,.17,.19],MAT_CARBON);
  // Tapered endplate details, carbon floor edge / segmented livery accents.
  for(const sign of [-1,1]){
   block(sign*1.10,-.10,.22,.055,.09,2.72,[.065,.075,.086]);
   block(sign*1.51,-3.10,.36,.065,.42,.35,[.08,.10,.13]);
   for(let k=0;k<3;k++)block(sign*(.88+k*.06),.2+k*.28,.60,.038,.09,.21,[.22,.25,.27]);
  }
  for(const sign of [-1,1]){
   block(sign*.46,-1.0,.39,.10,.07,1.36,[.92,.93,.94]);
   block(sign*.30,1.56,1.01,.11,.08,.38,[.89,.89,.90]);
  }
 }
 // Team livery overlay: fitted floor edge, sculpted sidepod stripe, nose, wing tips and engine cover.
 // Geometry stays just above the body so colour reads from chase camera and close rivals.
 for(const sign of [-1,1]){
  block(sign*.77,-.48,.63,.080,.022,1.95,trim.secondary,MAT_GLOW);
  block(sign*.60,1.24,.69,.071,.023,1.35,trim.tertiary,MAT_METAL);
  block(sign*.64,-1.10,.41,.060,.034,1.15,trim.dark,MAT_CARBON);
  block(sign*1.04,-3.16,.27,.60,.027,.12,trim.secondary,MAT_METAL);
  block(sign*1.36,2.72,1.32,.55,.028,.22,trim.secondary,MAT_METAL);
  block(sign*.88,.85,.58,.18,.030,.62,trim.secondary,MAT_GLOW);
  if(quality!=='low'){
   panel(at(sign*.58,.70,-.20),at(sign*.87,.66,.03),at(sign*.81,.62,.73),at(sign*.54,.65,.56),trim.secondary,MAT_METAL);
   panel(at(sign*.47,.65,.94),at(sign*.74,.60,1.02),at(sign*.56,.55,1.53),at(sign*.43,.58,1.46),trim.tertiary,MAT_METAL);
  }
 }
 block(0,-2.36,.62,.075,.025,1.36,trim.secondary,MAT_GLOW);
 block(0,2.38,.89,.16,.027,.55,trim.secondary,MAT_GLOW);
 block(0,2.73,1.36,1.34,.025,.12,trim.tertiary,MAT_METAL);
 if(shield)for(let j=0;j<3;j++)ring(v,{x:pos.x,y:pos.y,z:pos.z},2.7+j*.12,.55+j*.83,[.12,.85,1]);
 if(boost)for(const sign of [-1,1]){
  const wave=.5+.5*Math.sin(time*22+sign);
  block(sign*.34,3.3,.40,.24,.19,1.18+wave,[1,.27,.05],MAT_GLOW);
  block(sign*.34,3.78+wave,.40,.13,.13,.85+wave,[1,.79,.19],MAT_GLOW);
 }
}
// G3.7: modelled Formula cockpit. Two cameras share the same physically scaled car interior.
// Local coordinates: negative Z is the nose, Y is relative to the chassis. The car itself
// is hidden in onboard modes, so nose, front tyres, mirrors and cockpit are drawn here.
function cockpitInterior(v:Vertex,pos:Vec,yaw:number,color:string,steer:number,time:number,speed:number,wheelSpin:number,haloView:boolean,quality:KartGraphics){
 const ca=Math.cos(yaw),sa=Math.sin(yaw),paint=rgb(color),accent=carAccent(color);
 const at=(x:number,y:number,z:number):Vec=>({x:pos.x+x*ca-z*sa,y:pos.y+.12+y,z:pos.z+x*sa+z*ca});
 const panel=(a:Vec,b:Vec,c:Vec,d:Vec,col:C,mat=MAT_METAL)=>quad(v,a,b,c,d,col,mat);
 const block=(x:number,y:number,z:number,w:number,h:number,d:number,col:C,mat=MAT_METAL)=>{
  const p=at(x,y,z);box(v,p.x,p.y,p.z,w,h,d,col,yaw,mat);
 };
 const dark:C=[.030,.038,.050],carbon:C=[.048,.055,.065],carbonHi:C=[.085,.100,.113],seat:C=[.070,.083,.102],frame:C=[.15,.17,.20];
 const trim=accent.secondary;
 // Continuous open monocoque: faceted sidewalls, carbon inner lining, padded coaming
 // and colour trim follow the taper of the actual F1 survival cell, unlike the old blocks.
 const cockpitStations=[
  {z:1.14,w:.65,outer:.88,top:1.06,inner:.48},
  {z:.70,w:.66,outer:.90,top:1.08,inner:.48},
  {z:.20,w:.65,outer:.87,top:1.09,inner:.49},
  {z:-.28,w:.60,outer:.80,top:1.09,inner:.49},
  {z:-.76,w:.56,outer:.74,top:1.05,inner:.52},
  {z:-1.16,w:.45,outer:.60,top:.91,inner:.52},
  {z:-1.55,w:.31,outer:.44,top:.73,inner:.52}
 ];
 for(let i=0;i<cockpitStations.length-1;i++){
  const a=cockpitStations[i],b=cockpitStations[i+1];
  for(const sign of [-1,1]){
   // Sidewall outer paint, broad carbon cap, padded inner wall and underside.
   panel(at(sign*a.outer,.44,a.z),at(sign*b.outer,.45,b.z),at(sign*b.outer,b.top-.09,b.z),at(sign*a.outer,a.top-.09,a.z),light(paint,sign>0?.75:.85),MAT_METAL);
   panel(at(sign*a.outer,a.top-.09,a.z),at(sign*b.outer,b.top-.09,b.z),at(sign*b.w,b.top,b.z),at(sign*a.w,a.top,a.z),carbon,MAT_CARBON);
   panel(at(sign*a.w,a.top,a.z),at(sign*b.w,b.top,b.z),at(sign*b.w,b.inner,b.z),at(sign*a.w,a.inner,a.z),seat,MAT_CARBON);
   panel(at(sign*a.outer,a.top-.028,a.z),at(sign*b.outer,b.top-.028,b.z),at(sign*b.w,b.top+.020,b.z),at(sign*a.w,a.top+.020,a.z),carbonHi,MAT_CARBON);
   // Team-livery edge stripe, legible even from inside camera.
   panel(at(sign*(a.outer-.022),a.top+.024,a.z),at(sign*(b.outer-.022),b.top+.024,b.z),at(sign*(b.w+.020),b.top+.027,b.z),at(sign*(a.w+.020),a.top+.027,a.z),trim,MAT_METAL);
  }
 }
 // Lower carbon footwell with sculpted side shielding. The cockpit stays OPEN at camera height.
 block(0,.29,-.24,1.18,.12,2.85,dark,MAT_CARBON);
 for(const sign of [-1,1]){
  panel(at(sign*.51,.40,.72),at(sign*.52,.40,-.74),at(sign*.40,.36,-1.39),at(sign*.39,.36,.72),carbon,MAT_CARBON);
  block(sign*.47,.43,.67,.21,.075,.66,seat,MAT_CARBON);
  // Small vented carbon inserts on inner sidewall.
  for(let n=0;n<3;n++)block(sign*.545,.75,-.17-n*.23,.018,.028,.13,[.20,.23,.26],MAT_METAL);
 }
 // Upholstered seat shoulders and the outer driver's overalls -- only what an onboard camera can see.
 for(const sign of [-1,1]){
  block(sign*.48,.55,.91,.22,.34,.61,seat,MAT_CARBON);
  block(sign*.35,.34,.83,.22,.15,.53,[.10,.11,.13],MAT_METAL);
 }
 // G3.7.2: deepen the visible cockpit tub so the onboard view feels wrapped by the chassis.
 block(0,.21,.70,.90,.20,1.26,[.045,.050,.060],MAT_CARBON);
 block(0,.33,.94,.70,.16,.68,[.062,.070,.082],MAT_CARBON);
 block(0,.58,1.18,.76,.16,.38,[.072,.080,.094],MAT_CARBON);
 block(0,.77,-.54,.82,.18,.64,[.070,.078,.092],MAT_CARBON);
 block(0,.86,-.46,.66,.09,.52,trim,MAT_METAL);
 block(0,1.02,1.08,.82,.09,.28,carbonHi,MAT_CARBON);
 for(const sign of [-1,1]){
  panel(at(sign*.77,1.03,1.02),at(sign*.73,1.01,.20),at(sign*.61,.89,-.82),at(sign*.64,.93,1.05),carbonHi,MAT_CARBON);
  panel(at(sign*.68,.93,1.06),at(sign*.61,.89,-.82),at(sign*.50,.72,-1.04),at(sign*.56,.74,1.12),seat,MAT_CARBON);
  panel(at(sign*.52,1.16,1.16),at(sign*.47,1.08,.42),at(sign*.43,.97,-.24),at(sign*.46,1.02,1.18),[.10,.11,.12],MAT_CARBON);
  block(sign*.61,1.02,.92,.16,.11,.58,trim,MAT_METAL);
  block(sign*.58,.86,.16,.13,.16,1.62,[.07,.08,.09],MAT_CARBON);
  block(sign*.36,.70,.88,.16,.22,.72,[.12,.13,.15],MAT_METAL);
 }
 // Driver shoulders and top of the survival cell become visible so the car no longer feels hollow.
 block(0,.63,1.12,.42,.24,.34,[.14,.03,.03],MAT_METAL);
 block(0,.84,1.06,.28,.20,.20,[.16,.17,.19],MAT_CARBON);
 // Final cockpit closure under the wheel: closes the hollow gap where the road used to show through.
 block(0,.47,-.10,.74,.18,.82,[.060,.067,.078],MAT_CARBON);
 block(0,.54,-.42,.56,.12,.54,[.082,.088,.098],MAT_CARBON);
 block(0,.58,-.72,.44,.10,.32,[.14,.15,.17],MAT_METAL);
 for(const sign of [-1,1]){
  panel(at(sign*.34,.58,.22),at(sign*.36,.58,-.50),at(sign*.23,.47,-.96),at(sign*.20,.49,.06),carbonHi,MAT_CARBON);
  panel(at(sign*.22,.49,.06),at(sign*.23,.47,-.96),at(sign*.11,.35,-.90),at(sign*.10,.37,.10),seat,MAT_CARBON);
  block(sign*.16,.54,-.18,.10,.13,.64,[.10,.11,.13],MAT_CARBON);
 }
 // Final cockpit polish: a deeper dashboard brow, padded knee fairing and stronger inner side panels.
 block(0,.96,.28,.74,.12,.54,[.055,.062,.074],MAT_CARBON);
 block(0,.91,.02,.64,.14,.42,[.075,.082,.094],MAT_CARBON);
 block(0,.73,-.20,.44,.20,.48,[.11,.12,.14],MAT_METAL);
 block(0,.52,.46,.38,.16,.44,[.15,.03,.03],MAT_METAL);
 for(const sign of [-1,1]){
  panel(at(sign*.58,.96,.64),at(sign*.50,.96,-.06),at(sign*.43,.86,-.48),at(sign*.47,.86,.80),carbonHi,MAT_CARBON);
  panel(at(sign*.44,.70,.98),at(sign*.30,.68,.64),at(sign*.22,.78,.08),at(sign*.36,.82,.84),[.18,.04,.04],MAT_METAL);
  block(sign*.24,.66,.56,.11,.18,.54,[.16,.03,.03],MAT_METAL);
  block(sign*.29,.81,.28,.09,.11,.62,[.11,.12,.13],MAT_CARBON);
 }
 // Sweeping elongated nose cone and fitted paint surfaces visible between front tyres.
 const nose=[
  {z:-1.50,w:.32,y:.67},{z:-1.90,w:.30,y:.63},{z:-2.35,w:.23,y:.56},
  {z:-2.85,w:.17,y:.49},{z:-3.44,w:.12,y:.42}
 ];
 for(let k=0;k<nose.length-1;k++){
  const a=nose[k],b=nose[k+1];
  panel(at(-a.w,a.y,a.z),at(a.w,a.y,a.z),at(b.w,b.y,b.z),at(-b.w,b.y,b.z),light(paint,1.08),MAT_METAL);
  panel(at(a.w,a.y,a.z),at(a.w*.9,.34,a.z),at(b.w*.9,.31,b.z),at(b.w,b.y,b.z),light(paint,.71),MAT_METAL);
  panel(at(-a.w*.9,.34,a.z),at(-a.w,a.y,a.z),at(-b.w,b.y,b.z),at(-b.w*.9,.31,b.z),light(paint,.73),MAT_METAL);
  // Narrow central accent line, geometrically aligned to the body surface.
  panel(at(-.034,a.y+.013,a.z),at(.034,a.y+.013,a.z),at(.033,b.y+.013,b.z),at(-.033,b.y+.013,b.z),trim,MAT_GLOW);
 }
 for(const sign of [-1,1]){
  // Sculpted shoulder fairing running to the nose, with black suspension.
  panel(at(sign*.78,.70,-.90),at(sign*.66,.70,-1.46),at(sign*.31,.51,-2.52),at(sign*.43,.49,-1.65),light(paint,.83),MAT_METAL);
  panel(at(sign*.38,.38,-1.60),at(sign*1.39,.53,-1.94),at(sign*1.42,.49,-2.06),at(sign*.34,.33,-1.84),carbonHi,MAT_CARBON);
  panel(at(sign*.43,.63,-1.67),at(sign*1.34,.46,-1.99),at(sign*1.43,.47,-1.94),at(sign*.44,.65,-1.55),frame,MAT_METAL);
  // Both real front tyres, not square dummy wheels.
  f1Wheel(v,at,sign*1.49,.59,-1.98,quality,wheelSpin,-steer*.32);
  // Braking duct and wheel fairing with coloured accent.
  block(sign*.99,.47,-1.95,.20,.14,.43,dark,MAT_CARBON);
  block(sign*1.18,.73,-1.92,.075,.04,.36,trim,MAT_GLOW);
 }
 // Front wing tip visible on the halo camera, without a giant opaque black rectangle.
 block(0,.27,-3.18,3.32,.064,.23,dark,MAT_CARBON);
 block(0,.32,-3.00,2.55,.055,.13,trim,MAT_METAL);
 for(const sign of [-1,1])block(sign*1.62,.28,-3.07,.06,.37,.45,dark,MAT_CARBON);
 // Side mirrors with dark glass and proper painted outer housings.
 for(const sign of [-1,1]){
  block(sign*.98,.79,-.79,.15,.074,.52,carbonHi,MAT_CARBON);
  block(sign*1.19,.90,-.81,.46,.17,.28,paint,MAT_METAL);
  block(sign*1.19,.942,-.785,.39,.035,.22,[.20,.36,.47],MAT_GLASS);
  block(sign*1.17,1.075,-.82,.34,.025,.14,trim,MAT_METAL);
 }
 // Structural halo arch, modelled as shaped slim beams with a single central stalk.
 const beam=(a:Vec,b:Vec,width:number,col:C)=>{
  const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len=Math.hypot(dx,dy,dz)||1;
  const ux=dx/len,uy=dy/len,uz=dz/len;
  const rx=Math.abs(uy)>.97?1:-uz,rz=Math.abs(uy)>.97?0:ux;
  const rl=Math.hypot(rx,rz)||1,sx=rx/rl*width*.5,sz=rz/rl*width*.5;
  const q=(p:Vec,side:number,up:number):Vec=>({x:p.x+sx*side,y:p.y+up*width*.45,z:p.z+sz*side});
  panel(q(a,-1,-1),q(a,1,-1),q(b,1,-1),q(b,-1,-1),col,MAT_CARBON);
  panel(q(a,-1,1),q(b,-1,1),q(b,1,1),q(a,1,1),light(col,1.12),MAT_CARBON);
  panel(q(a,-1,-1),q(b,-1,-1),q(b,-1,1),q(a,-1,1),light(col,.78),MAT_CARBON);
  panel(q(a,1,1),q(b,1,1),q(b,1,-1),q(a,1,-1),light(col,.85),MAT_CARBON);
 };
 const halo:C=[.14,.16,.18];
 if(haloView){
  for(const sign of [-1,1]){
   beam(at(sign*.63,1.03,.19),at(sign*.54,1.67,-.28),.070,halo);
   beam(at(sign*.54,1.67,-.28),at(0,1.70,-1.19),.070,halo);
  }
  beam(at(0,1.70,-1.19),at(0,.91,-1.31),.065,halo);
 }else{
  // In the low driver-eyeline camera the overhead structure would hide the circuit.
  // Keep the real centre halo stalk, but not the exaggerated close-up roof triangles.
  beam(at(0,1.54,-1.48),at(0,.90,-1.51),.050,halo);
 }
 // Padded hoop and soft trim at the rear opening (outside the main eyeline).
 for(const sign of [-1,1])block(sign*.48,1.03,1.03,.29,.13,.35,seat,MAT_CARBON);
 // Multifunction steering wheel: a sculpted flat-bottom F1 rectangle, independent of the dash.
 // Rotation is in its OWN screen plane, not around the car's vertical axis.
 const rotation=clamp(steer,-.65,.65),cosR=Math.cos(rotation),sinR=Math.sin(rotation);
 const wheelAt=(x:number,y:number,z=.0):Vec=>{
  const rx=x*cosR-y*sinR,ry=x*sinR+y*cosR;
  return at(rx,1.03+ry,-.60+z+ry*.11);
 };
 const poly=(points:[number,number][],scale:number,offsetZ:number,col:C,mat=MAT_CARBON)=>{
  const outer=points.map(([x,y])=>wheelAt(x*scale,y*scale,offsetZ));
  for(let i=1;i<outer.length-1;i++)tri(v,outer[0],outer[i],outer[i+1],col,mat);
 };
 const out:[number,number][]=[[-.37,-.27],[-.52,-.12],[-.52,.18],[-.39,.31],[.39,.31],[.52,.18],[.52,-.12],[.37,-.27]];
 const ins=out.map(([x,y]):[number,number]=>[x*.68,y*.65]);
 for(let i=0;i<out.length;i++){
  const j=(i+1)%out.length;
  panel(wheelAt(...out[i],.01),wheelAt(...out[j],.01),wheelAt(...ins[j],.014),wheelAt(...ins[i],.014),dark,MAT_CARBON);
 }
 // Carbon rear shell, ergonomic grips and painted centre spokes.
 poly([[-.27,-.16],[-.19,-.12],[-.13,.09],[.13,.09],[.19,-.12],[.27,-.16]],1,-.026,carbonHi);
 // Steering column shroud and a compact display binnacle help the view feel less empty.
 block(0,.86,-.88,.34,.10,.22,[.08,.09,.11],MAT_CARBON);
 block(0,.78,-.66,.18,.14,.16,[.16,.17,.19],MAT_METAL);
 block(0,.72,-.48,.11,.09,.12,trim,MAT_METAL);
 for(const sign of [-1,1]){
  const glove:[number,number][] = sign>0?[[.29,-.15],[.44,-.07],[.45,.14],[.32,.18],[.24,.03]]:[[-.29,-.15],[-.44,-.07],[-.45,.14],[-.32,.18],[-.24,.03]];
  poly(glove,1,.035,trim,MAT_METAL);
  // Larger shift paddles and more visible driver forearms for a clearer F1 cockpit feel.
  panel(wheelAt(sign*.54,-.15,-.10),wheelAt(sign*.55,.16,-.10),wheelAt(sign*.61,.16,-.09),wheelAt(sign*.60,-.15,-.09),frame,MAT_METAL);
  panel(at(sign*.28,.66,.52),at(sign*.40,.64,.16),at(sign*.42,.97,-.66),at(sign*.31,1.00,-.62),[.18,.05,.05],MAT_METAL);
  panel(at(sign*.16,.60,.84),at(sign*.31,.67,.40),at(sign*.24,.82,-.02),at(sign*.11,.79,.36),[.16,.03,.03],MAT_METAL);
  block(sign*.18,.71,.18,.12,.11,.44,[.12,.03,.03],MAT_METAL);
  const thumb=wheelAt(sign*.40,.04,.08);
  box(v,thumb.x,thumb.y-.055,thumb.z,.15,.12,.14,[.12,.14,.16],yaw,MAT_METAL);
 }
 // Actual central rectangular LCD, buttons, gear numeral and rev-light bar.
 const screen:[number,number][]=[[-.24,-.13],[.24,-.13],[.24,.12],[-.24,.12]];
 poly(screen,1,.040,[.045,.095,.105],MAT_GLASS);
 const rect=(x:number,y:number,w:number,h:number,col:C,z=.06,mat=MAT_GLOW)=>{
  panel(wheelAt(x-w*.5,y-h*.5,z),wheelAt(x+w*.5,y-h*.5,z),wheelAt(x+w*.5,y+h*.5,z),wheelAt(x-w*.5,y+h*.5,z),col,mat);
 };
 for(let i=0;i<9;i++)rect((i-4)*.050,.175,.035,.027,i<clamp(3+speed/12,2,9)?i<6?[.28,.92,.45]:i<8?[1,.75,.17]:[1,.16,.20]:[.085,.12,.14]);
 // Seven-segment gear indication, easy to read from the driver cam.
 const gear=clamp(1+Math.floor(Math.max(0,speed)/10.5),1,8);
 const segmentMaps:{[key:number]:number[]}={1:[1,2],2:[0,1,6,4,3],3:[0,1,6,2,3],4:[5,6,1,2],5:[0,5,6,2,3],6:[0,5,4,3,2,6],7:[0,1,2],8:[0,1,2,3,4,5,6]};
 const bar=[[0,.067,.075,.010],[.046,.039,.012,.056],[.046,-.045,.012,.056],[0,-.072,.075,.010],[-.046,-.045,.012,.056],[-.046,.039,.012,.056],[0,-.003,.075,.010]];
 for(const n of segmentMaps[gear]){
  const [x,y,w,h]=bar[n];rect(x,y,w,h,[.75,.97,.92],.065);
 }
 for(const sign of [-1,1]){
  for(let i=0;i<3;i++){
   const x=sign*(.225+i*.065),y=-.045+(i%2)*.080;
   rect(x,y,.030,.028,i%3===0?[.91,.19,.25]:i%3===1?[.28,.73,.91]:[.85,.72,.19],.075);
  }
 }
 // Slim dashboard below the wheel, rather than a black slab obscuring the road.
 block(0,.57,-1.12,.98,.070,.36,dark,MAT_CARBON);
 block(0,.61,-.95,.60,.085,.24,[.055,.060,.070],MAT_CARBON);
 block(0,.73,-.76,.34,.10,.20,[.08,.09,.10],MAT_METAL);
 for(let i=0;i<7;i++)block((i-3)*.103,.66,-1.21,.074,.037,.065,i<5?[.11,.78,.90]:[.92,.23,.17],MAT_GLOW);
 // Secondary console lips help frame the view in driver cam.
 for(const sign of [-1,1])block(sign*.31,.71,-.88,.09,.08,.18,[.11,.12,.14],MAT_CARBON);
 // Thin central nose badges, light-catching carbon trim on both sidewalls.
 for(const sign of [-1,1]){
  block(sign*.57,.92,-.36,.030,.038,.35,accent.tertiary,MAT_GLOW);
 }
}
function carLite(v:Vertex,p:number,lane:number,color:string,quality:KartGraphics='balanced'){
 const pos=place(p,lane),yaw=yawFor(p),c=rgb(color),ca=Math.cos(yaw),sa=Math.sin(yaw);
 const at=(x:number,y:number,z:number):Vec=>({x:pos.x+x*ca-z*sa,y:pos.y+.10+y,z:pos.z+x*sa+z*ca});
 const shell=(z1:number,z2:number,w1:number,w2:number,y1:number,y2:number,col:C)=>{
  quad(v,at(-w1,y1,z1),at(w1,y1,z1),at(w2,y2,z2),at(-w2,y2,z2),col,MAT_METAL);
 };
 const panel=(a:Vec,b:Vec,c1:Vec,d:Vec,col:C,mat=MAT_METAL)=>quad(v,a,b,c1,d,col,mat);
 const carbon:C=[.040,.046,.053],trim=carAccent(color);
 ellipseShadow(v,{x:pos.x,y:pos.y+.10,z:pos.z},yaw,1.30,.84);
 shell(-3.50,-1.30,.10,.31,.41,.53,light(c,1.10));
 shell(-1.30,.70,.31,.53,.53,.64,light(c,1.00));
 shell(.70,2.52,.53,.20,.64,.45,light(c,.92));
 box(v,pos.x,pos.y+.31,pos.z,1.38,.15,5.40,carbon,yaw,MAT_CARBON);
 for(const sign of [-1,1]){
  panel(at(sign*.46,.40,-.72),at(sign*.94,.37,-.24),at(sign*.86,.52,1.44),at(sign*.40,.58,1.20),light(c,.76),MAT_METAL);
  panel(at(sign*.60,.36,-.90),at(sign*.95,.36,-.28),at(sign*.82,.43,.82),at(sign*.48,.47,.92),light(c,.70),MAT_METAL);
  panel(at(sign*.48,.47,.92),at(sign*.82,.43,.82),at(sign*.68,.37,1.82),at(sign*.37,.41,1.88),light(c,.63),MAT_METAL);
 }
 box(v,at(0,.77,-.12).x,at(0,.77,-.12).y,at(0,.77,-.12).z,.42,.20,.72,[.035,.04,.05],yaw,MAT_GLASS);
 box(v,at(0,1.02,.76).x,at(0,1.02,.76).y,at(0,1.02,.76).z,.42,.36,.56,light(c,.68),yaw,MAT_METAL);
 const halo:C=[.13,.15,.17];
 for(const sign of [-1,1]){
  panel(at(0,1.22,-.66),at(sign*.32,1.16,-.26),at(sign*.32,1.08,.38),at(0,1.16,.70),halo,MAT_METAL);
 }
 box(v,at(0,.15,-3.02).x,at(0,.15,-3.02).y,at(0,.15,-3.02).z,3.18,.08,.28,[.09,.11,.14],yaw,MAT_CARBON);
 box(v,at(0,.29,-2.84).x,at(0,.29,-2.84).y,at(0,.29,-2.84).z,2.28,.05,.12,light(c,.82),yaw,MAT_METAL);
 for(const sign of [-1,1])box(v,at(sign*1.62,.29,-2.98).x,at(sign*1.62,.29,-2.98).y,at(sign*1.62,.29,-2.98).z,.07,.34,.58,[.08,.10,.13],yaw,MAT_CARBON);
 for(const sign of [-1,1])box(v,at(sign*.63,2.60,.60).x,at(sign*.63,2.60,.60).y,at(sign*.63,2.60,.60).z,.09,.68,.16,[.07,.09,.11],yaw,MAT_CARBON);
 box(v,at(0,1.16,2.67).x,at(0,1.16,2.67).y,at(0,1.16,2.67).z,2.96,.10,.42,[.08,.10,.13],yaw,MAT_CARBON);
 box(v,at(0,1.00,2.49).x,at(0,1.00,2.49).y,at(0,1.00,2.49).z,1.46,.12,.42,[.10,.13,.16],yaw,MAT_METAL);
 box(v,at(0,.55,-1.86).x,at(0,.55,-1.86).y,at(0,.55,-1.86).z,.07,.05,1.92,light(c,1.18),yaw,MAT_GLOW);
 for(const sign of [-1,1]){
  for(const z of [-1.90,1.76]){
   const inner=at(sign*.46,.34,z+(z<0?.10:-.04));
   const outer=at(sign*1.36,.46,z);
   const link=at(sign*.80,.34,z+.18);
   tri(v,inner,outer,link,[.18,.20,.23],MAT_METAL);
   // Lightweight cylindrical tyre (8-12 sides) keeps the 21-car field affordable.
   const rimN=quality==='high'?12:8;
   const wheelX=sign*1.48,wheelY=.56,radius=.54;
   for(let k=0;k<rimN;k++){
    const a=k*TAU/rimN,b=(k+1)*TAU/rimN;
    const atR=(xx:number,ang:number,rad:number)=>at(xx,wheelY+Math.sin(ang)*rad,z+Math.cos(ang)*rad);
    quad(v,atR(wheelX-.23,a,radius),atR(wheelX+.23,a,radius),atR(wheelX+.23,b,radius),atR(wheelX-.23,b,radius),[.035,.039,.045],MAT_TYRE);
    const ox=wheelX+sign*.235;
    quad(v,atR(ox,a,radius),atR(ox,b,radius),atR(ox,b,radius*.52),atR(ox,a,radius*.52),[.065,.071,.077],MAT_TYRE);
   }
  }
 }
 // Livery colours remain readable at mid-distance without expensive full car meshes.
 for(const sign of [-1,1]){
  const aa=at(sign*.58,.55,-.35),bb=at(sign*.84,.50,-.12),cc=at(sign*.74,.54,.82),dd=at(sign*.47,.58,.62);
  panel(aa,bb,cc,dd,trim.secondary,MAT_METAL);
  const tip=at(sign*1.09,.30,-3.02);
  box(v,tip.x,tip.y,tip.z,.38,.035,.12,trim.secondary,yaw,MAT_METAL);
 }
 const line=at(0,.60,-2.24);
 box(v,line.x,line.y,line.z,.065,.028,1.60,trim.secondary,yaw,MAT_METAL);
 const wing=at(0,1.18,2.72);
 box(v,wing.x,wing.y,wing.z,1.50,.028,.10,trim.tertiary,yaw,MAT_METAL);
}
function pickup(v:Vertex,p:number,lane:number,time:number){
 const point=place(p,lane),y=point.y+2.45+Math.sin(time*2.7+p*67)*.28,c:C=[.64,.71,.76];
 const angle=time*1.20+p*12,center={x:point.x,y,z:point.z};
 for(let j=0;j<2;j++){
  const r=j===0?1.7:1.14;
  const tip={x:point.x,y:y+r,z:point.z},base={x:point.x,y:y-r,z:point.z};
  const sides=6;
  for(let k=0;k<sides;k++){
   const a=angle+k*TAU/sides,b=angle+(k+1)*TAU/sides;
   const v1={x:point.x+r*.73*Math.cos(a),y,z:point.z+r*.73*Math.sin(a)};
   const v2={x:point.x+r*.73*Math.cos(b),y,z:point.z+r*.73*Math.sin(b)};
   tri(v,tip,v1,v2,light(c,j===0?1.03:.76),MAT_GLOW);
   tri(v,base,v2,v1,light(c,.48),MAT_GLOW);
  }
 }
 ring(v,center,2.18,-1.98,light(c,1.08));ring(v,center,2.48,-2.0,light(c,.45));
}
export class KartRushEngine{
 private gl:WebGLRenderingContext;private program:WebGLProgram;private staticBuffer:WebGLBuffer;private dynamicBuffer:WebGLBuffer;private worldCount=0;
 private attribPos:number;private attribColor:number;private attribNormal:number;private attribMat:number;
 private uniformRain:WebGLUniformLocation|null;private uniformMat:WebGLUniformLocation;private uniformTime:WebGLUniformLocation|null;private uniformDetail:WebGLUniformLocation|null;
 private surfaceAlbedo:WebGLTexture|null=null;private surfaceNormal:WebGLTexture|null=null;private materialReady=false;
 private uniformAlbedo:WebGLUniformLocation|null;private uniformNormal:WebGLUniformLocation|null;private uniformAtlasReady:WebGLUniformLocation|null;private uniformCamera:WebGLUniformLocation|null;
 private uniformFlood:WebGLUniformLocation|null;private uniformBrakes:WebGLUniformLocation|null;
 private skyProgram:WebGLProgram;private skyBuffer:WebGLBuffer;private skyPos:number;private skyTime:WebGLUniformLocation|null;private skyYaw:WebGLUniformLocation|null;private skyWeather:WebGLUniformLocation|null;
 private billboardProgram:WebGLProgram|null=null;private billboardBuffer:WebGLBuffer|null=null;
 private billboardTexture:WebGLTexture|null=null;private billboardCount=0;
 private billboardPos=-1;private billboardUV=-1;private billboardMat:WebGLUniformLocation|null=null;
 private graphics:KartGraphics;private readonly weather:KartWeather;private readonly totalLaps:number;private readonly paceFactor:number;private frameCounter=0;private fps=60;private fpsTime=0;private renderScale=1;
 private raf=0;private last=0;private lastHud=0;private lastBroadcast=0;private currentProgress=-.0103;
 private lane=0;private lateralVelocity=0;private headingYaw=0;private wallStuckFor=0;private speed=0;private power:KartPower|null=null;private shieldUntil=0;private turboUntil=0;private slowUntil=0;
 private lapStart=0;private bestLap=0;private finished=false;private finishElapsed=0;private finishRank=0;private elapsed=0;private lastLapNumber=-1;
 private cameraMode=0;private lookBack=false;private wheelRotation=0;private oversteer=0;private cornerWarning=0;
 private cameraFlashAt=new Float32Array(72).fill(-999);private cameraFlashArmed=new Array<boolean>(72).fill(true);
 private preRaceEvent: 'boost'|'penalty'|null=null;
 private keys={left:false,right:false,brake:false,throttle:false};private health=100;private pitProgress=0;private pitActive=false;private magnetUntil=0;private lastHorn=0;private remote=new Map<string,KartState>();private eye:Vec|null=null;private target:Vec|null=null;
 private collected=new Set<string>();private pickupCooldown=new Map<string,number>();private bots:KartState[]=[];private botGridLane:number[]=[];private botTargets:number[]=[];private botPassLane:number[]=[];private botPassUntil:number[]=[];private botPowers:(KartPower|null)[]=[];private botTurboUntil:number[]=[];private botShieldUntil:number[]=[];private botPowerSince:number[]=[];private botCollected=new Set<string>();private botSlowedUntil:number[]=[];private botRiskUntil:number[]=[];private botRiskCheck:number[]=[];private botLastMistake:number[]=[];private botCornerStyle:number[]=[];private botCornerMistake:number[]=[];private botCornerCommitted:number[]=[];
 private botPriorSpeed=new Float32Array(AI_DRIVERS.length);private botBrakeUntil=new Float32Array(AI_DRIVERS.length);private inputPower=false;private stopped=false;private resize:()=>void;private hitCooldown=0;private otherHitTimes=new Map<string,number>();private contactUntil=0;private paused=false;private pausedAt=0;private pauseTotalMs=0;
 constructor(private canvas:HTMLCanvasElement,private options:KartOptions){
  this.graphics=options.graphics||'balanced';this.weather=options.weather==='rain'?'rain':'clear';this.totalLaps=options.bots?clamp(options.laps||3,1,8):3;this.paceFactor=options.bots?(options.pace==='fast'?1.05:1):1;
  const gridSlot=clamp(Math.floor(options.gridSlot??GRID_PLAYER_SLOT),0,21);
  this.currentProgress=GRID_FIRST-GRID_STEP*gridSlot;this.lane=gridSlot%2===0?-GRID_LANE:GRID_LANE;
  this.headingYaw=yawFor(this.currentProgress);
  const gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'high-performance'})||canvas.getContext('experimental-webgl');
  if(!gl)throw Error('Bu tarayÄ±cÄ± WebGL desteklemiyor.');this.gl=gl as WebGLRenderingContext;
  const vs=shader(this.gl,this.gl.VERTEX_SHADER,VERT),fs=shader(this.gl,this.gl.FRAGMENT_SHADER,FRAG);
  const program=this.gl.createProgram();if(!program)throw Error('WebGL programÄ± oluÅŸturulamadÄ±');this.gl.attachShader(program,vs);this.gl.attachShader(program,fs);this.gl.linkProgram(program);if(!this.gl.getProgramParameter(program,this.gl.LINK_STATUS))throw Error('WebGL baÄŸlantÄ± hatasÄ±');this.program=program;
  this.gl.deleteShader(vs);this.gl.deleteShader(fs);
  this.attribPos=this.gl.getAttribLocation(program,'aPos');this.attribColor=this.gl.getAttribLocation(program,'aColor');this.attribNormal=this.gl.getAttribLocation(program,'aNormal');this.attribMat=this.gl.getAttribLocation(program,'aMat');this.uniformTime=this.gl.getUniformLocation(program,'uTime');this.uniformDetail=this.gl.getUniformLocation(program,'uDetail');this.uniformAlbedo=this.gl.getUniformLocation(program,'uAlbedoAtlas');this.uniformNormal=this.gl.getUniformLocation(program,'uNormalRoughAtlas');this.uniformAtlasReady=this.gl.getUniformLocation(program,'uAtlasReady');this.uniformCamera=this.gl.getUniformLocation(program,'uCameraPos');this.uniformRain=this.gl.getUniformLocation(program,'uRain');this.uniformFlood=this.gl.getUniformLocation(program,'uFloodLights[0]');this.uniformBrakes=this.gl.getUniformLocation(program,'uBrakeLights[0]');const uniform=this.gl.getUniformLocation(program,'uViewProj');if(!uniform)throw Error('Kamera oluÅŸturulamadÄ±');this.uniformMat=uniform;
  const sv=shader(this.gl,this.gl.VERTEX_SHADER,SKY_VERT),sf=shader(this.gl,this.gl.FRAGMENT_SHADER,SKY_FRAG);
  const sp=this.gl.createProgram();if(!sp)throw Error('Atmosfer baÅŸlatÄ±lamadÄ±');this.gl.attachShader(sp,sv);this.gl.attachShader(sp,sf);this.gl.linkProgram(sp);if(!this.gl.getProgramParameter(sp,this.gl.LINK_STATUS))throw Error('Atmosfer derlenemedi');this.skyProgram=sp;
  this.gl.deleteShader(sv);this.gl.deleteShader(sf);this.skyPos=this.gl.getAttribLocation(sp,'aPosition');this.skyTime=this.gl.getUniformLocation(sp,'uTime');this.skyYaw=this.gl.getUniformLocation(sp,'uYaw');this.skyWeather=this.gl.getUniformLocation(sp,'uRain');
  const skyBuffer=this.gl.createBuffer();if(!skyBuffer)throw Error('Atmosfer belleÄŸi oluÅŸturulamadÄ±');this.skyBuffer=skyBuffer;
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER,skyBuffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),this.gl.STATIC_DRAW);
  const sb=this.gl.createBuffer(),db=this.gl.createBuffer();if(!sb||!db)throw Error('WebGL belleÄŸi oluÅŸturulamadÄ±');this.staticBuffer=sb;this.dynamicBuffer=db;
  const verts=buildWorld(this.graphics);this.worldCount=verts.length/STRIDE;this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.staticBuffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(verts),this.gl.STATIC_DRAW);
  // G2 textures load asynchronously; shaded procedural fallbacks remain while pending.
  if(typeof Image!=='undefined')this.loadMaterialAtlases();
  // Optional 3D track signage: if browser disallows 2D textures, the race still works.
  if(typeof document!=='undefined')try{this.prepareBillboards();this.loadSponsorLogo();}catch(e){console.warn('Kart Rush signage fallback:',e);}
  for(let i=0;i<AI_DRIVERS.length;i++){
   const playerSlot=clamp(Math.floor(this.options.gridSlot??GRID_PLAYER_SLOT),0,21);
   const slot=i>=playerSlot?i+1:i;
   const lane=slot%2===0?-GRID_LANE:GRID_LANE;
   const profile=AI_DRIVERS[i];
   this.bots.push({id:'bot'+i,name:profile.name,color:profile.color,progress:GRID_FIRST-GRID_STEP*slot,lane,speed:0});
   this.botGridLane.push(lane);this.botTargets.push(lane);this.botPassLane.push(lane);this.botPassUntil.push(-100);this.botPowers.push(null);this.botTurboUntil.push(0);this.botShieldUntil.push(0);this.botPowerSince.push(0);this.botSlowedUntil.push(0);this.botRiskUntil.push(0);this.botRiskCheck.push(-999);this.botLastMistake.push(-99);this.botCornerStyle.push(0);this.botCornerMistake.push(0);this.botCornerCommitted.push(-999);
  }
  this.resize=()=>{
   const r=canvas.getBoundingClientRect();
   // V12: resolution adapts only when sustained FPS is low; geometry settings remain intact.
   const maxDpr=this.graphics==='high'?1.7:this.graphics==='balanced'?1.3:1;
   const dpr=Math.min(window.devicePixelRatio||1,maxDpr)*this.renderScale;
   const w=Math.max(1,Math.floor(r.width*dpr)),h=Math.max(1,Math.floor(r.height*dpr));
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;this.gl.viewport(0,0,w,h);}
  };
  window.addEventListener('resize',this.resize,{passive:true});this.resize();this.raf=requestAnimationFrame(this.frame);
 }
 setGraphics(g:KartGraphics){if(this.graphics===g)return;this.graphics=g;
  const verts=buildWorld(this.graphics);this.worldCount=verts.length/STRIDE;this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.staticBuffer);
  this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(verts),this.gl.STATIC_DRAW);
  if(this.billboardBuffer){const signs=billboardGeometry(this.graphics);this.billboardCount=signs.length/5;this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.billboardBuffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,signs,this.gl.STATIC_DRAW);}
  this.resize();}
 private loadMaterialAtlases(){
  const gl=this.gl;
  const albedo=gl.createTexture(),normal=gl.createTexture();
  if(!albedo||!normal){if(albedo)gl.deleteTexture(albedo);if(normal)gl.deleteTexture(normal);return;}
  this.surfaceAlbedo=albedo;this.surfaceNormal=normal;
  this.materialReady=false;
  let loaded=0;
  const setup=(texture:WebGLTexture,unit:number,rgba:boolean,url:string)=>{
   gl.activeTexture(unit);gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,255,255]));
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   const img=new Image();
   img.onload=()=>{
    if(this.stopped)return;
    gl.activeTexture(unit);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    // Quality mode does not disable mipmaps; far objects use reduced texture LOD automatically.
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    const ext=gl.getExtension('EXT_texture_filter_anisotropic') as {TEXTURE_MAX_ANISOTROPY_EXT:number;MAX_TEXTURE_MAX_ANISOTROPY_EXT:number}|null;
    if(ext){const max=gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number;gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,max));}
    loaded++;if(loaded===2)this.materialReady=true;
   };
   img.onerror=()=>{console.warn('Kart Rush Graphics 2.0 surface texture unavailable:',url);};
   img.src=url;
  };
  setup(albedo,gl.TEXTURE1,false,'/kart-rush/materials/surface-albedo-v2.png');
  setup(normal,gl.TEXTURE2,true,'/kart-rush/materials/surface-normal-rough-v2.png');
 }
 private prepareBillboards(){
  const gl=this.gl,vs=shader(gl,gl.VERTEX_SHADER,SIGN_VERT),fs=shader(gl,gl.FRAGMENT_SHADER,SIGN_FRAG);
  const pr=gl.createProgram();if(!pr)throw Error('Pist tabelalarÄ± baÅŸlatÄ±lamadÄ±');
  gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error('Pist tabelalarÄ± GPU hatasÄ±');
  gl.deleteShader(vs);gl.deleteShader(fs);
  const tex=gl.createTexture(),buffer=gl.createBuffer();if(!tex||!buffer){gl.deleteProgram(pr);throw Error('Pist tabelalarÄ± bellek hatasÄ±');}
  gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,makeSponsorAtlas());
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const signs=billboardGeometry(this.graphics);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,signs,gl.STATIC_DRAW);
  this.billboardCount=signs.length/5;this.billboardBuffer=buffer;this.billboardTexture=tex;this.billboardProgram=pr;
  this.billboardPos=gl.getAttribLocation(pr,'aPosition');this.billboardUV=gl.getAttribLocation(pr,'aUV');
  this.billboardMat=gl.getUniformLocation(pr,'uViewProj');
 }
 // Reuses the in-world billboard atlas; image is a local project asset, never a remote request.
 private loadSponsorLogo(){
  if(typeof Image==='undefined')return;
  const img=new Image();
  img.onload=()=>{
   if(this.stopped||!this.billboardTexture)return;
   const atlas=makeSponsorAtlas(),ctx=atlas.getContext('2d');
   if(!ctx)return;
   // Crop the supplied horizontal logo out of its square red source image.
   ctx.drawImage(img,0,img.height*.374,img.width,img.height*.252,0,0,512,128);
   const gl=this.gl;
   gl.bindTexture(gl.TEXTURE_2D,this.billboardTexture);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);
  };
  img.onerror=()=>{}; // Typography fallback remains visible on the billboards.
  img.src='/kart-rush-f1medipol-logo.png';
 }
 private readonly cameraLabels=['TAKÄ°P','YAKIN TAKÄ°P','HALO YAKIN','TV KAMERASI','BURUN','HALO KOKPÄ°T','SÃœRÃœCÃœ KOKPÄ°TÄ°'] as const;
 private cockpitSteer=0;
 private steerInput=0;
 cycleCamera(){this.cameraMode=(this.cameraMode+1)%this.cameraLabels.length;this.eye=null;this.target=null;return this.cameraLabels[this.cameraMode];}
 setLookBack(value:boolean){if(this.lookBack===value)return;this.lookBack=value;this.eye=null;this.target=null;}
 getCameraLabel(){return this.lookBack?'ARKA BAKIÅ':this.cameraLabels[this.cameraMode];}
  setKeys(keys:Partial<typeof this.keys>){this.keys={...this.keys,...keys};}
 rollStartEvent(): 'boost'|'penalty'|null{
  if(this.preRaceEvent!==null || this.elapsed<=-20 || this.elapsed>=-5 || this.finished)return null;
  this.preRaceEvent=Math.random()<.5?'boost':'penalty';
  return this.preRaceEvent;
 }
 usePower(){if(!this.paused&&!this.finished)this.inputPower=true;}
 honk(){const t=performance.now()/1000;if(this.paused||t-this.lastHorn<.7)return;this.lastHorn=t;
  this.options.onEffect?.('horn');
  if(this.options.bots)for(let i=0;i<this.bots.length;i++){
   const b=this.bots[i];const me=place(this.currentProgress,this.lane),other=place(b.progress,b.lane);
   if(Math.hypot(me.x-other.x,me.z-other.z)<28){this.botTargets[i]=clamp(b.lane+(b.lane>=this.lane?1:-1)*.9,-12,12);}
  }
 }
 setPaused(value:boolean){if(this.paused===value)return;this.paused=value;
  if(value)this.pausedAt=Date.now();else{this.pauseTotalMs+=Date.now()-this.pausedAt;this.last=0;}
  this.keys={throttle:false,brake:false,left:false,right:false};this.lateralVelocity=0;
 }
 setRemote(players:KartState[]){const n=new Map<string,KartState>();for(const p of players){if(p.id!==this.options.id)n.set(p.id,p);}this.remote=n;}
 receiveAttack(power:KartPower){if((power==='emp'||power==='pulse')&&performance.now()/1000>this.shieldUntil){this.slowUntil=performance.now()/1000+2.3;this.options.onEffect?.('emp');}}
 dispose(){this.stopped=true;cancelAnimationFrame(this.raf);window.removeEventListener('resize',this.resize);this.gl.deleteBuffer(this.staticBuffer);this.gl.deleteBuffer(this.dynamicBuffer);this.gl.deleteProgram(this.program);this.gl.deleteBuffer(this.skyBuffer);this.gl.deleteProgram(this.skyProgram);
  if(this.surfaceAlbedo)this.gl.deleteTexture(this.surfaceAlbedo);
  if(this.surfaceNormal)this.gl.deleteTexture(this.surfaceNormal);
  if(this.billboardTexture)this.gl.deleteTexture(this.billboardTexture);
  if(this.billboardBuffer)this.gl.deleteBuffer(this.billboardBuffer);
  if(this.billboardProgram)this.gl.deleteProgram(this.billboardProgram);
 }
 private tryContact(other:KartState,t:number,otherShield=false){
  if(Math.abs(wrap(this.currentProgress-other.progress+.5)-.5)*TRACK_LENGTH>5.5||Math.abs(this.lane-other.lane)>4.5)return;
  const a=place(this.currentProgress,this.lane),b=place(other.progress,other.lane);
  const dist=Math.hypot(a.x-b.x,a.z-b.z),key=other.id;
  if(dist>3.45||t<(this.otherHitTimes.get(key)||0))return;
  this.otherHitTimes.set(key,t+1.25);this.contactUntil=t+.42;
  const sign=this.lane>=other.lane?1:-1;
  this.lane=clamp(this.lane+sign*.54,-28,28);
  if(this.options.bots)other.lane=clamp(other.lane-sign*.28,-13,13);
  // The front car is not artificially stopped by a rear-end tap.
  // Both vehicles stay driveable, with damage accruing only gradually.
  const closing=Math.max(0,this.speed-other.speed);
  if(t>this.shieldUntil){
   this.speed=Math.max(10,this.speed*(closing>6?.89:.955));
   this.health=clamp(this.health-(closing>8?9:5),0,100);
  }
  if(this.options.bots&&!otherShield&&closing>8){other.speed=Math.max(14,other.speed-1.8);}
  this.lateralVelocity=sign*1.5;
  this.options.onEffect?.('collision');
 }
 private updateBots(t:number,dt:number){
  const difficulty=this.options.difficulty||'normal',base=(difficulty==='easy'?80:difficulty==='hard'?92:86)*this.paceFactor;
  for(let i=0;i<this.bots.length;i++){
   const b=this.bots[i];
   // KR-V19.1: once classified, a bot continues a calm cool-down lap instead of freezing at the line.
   if(b.finished||b.progress>=this.totalLaps){
    b.finished=true;
    const coolDownSpeed=clamp(cornerInfo(wrap(b.progress)).recommended*.64,17,27)*this.paceFactor;
    b.speed=mix(b.speed,coolDownSpeed,ease(1.65,dt));
    b.progress+=b.speed/TRACK_LENGTH*dt;
    b.lane=mix(b.lane,this.botGridLane[i],ease(.5,dt));
    continue;
   }
   const phase=wrap(b.progress),sector=.975+.045*Math.sin(phase*TAU*4+i*.9);
   // Bravery and car control are independent. EVERY difficulty attempts racing-line moves.
   const courage=difficulty==='hard'?.76+((i*17+7)%13)/65:((i*17+7)%13)/12,skill=difficulty==='hard'?.89+((i*7+3)%17)/175:((i*7+3)%17)/16;
   const wet=this.weather==='rain',gripWeather=wet?.77:1;
   const gridPhase=this.elapsed<3.5;
   const turnPlan=gridPhase?null:aiCornerMoment(b.progress);
   const cornerKey=turnPlan?Math.floor(b.progress)*128+turnPlan.index:-999;
   if(turnPlan && turnPlan.distance>25 && cornerKey!==this.botCornerCommitted[i]){
    this.botCornerCommitted[i]=cornerKey;
    // Seeded per driver AND per corner. Rarely two drivers pick the same maneuver.
    const seed=(x:number)=>{const v=Math.sin(x*12.9898+i*78.233+cornerKey*3.112)*43758.5453;return v-Math.floor(v);};
    // Everyone attacks at every corner; profiles vary by severity and skill.
    // risk is mandatory on all difficulty levels
    // 0=clean, 1=late braking, 2=inside dive, 3=outside sweep, 4=very late braking.
    this.botCornerStyle[i]=1+Math.floor(seed(2.8)*4);
    const riskWeight=this.botCornerStyle[i]===4?.23:this.botCornerStyle[i]===2?.15:.09;
    const errorChance=(difficulty==='easy'?.065:difficulty==='hard'?.006:.028)+riskWeight*(1-skill)*.24;
    this.botCornerMistake[i]=(seed(3.9)<errorChance*(wet?1.8:1))?1:0;
   }
   const style=turnPlan?this.botCornerStyle[i]:0;
   const committed=turnPlan&&this.botCornerCommitted[i]===cornerKey;
   const planDist=turnPlan?.distance??999;
   const planTurn=turnPlan?.corner.turn??1;
   const planSeverity=turnPlan?.corner.severity??0;
   const apexWindow=committed&&planDist<32&&planDist>-38;
   const attacked=committed&&style>0;
   // On a genuine late brake attempt the car carries MORE entry speed.
   // Running deep at the apex has a time penalty and can push it off track.
   const lateBrakeBoost=attacked&&planDist>25&&planDist<135?(difficulty==='hard'?1.35:1)*(style===4?13:style===1?8:style===2?10:6):0;
   const boosted=t<this.botTurboUntil[i],protectedBot=t<this.botShieldUntil[i];
   const curve=cornerInfo(phase);
   const gapAhead=wrap(this.currentProgress-b.progress),gapBehind=wrap(b.progress-this.currentProgress);
   let desired=(base+i*.22)*sector+(boosted?16:0)-Math.abs(b.lane)*.10;
   if(gapAhead>.003&&gapAhead<.055)desired+=Math.min(4,(gapAhead-.003)*75);
   if(gapBehind<.03)desired+=1.0;
   if(curve.sharp<.14&&gapAhead>.003&&gapAhead<.05)desired+=3.1;
   if(t<this.botSlowedUntil[i]&&!protectedBot)desired*=.86;
   const cornerFloor=(difficulty==='easy'?34:difficulty==='hard'?50:43)*gripWeather;
   const difficultyPace=(difficulty==='easy'?1.15:difficulty==='hard'?1.44:1.27);
   const bravery=.96+courage*.30+(skill-.5)*.10;
   let apexLimit=Math.max(cornerFloor,curve.recommended*bravery*difficultyPace*gripWeather+1)*this.paceFactor;
   // Different braking points, rather than the same hard speed cap for every AI.
   if(lateBrakeBoost>0)apexLimit+=lateBrakeBoost*this.paceFactor;
   if(apexWindow&&attacked)apexLimit*=1.05+(style===4?.15:style===2?.11:.06);
   desired=Math.min(desired,apexLimit+(boosted?5:0));
   // Keep the pack racing; no universal walking-pace braking in technical bends.
   desired=Math.max(cornerFloor*.93*this.paceFactor,desired);
   if(difficulty==='hard'&&apexWindow&&attacked)desired=Math.max(desired,Math.min(base,apexLimit*1.02));
   // Look for the front car; late divers do not brake behind it if a lane is open.
   let nearest=90,blockingLane=0,blockingSpeed=0;
   for(let j=-1;j<this.bots.length;j++){
    if(j===i)continue;
    const other=j<0?{progress:this.currentProgress,lane:this.lane,speed:this.speed}:this.bots[j];
    const gap=wrap(other.progress-b.progress)*TRACK_LENGTH;
    if(gap>3 && gap<nearest && gap<85 && Math.abs(other.lane-b.lane)<5.2){
     nearest=gap;blockingLane=other.lane;blockingSpeed=other.speed;
    }
   }
   // Plan the corner on a real racing line: outside -> inside apex -> exit.
   let target=this.botGridLane[i]*.30+Math.sin(phase*TAU*1.1+i)*.55;
   if(committed){
    const line=aiTurnLine(planDist,planTurn,planSeverity,style,courage);
    target=line+(this.botGridLane[i]*.12);
    if(style===2&&planDist>15&&planDist<80)target+=planTurn*1.7;
   }
   if(gridPhase)target=this.botGridLane[i];
   // Overtaking retains side commitment while in a corner. No sudden dive into an occupied lane.
   if(!gridPhase && this.botRiskUntil[i]<=t){
    if(t<this.botPassUntil[i])target=this.botPassLane[i];
    else if(nearest<36+courage*18 && (blockingSpeed<b.speed+5 || nearest<20+courage*9)){
     const margin=5.7;
     let bestLane:number|null=null,bestScore=1e9;
     for(const side of [-1,1]){
      const candidate=clamp(blockingLane+side*margin,-10.5,10.5);
      if(Math.abs(candidate-blockingLane)<5.0)continue;
      let busy=false;
      for(let j=-1;j<this.bots.length;j++){
       if(j===i)continue;
       const other=j<0?{progress:this.currentProgress,lane:this.lane}:this.bots[j];
       const gap=Math.abs(wrap(other.progress-b.progress+.5)-.5)*TRACK_LENGTH;
       if(gap<21 && Math.abs(other.lane-candidate)<3.6){busy=true;break;}
      }
      if(busy)continue;
      const preferInside=turnPlan && side===planTurn?-1.2:0;
      const score=Math.abs(candidate-b.lane)+Math.abs(candidate)*.13+preferInside+(side===(i%2?1:-1)?0:.4);
      if(score<bestScore){bestScore=score;bestLane=candidate;}
     }
     if(bestLane!==null){
      this.botPassLane[i]=bestLane;this.botPassUntil[i]=t+(apexWindow?3.2:4.8);target=bestLane;
     }else{
      desired=Math.min(desired,Math.max(26*gripWeather,blockingSpeed-.5));
      target=clamp(blockingLane+(i%2?.5:-.5),-10,10);
     }
    }
   }
   // A higher-risk maneuver sometimes succeeds (reward: faster corner),
   // sometimes locks a tyre / misses apex (penalty: run wide, slowdown).
   if(apexWindow&&this.botCornerMistake[i]===1&&this.botRiskUntil[i]<t&&t-this.botLastMistake[i]>7){
    this.botRiskUntil[i]=t+.70+(style===4?.25:0)+(wet?.30:0);
    this.botLastMistake[i]=t;
    this.botCornerMistake[i]=2; // avoid re-triggering at this apex
   }
   if(t<this.botRiskUntil[i]){
    target=planTurn*(15.6+4.6*courage);
    // A momentary slide / run-wide, not a full stop.
    desired=Math.min(desired,Math.max(wet?22:29,curve.recommended*gripWeather*.87));
   }
   // Pickups are secondary to keeping the car on its chosen turn-in line.
   if(!gridPhase&&!committed&&this.botRiskUntil[i]<=t&&!this.botPowers[i])for(let j=0;j<PICKUP_POS.length;j++)for(let k=0;k<PICKUP_LANES.length;k++){
    const ahead=(PICKUP_POS[j]-phase+1)%1;
    const key=`${Math.floor(b.progress+ahead)}:${j}:${k}`;
    if(ahead<.035 && !this.botCollected.has(`${i}:${key}`)){
     const lane=PICKUP_LANES[k];if(Math.abs(lane-b.lane)<5.5)target=lane;
    }
   }
   // The following proximity braking is AFTER selection of a clear passing corridor.
   const passing=t<this.botPassUntil[i]&&Math.abs(target-blockingLane)>4.2;
   if(nearest<12&&!passing&&Math.abs(b.lane-blockingLane)<3.7)
    desired=Math.min(desired,Math.max(12,blockingSpeed+(nearest-4)*.22));
   const expectedSpeed=mix(b.speed,desired,ease(desired<b.speed?(3.0+skill*1.25):(boosted?5.2:3.5+courage),dt));
   b.speed=clamp(expectedSpeed,Math.max(0,b.speed-58*dt),b.speed+(boosted?50:44)*dt);
   this.botTargets[i]=mix(this.botTargets[i],clamp(target,-25,25),ease(3.15,dt));
   const steerResponse=t<this.botRiskUntil[i]?2.2:(1.55+skill*.78);
   const laneBefore=b.lane;
   b.lane=mix(b.lane,this.botTargets[i],ease(steerResponse,dt));
   // Sudden high-speed direction changes consume available grip, especially in rain.
   const laneChangeSpeed=Math.abs(b.lane-laneBefore)/Math.max(dt,.001);
   const lineLimit=wet?13.7:18.5;
   if(laneChangeSpeed>lineLimit&&b.speed>28&&apexWindow){
    b.speed=Math.max(11,b.speed-(laneChangeSpeed-lineLimit)*dt*(wet?1.1:.65));
   }
   if(Math.abs(b.lane)>14.4){
    b.speed=Math.max(wet?18:24,b.speed-(wet?22:16)*dt);
   }
   if(Math.abs(b.lane)>26){b.lane=Math.sign(b.lane)*25.5;b.speed=Math.max(wet?17:22,b.speed*.78);}
   // Brake-lamp state from genuine deceleration, not a fake speed threshold.
   if(this.elapsed>0&&this.botPriorSpeed[i]>15&&b.speed<this.botPriorSpeed[i]-Math.max(.18,dt*7))this.botBrakeUntil[i]=t+.32;
   this.botPriorSpeed[i]=b.speed;
   const old=b.progress;
   b.progress+=b.speed/TRACK_LENGTH*dt;
   for(let j=0;j<PICKUP_POS.length;j++)for(let k=0;k<PICKUP_LANES.length;k++){
    const p=PICKUP_POS[j],lane=PICKUP_LANES[k],lap=Math.floor(b.progress),key=`${i}:${lap}:${j}:${k}`;
    if(Math.floor(b.progress-p)>Math.floor(old-p)&&Math.abs(b.lane-lane)<3.2&&!this.botCollected.has(key)&&t>(this.pickupCooldown.get(`${j}:${k}`)||0)){
     this.botCollected.add(key);this.pickupCooldown.set(`${j}:${k}`,t+2.4);
     if(!this.botPowers[i]){this.botPowers[i]=randomPower();this.botPowerSince[i]=t;}
    }
   }
   const held=this.botPowers[i],nearPlayer=Math.abs(b.progress-this.currentProgress)<.14;
   if(held && t-this.botPowerSince[i]>(held==='shield'?1.25:.75) &&
     (held==='turbo'||held==='shield'||nearPlayer||t-this.botPowerSince[i]>5)){
    // Only audible power activations close to the local car.
    if((held==='turbo'||held==='shield')&&Math.abs(wrap(b.progress-this.currentProgress+.5)-.5)<.028)
     this.options.onEffect?.(held==='turbo'?'rival-turbo':'rival-shield');
    if(held==='turbo')this.botTurboUntil[i]=t+3.3;
    if(held==='magnet')this.botTurboUntil[i]=Math.max(this.botTurboUntil[i],t+1.5);
    if(held==='repair')b.speed=Math.min(b.speed+6,45);
    if(held==='pulse'){
     const targets=[{id:-1,dist:Math.abs(wrap(this.currentProgress-b.progress+.5)-.5)*TRACK_LENGTH},
      ...this.bots.map((x,j)=>({id:j,dist:j===i?9999:Math.abs(wrap(x.progress-b.progress+.5)-.5)*TRACK_LENGTH}))]
      .filter(x=>x.dist<85).sort((a,b)=>a.dist-b.dist).slice(0,1);
     for(const x of targets){if(x.id===-1){if(t>this.shieldUntil)this.slowUntil=Math.max(this.slowUntil,t+1.0);}else if(t>this.botShieldUntil[x.id])this.botSlowedUntil[x.id]=Math.max(this.botSlowedUntil[x.id],t+1.2);}
    }
    if(held==='shield')this.botShieldUntil[i]=t+6.5;
    if(held==='emp'){
     const targets=[{id:-1,dist:Math.abs(wrap(this.currentProgress-b.progress+.5)-.5)*TRACK_LENGTH},
      ...this.bots.map((x,j)=>({id:j,dist:j===i?9999:Math.abs(wrap(x.progress-b.progress+.5)-.5)*TRACK_LENGTH}))]
      .filter(x=>x.dist<105).sort((a,b)=>a.dist-b.dist).slice(0,2);
     for(const x of targets){if(x.id===-1){if(t>this.shieldUntil){this.slowUntil=Math.max(this.slowUntil,t+1.8);this.options.onEffect?.('emp');}}else if(t>this.botShieldUntil[x.id])this.botSlowedUntil[x.id]=Math.max(this.botSlowedUntil[x.id],t+2.0);}
    }
    this.botPowers[i]=null;
   }
  }
  // AI-to-AI soft body collisions, with individual cooldown per pair.
  for(let i=0;i<this.bots.length;i++)for(let j=i+1;j<this.bots.length;j++){
   const a=this.bots[i],b=this.bots[j];
   // Cheap phase/lane reject before the expensive spline-to-world-coordinate lookups.
   if(Math.abs(wrap(a.progress-b.progress+.5)-.5)*TRACK_LENGTH>5.5||Math.abs(a.lane-b.lane)>4.5)continue;
   const key=`bot-${i}-${j}`;
   if(t<(this.otherHitTimes.get(key)||0))continue;
   const pa=place(a.progress,a.lane),pb=place(b.progress,b.lane);
   if(Math.hypot(pa.x-pb.x,pa.z-pb.z)<2.8){
    const sign=a.lane>=b.lane?1:-1;
    a.lane=clamp(a.lane+sign*.40,-10,10);b.lane=clamp(b.lane-sign*.40,-10,10);
    if(t>this.botShieldUntil[i])a.speed*=.95;
    if(t>this.botShieldUntil[j])b.speed*=.95;
    this.otherHitTimes.set(key,t+.55);
   }
  }
 }
 private frame=(ts:number)=>{
  if(this.stopped)return;
  this.frameCounter++;if(ts-this.fpsTime>1400){
   this.fps=Math.round(this.frameCounter*1000/Math.max(ts-this.fpsTime,1));this.frameCounter=0;this.fpsTime=ts;
   const previous=this.renderScale;
   if(this.fps<38)this.renderScale=Math.max(.68,this.renderScale-.10);
   else if(this.fps>57)this.renderScale=Math.min(1,this.renderScale+.035);
   if(Math.abs(this.renderScale-previous)>.004)this.resize();
  }this.raf=requestAnimationFrame(this.frame);if(!this.last)this.last=ts;
  const dt=clamp((ts-this.last)/1000,0,.055);this.last=ts;this.elapsed=this.finished?this.finishElapsed:((this.paused?this.pausedAt:Date.now())-this.options.startAt-this.pauseTotalMs)/1000;
  const countdown=Math.max(0,Math.ceil(-this.elapsed)),started=this.elapsed>=0;
  if(started&&!this.paused){
   const t=ts/1000;
   if(this.finished){
    // KR-V19.1: the race is classified, but the scene and race cars stay alive.
    // This branch leaves all pre-finish steering, braking and collision physics untouched.
    const paradeSpeed=clamp(cornerInfo(wrap(this.currentProgress)).recommended*.64,17,27)*this.paceFactor;
    this.speed=mix(this.speed,paradeSpeed,ease(1.6,dt));
    this.lane=mix(this.lane,0,ease(.45,dt));
    this.headingYaw=yawFor(this.currentProgress);
    this.lateralVelocity=0;
    this.wheelRotation=(this.wheelRotation+this.speed*dt/.57)%TAU;
    this.currentProgress+=this.speed/TRACK_LENGTH*dt;
    this.pitActive=false;
    this.inputPower=false;
    if(this.options.bots)this.updateBots(t,dt);
    if(ts-this.lastBroadcast>150){this.lastBroadcast=ts;this.options.onSnapshot?.({id:this.options.id,progress:this.currentProgress,lane:this.lane,speed:this.speed,color:this.options.color,name:this.options.name,finished:true});}
   }else{
    const turbo=t<this.turboUntil,slowed=t<this.slowUntil;
   const frac=wrap(this.currentProgress),pitZone=frac>.961||frac<.042;
   const inPit=pitZone&&this.lane>14.5&&this.lane<20.2;
   const offroad=Math.abs(this.lane)>14.4&&!inPit;
   const curve=cornerInfo(frac);
   const healthFactor=.75+.25*this.health/100;
   const apexLimit=curve.recommended*this.paceFactor*(this.weather==='rain'?.75:1);
   this.cornerWarning=curve.sharp>.15?Math.round(apexLimit*3.6):0;
   const braking=this.keys.brake,throttle=this.keys.throttle;
   // Fast but progressive rack: wheel reaches 90% command in ~0.105s.
   // Unlike G3.9 this NEVER takes seconds to produce useful front-wheel lock.
   const steerTarget=(this.keys.right?1:0)-(this.keys.left?1:0);
   this.steerInput=mix(this.steerInput,steerTarget,ease(22,dt));
   const steer=this.steerInput;
   // W applies torque only. There is NO automatic corner following, steering or braking.
   const resistance=1.7+.028*this.speed+.0024*this.speed*this.speed;
   const wet=this.weather==='rain';
   const gambleActive=this.preRaceEvent!==null && this.elapsed<30;
   const eventAccel=gambleActive?(this.preRaceEvent==='boost'?1.15:.88):1;
   // Healthy Formula car: 300 km/h (83.33 m/s) on a clear dry straight.
   // Damage, weather, off-road, pit lane and rival abilities retain consequences.
   let acceleration=(throttle?(turbo?35:27)*(wet?.85:1)*eventAccel:0)-(braking?(wet?32:46):0)-resistance;
   if(offroad)acceleration-=14;
   if(slowed)acceleration-=7;
   this.speed=Math.max(0,this.speed+acceleration*dt);
   // Race length is not an engine limiter: healthy car 280 km/h without turbo,
   // Fast pace is allowed 300 km/h; turbo is a temporary higher ceiling.
   const roadCap=this.options.pace==='fast'?83.3333333333:77.7777777778;
   const cap=(inPit?20:offroad?26:slowed?30:turbo?94:roadCap)*healthFactor;
   if(this.speed>cap)this.speed=Math.max(cap,this.speed-(offroad?53:slowed?36:35)*dt);
   // A real heading relative to the circuit. On a bend the circuit changes direction;
   // if A/D aren't pressed the car keeps its heading and physically runs wide.
   const oldYaw=yawFor(this.currentProgress);
   const overspeed=Math.max(0,this.speed-apexLimit);
   // Keep controllable steering authority even when approaching corners fast.
   // Rain remains substantially less grippy, and too much speed still pushes wide.
   const grip=clamp(1-overspeed/(Math.max(18,apexLimit)*1.9),.44,1)*(wet?.69:1)*(gambleActive?(this.preRaceEvent==='boost'?1.09:.84):1);
   // More responsive steering rack and shorter effective arcade wheelbase.
   // Straight-line top speed is higher, but the driver still has to brake in hairpins.
   const wheelAngle=steer*(.54/(1+this.speed*.023));
   const yawRate=(this.speed/5.35)*Math.tan(wheelAngle)*grip;
   this.headingYaw+=yawRate*dt;
   const headingError=angleDiff(this.headingYaw,oldYaw);
   const longitudinal=this.speed*Math.max(.08,Math.cos(headingError));
   this.lateralVelocity=this.speed*Math.sin(headingError);
   this.lane+=this.lateralVelocity*dt;
   this.currentProgress+=longitudinal/TRACK_LENGTH*dt;
   const wall=Math.abs(this.lane)>=27.2;
   if(wall){
    this.wallStuckFor+=dt;
    const sign=Math.sign(this.lane);
    this.lane=sign*27.2;
    this.lateralVelocity=0;
    // Barriers are not an invisible auto-steering assist: they cost time and car health.
    if(t>this.hitCooldown){
     this.hitCooldown=t+.85;
     if(t>this.shieldUntil)this.health=clamp(this.health-12-Math.round(this.speed*.11),0,100);
     this.options.onEffect?.('collision');
    }
    this.speed=Math.min(14,this.speed*.48);
    // A glancing wall impact leaves the nose roughly aligned but the driver must steer back.
    this.headingYaw=yawFor(this.currentProgress)+sign*.17;
    if(this.wallStuckFor>3.2){
     // Timed marshals' recovery: time loss and damaged car, never auto-driving mid-corner.
     this.lane=sign*11.5;this.speed=6;
     this.headingYaw=yawFor(this.currentProgress);this.wallStuckFor=0;
    }
   }else this.wallStuckFor=0;
   this.oversteer=mix(this.oversteer,Math.abs(headingError),ease(3.8,dt));
   this.pitActive=inPit;
   if(inPit&&this.speed<8&&!throttle){this.pitProgress=clamp(this.pitProgress+dt/4.2,0,1);
    if(this.pitProgress>=1){this.health=100;this.pitProgress=0;this.options.onEffect?.('repair');}
   }else this.pitProgress=0;
   this.wheelRotation=(this.wheelRotation+this.speed*dt/.57)%TAU;
   const lap=Math.max(0,Math.floor(Math.max(0,this.currentProgress)));
   if(this.currentProgress>=this.totalLaps){this.finished=true;this.finishElapsed=this.elapsed;this.finishRank=1+(this.options.bots?this.bots:[...this.remote.values()]).filter(p=>p.progress>this.currentProgress).length;const end=Math.round(this.elapsed*1000);const last=end-this.lapStart;if(last>0)this.bestLap=this.bestLap===0?last:Math.min(this.bestLap,last);this.options.onFinish(end,this.bestLap||end);}
   else if(lap>this.lastLapNumber){const now=Math.round(this.elapsed*1000);if(this.lastLapNumber>=0){const ms=now-this.lapStart;this.bestLap=this.bestLap===0?ms:Math.min(this.bestLap,ms);}this.lapStart=now;this.lastLapNumber=lap;}
   for(let i=0;i<PICKUP_POS.length;i++)for(let j=0;j<PICKUP_LANES.length;j++){
    const p=PICKUP_POS[i],lane=PICKUP_LANES[j],key=`${Math.floor(this.currentProgress)}:${i}:${j}`;
    const delta=Math.abs(wrap(this.currentProgress)-p);
    const radius=t<this.magnetUntil?17:3.0;
    if(delta<(t<this.magnetUntil?.032:.009)&&Math.abs(this.lane-lane)<radius&&!this.collected.has(key)&&t>(this.pickupCooldown.get(`${i}:${j}`)||0)){
     if(this.power)continue;
     this.collected.add(key);this.pickupCooldown.set(`${i}:${j}`,t+2.4);
     this.power=randomPower();this.options.onEffect?.('pickup');
    }
   }
   if(this.inputPower&&this.power){const pow=this.power;this.power=null;
    if(pow==='repair'){this.health=clamp(this.health+32,0,100);this.options.onEffect?.('repair');}
    if(pow==='magnet'){this.magnetUntil=t+11;this.options.onEffect?.('magnet');}
    if(pow==='pulse'||pow==='emp'){
     this.options.onEffect?.(pow);
     const radius=pow==='emp'?105:78,maxTargets=pow==='emp'?2:1;
     if(this.options.bots){
      const src=place(this.currentProgress,this.lane);
      const targets=this.bots.map((bot,i)=>({i,bot,d:Math.hypot(place(bot.progress,bot.lane).x-src.x,place(bot.progress,bot.lane).z-src.z)}))
        .filter(x=>x.d<radius&&t>this.botShieldUntil[x.i]).sort((a,b)=>a.d-b.d).slice(0,maxTargets);
      for(const target of targets)this.botSlowedUntil[target.i]=Math.max(this.botSlowedUntil[target.i],t+(pow==='emp'?2.0:1.15));
     }else{
      const src=place(this.currentProgress,this.lane);
      const targets=[...this.remote.values()].map(x=>({id:x.id,d:Math.hypot(place(x.progress,x.lane).x-src.x,place(x.progress,x.lane).z-src.z)}))
        .filter(x=>x.d<radius).sort((a,b)=>a.d-b.d).slice(0,maxTargets).map(x=>x.id);
      if(targets.length)this.options.onPower?.(pow,targets);
     }
    }
    if(pow==='turbo'){this.turboUntil=t+3.5;this.options.onEffect?.('boost');}
    if(pow==='shield'){this.shieldUntil=t+7;this.options.onEffect?.('shield');}
   }
   this.inputPower=false;
   if(this.options.bots){this.updateBots(t,dt);
    for(let i=0;i<this.bots.length;i++)this.tryContact(this.bots[i],t,t<this.botShieldUntil[i]);
   }else for(const rival of this.remote.values())this.tryContact(rival,t);
   if(ts-this.lastBroadcast>150){this.lastBroadcast=ts;this.options.onSnapshot?.({id:this.options.id,progress:this.currentProgress,lane:this.lane,speed:this.speed,color:this.options.color,name:this.options.name,finished:this.finished});}
   }
  }
  if(ts-this.lastHud>(this.options.bots?200:125)){this.lastHud=ts;const others=this.options.bots?this.bots:[...this.remote.values()];const rank=this.finished?this.finishRank:(1+others.filter(p=>p.progress>this.currentProgress).length);
   const rivals=[{id:this.options.id,name:this.options.name,color:this.options.color,progress:this.currentProgress},...others.map(b=>({id:b.id,name:b.name,color:b.color,progress:b.progress}))].sort((a,b)=>b.progress-a.progress);
   this.options.onHud({speed:Math.round(this.speed*3.6),camera:this.getCameraLabel(),cornerSpeed:this.cornerWarning,lap:Math.min(this.totalLaps,Math.max(1,Math.floor(Math.max(0,this.currentProgress))+1)),totalLaps:this.totalLaps,remaining:Math.max(0,this.totalLaps-this.currentProgress),health:Math.round(this.health),pit:this.pitActive,pitProgress:this.pitProgress,magnet:ts/1000<this.magnetUntil,lights:countdown>0?clamp(6-countdown,0,5):0,power:this.power,rank,total:others.length+1,elapsed:Math.max(0,this.elapsed),started,countdown,shield:ts/1000<this.shieldUntil,turbo:ts/1000<this.turboUntil,fps:this.fps,bestLapMs:this.bestLap,offroad:Math.abs(this.lane)>14.4&&!this.pitActive,progress:this.currentProgress,throttle:this.keys.throttle,braking:this.keys.brake,contact:ts/1000<this.contactUntil,rivals});
  }
  this.draw(ts/1000,dt);
 };
 private draw(time:number,dt:number){
  const gl=this.gl;
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
  gl.useProgram(this.skyProgram);gl.bindBuffer(gl.ARRAY_BUFFER,this.skyBuffer);
  gl.enableVertexAttribArray(this.skyPos);gl.vertexAttribPointer(this.skyPos,2,gl.FLOAT,false,8,0);
  gl.uniform1f(this.skyTime,time);
  const worldYaw=this.headingYaw;
  gl.uniform1f(this.skyYaw,worldYaw);gl.uniform1f(this.skyWeather,this.weather==='rain'?1:0);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  const pos=place(this.currentProgress,this.lane);
  const t={x:Math.sin(this.headingYaw),y:0,z:-Math.cos(this.headingYaw)};
  const boost=time<this.turboUntil;
  const rear=this.lookBack;
  const travel=clamp(this.speed/50,0,1);
  // Camera positions keep a safety margin from the physical car shell (rear wing / airbox).
  // Hood camera is AHEAD of the nose; the local player mesh is hidden in that mode.
  let behind=13.2,height=5.3,ahead=26+this.speed*.24,lookHeight=1.24;
  if(this.cameraMode===1){behind=7.2;height=3.40;ahead=31;lookHeight=1.02;}
  if(this.cameraMode===2){behind=4.4;height=2.48;ahead=25;lookHeight=.98;}
  if(this.cameraMode===3){behind=21.5;height=9.9;ahead=29;lookHeight=1.68;}
  if(this.cameraMode===4){behind=-5.6;height=3.20;ahead=40;lookHeight=1.72;}
  // G3.7.1: both onboard cameras are moved deeper into the survival cell.
  // This prevents the camera from feeling like it exits the car under acceleration.
  if(this.cameraMode===5){behind=.52;height=2.12;ahead=21.9;lookHeight=1.31;}
  if(this.cameraMode===6){behind=.66;height=1.92;ahead=20.9;lookHeight=1.18;}
  if(rear){behind=-8.3;height=4.8;ahead=-47;lookHeight=1.35;}
  if(boost&&!rear&&this.cameraMode!==5&&this.cameraMode!==6){behind+=1.25;height+=.25;}
  const inCockpit=!rear&&(this.cameraMode===5||this.cameraMode===6);
  const sway=rear||inCockpit?0:clamp(this.lateralVelocity*.024,-.21,.21);
  let wantedEye={x:pos.x-t.x*behind-t.z*sway,y:pos.y+height+Math.sin(time*22)*travel*(inCockpit?0:.028),z:pos.z-t.z*behind+t.x*sway};
  let wantedTarget={x:pos.x+t.x*ahead,y:pos.y+lookHeight,z:pos.z+t.z*ahead};
  // 15-second three-stage freecam tour: main straight -> infield -> grid.
  if(this.elapsed < -5){
   const phase=clamp((this.elapsed+20.0)/15,0,1);
   const smooth=phase*phase*(3-2*phase);
   const path=wrap(.965+smooth*.36);
   const focal=place(path,0);
   const side=68+12*Math.sin(smooth*3.2);
   const fly=place(path,side);
   wantedEye={x:fly.x,y:fly.y+37-7*smooth,z:fly.z};
   wantedTarget={x:focal.x,y:focal.y+3.0,z:focal.z};
  }
  if(!this.eye){this.eye=wantedEye;this.target=wantedTarget;}else{
   const k=inCockpit?1:ease(rear?9.5:(this.cameraMode===5?22:this.cameraMode===6?24:7.5),dt);this.eye={x:mix(this.eye.x,wantedEye.x,k),y:mix(this.eye.y,wantedEye.y,k),z:mix(this.eye.z,wantedEye.z,k)};
   this.target={x:mix(this.target!.x,wantedTarget.x,k),y:mix(this.target!.y,wantedTarget.y,k),z:mix(this.target!.z,wantedTarget.z,k)};
  }
  const fov=rear?1.12:this.cameraMode===5?.96:this.cameraMode===6?.95:this.cameraMode===4?1.06:this.cameraMode===2?1.01:clamp(1.00+travel*.31+(boost?.11:0),.99,1.44);
  const proj=projection(fov,this.canvas.width/this.canvas.height,inCockpit?.05:.3,1250),mat=mul(proj,lookAt(this.eye,this.target!));gl.useProgram(this.program);gl.uniformMatrix4fv(this.uniformMat,false,mat);
  gl.uniform1f(this.uniformTime,time);gl.uniform1f(this.uniformRain,this.weather==='rain'?1:0);gl.uniform1f(this.uniformDetail,this.graphics==='low'?0:this.graphics==='balanced'?.65:1);
  gl.uniform1f(this.uniformAtlasReady,this.materialReady&&this.graphics!=='low'?1:0);
  gl.uniform3f(this.uniformCamera,this.eye!.x,this.eye!.y,this.eye!.z);
  // Only the closest four towers affect surface lighting; extra visible poles stay geometric.
  const floodData=new Float32Array(16);
  const closestFLOOD=FLOOD_SITES.map((site,i)=>({site,i,d:(site.head.x-this.eye!.x)**2+(site.head.z-this.eye!.z)**2}))
   .filter(entry=>floodSiteVisible(entry.i,this.graphics)).sort((a,b)=>a.d-b.d).slice(0,4);
  for(let i=0;i<closestFLOOD.length;i++){
   const site=closestFLOOD[i].site;
   floodData[i*4]=site.head.x;floodData[i*4+1]=site.head.z;
   floodData[i*4+2]=this.graphics==='low'?138:165;
   floodData[i*4+3]=this.weather==='rain'?2.25:1.55;
  }
  gl.uniform4fv(this.uniformFlood,floodData);
  const brakeData=new Float32Array(16);
  const brakeCandidates:{x:number;z:number;strength:number;d:number}[]=[];
  if(this.keys.brake&&this.speed>3&&!this.finished){
   const px=pos.x-t.x*2.05,pz=pos.z-t.z*2.05;
   brakeCandidates.push({x:px,z:pz,strength:1.0,d:(px-this.eye!.x)**2+(pz-this.eye!.z)**2});
  }
  if(this.options.bots){
   for(let i=0;i<this.bots.length;i++)if(time<this.botBrakeUntil[i]&&!this.bots[i].finished){
    const b=this.bots[i],p=place(b.progress,b.lane),d=tangent(b.progress);
    const px=p.x-d.x*2.10,pz=p.z-d.z*2.10;
    brakeCandidates.push({x:px,z:pz,strength:.86,d:(px-this.eye!.x)**2+(pz-this.eye!.z)**2});
   }
  }
  brakeCandidates.sort((a,b)=>a.d-b.d);
  for(let i=0;i<Math.min(4,brakeCandidates.length);i++){
   const b=brakeCandidates[i];brakeData[i*4]=b.x;brakeData[i*4+1]=b.z;
   brakeData[i*4+2]=this.weather==='rain'?12.5:7.0;brakeData[i*4+3]=b.strength;
  }
  gl.uniform4fv(this.uniformBrakes,brakeData);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.surfaceAlbedo);gl.uniform1i(this.uniformAlbedo,1);
  gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.surfaceNormal);gl.uniform1i(this.uniformNormal,2);
  gl.activeTexture(gl.TEXTURE0);
  const drawBuffer=(buf:WebGLBuffer,n:number)=>{
   gl.bindBuffer(gl.ARRAY_BUFFER,buf);
   gl.enableVertexAttribArray(this.attribPos);gl.enableVertexAttribArray(this.attribColor);gl.enableVertexAttribArray(this.attribNormal);gl.enableVertexAttribArray(this.attribMat);
   gl.vertexAttribPointer(this.attribPos,3,gl.FLOAT,false,STRIDE*4,0);
   gl.vertexAttribPointer(this.attribColor,3,gl.FLOAT,false,STRIDE*4,12);
   gl.vertexAttribPointer(this.attribNormal,3,gl.FLOAT,false,STRIDE*4,24);
   gl.vertexAttribPointer(this.attribMat,1,gl.FLOAT,false,STRIDE*4,36);
   gl.drawArrays(gl.TRIANGLES,0,n);
  };
  drawBuffer(this.staticBuffer,this.worldCount);
  if(this.billboardProgram&&this.billboardBuffer&&this.billboardTexture){
   gl.useProgram(this.billboardProgram);gl.uniformMatrix4fv(this.billboardMat,false,mat);
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.billboardTexture);
   gl.bindBuffer(gl.ARRAY_BUFFER,this.billboardBuffer);
   gl.enableVertexAttribArray(this.billboardPos);gl.enableVertexAttribArray(this.billboardUV);
   gl.vertexAttribPointer(this.billboardPos,3,gl.FLOAT,false,20,0);
   gl.vertexAttribPointer(this.billboardUV,2,gl.FLOAT,false,20,12);
   gl.drawArrays(gl.TRIANGLES,0,this.billboardCount);
   gl.disableVertexAttribArray(this.billboardPos);gl.disableVertexAttribArray(this.billboardUV);
   gl.useProgram(this.program);gl.uniformMatrix4fv(this.uniformMat,false,mat);
  }
  const dyn:Vertex=[];
  const lampsOn=this.elapsed>=0?0:clamp(Math.ceil(5+this.elapsed),0,5);
  for(let lamp=0;lamp<5;lamp++){
   const pp=place(0,-8+lamp*4);
   box(dyn,pp.x,pp.y+9.7,pp.z,.95,.82,.60,lamp<lampsOn?[.95,.045,.06]:[.12,.13,.14],yawFor(0),lamp<lampsOn?MAT_GLOW:MAT_METAL);
  }
  // Geometry is built only when an object might actually be visible.
  // 22 cars remain active in AI/leaderboard simulation; only near opponents use expensive full meshes.
  const cameraDistance=rear?400:500;
  // G2.8: Proximity-triggered camera bursts. Audio uses the same 24 fixed locations
  // and the same entry threshold; no random distant flashing out of sync with the player.
  if(this.graphics!=='low')for(let n=0;n<72;n++){
   const f=(n+.4)/72,side=n%2?1:-1;
   const distance=Math.abs(wrap(f-wrap(this.currentProgress)+.5)-.5)*TRACK_LENGTH;
   if(distance>TRACK_LENGTH*.013)this.cameraFlashArmed[n]=true;
   if(this.elapsed>=0&&distance<TRACK_LENGTH*.005&&this.cameraFlashArmed[n]){
    this.cameraFlashAt[n]=time;
    this.cameraFlashArmed[n]=false;
   }
   const age=time-this.cameraFlashAt[n];
   if(age<0||age>.50||distance>235)continue;
   const strike=(at:number)=>Math.max(0,1-Math.abs(age-at)/.085);
   const power=Math.max(strike(.035),strike(.155)*.85,strike(.290)*.48);
   if(power<=0)continue;
   const point=place(f,side*41),y=point.y+12.7;
   const s=.26+1.75*power;
   box(dyn,point.x,y,point.z,s*3.25,s*.22,s*.35,[1,1,1],yawFor(f),MAT_GLOW);
   box(dyn,point.x,y,point.z,s*.25,s*3.2,s*.35,[1,1,1],yawFor(f),MAT_GLOW);
   box(dyn,point.x,y,point.z,s*1.16,s*1.16,s*.85,[1,.99,.94],yawFor(f),MAT_GLOW);
  }
  for(let i=0;i<PICKUP_POS.length;i++)for(let j=0;j<PICKUP_LANES.length;j++){
   const delta=Math.abs(wrap(PICKUP_POS[i]-wrap(this.currentProgress)+.5)-.5)*TRACK_LENGTH;
   if(delta<cameraDistance&&time>(this.pickupCooldown.get(`${i}:${j}`)||0))pickup(dyn,PICKUP_POS[i],PICKUP_LANES[j],time);
  }
  const nearCars:{car:KartState;d:number;shield:boolean;boost:boolean}[]=[];
  const addVisible=(other:KartState,shield:boolean,boosted:boolean)=>{
   const forward=wrap(other.progress-this.currentProgress)*TRACK_LENGTH;
   const backward=wrap(this.currentProgress-other.progress)*TRACK_LENGTH;
   const minDist=Math.min(forward,backward);
   const visible=rear?backward<420:forward<480||backward<85;
   if(visible)nearCars.push({car:other,d:minDist,shield,boost:boosted});
  };
  if(this.options.bots){for(let i=0;i<this.bots.length;i++)addVisible(this.bots[i],time<this.botShieldUntil[i],time<this.botTurboUntil[i]);}
  else for(const other of this.remote.values())addVisible(other,false,false);
  nearCars.sort((a,b)=>a.d-b.d);
  const fullBudget=this.graphics==='high'?8:this.graphics==='balanced'?6:3;
  for(let i=0;i<nearCars.length;i++){
   const {car:opponent,d,shield,boost:boosted}=nearCars[i];
   if(i<fullBudget&&d<190){
    const lodQuality=this.graphics==='high'&&i<3?'high':this.graphics==='low'?'low':'balanced';
    car(dyn,opponent.progress,opponent.lane,opponent.color,shield,boosted,0,lodQuality,time,time*opponent.speed/.57,this.options.bots?time<this.botBrakeUntil[Number(opponent.id.slice(3))]:(opponent.speed<17));
   }else{
    carLite(dyn,opponent.progress,opponent.lane,opponent.color,this.graphics);
   }
  }
  // V9: removed old speedWake ribbons; they looked like white lines glued to the car.
  if(rear||(this.cameraMode!==4&&this.cameraMode!==5&&this.cameraMode!==6))car(dyn,this.currentProgress,this.lane,this.options.color,time<this.shieldUntil,boost,angleDiff(this.headingYaw,yawFor(this.currentProgress)),this.graphics,time,this.wheelRotation,this.keys.brake,this.steerInput);
  if((this.cameraMode===5||this.cameraMode===6)&&!rear){
   this.cockpitSteer=mix(this.cockpitSteer,(Number(this.keys.left)-Number(this.keys.right))*.68,ease(6.2,dt));
   cockpitInterior(dyn,pos,this.headingYaw,this.options.color,this.cockpitSteer,time,this.speed,this.wheelRotation,this.cameraMode===5,this.graphics);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(dyn),gl.DYNAMIC_DRAW);drawBuffer(this.dynamicBuffer,dyn.length/STRIDE);
 }
}

