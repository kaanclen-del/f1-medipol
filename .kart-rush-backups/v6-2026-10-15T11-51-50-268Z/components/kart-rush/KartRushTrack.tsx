"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { KartDifficulty, KartGraphics, KartHud, KartPower, KartRushEngine, KartState } from './engine';
import s from './kartRush.module.css';

type Racer={user_id:string;nickname:string;color:string;finish_ms:number|null;best_lap_ms:number|null};
type Props={
 supabase:SupabaseClient;roomId:string|null;userId:string;displayName:string;color:string;startAt:number;members:Racer[];
 onExit:()=>void;onReload:()=>void;onReset?:()=>void;onRetry?:()=>void;isHost?:boolean;difficulty?:KartDifficulty;graphics?:KartGraphics;onGraphicsChange?:(g:KartGraphics)=>void;
};
const LABEL:Record<KartPower,string>={turbo:'TURBO',shield:'KALKAN',emp:'EMP DARBESİ'};
const DETAILS:Record<KartPower,string>={turbo:'Hız patlaması · 3,5 sn',shield:'Darbe koruması · 7 sn',emp:'Rakipleri yavaşlat'};
const POWER_ICON:Record<KartPower,string>={turbo:'⚡',shield:'⬡',emp:'✺'};
const POWER_COLORS:Record<KartPower,string>={turbo:'#ffbc4e',shield:'#52e4ff',emp:'#cc8fff'};
const TRACK_POINTS=[
 {x:-98,z:-8},{x:-88,z:-42},{x:-36,z:-68},{x:28,z:-70},{x:82,z:-50},{x:103,z:-8},
 {x:92,z:38},{x:46,z:68},{x:-10,z:74},{x:-64,z:58},{x:-102,z:24},{x:-109,z:-2},
];
const wrap=(x:number)=>((x%1)+1)%1;
const catmull=(a:number,b:number,c:number,d:number,t:number)=>0.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
function trackXY(progress:number){
 const n=TRACK_POINTS.length,t=wrap(progress)*n,i=Math.floor(t),f=t-i;
 const p0=TRACK_POINTS[(i-1+n)%n],p1=TRACK_POINTS[i%n],p2=TRACK_POINTS[(i+1)%n],p3=TRACK_POINTS[(i+2)%n];
 const x=catmull(p0.x,p1.x,p2.x,p3.x,f),z=catmull(p0.z,p1.z,p2.z,p3.z,f);
 return {x:69+x*0.50,y:49+z*0.46};
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
export default function KartRushTrack({supabase,roomId,userId,displayName,color,startAt,members,onExit,onReload,onReset,onRetry,isHost=false,difficulty='normal',graphics='balanced',onGraphicsChange}:Props){
 const canvas=useRef<HTMLCanvasElement|null>(null),engine=useRef<KartRushEngine|null>(null);
 const raceRoot=useRef<HTMLElement|null>(null);
 const channel=useRef<ReturnType<SupabaseClient['channel']>|null>(null);
 const friends=useRef<Map<string,KartState>>(new Map());
 const lastSent=useRef(0);
 const [hud,setHud]=useState<KartHud>({speed:0,lap:1,totalLaps:3,remaining:3,power:null,rank:1,total:6,elapsed:0,started:false,countdown:4,shield:false,turbo:false});
 const [error,setError]=useState(''),[ended,setEnded]=useState<number|null>(null);
 const [showGraphics,setShowGraphics]=useState(false);
 const [isFullscreen,setIsFullscreen]=useState(false);
 const finishOnce=useRef(false),controls=useRef({left:false,right:false,brake:false});
 const down=useCallback((key:'left'|'right'|'brake',on:boolean)=>{controls.current[key]=on;engine.current?.setKeys({[key]:on});},[]);
 const fire=useCallback(()=>engine.current?.usePower(),[]);
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
 useEffect(()=>{
  const onFs=()=>setIsFullscreen(Boolean(document.fullscreenElement));
  document.addEventListener('fullscreenchange',onFs);
  onFs();
  return()=>document.removeEventListener('fullscreenchange',onFs);
 },[]);
 useEffect(()=>{
  let cancelled=false,inst:KartRushEngine|null=null,currentChannel:ReturnType<SupabaseClient['channel']>|null=null;
  const keydown=(e:KeyboardEvent)=>{
   if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','a','d','s','w','A','D','S','W','e','E','f','F'].includes(e.key))e.preventDefault();
   if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft')down('left',true);
   if(e.key==='d'||e.key==='D'||e.key==='ArrowRight')down('right',true);
   if(e.key==='s'||e.key==='S'||e.key==='ArrowDown')down('brake',true);
   if(e.code==='Space'||e.key==='e'||e.key==='E')fire();
   if(e.key==='f'||e.key==='F')void toggleFullscreen();
  };
  const keyup=(e:KeyboardEvent)=>{
   if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft')down('left',false);
   if(e.key==='d'||e.key==='D'||e.key==='ArrowRight')down('right',false);
   if(e.key==='s'||e.key==='S'||e.key==='ArrowDown')down('brake',false);
  };
  const blur=()=>{down('left',false);down('right',false);down('brake',false);};
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
  const activate=async()=>{
   try{
    const {KartRushEngine:Engine}=await import('./engine');
    if(cancelled||!canvas.current)return;
    inst=new Engine(canvas.current,{id:userId,name:displayName,color,startAt,bots:!roomId,difficulty,graphics,
     onHud:setHud,onFinish:(dur,best)=>{void finish(dur,best);},
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
       if(payload?.id!==userId&&ids.has(payload?.id)&&payload?.power==='emp')inst?.receiveAttack('emp');
      }).subscribe();channel.current=currentChannel;
    }
   }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'3D motor yüklenemedi.');}
  };
  void activate();
  return()=>{cancelled=true;window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);inst?.dispose();engine.current=null;if(currentChannel)void supabase.removeChannel(currentChannel);channel.current=null;};
  // For online races, roster is frozen for the duration of this match.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[roomId,userId,color,displayName,startAt,difficulty,toggleFullscreen]);
 useEffect(()=>{engine.current?.setGraphics(graphics);},[graphics]);
 const pressProps=(k:'left'|'right'|'brake')=>({
  onPointerDown:(e:ReactPointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);down(k,true);},
  onPointerUp:()=>down(k,false),onPointerCancel:()=>down(k,false),onLostPointerCapture:()=>down(k,false),
 });
 const ability=hud.power;
 const sorted=useMemo(()=>hud.rivals||[],[hud.rivals]);
 const elapsed=Math.max(0,hud.elapsed);
 return <section className={s.raceScreen} ref={raceRoot}>
  <canvas ref={canvas} className={s.canvas} aria-label="Kart Rush 3D yarış pisti" />
  <div className={s.qualityMark}>KART RUSH <span>VISUAL V5</span></div>
  <div className={s.racingVignette} aria-hidden="true" />
  <div className={s.topHud}>
   <div className={s.hudBlock}><span>POZİSYON</span><strong>{hud.rank}<small> / {hud.total}</small></strong></div>
   <div className={s.hudBlock}><span>TUR</span><strong>{hud.lap}<small> / 3</small></strong></div>
   <div className={s.hudBlock}><span>TOPLAM SÜRE</span><strong>{Math.floor(elapsed/60).toString().padStart(2,'0')}:{Math.floor(elapsed%60).toString().padStart(2,'0')}<small>.{Math.floor(elapsed*10)%10}</small></strong></div>
   <div className={`${s.hudBlock} ${s.bestBlock}`}><span>EN İYİ TUR</span><strong>{hud.bestLapMs?((hud.bestLapMs)/1000).toFixed(2):'—'}<small> sn</small></strong></div>
  </div>
  <div className={s.raceActions}>
   <button type="button" onClick={()=>setShowGraphics(v=>!v)} className={s.graphicsToggle} aria-label="Grafik ayarları" aria-expanded={showGraphics}>⚙ GRAFİK <span>{graphics==='high'?'YÜKSEK':graphics==='low'?'DÜŞÜK':'DENGELİ'}</span></button>
   <button type="button" onClick={()=>void toggleFullscreen()} className={s.fullscreenBtn}>{isFullscreen?'🡼 ÇIK':'⛶ TAM'}</button>
   <button className={s.exitBtn} onClick={onExit}>← Çıkış</button>
  </div>
  {showGraphics&&<div className={s.graphicsOverlay}><div className={s.graphicsOverlayTitle}><strong>GÖRÜNTÜ KALİTESİ</strong><span>{hud.fps||'--'} FPS</span></div><div className={s.graphicsOptions}>{([{id:'low',name:'DÜŞÜK',desc:'Zayıf cihazlar'},{id:'balanced',name:'DENGELİ',desc:'En iyi denge'},{id:'high',name:'YÜKSEK',desc:'Maksimum detay'}] as const).map(q=><button type="button" key={q.id} className={graphics===q.id?s.selectedGraphics:''} onClick={()=>{onGraphicsChange?.(q.id);setShowGraphics(false);}}><strong>{q.name}</strong><small>{q.desc}</small></button>)}</div><p>F tuşu veya tam ekran butonu ile ekrana yayabilirsin. Grafik kalitesi oyun sırasında değiştirilebilir.</p></div>}
  <div className={s.sideHud}><TrackMiniMap hud={hud} id={userId}/>
   <div className={s.standings}><div>CANLI SIRALAMA</div>{sorted.map((p,i)=><p key={p.id} className={p.id===userId?s.isMe:''}><i>{i+1}</i><span style={{background:p.color}}/><b>{p.id===userId?'SEN':p.name}</b></p>)}</div>
  </div>
  <div className={s.speedHud}><small>HIZ</small><b>{hud.speed}</b><span>KM/SA</span><div className={s.speedBar}><i style={{width:Math.min(100,hud.speed/395*100)+'%'}}/></div></div>
  <div className={s.progressLine}><span style={{width:`${Math.max(0,Math.min(100,(hud.progress||0)/3*100))}%`}}/></div>
  {hud.offroad&&<div className={s.offroad}>⚠ PİSTE GERİ DÖN · ÇİMDE HIZ KAYBI</div>}
  {hud.shield&&<span className={s.activeShield}>⬡ KALKAN AKTİF</span>}
  {hud.turbo&&<span className={s.activeTurbo}>⚡ TURBO AKTİF</span>}
  {!hud.started&&!ended&&<div className={s.countdown}><span>{hud.countdown>0?hud.countdown:'GO!'}</span><small>F1 MEDİPOL · KART RUSH</small></div>}
  {error&&<p role="alert" className={s.raceError}>{error}</p>}
  <div className={s.raceBottom}>
   <div className={s.steerControls}><button {...pressProps('left')} aria-label="Sola dön">◀</button><button {...pressProps('right')} aria-label="Sağa dön">▶</button></div>
   <div className={s.controlsCenter}><span>A / D · YÖN &nbsp; S · FREN &nbsp; SPACE · GÜÇ &nbsp; F · TAM EKRAN</span><small>{roomId?'ÇEVRİM İÇİ GRAND PRIX':`ANTRENMAN · ${difficulty==='easy'?'KOLAY':difficulty==='hard'?'UZMAN':'ORTA'}`}</small></div>
   <div className={s.abilityControls}><button {...pressProps('brake')} className={s.brake}>FREN</button>
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
