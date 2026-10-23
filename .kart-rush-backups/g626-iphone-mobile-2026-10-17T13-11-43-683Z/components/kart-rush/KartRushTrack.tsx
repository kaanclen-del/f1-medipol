"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { trackPosition } from './engine';
// Route length derived once from the existing track geometry (no guessed distance).
const TRACK_METERS = (() => {
  let length = 0;
  let previous = trackPosition(0);
  for (let i = 1; i <= 512; i++) {
    const next = trackPosition(i / 512);
    length += Math.hypot(next.x - previous.x, next.z - previous.z);
    previous = next;
  }
  return length;
})();
import type { KartDifficulty, KartGraphics, KartHud, KartPower, KartRushEngine, KartState, KartPace, KartWeather } from './engine';
import s from './kartRush.module.css';
import { KartRushSound } from './sound';
import { KartRushAmbientSound } from './raceAmbience';
import { KartRushVenueAudio } from './venueAudio';

type Racer={user_id:string;nickname:string;color:string;finish_ms:number|null;best_lap_ms:number|null;kr_points?:number;kr_last_award?:number};
type Props={
 supabase:SupabaseClient;roomId:string|null;userId:string;displayName:string;color:string;startAt:number;members:Racer[];
 onExit:()=>void;onReload:()=>void;onReset?:()=>void;onRetry?:()=>void;isHost?:boolean;difficulty?:KartDifficulty;laps?:number;pace?:KartPace;weather?:KartWeather;graphics?:KartGraphics;onGraphicsChange?:(g:KartGraphics)=>void;volume?:number;onVolumeChange?:(v:number)=>void;championshipEnabled?:boolean;pointsTarget?:number;roundNo?:number;roundScored?:boolean;championId?:string|null;onFinalize?:()=>void;onNextRound?:()=>void;
};
const LABEL:Record<KartPower,string>={turbo:'TURBO',shield:'KALKAN',emp:'EMP DARBESÄ°',repair:'ONARIM',pulse:'ÅOK DALGASI',magnet:'MIKNATIS'};
const POWER_ICON:Record<KartPower,string>={turbo:'âš¡',shield:'â¬¡',emp:'âœº',repair:'âœš',pulse:'â—‰',magnet:'âŠ•'};
type PadAction='throttle'|'brake'|'power'|'camera'|'lookBack'|'horn';
type PadProfile='auto'|'xbox'|'ps5'|'custom'|'off';
type PadBindings=Record<PadAction,number>;
const DEFAULT_PAD:PadBindings={throttle:7,brake:6,power:0,camera:3,lookBack:4,horn:2};
const PS5_PAD:PadBindings={throttle:7,brake:6,power:0,camera:3,lookBack:4,horn:2};
const PAD_ACTIONS:[PadAction,string][]=[['throttle','GAZ'],['brake','FREN'],['power','Ã–ZEL GÃœÃ‡'],['camera','KAMERA'],['lookBack','ARKAYA BAK'],['horn','KORNA']];
const POWER_COLORS:Record<KartPower,string>={turbo:'#ffbc4e',shield:'#52e4ff',emp:'#cc8fff',repair:'#6ed5a1',pulse:'#e78bff',magnet:'#e0cf8d'};
const gridHash=(text:string)=>{let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return n>>>0;};
function trackXY(progress:number){
 const {x,z}=trackPosition(progress);
 return {x:69+x*.059,y:49+z*.066};
}
const MAP_PATH=Array.from({length:141},(_,i)=>{const p=trackXY(i/140);return (i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2)}).join(' ');
function TrackMiniMap({hud,id}: {hud:KartHud;id:string}){
 return <div className={s.miniMap} aria-label="Pist haritasÄ±">
  <svg viewBox="0 0 138 98" role="img" aria-label="YarÄ±ÅŸÃ§Ä±larÄ±n pistteki konumu">
   <path d={MAP_PATH} stroke="rgba(2,9,19,.75)" strokeWidth="10" fill="none" strokeLinejoin="round" />
   <path d={MAP_PATH} stroke="#718598" strokeWidth="6.5" fill="none" strokeLinejoin="round" />
   <path d={MAP_PATH} stroke="rgba(224,240,248,.55)" strokeWidth="1.3" strokeDasharray="3 7" fill="none" />
   {(hud.rivals||[]).filter(r=>r.id!==id).map(r=>{const q=trackXY(r.progress);return <circle key={r.id} cx={q.x} cy={q.y} r="3.4" fill={r.color} stroke="#fff" strokeWidth="1.2"/>;})}
   {(()=>{const q=trackXY(hud.progress||0);return <circle cx={q.x} cy={q.y} r="5.4" fill="#ffed69" stroke="#fff" strokeWidth="1.6"/>;})()}
  </svg><small>PÄ°ST TAKÄ°BÄ°</small>
 </div>;
}
export default function KartRushTrack({supabase,roomId,userId,displayName,color,startAt,members,onExit,onReload,onReset,onRetry,isHost=false,difficulty='normal',laps=3,pace='standard',weather='clear',graphics='balanced',onGraphicsChange,volume=.45,onVolumeChange,championshipEnabled=false,pointsTarget=50,roundNo=1,roundScored=false,championId=null,onFinalize,onNextRound}:Props){
 const canvas=useRef<HTMLCanvasElement|null>(null),engine=useRef<KartRushEngine|null>(null);
 const raceRoot=useRef<HTMLElement|null>(null);
 // Render the active race outside the site's header/layout stacking contexts on touch devices.
 const [renderMode,setRenderMode]=useState<'pending'|'mobile'|'desktop'>('pending');
 useEffect(()=>{setRenderMode(window.matchMedia('(pointer:coarse)').matches?'mobile':'desktop');},[]);
 const channel=useRef<ReturnType<SupabaseClient['channel']>|null>(null);
 const friends=useRef<Map<string,KartState>>(new Map());
 const lastSent=useRef(0);
 const [hud,setHud]=useState<KartHud>({speed:0,lap:1,totalLaps:3,remaining:3,health:100,pit:false,pitProgress:0,magnet:false,lights:0,power:null,rank:1,total:6,elapsed:0,started:false,countdown:20,shield:false,turbo:false});
 const [error,setError]=useState(''),[ended,setEnded]=useState<number|null>(null);
 const [showResults,setShowResults]=useState(false);
 const previousRank=useRef<number|null>(null);
 const [showGraphics,setShowGraphics]=useState(false);
 const [mobileMenuOpen,setMobileMenuOpen]=useState(false);
 const lastMobileUiUpdate=useRef(0);
 const [powerRolling,setPowerRolling]=useState(false);
 const [powerRevealed,setPowerRevealed]=useState(false);
 const powerRevealTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [powerSpinIndex,setPowerSpinIndex]=useState(0);
 const powerSpinUntil=useRef<number>(0);
 const [showLeaderboard,setShowLeaderboard]=useState(false);
 const [cameraName,setCameraName]=useState('TAKÄ°P');
 const [gamepadProfile,setGamepadProfile]=useState<PadProfile>('auto');
 const [gamepadBindings,setGamepadBindings]=useState<PadBindings>({...DEFAULT_PAD});
 const [gamepadName,setGamepadName]=useState('');
 const padProfileRef=useRef<PadProfile>('auto'),padBindingsRef=useRef<PadBindings>({...DEFAULT_PAD});
 const padHeld=useRef({left:false,right:false,brake:false,throttle:false});
 const prevPadButtons=useRef({power:false,camera:false,lookBack:false,horn:false});
 useEffect(()=>{padProfileRef.current=gamepadProfile;padBindingsRef.current=gamepadBindings;},[gamepadProfile,gamepadBindings]);
 const [rearHeld,setRearHeld]=useState(false);
 const cycleCamera=useCallback(()=>{const label=engine.current?.cycleCamera();if(label)setCameraName(label);},[]);
 const setRearCamera=useCallback((value:boolean)=>{engine.current?.setLookBack(value);setRearHeld(value);},[]);
 const [paused,setPaused]=useState(false);
 const pausedRef=useRef(false);
 const sound=useRef<KartRushSound|null>(null);
 const ambience=useRef<KartRushAmbientSound|null>(null);
 const venueAudio=useRef<KartRushVenueAudio|null>(null);
 // Use the actual visual viewport; do not let the app header, browser safe-area
 // padding, or an ancestor transform clip the WebGL race on iPhone landscape.
 useEffect(()=>{
  if(renderMode!=='mobile')return;
  const root=document.documentElement,body=document.body;
  const originalRootOverflow=root.style.overflow;
  const originalBodyOverflow=body.style.overflow;
  const originalRootOverscroll=root.style.overscrollBehavior;
  const originalBodyOverscroll=body.style.overscrollBehavior;
  const meta=document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  const originalViewport=meta?.getAttribute('content')??null;
  if(meta&&originalViewport&&!/viewport-fit\s*=/.test(originalViewport))meta.setAttribute('content',originalViewport+', viewport-fit=cover');
  const media=window.matchMedia('(orientation:landscape)');
  const hidden=new Map<HTMLElement,{value:string;priority:string}>();
  const restoreHeaders=()=>{
   for(const [element,previous] of hidden){
    if(previous.value)element.style.setProperty('display',previous.value,previous.priority);
    else element.style.removeProperty('display');
   }
   hidden.clear();
  };
  const sync=()=>{
   restoreHeaders();
   body.classList.toggle('kartRushLandscapeActive',media.matches);
   if(media.matches){
    document.querySelectorAll<HTMLElement>('header, [role="banner"]').forEach(element=>{
     if(raceRoot.current?.contains(element))return;
     hidden.set(element,{value:element.style.getPropertyValue('display'),priority:element.style.getPropertyPriority('display')});
     element.style.setProperty('display','none','important');
    });
   }
   root.style.overflow='hidden';body.style.overflow='hidden';
   root.style.overscrollBehavior='none';body.style.overscrollBehavior='none';
  };
  sync();
  media.addEventListener?.('change',sync);
  window.addEventListener('resize',sync);
  return()=>{
   media.removeEventListener?.('change',sync);
   window.removeEventListener('resize',sync);
   restoreHeaders();body.classList.remove('kartRushLandscapeActive');
   root.style.overflow=originalRootOverflow;body.style.overflow=originalBodyOverflow;
   root.style.overscrollBehavior=originalRootOverscroll;body.style.overscrollBehavior=originalBodyOverscroll;
   if(meta&&originalViewport!==null)meta.setAttribute('content',originalViewport);
  };
 },[renderMode]);
 const [startSoundsEnabled,setStartSoundsEnabled]=useState(true);
 const startSoundsRef=useRef(true);
 const toggleStartSounds=useCallback(()=>{setStartSoundsEnabled(v=>{startSoundsRef.current=!v;return !v;});},[]);
 const enableAudio=useCallback(()=>{
  sound.current?.activate();
  ambience.current?.activate();
  venueAudio.current?.activate();
 },[]);
 // Audio is enabled by default; browsers may require the first key/tap gesture to unlock it.
 useEffect(()=>{const unlock=()=>enableAudio();window.addEventListener('pointerdown',unlock,{once:true});window.addEventListener('keydown',unlock,{once:true});return()=>{window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);};},[enableAudio]);

 useEffect(()=>{
  const mq=window.matchMedia('(pointer:coarse) and (max-width:1100px)');
  const sync=()=>{
   const hasPad=Array.from(navigator.getGamepads?.()||[]).some(Boolean);
   setShowTouchControls(mq.matches && !hasPad);
  };
  const onTouch=()=>{lastInputMode.current='touch';sync();};
  const onKeyboard=(e:KeyboardEvent)=>{
   if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','a','d','s','w','A','D','S','W','e','E','f','F','h','H','c','C','v','V','Escape'].includes(e.key)){
    lastInputMode.current='keyboard';
    sync();
   }
  };
  const onPadConnected=()=>{lastInputMode.current='gamepad';sync();};
  const onPadDisconnected=()=>{if(!Array.from(navigator.getGamepads?.()||[]).some(Boolean)){lastInputMode.current=mq.matches?'touch':'keyboard';sync();}};
  mq.addEventListener?.('change',sync);
  window.addEventListener('touchstart',onTouch,{passive:true});
  window.addEventListener('keydown',onKeyboard);
  window.addEventListener('gamepadconnected',onPadConnected as EventListener);
  window.addEventListener('gamepaddisconnected',onPadDisconnected as EventListener);
  sync();
  return()=>{
   mq.removeEventListener?.('change',sync);
   window.removeEventListener('touchstart',onTouch);
   window.removeEventListener('keydown',onKeyboard);
   window.removeEventListener('gamepadconnected',onPadConnected as EventListener);
   window.removeEventListener('gamepaddisconnected',onPadDisconnected as EventListener);
  };
 },[]);
 const [isFullscreen,setIsFullscreen]=useState(false);
 const [showTouchControls,setShowTouchControls]=useState(false);
 const finishOnce=useRef(false),controls=useRef({left:false,right:false,brake:false,throttle:false});
 const lastInputMode=useRef<'touch'|'keyboard'|'gamepad'>('touch');
 const down=useCallback((key:'left'|'right'|'brake'|'throttle',on:boolean)=>{if(pausedRef.current&&on)return;controls.current[key]=on;engine.current?.setKeys({[key]:on||padHeld.current[key]});if(on){sound.current?.activate();ambience.current?.activate();venueAudio.current?.activate();setAudioEnabled(true);}},[]);
 const fire=useCallback(()=>{if(pausedRef.current)return;sound.current?.activate();ambience.current?.activate();venueAudio.current?.activate();engine.current?.usePower();},[]);
 const horn=useCallback(()=>{if(pausedRef.current)return;sound.current?.activate();ambience.current?.activate();venueAudio.current?.activate();engine.current?.honk();},[]);
 const togglePause=useCallback(()=>{if(roomId)return;const next=!pausedRef.current;pausedRef.current=next;engine.current?.setPaused(next);sound.current?.update(0,false,next);ambience.current?.mute(next);setPaused(next);setShowGraphics(false);},[roomId]);
 const toggleFullscreen=useCallback(async()=>{
  const target=raceRoot.current;
  if(!target)return;
  try{
   if(document.fullscreenElement)await document.exitFullscreen();
   else if(target.requestFullscreen)await target.requestFullscreen();
  }catch{}
 },[]);
 // Poll standard Gamepad API without disturbing keyboard/touch input.
 useEffect(()=>{
  let raf=0;let currentName='';
  const syncPad=()=>{
   const profile=padProfileRef.current;
   const candidates=(navigator.getGamepads?.()||[]);
   const pad=profile==='off'?null:Array.from(candidates).find((g):g is Gamepad=>Boolean(g&&g.connected))||null;
   const nextName=pad?pad.id:'';
   if(currentName!==nextName){currentName=nextName;setGamepadName(nextName);if(nextName){lastInputMode.current='gamepad';setShowTouchControls(false);}}
   const bindings=profile==='custom'?padBindingsRef.current:profile==='ps5'?PS5_PAD:DEFAULT_PAD;
   const pressed=(code:number)=>Boolean(pad?.buttons[code]?.pressed||((pad?.buttons[code]?.value||0)>.42));
   const axis=pad?.axes?.[0]||0;
   const next={left:Boolean(pad&&((axis<-.24)||pressed(14))),right:Boolean(pad&&((axis>.24)||pressed(15))),throttle:Boolean(pad&&pressed(bindings.throttle)),brake:Boolean(pad&&pressed(bindings.brake))};
   for(const key of ['left','right','throttle','brake'] as const){
    if(padHeld.current[key]!==next[key]){
     padHeld.current[key]=next[key];
     engine.current?.setKeys({[key]:next[key]||controls.current[key]});
    }
   }
   const actions={power:pressed(bindings.power),camera:pressed(bindings.camera),lookBack:pressed(bindings.lookBack),horn:pressed(bindings.horn)};
   if(pad&&actions.power&&!prevPadButtons.current.power)fire();
   if(pad&&actions.camera&&!prevPadButtons.current.camera)cycleCamera();
   if(actions.lookBack!==prevPadButtons.current.lookBack)setRearCamera(actions.lookBack);
   if(pad&&actions.horn&&!prevPadButtons.current.horn)horn();
   prevPadButtons.current=actions;
   raf=requestAnimationFrame(syncPad);
  };
  raf=requestAnimationFrame(syncPad);
  return()=>{cancelAnimationFrame(raf);for(const key of ['left','right','throttle','brake'] as const){padHeld.current[key]=false;engine.current?.setKeys({[key]:controls.current[key]});}setRearCamera(false);};
 },[fire,cycleCamera,setRearCamera,horn]);
 useEffect(()=>{
  if(!powerRolling)return;
  const timer=window.setInterval(()=>{
   setPowerSpinIndex(v=>(v+1)%6);
   if(Date.now()>powerSpinUntil.current){setPowerRolling(false);setPowerRevealed(true);if(powerRevealTimer.current)clearTimeout(powerRevealTimer.current);powerRevealTimer.current=setTimeout(()=>setPowerRevealed(false),1100);window.clearInterval(timer);}
  },85);
  return()=>window.clearInterval(timer);
 },[powerRolling]);
 const finish=useCallback(async(duration:number,best:number)=>{
  if(finishOnce.current)return;finishOnce.current=true;setEnded(duration);setShowResults(true);sound.current?.effect('finish');
  if(roomId){const {error}=await supabase.rpc('f1_kr_finish',{p_room_id:roomId,p_finish_ms:duration,p_best_lap_ms:best});if(error)setError('Sonucun kaydedilemedi: '+error.message);else onReload();}
 },[roomId,supabase,onReload]);
 useEffect(()=>{const audio=new KartRushSound(volume);sound.current=audio;return()=>{audio.dispose();sound.current=null;};},[]);
 useEffect(()=>{const audio=new KartRushAmbientSound(volume);ambience.current=audio;return()=>{audio.dispose();ambience.current=null;};},[]);
 useEffect(()=>{const audio=new KartRushVenueAudio(volume);venueAudio.current=audio;return()=>{audio.dispose();venueAudio.current=null;};},[]);
 useEffect(()=>{sound.current?.setVolume(volume);ambience.current?.setVolume(volume);venueAudio.current?.setVolume(volume);},[volume]);
 useEffect(()=>{
  const mq=window.matchMedia('(pointer:coarse) and (max-width:1100px)');
  if(!mq.matches)return;
  const prevBody=document.body.style.overflow;
  const prevOverscroll=document.documentElement.style.overscrollBehavior;
  document.body.style.overflow='hidden';
  document.documentElement.style.overscrollBehavior='none';
  return()=>{document.body.style.overflow=prevBody;document.documentElement.style.overscrollBehavior=prevOverscroll;};
 },[]);
 useEffect(()=>{
  const onFs=()=>setIsFullscreen(Boolean(document.fullscreenElement));
  document.addEventListener('fullscreenchange',onFs);
  onFs();
  return()=>document.removeEventListener('fullscreenchange',onFs);
 },[]);
 useEffect(()=>{
  if(renderMode==='pending')return;
  let cancelled=false,inst:KartRushEngine|null=null,currentChannel:ReturnType<SupabaseClient['channel']>|null=null;
  const keydown=(e:KeyboardEvent)=>{
   if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','a','d','s','w','A','D','S','W','e','E','f','F','h','H','c','C','v','V','Escape'].includes(e.key))e.preventDefault();
   if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft')down('left',true);
   if(e.key==='d'||e.key==='D'||e.key==='ArrowRight')down('right',true);
   if(e.key==='s'||e.key==='S'||e.key==='ArrowDown')down('brake',true);
   if(e.key==='w'||e.key==='W'||e.key==='ArrowUp')down('throttle',true);
   if(e.code==='Space'||e.key==='e'||e.key==='E')fire();
   if(e.key==='f'||e.key==='F')void toggleFullscreen();
   if((e.key==='v'||e.key==='V')&&!e.repeat)cycleCamera();
   if(e.key==='c'||e.key==='C')setRearCamera(true);
   if(e.key==='h'||e.key==='H')horn();
   if(e.key==='Escape'&&!roomId)togglePause();
  };
  const keyup=(e:KeyboardEvent)=>{
   if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft')down('left',false);
   if(e.key==='d'||e.key==='D'||e.key==='ArrowRight')down('right',false);
   if(e.key==='s'||e.key==='S'||e.key==='ArrowDown')down('brake',false);
   if(e.key==='w'||e.key==='W'||e.key==='ArrowUp')down('throttle',false);
   if(e.key==='c'||e.key==='C')setRearCamera(false);
  };
  const blur=()=>{down('left',false);down('right',false);down('brake',false);down('throttle',false);setRearCamera(false);};
  const hidden=()=>{if(document.hidden)blur();};
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hidden);
  const activate=async()=>{
   try{
    const {KartRushEngine:Engine}=await import('./engine');
    if(cancelled||!canvas.current)return;
    inst=new Engine(canvas.current,{id:userId,name:displayName,color,startAt:startAt+15000,gridSlot,bots:!roomId,difficulty,laps,pace,weather,graphics,
     onHud:next=>{
      const tick=performance.now();
      const onPhone=typeof window!=='undefined'&&window.matchMedia('(pointer:coarse) and (max-width:1100px)').matches;
      if(!onPhone||tick-lastMobileUiUpdate.current>115){lastMobileUiUpdate.current=tick;setHud(next);}
      sound.current?.update(next.speed,Boolean(next.throttle),pausedRef.current||finishOnce.current,Boolean(next.braking));sound.current?.startSignal(next.lights,next.started,pausedRef.current||finishOnce.current||!startSoundsRef.current);ambience.current?.update(next,userId,TRACK_METERS,pausedRef.current||finishOnce.current);venueAudio.current?.update(next.progress||0,next.speed,next.started,pausedRef.current||finishOnce.current);},onEffect:effect=>{sound.current?.effect(effect);ambience.current?.effect(effect);if(effect==='pickup'){powerSpinUntil.current=Date.now()+1250;setPowerRevealed(false);setPowerRolling(true);setPowerSpinIndex(0);}},onFinish:(dur,best)=>{void finish(dur,best);},
     onSnapshot:roomId?(st)=>{
      const t=performance.now();if(t-lastSent.current<160)return;lastSent.current=t;
      void currentChannel?.send({type:'broadcast',event:'kart-state',payload:st});
     }:undefined,
     onPower:roomId?(power,targets)=>{if(targets?.length)void currentChannel?.send({type:'broadcast',event:'kart-ability',payload:{id:userId,power,targets}});}:undefined,
    });engine.current=inst;
    if(roomId){
     const ids=new Set(members.map(m=>m.user_id));
     currentChannel=supabase.channel('f1-kr-live-'+roomId,{config:{broadcast:{self:false}}})
      .on('broadcast',{event:'kart-state'},({payload})=>{
       const p=payload as KartState;
       if(!p||typeof p.id!=='string'||!ids.has(p.id)||p.id===userId||!Number.isFinite(p.progress)||!Number.isFinite(p.lane))return;
       const member=members.find(m=>m.user_id===p.id);if(!member)return;
       friends.current.set(p.id,{id:p.id,name:member.nickname,color:member.color,progress:p.progress,lane:p.lane,speed:typeof p.speed==='number'?p.speed:0});
       inst?.setRemote([...friends.current.values()]);
      }).on('broadcast',{event:'kart-ability'},({payload})=>{
       if(payload?.id!==userId&&ids.has(payload?.id)&&Array.isArray(payload?.targets)&&payload.targets.includes(userId)&&(payload?.power==='emp'||payload?.power==='pulse'))inst?.receiveAttack(payload.power);
      }).subscribe();channel.current=currentChannel;
    }
   }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'3D motor yÃ¼klenemedi.');}
  };
  void activate();
  return()=>{cancelled=true;window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hidden);inst?.dispose();engine.current=null;if(currentChannel)void supabase.removeChannel(currentChannel);channel.current=null;};
  // For online races, roster is frozen for the duration of this match.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[renderMode,roomId,userId,color,displayName,startAt,difficulty,laps,pace,weather,toggleFullscreen,togglePause,horn,cycleCamera,setRearCamera]);
 useEffect(()=>{engine.current?.setGraphics(graphics);},[graphics]);
 useEffect(()=>{
  if(!hud.started||ended!==null||paused){previousRank.current=hud.rank;return;}
  if(previousRank.current!==null&&hud.rank!==previousRank.current){
   sound.current?.activate();
   sound.current?.effect(hud.rank<previousRank.current?'overtake':'position-lost');
  }
  previousRank.current=hud.rank;
 },[hud.rank,hud.started,ended,paused]);
 const pressProps=(k:'left'|'right'|'brake'|'throttle')=>({
  onPointerDown:(e:ReactPointerEvent<HTMLButtonElement>)=>{
   e.preventDefault();e.stopPropagation();lastInputMode.current='touch';
   down(k,true);try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}
  },
  onPointerUp:()=>down(k,false),onPointerCancel:()=>down(k,false),onLostPointerCapture:()=>down(k,false),
  onTouchStart:()=>{lastInputMode.current='touch';down(k,true);},
  onTouchEnd:()=>down(k,false),onTouchCancel:()=>down(k,false),
 });
 const ability=hud.power;
 const sorted=useMemo(()=>hud.rivals||[],[hud.rivals]);
 const classification=useMemo(()=>{
  const rows=sorted.slice(0,22);
  const leader=rows[0];
  return rows.map((p,i)=>{
   const gapMeters=leader?Math.max(0,Math.round((leader.progress-p.progress)*TRACK_METERS)):0;
   return {...p,pos:i+1,gapLabel:i===0?'LEADER':gapMeters>=1000?`+${(gapMeters/1000).toFixed(2)} km`:`+${gapMeters} m`};
  });
 },[sorted]);
 const elapsed=Math.max(0,hud.elapsed);
 const standings=[...members].sort((a,b)=>(b.kr_points||0)-(a.kr_points||0)||(b.kr_last_award||0)-(a.kr_last_award||0));
 const champion=members.find(x=>x.user_id===championId);
 const multiplayerGrid=[...members].sort((a,b)=>gridHash(String(startAt)+a.user_id)-gridHash(String(startAt)+b.user_id));
 const gridSlot=roomId?Math.max(0,multiplayerGrid.findIndex(m=>m.user_id===userId)) : gridHash(String(startAt)+userId)%22;
 const everyoneFinished=members.length>=2&&members.every(x=>x.finish_ms!==null);
 const raceView=<section className={`${s.raceScreen} ${ended!==null?s.paradeMode:''}`} ref={raceRoot}
  onPointerDownCapture={()=>{sound.current?.activate();ambience.current?.activate();venueAudio.current?.activate();}}>
  <canvas ref={canvas} className={s.canvas} aria-label="Kart Rush 3D yarÄ±ÅŸ pisti" />
  <div className={s.racingVignette} aria-hidden="true" />
  <div className={s.topHud}>
   <div className={`${s.hudBlock} ${s.hudPosition}`}><span>SIRA</span><strong>{hud.rank}<small> / {hud.total}</small></strong></div>
   <div className={`${s.hudBlock} ${s.hudLap}`}><span>TUR</span><strong>{hud.lap}<small> / {hud.totalLaps}</small></strong></div>
   <div className={`${s.hudBlock} ${s.hudTime}`}><span>SÃœRE</span><strong>{Math.floor(elapsed/60).toString().padStart(2,'0')}:{Math.floor(elapsed%60).toString().padStart(2,'0')}<small>.{Math.floor(elapsed*10)%10}</small></strong></div>
   <div className={`${s.hudBlock} ${s.bestBlock}`}><span>EN Ä°YÄ°</span><strong>{hud.bestLapMs?((hud.bestLapMs)/1000).toFixed(2):'â€”'}<small> s</small></strong></div>
  </div>
  <div className={s.raceActions}>
   <button type="button" className={s.mobilePauseBtn} onClick={()=>{
     const opening=!mobileMenuOpen;
     if(opening){down('left',false);down('right',false);down('throttle',false);down('brake',false);}
     if(!roomId&&opening!==pausedRef.current)togglePause();
     setShowGraphics(false);setShowLeaderboard(false);setMobileMenuOpen(opening);
   }}>{mobileMenuOpen?'âœ• KAPAT':roomId?'â…¡ MENÃœ':'â…¡ DURAKLAT'}</button>
   <button type="button" className={s.hudCameraBtn} onClick={()=>{cycleCamera();}} aria-label="KamerayÄ± deÄŸiÅŸtir">â–£ KAMERA<small>{cameraName}</small></button>
   <button type="button" onClick={()=>setShowGraphics(v=>!v)} className={s.graphicsToggle} aria-label="Grafik ve ses ayarlarÄ±" aria-expanded={showGraphics}>âš™ AYARLAR <span>{graphics==='ultra'?'ULTRA':graphics==='high'?'YÃœKSEK':graphics==='low'?'DÃœÅÃœK':'DENGELÄ°'}</span></button>
   <button type="button" onClick={()=>void toggleFullscreen()} className={s.fullscreenBtn}>{isFullscreen?'ğŸ¡¼ Ã‡IK':'â›¶ TAM'}</button>
   {!roomId&&<button type="button" className={s.fullscreenBtn} onClick={togglePause}>{paused?'â–¶ DEVAM':'â…¡ DURAKLAT'}</button>}
   <button className={s.exitBtn} onClick={onExit}>â† Ã‡Ä±kÄ±ÅŸ</button>
  </div>
  {showGraphics&&<div className={s.graphicsOverlay}>
   <div className={s.graphicsOverlayTitle}><strong>GÃ–RÃœNTÃœ + SES</strong><span>{hud.fps||'--'} FPS</span></div>
   <div className={s.overlayIntro}>F1 SOCIAL KART RUSH Â· 22 ARAÃ‡LIK GRID Â· GECE GRAND PRIX</div>
   <div className={s.graphicsOptions}>{([{id:'low',name:'DÃœÅÃœK',desc:'Performans'},{id:'balanced',name:'DENGELÄ°',desc:'Normal'},{id:'high',name:'YÃœKSEK',desc:'GÃ¼Ã§lÃ¼ detay'},{id:'ultra',name:'ULTRA',desc:'TribÃ¼n / gÃ¶kyÃ¼zÃ¼ / maksimum detay'}] as const).map(q=><button type="button" key={q.id} className={graphics===q.id?s.selectedGraphics:''} onClick={()=>onGraphicsChange?.(q.id)}><strong>{q.name}</strong><small>{q.desc}</small></button>)}</div>
   <label className={s.volumeLabel}>SES DÃœZEYÄ° <strong>{Math.round(volume*100)}%</strong><input type="range" min="0" max="100" value={Math.round(volume*100)} onChange={e=>{const v=Number(e.target.value)/100;onVolumeChange?.(v);sound.current?.activate();}}/></label>
   <button type="button" className={s.muteBtn} onClick={()=>onVolumeChange?.(volume>0?0:.45)}>{volume>0?'â™¬ SESÄ° KAPAT':'â™¬ SESÄ° AÃ‡'}</button>
   <div style={{display:'grid',gap:8,margin:'12px 0',padding:12,border:'1px solid rgba(226,237,245,.22)',borderRadius:11,background:'rgba(9,20,33,.85)',color:'#fff'}}>
    <strong style={{fontSize:13}}>ğŸ® OYUN KOLU / TUÅ ATAMASI</strong>
    <small style={{fontSize:11,opacity:.8}}>{gamepadName?`BAÄLI Â· ${gamepadName}`:'Kol baÄŸlÄ± deÄŸil Â· USB/Bluetooth ile baÄŸlayÄ±p herhangi bir dÃ¼ÄŸmeye bas'}</small>
    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
     {([['auto','OTOMATÄ°K'],['xbox','XBOX'],['ps5','PS5'],['custom','Ã–ZEL'],['off','KAPALI']] as const).map(([id,label])=><button key={id} type="button" onClick={()=>setGamepadProfile(id)} style={{padding:'7px 10px',fontSize:10,borderRadius:7,border:'1px solid '+(gamepadProfile===id?'#ffb3bf':'#8491a3'),background:gamepadProfile===id?'#913144':'#182738',color:'#fff',fontWeight:800}}>{label}</button>)}
    </div>
    <small style={{opacity:.82}}>Sol analog: direksiyon Â· RT/R2: gaz Â· LT/L2: fren Â· A/âœ•: gÃ¼Ã§ Â· Y/â–³: kamera Â· LB/L1: arka bakÄ±ÅŸ Â· X/â–¡: korna</small>
    {gamepadProfile==='custom'&&<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:6}}>
     {PAD_ACTIONS.map(([action,label])=><label key={action} style={{display:'grid',gap:4,fontSize:10,fontWeight:800}}>{label}<select value={gamepadBindings[action]} onChange={ev=>setGamepadBindings(prev=>({...prev,[action]:Number(ev.target.value)}))} style={{background:'#14253a',color:'#fff',padding:6,border:'1px solid #758da3',borderRadius:6}}>
       {Array.from({length:18},(_,i)=><option key={i} value={i}>{i===0?'A / âœ•':i===1?'B / â—‹':i===2?'X / â–¡':i===3?'Y / â–³':i===4?'LB / L1':i===5?'RB / R1':i===6?'LT / L2':i===7?'RT / R2':`DÃœÄME ${i}`}</option>)}
      </select></label>)}
    </div>}
   </div>
   <button type="button" className={s.muteBtn} onClick={toggleStartSounds}>{startSoundsEnabled?'ğŸ”Š START IÅIKLARININ SESÄ°NÄ° KAPAT':'ğŸ”‡ START IÅIKLARININ SESÄ°NÄ° AÃ‡'}</button>
   <p>ğŸ® Gamepad ayarlarÄ± ve tuÅŸ atamalarÄ± Ã¼stte Â· W gaz Â· S fren Â· A/D GERÃ‡EK DÄ°REKSÄ°YON (otomatik dÃ¶nÃ¼ÅŸ kapalÄ±) Â· V kamera deÄŸiÅŸtir Â· C basÄ±lÄ± tut: arkaya bak Â· E gÃ¼Ã§ Â· H korna Â· F tam ekran.</p>
  </div>}
  {mobileMenuOpen&&ended===null&&<div className={s.mobileMenuOverlay} role="dialog" aria-modal="true" aria-label="YarÄ±ÅŸ ayarlarÄ±">
   <div className={s.mobileMenuCard}>
    <div className={s.mobileMenuHeader}><span>F1 SOCIAL Â· KART RUSH</span><h2>{roomId?'YARIÅ MENÃœSÃœ':'YARIÅ DURAKLATILDI'}</h2><p>{roomId?'Ã‡evrimiÃ§i yarÄ±ÅŸ bu menÃ¼de de devam eder.':'YarÄ±ÅŸ durdu. AyarlarÄ±nÄ± deÄŸiÅŸtirdikten sonra devam edebilirsin.'}</p></div>
    <div className={s.mobileMenuSection}><strong>GRAFÄ°K KALÄ°TESÄ°</strong>
     <div className={s.mobileGraphicsGrid}>{([{id:'low',label:'EKO'},{id:'balanced',label:'DENGELÄ°'},{id:'high',label:'YÃœKSEK'},{id:'ultra',label:'ULTRA'}] as const).map(q=><button type="button" key={q.id} className={graphics===q.id?s.mobileSelected:''} onClick={()=>onGraphicsChange?.(q.id)}>{q.label}</button>)}</div>
     <small>Mobilde Ã§Ã¶zÃ¼nÃ¼rlÃ¼k ve Ã§izim yoÄŸunluÄŸu otomatik dengelenir.</small>
    </div>
    <div className={s.mobileMenuSection}><strong>SES</strong>
     <button type="button" className={s.mobileAudioButton} onClick={()=>{
      enableAudio();if(volume<=.01)onVolumeChange?.(.62);
      sound.current?.effect('horn');
     }}>â™« SESÄ° ETKÄ°NLEÅTÄ°R / TEST ET</button>
     <label className={s.mobileVolume}>SES DÃœZEYÄ° Â· {Math.round(volume*100)}%
      <input type="range" min="0" max="100" value={Math.round(volume*100)} onChange={e=>{
       const v=Number(e.target.value)/100;onVolumeChange?.(v);enableAudio();
      }}/>
     </label>
    </div>
    <div className={s.mobileMenuSection}><strong>YARIÅ SEÃ‡ENEKLERÄ°</strong>
     <div className={s.mobileMenuChoices}>
      <button type="button" onClick={cycleCamera}>â–£ KAMERA</button>
      <button type="button" onClick={()=>{setShowLeaderboard(v=>!v);setMobileMenuOpen(false);if(!roomId&&pausedRef.current)togglePause();}}>â˜° SIRALAMA</button>
      <button type="button" onClick={()=>{void toggleFullscreen();}}>â›¶ TAM EKRAN</button>
      <button type="button" onClick={onExit}>â† ANA MENÃœ</button>
     </div>
    </div>
    <button type="button" className={s.mobileResumeBtn} onClick={()=>{
      if(!roomId&&pausedRef.current)togglePause();setMobileMenuOpen(false);
     }}>â–¶ YARIÅA DEVAM ET</button>
   </div>
  </div>}
  {paused&&!mobileMenuOpen&&!roomId&&ended===null&&<div className={s.pauseOverlay}><div className={s.pauseCard}><small>F1 MEDÄ°POL</small><h2>YARIÅ DURAKLATILDI</h2><p>AyarlarÄ± deÄŸiÅŸtirebilir veya ana menÃ¼ye dÃ¶nebilirsin.</p><button onClick={togglePause}>â–¶ YarÄ±ÅŸa devam</button><button onClick={onExit}>â† Ana menÃ¼</button></div></div>}
  <div className={s.sideHud}>
   <div className={s.cameraControls}>
    <span>KAMERA <strong>{rearHeld?'ARKA BAKIÅ':cameraName}</strong></span>
    <div>
     <button type="button" onClick={cycleCamera} title="V: Kamera deÄŸiÅŸtir">V Â· KAMERA</button>
     <button type="button" className={rearHeld?s.cameraRearActive:''}
      onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);setRearCamera(true);}}
      onPointerUp={()=>setRearCamera(false)} onPointerCancel={()=>setRearCamera(false)}
      onLostPointerCapture={()=>setRearCamera(false)} title="C: Arkaya bak">C Â· ARKA</button>
    </div>
   </div>
   <TrackMiniMap hud={hud} id={userId}/>
  </div>
  <button type="button" className={s.leaderboardToggle} onClick={()=>setShowLeaderboard(v=>!v)} aria-expanded={showLeaderboard}>{showLeaderboard?'âœ• KAPAT':'â˜° SIRALAMA'} <span>{hud.rank}/{hud.total}</span></button>
  <div className={`${s.standings} ${showLeaderboard?s.boardOpen:''}`} aria-label="CanlÄ± yarÄ±ÅŸ sÄ±ralamasÄ±">
   <div className={s.standingsTitle}><strong>LIVE CLASSIFICATION</strong><small>GAP TO LEADER</small></div>
   {classification.map((p)=><p key={p.id} className={p.id===userId?s.isMe:''}><i>{p.pos}</i><span style={{background:p.color}}/><b>{p.id===userId?'SEN':p.name}</b><small>{p.gapLabel}</small></p>)}
  </div>
  {hud.pit&&<div className={s.pitIndicator}>PIT ALANI Â· {hud.pitProgress>0?`SERVÄ°S %${Math.round(hud.pitProgress*100)}`:'GAZI BIRAK VE DUR'}<div><i style={{width:`${hud.pitProgress*100}%`}}/></div></div>}
  {hud.magnet&&<div className={s.magnetIndicator}>âŠ• MIKNATIS AKTÄ°F</div>}
  {hud.cornerSpeed&&hud.speed>hud.cornerSpeed+18&&<div className={s.cornerAlert}>âš  SERT VÄ°RAJ Â· FREN Â· {hud.cornerSpeed} KM/SA</div>}
  {hud.offroad&&<div className={s.offroad}>âš  PÄ°ST DIÅINDASIN Â· FRENLE, DÄ°REKSÄ°YONLA GERÄ° DÃ–N</div>}
  {hud.shield&&<span className={s.activeShield}>â¬¡ KALKAN AKTÄ°F</span>}
  {hud.turbo&&<span className={s.activeTurbo}>âš¡ TURBO AKTÄ°F</span>}
  {/* Start lights are rendered by the 3D circuit; no blocking overlay or risk-card popup. */}
  {error&&<p role="alert" className={s.raceError}>{error}</p>}
  <div className={s.raceBottom}>
   {showTouchControls&&<div className={s.steerControls}><button {...pressProps('left')} aria-label="Sola dÃ¶n">â—€</button><button {...pressProps('right')} aria-label="SaÄŸa dÃ¶n">â–¶</button></div>}
   <div className={s.controlsCenter} style={!showTouchControls?{maxWidth:'min(760px,calc(100vw - 28px))',margin:'0 auto'}:undefined}><span>W Â· GAZ &nbsp; S Â· FREN &nbsp; A/D Â· MANUEL DÄ°REKSÄ°YON &nbsp; V Â· KAMERA &nbsp; C Â· ARKA BAKIÅ &nbsp; E Â· GÃœÃ‡</span><small>{roomId?'Ã‡EVRÄ°M Ä°Ã‡Ä° GRAND PRIX':`ANTRENMAN Â· ${difficulty==='easy'?'KOLAY':difficulty==='hard'?'UZMAN':'ORTA'}`}</small></div>
   {showTouchControls&&<div className={s.abilityControls}><button type="button" className={s.hornBtn} onPointerDown={e=>{e.preventDefault();lastInputMode.current='touch';setShowTouchControls(true);horn();}}>â™« KORNA</button><button {...pressProps('throttle')} className={s.gas}>GAZ</button><button {...pressProps('brake')} className={s.brake}>FREN</button>
    <button onPointerDown={e=>{e.preventDefault();lastInputMode.current='touch';setShowTouchControls(true);fire();}} onClick={e=>{if(e.detail===0)fire();}} disabled={!ability} className={`${s.powerBtn} ${ability? s.powerReady:''}`} style={ability?{'--ability-color':POWER_COLORS[ability]} as CSSProperties:undefined}>
      <span>{ability?POWER_ICON[ability]:'âœ¦'}</span><small>{ability?LABEL[ability]:'GÃœÃ‡ TOPLA'}</small>
     </button>
   </div>}
  </div>
  {(powerRolling||powerRevealed)&&<div className={s.mobilePowerReveal} aria-live="polite" style={{position:'absolute',top:'40%',left:'50%',transform:'translate(-50%,-50%)',zIndex:11,background:'rgba(6,13,26,.90)',border:'2px solid #f0ad57',borderRadius:18,padding:'15px 27px',minWidth:230,textAlign:'center',pointerEvents:'none',boxShadow:'0 10px 70px #050a17ca'}}>
   <div style={{color:'#eebf7b',fontSize:11,letterSpacing:3,fontWeight:900}}>âœ¦ GÃœÃ‡ KAZANILDI âœ¦</div>
   <div style={{fontSize:43,margin:'6px 0',animation:'krPowerPop .16s ease-out infinite alternate'}}>{powerRolling?POWER_ICON[(Object.keys(LABEL) as KartPower[])[powerSpinIndex]]:ability?POWER_ICON[ability]:'âœ¦'}</div>
   <strong style={{fontSize:18}}>{powerRolling?LABEL[(Object.keys(LABEL) as KartPower[])[powerSpinIndex]]:ability?LABEL[ability]:'GÃœÃ‡ HAZIR'}</strong>
   <div style={{display:'flex',gap:3,marginTop:10}}>{(Object.keys(LABEL) as KartPower[]).map(p=><i key={p} style={{height:3,flex:1,background:POWER_COLORS[p],opacity:powerSpinIndex===(Object.keys(LABEL) as KartPower[]).indexOf(p)?1:.24}}/>)}</div>
   <style>{`@keyframes krPowerPop{from{transform:scale(.90);filter:brightness(.9)}to{transform:scale(1.06);filter:brightness(1.2)}}`}</style>
  </div>}
  {ended!==null&&<div className={s.finishNotice} role="status">
   <span>ğŸ FÄ°NÄ°Å Â· {(ended/1000).toFixed(2)} sn</span>
   <button type="button" onClick={()=>setShowResults(v=>!v)}>{showResults?'âœ• KAPAT':'ğŸ† SONUÃ‡LARI GÃ–R'}</button>
  </div>}
  {ended!==null&&showResults&&<div className={s.endOverlay}><div className={s.endCard} style={{width:"min(780px,96vw)",maxWidth:"780px",maxHeight:"90%",overflowY:"auto",padding:"clamp(16px,3vw,30px)"}}>
   <span>ğŸ DAMALI BAYRAK</span><h2>{roomId?'YarÄ±ÅŸ tamamlandÄ±!':`P${hud.rank} Â· FÄ°NÄ°Å!`}</h2>
   <div className={s.finalTime}>{(ended/1000).toFixed(2)} <small>sn</small></div>
   <p>{roomId?(championshipEnabled?`Åampiyona yarÄ±ÅŸÄ± ${roundNo} Â· ${roundScored?'Puanlar hesaplandÄ±.':'DiÄŸer oyuncularÄ±n bitirmesi bekleniyor.'}`:'Sonucun lobiye kaydedildi. DiÄŸer yarÄ±ÅŸÃ§Ä±larÄ± bekleyebilirsin.'):`Zorluk: ${difficulty==='easy'?'Kolay':difficulty==='hard'?'Uzman':'Orta'} Â· En iyi tur: ${(hud.bestLapMs||ended)/1000} sn`}</p>
   {roomId&&championshipEnabled&&<div style={{padding:'10px',border:'1px solid #6b748e65',borderRadius:12,display:'grid',gap:7,background:'rgba(11,17,28,.83)'}}>
    <strong style={{fontSize:14}}>ğŸ† PUAN DURUMU Â· HEDEF {pointsTarget} PUAN</strong>
    {standings.map((m,i)=><div key={m.user_id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'8px',background:'rgba(255,255,255,.045)',borderRadius:7}}><span>{i+1}. {m.nickname}{m.user_id===userId?' (SEN)':''}</span><strong>{m.kr_points||0} {roundScored?`(+${m.kr_last_award||0})`:''}</strong></div>)}
    {champion&&<strong style={{color:'#ffe188'}}>ğŸ† ÅAMPÄ°YON: {champion.nickname} Â· {champion.kr_points||0} PUAN</strong>}
    {!roundScored&&isHost&&<p>DiÄŸer yarÄ±ÅŸÃ§Ä±larÄ± bekle. Ä°stersen bitiremeyenleri DNF sayÄ±p puanlamayÄ± onaylayabilirsin.</p>}
   </div>}
   <div className={s.results} style={{maxHeight:270,gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',margin:'12px 0'}}>
    {(roomId?[...members].sort((a,b)=>(a.finish_ms===null?1:0)-(b.finish_ms===null?1:0)||(a.finish_ms||0)-(b.finish_ms||0))
      .map((m,i)=>({id:m.user_id,name:m.nickname,color:m.color,rank:i+1,time:m.finish_ms,points:m.kr_points||0}))
     : classification.map(m=>({id:m.id,name:m.name,color:m.color,rank:m.pos,time:m.id===userId?ended:null,points:0}))).map(m=><div key={m.id} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 12px',borderLeft:'3px solid '+m.color,background:m.id===userId?'rgba(220,52,76,.18)':undefined}}>
       <b style={{minWidth:26,color:m.rank<=3?'#ffdd86':'#d9e2ee'}}>P{m.rank}</b>
       <span style={{minWidth:0,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.id===userId?'SEN':m.name}</span>
       <small style={{whiteSpace:'nowrap'}}>{m.time!==null?(m.time/1000).toFixed(2)+' sn':roomId?'YARIÅTA':'SIRALAMA'}</small>
      </div>)}
   </div>
   {!roomId&&onRetry&&<button onClick={onRetry}>â†» Tekrar yarÄ±ÅŸ</button>}
   {roomId&&isHost&&championshipEnabled&&!roundScored&&onFinalize&&<button onClick={onFinalize}>{everyoneFinished?'ğŸ† PUANLARI HESAPLA':'ğŸ KALANLARI DNF SAY VE PUANLA'}</button>}
   {roomId&&isHost&&championshipEnabled&&roundScored&&!championId&&onNextRound&&<button onClick={onNextRound}>ğŸ SONRAKÄ° YARIÅ Â· PUANLAR KORUNACAK</button>}
   {roomId&&championshipEnabled&&roundScored&&championId&&<strong>ğŸ† ÅAMPÄ°YONA TAMAMLANDI Â· {champion?.nickname||'ÅAMPÄ°YON'}</strong>}
   {roomId&&isHost&&!championshipEnabled&&onReset&&<button onClick={onReset}>â†» AYNI LOBÄ°DE YENÄ° YARIÅ</button>}
   {roomId&&!isHost&&<p>Yeni yarÄ±ÅŸ iÃ§in lobi sahibinin baÅŸlatmasÄ±nÄ± bekleyebilirsin.</p>}
   <button type="button" onClick={()=>setShowResults(false)}>ğŸï¸ AraÃ§larÄ± izle</button>
   <button onClick={onExit}>{roomId?'âœ• LOBÄ°DEN AYRIL':'Arcadeâ€™e dÃ¶n'}</button>
  </div></div>}
 </section>;
 if(renderMode==='pending')return null;
 return renderMode==='mobile'?createPortal(raceView,document.body):raceView;
}

