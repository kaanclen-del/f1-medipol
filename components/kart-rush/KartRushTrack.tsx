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
 onExit:()=>void;onReload:()=>void;onSoloFinish?:(rank:number,rivals:{id:string;name:string;progress:number}[])=>void;onReset?:()=>void;onRetry?:()=>void;isHost?:boolean;difficulty?:KartDifficulty;laps?:number;pace?:KartPace;weather?:KartWeather;graphics?:KartGraphics;onGraphicsChange?:(g:KartGraphics)=>void;volume?:number;onVolumeChange?:(v:number)=>void;championshipEnabled?:boolean;pointsTarget?:number;roundNo?:number;roundScored?:boolean;championId?:string|null;onFinalize?:()=>void;onNextRound?:()=>void;
};
const LABEL:Record<KartPower,string>={turbo:'TURBO',shield:'KALKAN',emp:'EMP DARBESİ',repair:'ONARIM',pulse:'ŞOK DALGASI',magnet:'MIKNATIS'};
const POWER_ICON:Record<KartPower,string>={turbo:'⚡',shield:'⬡',emp:'✺',repair:'✚',pulse:'◉',magnet:'⊕'};
type PadAction='throttle'|'brake'|'power'|'camera'|'lookBack'|'horn';
type PadProfile='auto'|'xbox'|'ps5'|'custom'|'off';
type PadBindings=Record<PadAction,number>;
const DEFAULT_PAD:PadBindings={throttle:7,brake:6,power:0,camera:3,lookBack:4,horn:2};
const PS5_PAD:PadBindings={throttle:7,brake:6,power:0,camera:3,lookBack:4,horn:2};
const PAD_ACTIONS:[PadAction,string][]=[['throttle','GAZ'],['brake','FREN'],['power','ÖZEL GÜÇ'],['camera','KAMERA'],['lookBack','ARKAYA BAK'],['horn','KORNA']];
const POWER_COLORS:Record<KartPower,string>={turbo:'#ffbc4e',shield:'#52e4ff',emp:'#cc8fff',repair:'#6ed5a1',pulse:'#e78bff',magnet:'#e0cf8d'};
const gridHash=(text:string)=>{let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return n>>>0;};
export default function KartRushTrack({supabase,roomId,userId,displayName,color,startAt,members,onExit,onReload,onSoloFinish,onReset,onRetry,isHost=false,difficulty='normal',laps=3,pace='standard',weather='clear',graphics='balanced',onGraphicsChange,volume=.45,onVolumeChange,championshipEnabled=false,pointsTarget=50,roundNo=1,roundScored=false,championId=null,onFinalize,onNextRound}:Props){
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
 const [cameraName,setCameraName]=useState('TAKİP');
 const lastCameraTouch=useRef(0);
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
 const fullscreenStateRef=useRef(false);
 const [showTouchControls,setShowTouchControls]=useState(false);
 const finalRankRef=useRef(1);
 const finalRivalsRef=useRef<{id:string;name:string;progress:number}[]>([]);
 const finishOnce=useRef(false),controls=useRef({left:false,right:false,brake:false,throttle:false});
 const lastInputMode=useRef<'touch'|'keyboard'|'gamepad'>('touch');
 const down=useCallback((key:'left'|'right'|'brake'|'throttle',on:boolean)=>{if(pausedRef.current&&on)return;controls.current[key]=on;engine.current?.setKeys({[key]:on||padHeld.current[key]});if(on){sound.current?.activate();ambience.current?.activate();venueAudio.current?.activate();}},[]);
 const fire=useCallback(()=>{if(pausedRef.current)return;sound.current?.activate();ambience.current?.activate();venueAudio.current?.activate();engine.current?.usePower();},[]);
 const horn=useCallback(()=>{if(pausedRef.current)return;sound.current?.activate();ambience.current?.activate();venueAudio.current?.activate();engine.current?.honk();},[]);
 const togglePause=useCallback(()=>{if(roomId)return;const next=!pausedRef.current;pausedRef.current=next;engine.current?.setPaused(next);sound.current?.update(0,false,next);ambience.current?.mute(next);setPaused(next);setShowGraphics(false);},[roomId]);
 // iOS Safari cannot fullscreen arbitrary elements. Keep an in-page fullscreen
 // fallback, and use the native Fullscreen API where supported.
 const toggleFullscreen=useCallback(async()=>{
  const target=raceRoot.current;
  if(!target)return;
  const next=!fullscreenStateRef.current;
  fullscreenStateRef.current=next;
  setIsFullscreen(next);
  if(!next){
   if(document.fullscreenElement){try{await document.exitFullscreen();}catch{}}
   return;
  }
  if(typeof target.requestFullscreen==='function'){
   try{await target.requestFullscreen();}catch{/* CSS fullscreen remains active */}
  }
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
  if(finishOnce.current)return;finishOnce.current=true;setEnded(duration);setShowResults(true);sound.current?.effect('finish');if(!roomId)onSoloFinish?.(finalRankRef.current,finalRivalsRef.current);
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
  const onFs=()=>{const active=Boolean(document.fullscreenElement);if(active){fullscreenStateRef.current=true;setIsFullscreen(true);}else if(fullscreenStateRef.current){fullscreenStateRef.current=false;setIsFullscreen(false);}};
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
    inst=new Engine(canvas.current,{id:userId,name:displayName,color,startAt:startAt+15000,gridSlot,bots:true,botCount:roomId?Math.max(0,22-members.length):undefined,onlineMode:Boolean(roomId),difficulty,laps,pace,weather,graphics,
     onHud:next=>{finalRankRef.current=next.rank;finalRivalsRef.current=next.rivals||[];
      const tick=performance.now();
      const onPhone=typeof window!=='undefined'&&window.matchMedia('(pointer:coarse) and (max-width:1100px)').matches;
      if(!onPhone||tick-lastMobileUiUpdate.current>115){lastMobileUiUpdate.current=tick;setHud(next);}
      sound.current?.update(next.speed,Boolean(next.throttle),pausedRef.current||finishOnce.current,Boolean(next.braking));sound.current?.startSignal(next.lights,next.started,pausedRef.current||finishOnce.current||!startSoundsRef.current);ambience.current?.update(next,userId,TRACK_METERS,pausedRef.current||finishOnce.current);venueAudio.current?.update(next.progress||0,next.speed,next.started,pausedRef.current||finishOnce.current);},onEffect:effect=>{sound.current?.effect(effect);ambience.current?.effect(effect);if(effect==='pickup'){powerSpinUntil.current=Date.now()+1250;setPowerRevealed(false);setPowerRolling(true);setPowerSpinIndex(0);}},onFinish:(dur,best)=>{void finish(dur,best);},
     onSnapshot:roomId?(st)=>{
      const t=performance.now();if(t-lastSent.current<120)return;lastSent.current=t;
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
   }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'3D motor yüklenemedi.');}
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
 // iOS Safari may cancel pointer capture or fire touchend before pointerup.
 // Track each finger at the DOM level; two simultaneous pedals/directions stay held.
 useEffect(() => {
  if (renderMode !== 'mobile') return;
  const root = raceRoot.current;
  if (!root) return;
  type DriveKey = 'left'|'right'|'brake'|'throttle';
  const fingers = new Map<number, DriveKey>();
  const valid = (s: string | undefined): s is DriveKey =>
   s === 'left' || s === 'right' || s === 'brake' || s === 'throttle';
  const startTouch = (ev: TouchEvent) => {
   let handled = false;
   for (const touch of Array.from(ev.changedTouches)) {
    const node = touch.target;
    const button = node instanceof Element ? node.closest<HTMLButtonElement>('[data-kr-drive]') : null;
    const key = button?.dataset.krDrive;
    if (!button || !root.contains(button) || !valid(key)) continue;
    fingers.set(touch.identifier, key);
    lastInputMode.current = 'touch';
    down(key, true);
    handled = true;
   }
   if (handled && ev.cancelable) ev.preventDefault();
  };
  const endTouch = (ev: TouchEvent) => {
   let handled = false;
   for (const touch of Array.from(ev.changedTouches)) {
    const key = fingers.get(touch.identifier);
    if (!key) continue;
    fingers.delete(touch.identifier);
    if (![...fingers.values()].includes(key)) down(key, false);
    handled = true;
   }
   if (handled && ev.cancelable) ev.preventDefault();
  };
  const releaseAll = () => {
   fingers.clear();
   for (const key of ['left','right','brake','throttle'] as const) down(key, false);
  };
  const onVisibility = () => { if (document.hidden) releaseAll(); };
  root.addEventListener('touchstart', startTouch, {passive:false});
  root.addEventListener('touchend', endTouch, {passive:false});
  root.addEventListener('touchcancel', endTouch, {passive:false});
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
   root.removeEventListener('touchstart', startTouch);
   root.removeEventListener('touchend', endTouch);
   root.removeEventListener('touchcancel', endTouch);
   window.removeEventListener('blur', releaseAll);
   document.removeEventListener('visibilitychange', onVisibility);
   releaseAll();
  };
 }, [renderMode, down]);
 const pressProps=(k:'left'|'right'|'brake'|'throttle')=>({
  'data-kr-drive':k,
  onPointerDown:(e:ReactPointerEvent<HTMLButtonElement>)=>{
   if(e.pointerType==='touch' && 'ontouchstart' in window) return; // native touch path owns this finger
   e.preventDefault();e.stopPropagation();lastInputMode.current='touch';
   down(k,true);try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}
  },
  onPointerUp:(e:ReactPointerEvent<HTMLButtonElement>)=>{if(e.pointerType!=='touch'||!('ontouchstart' in window))down(k,false);},
  onPointerCancel:(e:ReactPointerEvent<HTMLButtonElement>)=>{if(e.pointerType!=='touch'||!('ontouchstart' in window))down(k,false);},
  onLostPointerCapture:(e:ReactPointerEvent<HTMLButtonElement>)=>{if(e.pointerType!=='touch'||!('ontouchstart' in window))down(k,false);},
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
 const neighbors=classification.filter(x=>Math.abs(x.pos-hud.rank)<=2);
 const rearThreat=(hud.rivals||[]).filter(r=>r.id!==userId).map(r=>{
  const fractional=((r.progress-(hud.progress||0))%1+1)%1;
  const behind=fractional>.5?1-fractional:0;
  return {...r,meters:behind*TRACK_METERS};
 }).filter(r=>r.meters>0&&r.meters<120).sort((a,b)=>a.meters-b.meters)[0];
 const threatSide=rearThreat?(rearThreat.lane??0)<((hud.rivals||[]).find(r=>r.id===userId)?.lane??0)?'left':'right':'center';
 const elapsed=Math.max(0,hud.elapsed);
 const standings=[...members].sort((a,b)=>(b.kr_points||0)-(a.kr_points||0)||(b.kr_last_award||0)-(a.kr_last_award||0));
 const champion=members.find(x=>x.user_id===championId);
 const multiplayerGrid=[...members].sort((a,b)=>gridHash(String(startAt)+a.user_id)-gridHash(String(startAt)+b.user_id));
 const gridSlot=roomId?Math.max(0,multiplayerGrid.findIndex(m=>m.user_id===userId)) : gridHash(String(startAt)+userId)%22;
 const everyoneFinished=members.length>=2&&members.every(x=>x.finish_ms!==null);
 const raceView=<section className={`${s.raceScreen} ${ended!==null?s.paradeMode:''}`} data-kr-fullscreen={isFullscreen?"true":"false"} ref={raceRoot}
  onPointerDownCapture={()=>{sound.current?.activate();ambience.current?.activate();venueAudio.current?.activate();}}>
  <canvas ref={canvas} className={s.canvas} aria-label="Kart Rush 3D yarış pisti" />
  <div className={s.racingVignette} aria-hidden="true" />
  <div className={s.topHud}>
   <div className={`${s.hudBlock} ${s.hudPosition}`}><span>SIRA</span><strong>{hud.rank}<small> / {hud.total}</small></strong></div>
   <div className={`${s.hudBlock} ${s.hudLap}`}><span>TUR</span><strong>{hud.lap}<small> / {hud.totalLaps}</small></strong></div>
   <div className={`${s.hudBlock} ${s.hudTime}`}><span>SÜRE</span><strong>{Math.floor(elapsed/60).toString().padStart(2,'0')}:{Math.floor(elapsed%60).toString().padStart(2,'0')}<small>.{Math.floor(elapsed*10)%10}</small></strong></div>
   <div className={`${s.hudBlock} ${s.bestBlock}`}><span>EN İYİ</span><strong>{hud.bestLapMs?((hud.bestLapMs)/1000).toFixed(2):'—'}<small> s</small></strong></div>
  </div>
   <div className={s.krHealthPower} aria-label="Araç sağlığı ve mevcut özel güç">
    <div className={s.krHealth}><span>♥ ARAÇ SAĞLIĞI <b>%{hud.health}</b></span><div className={s.krHealthBar}><i style={{width:`${hud.health}%`,background:hud.health>55?'#28d69c':hud.health>25?'#f9bd4f':'#fc465c'}}/></div></div>
    <button type="button" disabled={!ability} onClick={fire} className={s.krPowerUse}><strong>{ability?`${POWER_ICON[ability]} ${LABEL[ability]}`:'✦ GÜÇ YOK'}</strong><small>{ability?'GÜCÜ KULLAN · E':'KAPSÜL TOPLA'}</small></button>
   </div>
   {rearThreat&&hud.started&&ended===null&&<div className={`${s.krRearAlert} ${rearThreat.meters<20?s.krRearDanger:''}`} role="status"><strong>{threatSide==='left'?'↙':threatSide==='right'?'↘':'↓'}</strong><span>{rearThreat.meters<20?'DİKKAT · YAKIN ARAÇ':'ARKADAN YAKLAŞIYOR'}<small>{rearThreat.name} · {Math.round(rearThreat.meters)} m</small></span></div>}
  <div className={s.krNearbyStandings}><strong>YAKIN SIRALAMA</strong>{neighbors.map(p=><div key={p.id} className={p.id===userId?s.krNearbySelf:''}><b>P{p.pos}</b><span>{p.id===userId?'SEN':p.name.split(' ').slice(-1)[0]}</span><small>{p.id===userId?'—':`${Math.round(Math.abs((p.progress-(hud.progress||0))*TRACK_METERS))} m`}</small></div>)}</div>
  <div className={s.raceActions}>
   <button type="button" className={s.mobilePauseBtn} onClick={()=>{
     const opening=!mobileMenuOpen;
     if(opening){down('left',false);down('right',false);down('throttle',false);down('brake',false);}
     if(!roomId&&opening!==pausedRef.current)togglePause();
     setShowGraphics(false);setShowLeaderboard(false);setMobileMenuOpen(opening);
   }}>{mobileMenuOpen?'✕ KAPAT':roomId?'☰ MENÜ':'Ⅱ DURAKLAT'}</button>
   <button type="button" className={s.hudCameraBtn}
    onTouchEnd={(e)=>{e.preventDefault();e.stopPropagation();lastCameraTouch.current=Date.now();cycleCamera();}}
    onClick={()=>{if(Date.now()-lastCameraTouch.current>550)cycleCamera();}}
    aria-label="Kamerayı değiştir">▣ KAMERA<small>{cameraName}</small></button>
   <button type="button" onClick={()=>setShowGraphics(v=>!v)} className={s.graphicsToggle} aria-label="Grafik ve ses ayarları" aria-expanded={showGraphics}>⚙ AYARLAR <span>{graphics==='ultra'?'ULTRA':graphics==='high'?'YÜKSEK':graphics==='low'?'DÜÅÜK':'DENGELİ'}</span></button>
   <button type="button" onClick={()=>void toggleFullscreen()} className={s.fullscreenBtn}>{isFullscreen?'✕ ÇIK':'⛶ TAM'}</button>
   {!roomId&&<button type="button" className={s.fullscreenBtn} onClick={togglePause}>{paused?'▶ DEVAM':'Ⅱ DURAKLAT'}</button>}
   <button className={s.exitBtn} onClick={onExit}>← Çıkış</button>
  </div>
  {showGraphics&&<div className={s.graphicsOverlay}>
   <div className={s.graphicsOverlayTitle}><strong>GÖRÜNTÜ + SES</strong><span>{hud.fps||'--'} FPS</span></div>
   <div className={s.overlayIntro}>F1 SOCIAL KART RUSH · 22 ARAÇLIK GRID · GECE GRAND PRIX</div>
   <div className={s.graphicsOptions}>{([{id:'low',name:'DÜÅÜK',desc:'Performans'},{id:'balanced',name:'DENGELİ',desc:'Normal'},{id:'high',name:'YÜKSEK',desc:'Güçlü detay'},{id:'ultra',name:'ULTRA',desc:'Tribün / gökyüzü / maksimum detay'}] as const).map(q=><button type="button" key={q.id} className={graphics===q.id?s.selectedGraphics:''} onClick={()=>onGraphicsChange?.(q.id)}><strong>{q.name}</strong><small>{q.desc}</small></button>)}</div>
   <label className={s.volumeLabel}>SES DÜZEYİ <strong>{Math.round(volume*100)}%</strong><input type="range" min="0" max="100" value={Math.round(volume*100)} onChange={e=>{const v=Number(e.target.value)/100;onVolumeChange?.(v);sound.current?.activate();}}/></label>
   <button type="button" className={s.muteBtn} onClick={()=>onVolumeChange?.(volume>0?0:.45)}>{volume>0?'♫ SESİ KAPAT':'♫ SESİ AÇ'}</button>
    <div style={{display:'grid',gap:8,margin:'12px 0',padding:12,border:'1px solid rgba(226,237,245,.22)',borderRadius:11,background:'rgba(9,20,33,.85)',color:'#fff'}}>
     <strong style={{fontSize:13}}>🎮 OYUN KOLU</strong>
     <small style={{opacity:.82}}>{gamepadName ? `Bağlı: ${gamepadName}` : 'Kol bağlı değil · USB/Bluetooth ile bağlayıp herhangi bir düğmeye bas'}</small>
     <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
      {([['auto','OTOMATİK'],['xbox','XBOX'],['ps5','PS5'],['custom','ÖZEL'],['off','KAPALI']] as const).map(([id,label])=><button key={id} type="button" onClick={()=>setGamepadProfile(id)} style={{padding:'7px 10px',fontSize:10,borderRadius:7,border:'1px solid '+(gamepadProfile===id?'#ffb3bf':'#8491a3'),background:gamepadProfile===id?'#913144':'#182738',color:'#fff',fontWeight:800}}>{label}</button>)}
     </div>
     <small style={{opacity:.82}}>Sol analog: direksiyon · RT/R2: gaz · LT/L2: fren · A/✕: güç · Y/△: kamera · LB/L1: arka bakış · X/□: korna</small>
     {gamepadProfile==='custom'&&<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:6}}>
      {PAD_ACTIONS.map(([action,label])=><label key={action} style={{display:'grid',gap:4,fontSize:10,fontWeight:800}}>{label}<select value={gamepadBindings[action]} onChange={ev=>setGamepadBindings(prev=>({...prev,[action]:Number(ev.target.value)}))} style={{background:'#14253a',color:'#fff',padding:6,border:'1px solid #758da3',borderRadius:6}}>
       {Array.from({length:18},(_,i)=><option key={i} value={i}>{i===0?'A / ✕':i===1?'B / ○':i===2?'X / □':i===3?'Y / △':i===4?'LB / L1':i===5?'RB / R1':i===6?'LT / L2':i===7?'RT / R2':`Düğme ${i}`}</option>)}
      </select></label>)}
     </div>}
    </div>
   <p>🏁® Gamepad ayarları ve tuş atamaları üstte · W gaz · S fren · A/D GERÇEK DİREKSİYON (otomatik dönüş kapalı) · V kamera değiştir · C basılı tut: arkaya bak · E güç · H korna · F tam ekran.</p>
  </div>}
  {mobileMenuOpen&&ended===null&&<div className={s.mobileMenuOverlay} role="dialog" aria-modal="true" aria-label="Yarış ayarları">
   <div className={s.mobileMenuCard}>
    <div className={s.mobileMenuHeader}><span>F1 SOCIAL · KART RUSH</span><h2>{roomId?'YARIŞ MENÜSÜ':'YARIŞ DURAKLATILDI'}</h2><p>{roomId?'Çevrimiçi yarış bu menüde de devam eder.':'Yarış durdu. Ayarlarını değiştirdikten sonra devam edebilirsin.'}</p></div>
    <div className={s.mobileMenuSection}><strong>GRAFİK KALİTESİ</strong>
     <div className={s.mobileGraphicsGrid}>{([{id:'low',label:'EKO'},{id:'balanced',label:'DENGELİ'},{id:'high',label:'YÜKSEK'},{id:'ultra',label:'ULTRA'}] as const).map(q=><button type="button" key={q.id} className={graphics===q.id?s.mobileSelected:''} onClick={()=>onGraphicsChange?.(q.id)}>{q.label}</button>)}</div>
     <small>Mobilde çözünürlük ve çizim yoğunluğu otomatik dengelenir.</small>
    </div>
    <div className={s.mobileMenuSection}><strong>SES</strong>
     <button type="button" className={s.mobileAudioButton} onClick={()=>{
      enableAudio();if(volume<=.01)onVolumeChange?.(.62);
      sound.current?.effect('horn');
     }}>♫ SESİ ETKİNLEÅTİR / TEST ET</button>
     <label className={s.mobileVolume}>SES DÜZEYİ · {Math.round(volume*100)}%
      <input type="range" min="0" max="100" value={Math.round(volume*100)} onChange={e=>{
       const v=Number(e.target.value)/100;onVolumeChange?.(v);enableAudio();
      }}/>
     </label>
    </div>
    <div className={s.mobileMenuSection}><strong>YARIŞ SEÇENEKLERİ</strong>
     <div className={s.mobileMenuChoices}>
      <button type="button" onClick={()=>{setShowLeaderboard(v=>!v);setMobileMenuOpen(false);if(!roomId&&pausedRef.current)togglePause();}}>☷ SIRALAMA</button>
      <button type="button" onClick={()=>{void toggleFullscreen();}}>⛶ TAM EKRAN</button>
      <button type="button" onClick={onExit}>← ANA MENÜ</button>
     </div>
    </div>
    <button type="button" className={s.mobileResumeBtn} onClick={()=>{
      if(!roomId&&pausedRef.current)togglePause();setMobileMenuOpen(false);
     }}>▶ YARIŞA DEVAM ET</button>
   </div>
  </div>}
  {paused&&!mobileMenuOpen&&!roomId&&ended===null&&<div className={s.pauseOverlay}><div className={s.pauseCard}><small>F1 MEDİPOL</small><h2>YARIŞ DURAKLATILDI</h2><p>Ayarları değiştirebilir veya ana menüye dönebilirsin.</p><button onClick={togglePause}>▶ Yarışa devam</button><button onClick={onExit}>← Ana menü</button></div></div>}
  <div className={s.sideHud}>
   <div className={s.cameraControls}>
     <span>KAMERA <strong>{rearHeld?'ARKA BAKIŞ AKTİF':'ÖN KAMERA'}</strong></span>
    <div>
     <button type="button" onClick={cycleCamera} title="V: Kamera değiştir">V · KAMERA</button>
     <button type="button" className={rearHeld?s.cameraRearActive:''}
      onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);setRearCamera(true);}}
      onPointerUp={()=>setRearCamera(false)} onPointerCancel={()=>setRearCamera(false)}
      onLostPointerCapture={()=>setRearCamera(false)} title="C: Arkaya bak">C · ARKA</button>
    </div>
   </div>
 
  </div>
  <button type="button" className={s.leaderboardToggle} onClick={()=>setShowLeaderboard(v=>!v)} aria-expanded={showLeaderboard}>{showLeaderboard?'✕ KAPAT':'☷ SIRALAMA'} <span>{hud.rank}/{hud.total}</span></button>
  <div className={`${s.standings} ${showLeaderboard?s.boardOpen:''}`} aria-label="Canlı yarış sıralaması">
   <div className={s.standingsTitle}><strong>LIVE CLASSIFICATION</strong><small>GAP TO LEADER</small></div>
   {classification.map((p)=><p key={p.id} className={p.id===userId?s.isMe:''}><i>{p.pos}</i><span style={{background:p.color}}/><b>{p.id===userId?'SEN':p.name}</b><small>{p.gapLabel}</small></p>)}
  </div>
  {hud.pit&&<div className={s.pitIndicator}>PIT ALANI · {hud.pitProgress>0?`SERVİS %${Math.round(hud.pitProgress*100)}`:'GAZI BIRAK VE DUR'}<div><i style={{width:`${hud.pitProgress*100}%`}}/></div></div>}
  {hud.magnet&&<div className={s.magnetIndicator}>⊕ MIKNATIS AKTİF</div>}
  {hud.cornerSpeed&&hud.speed>hud.cornerSpeed+18&&<div className={s.cornerAlert}>â⚠ SERT VİRAJ · FREN · {hud.cornerSpeed} KM/SA</div>}
  {hud.offroad&&<div className={s.offroad}>âš  PİST DIŞINDASIN · FRENLE, DİREKSİYONLA GERİ DÖN</div>}
  {hud.shield&&<span className={s.activeShield}>⬡ KALKAN AKTİF</span>}
  {hud.turbo&&<span className={s.activeTurbo}>⚡ TURBO AKTİF</span>}
  {/* Start lights are rendered by the 3D circuit; no blocking overlay or risk-card popup. */}
  {error&&<p role="alert" className={s.raceError}>{error}</p>}
  <div className={s.raceBottom}>
   {showTouchControls&&<div className={s.steerControls}><button {...pressProps('left')} aria-label="Sola dön">◀</button><button {...pressProps('right')} aria-label="Sağa dön">▶</button></div>}
   <div className={s.controlsCenter} style={!showTouchControls?{maxWidth:'min(760px,calc(100vw - 28px))',margin:'0 auto'}:undefined}><span>W · GAZ &nbsp; S · FREN &nbsp; A/D · MANUEL DİREKSİYON &nbsp; V · KAMERA &nbsp; C · ARKA BAKIÅ &nbsp; E · GÜÇ</span><small>{roomId?'ÇEVRİM İÇİ GRAND PRIX':`ANTRENMAN · ${difficulty==='easy'?'KOLAY':difficulty==='hard'?'UZMAN':'ORTA'}`}</small></div>
   {showTouchControls&&<div className={s.abilityControls}><button type="button" className={s.hornBtn} onPointerDown={e=>{e.preventDefault();lastInputMode.current='touch';setShowTouchControls(true);horn();}}>♫ KORNA</button><button {...pressProps('throttle')} className={s.gas}>GAZ</button><button {...pressProps('brake')} className={s.brake}>FREN</button>
    <button onPointerDown={e=>{e.preventDefault();lastInputMode.current='touch';setShowTouchControls(true);fire();}} onClick={e=>{if(e.detail===0)fire();}} disabled={!ability} className={`${s.powerBtn} ${ability? s.powerReady:''}`} style={ability?{'--ability-color':POWER_COLORS[ability]} as CSSProperties:undefined}>
      <span>{ability?POWER_ICON[ability]:'✦'}</span><small>{ability?LABEL[ability]:'GÜÇ TOPLA'}</small>
     </button>
   </div>}
  </div>
  {(powerRolling||powerRevealed)&&<div className={s.mobilePowerReveal} aria-live="polite" style={{position:'absolute',top:'40%',left:'50%',transform:'translate(-50%,-50%)',zIndex:11,background:'rgba(6,13,26,.90)',border:'2px solid #f0ad57',borderRadius:18,padding:'15px 27px',minWidth:230,textAlign:'center',pointerEvents:'none',boxShadow:'0 10px 70px #050a17ca'}}>
   <div style={{color:'#eebf7b',fontSize:11,letterSpacing:3,fontWeight:900}}>✦ GÜÇ KAZANILDI ✦</div>
   <div style={{fontSize:43,margin:'6px 0',animation:'krPowerPop .16s ease-out infinite alternate'}}>{powerRolling?POWER_ICON[(Object.keys(LABEL) as KartPower[])[powerSpinIndex]]:ability?POWER_ICON[ability]:'✦'}</div>
   <strong style={{fontSize:18}}>{powerRolling?LABEL[(Object.keys(LABEL) as KartPower[])[powerSpinIndex]]:ability?LABEL[ability]:'GÜÇ HAZIR'}</strong>
   <div style={{display:'flex',gap:3,marginTop:10}}>{(Object.keys(LABEL) as KartPower[]).map(p=><i key={p} style={{height:3,flex:1,background:POWER_COLORS[p],opacity:powerSpinIndex===(Object.keys(LABEL) as KartPower[]).indexOf(p)?1:.24}}/>)}</div>
   <style>{`@keyframes krPowerPop{from{transform:scale(.90);filter:brightness(.9)}to{transform:scale(1.06);filter:brightness(1.2)}}`}</style>
  </div>}
  {ended!==null&&<div className={s.finishNotice} role="status">
   <span>🏁 FİNİŞ · {(ended/1000).toFixed(2)} sn</span>
   <button type="button" onClick={()=>setShowResults(v=>!v)}>{showResults?'✕ KAPAT':'🏁† SONUÇLARI GÖR'}</button>
  </div>}
  {ended!==null&&showResults&&<div className={s.endOverlay}><div className={s.endCard} style={{width:"min(780px,96vw)",maxWidth:"780px",maxHeight:"90%",overflowY:"auto",padding:"clamp(16px,3vw,30px)"}}>
    <span>🏁 DAMALI BAYRAK</span><h2>{roomId ? 'Yarış tamamlandı!' : `P${hud.rank} · FİNİŞ ${roundNo} · ${roundScored ? 'Puanlar hesaplandı.' : 'Diğer oyuncuların bitirmesi bekleniyor.'}`}</h2>
   <div className={s.finalTime}>{(ended/1000).toFixed(2)} <small>sn</small></div>
   <p>{roomId?(championshipEnabled?`Åampiyona yarışı ${roundNo} · ${roundScored?'Puanlar hesaplandı.':'Diğer oyuncuların bitirmesi bekleniyor.'}`:'Sonucun lobiye kaydedildi. Diğer yarışçıları bekleyebilirsin.'):`Zorluk: ${difficulty==='easy'?'Kolay':difficulty==='hard'?'Uzman':'Orta'} · En iyi tur: ${(hud.bestLapMs||ended)/1000} sn`}</p>
   {roomId&&championshipEnabled&&<div style={{padding:'10px',border:'1px solid #6b748e65',borderRadius:12,display:'grid',gap:7,background:'rgba(11,17,28,.83)'}}>
    <strong style={{fontSize:14}}>🏁† PUAN DURUMU · HEDEF {pointsTarget} PUAN</strong>
    {standings.map((m,i)=><div key={m.user_id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'8px',background:'rgba(255,255,255,.045)',borderRadius:7}}><span>{i+1}. {m.nickname}{m.user_id===userId?' (SEN)':''}</span><strong>{m.kr_points||0} {roundScored?`(+${m.kr_last_award||0})`:''}</strong></div>)}
    {champion&&<strong style={{color:'#ffe188'}}>🏁† ÅAMPİYON: {champion.nickname} · {champion.kr_points||0} PUAN</strong>}
    {!roundScored&&isHost&&<p>Diğer yarışçıları bekle. İstersen bitiremeyenleri DNF sayıp puanlamayı onaylayabilirsin.</p>}
   </div>}
   <div className={s.results} style={{maxHeight:270,gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',margin:'12px 0'}}>
    {(roomId?[...members].sort((a,b)=>(a.finish_ms===null?1:0)-(b.finish_ms===null?1:0)||(a.finish_ms||0)-(b.finish_ms||0))
      .map((m,i)=>({id:m.user_id,name:m.nickname,color:m.color,rank:i+1,time:m.finish_ms,points:m.kr_points||0}))
     : classification.map(m=>({id:m.id,name:m.name,color:m.color,rank:m.pos,time:m.id===userId?ended:null,points:0}))).map(m=><div key={m.id} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 12px',borderLeft:'3px solid '+m.color,background:m.id===userId?'rgba(220,52,76,.18)':undefined}}>
       <b style={{minWidth:26,color:m.rank<=3?'#ffdd86':'#d9e2ee'}}>P{m.rank}</b>
       <span style={{minWidth:0,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.id===userId?'SEN':m.name}</span>
       <small style={{whiteSpace:'nowrap'}}>{m.time!==null?(m.time/1000).toFixed(2)+' sn':roomId?'YARIŞTA':'SIRALAMA'}</small>
      </div>)}
   </div>
   {!roomId&&onRetry&&<button onClick={onRetry}>↻ Tekrar yarış</button>}
   {roomId&&isHost&&championshipEnabled&&!roundScored&&onFinalize&&<button onClick={onFinalize}>{everyoneFinished?'🏁† PUANLARI HESAPLA':'🏁 KALANLARI DNF SAY VE PUANLA'}</button>}
   {roomId&&isHost&&championshipEnabled&&roundScored&&!championId&&onNextRound&&<button onClick={onNextRound}>🏁 SONRAKİ YARIŞ · PUANLAR KORUNACAK</button>}
   {roomId&&championshipEnabled&&roundScored&&championId&&<strong>🏁† ÅAMPİYONA TAMAMLANDI · {champion?.nickname||'ÅAMPİYON'}</strong>}
   {roomId&&isHost&&!championshipEnabled&&onReset&&<button onClick={onReset}>↻ AYNI LOBİDE YENİ YARIŞ</button>}
   {roomId&&!isHost&&<p>Yeni yarış için lobi sahibinin başlatmasını bekleyebilirsin.</p>}
   <button type="button" onClick={()=>setShowResults(false)}>🏁ï¸ Araçları izle</button>
    <button onClick={onExit}>{roomId ? "✕ LOBİDEN AYRIL" : "Arcade'e dön"}</button>
  </div></div>}
 </section>;
 if(renderMode==='pending')return null;
 return renderMode==='mobile'?createPortal(raceView,document.body):raceView;
}
