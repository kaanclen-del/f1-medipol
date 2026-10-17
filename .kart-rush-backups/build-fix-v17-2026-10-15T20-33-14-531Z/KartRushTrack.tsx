"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TRACK_METERS, trackPosition } from './engine';
import type { KartDifficulty, KartGraphics, KartHud, KartPower, KartRushEngine, KartState, KartPace } from './engine';
import s from './kartRush.module.css';
import { KartRushSound } from './sound';

type Racer={user_id:string;nickname:string;color:string;finish_ms:number|null;best_lap_ms:number|null};
type Props={
 supabase:SupabaseClient;roomId:string|null;userId:string;displayName:string;color:string;startAt:number;members:Racer[];
 onExit:()=>void;onReload:()=>void;onReset?:()=>void;onRetry?:()=>void;isHost?:boolean;difficulty?:KartDifficulty;laps?:number;pace?:KartPace;graphics?:KartGraphics;onGraphicsChange?:(g:KartGraphics)=>void;volume?:number;onVolumeChange?:(v:number)=>void;
};
const LABEL:Record<KartPower,string>={turbo:'TURBO',shield:'KALKAN',emp:'EMP DARBESİ',repair:'ONARIM',pulse:'ŞOK DALGASI',magnet:'MIKNATIS'};
const DETAILS:Record<KartPower,string>={turbo:'Hız patlaması · 3,5 sn',shield:'Darbe koruması · 7 sn',emp:'Rakipleri yavaşlat',repair:'Aracın hasarını azalt',pulse:'Yakındaki rakiplere şok',magnet:'8 sn uzaktan güç toplama'};
const POWER_ICON:Record<KartPower,string>={turbo:'⚡',shield:'⬡',emp:'✺',repair:'✚',pulse:'◉',magnet:'⊕'};
const POWER_COLORS:Record<KartPower,string>={turbo:'#ffbc4e',shield:'#52e4ff',emp:'#cc8fff',repair:'#6ed5a1',pulse:'#e78bff',magnet:'#e0cf8d'};
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
export default function KartRushTrack({supabase,roomId,userId,displayName,color,startAt,members,onExit,onReload,onReset,onRetry,isHost=false,difficulty='normal',laps=3,pace='standard',graphics='balanced',onGraphicsChange,volume=.45,onVolumeChange}:Props){
 const canvas=useRef<HTMLCanvasElement|null>(null),engine=useRef<KartRushEngine|null>(null);
 const raceRoot=useRef<HTMLElement|null>(null);
 const channel=useRef<ReturnType<SupabaseClient['channel']>|null>(null);
 const friends=useRef<Map<string,KartState>>(new Map());
 const lastSent=useRef(0);
 const [hud,setHud]=useState<KartHud>({speed:0,lap:1,totalLaps:3,remaining:3,health:100,pit:false,pitProgress:0,magnet:false,lights:0,power:null,rank:1,total:6,elapsed:0,started:false,countdown:4,shield:false,turbo:false});
 const [error,setError]=useState(''),[ended,setEnded]=useState<number|null>(null);
 const [showGraphics,setShowGraphics]=useState(false);
 const [showLeaderboard,setShowLeaderboard]=useState(false);
 const [cameraName,setCameraName]=useState('TAKİP');
 const [rearHeld,setRearHeld]=useState(false);
 const cycleCamera=useCallback(()=>{const label=engine.current?.cycleCamera();if(label)setCameraName(label);},[]);
 const setRearCamera=useCallback((value:boolean)=>{engine.current?.setLookBack(value);setRearHeld(value);},[]);
 const [paused,setPaused]=useState(false);
 const pausedRef=useRef(false);
 const sound=useRef<KartRushSound|null>(null);
 const [isFullscreen,setIsFullscreen]=useState(false);
 const finishOnce=useRef(false),controls=useRef({left:false,right:false,brake:false,throttle:false});
 const down=useCallback((key:'left'|'right'|'brake'|'throttle',on:boolean)=>{if(pausedRef.current&&on)return;controls.current[key]=on;engine.current?.setKeys({[key]:on});if(on)sound.current?.activate();},[]);
 const fire=useCallback(()=>{if(pausedRef.current)return;sound.current?.activate();engine.current?.usePower();},[]);
 const horn=useCallback(()=>{if(pausedRef.current)return;sound.current?.activate();engine.current?.honk();},[]);
 const togglePause=useCallback(()=>{if(roomId)return;const next=!pausedRef.current;pausedRef.current=next;engine.current?.setPaused(next);sound.current?.update(0,false,next);setPaused(next);setShowGraphics(false);},[roomId]);
 const toggleFullscreen=useCallback(async()=>{
  const target=raceRoot.current;
  if(!target)return;
  try{
   if(document.fullscreenElement)await document.exitFullscreen();
   else if(target.requestFullscreen)await target.requestFullscreen();
  }catch{}
 },[]);
 const finish=useCallback(async(duration:number,best:number)=>{
  if(finishOnce.current)return;finishOnce.current=true;setEnded(duration);
  if(roomId){const {error}=await supabase.rpc('f1_kr_finish',{p_room_id:roomId,p_finish_ms:duration,p_best_lap_ms:best});if(error)setError('Sonucun kaydedilemedi: '+error.message);else onReload();}
 },[roomId,supabase,onReload]);
 useEffect(()=>{const audio=new KartRushSound(volume);sound.current=audio;return()=>{audio.dispose();sound.current=null;};},[]);
 useEffect(()=>{sound.current?.setVolume(volume);},[volume]);
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
    inst=new Engine(canvas.current,{id:userId,name:displayName,color,startAt,bots:!roomId,difficulty,laps,pace,graphics,
     onHud:next=>{setHud(next);sound.current?.update(next.speed,Boolean(next.throttle),pausedRef.current);},onEffect:effect=>sound.current?.effect(effect),onFinish:(dur,best)=>{void finish(dur,best);},
     onSnapshot:roomId?(st)=>{
      const t=performance.now();if(t-lastSent.current<160)return;lastSent.current=t;
      void currentChannel?.send({type:'broadcast',event:'kart-state',payload:st});
     }:undefined,
     onPower:roomId?(power)=>{void currentChannel?.send({type:'broadcast',event:'kart-ability',payload:{id:userId,power}});}:undefined,
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
       if(payload?.id!==userId&&ids.has(payload?.id)&&(payload?.power==='emp'||payload?.power==='pulse'))inst?.receiveAttack(payload.power);
      }).subscribe();channel.current=currentChannel;
    }
   }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'3D motor yüklenemedi.');}
  };
  void activate();
  return()=>{cancelled=true;window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);inst?.dispose();engine.current=null;if(currentChannel)void supabase.removeChannel(currentChannel);channel.current=null;};
  // For online races, roster is frozen for the duration of this match.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[roomId,userId,color,displayName,startAt,difficulty,laps,pace,toggleFullscreen,togglePause,horn,cycleCamera,setRearCamera]);
 useEffect(()=>{engine.current?.setGraphics(graphics);},[graphics]);
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
 return <section className={s.raceScreen} ref={raceRoot}>
  <canvas ref={canvas} className={s.canvas} aria-label="Kart Rush 3D yarış pisti" />
  <div className={s.qualityMark}>KART RUSH <span>WORLD FEED V13</span></div>
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
   <p>W gaz · S fren · A/D yön · V kamera değiştir · C basılı tut: arkaya bak · E güç · H korna · F tam ekran.</p>
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
  <div className={`${s.standings} ${showLeaderboard?s.boardOpen:''}`} aria-label="Canlı yarış sıralaması">
   <div className={s.standingsTitle}><strong>LIVE CLASSIFICATION</strong><small>GAP TO LEADER</small></div>
   {classification.map((p)=><p key={p.id} className={p.id===userId?s.isMe:''}><i>{p.pos}</i><span style={{background:p.color}}/><b>{p.id===userId?'SEN':p.name}</b><small>{p.gapLabel}</small></p>)}
  </div>
  <div className={s.damageHud}><span>ARAÇ DURUMU</span><strong>{hud.health}%</strong><div><i style={{width:`${hud.health}%`,background:hud.health>50?'#65bc91':hud.health>25?'#e1ab54':'#d95757'}}/></div></div>
  {hud.pit&&<div className={s.pitIndicator}>PIT ALANI · {hud.pitProgress>0?`SERVİS %${Math.round(hud.pitProgress*100)}`:'GAZI BIRAK VE DUR'}<div><i style={{width:`${hud.pitProgress*100}%`}}/></div></div>}
  {hud.magnet&&<div className={s.magnetIndicator}>⊕ MIKNATIS AKTİF</div>}
  <div className={s.speedHud}><small>SPEED {hud.contact?' · TEMAS!':''}</small><b>{hud.speed}</b><span>KM/SA</span><div className={s.speedBar}><i style={{width:Math.min(100,hud.speed/285*100)+'%'}}/></div></div>
  <div className={s.progressLine}><span style={{width:`${Math.max(0,Math.min(100,(hud.progress||0)/hud.totalLaps*100))}%`}}/></div>
  {hud.cornerSpeed&&hud.speed>hud.cornerSpeed+18&&<div className={s.cornerAlert}>⚠ SERT VİRAJ · FREN · {hud.cornerSpeed} KM/SA</div>}
  {hud.offroad&&<div className={s.offroad}>⚠ PİSTE GERİ DÖN · ÇİMDE HIZ KAYBI</div>}
  {hud.shield&&<span className={s.activeShield}>⬡ KALKAN AKTİF</span>}
  {hud.turbo&&<span className={s.activeTurbo}>⚡ TURBO AKTİF</span>}
  {!hud.started&&!ended&&<div className={s.countdown}><div className={s.startSequence}><small>F1 MEDİPOL · NIGHT GRAND PRIX</small><em>22 ARAÇ · {hud.totalLaps} TUR · ANA GRID</em><div className={s.startLights}>{[0,1,2,3,4].map(i=><span key={i} className={i<hud.lights?s.lightOn:''}/>)}</div><strong>{hud.lights>0?'LIGHTS ON':'READY TO LAUNCH'}</strong><small>BEŞ KIRMIZI IŞIK · SAKIN ERKEN ÇIKMA</small></div></div>}
  {error&&<p role="alert" className={s.raceError}>{error}</p>}
  <div className={s.raceBottom}>
   <div className={s.steerControls}><button {...pressProps('left')} aria-label="Sola dön">◀</button><button {...pressProps('right')} aria-label="Sağa dön">▶</button></div>
   <div className={s.controlsCenter}><span>W · GAZ &nbsp; S · FREN &nbsp; A/D · YÖN &nbsp; V · KAMERA &nbsp; C · ARKA BAKIŞ &nbsp; E · GÜÇ</span><small>{roomId?'ÇEVRİM İÇİ GRAND PRIX':`ANTRENMAN · ${difficulty==='easy'?'KOLAY':difficulty==='hard'?'UZMAN':'ORTA'}`}</small></div>
   <div className={s.abilityControls}><button type="button" className={s.hornBtn} onPointerDown={e=>{e.preventDefault();horn();}}>♫ KORNA</button><button {...pressProps('throttle')} className={s.gas}>GAZ</button><button {...pressProps('brake')} className={s.brake}>FREN</button>
    <button onPointerDown={e=>{e.preventDefault();fire();}} onClick={fire} disabled={!ability} className={`${s.powerBtn} ${ability? s.powerReady:''}`} style={ability?{'--ability-color':POWER_COLORS[ability]} as CSSProperties:undefined}>
      <span>{ability?POWER_ICON[ability]:'✦'}</span><small>{ability?LABEL[ability]:'GÜÇ TOPLA'}</small>
     </button>
   </div>
  </div>
  {ability&&<div className={s.powerDescription}>{POWER_ICON[ability]} {DETAILS[ability]} · BOŞLUK / E</div>}
  {ended!==null&&<div className={s.endOverlay}><div className={s.endCard}>
   <span>🏁 DAMALI BAYRAK</span><h2>{roomId?'Yarış tamamlandı!':`P${hud.rank} · FİNİŞ!`}</h2>
   <div className={s.finalTime}>{(ended/1000).toFixed(2)} <small>sn</small></div>
   <p>{roomId?'Sonucun lobiye kaydedildi. Diğer yarışçıları bekleyebilirsin.':`Zorluk: ${difficulty==='easy'?'Kolay':difficulty==='hard'?'Uzman':'Orta'} · En iyi tur: ${(hud.bestLapMs||ended)/1000} sn`}</p>
   {roomId&&<div className={s.results}>{members.filter(m=>m.finish_ms!==null).sort((a,b)=>(a.finish_ms||0)-(b.finish_ms||0)).map((m,i)=><div key={m.user_id}><b>{i+1}. {m.nickname}</b><span>{((m.finish_ms||0)/1000).toFixed(2)} sn</span></div>)}</div>}
   {!roomId&&onRetry&&<button onClick={onRetry}>↻ Tekrar yarış</button>}
   {roomId&&isHost&&onReset&&<button onClick={onReset}>↻ Yeni yarış başlat</button>}
   <button onClick={onExit}>{roomId?'Lobiden ayrıl':'Arcade’e dön'}</button>
  </div></div>}
 </section>;
}
