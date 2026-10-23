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
const LABEL:Record<KartPower,string>={turbo:'TURBO',shield:'KALKAN',emp:'EMP DARBESÄ°',repair:'ONARIM',pulse:'ÅOK DALGASI',magnet:'MIKNATIS'};
const DETAILS:Record<KartPower,string>={turbo:'HÄ±z patlamasÄ± Â· 3,5 sn',shield:'Darbe korumasÄ± Â· 7 sn',emp:'YakÄ±ndaki en fazla 2 hedefi yavaÅŸlat',repair:'AracÄ±n hasarÄ±nÄ± azalt',pulse:'YakÄ±ndaki en yakÄ±n rakibe ÅŸok',magnet:'11 sn uzaktan gÃ¼Ã§ toplama'};
const POWER_ICON:Record<KartPower,string>={turbo:'âš¡',shield:'â¬¡',emp:'âœº',repair:'âœš',pulse:'â—‰',magnet:'âŠ•'};
const POWER_COLORS:Record<KartPower,string>={turbo:'#ffbc4e',shield:'#52e4ff',emp:'#cc8fff',repair:'#6ed5a1',pulse:'#e78bff',magnet:'#e0cf8d'};
const RACE_TEAM_LABELS:Record<string,string>={'#E32636':'FERRARI','#FF8000':'McLAREN','#00D2BE':'MERCEDES','#173B8A':'RED BULL','#006A4E':'ASTON MARTIN','#2B7BFF':'WILLIAMS','#FF6DAE':'ALPINE','#C4CFD8':'HAAS','#F4F5F7':'RACING BULLS','#B11F26':'AUDI','#B4AA78':'CADILLAC'};
const raceTeamName=(color:string)=>RACE_TEAM_LABELS[color.toUpperCase()]||'Ã–ZEL KAPLAMA';
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
 const channel=useRef<ReturnType<SupabaseClient['channel']>|null>(null);
 const friends=useRef<Map<string,KartState>>(new Map());
 const lastSent=useRef(0);
 const [hud,setHud]=useState<KartHud>({speed:0,lap:1,totalLaps:3,remaining:3,health:100,pit:false,pitProgress:0,magnet:false,lights:0,power:null,rank:1,total:6,elapsed:0,started:false,countdown:4,shield:false,turbo:false});
 const [error,setError]=useState(''),[ended,setEnded]=useState<number|null>(null);
 const [showResults,setShowResults]=useState(false);
 const previousRank=useRef<number|null>(null);
 const [showGraphics,setShowGraphics]=useState(false);
 const [showLeaderboard,setShowLeaderboard]=useState(false);
 const [cameraName,setCameraName]=useState('TAKÄ°P');
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
 const down=useCallback((key:'left'|'right'|'brake'|'throttle',on:boolean)=>{if(pausedRef.current&&on)return;controls.current[key]=on;engine.current?.setKeys({[key]:on});if(on){sound.current?.activate();ambience.current?.activate();venueAudio.current?.activate();setAudioEnabled(true);}},[]);
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
 const finish=useCallback(async(duration:number,best:number)=>{
  if(finishOnce.current)return;finishOnce.current=true;setEnded(duration);setShowResults(false);sound.current?.effect('finish');
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
    inst=new Engine(canvas.current,{id:userId,name:displayName,color,startAt:startAt+5000,bots:!roomId,difficulty,laps,pace,weather,graphics,
     onHud:next=>{setHud(next);sound.current?.update(next.speed,Boolean(next.throttle),pausedRef.current||finishOnce.current,Boolean(next.braking));sound.current?.startSignal(next.lights,next.started,pausedRef.current||finishOnce.current||!startSoundsRef.current);ambience.current?.update(next,userId,TRACK_METERS,pausedRef.current||finishOnce.current);venueAudio.current?.update(next.progress||0,next.speed,next.started,pausedRef.current||finishOnce.current);},onEffect:effect=>{sound.current?.effect(effect);ambience.current?.effect(effect);},onFinish:(dur,best)=>{void finish(dur,best);},
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
 const everyoneFinished=members.length>=2&&members.every(x=>x.finish_ms!==null);
 return <section className={`${s.raceScreen} ${ended!==null?s.paradeMode:''}`} ref={raceRoot}>
  <canvas ref={canvas} className={s.canvas} aria-label="Kart Rush 3D yarÄ±ÅŸ pisti" />
  <style>{`@media (pointer:coarse) and (max-width:1100px){
   .${s.speedHud}{top:calc(112px + env(safe-area-inset-top,0px))!important;left:calc(8px + env(safe-area-inset-left,0px))!important;width:112px!important;z-index:12!important;}
   .${s.steerControls}{align-self:flex-end!important;position:relative!important;transform:none!important;}
   .${s.raceBottom}{bottom:calc(12px + env(safe-area-inset-bottom,0px))!important;}
  }
  @media (pointer:coarse) and (orientation:landscape) and (max-height:650px){
   .${s.speedHud}{top:calc(64px + env(safe-area-inset-top,0px))!important;width:105px!important;min-height:61px!important;padding:4px 7px!important;}
   .${s.speedHud} b{font-size:31px!important;}
   .${s.steerControls} button{height:56px!important;width:54px!important;}
  }
  @media (pointer:coarse) and (max-width:1100px) and (orientation:portrait){
   .${s.speedHud}{top:calc(145px + env(safe-area-inset-top,0px))!important;}
  }`}</style>
  {weather==='rain'&&<svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',opacity:.38,zIndex:2}}>
    <defs><pattern id="kr-rain-pattern" width="16" height="24" patternUnits="userSpaceOnUse"><path d="M2 2 L.7 8 M11 12 L9 21" fill="none" stroke="#b2cbdb" strokeWidth=".20" strokeLinecap="round"/><animateTransform attributeName="patternTransform" type="translate" from="0 -24" to="-9 120" dur=".54s" repeatCount="indefinite"/></pattern></defs>
    <rect width="100" height="100" fill="url(#kr-rain-pattern)" />
   </svg>}
  {weather==='rain'&&<div aria-hidden="true" style={{position:'absolute',top:74,left:'50%',transform:'translateX(-50%)',fontSize:11,letterSpacing:'1.3px',fontWeight:800,padding:'6px 12px',borderRadius:7,background:'rgba(9,22,32,.62)',color:'#d7e8f8',pointerEvents:'none',zIndex:4}}>ğŸŒ§ ISLAK PÄ°ST Â· DAHA UZUN FREN MESAFESÄ°</div>}
  <div className={s.qualityMark}>KART RUSH <span>G2.0 Â· TEXTURED WORLD</span></div>
  <div className={s.racingVignette} aria-hidden="true" />
  <div className={s.broadcastTag}>F1 SOCIAL Â· RACE CONTROL</div>
  <div className={s.topHud}>
   <div className={`${s.hudBlock} ${s.hudPosition}`}><span>POS</span><strong>{hud.rank}<small> / {hud.total}</small></strong></div>
   <div className={`${s.hudBlock} ${s.hudLap}`}><span>LAP</span><strong>{hud.lap}<small> / {hud.totalLaps}</small></strong></div>
   <div className={`${s.hudBlock} ${s.hudTime}`}><span>RACE TIME</span><strong>{Math.floor(elapsed/60).toString().padStart(2,'0')}:{Math.floor(elapsed%60).toString().padStart(2,'0')}<small>.{Math.floor(elapsed*10)%10}</small></strong></div>
   <div className={`${s.hudBlock} ${s.bestBlock}`}><span>BEST LAP</span><strong>{hud.bestLapMs?((hud.bestLapMs)/1000).toFixed(2):'â€”'}<small> s</small></strong></div>
  </div>
  <div className={s.raceActions}>
   <button type="button" onClick={()=>setShowGraphics(v=>!v)} className={s.graphicsToggle} aria-label="Grafik ve ses ayarlarÄ±" aria-expanded={showGraphics}>âš™ AYARLAR <span>{graphics==='high'?'YÃœKSEK':graphics==='low'?'DÃœÅÃœK':'DENGELÄ°'}</span></button>
   <button type="button" onClick={()=>void toggleFullscreen()} className={s.fullscreenBtn}>{isFullscreen?'ğŸ¡¼ Ã‡IK':'â›¶ TAM'}</button>
   {!roomId&&<button type="button" className={s.fullscreenBtn} onClick={togglePause}>{paused?'â–¶ DEVAM':'â…¡ DURAKLAT'}</button>}
   <button className={s.exitBtn} onClick={onExit}>â† Ã‡Ä±kÄ±ÅŸ</button>
  </div>
  {showGraphics&&<div className={s.graphicsOverlay}>
   <div className={s.graphicsOverlayTitle}><strong>GÃ–RÃœNTÃœ + SES</strong><span>{hud.fps||'--'} FPS</span></div>
   <div className={s.overlayIntro}>F1 SOCIAL KART RUSH Â· 22 ARAÃ‡LIK GRID Â· GECE GRAND PRIX</div>
   <div className={s.graphicsOptions}>{([{id:'low',name:'DÃœÅÃœK',desc:'Performans'},{id:'balanced',name:'DENGELÄ°',desc:'Normal'},{id:'high',name:'YÃœKSEK',desc:'Ultra detay'}] as const).map(q=><button type="button" key={q.id} className={graphics===q.id?s.selectedGraphics:''} onClick={()=>onGraphicsChange?.(q.id)}><strong>{q.name}</strong><small>{q.desc}</small></button>)}</div>
   <label className={s.volumeLabel}>SES DÃœZEYÄ° <strong>{Math.round(volume*100)}%</strong><input type="range" min="0" max="100" value={Math.round(volume*100)} onChange={e=>{const v=Number(e.target.value)/100;onVolumeChange?.(v);sound.current?.activate();}}/></label>
   <button type="button" className={s.muteBtn} onClick={()=>onVolumeChange?.(volume>0?0:.45)}>{volume>0?'â™¬ SESÄ° KAPAT':'â™¬ SESÄ° AÃ‡'}</button>
   <button type="button" className={s.muteBtn} onClick={toggleStartSounds}>{startSoundsEnabled?'ğŸ”Š START IÅIKLARININ SESÄ°NÄ° KAPAT':'ğŸ”‡ START IÅIKLARININ SESÄ°NÄ° AÃ‡'}</button>
   <p>W gaz Â· S fren Â· A/D GERÃ‡EK DÄ°REKSÄ°YON (otomatik dÃ¶nÃ¼ÅŸ kapalÄ±) Â· V kamera deÄŸiÅŸtir Â· C basÄ±lÄ± tut: arkaya bak Â· E gÃ¼Ã§ Â· H korna Â· F tam ekran.</p>
  </div>}
  {paused&&!roomId&&ended===null&&<div className={s.pauseOverlay}><div className={s.pauseCard}><small>F1 MEDÄ°POL</small><h2>YARIÅ DURAKLATILDI</h2><p>AyarlarÄ± deÄŸiÅŸtirebilir veya ana menÃ¼ye dÃ¶nebilirsin.</p><button onClick={togglePause}>â–¶ YarÄ±ÅŸa devam</button><button onClick={onExit}>â† Ana menÃ¼</button></div></div>}
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
  <button type="button" className={s.mobileCameraToggle} onClick={()=>{sound.current?.activate();ambience.current?.activate();venueAudio.current?.activate();cycleCamera();}} aria-label="KamerayÄ± deÄŸiÅŸtir">â–£ KAMERA</button>
  <div className={`${s.standings} ${showLeaderboard?s.boardOpen:''}`} aria-label="CanlÄ± yarÄ±ÅŸ sÄ±ralamasÄ±">
   <div className={s.standingsTitle}><strong>LIVE CLASSIFICATION</strong><small>GAP TO LEADER</small></div>
   {classification.map((p)=><p key={p.id} className={p.id===userId?s.isMe:''}><i>{p.pos}</i><span style={{background:p.color}}/><b>{p.id===userId?'SEN':p.name}</b><small>{p.gapLabel}</small></p>)}
  </div>
  <div className={s.damageHud}><span>ARAÃ‡ DURUMU</span><strong>{hud.health}%</strong><div><i style={{width:`${hud.health}%`,background:hud.health>50?'#65bc91':hud.health>25?'#e1ab54':'#d95757'}}/></div></div>
  {hud.pit&&<div className={s.pitIndicator}>PIT ALANI Â· {hud.pitProgress>0?`SERVÄ°S %${Math.round(hud.pitProgress*100)}`:'GAZI BIRAK VE DUR'}<div><i style={{width:`${hud.pitProgress*100}%`}}/></div></div>}
  {hud.magnet&&<div className={s.magnetIndicator}>âŠ• MIKNATIS AKTÄ°F</div>}
  <div className={s.speedHud}><small>SPEED {hud.contact?' Â· TEMAS!':''}</small><b>{hud.speed}</b><span>KM/SA</span><div className={s.speedBar}><i style={{width:Math.min(100,hud.speed/285*100)+'%'}}/></div></div>
  <div className={s.progressLine}><span style={{width:`${Math.max(0,Math.min(100,(hud.progress||0)/hud.totalLaps*100))}%`}}/></div>
  {hud.cornerSpeed&&hud.speed>hud.cornerSpeed+18&&<div className={s.cornerAlert}>âš  SERT VÄ°RAJ Â· FREN Â· {hud.cornerSpeed} KM/SA</div>}
  {hud.offroad&&<div className={s.offroad}>âš  PÄ°ST DIÅINDASIN Â· FRENLE, DÄ°REKSÄ°YONLA GERÄ° DÃ–N</div>}
  {hud.shield&&<span className={s.activeShield}>â¬¡ KALKAN AKTÄ°F</span>}
  {hud.turbo&&<span className={s.activeTurbo}>âš¡ TURBO AKTÄ°F</span>}
  {!hud.started&&!ended&&hud.countdown>5&&<div className={s.countdown} style={{background:'linear-gradient(90deg,rgba(3,8,15,.20),rgba(8,14,22,.05))',justifyContent:'flex-start',alignItems:'flex-start',padding:'clamp(15px,3vw,29px)',pointerEvents:'none'}}>
   <div className={s.startSequence} style={{maxWidth:500,background:'rgba(6,12,23,.72)',border:'1px solid rgba(255,255,255,.15)',padding:'22px',borderRadius:17}}>
    <small>F1 MEDÄ°POL Â· GRID WALK & CIRCUIT PREVIEW</small>
    <strong style={{fontSize:'clamp(21px,4vw,32px)',letterSpacing:'.06em'}}>GRAND PRIX BAÅLIYOR</strong>
    <p style={{fontSize:13}}>ğŸ¥ Pist turu Â· {weather==='rain'?'ğŸŒ§ ISLAK PÄ°ST':'â˜€ KURU PÄ°ST'} Â· {hud.totalLaps} tur Â· {roomId?'Ã‡evrim iÃ§i yarÄ±ÅŸ':'AI yarÄ±ÅŸÄ±'}</p>
    <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:8,margin:'12px 0'}}>
     {[{name:displayName+' (SEN)',color},...(roomId?members.filter(m=>m.user_id!==userId).map(m=>({name:m.nickname,color:m.color})):((hud.rivals||[]).filter(r=>r.id!=='practice').slice(0,5).map(r=>({name:r.name,color:r.color}))))].slice(0,8).map((m,i)=><span key={i} style={{fontSize:11,padding:'5px 7px',borderRadius:6,borderLeft:'3px solid '+m.color,background:'rgba(255,255,255,.09)'}}>{m.name} Â· {raceTeamName(m.color)}</span>)}
    </div>
    <small>ğŸ Start Ä±ÅŸÄ±klarÄ±na geÃ§iliyor Â· {Math.max(1,hud.countdown-5)} sn {audioEnabled?'Â· SES HAZIR':'Â· SES Ä°Ã‡Ä°N EKRANA DOKUN'}</small>
   </div>
  </div>}
  {!hud.started&&!ended&&hud.countdown<=5&&<div className={s.countdown} style={{pointerEvents:'auto'}}><div className={s.startSequence}><small>F1 MEDÄ°POL Â· NIGHT GRAND PRIX</small><em>22 ARAÃ‡ Â· {hud.totalLaps} TUR Â· ANA GRID</em><div className={s.startLights}>{[0,1,2,3,4].map(i=><span key={i} className={i<hud.lights?s.lightOn:''}/>)}</div><strong>{hud.lights>0?'LIGHTS ON':'READY TO LAUNCH'}</strong><small>BEÅ KIRMIZI IÅIK Â· SAKIN ERKEN Ã‡IKMA</small><button type="button" onClick={toggleStartSounds} style={{marginTop:12,border:'1px solid rgba(255,255,255,.4)',borderRadius:12,padding:'9px 16px',background:'rgba(12,16,24,.82)',color:'#fff',fontWeight:800,cursor:'pointer'}}>{startSoundsEnabled?'ğŸ”Š START SESLERÄ° AÃ‡IK Â· KAPAT':'ğŸ”‡ START SESLERÄ° KAPALI Â· AÃ‡'}</button></div></div>}
  {error&&<p role="alert" className={s.raceError}>{error}</p>}
  <div className={s.raceBottom}>
   <div className={s.steerControls}><button {...pressProps('left')} aria-label="Sola dÃ¶n">â—€</button><button {...pressProps('right')} aria-label="SaÄŸa dÃ¶n">â–¶</button></div>
   <div className={s.controlsCenter}><span>W Â· GAZ &nbsp; S Â· FREN &nbsp; A/D Â· MANUEL DÄ°REKSÄ°YON &nbsp; V Â· KAMERA &nbsp; C Â· ARKA BAKIÅ &nbsp; E Â· GÃœÃ‡</span><small>{roomId?'Ã‡EVRÄ°M Ä°Ã‡Ä° GRAND PRIX':`ANTRENMAN Â· ${difficulty==='easy'?'KOLAY':difficulty==='hard'?'UZMAN':'ORTA'}`}</small></div>
   <div className={s.abilityControls}><button type="button" className={s.hornBtn} onPointerDown={e=>{e.preventDefault();horn();}}>â™« KORNA</button><button {...pressProps('throttle')} className={s.gas}>GAZ</button><button {...pressProps('brake')} className={s.brake}>FREN</button>
    <button onPointerDown={e=>{e.preventDefault();fire();}} onClick={fire} disabled={!ability} className={`${s.powerBtn} ${ability? s.powerReady:''}`} style={ability?{'--ability-color':POWER_COLORS[ability]} as CSSProperties:undefined}>
      <span>{ability?POWER_ICON[ability]:'âœ¦'}</span><small>{ability?LABEL[ability]:'GÃœÃ‡ TOPLA'}</small>
     </button>
   </div>
  </div>
  {ability&&<div className={s.powerDescription}>{POWER_ICON[ability]} {DETAILS[ability]} Â· BOÅLUK / E</div>}
  {ended!==null&&<div className={s.finishNotice} role="status">
   <span>ğŸ FÄ°NÄ°Å Â· {(ended/1000).toFixed(2)} sn</span>
   <button type="button" onClick={()=>setShowResults(v=>!v)}>{showResults?'âœ• KAPAT':'ğŸ† SONUÃ‡LARI GÃ–R'}</button>
  </div>}
  {ended!==null&&showResults&&<div className={s.endOverlay}><div className={s.endCard}>
   <span>ğŸ DAMALI BAYRAK</span><h2>{roomId?'YarÄ±ÅŸ tamamlandÄ±!':`P${hud.rank} Â· FÄ°NÄ°Å!`}</h2>
   <div className={s.finalTime}>{(ended/1000).toFixed(2)} <small>sn</small></div>
   <p>{roomId?(championshipEnabled?`Åampiyona yarÄ±ÅŸÄ± ${roundNo} Â· ${roundScored?'Puanlar hesaplandÄ±.':'DiÄŸer oyuncularÄ±n bitirmesi bekleniyor.'}`:'Sonucun lobiye kaydedildi. DiÄŸer yarÄ±ÅŸÃ§Ä±larÄ± bekleyebilirsin.'):`Zorluk: ${difficulty==='easy'?'Kolay':difficulty==='hard'?'Uzman':'Orta'} Â· En iyi tur: ${(hud.bestLapMs||ended)/1000} sn`}</p>
   {roomId&&championshipEnabled&&<div style={{padding:'10px',border:'1px solid #6b748e65',borderRadius:12,display:'grid',gap:7,background:'rgba(11,17,28,.83)'}}>
    <strong style={{fontSize:14}}>ğŸ† PUAN DURUMU Â· HEDEF {pointsTarget} PUAN</strong>
    {standings.map((m,i)=><div key={m.user_id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'8px',background:'rgba(255,255,255,.045)',borderRadius:7}}><span>{i+1}. {m.nickname}{m.user_id===userId?' (SEN)':''}</span><strong>{m.kr_points||0} {roundScored?`(+${m.kr_last_award||0})`:''}</strong></div>)}
    {champion&&<strong style={{color:'#ffe188'}}>ğŸ† ÅAMPÄ°YON: {champion.nickname} Â· {champion.kr_points||0} PUAN</strong>}
    {!roundScored&&isHost&&<p>DiÄŸer yarÄ±ÅŸÃ§Ä±larÄ± bekle. Ä°stersen bitiremeyenleri DNF sayÄ±p puanlamayÄ± onaylayabilirsin.</p>}
   </div>}
   {roomId&&<div className={s.results}>{members.filter(m=>m.finish_ms!==null).sort((a,b)=>(a.finish_ms||0)-(b.finish_ms||0)).map((m,i)=><div key={m.user_id}><b>{i+1}. {m.nickname}</b><span>{((m.finish_ms||0)/1000).toFixed(2)} sn</span></div>)}</div>}
   {!roomId&&onRetry&&<button onClick={onRetry}>â†» Tekrar yarÄ±ÅŸ</button>}
   {roomId&&isHost&&championshipEnabled&&!roundScored&&onFinalize&&<button onClick={onFinalize}>{everyoneFinished?'ğŸ† PUANLARI HESAPLA':'ğŸ KALANLARI DNF SAY VE PUANLA'}</button>}
   {roomId&&isHost&&championshipEnabled&&roundScored&&!championId&&onNextRound&&<button onClick={onNextRound}>ğŸ SONRAKÄ° YARIÅ Â· PUANLAR KORUNACAK</button>}
   {roomId&&championshipEnabled&&roundScored&&championId&&<strong>ğŸ† ÅAMPÄ°YONA TAMAMLANDI Â· {champion?.nickname||'ÅAMPÄ°YON'}</strong>}
   {roomId&&isHost&&!championshipEnabled&&onReset&&<button onClick={onReset}>â†» Yeni yarÄ±ÅŸ baÅŸlat</button>}
   <button type="button" onClick={()=>setShowResults(false)}>ğŸï¸ AraÃ§larÄ± izle</button>
   <button onClick={onExit}>{roomId?'Lobiden ayrÄ±l':'Arcadeâ€™e dÃ¶n'}</button>
  </div></div>}
 </section>;
}

