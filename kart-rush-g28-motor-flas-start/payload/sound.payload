/* Kart Rush G2.8 — authentic, licensed 2010 F1 V8 recording when available.
 * Source: Edvvc / Ed Pond, Williams-Cosworth FW32 (2010), CC BY-SA 3.0.
 * https://commons.wikimedia.org/wiki/File:Williams-Cosworth_FW32_(2010).ogg
 * Audio is excerpted, crossfaded and pitch-adjusted. See public/kart-rush/audio/ATTRIBUTION.txt.
 * If the sample is unavailable, a mellow procedurally generated engine is used.
 * Sound is enabled only after a real user gesture; browser volume and pause respected.
 */
export type SoundEffect = 'pickup'|'boost'|'shield'|'emp'|'collision'|'horn'|'repair'|'pulse'|'magnet'|'finish'|'rival-turbo'|'rival-shield'|'overtake'|'position-lost';
export class KartRushSound {
 private ctx:AudioContext|null=null;
 private synth:AudioBufferSourceNode|null=null;
 private recording:AudioBufferSourceNode|null=null;
 private synthGain:GainNode|null=null;
 private recordingGain:GainNode|null=null;
 private mainGain:GainNode|null=null;
 private tone:BiquadFilterNode|null=null;
 private volume:number;
 private lastEffect=0;
 private lastRivalEffect=-1000;
 private lastUpdateTime=0;
 private throttleHeld=0;
 private startLightCount=0;
 private startGoPlayed=false;
 constructor(volume=.45){this.volume=Math.max(0,Math.min(1,volume));}
 setVolume(volume:number){
  this.volume=Math.max(0,Math.min(1,volume));
  // Do not restore volume when paused; update() remains authoritative.
 }
 private syntheticV8(ctx:AudioContext):AudioBuffer{
  // Construct a periodic, harmonically coherent exhaust pulse texture once, not five screaming oscillators.
  const sr=ctx.sampleRate,seconds=.8,count=Math.round(sr*seconds);
  const buffer=ctx.createBuffer(1,count,sr),a=buffer.getChannelData(0);
  let seed=35791,smoothed=0;
  const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return(seed/4294967296)*2-1;};
  for(let i=0;i<count;i++){
   const t=i/sr,phase=2*Math.PI*240*t;
   const pulse=Math.max(0,Math.sin(phase));
   smoothed=.86*smoothed+.14*rnd();
   const low=.43*Math.sin(phase)+.23*Math.sin(phase*2+.25)+.11*Math.sin(phase*3+.33);
   const air=(.13*pulse+.06)*smoothed;
   const x=(low+air)*.60;
   a[i]=Math.tanh(x*1.08)*.82;
  }
  return buffer;
 }
 private makeLoop(ctx:AudioContext,input:AudioBuffer):AudioBuffer{
  const sr=input.sampleRate,total=input.length;
  const windowSamples=Math.min(total,Math.floor(sr*2.9));
  const crossfade=Math.max(128,Math.min(Math.floor(sr*.16),Math.floor(windowSamples*.08)));
  if(windowSamples<sr*.5)throw Error('Recording too short');
  const testChannel=input.getChannelData(0);
  let bestStart=0,bestScore=0;
  const step=Math.max(1,Math.floor(sr*.30));
  for(let start=0;start+windowSamples<=total;start+=step){
   let sum=0,peak=0;
   for(let i=start;i<start+windowSamples;i+=100){
    const x=testChannel[i];sum+=x*x;peak=Math.max(peak,Math.abs(x));
   }
   // Select a sustained loud engine pass; avoid clipped spikes or silent intros.
   const energy=sum/(windowSamples/100);
   const score=energy*(peak>.995?.7:1);
   if(score>bestScore){bestScore=score;bestStart=start;}
  }
  if(bestScore<.000004)throw Error('Recording is too quiet');
  const loopLength=windowSamples-crossfade;
  const out=ctx.createBuffer(Math.min(input.numberOfChannels,2),loopLength,sr);
  let power=0,peak=0;
  for(let ch=0;ch<out.numberOfChannels;ch++){
   const source=input.getChannelData(ch),dest=out.getChannelData(ch);
   for(let i=0;i<loopLength;i++){
    if(i<crossfade){
     const a=i/crossfade;
     // End of recording overlaps the opening; buffer seam is sample-continuous.
     const tail=source[bestStart+loopLength+i];
     const head=source[bestStart+i];
     dest[i]=tail*(1-a)+head*a;
    }else dest[i]=source[bestStart+i];
    if(i%41===0){power+=dest[i]*dest[i];peak=Math.max(peak,Math.abs(dest[i]));}
   }
  }
  const rms=Math.sqrt(power/Math.max(1,(loopLength/41)*out.numberOfChannels));
  const scale=Math.min(2.2,.27/Math.max(.04,rms),.92/Math.max(.1,peak));
  for(let ch=0;ch<out.numberOfChannels;ch++){
   const data=out.getChannelData(ch);
   for(let i=0;i<data.length;i++)data[i]*=scale;
  }
  return out;
 }
 private async useLicensedRecording(ctx:AudioContext){
  // Prefer the Vercel-hosted copy installed by INSTALL.cjs. Fall back to Wikimedia's original.
  const sources=[
   '/kart-rush/audio/f1-v8-fw32-2010.ogg',
   'https://upload.wikimedia.org/wikipedia/commons/f/f5/Williams-Cosworth_FW32_%282010%29.ogg'
  ];
  for(const url of sources){
   if(ctx!==this.ctx)return;
   try{
    const response=await fetch(url,{mode:'cors',cache:'force-cache'});
    if(!response.ok)continue;
    const raw=await response.arrayBuffer();
    if(raw.byteLength<10000||raw.byteLength>18000000)continue;
    const decoded=await ctx.decodeAudioData(raw.slice(0));
    if(ctx!==this.ctx)return;
    const loop=this.makeLoop(ctx,decoded);
    const sample=ctx.createBufferSource();sample.buffer=loop;sample.loop=true;
    const gain=ctx.createGain();gain.gain.value=0;
    sample.connect(gain);gain.connect(this.tone!);
    sample.start();this.recording=sample;this.recordingGain=gain;
    const now=ctx.currentTime;
    gain.gain.setTargetAtTime(.88,now,.32);
    // Preserve a coherent harmonic exhaust component, but do not overdrive the recording.
    this.synthGain?.gain.setTargetAtTime(.13,now,.3);
    return;
   }catch{
    // Offline/CORS/audio decoding: stay on the softer built-in fallback.
   }
  }
 }
 activate(){
  if(typeof window==='undefined')return;
  if(this.ctx){if(this.ctx.state==='suspended')void this.ctx.resume().catch(()=>{});return;}
  const Ctor=window.AudioContext||(window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!Ctor)return;
  try{
   const ctx=new Ctor();this.ctx=ctx;
   const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=86;hp.Q.value=.65;
   const tone=ctx.createBiquadFilter();tone.type='lowpass';tone.frequency.value=2800;tone.Q.value=.56;
   const master=ctx.createGain();master.gain.value=0;
   const limiter=ctx.createDynamicsCompressor();
   limiter.threshold.value=-17;limiter.knee.value=22;limiter.ratio.value=2.8;
   limiter.attack.value=.012;limiter.release.value=.26;
   tone.connect(hp);hp.connect(master);master.connect(limiter);limiter.connect(ctx.destination);
   const echo=ctx.createDelay(.25);echo.delayTime.value=.105;
   const echoGain=ctx.createGain();echoGain.gain.value=.045;
   master.connect(echo);echo.connect(echoGain);echoGain.connect(limiter);
   const synth=ctx.createBufferSource();synth.buffer=this.syntheticV8(ctx);synth.loop=true;
   const fallbackGain=ctx.createGain();fallbackGain.gain.value=.70;
   synth.connect(fallbackGain);fallbackGain.connect(tone);synth.start();
   this.synth=synth;this.synthGain=fallbackGain;this.mainGain=master;this.tone=tone;
   void this.useLicensedRecording(ctx);
  }catch{
   const ctx=this.ctx;this.ctx=null;
   if(ctx)void ctx.close().catch(()=>{});
  }
 }
 update(speed:number,throttle:boolean,paused:boolean){
  const ctx=this.ctx,main=this.mainGain,tone=this.tone;
  if(!ctx||!main||!tone)return;
  const t=ctx.currentTime;
  const dt=this.lastUpdateTime>0?Math.max(0,Math.min(.20,t-this.lastUpdateTime)):0;
  this.lastUpdateTime=t;
  if(paused||!throttle)this.throttleHeld=0;
  else this.throttleHeld=Math.min(5,this.throttleHeld+dt);
  // An uninterrupted five-second throttle hold opens up the engine, irrespective of the
  // kart's current road speed (hairpins should not sound like idle on full throttle).
  const pedal=Math.max(0,Math.min(1,this.throttleHeld/5));
  const pull=pedal*pedal*(3-2*pedal);
  const road=Math.max(0,Math.min(1,speed/235));
  const throttleBase=throttle?.16:0;
  const sampleRate=.93+.22*road+.65*throttleBase+.53*pull;
  // A smoother high-rev rise without the harsh square-wave buzz of G2.6.
  this.recording?.playbackRate.setTargetAtTime(sampleRate,t,.24);
  this.synth?.playbackRate.setTargetAtTime(.88+.22*road+.16*(throttle?1:0)+.52*pull,t,.22);
  tone.frequency.setTargetAtTime(2250+650*road+250*(throttle?1:0)+850*pull,t,.23);
  if(this.synthGain){
   const fallbackLevel=this.recording?.buffer?.length?(.10+.13*pull):(.52+.16*pull);
   this.synthGain.gain.setTargetAtTime(fallbackLevel,t,.18);
  }
  const level=paused?0:this.volume*(.46+.09*road+.10*(throttle?1:0)+.13*pull);
  main.gain.setTargetAtTime(level,t,paused?.05:.20);
 }
 // Five separate light beeps and a distinct lights-out launch cue. All event changes are
 // derived from the actual HUD countdown, not from independent audio timers.
 startSignal(lights:number,started:boolean,muted:boolean){
  const ctx=this.ctx;
  if(!ctx||muted||this.volume<=0)return;
  const count=Math.max(0,Math.min(5,Math.floor(lights)));
  if(started){
   if(!this.startGoPlayed&&this.startLightCount>0){
    this.startGoPlayed=true;
    this.note(480,850,0,.34,.14,'triangle');
    this.note(660,1050,.045,.29,.095,'sine');
   }
   this.startLightCount=5;
   return;
  }
  if(count>this.startLightCount){
   if(count-this.startLightCount>1)this.startLightCount=count-1;
   for(let i=this.startLightCount;i<count;i++){
    this.note(540,460,(i-this.startLightCount)*.12,.22,.155,'triangle');
    this.note(340,290,(i-this.startLightCount)*.12,.11,.048,'sine');
   }
   this.startLightCount=count;
  }
 }
 // KR-V19.1: add distinct, lightweight WebAudio cues. Uses the existing AudioContext.
 private note(from:number,to:number,delay:number,duration:number,level:number,wave:OscillatorType='sine'){
  const ctx=this.ctx;if(!ctx)return;
  const time=ctx.currentTime+delay;
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=wave;
  osc.frequency.setValueAtTime(Math.max(25,from),time);
  osc.frequency.exponentialRampToValueAtTime(Math.max(25,to),time+duration);
  gain.gain.setValueAtTime(.0001,time);
  gain.gain.exponentialRampToValueAtTime(Math.max(.001,level*this.volume),time+Math.min(.03,duration*.3));
  gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  osc.connect(gain);gain.connect(ctx.destination);
  osc.start(time);osc.stop(time+duration+.025);
  osc.onended=()=>{try{osc.disconnect();gain.disconnect();}catch{}};
 }
 private noiseSweep(duration:number,from:number,to:number,level:number){
  const ctx=this.ctx;if(!ctx)return;
  const buffer=ctx.createBuffer(1,Math.max(1,Math.floor(ctx.sampleRate*duration)),ctx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  source.buffer=buffer;filter.type='bandpass';filter.Q.value=.7;
  const now=ctx.currentTime;
  filter.frequency.setValueAtTime(Math.max(50,from),now);
  filter.frequency.exponentialRampToValueAtTime(Math.max(50,to),now+duration);
  gain.gain.setValueAtTime(.0001,now);
  gain.gain.linearRampToValueAtTime(Math.max(.001,level*this.volume),now+.025);
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
  source.start(now);source.stop(now+duration+.01);
  source.onended=()=>{try{source.disconnect();filter.disconnect();gain.disconnect();}catch{}};
 }
 private richEffect(effect:SoundEffect){
  if(!this.ctx||this.volume<=0)return;
  switch(effect){
   case 'boost':this.noiseSweep(.48,350,2100,.12);this.note(165,680,0,.47,.12,'sawtooth');break;
   case 'shield':this.note(370,880,0,.52,.13);this.note(640,1180,.10,.38,.08,'triangle');break;
   case 'emp':this.noiseSweep(.38,2200,90,.16);this.note(560,58,0,.49,.12,'sawtooth');break;
   case 'pulse':this.noiseSweep(.4,170,1480,.13);this.note(100,510,0,.37,.11,'triangle');break;
   case 'repair':this.note(440,620,0,.15,.09);this.note(570,760,.14,.16,.09);this.note(680,940,.29,.22,.10);break;
   case 'magnet':this.note(210,700,0,.47,.12);this.note(460,260,.12,.34,.08,'triangle');break;
   case 'rival-turbo':this.noiseSweep(.26,650,1600,.045);break;
   case 'rival-shield':this.note(260,680,0,.3,.055);break;
   case 'finish':this.note(440,440,0,.2,.13);this.note(554,554,.19,.2,.13);this.note(659,659,.38,.21,.13);this.note(880,880,.58,.60,.16);break;
   case 'overtake':this.note(610,950,0,.18,.14,'triangle');this.note(840,1210,.10,.17,.10);break;
   case 'position-lost':this.note(590,320,0,.20,.09,'triangle');break;
  }
 }
 effect(effect:SoundEffect){
  if(!this.ctx||this.volume<=0)return;
  const ctx=this.ctx,t=ctx.currentTime;
  if(effect==='rival-turbo'||effect==='rival-shield'){
   if(t-this.lastRivalEffect<.75)return;
   this.lastRivalEffect=t;this.richEffect(effect);return;
  }
  if(effect==='finish'){this.richEffect(effect);return;}
  if(t-this.lastEffect<.065)return;this.lastEffect=t;
  this.richEffect(effect);
  const oscillator=ctx.createOscillator(),gain=ctx.createGain();
  oscillator.type=effect==='collision'?'square':effect==='horn'?'sawtooth':effect==='emp'?'sawtooth':'triangle';
  const start=effect==='pickup'?510:effect==='boost'?240:effect==='shield'?470:effect==='emp'?170:effect==='horn'?310:effect==='repair'?670:effect==='pulse'?190:95;
  const end=effect==='pickup'?1040:effect==='boost'?710:effect==='shield'?670:effect==='emp'?65:effect==='horn'?360:effect==='repair'?980:effect==='pulse'?85:45;
  const duration=effect==='collision'?.21:effect==='horn'?.40:effect==='emp'?.45:.30;
  oscillator.frequency.setValueAtTime(start,t);oscillator.frequency.exponentialRampToValueAtTime(end,t+duration);
  gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(Math.max(.001,this.volume*.085),t+.016);
  gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(t);oscillator.stop(t+duration+.02);
 }
 dispose(){
  const ctx=this.ctx;this.ctx=null;this.lastUpdateTime=0;this.throttleHeld=0;
  try{this.synth?.stop();this.recording?.stop();}catch{}
  try{this.synth?.disconnect();this.recording?.disconnect();this.synthGain?.disconnect();this.recordingGain?.disconnect();}catch{}
  this.synth=null;this.recording=null;this.synthGain=null;this.recordingGain=null;this.mainGain=null;this.tone=null;
  if(ctx)void ctx.close().catch(()=>{});
 }
}
