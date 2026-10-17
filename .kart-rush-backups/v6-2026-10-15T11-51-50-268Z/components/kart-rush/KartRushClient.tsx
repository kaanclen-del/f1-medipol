"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import KartRushTrack from './KartRushTrack';
import type { KartDifficulty, KartGraphics } from './engine';
import s from './kartRush.module.css';

type Room={id:string;code:string;title:string;host_id:string;is_public:boolean;status:'lobby'|'racing';max_players:number;member_count:number;created_at:string;started_at:string|null};
type Racer={room_id:string;user_id:string;nickname:string;color:string;ready:boolean;joined_at:string;finish_ms:number|null;best_lap_ms:number|null};
const COLORS=['#EF263E','#FFB225','#289FEA','#42C68A','#A981FF','#F7F7F7'];
const makeName=(u:{email?:string;user_metadata?:Record<string,unknown>})=>String(u.user_metadata?.display_name||u.user_metadata?.username||u.email?.split('@')[0]||'Racer').slice(0,24);
export default function KartRushClient(){
 const supabase=useMemo(()=>createClient(),[]);
 const [userId,setUserId]=useState('');const [name,setName]=useState('Racer');const [color,setColor]=useState(COLORS[0]);
 const [difficulty,setDifficulty]=useState<KartDifficulty>('normal');
 const [graphics,setGraphics]=useState<KartGraphics>('balanced');
 useEffect(()=>{try{const saved=window.localStorage.getItem('f1-kr-graphics');if(saved==='low'||saved==='balanced'||saved==='high')setGraphics(saved);}catch{}},[]);
 const changeGraphics=useCallback((value:KartGraphics)=>{setGraphics(value);try{window.localStorage.setItem('f1-kr-graphics',value);}catch{}},[]);
 const [lobbyName,setLobbyName]=useState('Medipol Grand Prix');const [privateRoom,setPrivateRoom]=useState(false);const [code,setCode]=useState('');
 const [rooms,setRooms]=useState<Room[]>([]);const [room,setRoom]=useState<Room|null>(null);const [members,setMembers]=useState<Racer[]>([]);
 const [view,setView]=useState<'hub'|'practice'|'online'>('hub');const [practiceStart,setPracticeStart]=useState(0);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 const loadRooms=useCallback(async()=>{
  const {data,error}=await supabase.from('f1_kr_rooms').select('id,code,title,host_id,is_public,status,max_players,member_count,created_at,started_at').eq('is_public',true).eq('status','lobby').gte('created_at',new Date(Date.now()-86400000).toISOString()).order('created_at',{ascending:false}).limit(20);
  if(!error)setRooms((data||[]) as Room[]);else if(error.code==='42P01'||error.code==='PGRST205')setError('Lobi tabloları henüz kurulmamış. ZIP içindeki SQL dosyasını Supabase SQL Editor’da çalıştır.');
 },[supabase]);
 const loadRoom=useCallback(async(id:string)=>{
  const [{data:r,error:e},{data:m}]=await Promise.all([
   supabase.from('f1_kr_rooms').select('*').eq('id',id).maybeSingle(),
   supabase.from('f1_kr_members').select('*').eq('room_id',id).order('joined_at',{ascending:true})
  ]);
  if(e){setError(e.message);return;}
  if(!r){setError('Lobi bulunamadı veya erişim izni yok.');setRoom(null);setView('hub');return;}
  setRoom(r as Room);setMembers((m||[]) as Racer[]);
 },[supabase]);
 useEffect(()=>{
  let disposed=false;
  void supabase.auth.getUser().then(({data})=>{if(disposed)return;const u=data.user;if(u){setUserId(u.id);setName(makeName(u));}setLoading(false);});
  void loadRooms();
  return()=>{disposed=true;};
 },[supabase,loadRooms]);
 useEffect(()=>{
  if(!room?.id)return;
  const id=room.id;
  const interval=setInterval(()=>{void loadRoom(id);},2700);
  const c=supabase.channel('f1-kr-lobby-'+id)
    .on('postgres_changes',{event:'*',schema:'public',table:'f1_kr_rooms',filter:'id=eq.'+id},()=>{void loadRoom(id);})
    .on('postgres_changes',{event:'*',schema:'public',table:'f1_kr_members',filter:'room_id=eq.'+id},()=>{void loadRoom(id);}).subscribe();
  return()=>{clearInterval(interval);void supabase.removeChannel(c);};
 },[room?.id,supabase,loadRoom]);
 const op=useCallback(async(fn:()=>PromiseLike<{data:unknown;error:{message:string}|null}>,after?:(data:unknown)=>void)=>{
  setBusy(true);setError('');try{const {data,error}=await fn();if(error)throw Error(error.message);after?.(data);}catch(e){setError(e instanceof Error?e.message:'İşlem başarısız.');}finally{setBusy(false);}
 },[]);
 const createRoom=()=>{if(!userId){setError('Çevrim içi lobi kurmak için giriş yapmalısın.');return;}
  void op(()=>supabase.rpc('f1_kr_create_room',{p_title:lobbyName.trim(),p_nickname:name.trim(),p_color:color,p_public:!privateRoom,p_max_players:8}),id=>{const v=String(id);setRoom({id:v,code:'',title:lobbyName,host_id:userId,is_public:!privateRoom,status:'lobby',max_players:8,member_count:1,created_at:new Date().toISOString(),started_at:null});setView('online');void loadRoom(v);});};
 const joinRoom=(joinCode:string)=>{if(!userId){setError('Lobiye katılmak için giriş yapmalısın.');return;}
  void op(()=>supabase.rpc('f1_kr_join_room',{p_code:joinCode.trim().toUpperCase(),p_nickname:name.trim(),p_color:color}),id=>{const v=String(id);setRoom({id:v,code:joinCode.toUpperCase(),title:'Lobi',host_id:'',is_public:false,status:'lobby',max_players:8,member_count:1,created_at:new Date().toISOString(),started_at:null});setView('online');void loadRoom(v);});};
 const leaveRoom=()=>{if(!room){setView('hub');return;}const id=room.id;
  void op(()=>supabase.rpc('f1_kr_leave_room',{p_room_id:id}),()=>{setRoom(null);setMembers([]);setView('hub');void loadRooms();});};
 const me=members.find(x=>x.user_id===userId);const everyoneReady=members.length>=2 && members.every(x=>x.ready);
 const started=room?.status==='racing' && room.started_at;
 return <div className={s.page}>
  <header className={s.hero}>
   <div className={s.eyebrow}>F1 MEDİPOL · ARCADE 03 / 3D MULTIPLAYER</div>
   <div className={s.heroGrid}><div><h1>KART <em>RUSH</em> <span>3D</span></h1><p>Gazı aç, güçleri topla, arkadaşlarını pistte geç! Visual V5 ile daha ciddi pist renkleri, daha keskin virajlar, tam ekran desteği ve daha oturaklı yarış atmosferi seni bekliyor.</p></div><div className={s.heroFlag}>🏎️<span>⚡</span></div></div>
  </header>
  {error&&<div className={s.error} role="alert">{error}<button onClick={()=>setError('')}>×</button></div>}
  {view==='practice' && <KartRushTrack key={practiceStart} supabase={supabase} roomId={null} userId="practice" displayName={name} color={color} startAt={practiceStart} members={[]} difficulty={difficulty} graphics={graphics} onGraphicsChange={changeGraphics} onRetry={()=>setPracticeStart(Date.now()+3500)} onExit={()=>setView('hub')} onReload={()=>{}}/>}
  {view==='online' && room && started && <KartRushTrack key={room.id+'-'+room.started_at} supabase={supabase} roomId={room.id} userId={userId} displayName={name} color={me?.color||color} startAt={Date.parse(started)} members={members} graphics={graphics} onGraphicsChange={changeGraphics} isHost={room.host_id===userId} onExit={leaveRoom} onReset={()=>{void op(()=>supabase.rpc('f1_kr_reset_room',{p_room_id:room.id}),()=>{void loadRoom(room.id);});}} onReload={()=>{void loadRoom(room.id);}}/>}
  {view==='online' && room && !started && <div className={s.lobbyPanel}>
    <div className={s.lobbyHead}><div><span>YARIŞ LOBİSİ</span><h2>{room.title}</h2><p>Arkadaşlarına şu kodu gönder:</p><div className={s.bigCode}>{room.code||'······'}</div></div><div className={s.status}>{members.length}/{room.max_players} OYUNCU</div></div>
    <div className={s.memberGrid}>{members.map(x=><div key={x.user_id} className={s.member}><span className={s.colorDot} style={{background:x.color}}/><strong>{x.nickname}</strong>{x.user_id===room.host_id&&<small>👑 KURUCU</small>}<b className={x.ready?s.ready:s.notReady}>{x.ready?'HAZIR':'BEKLİYOR'}</b></div>)}</div>
    <div className={s.lobbyActions}><button disabled={busy} onClick={()=>void op(()=>supabase.rpc('f1_kr_ready',{p_room_id:room.id,p_ready:!me?.ready}),()=>{void loadRoom(room.id);})}>{me?.ready?'Hazırım ✓ (Geri al)':'Hazırım ✓'}</button>
     {room.host_id===userId&&<button disabled={busy||!everyoneReady} className={s.primaryBtn} onClick={()=>void op(()=>supabase.rpc('f1_kr_start',{p_room_id:room.id}),()=>{void loadRoom(room.id);})}>🏁 Yarışı başlat</button>}
     <button className={s.secondaryBtn} disabled={busy} onClick={leaveRoom}>Lobiden çık</button></div>
    <p className={s.hint}>En az 2 kişi ve herkesin hazır olması gerekir. Yarış 5 saniyelik geri sayımla başlar. Konuklar kodla katılabilir.</p>
  </div>}
  {view==='hub' && <div className={s.hub}>
    <section className={s.setup}><span className={s.sectionTag}>SÜRÜCÜ AYARLARI</span><label>Yarışçı adın<input value={name} maxLength={24} onChange={e=>setName(e.target.value)}/></label>
      <p className={s.label}>Araç rengin</p><div className={s.colors}>{COLORS.map(c=><button type="button" aria-label={'Renk '+c} aria-pressed={color===c} key={c} className={color===c?s.chosenColor:''} style={{background:c}} onClick={()=>setColor(c)}/>)}</div>
      <p className={s.label}>Rakiplerin zorluğu</p><div className={s.difficultyChoices}>{([{id:'easy',title:'KOLAY',desc:'Yeni başlayan'}, {id:'normal',title:'ORTA',desc:'Dengeli yarış'}, {id:'hard',title:'UZMAN',desc:'Gerçek mücadele'}] as const).map(x=><button type="button" key={x.id} aria-pressed={difficulty===x.id} className={difficulty===x.id?s.difficultyActive:''} onClick={()=>setDifficulty(x.id)}><strong>{x.title}</strong><small>{x.desc}</small></button>)}</div>
      <p className={s.label}>Grafik kalitesi</p><div className={s.preGameGraphics}>{([{id:'low',name:'DÜŞÜK',desc:'Daha yüksek FPS'},{id:'balanced',name:'DENGELİ',desc:'Kalite / akıcılık dengesi'},{id:'high',name:'YÜKSEK',desc:'Gelişmiş pist dünyası · maksimum detay'}] as const).map(x=><button key={x.id} type="button" aria-pressed={graphics===x.id} className={graphics===x.id?s.graphicsChosen:''} onClick={()=>changeGraphics(x.id)}><strong>{x.name}</strong><small>{x.desc}</small></button>)}</div>
      <button className={s.practiceBtn} onClick={()=>{setError('');setPracticeStart(Date.now()+3500);setView('practice');}}>🏎️ Tek başına antrenman <span>VISUAL V5 →</span></button>
      <p className={s.hint}>Antrenman için hesap veya veritabanı kurulumu gerekmez. 5 bilgisayar rakibine karşı yarışabilirsin.</p>
    </section>
    <section className={s.setup}><span className={s.sectionTag}>ARKADAŞLARINLA YARIŞ</span><label>Lobi adı<input maxLength={45} value={lobbyName} onChange={e=>setLobbyName(e.target.value)}/></label>
      <label className={s.checkLine}><input type="checkbox" checked={privateRoom} onChange={e=>setPrivateRoom(e.target.checked)}/> Özel lobi (yalnızca kodla girilebilir)</label>
      <button disabled={busy||loading} className={s.primaryBtn} onClick={createRoom}>+ Yeni lobi kur</button>
      <div className={s.joinInput}><input placeholder="6 haneli lobi kodu" value={code} maxLength={6} onChange={e=>setCode(e.target.value.toUpperCase())}/><button disabled={busy||code.trim().length!==6} onClick={()=>joinRoom(code)}>Katıl →</button></div>
      {!userId&&<p className={s.notice}>Çevrim içi yarış için F1 Medipol hesabına giriş yapmalısın. <a href="/login">Giriş yap ↗</a></p>}
    </section>
    <section className={s.roomList}><div className={s.listTitle}><span className={s.sectionTag}>AÇIK LOBİLER</span><button onClick={()=>void loadRooms()}>↻ Yenile</button></div>
     {!rooms.length?<p className={s.hint}>Şu anda açık lobi görünmüyor. İlk lobiyi sen aç!</p>:rooms.map(r=><div key={r.id} className={s.roomItem}><div><strong>{r.title}</strong><small>{r.member_count}/{r.max_players} oyuncu · KOD: {r.code}</small></div><button disabled={busy} onClick={()=>joinRoom(r.code)}>Katıl →</button></div>)}
     <p className={s.hint}>Lobi sistemi için ekteki Supabase SQL kurulmalıdır. Yarış modu ilk sürümde eğlence amaçlıdır; anti-hile henüz yoktur.</p>
    </section>
  </div>}
  <div className={s.howTo}><div><span>01</span><strong>⚡ TURBO</strong><p>Bir anda hızlan, düzlükte rakiplerini geç.</p></div><div><span>02</span><strong>🛡️ KALKAN</strong><p>EMP saldırılarından korun.</p></div><div><span>03</span><strong>💥 EMP</strong><p>Diğer yarışçıları kısa süre yavaşlat.</p></div></div>
 </div>;
}
