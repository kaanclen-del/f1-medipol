"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { createClient } from '@/utils/supabase/client';
import KartRushTrack from './KartRushTrack';
import type { KartDifficulty, KartGraphics } from './engine';
import s from './kartRush.module.css';

type Room={id:string;code:string;title:string;host_id:string;is_public:boolean;status:'lobby'|'racing';max_players:number;member_count:number;created_at:string;started_at:string|null};
type Racer={room_id:string;user_id:string;nickname:string;color:string;ready:boolean;joined_at:string;finish_ms:number|null;best_lap_ms:number|null};
const COLORS=['#EF263E','#FFB225','#289FEA','#42C68A','#A981FF','#F7F7F7'];
const GARAGE=[
 {color:'#EF263E',name:'CRIMSON 26',team:'Kırmızı yarış takımı',tag:'AGRESİF'},
 {color:'#FFB225',name:'PAPAYA GP',team:'Turuncu yarış takımı',tag:'HIZ'},
 {color:'#289FEA',name:'AZURE GP',team:'Mavi yarış takımı',tag:'AERO'},
 {color:'#42C68A',name:'EMERALD',team:'Yeşil yarış takımı',tag:'PRECISION'},
 {color:'#A981FF',name:'VIOLET X',team:'Mor yarış takımı',tag:'APEX'},
 {color:'#F7F7F7',name:'SILVER ONE',team:'Beyaz / gümüş takım',tag:'CLASSIC'},
];
function GaragePreview({color}:{color:string}){
 return <svg className={s.garageSvg} viewBox="0 0 240 110" fill="none" aria-hidden="true">
  <ellipse cx="120" cy="89" rx="82" ry="11" fill="#02070e" opacity=".5"/>
  <g transform="translate(120 54) rotate(-90)">
   <rect x="-55" y="-34" width="27" height="18" rx="5" fill="#11161c" stroke="#343a41" strokeWidth="2"/>
   <rect x="29" y="-34" width="27" height="18" rx="5" fill="#11161c" stroke="#343a41" strokeWidth="2"/>
   <rect x="-55" y="17" width="27" height="18" rx="5" fill="#11161c" stroke="#343a41" strokeWidth="2"/>
   <rect x="29" y="17" width="27" height="18" rx="5" fill="#11161c" stroke="#343a41" strokeWidth="2"/>
   <path d="M-48 -9 L-15 -15 L22 -14 L66 -4 L78 0 L66 4 L22 14 L-15 15 L-48 9 Z" fill={color} stroke="#d8e5ed" strokeOpacity=".5" strokeWidth="1.7"/>
   <path d="M-53 -25 L-53 25 L-47 25 L-47 -25 Z" fill="#161c23"/>
   <path d="M62 -33 L70 -33 L70 33 L62 33 Z" fill="#161c23"/>
   <path d="M-10 -7 L15 -8 L18 8 L-10 7 Z" fill="#0f161d"/><path d="M-17 -1 Q1 -20 19 -1 Q1 18 -17 -1" stroke="#f2fafc" strokeWidth="4"/>
   <path d="M22 0 L72 0" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
  </g>
 </svg>;
}
const makeName=(u:{email?:string;user_metadata?:Record<string,unknown>})=>String(u.user_metadata?.display_name||u.user_metadata?.username||u.email?.split('@')[0]||'Racer').slice(0,24);
export default function KartRushClient(){
 const supabase=useMemo(()=>createClient(),[]);
 const [userId,setUserId]=useState('');const [name,setName]=useState('Racer');const [color,setColor]=useState(COLORS[0]);
 const [difficulty,setDifficulty]=useState<KartDifficulty>('normal');
 const [graphics,setGraphics]=useState<KartGraphics>('balanced');
 const [volume,setVolume]=useState(.45);
 const [menuTab,setMenuTab]=useState<'home'|'garage'|'settings'|'online'>('home');
 useEffect(()=>{try{const saved=window.localStorage.getItem('f1-kr-graphics');if(saved==='low'||saved==='balanced'||saved==='high')setGraphics(saved);const v=Number(window.localStorage.getItem('f1-kr-volume'));if(Number.isFinite(v)&&window.localStorage.getItem('f1-kr-volume')!==null)setVolume(Math.max(0,Math.min(1,v)));const c=window.localStorage.getItem('f1-kr-car');if(c&&COLORS.includes(c))setColor(c);}catch{}},[]);
 const changeGraphics=useCallback((value:KartGraphics)=>{setGraphics(value);try{window.localStorage.setItem('f1-kr-graphics',value);}catch{}},[]);
 const changeVolume=useCallback((v:number)=>{const value=Math.max(0,Math.min(1,v));setVolume(value);try{window.localStorage.setItem('f1-kr-volume',String(value));}catch{}},[]);
 const changeColor=useCallback((c:string)=>{setColor(c);try{window.localStorage.setItem('f1-kr-car',c);}catch{}},[]);
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
   <div className={s.heroGrid}><div><h1>KART <em>RUSH</em> <span>3D</span></h1><p>Gazı aç, güçleri topla, arkadaşlarını pistte geç! Drive V6 ile gerçek gaz kontrolü, F1 tarzı araçlar, sert temaslar, akıllı botlar ve çok daha detaylı pist atmosferi seni bekliyor.</p></div><div className={s.heroFlag}>🏎️<span>⚡</span></div></div>
  </header>
  {error&&<div className={s.error} role="alert">{error}<button onClick={()=>setError('')}>×</button></div>}
  {view==='practice' && <KartRushTrack key={practiceStart} supabase={supabase} roomId={null} userId="practice" displayName={name} color={color} startAt={practiceStart} members={[]} difficulty={difficulty} graphics={graphics} onGraphicsChange={changeGraphics} volume={volume} onVolumeChange={changeVolume} onRetry={()=>setPracticeStart(Date.now()+3500)} onExit={()=>setView('hub')} onReload={()=>{}}/>}
  {view==='online' && room && started && <KartRushTrack key={room.id+'-'+room.started_at} supabase={supabase} roomId={room.id} userId={userId} displayName={name} color={me?.color||color} startAt={Date.parse(started)} members={members} graphics={graphics} onGraphicsChange={changeGraphics} volume={volume} onVolumeChange={changeVolume} isHost={room.host_id===userId} onExit={leaveRoom} onReset={()=>{void op(()=>supabase.rpc('f1_kr_reset_room',{p_room_id:room.id}),()=>{void loadRoom(room.id);});}} onReload={()=>{void loadRoom(room.id);}}/>}
  {view==='online' && room && !started && <div className={s.lobbyPanel}>
    <div className={s.lobbyHead}><div><span>YARIŞ LOBİSİ</span><h2>{room.title}</h2><p>Arkadaşlarına şu kodu gönder:</p><div className={s.bigCode}>{room.code||'······'}</div></div><div className={s.status}>{members.length}/{room.max_players} OYUNCU</div></div>
    <div className={s.memberGrid}>{members.map(x=><div key={x.user_id} className={s.member}><span className={s.colorDot} style={{background:x.color}}/><strong>{x.nickname}</strong>{x.user_id===room.host_id&&<small>👑 KURUCU</small>}<b className={x.ready?s.ready:s.notReady}>{x.ready?'HAZIR':'BEKLİYOR'}</b></div>)}</div>
    <div className={s.lobbyActions}><button disabled={busy} onClick={()=>void op(()=>supabase.rpc('f1_kr_ready',{p_room_id:room.id,p_ready:!me?.ready}),()=>{void loadRoom(room.id);})}>{me?.ready?'Hazırım ✓ (Geri al)':'Hazırım ✓'}</button>
     {room.host_id===userId&&<button disabled={busy||!everyoneReady} className={s.primaryBtn} onClick={()=>void op(()=>supabase.rpc('f1_kr_start',{p_room_id:room.id}),()=>{void loadRoom(room.id);})}>🏁 Yarışı başlat</button>}
     <button className={s.secondaryBtn} disabled={busy} onClick={leaveRoom}>Lobiden çık</button></div>
    <p className={s.hint}>En az 2 kişi ve herkesin hazır olması gerekir. Yarış 5 saniyelik geri sayımla başlar. Konuklar kodla katılabilir.</p>
  </div>}
  {view==='hub' && <div className={s.mainMenu}>
   <div className={s.menuNav}>
    {([{id:'home',title:'🏁 ANA MENÜ'},{id:'garage',title:'🏎️ GARAJ'},{id:'settings',title:'⚙ AYARLAR'},{id:'online',title:'🌐 ÇEVRİM İÇİ'}] as const).map(t=><button key={t.id} type="button" onClick={()=>setMenuTab(t.id)} className={menuTab===t.id?s.menuActive:''}>{t.title}</button>)}
   </div>
   {menuTab==='home'&&<div className={s.menuHome}>
    <section className={s.menuSpotlight}>
     <span className={s.sectionTag}>F1 MEDİPOL · GRAND PRIX</span><h2>YARIŞA <em>HAZIR MISIN?</em></h2>
     <p>Gaza sen basarsın. Virajları doğru al, rakiplerle temas et, güçleri topla ve üç turda damalı bayrağa ulaş.</p>
     <div className={s.menuStats}><span>3 TUR</span><span>5 AKILLI BOT</span><span>3 ÖZEL GÜÇ</span></div>
     <button className={s.practiceBtn} onClick={()=>{setError('');setPracticeStart(Date.now()+3500);setView('practice');}}>▶ TEK OYUNCULU YARIŞ <span>START →</span></button>
     <button className={s.secondaryBtn} onClick={()=>setMenuTab('online')}>🌐 Arkadaşlarınla yarış</button>
    </section>
    <section className={s.menuPreview}>
     <div className={s.menuCurrent}><span>SEÇİLİ ARAÇ</span><strong>{GARAGE.find(x=>x.color===color)?.name}</strong></div>
     <div className={s.menuCarArt}><GaragePreview color={color}/></div>
     <p>Görünümü değiştirmek için garajı aç. Bütün araçlar aynı yarış fiziğini kullanır; renk seçimi avantaj sağlamaz.</p>
     <button onClick={()=>setMenuTab('garage')} className={s.secondaryBtn}>GARAJI AÇ →</button>
     <div className={s.menuTip}>W / ↑ GAZ &nbsp; S / ↓ FREN &nbsp; A / D YÖN &nbsp; E GÜÇ</div>
    </section>
   </div>}
   {menuTab==='garage'&&<section className={s.menuPanel}>
    <span className={s.sectionTag}>ARAÇ SEÇİMİ</span><h2>FORMULA GARAJI</h2><p className={s.menuIntro}>Altı farklı yarış tasarımından birini seç. Oyuncu aracı ve çevrim içi lobi rengin bu seçime göre belirlenir.</p>
    <div className={s.garageGrid}>{GARAGE.map(car=><button key={car.color} type="button" aria-pressed={car.color===color} className={`${s.garageChoice} ${car.color===color?s.garageSelected:''}`} onClick={()=>changeColor(car.color)}><div className={s.carVisual} style={{'--car-accent':car.color} as CSSProperties}><GaragePreview color={car.color}/></div><strong>{car.name}</strong><small>{car.team}</small><span>{car.color===color?'✓ SEÇİLİ ARAÇ':car.tag}</span></button>)}</div>
    <button className={s.practiceBtn} onClick={()=>setMenuTab('home')}>← ANA MENÜYE DÖN <span>{GARAGE.find(x=>x.color===color)?.name}</span></button>
   </section>}
   {menuTab==='settings'&&<section className={s.menuPanel}>
    <span className={s.sectionTag}>PERFORMANS / SES / SÜRÜŞ</span><h2>OYUN AYARLARI</h2>
    <div className={s.settingsGrid}>
     <div className={s.settingsGroup}><h3>GRAFİK KALİTESİ</h3><p>Detay seviyesi ve çözünürlük seçimi</p>
      <div className={s.preGameGraphics}>{([{id:'low',name:'DÜŞÜK',desc:'Daha fazla FPS'},{id:'balanced',name:'DENGELİ',desc:'Önerilen'},{id:'high',name:'YÜKSEK',desc:'Ultra doku / çevre'}] as const).map(x=><button key={x.id} aria-pressed={graphics===x.id} type="button" className={graphics===x.id?s.graphicsChosen:''} onClick={()=>changeGraphics(x.id)}><strong>{x.name}</strong><small>{x.desc}</small></button>)}</div>
     </div>
     <div className={s.settingsGroup}><h3>SES AYARLARI</h3><p>Motor, güç ve çarpışma efektleri</p>
       <label className={s.menuVolume}>SES DÜZEYİ <b>{Math.round(volume*100)}%</b><input type="range" min="0" max="100" value={Math.round(volume*100)} onChange={e=>changeVolume(Number(e.target.value)/100)} /></label>
       <button className={s.secondaryBtn} onClick={()=>changeVolume(volume===0?.45:0)}>{volume>0?'◖ SESİ KAPAT':'♫ SESİ AÇ'}</button>
     </div>
     <div className={s.settingsGroup}><h3>BOT ZORLUĞU</h3><p>Tek oyunculu yarış için</p><div className={s.difficultyChoices}>{([{id:'easy',title:'KOLAY',desc:'Sakin'},{id:'normal',title:'ORTA',desc:'Dengeli'},{id:'hard',title:'ZOR',desc:'Rekabetçi'}] as const).map(x=><button type="button" key={x.id} aria-pressed={difficulty===x.id} className={difficulty===x.id?s.difficultyActive:''} onClick={()=>setDifficulty(x.id)}><strong>{x.title}</strong><small>{x.desc}</small></button>)}</div></div>
     <div className={s.settingsGroup}><h3>KONTROLLER</h3><p>Gaz: W / ↑ · Fren: S / ↓ · Yön: A / D · Güç: E / SPACE · Duraklat: ESC · Tam ekran: F</p><p>Mobilde ekrandaki GAZ ve FREN düğmelerine basılı tut.</p></div>
    </div>
    <button className={s.practiceBtn} onClick={()=>setMenuTab('home')}>✓ AYARLARI KAYDET VE DÖN <span>HAZIR →</span></button>
   </section>}
   {menuTab==='online'&&<div className={s.hub}>
    <section className={s.setup}><span className={s.sectionTag}>ÇEVRİM İÇİ GARAJ</span><label>Yarışçı adın<input value={name} maxLength={24} onChange={e=>setName(e.target.value)}/></label>
     <p className={s.label}>Seçili araç: {GARAGE.find(x=>x.color===color)?.name}</p><div className={s.colors}>{COLORS.map(c=><button type="button" aria-label={'Renk '+c} aria-pressed={color===c} key={c} className={color===c?s.chosenColor:''} style={{background:c}} onClick={()=>changeColor(c)}/>)}</div>
     <button className={s.secondaryBtn} onClick={()=>setMenuTab('garage')}>Garajı aç →</button><p className={s.hint}>Lobi yarışlarında araç renkleri senkronize edilir. Her sürücünün gaz/fren kontrolü bağımsızdır.</p>
    </section>
    <section className={s.setup}><span className={s.sectionTag}>ARKADAŞLARINLA YARIŞ</span><label>Lobi adı<input maxLength={45} value={lobbyName} onChange={e=>setLobbyName(e.target.value)}/></label>
     <label className={s.checkLine}><input type="checkbox" checked={privateRoom} onChange={e=>setPrivateRoom(e.target.checked)}/> Özel lobi (yalnızca kodla girilebilir)</label>
     <button disabled={busy||loading} className={s.primaryBtn} onClick={createRoom}>+ Yeni lobi kur</button>
     <div className={s.joinInput}><input placeholder="6 haneli lobi kodu" value={code} maxLength={6} onChange={e=>setCode(e.target.value.toUpperCase())}/><button disabled={busy||code.trim().length!==6} onClick={()=>joinRoom(code)}>Katıl →</button></div>
     {!userId&&<p className={s.notice}>Çevrim içi yarış için F1 Medipol hesabına giriş yapmalısın. <a href="/login">Giriş yap ↗</a></p>}
    </section>
    <section className={s.roomList}><div className={s.listTitle}><span className={s.sectionTag}>AÇIK LOBİLER</span><button onClick={()=>void loadRooms()}>↻ Yenile</button></div>
     {!rooms.length?<p className={s.hint}>Şu anda açık lobi görünmüyor. İlk lobiyi sen aç!</p>:rooms.map(r=><div key={r.id} className={s.roomItem}><div><strong>{r.title}</strong><small>{r.member_count}/{r.max_players} oyuncu · KOD: {r.code}</small></div><button disabled={busy} onClick={()=>joinRoom(r.code)}>Katıl →</button></div>)}
     <p className={s.hint}>Çevrim içi yarışlar mevcut Supabase lobi altyapısını kullanır. Anti-hile henüz yoktur.</p>
    </section>
   </div>}
  </div>}
  <div className={s.howTo}><div><span>01</span><strong>⚡ TURBO</strong><p>Bir anda hızlan, düzlükte rakiplerini geç.</p></div><div><span>02</span><strong>🛡️ KALKAN</strong><p>EMP saldırılarından korun.</p></div><div><span>03</span><strong>💥 EMP</strong><p>Diğer yarışçıları kısa süre yavaşlat.</p></div></div>
 </div>;
}
