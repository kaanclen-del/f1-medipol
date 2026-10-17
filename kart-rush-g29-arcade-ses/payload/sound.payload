/* Kart Rush Graphics 2.9 - Smooth Arcade Race Engine.
 * No external recordings, no looped sample seams, no abrupt gear frequency jumps.
 * A gentle, always-on synthesized motor with continuous throttle response.
 * Existing start-light beeps and all race effect sounds are unchanged.
 */
export type SoundEffect = 'pickup'|'boost'|'shield'|'emp'|'collision'|'horn'|'repair'|'pulse'|'magnet'|'finish'|'rival-turbo'|'rival-shield'|'overtake'|'position-lost';
export class KartRushSound {
 private ctx:AudioContext|null=null;
 private engine:OscillatorNode|null=null;
 private bass:OscillatorNode|null=null;
 private exhaust:OscillatorNode|null=null;
 private exhaustGain:GainNode|null=null;
 private tone:BiquadFilterNode|null=null;
 private mainGain:GainNode|null=null;
 private volume:number;
 private lastEffect=0;
 private lastRivalEffect=-1000;
 private lastUpdateTime=0;
 private throttleHeld=0;
 private startLightCount=0;
 private startGoPlayed=false;
 constructor(volume=.45){this.volume=Math.max(0,Math.min(1,volume));}
 setVolume(volume:number){this.volume=Math.max(0,Math.min(1,volume));}
 activate(){
  if(typeof window==='undefined')return;
  if(this.ctx){if(this.ctx.state==='suspended')void this.ctx.resume().catch(()=>{});return;}
  const AudioCtor=window.AudioContext||(window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!AudioCtor)return;
  let ctx:AudioContext|null=null;
  try{
   ctx=new AudioCtor();
   this.ctx=ctx;
   // A band-limited musical harmonic spectrum; unlike repeated engine recordings,
   // this continuously running oscillator has no periodic glitch or crossfade seam.
   const real=new Float32Array(12);
   const imaginary=new Float32Array([0, .92,.34,.17,.105,.068,.044,.032,.023,.016,.012,.008]);
   const warmWave=ctx.createPeriodicWave(real,imaginary,{disableNormalization:false});
   const engine=ctx.createOscillator();engine.setPeriodicWave(warmWave);
   const bass=ctx.createOscillator();bass.type='sine';
   const exhaust=ctx.createOscillator();exhaust.type='triangle';
   engine.frequency.value=100;bass.frequency.value=50;exhaust.frequency.value=200;
   const coreGain=ctx.createGain();coreGain.gain.value=.65;
   const bassGain=ctx.createGain();bassGain.gain.value=.11;
   const exhaustGain=ctx.createGain();exhaustGain.gain.value=.025;
   const mix=ctx.createGain();mix.gain.value=.80;
   engine.connect(coreGain);bass.connect(bassGain);exhaust.connect(exhaustGain);
   coreGain.connect(mix);bassGain.connect(mix);exhaustGain.connect(mix);
   const tone=ctx.createBiquadFilter();tone.type='lowpass';tone.frequency.value=1350;tone.Q.value=.40;
   const removeRumble=ctx.createBiquadFilter();removeRumble.type='highpass';removeRumble.frequency.value=52;removeRumble.Q.value=.70;
   const master=ctx.createGain();master.gain.value=0;
   const compressor=ctx.createDynamicsCompressor();
   compressor.threshold.value=-14;compressor.knee.value=20;compressor.ratio.value=2.5;
   compressor.attack.value=.012;compressor.release.value=.24;
   mix.connect(tone);tone.connect(removeRumble);removeRumble.connect(master);
   master.connect(compressor);compressor.connect(ctx.destination);
   // No delay/echo: short repeats used to make the motor sound metallic or broken.
   engine.start();bass.start();exhaust.start();
   this.engine=engine;this.bass=bass;this.exhaust=exhaust;
   this.exhaustGain=exhaustGain;this.tone=tone;this.mainGain=master;
  }catch{
   if(ctx)void ctx.close().catch(()=>{});
   this.ctx=null;this.engine=null;this.bass=null;this.exhaust=null;
   this.exhaustGain=null;this.tone=null;this.mainGain=null;
  }
 }
 update(speed:number,throttle:boolean,paused:boolean){
  const ctx=this.ctx,main=this.mainGain,tone=this.tone;
  if(!ctx||!main||!tone)return;
  const t=ctx.currentTime;
  const dt=this.lastUpdateTime>0?Math.max(0,Math.min(.16,t-this.lastUpdateTime)):0;
  this.lastUpdateTime=t;
  // Throttle-hold adds subtle warmth, NOT a pitch jump at the fifth second.
  this.throttleHeld=paused?0:Math.max(0,Math.min(5,this.throttleHeld+(throttle?dt:-dt*2)));
  const hold=this.throttleHeld/5;
  const road=Math.max(0,Math.min(1,(Number.isFinite(speed)?speed:0)/260));
  const pedal=throttle?1:0;
  const load=Math.max(0,Math.min(1,.43*road+.46*pedal+.11*hold));
  // Single coherent pitch curve, no simulated hard gear shifts or fixed 3-second loop.
  const fundamental=98+132*load;
  this.engine?.frequency.setTargetAtTime(fundamental,t,.22);
  this.bass?.frequency.setTargetAtTime(fundamental*.50,t,.25);
  this.exhaust?.frequency.setTargetAtTime(fundamental*2,t,.22);
  tone.frequency.setTargetAtTime(1230+500*road+340*pedal+220*hold,t,.32);
  this.exhaustGain?.gain.setTargetAtTime(.025+.038*pedal+.012*hold,t,.28);
  // Audible idle; conservative overall loudness to avoid fatigue on long races.
  const targetLevel=paused?0:this.volume*(.24+.055*road+.055*pedal+.020*hold);
  main.gain.setTargetAtTime(targetLevel,t,paused?.045:.24);
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
  try{this.engine?.stop();}catch{}
  try{this.bass?.stop();}catch{}
  try{this.exhaust?.stop();}catch{}
  try{this.engine?.disconnect();this.bass?.disconnect();this.exhaust?.disconnect();}catch{}
  this.engine=null;this.bass=null;this.exhaust=null;
  this.exhaustGain=null;this.tone=null;this.mainGain=null;
  if(ctx)void ctx.close().catch(()=>{});
 }
}
