"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
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
const LABEL:Record<KartPower,string>={turbo:'TURBO',shield:'KALKAN',emp:'EMP DARBESİ',repair:'ONARIM',pulse:'ŞOK DALGASI',magnet:'MIKNATIS'};
const DETAILS:Record<KartPower,string>={turbo:'Hız patlaması · 3,5 sn',shield:'Darbe koruması · 7 sn',emp:'Yakındaki en fazla 2 hedefi yavaşlat',repair:'Aracın hasarını azalt',pulse:'Yakındaki en yakın rakibe şok',magnet:'11 sn uzaktan güç toplama'};
const POWER_ICON:Record<KartPower,string>={turbo:'⚡',shield:'⬡',emp:'✺',repair:'✚',pulse:'◉',magnet:'⊕'};
type PadAction='throttle'|'brake'|'power'|'camera'|'lookBack'|'horn';
type PadProfile='auto'|'xbox'|'ps5'|'custom'|'off';
type PadBindings=Record<PadAction,number>;
const DEFAULT_PAD:PadBindings={throttle:7,brake:6,power:0,camera:3,lookBack:4,horn:2};
const PS5_PAD:PadBindings={throttle:7,brake:6,power:0,camera:3,lookBack:4,horn:2};
const PAD_ACTIONS:[PadAction,string][]=[['throttle','GAZ'],['brake','FREN'],['power','ÖZEL GÜÇ'],['camera','KAMERA'],['lookBack','ARKAYA BAK'],['horn','KORNA']];
const POWER_COLORS:Record<KartPower,string>={turbo:'#ffbc4e',shield:'#52e4ff',emp:'#cc8fff',repair:'#6ed5a1',pulse:'#e78bff',magnet:'#e0cf8d'};
const RACE_TEAM_LABELS:Record<string,string>={'#E32636':'FERRARI','#FF8000':'McLAREN','#00D2BE':'MERCEDES','#173B8A':'RED BULL','#006A4E':'ASTON MARTIN','#2B7BFF':'WILLIAMS','#FF6DAE':'ALPINE','#C4CFD8':'HAAS','#F4F5F7':'RACING BULLS','#B11F26':'AUDI','#B4AA78':'CADILLAC'};
const raceTeamName=(color:string)=>RACE_TEAM_LABELS[color.toUpperCase()]||'ÖZEL KAPLAMA';
const gridHash=(text:string)=>{let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return n>>>0;};
function trackXY(progress:number){
 const {x,z}=trackPosition(progress);
 return {x:69+x*.059,y:49+z*.066};
}
const MAP_PATH=Array.from({length:141},(_,i)=>{const p=trackXY(i/140);return (i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2)}).join(' ');
function TrackMiniMap({hud,id}: {hud:KartHud;id:string}){
 return <div className={s.miniMap} aria-label="Pist haritası">
  <svg viewBox="0 0 138 98" role="img" aria-label="Yarışçıların pistteki konumu">
   <path d={MAP_PATH} stroke="rgba(2,9,19,.75)" strokeWidth="10" fill="none" strokeLinejoin="round" />
   <path d={MAP_PATH} stroke="#718598" strokeWidth="6.5" fill="none" strokeLinejoin="round" />
   <path d={MAP_PATH} stroke="rgba(224,240,248,.55)" strokeWidth="1.3" strokeDasharray="3 7" fill="none" />
   {(hud.rivals||[]).filter(r=>r.id!==id).map(r=>{const q=trackXY(r.progress);return <circle key={r.id} cx={q.x} cy={q.y} r="3.4" fill={r.color} stroke="#fff" strokeWidth="1.2"/>;})}
   {(()=>{const q=trackXY(hud.progress||0);return <circle cx={q.x} cy={q.y} r="5.4" fill="#ffed69" stroke="#fff" strokeWidth="1.6"/>;})()}
  </svg><small>PİST TAKİBİ</small>
 </div>;
}
export default function KartRushTrack({supabase,roomId,userId,displayName,color,startAt,members,onExit,onReload,onReset,onRetry,isHost=false,difficulty='normal',laps=3,pace='standard',weather='clear',graphics='balanced',onGraphicsChange,volume=.45,onVolumeChange,championshipEnabled=false,pointsTarget=50,roundNo=1,roundScored=false,championId=null,onFinalize,onNextRound}:Props){
 const canvas=useRef<HTMLCanvasElement|null>(null),engine=useRef<KartRushEngine|null>(null);
 const raceRoot=useRef<HTMLElement|null>(null);
 const channel=useRef<ReturnType<SupabaseClient['channel']>|null>(null);
 const friends=useRef<Map<string,KartState>>(new Map());
 const lastSent=useRef(0);
 const [hud,setHud]=useState<KartHud>({speed:0,lap:1,totalLaps:3,remaining:3,health:100,pit:false,pitProgress:0,magnet:false,lights:0,power:null,rank:1,total:6,elapsed:0,started:false,countdown:20,shield:false,turbo:false});
 const [error,setError]=useState(''),[ended,setEnded]=useState<number|null>(null);
 const [showResults,setShowResults]=useState(false);
 const [preRaceChoice,setPreRaceChoice]=useState<'boost'|'penalty'|null>(null);
 const previousRank=useRef<number|null>(null);
 const [showGraphics,setShowGraphics]=useState(false);
 const [powerRolling,setPowerRolling]=useState(false);
 const [powerRevealed,setPowerRevealed]=useState(false);
 const powerRevealTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [powerSpinIndex,setPowerSpinIndex]=useState(0);
 const powerSpinUntil=useRef<number>(0);
 const [showLeaderboard,setShowLeaderboard]=useState(false);
 const [cameraName,setCameraName]=useState('TAKİP');
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
 const [audioEnabled,setAudioEnabled]=useState(false);
 const [startSoundsEnabled,setStartSoundsEnabled]=useState(true);
 const startSoundsRef=useRef(true);
 const toggleStartSounds=useCallback(()=>{setStartSoundsEnabled(v=>{startSoundsRef.current=!v;return !v;});},[]);
 const enableAudio=useCallback(()=>{
  sound.current?.activate();
  ambience.current?.activate();
  venueAudio.current?.activate();
  setAudioEnabled(true);
 },[]);
 // Audio is enabled by default; browsers may require the first key/tap gesture to unlock it.
 useEffect(()=>{const unlock=()=>enableAudio();window.addEventListener('pointerdown',unlock,{once:true});window.addEventListener('keydown',unlock,{once:true});return()=>{window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);};},[enableAudio]);
 const [isFullscreen,setIsFullscreen]=useState(false);
 const finishOnce=useRef(false),controls=useRef({left:false,right:false,brake:false,throttle:false});
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
   if(currentName!==nextName){currentName=nextName;setGamepadName(nextName);}
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
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
  const activate=async()=>{
   try{
    const {KartRushEngine:Engine}=await import('./engine');
    if(cancelled||!canvas.current)return;
    inst=new Engine(canvas.current,{id:userId,name:displayName,color,startAt:startAt+15000,gridSlot,bots:!roomId,difficulty,laps,pace,weather,graphics,
     onHud:next=>{setHud(next);sound.current?.update(next.speed,Boolean(next.throttle),pausedRef.current||finishOnce.current,Boolean(next.braking));sound.current?.startSignal(next.lights,next.started,pausedRef.current||finishOnce.current||!startSoundsRef.current);ambience.current?.update(next,userId,TRACK_METERS,pausedRef.current||finishOnce.current);venueAudio.current?.update(next.progress||0,next.speed,next.started,pausedRef.current||finishOnce.current);},onEffect:effect=>{sound.current?.effect(effect);ambience.current?.effect(effect);if(effect==='pickup'){powerSpinUntil.current=Date.now()+1250;setPowerRevealed(false);setPowerRolling(true);setPowerSpinIndex(0);}},onFinish:(dur,best)=>{void finish(dur,best);},
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
   }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'3D motor yüklenemedi.');}
  };
  void activate();
  return()=>{cancelled=true;window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);inst?.dispose();engine.current=null;if(currentChannel)void supabase.removeChannel(currentChannel);channel.current=null;};
  // For online races, roster is frozen for the duration of this match.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[roomId,userId,color,displayName,startAt,difficulty,laps,pace,weather,toggleFullscreen,togglePause,horn,cycleCamera,setRearCamera]);
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
  onPointerDown:(e:ReactPointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);down(k,true);},
  onPointerUp:()=>down(k,false),onPointerCancel:()=>down(k,false),onLostPointerCapture:()=>down(k,false),
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
 const startGrid=roomId?multiplayerGrid.map((m,i)=>({id:m.user_id,name:m.nickname,color:m.color,slot:i}))
  : (hud.rivals||[]).map(m=>({id:m.id,name:m.name,color:m.color,slot:0}));
 const arrangedGrid=roomId?startGrid:[...startGrid].sort((a,b)=>{const pa=(hud.rivals||[]).find(m=>m.id===a.id)?.progress??0;const pb=(hud.rivals||[]).find(m=>m.id===b.id)?.progress??0;return pb-pa;});
 const rollRisk=()=>{if(preRaceChoice||!engine.current||hud.started||hud.countdown<=5)return;
  const result=engine.current.rollStartEvent();if(result){setPreRaceChoice(result);sound.current?.effect(result==='boost'?'boost':'collision');}};
 const everyoneFinished=members.length>=2&&members.every(x=>x.finish_ms!==null);
 return <section className={`${s.raceScreen} ${ended!==null?s.paradeMode:''}`} ref={raceRoot}>
  <canvas ref={canvas} className={s.canvas} aria-label="Kart Rush 3D yarış pisti" />
  <style>{`@media (pointer:coarse) and (max-width:1100px){
 .${s.raceScreen} .${s.speedHud}{position:absolute!important;top:calc(114px + env(safe-area-inset-top,0px))!important;bottom:auto!important;left:50%!important;right:auto!important;transform:translateX(-50%)!important;min-height:0!important;width:102px!important;padding:5px 8px!important;z-index:16!important;pointer-events:none!important;}
 .${s.raceScreen} .${s.speedHud} b{font-size:31px!important;line-height:1!important;}
 .${s.raceScreen} .${s.raceBottom}{position:absolute!important;bottom:calc(8px + env(safe-area-inset-bottom,0px))!important;top:auto!important;left:calc(5px + env(safe-area-inset-left,0px))!important;right:calc(5px + env(safe-area-inset-right,0px))!important;display:flex!important;align-items:flex-end!important;justify-content:space-between!important;z-index:22!important;}
 .${s.raceScreen} .${s.steerControls}{position:relative!important;align-self:flex-end!important;transform:none!important;bottom:auto!important;top:auto!important;left:auto!important;right:auto!important;}
 .${s.raceScreen} .${s.steerControls} button{height:56px!important;width:48px!important;}
 }
 @media (pointer:coarse) and (orientation:landscape) and (max-height:650px){
 .${s.raceScreen} .${s.speedHud}{top:calc(62px + env(safe-area-inset-top,0px))!important;left:50%!important;width:94px!important;}
 .${s.raceScreen} .${s.speedHud} b{font-size:25px!important;}
 .${s.raceScreen} .${s.steerControls} button{height:50px!important;width:48px!important;}
 }
 @media (pointer:coarse) and (orientation:portrait) and (max-width:1100px){
 .${s.raceScreen} .${s.speedHud}{top:calc(156px + env(safe-area-inset-top,0px))!important;}
 }`}</style>
  {weather==='rain'&&<svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',opacity:.38,zIndex:2}}>
    <defs><pattern id="kr-rain-pattern" width="16" height="24" patternUnits="userSpaceOnUse"><path d="M2 2 L.7 8 M11 12 L9 21" fill="none" stroke="#b2cbdb" strokeWidth=".20" strokeLinecap="round"/><animateTransform attributeName="patternTransform" type="translate" from="0 -24" to="-9 120" dur=".54s" repeatCount="indefinite"/></pattern></defs>
    <rect width="100" height="100" fill="url(#kr-rain-pattern)" />
   </svg>}
  {weather==='rain'&&<div aria-hidden="true" style={{position:'absolute',top:74,left:'50%',transform:'translateX(-50%)',fontSize:11,letterSpacing:'1.3px',fontWeight:800,padding:'6px 12px',borderRadius:7,background:'rgba(9,22,32,.62)',color:'#d7e8f8',pointerEvents:'none',zIndex:4}}>🌧 ISLAK PİST · DAHA UZUN FREN MESAFESİ</div>}
  <div className={s.qualityMark}>KART RUSH <span>G3.5 · IMMERSIVE</span></div>
  <div className={s.racingVignette} aria-hidden="true" />
  <div className={s.broadcastTag}>F1 MEDIPOL · RACE CONTROL</div>
  <div className={s.topHud}>
   <div className={`${s.hudBlock} ${s.hudPosition}`}><span>POS</span><strong>{hud.rank}<small> / {hud.total}</small></strong></div>
   <div className={`${s.hudBlock} ${s.hudLap}`}><span>LAP</span><strong>{hud.lap}<small> / {hud.totalLaps}</small></strong></div>
   <div className={`${s.hudBlock} ${s.hudTime}`}><span>RACE TIME</span><strong>{Math.floor(elapsed/60).toString().padStart(2,'0')}:{Math.floor(elapsed%60).toString().padStart(2,'0')}<small>.{Math.floor(elapsed*10)%10}</small></strong></div>
   <div className={`${s.hudBlock} ${s.bestBlock}`}><span>BEST LAP</span><strong>{hud.bestLapMs?((hud.bestLapMs)/1000).toFixed(2):'—'}<small> s</small></strong></div>
  </div>
  <div className={s.raceActions}>
   <button type="button" onClick={()=>setShowGraphics(v=>!v)} className={s.graphicsToggle} aria-label="Grafik ve ses ayarları" aria-expanded={showGraphics}>⚙ AYARLAR <span>{graphics==='high'?'YÜKSEK':graphics==='low'?'DÜŞÜK':'DENGELİ'}</span></button>
   <button type="button" onClick={()=>void toggleFullscreen()} className={s.fullscreenBtn}>{isFullscreen?'🡼 ÇIK':'⛶ TAM'}</button>
   {!roomId&&<button type="button" className={s.fullscreenBtn} onClick={togglePause}>{paused?'▶ DEVAM':'Ⅱ DURAKLAT'}</button>}
   <button className={s.exitBtn} onClick={onExit}>← Çıkış</button>
  </div>
  {showGraphics&&<div className={s.graphicsOverlay}>
   <div className={s.graphicsOverlayTitle}><strong>GÖRÜNTÜ + SES</strong><span>{hud.fps||'--'} FPS</span></div>
   <div className={s.overlayIntro}>F1 MEDIPOL KART RUSH · 22 ARAÇLIK GRID · GECE GRAND PRIX</div>
   <div className={s.graphicsOptions}>{([{id:'low',name:'DÜŞÜK',desc:'Performans'},{id:'balanced',name:'DENGELİ',desc:'Normal'},{id:'high',name:'YÜKSEK',desc:'Ultra detay'}] as const).map(q=><button type="button" key={q.id} className={graphics===q.id?s.selectedGraphics:''} onClick={()=>onGraphicsChange?.(q.id)}><strong>{q.name}</strong><small>{q.desc}</small></button>)}</div>
   <label className={s.volumeLabel}>SES DÜZEYİ <strong>{Math.round(volume*100)}%</strong><input type="range" min="0" max="100" value={Math.round(volume*100)} onChange={e=>{const v=Number(e.target.value)/100;onVolumeChange?.(v);sound.current?.activate();}}/></label>
   <button type="button" className={s.muteBtn} onClick={()=>onVolumeChange?.(volume>0?0:.45)}>{volume>0?'♬ SESİ KAPAT':'♬ SESİ AÇ'}</button>
   <div style={{display:'grid',gap:8,margin:'12px 0',padding:12,border:'1px solid rgba(226,237,245,.22)',borderRadius:11,background:'rgba(9,20,33,.85)',color:'#fff'}}>
    <strong style={{fontSize:13}}>🎮 OYUN KOLU / TUŞ ATAMASI</strong>
    <small style={{fontSize:11,opacity:.8}}>{gamepadName?`BAĞLI · ${gamepadName}`:'Kol bağlı değil · USB/Bluetooth ile bağlayıp herhangi bir düğmeye bas'}</small>
    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
     {([['auto','OTOMATİK'],['xbox','XBOX'],['ps5','PS5'],['custom','ÖZEL'],['off','KAPALI']] as const).map(([id,label])=><button key={id} type="button" onClick={()=>setGamepadProfile(id)} style={{padding:'7px 10px',fontSize:10,borderRadius:7,border:'1px solid '+(gamepadProfile===id?'#ffb3bf':'#8491a3'),background:gamepadProfile===id?'#913144':'#182738',color:'#fff',fontWeight:800}}>{label}</button>)}
    </div>
    <small style={{opacity:.82}}>Sol analog: direksiyon · RT/R2: gaz · LT/L2: fren · A/✕: güç · Y/△: kamera · LB/L1: arka bakış · X/□: korna</small>
    {gamepadProfile==='custom'&&<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:6}}>
     {PAD_ACTIONS.map(([action,label])=><label key={action} style={{display:'grid',gap:4,fontSize:10,fontWeight:800}}>{label}<select value={gamepadBindings[action]} onChange={ev=>setGamepadBindings(prev=>({...prev,[action]:Number(ev.target.value)}))} style={{background:'#14253a',color:'#fff',padding:6,border:'1px solid #758da3',borderRadius:6}}>
       {Array.from({length:18},(_,i)=><option key={i} value={i}>{i===0?'A / ✕':i===1?'B / ○':i===2?'X / □':i===3?'Y / △':i===4?'LB / L1':i===5?'RB / R1':i===6?'LT / L2':i===7?'RT / R2':`DÜĞME ${i}`}</option>)}
      </select></label>)}
    </div>}
   </div>
   <button type="button" className={s.muteBtn} onClick={toggleStartSounds}>{startSoundsEnabled?'🔊 START IŞIKLARININ SESİNİ KAPAT':'🔇 START IŞIKLARININ SESİNİ AÇ'}</button>
   <p>🎮 Gamepad ayarları ve tuş atamaları üstte · W gaz · S fren · A/D GERÇEK DİREKSİYON (otomatik dönüş kapalı) · V kamera değiştir · C basılı tut: arkaya bak · E güç · H korna · F tam ekran.</p>
  </div>}
  {paused&&!roomId&&ended===null&&<div className={s.pauseOverlay}><div className={s.pauseCard}><small>F1 MEDİPOL</small><h2>YARIŞ DURAKLATILDI</h2><p>Ayarları değiştirebilir veya ana menüye dönebilirsin.</p><button onClick={togglePause}>▶ Yarışa devam</button><button onClick={onExit}>← Ana menü</button></div></div>}
  <div className={s.sideHud}>
   <div className={s.cameraControls}>
    <span>KAMERA <strong>{rearHeld?'ARKA BAKIŞ':cameraName}</strong></span>
    <div>
     <button type="button" onClick={cycleCamera} title="V: Kamera değiştir">V · KAMERA</button>
     <button type="button" className={rearHeld?s.cameraRearActive:''}
      onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);setRearCamera(true);}}
      onPointerUp={()=>setRearCamera(false)} onPointerCancel={()=>setRearCamera(false)}
      onLostPointerCapture={()=>setRearCamera(false)} title="C: Arkaya bak">C · ARKA</button>
    </div>
   </div>
   <TrackMiniMap hud={hud} id={userId}/>
  </div>
  <button type="button" className={s.leaderboardToggle} onClick={()=>setShowLeaderboard(v=>!v)} aria-expanded={showLeaderboard}>{showLeaderboard?'✕ KAPAT':'☰ SIRALAMA'} <span>{hud.rank}/{hud.total}</span></button>
  <button type="button" className={s.mobileCameraToggle} onClick={()=>{sound.current?.activate();ambience.current?.activate();venueAudio.current?.activate();cycleCamera();}} aria-label="Kamerayı değiştir">▣ KAMERA</button>
  <div className={`${s.standings} ${showLeaderboard?s.boardOpen:''}`} aria-label="Canlı yarış sıralaması">
   <div className={s.standingsTitle}><strong>LIVE CLASSIFICATION</strong><small>GAP TO LEADER</small></div>
   {classification.map((p)=><p key={p.id} className={p.id===userId?s.isMe:''}><i>{p.pos}</i><span style={{background:p.color}}/><b>{p.id===userId?'SEN':p.name}</b><small>{p.gapLabel}</small></p>)}
  </div>
  <div className={s.damageHud}><span>ARAÇ DURUMU</span><strong>{hud.health}%</strong><div><i style={{width:`${hud.health}%`,background:hud.health>50?'#65bc91':hud.health>25?'#e1ab54':'#d95757'}}/></div></div>
  {hud.pit&&<div className={s.pitIndicator}>PIT ALANI · {hud.pitProgress>0?`SERVİS %${Math.round(hud.pitProgress*100)}`:'GAZI BIRAK VE DUR'}<div><i style={{width:`${hud.pitProgress*100}%`}}/></div></div>}
  {hud.magnet&&<div className={s.magnetIndicator}>⊕ MIKNATIS AKTİF</div>}
  {preRaceChoice&&hud.started&&hud.elapsed<30&&<div aria-live="polite" style={{position:'absolute',top:'clamp(190px,32vh,280px)',left:10,padding:'7px 10px',fontSize:10,fontWeight:900,borderRadius:8,color:preRaceChoice==='boost'?'#a6f9c0':'#ffb6aa',background:'rgba(4,11,22,.86)',zIndex:9,pointerEvents:'none'}}>{preRaceChoice==='boost'?'⬆ RİSK ÖDÜLÜ · +GÜÇ / TUTUŞ':'⬇ RİSK CEZASI · -GÜÇ / TUTUŞ'} · {Math.ceil(30-hud.elapsed)}sn</div>}
  {cameraName==='KOKPİT'&&<div aria-hidden="true" style={{position:'absolute',bottom:120,left:'50%',transform:'translateX(-50%)',padding:'4px 13px',background:'rgba(7,16,26,.65)',border:'1px solid #ffffff33',borderRadius:10,pointerEvents:'none',zIndex:3,fontSize:10,fontWeight:800,letterSpacing:2}}>◉ KOKPİT KAMERASI</div>}
  <div className={s.speedHud}><small>SPEED {hud.contact?' · TEMAS!':''}</small><b>{hud.speed}</b><span>KM/SA</span><div className={s.speedBar}><i style={{width:Math.min(100,hud.speed/285*100)+'%'}}/></div></div>
  <div className={s.progressLine}><span style={{width:`${Math.max(0,Math.min(100,(hud.progress||0)/hud.totalLaps*100))}%`}}/></div>
  {hud.cornerSpeed&&hud.speed>hud.cornerSpeed+18&&<div className={s.cornerAlert}>⚠ SERT VİRAJ · FREN · {hud.cornerSpeed} KM/SA</div>}
  {hud.offroad&&<div className={s.offroad}>⚠ PİST DIŞINDASIN · FRENLE, DİREKSİYONLA GERİ DÖN</div>}
  {hud.shield&&<span className={s.activeShield}>⬡ KALKAN AKTİF</span>}
  {hud.turbo&&<span className={s.activeTurbo}>⚡ TURBO AKTİF</span>}
  {!hud.started&&ended===null&&hud.countdown>5&&<div className={s.countdown} style={{background:'linear-gradient(90deg,rgba(2,7,17,.32),rgba(5,13,25,.07))',justifyContent:'space-between',alignItems:'center',padding:'clamp(10px,2vw,20px)',pointerEvents:'none'}}>
   <div style={{pointerEvents:'none',position:'absolute',top:'clamp(8px,2vh,18px)',left:'50%',transform:'translateX(-50%)',padding:'7px 20px',background:'rgba(4,9,18,.92)',border:'1px solid #ffffff50',borderRadius:12,fontWeight:950,fontSize:'clamp(18px,3vw,28px)',whiteSpace:'nowrap',zIndex:9}}>🎬 PİST TANITIMI · {Math.max(1,Math.min(15,hud.countdown-5))} SANİYE</div>
   <div className={s.startSequence} style={{pointerEvents:'auto',maxWidth:600,marginTop:58,background:'rgba(6,12,23,.82)',border:'1px solid rgba(255,255,255,.24)',padding:'clamp(12px,2vw,20px)',borderRadius:16,overflowY:'auto',maxHeight:'70%'}}>
    <small>F1 MEDIPOL · RACE DIRECTOR</small>
    <strong style={{fontSize:'clamp(19px,3vw,28px)'}}>GRAND PRIX · GRID WALK</strong>
    <p style={{fontSize:12,margin:'7px 0'}}>🎥 Pist turu · {weather==='rain'?'🌧 YAĞMUR':'☀ KURU'} · {hud.totalLaps} tur · {roomId?'ÇEVRİM İÇİ':'21 AI RAKİP'}</p>
    <div style={{fontSize:11,fontWeight:850,color:'#f5d78b'}}>RASTGELE START GRID · SEN P{gridSlot+1}</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:5,margin:'9px 0',maxHeight:125,overflow:'auto'}}>
     {arrangedGrid.slice(0,roomId?22:12).map((m,i)=><span key={m.id} style={{textAlign:'left',minWidth:0,fontSize:10,padding:'5px 6px',borderRadius:5,borderLeft:'3px solid '+m.color,background:m.id===userId?'rgba(245,198,85,.25)':'rgba(255,255,255,.07)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{i+1}. {m.id===userId?'SEN':m.name} · {raceTeamName(m.color)}</span>)}
    </div>
    <div style={{padding:10,borderRadius:12,background:'rgba(12,26,43,.95)',border:'1px solid rgba(239,193,86,.38)',display:'grid',gap:5}}>
     <strong style={{fontSize:14}}>🎲 START RİSK KARTI</strong>
     {preRaceChoice?<p style={{fontSize:12,margin:0,color:preRaceChoice==='boost'?'#9af3b6':'#ffad99'}}>{preRaceChoice==='boost'?'✅ %15 kalkış gücü ve daha yüksek tutuş · 30 saniye':'⚠️ %12 güç kaybı ve daha az tutuş · 30 saniye'}</p>
      :<><p style={{fontSize:11,margin:0}}>İstersen şansını dene: %50 avantaj / %50 dezavantaj. Katılmadan da yarışabilirsin.</p><button type="button" onClick={rollRisk} style={{border:'1px solid #ffffff7a',borderRadius:9,padding:'9px 12px',background:'#ce3346',color:'#fff',cursor:'pointer',fontWeight:900}}>🎲 RİSKİ AL · RASTGELE ETKİ</button></>}
    </div>
    <small style={{display:'block',marginTop:8}}>Ardından 5 kırmızı ışık · {audioEnabled?'🔊 SES HAZIR':'🔇 SES İÇİN EKRANA DOKUN'}</small>
   </div>
  </div>}
  {!hud.started&&!ended&&hud.countdown<=5&&<div className={s.countdown} style={{pointerEvents:'auto'}}><div className={s.startSequence}><small>F1 MEDİPOL · NIGHT GRAND PRIX</small><em>22 ARAÇ · {hud.totalLaps} TUR · ANA GRID</em><div className={s.startLights}>{[0,1,2,3,4].map(i=><span key={i} className={i<hud.lights?s.lightOn:''}/>)}</div><strong>{hud.lights>0?'LIGHTS ON':'READY TO LAUNCH'}</strong><small>BEŞ KIRMIZI IŞIK · SAKIN ERKEN ÇIKMA</small><button type="button" onClick={toggleStartSounds} style={{marginTop:12,border:'1px solid rgba(255,255,255,.4)',borderRadius:12,padding:'9px 16px',background:'rgba(12,16,24,.82)',color:'#fff',fontWeight:800,cursor:'pointer'}}>{startSoundsEnabled?'🔊 START SESLERİ AÇIK · KAPAT':'🔇 START SESLERİ KAPALI · AÇ'}</button></div></div>}
  {error&&<p role="alert" className={s.raceError}>{error}</p>}
  <div className={s.raceBottom}>
   <div className={s.steerControls}><button {...pressProps('left')} aria-label="Sola dön">◀</button><button {...pressProps('right')} aria-label="Sağa dön">▶</button></div>
   <div className={s.controlsCenter}><span>W · GAZ &nbsp; S · FREN &nbsp; A/D · MANUEL DİREKSİYON &nbsp; V · KAMERA &nbsp; C · ARKA BAKIŞ &nbsp; E · GÜÇ</span><small>{roomId?'ÇEVRİM İÇİ GRAND PRIX':`ANTRENMAN · ${difficulty==='easy'?'KOLAY':difficulty==='hard'?'UZMAN':'ORTA'}`}</small></div>
   <div className={s.abilityControls}><button type="button" className={s.hornBtn} onPointerDown={e=>{e.preventDefault();horn();}}>♫ KORNA</button><button {...pressProps('throttle')} className={s.gas}>GAZ</button><button {...pressProps('brake')} className={s.brake}>FREN</button>
    <button onPointerDown={e=>{e.preventDefault();fire();}} onClick={fire} disabled={!ability} className={`${s.powerBtn} ${ability? s.powerReady:''}`} style={ability?{'--ability-color':POWER_COLORS[ability]} as CSSProperties:undefined}>
      <span>{ability?POWER_ICON[ability]:'✦'}</span><small>{ability?LABEL[ability]:'GÜÇ TOPLA'}</small>
     </button>
   </div>
  </div>
  {(powerRolling||powerRevealed)&&<div aria-live="polite" style={{position:'absolute',top:'40%',left:'50%',transform:'translate(-50%,-50%)',zIndex:11,background:'rgba(6,13,26,.90)',border:'2px solid #f0ad57',borderRadius:18,padding:'15px 27px',minWidth:230,textAlign:'center',pointerEvents:'none',boxShadow:'0 10px 70px #050a17ca'}}>
   <div style={{color:'#eebf7b',fontSize:11,letterSpacing:3,fontWeight:900}}>✦ GÜÇ KAZANILDI ✦</div>
   <div style={{fontSize:43,margin:'6px 0',animation:'krPowerPop .16s ease-out infinite alternate'}}>{powerRolling?POWER_ICON[(Object.keys(LABEL) as KartPower[])[powerSpinIndex]]:ability?POWER_ICON[ability]:'✦'}</div>
   <strong style={{fontSize:18}}>{powerRolling?LABEL[(Object.keys(LABEL) as KartPower[])[powerSpinIndex]]:ability?LABEL[ability]:'GÜÇ HAZIR'}</strong>
   <div style={{display:'flex',gap:3,marginTop:10}}>{(Object.keys(LABEL) as KartPower[]).map(p=><i key={p} style={{height:3,flex:1,background:POWER_COLORS[p],opacity:powerSpinIndex===(Object.keys(LABEL) as KartPower[]).indexOf(p)?1:.24}}/>)}</div>
   <style>{`@keyframes krPowerPop{from{transform:scale(.90);filter:brightness(.9)}to{transform:scale(1.06);filter:brightness(1.2)}}`}</style>
  </div>}
  {ability&&<div className={s.powerDescription}>{POWER_ICON[ability]} {DETAILS[ability]} · BOŞLUK / E</div>}
  {ended!==null&&<div className={s.finishNotice} role="status">
   <span>🏁 FİNİŞ · {(ended/1000).toFixed(2)} sn</span>
   <button type="button" onClick={()=>setShowResults(v=>!v)}>{showResults?'✕ KAPAT':'🏆 SONUÇLARI GÖR'}</button>
  </div>}
  {ended!==null&&showResults&&<div className={s.endOverlay}><div className={s.endCard} style={{width:"min(780px,96vw)",maxWidth:"780px",maxHeight:"90%",overflowY:"auto",padding:"clamp(16px,3vw,30px)"}}>
   <span>🏁 DAMALI BAYRAK</span><h2>{roomId?'Yarış tamamlandı!':`P${hud.rank} · FİNİŞ!`}</h2>
   <div className={s.finalTime}>{(ended/1000).toFixed(2)} <small>sn</small></div>
   <p>{roomId?(championshipEnabled?`Şampiyona yarışı ${roundNo} · ${roundScored?'Puanlar hesaplandı.':'Diğer oyuncuların bitirmesi bekleniyor.'}`:'Sonucun lobiye kaydedildi. Diğer yarışçıları bekleyebilirsin.'):`Zorluk: ${difficulty==='easy'?'Kolay':difficulty==='hard'?'Uzman':'Orta'} · En iyi tur: ${(hud.bestLapMs||ended)/1000} sn`}</p>
   {roomId&&championshipEnabled&&<div style={{padding:'10px',border:'1px solid #6b748e65',borderRadius:12,display:'grid',gap:7,background:'rgba(11,17,28,.83)'}}>
    <strong style={{fontSize:14}}>🏆 PUAN DURUMU · HEDEF {pointsTarget} PUAN</strong>
    {standings.map((m,i)=><div key={m.user_id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'8px',background:'rgba(255,255,255,.045)',borderRadius:7}}><span>{i+1}. {m.nickname}{m.user_id===userId?' (SEN)':''}</span><strong>{m.kr_points||0} {roundScored?`(+${m.kr_last_award||0})`:''}</strong></div>)}
    {champion&&<strong style={{color:'#ffe188'}}>🏆 ŞAMPİYON: {champion.nickname} · {champion.kr_points||0} PUAN</strong>}
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
   {roomId&&isHost&&championshipEnabled&&!roundScored&&onFinalize&&<button onClick={onFinalize}>{everyoneFinished?'🏆 PUANLARI HESAPLA':'🏁 KALANLARI DNF SAY VE PUANLA'}</button>}
   {roomId&&isHost&&championshipEnabled&&roundScored&&!championId&&onNextRound&&<button onClick={onNextRound}>🏁 SONRAKİ YARIŞ · PUANLAR KORUNACAK</button>}
   {roomId&&championshipEnabled&&roundScored&&championId&&<strong>🏆 ŞAMPİYONA TAMAMLANDI · {champion?.nickname||'ŞAMPİYON'}</strong>}
   {roomId&&isHost&&!championshipEnabled&&onReset&&<button onClick={onReset}>↻ AYNI LOBİDE YENİ YARIŞ</button>}
   {roomId&&!isHost&&<p>Yeni yarış için lobi sahibinin başlatmasını bekleyebilirsin.</p>}
   <button type="button" onClick={()=>setShowResults(false)}>🏎️ Araçları izle</button>
   <button onClick={onExit}>{roomId?'✕ LOBİDEN AYRIL':'Arcade’e dön'}</button>
  </div></div>}
 </section>;
}
