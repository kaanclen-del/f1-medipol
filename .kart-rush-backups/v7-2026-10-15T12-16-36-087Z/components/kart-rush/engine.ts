/* F1 Medipol Kart Rush V2: local arcade racing engine.
 * Dependency-free WebGL; no Supabase calls in the animation/render loop.
 * V6 physics: explicit throttle / braking, physical track edges, AI abilities and contact resolution.
 */
export type KartPower = 'turbo' | 'shield' | 'emp';
export type KartDifficulty = 'easy' | 'normal' | 'hard';
export type KartGraphics = 'low' | 'balanced' | 'high';
export type KartState = { id: string; progress: number; lane: number; speed: number; color: string; name: string; finished?: boolean };
export type KartHud = {
 speed: number; lap: number; totalLaps: number; remaining: number;
 power: KartPower | null; rank: number; total: number; elapsed: number; started: boolean; countdown: number;
 shield: boolean; turbo: boolean; fps?: number; bestLapMs?: number; offroad?: boolean; progress?: number; throttle?: boolean; contact?: boolean;
 rivals?: { id: string; name: string; color: string; progress: number }[];
};
export type KartOptions = {
 id: string; color: string; name: string; startAt: number; laps?: number; bots?: boolean; difficulty?: KartDifficulty; graphics?: KartGraphics;
 onHud: (hud: KartHud) => void; onFinish: (durationMs: number, bestLapMs: number) => void;
 onSnapshot?: (s: KartState) => void; onPower?: (power: KartPower) => void; onEffect?: (effect:'pickup'|'boost'|'shield'|'emp'|'collision') => void;
};
type Vec={x:number;y:number;z:number};type Vertex=number[];
type C=[number,number,number];
const TAU=Math.PI*2;
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const wrap=(x:number)=>((x%1)+1)%1;
const mix=(a:number,b:number,k:number)=>a+(b-a)*k;
const ease=(rate:number,dt:number)=>1-Math.exp(-rate*dt);
let TRACK_LENGTH=420;
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
// Arc length, not a fictitious constant: progress and collision distances use the rendered track scale.
TRACK_LENGTH=(()=>{let total=0,prev=pt(0);for(let i=1;i<=1800;i++){const next=pt(i/1800);total+=Math.hypot(next.x-prev.x,next.z-prev.z);prev=next;}return total;})();
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
 // A continuous, low terrain sheet sits BELOW the road; never put an overlapping grass polygon on the asphalt.
 quad(v,{x:-380,y:-8,z:-380},{x:380,y:-8,z:-380},{x:380,y:-8,z:380},{x:-380,y:-8,z:380},[.15,.26,.17],MAT_GRASS);
 for(let i=0;i<64;i++){
  const a=i*TAU/64,b=(i+1)*TAU/64,ra=257+(i*17%45),rb=257+((i+1)*17%45),peak=18+(i*13%32);
  tri(v,{x:ra*Math.cos(a),y:-9,z:ra*Math.sin(a)},{x:(ra+rb)*.5*Math.cos((a+b)*.5),y:peak,z:(ra+rb)*.5*Math.sin((a+b)*.5)},{x:rb*Math.cos(b),y:-9,z:rb*Math.sin(b)},i%3===0?[.37,.47,.50]:i%3===1?[.45,.52,.55]:[.28,.39,.43]);
 }
 const N=quality==='low'?340:quality==='high'?880:590;
 const strip=(a:number,b:number,left:number,right:number,rise:number,color:C,mat:number)=>{
  const aa=place(a,left),ab=place(a,right),bb=place(b,right),ba=place(b,left);
  aa.y+=rise;ab.y+=rise;bb.y+=rise;ba.y+=rise;
  quad(v,aa,ab,bb,ba,color,mat);
 };
 for(let i=0;i<N;i++){
  const a=i/N,b=(i+1)/N;
  // Adjacent bands share boundaries, but their INTERIORS never overlap. Curb and road height are controlled separately.
  strip(a,b,-22,-13,-.12,[.23,.35,.24],MAT_GRASS);
  strip(a,b,13,22,-.12,[.22,.34,.24],MAT_GRASS);
  strip(a,b,-13,-10.35,.028,[.24,.30,.30],MAT_ASPHALT);
  strip(a,b,10.35,13,.028,[.24,.30,.30],MAT_ASPHALT);
  strip(a,b,-10.35,-9.05,.145,Math.floor(i/7)%2?[.95,.93,.87]:[.90,.12,.17],MAT_BASIC);
  strip(a,b,9.05,10.35,.145,Math.floor(i/7)%2?[.95,.93,.87]:[.90,.12,.17],MAT_BASIC);
  strip(a,b,-9.05,9.05,.105,[.102,.111,.123],MAT_ASPHALT);
  // Painted WHITE circuit boundaries sit just above the asphalt, not in the grass.
  strip(a,b,-8.93,-8.81,.124,[.79,.83,.82],MAT_BASIC);
  strip(a,b,8.81,8.93,.124,[.79,.83,.82],MAT_BASIC);
  // Intermittent tyre-rubber streaks and asphalt expansion joints follow the racing line.
  if(quality!=='low' && i%4!==0){
   const rubber=.015*Math.sin(i*.35);
   strip(a,b,-2.8+rubber,-2.70+rubber,.129,[.065,.067,.073],MAT_ASPHALT);
   strip(a,b,2.5-rubber,2.57-rubber,.129,[.067,.069,.075],MAT_ASPHALT);
  }
  if(i%Math.max(6,Math.round(N/95))===0){
   for(const side of [-1,1]){
    const pos=place(a,side*15.5),angle=yawFor(a);
    box(v,pos.x,pos.y-.18,pos.z,.32,1.05,TRACK_LENGTH/N*2.6,[.54,.61,.66],angle,MAT_METAL);
    box(v,pos.x,pos.y+.48,pos.z,.40,.17,TRACK_LENGTH/N*2.6,[.92,.94,.95],angle,MAT_METAL);
    if(i%Math.max(18,Math.round(N/34))===0){
     const p=place(a,side*15.65);box(v,p.x,p.y-.2,p.z,.43,1.7,.40,[.18,.23,.26],0,MAT_METAL);
    }
   }
  }
 }
 // Checkered start grid is a raised decal on asphalt, not an intersecting terrain patch.
 for(let l=-8;l<8;l+=2)for(let row=0;row<2;row++){
  if((Math.floor((l+8)/2)+row)%2===0)strip(.998+row*.00065,.99865+row*.00065,l,l+2,.145,[.93,.94,.94],MAT_BASIC);
 }
 const checkpoint=pt(0);
 for(const side of [-1,1]){
  const pillar=place(0,side*16.6);box(v,pillar.x,pillar.y-.6,pillar.z,.85,10.8,.85,[.20,.27,.33],0,MAT_METAL);
 }
 box(v,checkpoint.x,checkpoint.y+9.1,checkpoint.z,31,1.15,2.2,[.85,.16,.24],yawFor(0),MAT_GLOW);
 for(const l of [-7,-3.5,0,3.5,7]){const pp=place(0,l);box(v,pp.x,pp.y+8.25,pp.z,1.0,.48,.45,[1,.65,.25],yawFor(0),MAT_GLOW);}
 // Motorsport venues: grandstands and pit furniture, no houses/towers/buildings crowding hairpins.
 for(const [prog,side] of [[.022,-1],[.026,1],[.94,1],[.944,-1]] as const){
  const p=place(prog,side*38);grandstand(v,p.x,p.y-1.8,p.z,yawFor(prog)+(side>0?-Math.PI/2:Math.PI/2),5,side===1?[.36,.72,.91]:[.89,.23,.31]);
 }
 for(const [prog,side] of [[.13,-1],[.41,1],[.68,-1],[.83,1]] as const){
  const p=place(prog,side*38);for(let i=0;i<5;i++){
   const q=place(prog+i*.003,side*(40+(i%2)*3));
   box(v,q.x,q.y-1,q.z,5.2,1.25,2.2,[.18,.24,.27],yawFor(prog),MAT_METAL);
   box(v,q.x,q.y+.22,q.z,5.35,.16,2.4,i%2?[.85,.12,.20]:[.14,.43,.68],yawFor(prog),MAT_GLOW);
  }
  makeFlag(v,p.x,p.y-1,p.z,[.93,.17,.25]);
 }
 // Low tyre stacks far from the circuit but within the runoff. No billboard pillar blocks the driving line.
 for(let i=0;i<72;i++){
  const prog=i/72,side=i%2?-1:1;
  if(i%5===0){const p=place(prog,side*20);for(let k=0;k<3;k++)cylinder(v,p.x,p.y-.6+k*.38,p.z,.79,.39,[.07,.09,.11],quality==='low'?7:12,MAT_METAL);}
  if(i%3===0){const p=place(prog,side*24);lampPost(v,p.x,p.y-1.2,p.z,quality==='low'?6:8,yawFor(prog));}
 }
 const trees=quality==='low'?90:quality==='high'?380:215;
 for(let i=0;i<trees;i++){
  const frac=(i*.618033988749895)%1,side=i%2?-1:1,offset=quality==='high'?38+i%34:43+i%27,p=place(frac,side*offset);
  cylinder(v,p.x,p.y-1,p.z,.26,2.5,[.27,.25,.19],6);
  cone(v,p.x,p.y+.50,p.z,2.7,5.3,[.11,.30+(i%5)*.028,.19],quality==='low'?5:quality==='high'?11:8);
  cone(v,p.x,p.y+2.0,p.z,2.15,4.4,[.14,.35+(i%4)*.030,.21],quality==='low'?5:8);
  cone(v,p.x,p.y+3.4,p.z,1.36,3.3,[.18,.43,.27],quality==='low'?5:8);
 }
 if(quality==='high')for(let i=0;i<290;i++){
  const prog=(i*.7548776662)%1,side=i%2?-1:1,offset=26+(i*7%11),p=place(prog,side*offset),col:C=i%4===0?[.26,.40,.24]:[.19,.34,.18];
  cone(v,p.x,p.y-.8,p.z,.27,.53,col,5);
 }
 // Overhead sponsor arches leave >10m under them and >12m clear width from centre.
 for(const prog of [.12,.53,.79]){
  const p=pt(prog);archway(v,p.x,p.y-.4,p.z,31,12.5,1.6,yawFor(prog),[.24,.30,.36],[.93,.16,.24]);
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
   float coarse=noise(vWorld.xz*.72)*.105;
   float fine=noise(vWorld.xz*21.)*.073;
   float grain=noise(vWorld.xz*62.)*.023;
   float patch=step(.78,noise(vWorld.xz*.10))*-.072;
   float rubber=smoothstep(.2,.8,noise(vWorld.xz*.22))*.045;
   c*=.76+coarse+fine+grain+patch+rubber;
  }
 }
 if(vMat>.5&&vMat<1.5){
  if(uDetail<.1){c*=.92;}else{
   float t=noise(vWorld.xz*.12)*.17+noise(vWorld.xz*1.6)*.14+noise(vWorld.xz*7.5)*.075;
   float grassBlades=noise(vWorld.xz*24.)*.045;
   c*=.70+t+grassBlades;
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
function f1Wheel(v:Vertex,at:(x:number,y:number,z:number)=>Vec,x:number,y:number,z:number,quality:KartGraphics){
 const segments=quality==='low'?10:quality==='high'?24:16,r=.57,width=.69;
 const tyre:C=[.035,.038,.043],sidewall:C=[.075,.08,.087],hub:C=[.19,.21,.24];
 for(let i=0;i<segments;i++){
  const a=i*TAU/segments,b=(i+1)*TAU/segments;
  const ring=(dx:number,angle:number,radius:number)=>at(x+dx,y+Math.sin(angle)*radius,z+Math.cos(angle)*radius);
  quad(v,ring(-width/2,a,r),ring(width/2,a,r),ring(width/2,b,r),ring(-width/2,b,r),i%3===0?[.043,.048,.054]:tyre,MAT_BASIC);
  for(const sign of [-1,1]){
   const sx=sign*width/2;
   quad(v,ring(sx,a,r),ring(sx,b,r),ring(sx,b,r*.53),ring(sx,a,r*.53),sidewall,MAT_BASIC);
   if(quality!=='low')quad(v,ring(sx+sign*.006,a,r*.78),ring(sx+sign*.006,b,r*.78),ring(sx+sign*.006,b,r*.75),ring(sx+sign*.006,a,r*.75),[.80,.67,.18],MAT_BASIC);
   tri(v,ring(sx,a,r*.42),ring(sx,b,r*.42),at(x+sx+sign*.016,y,z),hub,MAT_METAL);
  }
 }
}
function car(v:Vertex,p:number,lane:number,color:string,shield=false,boost=false,drift=0,quality:KartGraphics='balanced',time=0){
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
 // Floor, rear diffuser and two different tapers on the survival cell.
 block(0,.08,.25,1.65,.20,5.3,carbon);
 hull(-3.00,-1.18,.19,.72,.35,.57,c);
 hull(-1.18,.75,.72,1.16,.31,.85,c);
 hull(.75,2.40,1.16,.72,.32,.77,c);
 block(0,-1.85,.56,.14,.04,2.20,stripe,MAT_GLOW);
 block(0,1.1,.82,.14,.035,2.05,stripe,MAT_GLOW);
 for(const sign of [-1,1]){
  // Slim sidepods with radiators, tapered toward the gearbox.
  const a=at(sign*.60,.36,-.60),b=at(sign*1.03,.38,-.28),d=at(sign*.95,.64,1.4),e=at(sign*.55,.70,1.2);
  panel(a,b,d,e,light(c,.70));
  block(sign*.88,.20,.37,.34,.21,1.63,light(c,.77));
  block(sign*.77,.62,.54,.08,.23,.77,[.10,.13,.16],MAT_GLASS);
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
  block(0,z,.28,3.42,.075,.28,z===-3.15?carbon:stripe);
  block(0,z+.16,.34,2.47,.055,.14,light(c,.85));
 }
 for(const sign of [-1,1]){
  block(sign*1.72,-3.00,.27,.075,.41,.66,carbon);
  block(sign*.84,-2.91,.49,.10,.22,.32,carbon);
 }
 // Rear wing and diffuser: explicitly elevated, with open air underneath.
 for(const sign of [-1,1]){
  block(sign*.67,2.55,.63,.10,.78,.16,carbon);
  block(sign*1.65,2.66,.99,.08,.69,.65,carbon);
 }
 block(0,2.70,1.29,3.40,.12,.58,carbon);
 block(0,2.75,1.14,2.80,.055,.24,stripe);
 block(0,2.48,.40,1.92,.18,.57,[.10,.13,.16]);
 block(0,2.96,.43,1.4,.075,.30,carbon);
 for(const sign of [-1,1]){
  // Two suspension arms for every wheel visibly connect the upright to the chassis.
  for(const z of [-1.98,1.72]){
   const inner=at(sign*.50,.37,z+((z<0)?.15:-.05));
   const outer=at(sign*1.42,.52,z);
   const spoke=at(sign*.86,.36,z+.22);
   tri(v,inner,outer,spoke,[.18,.20,.23],MAT_METAL);
   tri(v,inner,at(sign*.88,.48,z-.24),outer,[.20,.22,.25],MAT_METAL);
   f1Wheel(v,at,sign*1.55,.61,z,quality);
  }
  block(sign*.78,2.36,.48,.10,.21,.43,[.78,.10,.14],MAT_GLOW);
 }
 block(0,2.61,.61,.52,.13,.10,[.93,.22,.28],MAT_GLOW);
 if(quality==='high'){
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
 private keys={left:false,right:false,brake:false,throttle:false};private remote=new Map<string,KartState>();private eye:Vec|null=null;private target:Vec|null=null;
 private collected=new Set<string>();private bots:KartState[]=[];private botTargets:number[]=[];private botPowers:(KartPower|null)[]=[];private botTurboUntil:number[]=[];private botShieldUntil:number[]=[];private botPowerSince:number[]=[];private botCollected=new Set<string>();private botsSlowedUntil=0;private inputPower=false;private stopped=false;private resize:()=>void;private hitCooldown=0;private otherHitTimes=new Map<string,number>();private contactUntil=0;private paused=false;private pausedAt=0;private pauseTotalMs=0;
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
  for(let i=0;i<5;i++){this.bots.push({id:'bot'+i,name:['Nitro Max','Turbo Ece','Apex','Vortex','Pist Ası'][i],color:['#ffd447','#36d5bc','#ba83ff','#ff8c42','#f86994'][i],progress:-.016-i*.0045,lane:baseLanes[i],speed:0});this.botTargets.push(baseLanes[i]);this.botPowers.push(null);this.botTurboUntil.push(0);this.botShieldUntil.push(0);this.botPowerSince.push(0);}
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
 usePower(){if(!this.paused)this.inputPower=true;}
 setPaused(value:boolean){if(this.paused===value)return;this.paused=value;
  if(value)this.pausedAt=Date.now();else{this.pauseTotalMs+=Date.now()-this.pausedAt;this.last=0;}
  this.keys={throttle:false,brake:false,left:false,right:false};this.lateralVelocity=0;
 }
 setRemote(players:KartState[]){const n=new Map<string,KartState>();for(const p of players){if(p.id!==this.options.id)n.set(p.id,p);}this.remote=n;}
 receiveAttack(power:KartPower){if(power==='emp'&&performance.now()/1000>this.shieldUntil){this.slowUntil=performance.now()/1000+2.3;this.options.onEffect?.('emp');}}
 dispose(){this.stopped=true;cancelAnimationFrame(this.raf);window.removeEventListener('resize',this.resize);this.gl.deleteBuffer(this.staticBuffer);this.gl.deleteBuffer(this.dynamicBuffer);this.gl.deleteProgram(this.program);this.gl.deleteBuffer(this.skyBuffer);this.gl.deleteProgram(this.skyProgram);
  if(this.billboardTexture)this.gl.deleteTexture(this.billboardTexture);
  if(this.billboardBuffer)this.gl.deleteBuffer(this.billboardBuffer);
  if(this.billboardProgram)this.gl.deleteProgram(this.billboardProgram);
 }
 private tryContact(other:KartState,t:number,otherShield=false){
  const a=place(this.currentProgress,this.lane),b=place(other.progress,other.lane);
  const dist=Math.hypot(a.x-b.x,a.z-b.z),key=other.id;
  if(dist>3.05||t<(this.otherHitTimes.get(key)||0))return;
  this.otherHitTimes.set(key,t+.62);this.contactUntil=t+.45;
  const lateral=this.lane-other.lane,sign=Math.abs(lateral)>.05?Math.sign(lateral):(this.options.id<other.id?1:-1);
  const delta=.68;
  this.lane=clamp(this.lane+sign*delta,-11.6,11.6);
  if(this.options.bots){other.lane=clamp(other.lane-sign*delta,-11.6,11.6);}
  if(t>this.shieldUntil){this.speed=Math.max(0,this.speed*.71-1.3);}
  if(this.options.bots&&!otherShield)other.speed=Math.max(3,other.speed*.67);
  // Keep contact physically visible and time limited; don't teleport the cars.
  this.lateralVelocity=sign*5;
  this.options.onEffect?.('collision');
 }
 private updateBots(t:number,dt:number){
  const difficulty=this.options.difficulty||'normal',base=difficulty==='easy'?30:difficulty==='hard'?41:35;
  for(let i=0;i<this.bots.length;i++){
   const b=this.bots[i];if(b.progress>=3){b.finished=true;b.speed=0;continue;}
   const phase=wrap(b.progress),sector=.94+.09*Math.sin(phase*TAU*4+i*.9);
   const boosted=t<this.botTurboUntil[i],protectedBot=t<this.botShieldUntil[i];
   let desired=(base+i*.86)*sector+(boosted?12:0);
   if(this.currentProgress-b.progress>.17)desired+=Math.min(1.8,(this.currentProgress-b.progress-.17)*5);
   if(t<this.botsSlowedUntil&&!protectedBot)desired*=.55;
   b.speed=mix(b.speed,desired,ease(boosted?2.9:1.35,dt));
   const old=b.progress;b.progress+=b.speed/TRACK_LENGTH*dt;
   // Don't home in blindly: seek the nearest uncollected power crystal when available.
   let target=[-4.5,4,-1.75,1.75,3.6][i]+.63*Math.sin(phase*TAU*2.2+i*2.1);
   if(!this.botPowers[i])for(let j=0;j<PICKUP_POS.length;j++)for(let k=0;k<PICKUP_LANES.length;k++){
    const ahead=(PICKUP_POS[j]-phase+1)%1;
    const key=`${Math.floor(b.progress+ahead)}:${j}:${k}`;
    if(ahead<.053 && !this.botCollected.has(`${i}:${key}`)){
     const lane=PICKUP_LANES[k];
     if(Math.abs(lane-b.lane)<5.5){target=lane;}
    }
   }
   for(const candidate of [
    {progress:this.currentProgress,lane:this.lane,id:this.options.id},
    ...this.bots.filter((_,j)=>i!==j)
   ]){
    const d=candidate.progress-b.progress;
    if(d>0&&d<.02&&Math.abs(candidate.lane-b.lane)<2.6){
     target=clamp(candidate.lane+(i%2?-3.3:3.3),-7.9,7.9);break;
    }
   }
   this.botTargets[i]=mix(this.botTargets[i],clamp(target,-7.9,7.9),ease(2.0,dt));
   b.lane=mix(b.lane,this.botTargets[i],ease(1.9,dt));
   for(let j=0;j<PICKUP_POS.length;j++)for(let k=0;k<PICKUP_LANES.length;k++){
    const p=PICKUP_POS[j],lane=PICKUP_LANES[k],lap=Math.floor(b.progress),key=`${i}:${lap}:${j}:${k}`;
    if(Math.floor(b.progress-p)>Math.floor(old-p)&&Math.abs(b.lane-lane)<2.8&&!this.botCollected.has(key)){
     this.botCollected.add(key);
     if(!this.botPowers[i]){this.botPowers[i]=powerAt(j,k);this.botPowerSince[i]=t;}
    }
   }
   const held=this.botPowers[i],nearPlayer=Math.abs(b.progress-this.currentProgress)<.14;
   if(held && t-this.botPowerSince[i]>(held==='shield'?1.25:.75) &&
     (held==='turbo'||held==='shield'||nearPlayer||t-this.botPowerSince[i]>5)){
    if(held==='turbo')this.botTurboUntil[i]=t+3.3;
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
   const a=this.bots[i],b=this.bots[j],key=`bot-${i}-${j}`;
   if(t<(this.otherHitTimes.get(key)||0))continue;
   const pa=place(a.progress,a.lane),pb=place(b.progress,b.lane);
   if(Math.hypot(pa.x-pb.x,pa.z-pb.z)<2.8){
    const sign=a.lane>=b.lane?1:-1;
    a.lane=clamp(a.lane+sign*.40,-10,10);b.lane=clamp(b.lane-sign*.40,-10,10);
    if(t>this.botShieldUntil[i])a.speed*=.82;
    if(t>this.botShieldUntil[j])b.speed*=.82;
    this.otherHitTimes.set(key,t+.55);
   }
  }
 }
 private frame=(ts:number)=>{
  if(this.stopped)return;
  this.frameCounter++;if(ts-this.fpsTime>1200){this.fps=Math.round(this.frameCounter*1000/Math.max(ts-this.fpsTime,1));this.frameCounter=0;this.fpsTime=ts;}this.raf=requestAnimationFrame(this.frame);if(!this.last)this.last=ts;
  const dt=clamp((ts-this.last)/1000,0,.055);this.last=ts;this.elapsed=((this.paused?this.pausedAt:Date.now())-this.options.startAt-this.pauseTotalMs)/1000;
  const countdown=Math.max(0,Math.ceil(-this.elapsed)),started=this.elapsed>=0;
  if(started&&!this.finished&&!this.paused){
   const t=ts/1000,turbo=t<this.turboUntil,slowed=t<this.slowUntil,offroad=Math.abs(this.lane)>10.4;
   const speedCap=offroad?23:slowed?25:turbo?57:44;
   const braking=this.keys.brake,throttle=this.keys.throttle;
   const steer=(this.keys.right?1:0)-(this.keys.left?1:0);
   // No input means NO drive torque. Drag makes the car coast; brakes slow it decisively.
   const resistance=2.3+.036*this.speed+.0032*this.speed*this.speed;
   let acceleration=(throttle?(turbo?34:22):0)-(braking?49:0)-resistance;
   if(offroad)acceleration-=7.2;
   if(slowed)acceleration-=5.6;
   this.speed=Math.max(0,this.speed+acceleration*dt);
   if(this.speed>speedCap)this.speed=Math.max(speedCap,this.speed-(offroad?45:slowed?26:17)*dt);
   const steeringFactor=clamp(this.speed/16,.0,1.15);
   const targetStrafe=steer*(6.3+this.speed*.095)*steeringFactor;
   this.lateralVelocity=mix(this.lateralVelocity,targetStrafe,ease(steer?11:16,dt));
   this.lane=clamp(this.lane+this.lateralVelocity*dt,-12.2,12.2);
   if(Math.abs(this.lane)>=12.18){this.lateralVelocity=0;this.speed=Math.max(0,this.speed-16*dt);}
   this.currentProgress+=this.speed/TRACK_LENGTH*dt;
   const lap=Math.max(0,Math.floor(Math.max(0,this.currentProgress)));
   if(this.currentProgress>=3){this.finished=true;const end=Math.round(this.elapsed*1000);const last=end-this.lapStart;if(last>0)this.bestLap=this.bestLap===0?last:Math.min(this.bestLap,last);this.options.onFinish(end,this.bestLap||end);}
   else if(lap>this.lastLapNumber){const now=Math.round(this.elapsed*1000);if(this.lastLapNumber>=0){const ms=now-this.lapStart;this.bestLap=this.bestLap===0?ms:Math.min(this.bestLap,ms);}this.lapStart=now;this.lastLapNumber=lap;}
   for(let i=0;i<PICKUP_POS.length;i++)for(let j=0;j<PICKUP_LANES.length;j++){
    const p=PICKUP_POS[i],lane=PICKUP_LANES[j],key=`${Math.floor(this.currentProgress)}:${i}:${j}`;
    const delta=wrap(this.currentProgress)-p;
    if(Math.abs(delta)<.009&&Math.abs(this.lane-lane)<2.2&&!this.collected.has(key)){
     this.collected.add(key);if(!this.power){this.power=powerAt(i,j);this.options.onEffect?.('pickup');}
    }
   }
   if(this.inputPower&&this.power){const pow=this.power;this.power=null;
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
  if(ts-this.lastHud>125){this.lastHud=ts;const others=this.options.bots?this.bots:[...this.remote.values()];const rank=1+others.filter(p=>p.progress>this.currentProgress).length;
   const rivals=[{id:this.options.id,name:this.options.name,color:this.options.color,progress:this.currentProgress},...others.map(b=>({id:b.id,name:b.name,color:b.color,progress:b.progress}))].sort((a,b)=>b.progress-a.progress);
   this.options.onHud({speed:Math.round(this.speed*6.8),lap:Math.min(3,Math.max(1,Math.floor(Math.max(0,this.currentProgress))+1)),totalLaps:3,remaining:Math.max(0,3-this.currentProgress),power:this.power,rank,total:others.length+1,elapsed:Math.max(0,this.elapsed),started,countdown,shield:ts/1000<this.shieldUntil,turbo:ts/1000<this.turboUntil,fps:this.fps,bestLapMs:this.bestLap,offroad:Math.abs(this.lane)>10.4,progress:this.currentProgress,throttle:this.keys.throttle,contact:ts/1000<this.contactUntil,rivals});
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
  if(this.options.bots){for(let i=0;i<this.bots.length;i++){const bot=this.bots[i];car(dyn,bot.progress,bot.lane,bot.color,time<this.botShieldUntil[i],time<this.botTurboUntil[i],0,this.graphics,time);}}else for(const remote of this.remote.values())car(dyn,remote.progress,remote.lane,remote.color,false,false,0,this.graphics,time);
  car(dyn,this.currentProgress,this.lane,this.options.color,time<this.shieldUntil,boost,this.lateralVelocity*.005,this.graphics,time);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(dyn),gl.DYNAMIC_DRAW);drawBuffer(this.dynamicBuffer,dyn.length/STRIDE);
 }
}
