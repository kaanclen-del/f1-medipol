/* F1 Medipol Kart Rush V2: local arcade racing engine.
 * Dependency-free WebGL; no Supabase calls in the animation/render loop.
 * Track-coordinate driving is intentional; steering controls lateral grip instead of yaw rotation.
 */
export type KartPower = 'turbo' | 'shield' | 'emp';
export type KartDifficulty = 'easy' | 'normal' | 'hard';
export type KartGraphics = 'low' | 'balanced' | 'high';
export type KartState = { id: string; progress: number; lane: number; speed: number; color: string; name: string; finished?: boolean };
export type KartHud = {
 speed: number; lap: number; totalLaps: number; remaining: number;
 power: KartPower | null; rank: number; total: number; elapsed: number; started: boolean; countdown: number;
 shield: boolean; turbo: boolean; fps?: number; bestLapMs?: number; offroad?: boolean; progress?: number;
 rivals?: { id: string; name: string; color: string; progress: number }[];
};
export type KartOptions = {
 id: string; color: string; name: string; startAt: number; laps?: number; bots?: boolean; difficulty?: KartDifficulty; graphics?: KartGraphics;
 onHud: (hud: KartHud) => void; onFinish: (durationMs: number, bestLapMs: number) => void;
 onSnapshot?: (s: KartState) => void; onPower?: (power: KartPower) => void;
};
type Vec={x:number;y:number;z:number};type Vertex=number[];
type C=[number,number,number];
const TAU=Math.PI*2;
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const wrap=(x:number)=>((x%1)+1)%1;
const mix=(a:number,b:number,k:number)=>a+(b-a)*k;
const ease=(rate:number,dt:number)=>1-Math.exp(-rate*dt);
const TRACK_LENGTH=420;
const rgb=(hex:string):C=>{const t=hex.replace('#','');const n=parseInt(t,16);return Number.isFinite(n)?[((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255]:[1,.18,.25]};
const TRACK_POINTS:{x:number;z:number}[]=[
 {x:-98,z:-8},{x:-88,z:-42},{x:-36,z:-68},{x:28,z:-70},{x:82,z:-50},{x:103,z:-8},
 {x:92,z:38},{x:46,z:68},{x:-10,z:74},{x:-64,z:58},{x:-102,z:24},{x:-109,z:-2},
];
function catmull(a:number,b:number,c:number,d:number,t:number){return 0.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)}
function pt(p:number):Vec{
 const n=TRACK_POINTS.length,t=wrap(p)*n,i=Math.floor(t),f=t-i;
 const p0=TRACK_POINTS[(i-1+n)%n],p1=TRACK_POINTS[i%n],p2=TRACK_POINTS[(i+1)%n],p3=TRACK_POINTS[(i+2)%n];
 const x=catmull(p0.x,p1.x,p2.x,p3.x,f);
 const z=catmull(p0.z,p1.z,p2.z,p3.z,f);
 const wav=wrap(p);
 const y=.15+1.55*Math.sin(TAU*wav*2.0+.25)+.48*Math.sin(TAU*wav*6.0+.9);
 return {x,y,z};
}
function tangent(p:number):Vec{const a=pt(p-.00013),b=pt(p+.00013),d=Math.hypot(b.x-a.x,b.z-a.z)||1;return{x:(b.x-a.x)/d,y:0,z:(b.z-a.z)/d};}
function place(p:number,lane:number):Vec{const c=pt(p),t=tangent(p);return{x:c.x-t.z*lane,y:c.y,z:c.z+t.x*lane};}
// In the local-space transform, the car's front points towards local negative Z.
// Tangent travel therefore requires atan2(+dx,-dz); this corrects the V1 reversing/spinning visual.
function yawFor(p:number):number{const t=tangent(p);return Math.atan2(t.x,-t.z);}
// Interleaved geometry: xyz + RGB + surface normal + material id.
// Normal-based directional light and procedural fragment materials upgrade the flat V2 palette.
const STRIDE=10;
const MAT_BASIC=0, MAT_GRASS=1, MAT_ASPHALT=2, MAT_METAL=3, MAT_GLOW=4, MAT_GLASS=5, MAT_WATER=6, MAT_SKY=7;
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
const PICKUP_POS=[.083,.24,.40,.56,.72,.89];
const PICKUP_LANES=[-4.1,4.1];
function powerAt(i:number,j:number):KartPower{return (['turbo','shield','emp'] as KartPower[])[(i+j)%3]}
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
function grandstand(v:Vertex,x:number,y:number,z:number,yaw:number,rows:number,accent:C){
 for(let r=0;r<rows;r++){
  box(v,x,y+r*.52,z-r*.70,9.8-r*.8,.48,3.2,r%2?[.37,.43,.50]:[.23,.28,.35],yaw,MAT_METAL);
  for(let seat=0;seat<8-r;seat++){
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
 quad(v,{x:-330,y:-3.4,z:-330},{x:330,y:-3.4,z:-330},{x:330,y:-3.4,z:330},{x:-330,y:-3.4,z:330},[.15,.32,.22],MAT_GRASS);
 quad(v,{x:-210,y:-3.1,z:-210},{x:210,y:-3.1,z:-210},{x:210,y:-3.1,z:210},{x:-210,y:-3.1,z:210},[.19,.36,.25],MAT_GRASS);
 for(let i=0;i<56;i++){
  const a=i*TAU/56,b=(i+1)*TAU/56,ra=240+(i*19%52),rb=240+((i+1)*19%52),peak=18+((i*13)%34);
  const col:C=i%4===0?[.48,.59,.67]:i%4===1?[.37,.48,.56]:[.42,.54,.60];
  tri(v,{x:ra*Math.cos(a),y:-4,z:ra*Math.sin(a)},{x:(ra+rb)*.5*Math.cos((a+b)*.5),y:peak,z:(ra+rb)*.5*Math.sin((a+b)*.5)},{x:rb*Math.cos(b),y:-4,z:rb*Math.sin(b)},col,MAT_BASIC);
 }
 const N=quality==='low'?240:quality==='high'?460:360;
 for(let i=0;i<N;i++){
  const a=i/N,b=(i+1)/N;
   const grassA=place(a,-19),grassB=place(a,19),grassC=place(b,19),grassD=place(b,-19);
  for(const q of [grassA,grassB,grassC,grassD])q.y-=.18;
  quad(v,grassA,grassB,grassC,grassD,[.15,.23,.17],MAT_GRASS);
  const runA=place(a,-15.0),runB=place(a,15.0),runC=place(b,15.0),runD=place(b,-15.0);
  for(const q of [runA,runB,runC,runD])q.y-=.07;
  quad(v,runA,runB,runC,runD,[.26,.30,.28],MAT_ASPHALT);
  const edgeA=place(a,-12.25),edgeB=place(a,12.25),edgeC=place(b,12.25),edgeD=place(b,-12.25);
  for(const q of [edgeA,edgeB,edgeC,edgeD])q.y+=.02;
  quad(v,edgeA,edgeB,edgeC,edgeD,[.18,.19,.20],MAT_ASPHALT);
  const roadA=place(a,-9.85),roadB=place(a,9.85),roadC=place(b,9.85),roadD=place(b,-9.85);
  for(const q of [roadA,roadB,roadC,roadD])q.y+=.08;
  quad(v,roadA,roadB,roadC,roadD,[.118,.122,.128],MAT_ASPHALT);
  const grooveA=place(a,-6.05),grooveB=place(a,6.05),grooveC=place(b,6.05),grooveD=place(b,-6.05);
  for(const q of [grooveA,grooveB,grooveC,grooveD])q.y+=.10;
  quad(v,grooveA,grooveB,grooveC,grooveD,[.155,.16,.168],MAT_ASPHALT);
  if(i%20<8){
   const aa=place(a,-.16),bb=place(a,.16),cc=place(b,.16),dd=place(b,-.16);
   for(const q of [aa,bb,cc,dd])q.y+=.09;
   quad(v,aa,bb,cc,dd,[.90,.92,.90],MAT_BASIC);
  }
  for(const side of [-1,1]){
   const curbA=place(a,side*9.95),curbB=place(a,side*11.35),curbC=place(b,side*11.35),curbD=place(b,side*9.95);
   for(const q of [curbA,curbB,curbC,curbD])q.y+=.085;
   quad(v,curbA,curbB,curbC,curbD,Math.floor(i/4)%2?[.97,.97,.94]:[.95,.18,.22],MAT_BASIC);
   const rumA=place(a,side*11.45),rumB=place(a,side*13.15),rumC=place(b,side*13.15),rumD=place(b,side*11.45);
   for(const q of [rumA,rumB,rumC,rumD])q.y+=.03;
   quad(v,rumA,rumB,rumC,rumD,[.22,.41,.55],MAT_ASPHALT);
   if(i%10===0){
    const bar=place(a,side*14.25),bar2=place(b,side*14.25),ang=yawFor(a);
    box(v,(bar.x+bar2.x)*.5,(bar.y+bar2.y)*.5+.75,(bar.z+bar2.z)*.5,.30,1.45,2.15,[.75,.78,.80],ang,MAT_METAL);
    const post=place(a,side*14.35);
    cylinder(v,post.x,post.y-.12,post.z,.16,1.95,[.12,.15,.19],7,MAT_METAL);
   }
   if(i%13===0){
    const fence=place(a,side*16.6);
    box(v,fence.x,fence.y+.95,fence.z,.08,1.95,2.7,[.84,.88,.93],yawFor(a),MAT_GLASS);
   }
  }
 }
 // start / paddock
 for(const side of [-1,1]){
  const p=place(0,side*15.0);
  box(v,p.x,p.y-.2,p.z,.78,11.5,.78,[.18,.22,.28],0,MAT_METAL);
 }
 const origin=pt(0);
 box(v,origin.x,origin.y+10.2,origin.z,31,1.5,2.1,[.88,.18,.25],yawFor(0),MAT_GLOW);
 box(v,origin.x,origin.y+11.0,origin.z,32,.22,2.25,[.96,.97,.98],yawFor(0),MAT_METAL);
 for(const l of [-8,-4,0,4,8]){
  const p=place(0,l);
  box(v,p.x,p.y+8.55,p.z,1.25,.75,1.0,[1.,.17,.18],yawFor(0),MAT_GLOW);
 }
 for(let i=0;i<11;i++){
  const p=place(.89+i*.0085,38.5);
  box(v,p.x,p.y-.8,p.z,10.5,6.6,11.2,[.25,.31,.41],0,MAT_METAL);
  box(v,p.x,p.y+4.8,p.z-5.4,8.6,2.5,.20,i%2?[.10,.15,.22]:[.83,.16,.25],0,MAT_METAL);
  box(v,p.x,p.y+6.55,p.z,11.0,.5,12.4,[.95,.95,.96],0,MAT_METAL);
  for(let zz=-3;zz<=3;zz+=2.4)box(v,p.x,p.y+5.25,p.z+zz,9.0,.22,.09,[.60,.89,.97],0,MAT_GLASS);
 }
 const towerP=place(.948,52);
 tower(v,towerP.x,towerP.y-1.2,towerP.z,28,0);
 const standA=place(.025,-28),standB=place(.02,28);
 grandstand(v,standA.x,standA.y-.2,standA.z,yawFor(.025)+Math.PI/2,5,[.97,.23,.34]);
 grandstand(v,standB.x,standB.y-.2,standB.z,yawFor(.02)-Math.PI/2,5,[.31,.77,.93]);
 // arches and village landmarks
 [0.12,0.53,0.79].forEach((prog,idx)=>{const c=pt(prog);archway(v,c.x,c.y-0.1,c.z,27-idx*2,11.5,3.1,yawFor(prog),idx===1?[.60,.64,.69]:[.69,.67,.61],idx===1?[.28,.75,.93]:[.92,.27,.34]);});
 for(let i=0;i<10;i++){
  const p=place(.10+i*.015,-39-(i%2)*3.8);
  cottage(v,p.x,p.y-1.0,p.z,1.1,yawFor(.10+i*.015)+Math.PI/2,i);
  lampPost(v,p.x+2.8,p.y-1,p.z+2.3,4.8,0.2);
 }
 for(let i=0;i<8;i++){
  const p=place(.34+i*.017,39+(i%3)*3.0);
  cottage(v,p.x,p.y-1.1,p.z,1.15,yawFor(.34+i*.017)-Math.PI/2,i+1);
  flowerBed(v,p.x,p.y-.95,p.z+3.9,2.2,1.3,i%2?[1.,.45,.58]:[.99,.78,.22]);
 }
 for(let i=0;i<7;i++){
  const p=place(.62+i*.02,-43-(i%2)*3.2);
  cottage(v,p.x,p.y-1.0,p.z,1.2,yawFor(.62+i*.02)+Math.PI/2,i+2);
 }
 // extra paddock hospitality
 for(let i=0;i<6;i++){
  const p=place(.86+i*.013,-40);
  box(v,p.x,p.y-.5,p.z,8.2,4.6,8.6,[.82,.84,.88],0,MAT_METAL);
  box(v,p.x,p.y+2.8,p.z,8.7,.28,9.1,[.92,.19,.29],0,MAT_GLOW);
  for(let z=-2.6;z<=2.6;z+=1.75)box(v,p.x,p.y+2.0,p.z+z,6.8,1.4,.12,[.60,.89,.97],0,MAT_GLASS);
 }
 // trees and landscaping
 const trees=quality==='low'?85:quality==='high'?220:150;
 for(let i=0;i<trees;i++){
  const frac=(i*.61803398875)%1,side=i%2?-1:1,offset=23+(i*17%37),p=place(frac,side*offset);
  cylinder(v,p.x,p.y-1,p.z,.32,2.8,[.36,.25,.18],6,MAT_METAL);
  cone(v,p.x,p.y+.6,p.z,2.8,4.8,[.12,.34+(i%4)*.04,.23],quality==='low'?5:8);
  cone(v,p.x,p.y+2.0,p.z,2.1,4.3,[.17,.46+(i%5)*.03,.29],quality==='low'?5:8);
  cone(v,p.x,p.y+3.3,p.z,1.2,3.8,[.20,.55,.33],quality==='low'?5:8);
 }
 if(quality!=='low')for(let i=0;i<24;i++){
  const p=place(.05+i*.038,i%2?-22:22);
  lampPost(v,p.x,p.y-.5,p.z,6.0,yawFor(.05+i*.038)+(i%2?0.5:-0.5));
 }
 for(let i=0;i<18;i++){
  const p=place(i/18+.02,i%2?-29:29);
  makeFlag(v,p.x,p.y-.4,p.z,i%3===0?[.96,.22,.27]:i%3===1?[.98,.85,.26]:[.92,.95,.98]);
 }
 for(let i=0;i<9;i++){
  const p=place(.14+i*.095,i%2?-47:47),h=7+(i%4)*2;
  box(v,p.x,p.y-2,p.z,10+(i%3)*3,h,9+(i%2)*2,i%2?[.33,.43,.48]:[.41,.51,.56],0,MAT_METAL);
  box(v,p.x,p.y+h-2,p.z,10+(i%3)*3,.4,9+(i%2)*2,[.74,.79,.83],0,MAT_METAL);
 }
 // water plaza
 for(let i=0;i<2;i++){
  const c=place(.29+i*.28,i===0?60:-60),w=18+i*3,d=11+i*2;
  quad(v,{x:c.x-w,y:-2.55,z:c.z-d},{x:c.x+w,y:-2.55,z:c.z-d},{x:c.x+w,y:-2.55,z:c.z+d},{x:c.x-w,y:-2.55,z:c.z+d},[.13,.49,.64],MAT_WATER);
  flowerBed(v,c.x,c.y-2.3,c.z+d+3,4.0,1.6,[1.,.65,.32]);
 }
 return v;
}
// High-resolution trackside artwork is generated on-device as a tiny atlas.
// All sponsors are fictional F1 Medipol branding, not licensed F1 team assets.
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
 const n=quality==='low'?10:quality==='high'?34:24;
 for(let i=0;i<n;i++)sign(.038+i/n*.925,i%2?-17.9:17.9,8.2,2.25,i%4,false,.6);
 sign(0,0,20,2.9,0,true,12.6);
 for(let i=0;i<4;i++)sign(.92+i*.011,35,9.8,2.35,(i+1)%4,false,1.3);
 for(const prog of [.12,.53,.79])sign(prog,0,14,1.5,2,true,9.6);
 return new Float32Array(arr);
}
function makeSponsorAtlas():HTMLCanvasElement{
 const cvs=document.createElement('canvas');cvs.width=512;cvs.height=512;
 const ctx=cvs.getContext('2d');if(!ctx)throw Error('Pist tabela çizimi desteklenmiyor');
 const rows:[string,string,string,string,string][]= [
  ['#111720','#dfe8f0','F1 MEDIPOL','KART RUSH','#ef304c'],
  ['#1a2432','#f4f6f8','GRAND PRIX','PRECISION RACING','#71c8ff'],
  ['#202a36','#f2d46d','BOOST ZONE','HIGH DOWNFORCE','#8fd6ff'],
  ['#edf1f4','#162230','APEX CLUB','ARCADE TOUR','#ef304c']
 ];
 rows.forEach((r,i)=>{
  const y=i*128;
  ctx.fillStyle=r[0];ctx.fillRect(0,y,512,128);
  ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(0,y,512,26);
  ctx.fillStyle=r[4];ctx.fillRect(0,y,12,128);ctx.fillRect(500,y,12,128);
  ctx.fillStyle='rgba(255,255,255,.12)';
  for(let k=0;k<9;k++)ctx.fillRect(24+k*54,y+18,24,4);
  ctx.fillStyle=r[1];ctx.font='900 56px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(r[2],256,y+48,470);
  ctx.font='900 20px Arial, sans-serif';ctx.fillText(r[3],256,y+94,430);
  ctx.fillStyle=r[4];ctx.fillRect(40,y+112,432,3);
  ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(42,y+16,428,1);
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
uniform float uTime;uniform float uDetail;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
void main(){
 vec3 normal=normalize(vNormal);
 vec3 sun=normalize(vec3(-.34,.86,-.38));
 vec3 skyFill=normalize(vec3(.28,.72,.61));
 float nSun=max(0.,dot(normal,sun));
 float nSky=max(0.,dot(normal,skyFill));
 float illumination=.34+.72*nSun+.12*nSky;
 vec3 c=vColor;
 if(vMat>1.5&&vMat<2.5){
  if(uDetail<.1){c*=.91;}else{
   float coarse=noise(vWorld.xz*1.4)*.11;
   float fine=noise(vWorld.xz*13.0)*.035;
   float rubber=smoothstep(.0,1.,noise(vWorld.xz*.18))*0.06;
   c*=.82+coarse+fine+rubber;
  }
 }
 if(vMat>.5&&vMat<1.5){
  if(uDetail<.1){c*=.92;}else{
   float t=noise(vWorld.xz*.17)*.24+noise(vWorld.xz*2.7)*.11+noise(vWorld.xz*7.5)*.03;
   c*=.78+t;
  }
 }
 if(vMat>2.5&&vMat<3.5){
  float glint=pow(max(0.,dot(reflect(-sun,normal),normalize(vec3(.25,.7,.6)))),18.);
  c=c*(.86+.38*nSun)+glint*.28;
  illumination=1.;
 }
 if(vMat>3.5&&vMat<4.5){c*=1.17;illumination=1.;}
 if(vMat>4.5&&vMat<5.5){c=mix(c,vec3(.48,.80,.97),.24);illumination=1.;}
 if(vMat>5.5&&vMat<6.5){float ripple=uDetail<.1?.5:noise(vWorld.xz*.35+vec2(uTime*.10,uTime*.08));c*=.76+.48*ripple;illumination=1.;}
 c*=illumination;
 c+=vec3(.06,.09,.13)*max(normal.y,0.);
 float fresnel=pow(1.0-max(0.,normal.y),2.0);
 c+=vec3(.09,.12,.15)*fresnel*.18;
 float fog=1.-exp(-pow(max(0.,vDistance-45.)/215.,1.42));
 fog=clamp(fog,0.,.82);
 c=mix(c,vec3(.61,.73,.80),fog);
 c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);
 c=pow(clamp(c,0.,1.),vec3(.92));
 gl_FragColor=vec4(c,1.);
}`;
const SKY_VERT=`attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
const SKY_FRAG=`precision mediump float;varying vec2 vUv;uniform float uTime;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
void main(){
 float y=vUv.y;
 vec3 top=vec3(.03,.08,.17),mid=vec3(.18,.35,.55),horizon=vec3(.75,.78,.81);
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
 for(let j=0;j<3;j++){
  const width=r*(1+j*.17),length=(r+1.30)*(1+j*.12),yy=pos.y+.052-j*.008;
  const center={x:pos.x,y:yy,z:pos.z};
  const segments=16;
  for(let i=0;i<segments;i++){
   const f=(ang:number)=>({x:pos.x+Math.cos(ang)*width*Math.cos(yaw)-Math.sin(ang)*length*Math.sin(yaw),y:yy,z:pos.z+Math.cos(ang)*width*Math.sin(yaw)+Math.sin(ang)*length*Math.cos(yaw)});
   tri(v,center,f(i*TAU/segments),f((i+1)*TAU/segments),j===0?[.043,.058,.068]:j===1?[.065,.088,.10]:[.085,.104,.113]);
  }
 }
}
function car(v:Vertex,p:number,lane:number,color:string,shield=false,boost=false,drift=0,quality:KartGraphics='balanced',time=0){
 const pos=place(p,lane),yaw=yawFor(p)+clamp(drift,-.075,.075),baseY=pos.y+.18,c=rgb(color);
 const ca=Math.cos(yaw),sa=Math.sin(yaw);
 const at=(x:number,y:number,z:number):Vec=>({x:pos.x+x*ca-z*sa,y:baseY+y,z:pos.z+x*sa+z*ca});
 const block=(x:number,z:number,y:number,w:number,h:number,d:number,col:C,mat=MAT_METAL)=>{const t=at(x,y,z);box(v,t.x,t.y,t.z,w,h,d,col,yaw,mat)};
 const wing=(x1:number,y1:number,z1:number,x2:number,y2:number,z2:number,w:number,col:C)=>{
  const a=at(x1-w/2,y1,z1),b=at(x1+w/2,y1,z1),cc=at(x2+w/2,y2,z2),d=at(x2-w/2,y2,z2);quad(v,a,b,cc,d,col,MAT_METAL);
 };
 ellipseShadow(v,pos,yaw,2.08,1);
 const accent=light(c,1.22),dark=light(c,.72),carbon:[number,number,number]=[.055,.07,.09];
 block(0,.0,.10,1.72,.16,5.45,carbon);
 block(0,-.10,.26,1.54,.28,4.46,c);
 wing(0,.38,-3.92,0,.56,-1.02,.68,accent);
 wing(0,.55,-1.02,0,.48,1.28,1.42,light(c,1.05));
 block(0,-3.78,.18,1.55,.08,1.06,carbon);
 block(0,-3.60,.28,3.78,.13,.36,carbon);
 block(0,-3.27,.35,2.42,.10,.28,accent);
 for(const sgn of [-1,1]){
  block(sgn*1.02,-.18,.32,.88,.34,2.42,dark);
  wing(sgn*.56,.52,-.22,sgn*1.18,.58,1.52,.26,accent);
  block(sgn*1.34,.94,.50,.74,.16,1.55,light(c,.58));
  block(sgn*1.56,1.78,.54,.48,.42,.86,light(c,.78));
 }
 block(0,-.42,.60,.82,.45,1.78,[.06,.09,.12],MAT_GLASS);
 block(0,-.35,1.10,.68,.13,.96,[.14,.17,.21]);
 block(0,-.10,1.36,.12,.48,1.70,[.80,.84,.84]);
 for(const sgn of [-1,1])block(sgn*.42,-.06,1.12,.10,.42,.12,[.78,.82,.84]);
 block(0,.82,.78,.76,.50,.66,dark);
 wing(0,1.12,.98,0,1.84,.66,.52,light(c,.94));
 block(0,1.92,.64,3.10,.18,.62,carbon);
 block(0,2.18,.86,3.54,.14,.32,accent);
 for(const sgn of [-1,1]){
  block(sgn*1.68,2.08,.66,.09,.58,.52,carbon);
  block(sgn*.84,2.42,.22,.14,.18,.56,[.92,.10,.13],MAT_GLOW);
  for(const z of [-1.58,1.74]){
   const x=sgn*1.86;
   block(x,z,-.02,.84,.94,1.12,[.025,.035,.045]);
   block(sgn*2.08,z,.05,.06,.70,.70,[.25,.28,.31]);
   block(sgn*2.12,z,.12,.07,.27,.27,[.58,.64,.68],MAT_METAL);
   if(quality!=='low'){block(sgn*2.15,z+.22,.20,.09,.15,.22,[.96,.73,.26],MAT_GLOW);block(sgn*2.15,z-.22,.20,.09,.15,.22,[.96,.73,.26],MAT_GLOW);}
  }
 }
 wing(0,2.78,.46,0,3.36,.24,1.94,carbon);
 wing(0,3.38,.24,0,3.38,.24,3.10,accent);
 if(quality!=='low'){
  for(const sgn of [-1,1]){wing(sgn*.50,.66,-1.58,sgn*.90,.68,1.18,.14,[.94,.94,.88]);wing(sgn*1.05,.38,-.50,sgn*1.62,.36,.84,.12,[.10,.12,.18]);}
  block(0,-3.98,.16,2.28,.05,.22,[.075,.09,.12]);
 }
 if(shield){for(let j=0;j<3;j++)ring(v,{x:pos.x,y:pos.y,z:pos.z},3.3+j*.12,.60+1.0*j,[.13,.91,1]);}
 if(boost){for(const sgn of [-1,1]){const wave=.6+.4*Math.sin(time*17+sgn);block(sgn*.50,3.42,.28,.30,.26,1.68+wave,[1,.28,.05],MAT_GLOW);block(sgn*.50,4.18+wave,.26,.20,.15,.84+wave,[1,.78,.16],MAT_GLOW);}}
}
function pickup(v:Vertex,p:number,lane:number,time:number,type:KartPower){
 const point=place(p,lane),y=point.y+2.45+Math.sin(time*2.7+p*67)*.28,c:C=type==='turbo'?[1,.60,.14]:type==='shield'?[.16,.88,1]:[.72,.27,1];
 const angle=time*1.20+p*12,center={x:point.x,y,z:point.z};
 for(let j=0;j<2;j++){
  const r=j===0?1.7:1.25;
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
 private skyProgram:WebGLProgram;private skyBuffer:WebGLBuffer;private skyPos:number;private skyTime:WebGLUniformLocation|null;
 private billboardProgram:WebGLProgram|null=null;private billboardBuffer:WebGLBuffer|null=null;
 private billboardTexture:WebGLTexture|null=null;private billboardCount=0;
 private billboardPos=-1;private billboardUV=-1;private billboardMat:WebGLUniformLocation|null=null;
 private graphics:KartGraphics;private frameCounter=0;private fps=60;private fpsTime=0;
 private raf=0;private last=0;private lastHud=0;private lastBroadcast=0;private currentProgress=-.014;
 private lane=0;private lateralVelocity=0;private speed=0;private power:KartPower|null=null;private shieldUntil=0;private turboUntil=0;private slowUntil=0;
 private lapStart=0;private bestLap=0;private finished=false;private elapsed=0;private lastLapNumber=-1;
 private keys={left:false,right:false,brake:false};private remote=new Map<string,KartState>();private eye:Vec|null=null;private target:Vec|null=null;
 private collected=new Set<string>();private bots:KartState[]=[];private botTargets:number[]=[];private botsSlowedUntil=0;private inputPower=false;private stopped=false;private resize:()=>void;private hitCooldown=0;
 constructor(private canvas:HTMLCanvasElement,private options:KartOptions){
  this.graphics=options.graphics||'balanced';
  const gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'high-performance'})||canvas.getContext('experimental-webgl');
  if(!gl)throw Error('Bu tarayıcı WebGL desteklemiyor.');this.gl=gl as WebGLRenderingContext;
  const vs=shader(this.gl,this.gl.VERTEX_SHADER,VERT),fs=shader(this.gl,this.gl.FRAGMENT_SHADER,FRAG);
  const program=this.gl.createProgram();if(!program)throw Error('WebGL programı oluşturulamadı');this.gl.attachShader(program,vs);this.gl.attachShader(program,fs);this.gl.linkProgram(program);if(!this.gl.getProgramParameter(program,this.gl.LINK_STATUS))throw Error('WebGL bağlantı hatası');this.program=program;
  this.gl.deleteShader(vs);this.gl.deleteShader(fs);
  this.attribPos=this.gl.getAttribLocation(program,'aPos');this.attribColor=this.gl.getAttribLocation(program,'aColor');this.attribNormal=this.gl.getAttribLocation(program,'aNormal');this.attribMat=this.gl.getAttribLocation(program,'aMat');this.uniformTime=this.gl.getUniformLocation(program,'uTime');this.uniformDetail=this.gl.getUniformLocation(program,'uDetail');const uniform=this.gl.getUniformLocation(program,'uViewProj');if(!uniform)throw Error('Kamera oluşturulamadı');this.uniformMat=uniform;
  const sv=shader(this.gl,this.gl.VERTEX_SHADER,SKY_VERT),sf=shader(this.gl,this.gl.FRAGMENT_SHADER,SKY_FRAG);
  const sp=this.gl.createProgram();if(!sp)throw Error('Atmosfer başlatılamadı');this.gl.attachShader(sp,sv);this.gl.attachShader(sp,sf);this.gl.linkProgram(sp);if(!this.gl.getProgramParameter(sp,this.gl.LINK_STATUS))throw Error('Atmosfer derlenemedi');this.skyProgram=sp;
  this.gl.deleteShader(sv);this.gl.deleteShader(sf);this.skyPos=this.gl.getAttribLocation(sp,'aPosition');this.skyTime=this.gl.getUniformLocation(sp,'uTime');
  const skyBuffer=this.gl.createBuffer();if(!skyBuffer)throw Error('Atmosfer belleği oluşturulamadı');this.skyBuffer=skyBuffer;
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER,skyBuffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),this.gl.STATIC_DRAW);
  const sb=this.gl.createBuffer(),db=this.gl.createBuffer();if(!sb||!db)throw Error('WebGL belleği oluşturulamadı');this.staticBuffer=sb;this.dynamicBuffer=db;
  const verts=buildWorld(this.graphics);this.worldCount=verts.length/STRIDE;this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.staticBuffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(verts),this.gl.STATIC_DRAW);
  // Optional 3D track signage: if browser disallows 2D textures, the race still works.
  if(typeof document!=='undefined')try{this.prepareBillboards();}catch(e){console.warn('Kart Rush signage fallback:',e);}
  const baseLanes=[-4.8,4.8,-1.75,1.75,-3.3,3.3];
  for(let i=0;i<5;i++){this.bots.push({id:'bot'+i,name:['Nitro Max','Turbo Ece','Apex','Vortex','Pist Ası'][i],color:['#ffd447','#36d5bc','#ba83ff','#ff8c42','#f86994'][i],progress:-.016-i*.0045,lane:baseLanes[i],speed:0});this.botTargets.push(baseLanes[i]);}
  this.resize=()=>{const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,this.graphics==='high'?2:this.graphics==='balanced'?1.4:1),w=Math.max(1,Math.floor(r.width*dpr)),h=Math.max(1,Math.floor(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;this.gl.viewport(0,0,w,h);}};
  window.addEventListener('resize',this.resize,{passive:true});this.resize();this.raf=requestAnimationFrame(this.frame);
 }
 setGraphics(g:KartGraphics){if(this.graphics===g)return;this.graphics=g;
  const verts=buildWorld(this.graphics);this.worldCount=verts.length/STRIDE;this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.staticBuffer);
  this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(verts),this.gl.STATIC_DRAW);
  if(this.billboardBuffer){const signs=billboardGeometry(this.graphics);this.billboardCount=signs.length/5;this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.billboardBuffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,signs,this.gl.STATIC_DRAW);}
  this.resize();}
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
 setKeys(keys:Partial<typeof this.keys>){this.keys={...this.keys,...keys};}
 usePower(){this.inputPower=true;}
 setRemote(players:KartState[]){const n=new Map<string,KartState>();for(const p of players){if(p.id!==this.options.id)n.set(p.id,p);}this.remote=n;}
 receiveAttack(power:KartPower){if(power==='emp'&&performance.now()/1000>this.shieldUntil)this.slowUntil=performance.now()/1000+2.3;}
 dispose(){this.stopped=true;cancelAnimationFrame(this.raf);window.removeEventListener('resize',this.resize);this.gl.deleteBuffer(this.staticBuffer);this.gl.deleteBuffer(this.dynamicBuffer);this.gl.deleteProgram(this.program);this.gl.deleteBuffer(this.skyBuffer);this.gl.deleteProgram(this.skyProgram);
  if(this.billboardTexture)this.gl.deleteTexture(this.billboardTexture);
  if(this.billboardBuffer)this.gl.deleteBuffer(this.billboardBuffer);
  if(this.billboardProgram)this.gl.deleteProgram(this.billboardProgram);
 }
 private updateBots(t:number,dt:number){
  const difficulty=this.options.difficulty||'normal';const base=difficulty==='easy'?33:difficulty==='hard'?44:41.5;
  for(let i=0;i<this.bots.length;i++){
   const b=this.bots[i];if(b.progress>=3){b.finished=true;continue;}
   const course=wrap(b.progress),sectorSpeed=.98+.055*Math.sin(course*TAU*3+i*1.3);
   let desired=base+[-.4,1.1,2.4,3.5,4.25][i];
   desired*=sectorSpeed;
   const gap=this.currentProgress-b.progress;
   // Mild catch-up creates a contest without teleporting or rubber-band snapping.
   if(gap>.12)desired+=Math.min(2.5,(gap-.12)*7);
   if(gap<-.18 && difficulty!=='hard')desired-=Math.min(1.2,(-gap-.18)*3);
   if(t<this.botsSlowedUntil)desired*=.60;
   b.speed=mix(b.speed,desired,ease(2.4,dt));
   b.progress+=b.speed/TRACK_LENGTH*dt;
   let target=[-4.5,4.0,-1.65,1.35,3.25][i]+.75*Math.sin(course*TAU*2+i*2);
   // AI chooses a passing line if closely following the player or another kart.
   const nearPlayer=Math.abs(b.progress-this.currentProgress)<.025;
   if(nearPlayer && Math.abs(b.lane-this.lane)<2.5)target=this.lane+(b.lane<=this.lane?-3.8:3.8);
   for(let j=0;j<this.bots.length;j++){
    if(i===j)continue;const other=this.bots[j];const delta=other.progress-b.progress;
    if(delta>0&&delta<.019&&Math.abs(other.lane-b.lane)<2.3){target=other.lane+(i%2===0?-3.2:3.2);break;}
   }
   this.botTargets[i]=mix(this.botTargets[i],clamp(target,-7,7),ease(2.4,dt));
   b.lane=mix(b.lane,this.botTargets[i],ease(2.0,dt));
  }
 }
 private frame=(ts:number)=>{
  if(this.stopped)return;
  this.frameCounter++;if(ts-this.fpsTime>1200){this.fps=Math.round(this.frameCounter*1000/Math.max(ts-this.fpsTime,1));this.frameCounter=0;this.fpsTime=ts;}this.raf=requestAnimationFrame(this.frame);if(!this.last)this.last=ts;
  const dt=clamp((ts-this.last)/1000,0,.055);this.last=ts;this.elapsed=(Date.now()-this.options.startAt)/1000;
  const countdown=Math.max(0,Math.ceil(-this.elapsed)),started=this.elapsed>=0;
  if(started&&!this.finished){
   const t=ts/1000,turbo=t<this.turboUntil,slowed=t<this.slowUntil,offroad=Math.abs(this.lane)>7.2;
   const speedCap=offroad?27:slowed?24:turbo?56:42;
   const braking=this.keys.brake;
   const steer=(this.keys.right?1:0)-(this.keys.left?1:0);
   const targetSpeed=braking?15:speedCap-(steer!==0?2:0);
   this.speed=mix(this.speed,targetSpeed,ease(braking?3.8:2.3,dt));
   // Grounded, quick response: release steering -> lateral velocity approaches zero immediately.
   const targetStrafe=steer*(8.2+this.speed*.085);
   this.lateralVelocity=mix(this.lateralVelocity,targetStrafe,ease(steer?15:42,dt));
   this.lane=clamp(this.lane+this.lateralVelocity*dt,-8.5,8.5);
   if(Math.abs(this.lane)>=8.49){this.lateralVelocity=0;this.speed=Math.min(this.speed,26);}
   this.currentProgress+=this.speed/TRACK_LENGTH*dt;
   const lap=Math.max(0,Math.floor(Math.max(0,this.currentProgress)));
   if(this.currentProgress>=3){this.finished=true;const end=Math.round(this.elapsed*1000);const last=end-this.lapStart;if(last>0)this.bestLap=this.bestLap===0?last:Math.min(this.bestLap,last);this.options.onFinish(end,this.bestLap||end);}
   else if(lap>this.lastLapNumber){const now=Math.round(this.elapsed*1000);if(this.lastLapNumber>=0){const ms=now-this.lapStart;this.bestLap=this.bestLap===0?ms:Math.min(this.bestLap,ms);}this.lapStart=now;this.lastLapNumber=lap;}
   for(let i=0;i<PICKUP_POS.length;i++)for(let j=0;j<PICKUP_LANES.length;j++){
    const p=PICKUP_POS[i],lane=PICKUP_LANES[j],key=`${Math.floor(this.currentProgress)}:${i}:${j}`;
    const delta=wrap(this.currentProgress)-p;
    if(Math.abs(delta)<.009&&Math.abs(this.lane-lane)<2.2&&!this.collected.has(key)){
     this.collected.add(key);if(!this.power)this.power=powerAt(i,j);
    }
   }
   if(this.inputPower&&this.power){const pow=this.power;this.power=null;
    if(pow==='turbo')this.turboUntil=t+3.5;
    if(pow==='shield')this.shieldUntil=t+7;
    if(pow==='emp'){this.options.onPower?.('emp');if(this.options.bots)this.botsSlowedUntil=t+2.4;}
   }
   this.inputPower=false;
   if(this.options.bots){this.updateBots(t,dt);
    // Bumping into a rival reduces momentum; shields prevent the collision penalty.
    if(t>this.hitCooldown&&t>this.shieldUntil)for(const bot of this.bots){
     if(Math.abs(bot.progress-this.currentProgress)<.006&&Math.abs(bot.lane-this.lane)<2.0){this.speed=Math.max(19,this.speed*.80);this.hitCooldown=t+.65;break;}
    }
   }
   if(ts-this.lastBroadcast>150){this.lastBroadcast=ts;this.options.onSnapshot?.({id:this.options.id,progress:this.currentProgress,lane:this.lane,speed:this.speed,color:this.options.color,name:this.options.name,finished:this.finished});}
  }
  if(ts-this.lastHud>125){this.lastHud=ts;const others=this.options.bots?this.bots:[...this.remote.values()];const rank=1+others.filter(p=>p.progress>this.currentProgress).length;
   const rivals=[{id:this.options.id,name:this.options.name,color:this.options.color,progress:this.currentProgress},...others.map(b=>({id:b.id,name:b.name,color:b.color,progress:b.progress}))].sort((a,b)=>b.progress-a.progress);
   this.options.onHud({speed:Math.round(this.speed*6.8),lap:Math.min(3,Math.max(1,Math.floor(Math.max(0,this.currentProgress))+1)),totalLaps:3,remaining:Math.max(0,3-this.currentProgress),power:this.power,rank,total:others.length+1,elapsed:Math.max(0,this.elapsed),started,countdown,shield:ts/1000<this.shieldUntil,turbo:ts/1000<this.turboUntil,fps:this.fps,bestLapMs:this.bestLap,offroad:Math.abs(this.lane)>7.2,progress:this.currentProgress,rivals});
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
  const ahead=18+Math.min(9,this.speed*.115);
  const wantedEye={x:pos.x-t.x*(boost?19.9:17.1),y:pos.y+(boost?8.7:8.95),z:pos.z-t.z*(boost?19.9:17.1)};
  const wantedTarget={x:pos.x+t.x*ahead,y:pos.y+1.65,z:pos.z+t.z*ahead};
  if(!this.eye){this.eye=wantedEye;this.target=wantedTarget;}else{
   const k=ease(6.0,dt);this.eye={x:mix(this.eye.x,wantedEye.x,k),y:mix(this.eye.y,wantedEye.y,k),z:mix(this.eye.z,wantedEye.z,k)};
   this.target={x:mix(this.target!.x,wantedTarget.x,k),y:mix(this.target!.y,wantedTarget.y,k),z:mix(this.target!.z,wantedTarget.z,k)};
  }
  const fov=boost?Math.PI/3.04:Math.PI/3.22;
  const proj=projection(fov,this.canvas.width/this.canvas.height,.3,450),mat=mul(proj,lookAt(this.eye,this.target!));gl.useProgram(this.program);gl.uniformMatrix4fv(this.uniformMat,false,mat);
  gl.uniform1f(this.uniformTime,time);gl.uniform1f(this.uniformDetail,this.graphics==='low'?0:this.graphics==='balanced'?.5:1);
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
  const lap=Math.floor(Math.max(0,this.currentProgress));
  for(let i=0;i<PICKUP_POS.length;i++)for(let j=0;j<PICKUP_LANES.length;j++){
   if(!this.collected.has(`${lap}:${i}:${j}`))pickup(dyn,PICKUP_POS[i],PICKUP_LANES[j],time,powerAt(i,j));
  }
  if(this.options.bots){for(const bot of this.bots)car(dyn,bot.progress,bot.lane,bot.color,false,false,0,this.graphics,time);}else for(const remote of this.remote.values())car(dyn,remote.progress,remote.lane,remote.color,false,false,0,this.graphics,time);
  car(dyn,this.currentProgress,this.lane,this.options.color,time<this.shieldUntil,boost,this.lateralVelocity*.005,this.graphics,time);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(dyn),gl.DYNAMIC_DRAW);drawBuffer(this.dynamicBuffer,dyn.length/STRIDE);
 }
}
