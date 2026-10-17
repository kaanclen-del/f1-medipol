/* F1 Medipol Kart Rush | Grandstand ambience + nearby camera shutter cues.
 * G2.8: louder triple shutter burst, responsive to nearby cameras; gesture-gated WebAudio.
 */
const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
export class KartRushVenueAudio{
 private ctx:AudioContext|null=null;
 private master:GainNode|null=null;
 private crowd:AudioBufferSourceNode|null=null;
 private crowdGain:GainNode|null=null;
 private noise:AudioBuffer|null=null;
 private lastShutter=-100;
 private lastCamera=-1;
 private lastSpeed=0;
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
   const master=ctx.createGain();master.gain.value=this.volume*.95;master.connect(ctx.destination);this.master=master;
   const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*1.25),ctx.sampleRate);
   const data=buffer.getChannelData(0);
   // Procedural grandstand murmur: noise softened through a low-pass filter.
   for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
   this.noise=buffer;
   const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;
   const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=520;filter.Q.value=.32;
   const gain=ctx.createGain();gain.gain.value=0;
   source.connect(filter);filter.connect(gain);gain.connect(master);source.start();
   this.crowd=source;this.crowdGain=gain;
  }catch{this.dispose();}
 }
 setVolume(v:number){this.volume=clamp(v,0,1);if(this.ctx&&this.master)this.master.gain.setTargetAtTime(this.volume*.95,this.ctx.currentTime,.08);}
 update(progress:number,speed:number,started:boolean,muted:boolean){
  if(!this.ctx||!this.master||this.ended)return;
  const t=this.ctx.currentTime;
  const enabled=started&&!muted&&speed>15;
  const level=enabled?.022*(.65+.35*Math.min(1,speed/200)):0;
  this.crowdGain?.gain.setTargetAtTime(level,t,.28);
  if(!enabled||speed<22||this.volume<=.01||t-this.lastShutter<.42)return;
  let camera=-1,nearest=.0065;
  const normalized=((progress%1)+1)%1;
  for(let i=0;i<72;i++){
   const p=(i+.4)/72;
   const d=Math.abs((((normalized-p+.5)%1)+1)%1-.5);
   if(d<nearest){nearest=d;camera=i;}
  }
  if(camera===-1||camera===this.lastCamera)return;
  this.lastCamera=camera;this.lastShutter=t;
  // Soft double mechanical camera shutter, filtered and intentionally quiet under race engines.
  this.shutter(t,1.0);
  this.shutter(t+.130,.80);
  this.shutter(t+.265,.55);
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
  const ctx=this.ctx;this.ctx=null;this.master=null;this.crowd=null;this.crowdGain=null;this.noise=null;
  if(ctx)void ctx.close().catch(()=>{});
 }
}
