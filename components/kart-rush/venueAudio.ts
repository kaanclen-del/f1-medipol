/* F1 SOCIAL Kart Rush â€” venue audio (G3.9.3)
 * Local grandstand murmur, approach-sensitive cheers & clapping, and existing camera bursts.
 * Browser WebAudio only. No external sound download or new SQL required.
 */
const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
const CHEER_SECTORS=[.035,.105,.185,.265,.345,.425,.505,.585,.675,.765,.855,.945];
export class KartRushVenueAudio{
 private ctx:AudioContext|null=null;
 private master:GainNode|null=null;
 private crowd:AudioBufferSourceNode|null=null;
 private crowdGain:GainNode|null=null;
 private cheerGain:GainNode|null=null;
 private noise:AudioBuffer|null=null;
 private lastShutter=-100;
 private lastCamera=-1;
 private lastCheer=-100;
 private lastCheerSector=-1;
 private volume:number;
 private ended=false;
 constructor(volume=.45){this.volume=clamp(volume,0,1);}
 activate(){
  if(this.ended||typeof window==='undefined')return;
  if(this.ctx){if(this.ctx.state==='suspended')void this.ctx.resume().catch(()=>{});return;}
  try{
   const Factory=window.AudioContext||(window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
   if(!Factory)return;
   const ctx=new Factory();this.ctx=ctx;
   const master=ctx.createGain();master.gain.value=this.volume*1.15;master.connect(ctx.destination);this.master=master;
   const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*1.4),ctx.sampleRate);
   const data=buffer.getChannelData(0);
   for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
   this.noise=buffer;
   const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;
   const murmur=ctx.createBiquadFilter();murmur.type='bandpass';murmur.frequency.value=480;murmur.Q.value=.35;
   const bed=ctx.createGain();bed.gain.value=0;
   source.connect(murmur);murmur.connect(bed);bed.connect(master);this.crowdGain=bed;
   // Higher, diffuse crowd layer swells only near the spectator sectors.
   const chatter=ctx.createBiquadFilter();chatter.type='bandpass';chatter.frequency.value=1020;chatter.Q.value=.44;
   const swell=ctx.createGain();swell.gain.value=0;
   source.connect(chatter);chatter.connect(swell);swell.connect(master);this.cheerGain=swell;
   source.start();this.crowd=source;
  }catch{this.dispose();}
 }
 setVolume(v:number){this.volume=clamp(v,0,1);if(this.ctx&&this.master)this.master.gain.setTargetAtTime(this.volume*1.15,this.ctx.currentTime,.08);}
 update(progress:number,speed:number,started:boolean,muted:boolean){
  if(!this.ctx||!this.master||this.ended)return;
  const t=this.ctx.currentTime;
  const enabled=started&&!muted&&speed>12&&this.volume>.01;
  const normalized=((progress%1)+1)%1;
  let nearest=1,sector=-1,signed=0;
  for(let i=0;i<CHEER_SECTORS.length;i++){
   const delta=((((normalized-CHEER_SECTORS[i]+.5)%1)+1)%1)-.5;
   if(Math.abs(delta)<nearest){nearest=Math.abs(delta);sector=i;signed=delta;}
  }
  const approach=clamp(1-nearest/.020,0,1);
  const speedScale=clamp((speed-12)/40,.10,1);
  this.crowdGain?.gain.setTargetAtTime(enabled?(.03+.038*approach)*speedScale:0,t,.30);
  this.cheerGain?.gain.setTargetAtTime(enabled?.13*approach*speedScale:0,t,.20);
  // Grandstands react as the local car arrives. Trigger only once per approach,
  // not on every frame, and avoid continuous audio even on short laps.
  if(enabled&&speed>23&&sector!==-1&&nearest<.0068&&t-this.lastCheer>5.0&&
    (this.lastCheerSector!==sector||t-this.lastCheer>16)){
   this.lastCheer=t;this.lastCheerSector=sector;
   this.applause(t+.05,clamp(speed/55,.6,1.05));
  }
  if(!enabled||speed<22||t-this.lastShutter<.42)return;
  let camera=-1,nearestCamera=.0065;
  for(let i=0;i<72;i++){
   const p=(i+.4)/72;
   const d=Math.abs((((normalized-p+.5)%1)+1)%1-.5);
   if(d<nearestCamera){nearestCamera=d;camera=i;}
  }
  if(camera===-1||camera===this.lastCamera)return;
  this.lastCamera=camera;this.lastShutter=t;
  this.shutter(t,1);
  this.shutter(t+.130,.8);
  this.shutter(t+.265,.55);
 }
 private applause(t:number,strength:number){
  const ctx=this.ctx,master=this.master,noise=this.noise;
  if(!ctx||!master||!noise)return;
  // Individual short clap transients with irregular spacing to avoid a looped
  // mechanical flutter; kept separate from the camera shutter sound.
  for(let i=0;i<22;i++){
   const when=t+i*.061+(Math.random()-.5)*.050;
   const source=ctx.createBufferSource();source.buffer=noise;
   const filter=ctx.createBiquadFilter();filter.type='bandpass';
   filter.frequency.value=750+Math.random()*1050;filter.Q.value=.6;
   const gain=ctx.createGain();
   const peak=clamp((.10+Math.random()*.085)*strength,.055,.20);
   gain.gain.setValueAtTime(.0001,when);
   gain.gain.linearRampToValueAtTime(peak,when+.005);
   gain.gain.exponentialRampToValueAtTime(.0001,when+.075+Math.random()*.052);
   source.connect(filter);filter.connect(gain);gain.connect(master);
   source.start(when,Math.random()*.7);source.stop(when+.19);
   source.onended=()=>{try{source.disconnect();filter.disconnect();gain.disconnect();}catch{}};
  }
 }
 private shutter(t:number,strength=1){
  const ctx=this.ctx,master=this.master,noise=this.noise;
  if(!ctx||!master||!noise)return;
  const source=ctx.createBufferSource();source.buffer=noise;
  const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=720;filter.Q.value=.45;
  const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,t);
  gain.gain.linearRampToValueAtTime(.34*strength,t+.010);
  gain.gain.exponentialRampToValueAtTime(.0001,t+.155);
  source.connect(filter);filter.connect(gain);gain.connect(master);
  source.start(t);source.stop(t+.175);
  source.onended=()=>{try{source.disconnect();filter.disconnect();gain.disconnect();}catch{}};
 }
 dispose(){
  if(this.ended)return;this.ended=true;
  try{this.crowd?.stop();this.crowd?.disconnect();}catch{}
  const ctx=this.ctx;this.ctx=null;this.master=null;this.crowd=null;this.crowdGain=null;this.cheerGain=null;this.noise=null;
  if(ctx)void ctx.close().catch(()=>{});
 }
}
