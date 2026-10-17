/* F1 Medipol Kart Rush Graphics 2.0 Stage 1: textured WebGL material pipeline.
 * Dependency-free WebGL; no Supabase calls in the animation/render loop.
 * V11 visuals: fuller F1-style 22-car field, cleaner broadcast HUD, richer environment and reduced auto-assist feel.
 */
export type KartPower = 'turbo' | 'shield' | 'emp' | 'repair' | 'pulse' | 'magnet';
export type KartDifficulty = 'easy' | 'normal' | 'hard';
export type KartGraphics = 'low' | 'balanced' | 'high';
export type KartPace = 'fast' | 'standard' | 'long';
export type KartState = { id: string; progress: number; lane: number; speed: number; color: string; name: string; finished?: boolean };
export type KartHud = {
 speed: number; lap: number; totalLaps: number; remaining: number; cornerSpeed?: number; camera?: string; health: number; pit: boolean; pitProgress: number; magnet: boolean; lights: number;
 power: KartPower | null; rank: number; total: number; elapsed: number; started: boolean; countdown: number;
 shield: boolean; turbo: boolean; fps?: number; bestLapMs?: number; offroad?: boolean; progress?: number; throttle?: boolean; contact?: boolean;
 rivals?: { id: string; name: string; color: string; progress: number }[];
};
export type KartOptions = {
 id: string; color: string; name: string; startAt: number; laps?: number; pace?: KartPace; bots?: boolean; difficulty?: KartDifficulty; graphics?: KartGraphics;
 onHud: (hud: KartHud) => void; onFinish: (durationMs: number, bestLapMs: number) => void;
 onSnapshot?: (s: KartState) => void; onPower?: (power: KartPower) => void; onEffect?: (effect:'pickup'|'boost'|'shield'|'emp'|'collision'|'horn'|'repair'|'pulse'|'magnet'|'rival-turbo'|'rival-shield'|'overtake'|'position-lost') => void;
};
type Vec={x:number;y:number;z:number};type Vertex=number[];
type C=[number,number,number];
const TAU=Math.PI*2;
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const wrap=(x:number)=>((x%1)+1)%1;
const mix=(a:number,b:number,k:number)=>a+(b-a)*k;
const ease=(rate:number,dt:number)=>1-Math.exp(-rate*dt);
const rgb=(hex:string):C=>{const t=hex.replace('#','');const n=parseInt(t,16);return Number.isFinite(n)?[((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255]:[1,.18,.25]};
// V9: physical arc-length sampling. All driving, road mesh, grid and mini-map share one track.
// A progress delta now represents the SAME world distance on straights and in hairpins.
export const TRACK_POINTS:{x:number;z:number}[]=[
 {x:-260,z:-520},{x:0,z:-520},{x:260,z:-520},{x:590,z:-505},
 {x:840,z:-410},{x:1010,z:-180},{x:1010,z:160},{x:790,z:450},
 {x:510,z:550},{x:445,z:360},{x:505,z:190},{x:315,z:114},
 {x:80,z:183},{x:-160,z:370},{x:-500,z:580},
 {x:-850,z:480},{x:-1040,z:190},{x:-970,z:-170},
 {x:-730,z:-450},{x:-480,z:-520},
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
function cornerInfo(progress:number){
 // 28 m and 65 m look-ahead, independent of spline control point spacing.
 const near=28/TRACK_LENGTH,far=78/TRACK_LENGTH;
 const t0=tangent(progress),t1=tangent(progress+near),t2=tangent(progress+far);
 const dot=clamp(t0.x*t2.x+t0.z*t2.z,-1,1);
 const sharp=Math.max(Math.acos(dot),Math.acos(clamp(t0.x*t1.x+t0.z*t1.z,-1,1))*2.3);
 const recommended=sharp>.95?8:sharp>.72?12:sharp>.55?17:sharp>.39?24:sharp>.27?31:sharp>.17?39:sharp>.10?47:64;
 const cross=t0.x*t2.z-t0.z*t2.x;
 return {sharp,recommended,turn:Math.sign(cross)};
}

// Interleaved geometry: xyz + RGB + surface normal + material id.
// Normal-based directional light and procedural fragment materials upgrade the flat V2 palette.
const STRIDE=10;
const MAT_BASIC=0, MAT_GRASS=1, MAT_ASPHALT=2, MAT_METAL=3, MAT_GLOW=4, MAT_GLASS=5, MAT_WATER=6, MAT_SKY=7, MAT_CARBON=8, MAT_TYRE=9, MAT_KERB=10, MAT_CONCRETE=11;
function vertex(v:Vertex,p:Vec,c:C,n:Vec,mat=MAT_BASIC){v.push(p.x,p.y,p.z,...c,n.x,n.y,n.z,mat)}
function tri(v:Vertex,a:Vec,b:Vec,c:Vec,col:C,mat=MAT_BASIC){
 const u={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},w={x:c.x-a.x,y:c.y-a.y,z:c.z-a.z};
 const nx=u.y*w.z-u.z*w.y,ny=u.z*w.x-u.x*w.z,nz=u.x*w.y-u.y*w.x,len=Math.hypot(nx,ny,nz)||1;
 const flip=(Math.abs(ny)>Math.abs(nx)+Math.abs(nz)&&ny<0)?-1:1;const n={x:nx/len*flip,y:ny/len*flip,z:nz/len*flip};vertex(v,a,col,n,mat);vertex(v,b,col,n,mat);vertex(v,c,col,n,mat);
}
function quad(v:Vertex,a:Vec,b:Vec,c:Vec,d:Vec,col:C,mat=MAT_BASIC){tri(v,a,b,c,col,mat);tri(v,a,c,d,col,mat)}
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
 {name:'Max Verstappen',color:'#1e5bff'},{name:'Lando Norris',color:'#ff7a1a'},
 {name:'Oscar Piastri',color:'#ff9c3b'},{name:'Charles Leclerc',color:'#cf1f2e'},
 {name:'Lewis Hamilton',color:'#d03b46'},{name:'George Russell',color:'#19d2c5'},
 {name:'Kimi Antonelli',color:'#33ece0'},{name:'Fernando Alonso',color:'#0f8f54'},
 {name:'Lance Stroll',color:'#1ba464'},{name:'Yuki Tsunoda',color:'#2333c7'},
 {name:'Liam Lawson',color:'#4a5dff'},{name:'Pierre Gasly',color:'#ff5e5e'},
 {name:'Esteban Ocon',color:'#ff7d63'},{name:'Oliver Bearman',color:'#9f1f2b'},
 {name:'Alex Albon',color:'#4fa1ff'},{name:'Carlos Sainz',color:'#195fcb'},
 {name:'Nico Hulkenberg',color:'#1dc7a5'},{name:'Gabriel Bortoleto',color:'#37dfb7'},
 {name:'Valtteri Bottas',color:'#1450a9'},{name:'Sergio Perez',color:'#103fb3'},
 {name:'Felipe Drugovich',color:'#168754'}
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

function buildWorld(quality:KartGraphics='balanced'):Vertex{
 const v:Vertex=[];
 // A continuous, low terrain sheet sits BELOW the road; never put an overlapping grass polygon on the asphalt.
 quad(v,{x:-1800,y:-8,z:-1800},{x:1800,y:-8,z:-1800},{x:1800,y:-8,z:1800},{x:-1800,y:-8,z:1800},[.10,.18,.12],MAT_GRASS);
 for(let i=0;i<64;i++){
  const a=i*TAU/64,b=(i+1)*TAU/64,ra=1690+(i*17%75),rb=1690+((i+1)*17%75),peak=70+(i*13%90);
  tri(v,{x:ra*Math.cos(a),y:-9,z:ra*Math.sin(a)},{x:(ra+rb)*.5*Math.cos((a+b)*.5),y:peak,z:(ra+rb)*.5*Math.sin((a+b)*.5)},{x:rb*Math.cos(b),y:-9,z:rb*Math.sin(b)},i%3===0?[.28,.34,.38]:i%3===1?[.35,.40,.43]:[.23,.29,.33]);
 }
 const N=quality==='low'?300:quality==='high'?760:525;
 const strip=(a:number,b:number,left:number,right:number,rise:number,color:C,mat:number)=>{
  const aa=place(a,left),ab=place(a,right),bb=place(b,right),ba=place(b,left);
  aa.y+=rise;ab.y+=rise;bb.y+=rise;ba.y+=rise;
  quad(v,aa,ab,bb,ba,color,mat);
 };
 for(let i=0;i<N;i++){
  const a=i/N,b=(i+1)/N;
  // Adjacent bands share boundaries, but their INTERIORS never overlap. Curb and road height are controlled separately.
  strip(a,b,-33,-17,-.14,[.10,.18,.12],MAT_GRASS);
  if(wrap(a)>.963 || wrap(a)<.039){
   strip(a,b,17,24,.05,[.15,.16,.17],MAT_ASPHALT);
   strip(a,b,18.4,18.65,.148,[.87,.85,.77],MAT_BASIC);
   strip(a,b,24,33,-.14,[.11,.19,.13],MAT_GRASS);
  }else strip(a,b,17,33,-.14,[.11,.19,.13],MAT_GRASS);
  strip(a,b,-17,-15.4,.028,[.24,.26,.25],MAT_ASPHALT);
  strip(a,b,15.4,17,.028,[.24,.26,.25],MAT_ASPHALT);
  strip(a,b,-15.4,-14.25,.145,Math.floor(i/7)%2?[.88,.88,.85]:[.68,.10,.14],MAT_KERB);
  strip(a,b,14.25,15.4,.145,Math.floor(i/7)%2?[.88,.88,.85]:[.68,.10,.14],MAT_KERB);
  strip(a,b,-14.25,14.25,.105,[.125,.130,.141],MAT_ASPHALT);
  // Painted WHITE circuit boundaries sit just above the asphalt, not in the grass.
  strip(a,b,-14.12,-13.99,.124,[.78,.80,.79],MAT_BASIC);
  strip(a,b,13.99,14.12,.124,[.78,.80,.79],MAT_BASIC);
  // Kilometer ticks and reflective side guide dots help perceive very high forward speed.
  if(quality!=='low' && i%9===0){
   for(const side of [-1,1])strip(a,b,side*13.2-.12,side*13.2+.12,.143,[.51,.55,.55],MAT_BASIC);
  }
  // Intermittent tyre-rubber streaks and asphalt expansion joints follow the racing line.
  if(quality!=='low' && i%4!==0){
   const rubber=.025*Math.sin(i*.35);
   strip(a,b,-2.8+rubber,-2.70+rubber,.129,[.065,.067,.073],MAT_ASPHALT);
   strip(a,b,2.5-rubber,2.57-rubber,.129,[.067,.069,.075],MAT_ASPHALT);
  }
  if(i%Math.max(6,Math.round(N/95))===0){
   for(const side of [-1,1]){
    const pos=place(a,side*27),angle=yawFor(a);
    box(v,pos.x,pos.y-.18,pos.z,.32,1.05,TRACK_LENGTH/N*2.6,[.54,.61,.66],angle,MAT_METAL);
    box(v,pos.x,pos.y+.48,pos.z,.40,.17,TRACK_LENGTH/N*2.6,[.92,.94,.95],angle,MAT_METAL);
    if(i%Math.max(18,Math.round(N/34))===0){
     const p=place(a,side*27.3);box(v,p.x,p.y-.2,p.z,.43,1.7,.40,[.18,.23,.26],0,MAT_METAL);
    }
   }
  }
 }
 // Service roads, paddock aprons and spectator promenade areas help the venue feel less empty.
 for(const [from,to,left,right,rise,col] of [
  [.905,.045,31,54,-.35,[.16,.17,.18]],
  [.105,.165,-54,-31,-.30,[.15,.16,.17]],
  [.505,.575,30,48,-.32,[.15,.16,.17]],
  [.665,.735,-50,-34,-.35,[.15,.16,.17]],
 ] as const){
  const spans = from<to ? [[from,to]] : [[from,1],[0,to]];
  for(const [sa,sb] of spans)for(let i=0;i<26;i++){
   const a=mix(sa,sb,i/26),b=mix(sa,sb,(i+1)/26);
   strip(a,b,left,right,rise,col as C,MAT_ASPHALT);
  }
 }
 // V9: static high-speed sightline cues, NOT ribbons attached to the player's car.
 // Signs, reflector buttons and guardrails are anchored permanently to world coordinates.
 if(quality!=='low')for(let i=0;i<(quality==='high'?310:150);i++){
  const f=i/(quality==='high'?310:150);
  for(const side of [-1,1]){
   const p=place(f,side*23.6),t=tangent(f);
   const x=p.x,z=p.z;
   box(v,x,p.y-.17,z,.14,.50,.27,i%5===0?[.80,.17,.20]:[.44,.48,.48],yawFor(f),MAT_METAL);
   if(i%4===0){
    const pos=place(f,side*30.5);
    box(v,pos.x,pos.y+.36,pos.z,.12,1.0,.12,[.39,.43,.47],yawFor(f),MAT_METAL);
    box(v,pos.x,pos.y+1.19,pos.z,.42,.15,.10,[.72,.75,.74],yawFor(f),MAT_GLASS);
   }
  }
 }
 // Finish line and full two-column 22-car grid, entirely on the straight.
 for(let k=0;k<22;k++){
  const prog=wrap(-.0016-k*.00098),lane=k%2===0?-4.5:4.5;
  const half=2.25,from=prog-.00034,to=prog+.00034;
  strip(from,to,lane-half,lane-half+.14,.155,[.82,.85,.85],MAT_BASIC);
  strip(from,to,lane+half-.14,lane+half,.155,[.82,.85,.85],MAT_BASIC);
  strip(from,from+.00004,lane-half,lane+half,.155,[.84,.85,.86],MAT_BASIC);
 }
 for(let l=-13;l<13;l+=2)for(let row=0;row<2;row++)if((Math.floor((l+13)/2)+row)%2===0){
  strip(.9996+row*.00026,.99986+row*.00026,l,l+2,.16,[.91,.92,.90],MAT_BASIC);
 }
 const checkpoint=pt(0);
 for(const side of [-1,1]){
  const pillar=place(0,side*25);box(v,pillar.x,pillar.y-.6,pillar.z,.85,11.8,.85,[.17,.19,.23],0,MAT_METAL);
 }
 box(v,checkpoint.x,checkpoint.y+10.3,checkpoint.z,51,1.15,2.2,[.14,.17,.21],yawFor(0),MAT_METAL);
 // Light bulbs are drawn dynamically so 5 red lights build up and extinguish on GO.
 for(let l=-8;l<=8;l+=4){const pp=place(0,l);box(v,pp.x,pp.y+9.55,pp.z,1.8,1.0,.48,[.06,.065,.07],yawFor(0),MAT_METAL);}
 // Motorsport venues: grandstands and pit furniture, no houses/towers/buildings crowding hairpins.
 for(const [prog,side] of [[.022,-1],[.026,1],[.94,1],[.944,-1]] as const){
  const p=place(prog,side*72);grandstand(v,p.x,p.y-1.8,p.z,yawFor(prog)+(side>0?-Math.PI/2:Math.PI/2),5,side===1?[.36,.72,.91]:[.89,.23,.31]);
 }
 for(const [prog,side] of [[.13,-1],[.41,1],[.68,-1],[.83,1]] as const){
  const p=place(prog,side*72);for(let i=0;i<5;i++){
   const q=place(prog+i*.003,side*(67+(i%2)*5));
   box(v,q.x,q.y-1,q.z,5.2,1.25,2.2,[.18,.24,.27],yawFor(prog),MAT_METAL);
   box(v,q.x,q.y+.22,q.z,5.35,.16,2.4,i%2?[.85,.12,.20]:[.14,.43,.68],yawFor(prog),MAT_GLOW);
  }
  makeFlag(v,p.x,p.y-1,p.z,[.93,.17,.25]);
 }
 // Semi-permanent spectator stands: deliberately empty sections keep the venue believable.
 // All stands remain far beyond the 28m racing/runoff envelope.
 if(quality!=='low')for(const [prog,side] of [[.075,-1],[.18,1],[.23,1],[.35,-1],[.48,-1],[.61,1],[.74,1],[.89,-1]] as const){
  const p=place(prog,side*82);
  grandstand(v,p.x,p.y-1.7,p.z,yawFor(prog)+(side>0?-Math.PI/2:Math.PI/2),quality==='high'?7:5,[.34,.39,.43],true);
 }
 // Hospitality tents / paddock cabins around the outer roads.
 for(const [prog,side,count] of [[.11,-1,6],[.53,1,7],[.71,-1,5],[.93,1,6]] as const){
  for(let i=0;i<count;i++){
   const p=place(prog+i*.0028,side*(56+(i%2)*4));
   box(v,p.x,p.y-.9,p.z,5.3,1.5,4.0,[.86,.87,.89],yawFor(prog),MAT_METAL);
   box(v,p.x,p.y+.55,p.z,5.6,.22,4.3,[.62,.67,.72],yawFor(prog),MAT_METAL);
   if(i%2===0)box(v,p.x,p.y+.88,p.z,5.1,.16,3.4,[.84,.18,.24],yawFor(prog),MAT_GLOW);
  }
 }
 // Marshals / camera gantries and the modest safety fencing match the dusk-era track palette.
 if(quality==='high')for(let k=0;k<26;k++){
  const progress=(k+.5)/26,side=k%2?1:-1,p=place(progress,side*45);
  cylinder(v,p.x,p.y-.85,p.z,.11,5.2,[.36,.42,.46],7);
  box(v,p.x,p.y+4.1,p.z,1.25,.24,.75,[.19,.24,.28],yawFor(progress),MAT_METAL);
  box(v,p.x,p.y+4.28,p.z,.42,.25,.32,[.68,.72,.71],yawFor(progress),MAT_GLASS);
 }
 // Low tyre stacks far from the circuit but within the runoff. No billboard pillar blocks the driving line.
 for(let i=0;i<72;i++){
  const prog=i/72,side=i%2?-1:1;
  if(i%5===0){const p=place(prog,side*31);for(let k=0;k<3;k++)cylinder(v,p.x,p.y-.6+k*.38,p.z,.79,.39,[.07,.09,.11],quality==='low'?7:12,MAT_METAL);}
  if(i%3===0){const p=place(prog,side*40);lampPost(v,p.x,p.y-1.2,p.z,quality==='low'?6:8,yawFor(prog));}
 }
 const trees=quality==='low'?95:quality==='high'?315:205;
 for(let i=0;i<trees;i++){
  const frac=(i*.618033988749895)%1,side=i%2?-1:1,offset=quality==='high'?80+i%48:90+i%34,p=place(frac,side*offset);
  cylinder(v,p.x,p.y-1,p.z,.26,2.5,[.27,.25,.19],6);
  cone(v,p.x,p.y+.50,p.z,2.7,5.3,[.10,.24+(i%5)*.022,.16],quality==='low'?5:quality==='high'?11:8);
  cone(v,p.x,p.y+2.0,p.z,2.15,4.4,[.12,.28+(i%4)*.020,.18],quality==='low'?5:8);
  cone(v,p.x,p.y+3.4,p.z,1.36,3.3,[.15,.33,.20],quality==='low'?5:8);
 }
 if(quality==='high')for(let i=0;i<220;i++){
  const prog=(i*.7548776662)%1,side=i%2?-1:1,offset=34+(i*7%13),p=place(prog,side*offset),col:C=i%4===0?[.26,.40,.24]:[.19,.34,.18];
  cone(v,p.x,p.y-.8,p.z,.27,.53,col,5);
 }
 // Overhead sponsor arches leave >10m under them and >12m clear width from centre.
 for(const prog of [.12,.53,.79]){
  const p=pt(prog);archway(v,p.x,p.y-.4,p.z,49,12.5,1.6,yawFor(prog),[.24,.30,.36],[.93,.16,.24]);
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
 const ctx=cvs.getContext('2d');if(!ctx)throw Error('Pist tabela çizimi desteklenmiyor');
 const rows:[string,string,string,string,string][]=[
  ['#140f16','#ffffff','F1 MEDIPOL','OFFICIAL TRACKSIDE PARTNER','#ef304c'],
  ['#131c2a','#f4f7fb','KART RUSH 3D','NIGHT GRAND PRIX','#71c8ff'],
  ['#1e232b','#fff3c2','PIT ENTRY','PRECISION + CONTROL','#f1c15d'],
  ['#edf1f4','#182432','APEX CLUB','FULL SEND · NO LIFT','#ef304c']
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
void main(){vec4 c=texture2D(uTexture,vUV);gl_FragColor=vec4(mix(c.rgb,vec3(.64,.72,.74),vFog),1.);}`;
// Fragment pipeline: fog, directional sun + cool sky fill, rough asphalt, grass and water microdetail.
// No external textures or network requests: all surface variation is generated on the GPU.
const VERT=`attribute vec3 aPos;attribute vec3 aColor;attribute vec3 aNormal;attribute float aMat;
uniform mat4 uViewProj;varying vec3 vColor;varying vec3 vNormal;varying vec3 vWorld;varying float vDistance;varying float vMat;
void main(){vec4 p=uViewProj*vec4(aPos,1.0);gl_Position=p;vColor=aColor;vNormal=aNormal;vWorld=aPos;vDistance=p.w;vMat=aMat;}`;
const FRAG=`precision highp float;
varying vec3 vColor;varying vec3 vNormal;varying vec3 vWorld;varying float vDistance;varying float vMat;
uniform float uTime;uniform float uDetail;uniform float uAtlasReady;
uniform sampler2D uAlbedoAtlas;uniform sampler2D uNormalRoughAtlas;
uniform vec3 uCameraPos;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
vec2 atlasUv(float idx,vec2 worldUv){
 float column=mod(idx,4.0),row=floor(idx/4.0);
 // A one-texel inset prevents adjacent material atlas cells from bleeding.
 return (vec2(column,row)+.004+.992*fract(worldUv))/vec2(4.0,2.0);
}
void main(){
 float kind=floor(vMat+.5);
 vec3 n=normalize(vNormal);
 vec3 sunlight=normalize(vec3(-.34,.86,-.38));
 vec3 skylight=normalize(vec3(.28,.72,.61));
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
 // Two real PNG atlases: albedo and packed tangent-space normal + roughness.
 if(uAtlasReady>.5&&uDetail>.05&&(asphalt||grass||metal||carbon||tyre||kerb||concrete)){
  float texId=asphalt?0.0:grass?1.0:carbon?2.0:tyre?3.0:kerb?4.0:metal?5.0:7.0;
  float meters=asphalt?4.4:grass?5.5:carbon?.55:tyre?.88:kerb?1.7:metal?2.5:3.0;
  vec3 a=abs(n);
  vec2 coord=a.y>.62?vWorld.xz:(a.z>a.x?vWorld.xy:vWorld.zy);
  vec2 uv=atlasUv(texId,coord/meters);
  vec3 texColor=texture2D(uAlbedoAtlas,uv).rgb;
  vec4 normalRoughSample=texture2D(uNormalRoughAtlas,uv);
  vec2 perturb=normalRoughSample.xy*2.0-1.0;
  // Horizontal surfaces receive displacement-derived lighting, while sides use softer detail.
  if(a.y>.62){n=normalize(n+vec3(perturb.x,0.0,perturb.y)*(asphalt?.31:grass?.35:.20));}
  else{n=normalize(n+vec3(perturb.x,perturb.y,0.0)*.13);}
  roughness=normalRoughSample.a;
  if(asphalt){albedo=mix(vColor,texColor*vec3(.40,.42,.45),.80);}
  else if(grass){albedo=mix(vColor,texColor*vec3(.62,.62,.60),.64);}
  else if(kerb){albedo*=.66+dot(texColor,vec3(.333))*.52;}
  else if(tyre){albedo=mix(vColor,texColor*vec3(.17,.17,.18),.46);}
  else if(carbon){albedo*=.63+dot(texColor,vec3(.333))*.9;}
  else if(metal){albedo*=.76+dot(texColor,vec3(.333))*.38;}
  else if(concrete){albedo=mix(vColor,texColor*.72,.5);}
 }else{
  if(asphalt){float a=noise(vWorld.xz*.60)*.12;float b=noise(vWorld.xz*23.0)*.08;albedo*=.80+a+b;}
  if(grass){albedo*=.76+noise(vWorld.xz*1.4)*.22;}
  if(carbon){albedo*=.92;}
 }
 if(metal){roughness=.32;}
 if(carbon){roughness=.38;}
 if(glass){roughness=.17;albedo=mix(albedo,vec3(.43,.72,.87),.24);}
 if(tyre){roughness=.94;}
 if(glow){albedo*=1.14;}
 if(water){albedo*=.78+.34*noise(vWorld.xz*.26+vec2(uTime*.08));}
 float direct=max(0.,dot(n,sunlight));
 float ambient=max(0.,dot(n,skylight));
 // Ambient sky fill + warm key light, with material-dependent microfacet highlights.
 float lightAmount=.40+.77*direct+.13*ambient;
 vec3 color=albedo*lightAmount;
 vec3 viewDir=normalize(uCameraPos-vWorld);
 vec3 halfway=normalize(sunlight+viewDir);
 float gloss=1.0-roughness;
 float shininess=mix(12.0,92.0,gloss);
 float specular=pow(max(dot(n,halfway),0.),shininess);
 float metalLevel=(metal||carbon)?.70:(glass?.45:.075);
 color+=vec3(1.0,.87,.73)*specular*metalLevel*(.3+.70*gloss);
 float rim=pow(1.0-max(0.,dot(n,viewDir)),3.0);
 color+=vec3(.15,.21,.26)*rim*(metal||carbon?.14:.035);
 if(glass){color+=vec3(.035,.07,.085);}
 if(glow){color+=albedo*.33;}
 float fog=1.0-exp(-pow(max(0.0,vDistance-80.0)/385.0,1.34));
 color=mix(color,vec3(.40,.47,.54),clamp(fog,0.,.82));
 color=(color*(2.51*color+.03))/(color*(2.43*color+.59)+.14);
 gl_FragColor=vec4(pow(clamp(color,0.,1.),vec3(.96)),1.0);
}`;
const SKY_VERT=`attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
const SKY_FRAG=`precision mediump float;varying vec2 vUv;uniform float uTime;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
void main(){
 float y=vUv.y;
 vec3 top=vec3(.018,.030,.060),mid=vec3(.090,.155,.245),horizon=vec3(.36,.39,.42);
 vec3 col=mix(horizon,mid,smoothstep(.12,.53,y));
 col=mix(col,top,smoothstep(.58,1.,y));
 vec2 sun=vec2(.76,.79);float d=length((vUv-sun)*vec2(1.2,1.));
 col+=vec3(.98,.63,.32)*pow(max(0.,1.-d*1.8),5.)*.38;
 col+=vec3(1.,.86,.70)*pow(max(0.,1.-d*5.),18.)*.45;
 float clouds=n(vec2(vUv.x*5.+uTime*.003, y*15.))+n(vec2(vUv.x*13.+uTime*.002,y*27.))*.38+n(vec2(vUv.x*25.-uTime*.0015,y*35.))*.18;
 float cloudMask=smoothstep(.88,1.24,clouds)*smoothstep(.28,.50,y)*(1.-smoothstep(.73,.88,y));
 col=mix(col,vec3(.95,.96,.94),cloudMask*.53);
 gl_FragColor=vec4(col,1.);
}`;
function shader(gl:WebGLRenderingContext,type:number,src:string){const s=gl.createShader(type);if(!s)throw Error('Shader oluşturulamadı');gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Shader derlenemedi');return s;}
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
function car(v:Vertex,p:number,lane:number,color:string,shield=false,boost=false,drift=0,quality:KartGraphics='balanced',time=0,wheelSpin=0,braking=false,steer=0){
 const pos=place(p,lane),yaw=yawFor(p)+clamp(drift,-.11,.11),baseY=pos.y+.12,c=rgb(color);
 const ca=Math.cos(yaw),sa=Math.sin(yaw);
 const at=(x:number,y:number,z:number):Vec=>({x:pos.x+x*ca-z*sa,y:baseY+y,z:pos.z+x*sa+z*ca});
 const block=(x:number,z:number,y:number,w:number,h:number,d:number,col:C,mat=MAT_METAL)=>{const t=at(x,y,z);box(v,t.x,t.y,t.z,w,h,d,col,yaw,mat)};
 const panel=(a:Vec,b:Vec,d:Vec,e:Vec,col:C,mat=MAT_METAL)=>quad(v,a,b,d,e,col,mat);
 const carbon:C=[.035,.046,.054],rubber:C=[.042,.047,.052],stripe=light(c,1.22);
 ellipseShadow(v,{x:pos.x,y:pos.y+.12,z:pos.z},yaw,1.52,1);
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
 block(0,.08,.25,1.65,.20,5.3,carbon,MAT_CARBON);
 hull(-3.42,-3.00,.13,.19,.37,.53,c);
 hull(-3.00,-1.18,.19,.72,.35,.57,c);
 hull(-1.18,.75,.72,1.16,.31,.85,c);
 hull(.75,2.40,1.16,.72,.32,.77,c);
 sculptTop([{z:-3.42,w:.14,y:.50,bulge:.08},{z:-2.7,w:.24,y:.54,bulge:.14},{z:-2.05,w:.40,y:.56,bulge:.19},{z:-1.3,w:.57,y:.56,bulge:.25}],light(c,1.12));
 sculptTop([{z:.82,w:.59,y:.75,bulge:.16},{z:1.3,w:.69,y:.72,bulge:.23},{z:1.75,w:.62,y:.69,bulge:.19},{z:2.08,w:.49,y:.65,bulge:.11},{z:2.38,w:.36,y:.61,bulge:.05}],light(c,1.07));
 sculptTop([{z:-.38,w:.88,y:.63,bulge:.08},{z:.20,w:.96,y:.66,bulge:.10},{z:.95,w:.86,y:.69,bulge:.08}],light(c,.96));

 block(0,-1.85,.56,.14,.04,2.20,stripe,MAT_GLOW);
 block(0,1.1,.82,.14,.035,2.05,stripe,MAT_GLOW);
 // Sharper livery decals and specular accents to move away from a flat toy-like finish.
 block(0,-.36,.94,.36,.045,2.84,[.94,.95,.97],MAT_METAL);
 block(0,.86,.90,.22,.032,1.18,[.18,.19,.21],MAT_GLOW);
 for(const sign of [-1,1]){
  block(sign*.93,.24,.54,.06,.08,2.44,[.92,.93,.95],MAT_METAL);
  block(sign*.78,1.10,.62,.055,.05,.64,[.18,.20,.22],MAT_GLOW);
  block(sign*.62,-1.08,.46,.11,.04,.92,[.88,.90,.93],MAT_METAL);
 }
 for(const sign of [-1,1]){
  // Slim sidepods with radiators, tapered toward the gearbox.
  const a=at(sign*.58,.37,-.72),b=at(sign*1.02,.39,-.26),d=at(sign*.96,.66,1.44),e=at(sign*.49,.72,1.28);
  panel(a,b,d,e,light(c,.71));
  // Soft three-station 'coke-bottle' sidepod instead of a rectangular slab.
  quad(v,at(sign*.74,.36,-.88),at(sign*1.10,.36,-.32),at(sign*1.02,.47,.74),at(sign*.59,.52,.90),light(c,.78),MAT_METAL);
  quad(v,at(sign*.59,.52,.90),at(sign*1.02,.47,.74),at(sign*.80,.41,1.77),at(sign*.47,.45,1.84),light(c,.66),MAT_METAL);
  block(sign*.77,.68,.50,.07,.22,.92,[.10,.13,.16],MAT_GLASS);
  block(sign*.74,1.02,.58,.15,.07,.56,light(c,1.15),MAT_GLOW);
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
 block(0,1.08,.90,.51,.56,.73,light(c,.67));
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
   f1Wheel(v,at,sign*1.55,.61,z,quality,wheelSpin,z<0?steer*.26:0);
  }
  block(sign*.78,2.36,.48,.10,.21,.43,braking?[1,.12,.14]:[.22,.035,.06],braking?MAT_GLOW:MAT_METAL);
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
 if(shield)for(let j=0;j<3;j++)ring(v,{x:pos.x,y:pos.y,z:pos.z},2.7+j*.12,.55+j*.83,[.12,.85,1]);
 if(boost)for(const sign of [-1,1]){
  const wave=.5+.5*Math.sin(time*22+sign);
  block(sign*.34,3.3,.40,.24,.19,1.18+wave,[1,.27,.05],MAT_GLOW);
  block(sign*.34,3.78+wave,.40,.13,.13,.85+wave,[1,.79,.19],MAT_GLOW);
 }
}
// V12: affordable Formula silhouette for middle-distance opponents.
// ~10x fewer generated vertices than a detailed car with four 32-segment tyres.
function carLite(v:Vertex,p:number,lane:number,color:string,quality:KartGraphics='balanced'){
 const pos=place(p,lane),yaw=yawFor(p),c=rgb(color),ca=Math.cos(yaw),sa=Math.sin(yaw);
 const at=(x:number,y:number,z:number):Vec=>({x:pos.x+x*ca-z*sa,y:pos.y+.10+y,z:pos.z+x*sa+z*ca});
 const panel=(x1:number,z1:number,x2:number,z2:number,y1:number,y2:number,w1:number,w2:number,tone:C)=>{
  quad(v,at(-w1,y1,z1),at(w1,y1,z1),at(w2,y2,z2),at(-w2,y2,z2),tone,MAT_METAL);
 };
 // Elongated low-profile monocoque and angled sidepod tops: no 'rectangular tank' outline.
 panel(0,-3.42,0,-1.12,.43,.54,.10,.36,light(c,1.12));
 panel(0,-1.12,0,.88,.54,.70,.36,.62,light(c,1.01));
 panel(0,.88,0,2.45,.70,.48,.62,.25,light(c,.94));
 for(const sign of [-1,1]){
  quad(v,at(sign*.48,.42,-.65),at(sign*1.11,.40,-.20),at(sign*.94,.55,1.57),at(sign*.42,.61,1.3),light(c,.77),MAT_METAL);
  for(const z of [-1.87,1.74]){
   const centre=at(sign*1.58,.49,z);
   box(v,centre.x,centre.y-.52,centre.z,.60,.91,.95,[.045,.048,.055],yaw,MAT_BASIC);
  }
  const end=at(sign*1.76,.29,-3.04);box(v,end.x,end.y,end.z,.08,.32,.51,[.10,.12,.14],yaw,MAT_METAL);
 }
 const cockpit=at(0,.79,-.18);box(v,cockpit.x,cockpit.y,cockpit.z,.49,.23,.80,[.035,.04,.05],yaw,MAT_GLASS);
 const front=at(0,.20,-3.05),rear=at(0,1.20,2.59);
 box(v,front.x,front.y,front.z,3.1,.09,.34,[.10,.12,.15],yaw,MAT_METAL);
 box(v,rear.x,rear.y,rear.z,3.05,.12,.44,[.08,.10,.13],yaw,MAT_METAL);
 if(quality!=='low'){
  const nose=at(0,.59,-1.9);box(v,nose.x,nose.y,nose.z,.08,.06,1.8,light(c,1.22),yaw,MAT_GLOW);
 }
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
 private uniformMat:WebGLUniformLocation;private uniformTime:WebGLUniformLocation|null;private uniformDetail:WebGLUniformLocation|null;
 private surfaceAlbedo:WebGLTexture|null=null;private surfaceNormal:WebGLTexture|null=null;private materialReady=false;
 private uniformAlbedo:WebGLUniformLocation|null;private uniformNormal:WebGLUniformLocation|null;private uniformAtlasReady:WebGLUniformLocation|null;private uniformCamera:WebGLUniformLocation|null;
 private skyProgram:WebGLProgram;private skyBuffer:WebGLBuffer;private skyPos:number;private skyTime:WebGLUniformLocation|null;
 private billboardProgram:WebGLProgram|null=null;private billboardBuffer:WebGLBuffer|null=null;
 private billboardTexture:WebGLTexture|null=null;private billboardCount=0;
 private billboardPos=-1;private billboardUV=-1;private billboardMat:WebGLUniformLocation|null=null;
 private graphics:KartGraphics;private readonly totalLaps:number;private readonly paceFactor:number;private frameCounter=0;private fps=60;private fpsTime=0;private renderScale=1;
 private raf=0;private last=0;private lastHud=0;private lastBroadcast=0;private currentProgress=-.0103;
 private lane=0;private lateralVelocity=0;private speed=0;private power:KartPower|null=null;private shieldUntil=0;private turboUntil=0;private slowUntil=0;
 private lapStart=0;private bestLap=0;private finished=false;private finishElapsed=0;private finishRank=0;private elapsed=0;private lastLapNumber=-1;
 private cameraMode=0;private lookBack=false;private wheelRotation=0;private oversteer=0;private cornerWarning=0;
 private keys={left:false,right:false,brake:false,throttle:false};private health=100;private pitProgress=0;private pitActive=false;private magnetUntil=0;private lastHorn=0;private remote=new Map<string,KartState>();private eye:Vec|null=null;private target:Vec|null=null;
 private collected=new Set<string>();private pickupCooldown=new Map<string,number>();private bots:KartState[]=[];private botTargets:number[]=[];private botPowers:(KartPower|null)[]=[];private botTurboUntil:number[]=[];private botShieldUntil:number[]=[];private botPowerSince:number[]=[];private botCollected=new Set<string>();private botsSlowedUntil=0;private inputPower=false;private stopped=false;private resize:()=>void;private hitCooldown=0;private otherHitTimes=new Map<string,number>();private contactUntil=0;private paused=false;private pausedAt=0;private pauseTotalMs=0;
 constructor(private canvas:HTMLCanvasElement,private options:KartOptions){
  this.graphics=options.graphics||'balanced';this.totalLaps=options.bots?clamp(options.laps||3,1,8):3;this.paceFactor=options.bots?(options.pace==='fast'?1.14:options.pace==='long'?.84:1):1;
  if(options.bots){this.currentProgress=GRID_FIRST-GRID_STEP*GRID_PLAYER_SLOT;this.lane=-GRID_LANE;}
  const gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'high-performance'})||canvas.getContext('experimental-webgl');
  if(!gl)throw Error('Bu tarayıcı WebGL desteklemiyor.');this.gl=gl as WebGLRenderingContext;
  const vs=shader(this.gl,this.gl.VERTEX_SHADER,VERT),fs=shader(this.gl,this.gl.FRAGMENT_SHADER,FRAG);
  const program=this.gl.createProgram();if(!program)throw Error('WebGL programı oluşturulamadı');this.gl.attachShader(program,vs);this.gl.attachShader(program,fs);this.gl.linkProgram(program);if(!this.gl.getProgramParameter(program,this.gl.LINK_STATUS))throw Error('WebGL bağlantı hatası');this.program=program;
  this.gl.deleteShader(vs);this.gl.deleteShader(fs);
  this.attribPos=this.gl.getAttribLocation(program,'aPos');this.attribColor=this.gl.getAttribLocation(program,'aColor');this.attribNormal=this.gl.getAttribLocation(program,'aNormal');this.attribMat=this.gl.getAttribLocation(program,'aMat');this.uniformTime=this.gl.getUniformLocation(program,'uTime');this.uniformDetail=this.gl.getUniformLocation(program,'uDetail');this.uniformAlbedo=this.gl.getUniformLocation(program,'uAlbedoAtlas');this.uniformNormal=this.gl.getUniformLocation(program,'uNormalRoughAtlas');this.uniformAtlasReady=this.gl.getUniformLocation(program,'uAtlasReady');this.uniformCamera=this.gl.getUniformLocation(program,'uCameraPos');const uniform=this.gl.getUniformLocation(program,'uViewProj');if(!uniform)throw Error('Kamera oluşturulamadı');this.uniformMat=uniform;
  const sv=shader(this.gl,this.gl.VERTEX_SHADER,SKY_VERT),sf=shader(this.gl,this.gl.FRAGMENT_SHADER,SKY_FRAG);
  const sp=this.gl.createProgram();if(!sp)throw Error('Atmosfer başlatılamadı');this.gl.attachShader(sp,sv);this.gl.attachShader(sp,sf);this.gl.linkProgram(sp);if(!this.gl.getProgramParameter(sp,this.gl.LINK_STATUS))throw Error('Atmosfer derlenemedi');this.skyProgram=sp;
  this.gl.deleteShader(sv);this.gl.deleteShader(sf);this.skyPos=this.gl.getAttribLocation(sp,'aPosition');this.skyTime=this.gl.getUniformLocation(sp,'uTime');
  const skyBuffer=this.gl.createBuffer();if(!skyBuffer)throw Error('Atmosfer belleği oluşturulamadı');this.skyBuffer=skyBuffer;
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER,skyBuffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),this.gl.STATIC_DRAW);
  const sb=this.gl.createBuffer(),db=this.gl.createBuffer();if(!sb||!db)throw Error('WebGL belleği oluşturulamadı');this.staticBuffer=sb;this.dynamicBuffer=db;
  const verts=buildWorld(this.graphics);this.worldCount=verts.length/STRIDE;this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.staticBuffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(verts),this.gl.STATIC_DRAW);
  // G2 textures load asynchronously; shaded procedural fallbacks remain while pending.
  if(typeof Image!=='undefined')this.loadMaterialAtlases();
  // Optional 3D track signage: if browser disallows 2D textures, the race still works.
  if(typeof document!=='undefined')try{this.prepareBillboards();this.loadSponsorLogo();}catch(e){console.warn('Kart Rush signage fallback:',e);}
  for(let i=0;i<AI_DRIVERS.length;i++){
   const slot=i>=GRID_PLAYER_SLOT?i+1:i;
   const lane=slot%2===0?-GRID_LANE:GRID_LANE;
   const profile=AI_DRIVERS[i];
   this.bots.push({id:'bot'+i,name:profile.name,color:profile.color,progress:GRID_FIRST-GRID_STEP*slot,lane,speed:0});
   this.botTargets.push(lane);this.botPowers.push(null);this.botTurboUntil.push(0);this.botShieldUntil.push(0);this.botPowerSince.push(0);
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
  const pr=gl.createProgram();if(!pr)throw Error('Pist tabelaları başlatılamadı');
  gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error('Pist tabelaları GPU hatası');
  gl.deleteShader(vs);gl.deleteShader(fs);
  const tex=gl.createTexture(),buffer=gl.createBuffer();if(!tex||!buffer){gl.deleteProgram(pr);throw Error('Pist tabelaları bellek hatası');}
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
 private readonly cameraLabels=['TAKİP','YAKIN TAKİP','HALO YAKIN','TV KAMERASI','BURUN'] as const;
 cycleCamera(){this.cameraMode=(this.cameraMode+1)%this.cameraLabels.length;this.eye=null;this.target=null;return this.cameraLabels[this.cameraMode];}
 setLookBack(value:boolean){if(this.lookBack===value)return;this.lookBack=value;this.eye=null;this.target=null;}
 getCameraLabel(){return this.lookBack?'ARKA BAKIŞ':this.cameraLabels[this.cameraMode];}
  setKeys(keys:Partial<typeof this.keys>){this.keys={...this.keys,...keys};}
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
  this.lane=clamp(this.lane+sign*.54,-19,19);
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
  const difficulty=this.options.difficulty||'normal',base=(difficulty==='easy'?53:difficulty==='hard'?67:61)*this.paceFactor;
  for(let i=0;i<this.bots.length;i++){
   const b=this.bots[i];
   // KR-V19.1: once classified, a bot continues a calm cool-down lap instead of freezing at the line.
   if(b.finished||b.progress>=this.totalLaps){
    b.finished=true;
    const coolDownSpeed=clamp(cornerInfo(wrap(b.progress)).recommended*.64,17,27)*this.paceFactor;
    b.speed=mix(b.speed,coolDownSpeed,ease(1.65,dt));
    b.progress+=b.speed/TRACK_LENGTH*dt;
    b.lane=mix(b.lane,i%2===0?-3.5:3.5,ease(.5,dt));
    continue;
   }
   const phase=wrap(b.progress),sector=.965+.07*Math.sin(phase*TAU*4+i*.9);
   const boosted=t<this.botTurboUntil[i],protectedBot=t<this.botShieldUntil[i];
   const curve=cornerInfo(phase);
   const gapAhead=wrap(this.currentProgress-b.progress),gapBehind=wrap(b.progress-this.currentProgress);
   let desired=(base+i*.16)*sector+(boosted?16:0)-Math.abs(b.lane)*.28;
   if(gapAhead>.003&&gapAhead<.055)desired+=Math.min(4,(gapAhead-.003)*75);
   if(gapBehind<.03)desired+=1.0;
   if(curve.sharp<.14&&gapAhead>.003&&gapAhead<.05)desired+=1.8;
   if(t<this.botsSlowedUntil&&!protectedBot)desired*=.55;
   // V12: arcade AI does not brake to walking pace at the hairpins. Player physics are unchanged.
   // A 25–40 m/s floor keeps attacks alive while still slowing down in technical sectors.
   const cornerFloor=difficulty==='easy'?27:difficulty==='hard'?36:32;
   const apexLimit=Math.max(cornerFloor,curve.recommended*1.34+(difficulty==='hard'?11:difficulty==='easy'?5:8))*this.paceFactor;
   desired=Math.min(desired,apexLimit+(boosted?7:0));
   const expectedSpeed=mix(b.speed,desired,ease(desired<b.speed?6.2:(boosted?4.1:3.2),dt));
   // Accelerate like a racing car, not instantaneously to 250 km/h at lights-out.
   b.speed=clamp(expectedSpeed,Math.max(0,b.speed-55*dt),b.speed+(boosted?43:33)*dt);
   const old=b.progress;b.progress+=b.speed/TRACK_LENGTH*dt;
   // Don't home in blindly: seek the nearest uncollected power crystal when available.
   let target=(i%2===0?-4.6:4.6)+1.2*Math.sin(phase*TAU*2.2+i*2.1);
   if(!this.botPowers[i])for(let j=0;j<PICKUP_POS.length;j++)for(let k=0;k<PICKUP_LANES.length;k++){
    const ahead=(PICKUP_POS[j]-phase+1)%1;
    const key=`${Math.floor(b.progress+ahead)}:${j}:${k}`;
    if(ahead<.053 && !this.botCollected.has(`${i}:${key}`)){
     const lane=PICKUP_LANES[k];
     if(Math.abs(lane-b.lane)<5.5){target=lane;}
    }
   }
   // No filter/map object arrays per bot, per frame: inexpensive near-neighbour scan.
   for(let j=-1;j<this.bots.length;j++){
    if(j===i)continue;
    const otherProgress=j<0?this.currentProgress:this.bots[j].progress;
    const otherLane=j<0?this.lane:this.bots[j].lane;
    const otherSpeed=j<0?this.speed:this.bots[j].speed;
    const d=wrap(otherProgress-b.progress);
    if(d>.0005&&d<.035&&Math.abs(otherLane-b.lane)<3.2){
     const dir=(otherLane>=b.lane?-1:1)*(i%2?1:-1);
     target=clamp(otherLane+dir*(d<.014?5.4:4.2),-8.8,8.8);
     if(d<.018&&otherSpeed<=b.speed+1.2)desired+=1.6;
     break;
    }
   }
   this.botTargets[i]=mix(this.botTargets[i],clamp(target,-8.8,8.8),ease(2.7,dt));
   b.lane=mix(b.lane,this.botTargets[i],ease(2.4,dt));
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
    if(held==='pulse'&&Math.abs(b.progress-this.currentProgress)<.09&&t>this.shieldUntil)this.slowUntil=t+1.5;
    if(held==='shield')this.botShieldUntil[i]=t+6.5;
    if(held==='emp'){
     if(nearPlayer&&t>this.shieldUntil){this.slowUntil=t+2.0;this.options.onEffect?.('emp');}
     for(let j=0;j<this.bots.length;j++)if(i!==j&&Math.abs(this.bots[j].progress-b.progress)<.1&&t>this.botShieldUntil[j]){
      this.bots[j].speed*=.62;
     }
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
   const healthFactor=.71+.29*this.health/100;const speedCap=(inPit?18:offroad?27:slowed?30:turbo?79:63)*healthFactor*this.paceFactor;
   const apexLimit=curve.recommended*this.paceFactor;
   const excess=Math.max(0,this.speed-apexLimit);
   this.cornerWarning=curve.sharp>.17?Math.round(apexLimit*3.6):0;
   const braking=this.keys.brake,throttle=this.keys.throttle;
   const steer=(this.keys.right?1:0)-(this.keys.left?1:0);
   // No input means NO drive torque. Drag makes the car coast; brakes slow it decisively.
   const resistance=1.2+.022*this.speed+.0022*this.speed*this.speed;
   let acceleration=(throttle?(turbo?42:34):0)-(braking?66:0)-resistance;
   if(offroad)acceleration-=7.2;
   if(slowed)acceleration-=5.6;
   this.speed=Math.max(0,this.speed+acceleration*dt);
   if(this.speed>speedCap)this.speed=Math.max(speedCap,this.speed-(offroad?55:slowed?34:26)*dt);
   // Cornering is now a meaningful driving decision: braking brings grip back,
   // and carrying too much speed through hairpins pushes the car toward runoff.
   // V13: no hidden corner assist. Overspeed only reduces available grip; the engine no longer auto-brakes
   // or turns the car for the player. If you arrive too fast, you simply understeer and run wide.
   const grip=clamp(1-Math.max(0,excess-2)/14,.08,1);
   this.oversteer=mix(this.oversteer,0,ease(7.5,dt));
   const steeringFactor=clamp(this.speed/16,.0,1.2);
   const targetStrafe=steer*(8.8+this.speed*.122)*steeringFactor*grip;
   this.lateralVelocity=mix(this.lateralVelocity,targetStrafe,ease(steer?13:7,dt));
   this.lane=clamp(this.lane+this.lateralVelocity*dt,-19.5,19.5);
   if(Math.abs(this.lane)>=19.45){this.lateralVelocity=0;this.speed=Math.min(this.speed,17);}
   this.pitActive=inPit;
   if(inPit&&this.speed<8&&!throttle){this.pitProgress=clamp(this.pitProgress+dt/4.2,0,1);
    if(this.pitProgress>=1){this.health=100;this.pitProgress=0;this.options.onEffect?.('repair');}
   }else this.pitProgress=0;
   this.wheelRotation=(this.wheelRotation+this.speed*dt/.57)%TAU;
   this.currentProgress+=this.speed/TRACK_LENGTH*dt;
   const lap=Math.max(0,Math.floor(Math.max(0,this.currentProgress)));
   if(this.currentProgress>=this.totalLaps){this.finished=true;this.finishElapsed=this.elapsed;this.finishRank=1+(this.options.bots?this.bots:[...this.remote.values()]).filter(p=>p.progress>this.currentProgress).length;const end=Math.round(this.elapsed*1000);const last=end-this.lapStart;if(last>0)this.bestLap=this.bestLap===0?last:Math.min(this.bestLap,last);this.options.onFinish(end,this.bestLap||end);}
   else if(lap>this.lastLapNumber){const now=Math.round(this.elapsed*1000);if(this.lastLapNumber>=0){const ms=now-this.lapStart;this.bestLap=this.bestLap===0?ms:Math.min(this.bestLap,ms);}this.lapStart=now;this.lastLapNumber=lap;}
   for(let i=0;i<PICKUP_POS.length;i++)for(let j=0;j<PICKUP_LANES.length;j++){
    const p=PICKUP_POS[i],lane=PICKUP_LANES[j],key=`${Math.floor(this.currentProgress)}:${i}:${j}`;
    const delta=Math.abs(wrap(this.currentProgress)-p);
    const radius=t<this.magnetUntil?10:3.0;
    if(delta<(t<this.magnetUntil?.018:.009)&&Math.abs(this.lane-lane)<radius&&!this.collected.has(key)&&t>(this.pickupCooldown.get(`${i}:${j}`)||0)){
     if(this.power)continue;
     this.collected.add(key);this.pickupCooldown.set(`${i}:${j}`,t+2.4);
     this.power=randomPower();this.options.onEffect?.('pickup');
    }
   }
   if(this.inputPower&&this.power){const pow=this.power;this.power=null;
    if(pow==='repair'){this.health=clamp(this.health+32,0,100);this.options.onEffect?.('repair');}
    if(pow==='magnet'){this.magnetUntil=t+8;this.options.onEffect?.('magnet');}
    if(pow==='pulse'){this.options.onEffect?.('pulse');if(this.options.bots){for(const bot of this.bots){const a=place(this.currentProgress,this.lane),b=place(bot.progress,bot.lane);if(Math.hypot(a.x-b.x,a.z-b.z)<75)bot.speed=Math.max(18,bot.speed*.77);}}else this.options.onPower?.('pulse');}
    if(pow==='turbo'){this.turboUntil=t+3.5;this.options.onEffect?.('boost');}
    if(pow==='shield'){this.shieldUntil=t+7;this.options.onEffect?.('shield');}
    if(pow==='emp'){this.options.onEffect?.('emp');this.options.onPower?.('emp');if(this.options.bots){this.botsSlowedUntil=t+2.4;for(let i=0;i<this.bots.length;i++)if(t<this.botShieldUntil[i])this.bots[i].speed=Math.max(0,this.bots[i].speed);}}
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
   this.options.onHud({speed:Math.round(this.speed*3.6),camera:this.getCameraLabel(),cornerSpeed:this.cornerWarning,lap:Math.min(this.totalLaps,Math.max(1,Math.floor(Math.max(0,this.currentProgress))+1)),totalLaps:this.totalLaps,remaining:Math.max(0,this.totalLaps-this.currentProgress),health:Math.round(this.health),pit:this.pitActive,pitProgress:this.pitProgress,magnet:ts/1000<this.magnetUntil,lights:countdown>0?6-countdown:0,power:this.power,rank,total:others.length+1,elapsed:Math.max(0,this.elapsed),started,countdown,shield:ts/1000<this.shieldUntil,turbo:ts/1000<this.turboUntil,fps:this.fps,bestLapMs:this.bestLap,offroad:Math.abs(this.lane)>14.4&&!this.pitActive,progress:this.currentProgress,throttle:this.keys.throttle,contact:ts/1000<this.contactUntil,rivals});
  }
  this.draw(ts/1000,dt);
 };
 private draw(time:number,dt:number){
  const gl=this.gl;
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
  gl.useProgram(this.skyProgram);gl.bindBuffer(gl.ARRAY_BUFFER,this.skyBuffer);
  gl.enableVertexAttribArray(this.skyPos);gl.vertexAttribPointer(this.skyPos,2,gl.FLOAT,false,8,0);
  gl.uniform1f(this.skyTime,time);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  const pos=place(this.currentProgress,this.lane),t=tangent(this.currentProgress);
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
  if(rear){behind=-8.3;height=4.8;ahead=-47;lookHeight=1.35;}
  if(boost&&!rear){behind+=1.25;height+=.25;}
  const sway=rear?0:clamp(this.lateralVelocity*.038,-.31,.31);
  const wantedEye={x:pos.x-t.x*behind-t.z*sway,y:pos.y+height+Math.sin(time*22)*travel*.028,z:pos.z-t.z*behind+t.x*sway};
  const wantedTarget={x:pos.x+t.x*ahead,y:pos.y+lookHeight,z:pos.z+t.z*ahead};
  if(!this.eye){this.eye=wantedEye;this.target=wantedTarget;}else{
   const k=ease(rear?9.5:7.5,dt);this.eye={x:mix(this.eye.x,wantedEye.x,k),y:mix(this.eye.y,wantedEye.y,k),z:mix(this.eye.z,wantedEye.z,k)};
   this.target={x:mix(this.target!.x,wantedTarget.x,k),y:mix(this.target!.y,wantedTarget.y,k),z:mix(this.target!.z,wantedTarget.z,k)};
  }
  const fov=rear?1.12:this.cameraMode===4?1.06:this.cameraMode===2?1.01:clamp(1.00+travel*.31+(boost?.11:0),.99,1.44);
  const proj=projection(fov,this.canvas.width/this.canvas.height,.3,750),mat=mul(proj,lookAt(this.eye,this.target!));gl.useProgram(this.program);gl.uniformMatrix4fv(this.uniformMat,false,mat);
  gl.uniform1f(this.uniformTime,time);gl.uniform1f(this.uniformDetail,this.graphics==='low'?0:this.graphics==='balanced'?.65:1);
  gl.uniform1f(this.uniformAtlasReady,this.materialReady&&this.graphics!=='low'?1:0);
  gl.uniform3f(this.uniformCamera,this.eye!.x,this.eye!.y,this.eye!.z);
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
  const cameraDistance=rear?150:260;
  for(let i=0;i<PICKUP_POS.length;i++)for(let j=0;j<PICKUP_LANES.length;j++){
   const delta=Math.abs(wrap(PICKUP_POS[i]-wrap(this.currentProgress)+.5)-.5)*TRACK_LENGTH;
   if(delta<cameraDistance&&time>(this.pickupCooldown.get(`${i}:${j}`)||0))pickup(dyn,PICKUP_POS[i],PICKUP_LANES[j],time);
  }
  const nearCars:{car:KartState;d:number;shield:boolean;boost:boolean}[]=[];
  const addVisible=(other:KartState,shield:boolean,boosted:boolean)=>{
   const forward=wrap(other.progress-this.currentProgress)*TRACK_LENGTH;
   const backward=wrap(this.currentProgress-other.progress)*TRACK_LENGTH;
   const minDist=Math.min(forward,backward);
   const visible=rear?backward<160:forward<290||backward<58;
   if(visible)nearCars.push({car:other,d:minDist,shield,boost:boosted});
  };
  if(this.options.bots){for(let i=0;i<this.bots.length;i++)addVisible(this.bots[i],time<this.botShieldUntil[i],time<this.botTurboUntil[i]);}
  else for(const other of this.remote.values())addVisible(other,false,false);
  nearCars.sort((a,b)=>a.d-b.d);
  const fullBudget=this.graphics==='high'?5:this.graphics==='balanced'?4:2;
  for(let i=0;i<nearCars.length;i++){
   const {car:opponent,d,shield,boost:boosted}=nearCars[i];
   if(i<fullBudget&&d<115){
    const lodQuality=this.graphics==='high'?'balanced':this.graphics==='balanced'?'low':'low';
    car(dyn,opponent.progress,opponent.lane,opponent.color,shield,boosted,0,lodQuality,time,time*opponent.speed/.57,opponent.speed<17);
   }else{
    carLite(dyn,opponent.progress,opponent.lane,opponent.color,this.graphics);
   }
  }
  // V9: removed old speedWake ribbons; they looked like white lines glued to the car.
  if(rear||this.cameraMode!==4)car(dyn,this.currentProgress,this.lane,this.options.color,time<this.shieldUntil,boost,this.lateralVelocity*.005,this.graphics,time,this.wheelRotation,this.keys.brake,(this.keys.right?1:0)-(this.keys.left?1:0));
  gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(dyn),gl.DYNAMIC_DRAW);drawBuffer(this.dynamicBuffer,dyn.length/STRIDE);
 }
}
