/* Procedural WebAudio — generated at runtime, no external samples or copyrighted music.
 * Audio stays silent until a keyboard/pointer gesture explicitly activates it.
 */
export type SoundEffect = 'pickup'|'boost'|'shield'|'emp'|'collision'|'horn'|'repair'|'pulse'|'magnet'|'finish'|'rival-turbo'|'rival-shield'|'overtake'|'position-lost';
export class KartRushSound {
 private ctx:AudioContext|null=null;
 private engine:OscillatorNode|null=null;
 private harmonic:OscillatorNode|null=null;
 private rasp:OscillatorNode|null=null;
 private sub:OscillatorNode|null=null;
 private mainGain:GainNode|null=null;
 private filter:BiquadFilterNode|null=null;
 private presence:BiquadFilterNode|null=null;
 private volume:number;
 private lastEffect=0;
 private lastRivalEffect=-1000;
 constructor(volume=0.45){this.volume=Math.max(0,Math.min(1,volume));}
 setVolume(volume:number){
  this.volume=Math.max(0,Math.min(1,volume));
  if(this.mainGain&&this.ctx)this.mainGain.gain.setTargetAtTime(this.volume*.055,this.ctx.currentTime,.06);
 }
 activate(){
  if(typeof window==='undefined')return;
  if(this.ctx){if(this.ctx.state==='suspended')void this.ctx.resume().catch(()=>{});return;}
  const Ctor=window.AudioContext||(window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!Ctor)return;
  try{
   const ctx=new Ctor();this.ctx=ctx;
   // Four interlocking firing layers emulate the uneven rasp and low-frequency pulse
   // of a classic high-revving V8 racer; this is synthesis, not a recorded F1 engine.
   const low=ctx.createOscillator(),high=ctx.createOscillator();
   const rasp=ctx.createOscillator(),sub=ctx.createOscillator();
   low.type='sawtooth';high.type='sawtooth';rasp.type='square';sub.type='triangle';
   low.frequency.value=55;high.frequency.value=170;rasp.frequency.value=330;sub.frequency.value=29;
   const lowGain=ctx.createGain(),highGain=ctx.createGain(),raspGain=ctx.createGain(),subGain=ctx.createGain();
   lowGain.gain.value=.36;highGain.gain.value=.20;raspGain.gain.value=.045;subGain.gain.value=.27;
   low.connect(lowGain);high.connect(highGain);rasp.connect(raspGain);sub.connect(subGain);
   const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=980;filter.Q.value=.70;
   const presence=ctx.createBiquadFilter();presence.type='peaking';presence.frequency.value=870;presence.Q.value=.90;presence.gain.value=3.2;
   for(const n of [lowGain,highGain,raspGain,subGain])n.connect(filter);
   filter.connect(presence);
   const drive=ctx.createWaveShaper();
   const curve=new Float32Array(1024);
   for(let i=0;i<curve.length;i++){
    const x=(i/(curve.length-1))*2-1;
    curve[i]=Math.tanh(x*1.9)/Math.tanh(1.9);
   }
   drive.curve=curve as Float32Array<ArrayBuffer>;
   drive.oversample='2x';
   presence.connect(drive);
   const mainGain=ctx.createGain();mainGain.gain.value=0;
   drive.connect(mainGain);
   const limiter=ctx.createDynamicsCompressor();
   limiter.threshold.value=-16;limiter.knee.value=16;limiter.ratio.value=4.2;limiter.attack.value=.005;limiter.release.value=.15;
   mainGain.connect(limiter);
   // Stadium reflection: quiet first reflection plus subtle repeating tail.
   const delay=ctx.createDelay(.5);delay.delayTime.value=.15;
   const wet=ctx.createGain();wet.gain.value=.13;
   const feedback=ctx.createGain();feedback.gain.value=.16;
   mainGain.connect(delay);delay.connect(wet);wet.connect(limiter);wet.connect(feedback);feedback.connect(delay);
   limiter.connect(ctx.destination);
   low.start();high.start();rasp.start();sub.start();
   this.engine=low;this.harmonic=high;this.rasp=rasp;this.sub=sub;
   this.mainGain=mainGain;this.filter=filter;this.presence=presence;
  }catch{
   const ctx=this.ctx;this.ctx=null;
   if(ctx)void ctx.close().catch(()=>{});
  }
 }
 update(speed:number,throttle:boolean,paused:boolean){
  if(!this.ctx||!this.mainGain||!this.engine||!this.harmonic||!this.rasp||!this.sub||!this.filter||!this.presence)return;
  const t=this.ctx.currentTime;
  const kph=Math.max(0,Math.min(370,speed));
  // A lightweight virtual gearbox creates distinct rev rises and falls across 8 gears.
  const steps=[0,35,67,102,141,185,233,286,370];
  let gear=0;
  for(let i=1;i<steps.length-1;i++)if(kph>=steps[i])gear=i;
  const from=steps[gear],to=steps[gear+1];
  const phase=Math.max(0,Math.min(1,(kph-from)/Math.max(1,to-from)));
  const rpm=paused?900:1900+phase*6300+(throttle?420:0);
  const run=Math.max(.0,Math.min(1,rpm/8700));
  const load=throttle?1:0;
  // Growl, upper bank firing and crisp exhaust rasp track the virtual crankshaft.
  const base=35+rpm/99;
  this.engine.frequency.setTargetAtTime(base,t,.060);
  this.harmonic.frequency.setTargetAtTime(base*2.9,t,.045);
  this.rasp.frequency.setTargetAtTime(base*5.3,t,.045);
  this.sub.frequency.setTargetAtTime(base*.54,t,.080);
  this.filter.frequency.setTargetAtTime(680+run*2650+load*430,t,.07);
  this.presence.frequency.setTargetAtTime(640+run*660,t,.085);
  this.mainGain.gain.setTargetAtTime(paused?0:this.volume*(.055+run*.13+load*.03),t,.09);
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
 dispose(){try{this.engine?.stop();this.harmonic?.stop();this.rasp?.stop();this.sub?.stop();void this.ctx?.close();}catch{}this.engine=null;this.harmonic=null;this.rasp=null;this.sub=null;this.ctx=null;}
}
