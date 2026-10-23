"use client";
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { createClient } from '@/utils/supabase/client';
import KartRushTrack from './KartRushTrack';
import type { KartDifficulty, KartGraphics, KartPace } from './engine';
import s from './kartRush.module.css';

type Room={id:string;code:string;title:string;host_id:string;is_public:boolean;status:'lobby'|'racing';max_players:number;member_count:number;created_at:string;started_at:string|null};
type Racer={room_id:string;user_id:string;nickname:string;color:string;ready:boolean;joined_at:string;finish_ms:number|null;best_lap_ms:number|null};
const COLORS=['#EF263E','#FFB225','#289FEA','#42C68A','#A981FF','#F7F7F7'];
const GARAGE=[
 {color:'#EF263E',name:'CRIMSON 26',team:'KÄ±rmÄ±zÄ± yarÄ±ÅŸ takÄ±mÄ±',tag:'AGRESÄ°F'},
 {color:'#FFB225',name:'PAPAYA GP',team:'Turuncu yarÄ±ÅŸ takÄ±mÄ±',tag:'HIZ'},
 {color:'#289FEA',name:'AZURE GP',team:'Mavi yarÄ±ÅŸ takÄ±mÄ±',tag:'AERO'},
 {color:'#42C68A',name:'EMERALD',team:'YeÅŸil yarÄ±ÅŸ takÄ±mÄ±',tag:'PRECISION'},
 {color:'#A981FF',name:'VIOLET X',team:'Mor yarÄ±ÅŸ takÄ±mÄ±',tag:'APEX'},
 {color:'#F7F7F7',name:'SILVER ONE',team:'Beyaz / gÃ¼mÃ¼ÅŸ takÄ±m',tag:'CLASSIC'},
];
function GaragePreview({color}:{color:string}){
 const id=useId().replace(/:/g,'');
 return <svg className={s.garageSvg} viewBox="0 0 500 250" fill="none" role="img" aria-label="SeÃ§ili Formula yarÄ±ÅŸ aracÄ±, yandan gÃ¶rÃ¼nÃ¼m">
  <defs>
   <linearGradient id={id+'body'} x1="0" y1="0" x2="0.75" y2="1"><stop stopColor="#ffffff" stopOpacity=".45"/><stop offset=".23" stopColor={color}/><stop offset=".76" stopColor={color}/><stop offset="1" stopColor="#0c1018"/></linearGradient>
   <linearGradient id={id+'wing'} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#344152"/><stop offset=".64" stopColor="#080d14"/><stop offset="1" stopColor="#101720"/></linearGradient>
   <radialGradient id={id+'tyre'} cx=".38" cy=".25" r=".78"><stop stopColor="#363b42"/><stop offset=".62" stopColor="#13171d"/><stop offset="1" stopColor="#05080c"/></radialGradient>
   <radialGradient id={id+'backdrop'} cx=".5" cy=".5" r=".5"><stop stopColor={color} stopOpacity=".22"/><stop offset="1" stopColor={color} stopOpacity="0"/></radialGradient>
  </defs>
  <ellipse cx="251" cy="126" rx="235" ry="112" fill={'url(#'+id+'backdrop)'} />
  <ellipse cx="253" cy="209" rx="211" ry="19" fill="#01040a" opacity=".62"/>
  <path d="M28 204H475" stroke="#8f9ca9" strokeOpacity=".22" strokeWidth="2" strokeDasharray="13 10" />
  <path d="M51 128 L58 88 L67 86 L73 132 L77 158 L65 162 L56 153Z" fill={'url(#'+id+'wing)'} stroke="#778795" strokeOpacity=".5" />
  <path d="M39 86 H90 L96 100 H42Z" fill="#111823" stroke="#8c9aa6" strokeOpacity=".52" />
  <path d="M55 109 H84 L96 128 H73Z" fill={color}/>
  <path d="M70 164 L94 148 L135 141 L192 114 L244 112 L279 138 L365 147 L425 166 L452 171 L437 190 H92 L69 183Z" fill={'url(#'+id+'body)'} stroke="#d7e1e9" strokeOpacity=".4" strokeWidth="2"/>
  <path d="M125 144 Q155 112 205 119 L252 130 Q275 147 318 152 L375 161 L224 167 L142 157Z" fill={color} stroke="#f3f5fa" strokeOpacity=".4" strokeWidth="1.5"/>
  <path d="M185 145 L218 112 L252 108 L276 120 L283 144Z" fill="#0a111c" stroke="#798da0" strokeOpacity=".5"/>
  <path d="M217 111 Q242 79 258 102 L280 141" stroke="#1a2330" strokeWidth="10" strokeLinecap="round" />
  <path d="M218 111 Q242 79 258 102 L280 141" stroke="#87929d" strokeOpacity=".55" strokeWidth="2.6" />
  <path d="M151 151 L166 126 Q174 116 189 122 L192 155Z" fill="#121d28" />
  <path d="M171 126 H196" stroke={color} strokeWidth="3" />
  <path d="M258 157 L338 161 L384 171 L399 181 H282 L265 173Z" fill="#101820" stroke="#bac3cc" strokeOpacity=".32" />
  <path d="M226 158 Q286 156 330 160 L388 174" stroke="#f6f8fa" strokeOpacity=".70" strokeWidth="3" />
  <path d="M279 173 H400" stroke={color} strokeWidth="5" />
  <path d="M361 171 L438 174 L448 178 L448 190 L387 190Z" fill="#202d3b" />
  <path d="M379 181 L468 179 L478 188 L468 193 H377Z" fill="#131b24" stroke="#98a9b7" strokeOpacity=".5" />
  <path d="M388 175 L468 175" stroke="#e8eef3" strokeOpacity=".7" strokeWidth="2" />
  {[122,361].map((cx,i)=><g key={cx}>
   <circle cx={cx} cy={174} r={i?30:35} fill={'url(#'+id+'tyre)'} stroke="#58626d" strokeOpacity=".62" strokeWidth="2" />
   <circle cx={cx} cy={174} r={i?23:27} stroke="#262e38" strokeWidth="3" />
   <circle cx={cx} cy={174} r={i?15:18} fill="#3c4653" stroke="#adbac6" strokeWidth="2" />
   {Array.from({length:8},(_,k)=><path key={k} d={`M${cx} 174 L${cx+Math.cos(k*Math.PI/4)*(i?15:18)} ${174+Math.sin(k*Math.PI/4)*(i?15:18)}`} stroke="#afbbc6" strokeWidth="2"/>)}
   <circle cx={cx} cy={174} r="6" fill={color} stroke="#d4dae2" strokeOpacity=".65"/>
   <path d={`M${cx-(i?23:27)} 172 A${i?23:27} ${i?23:27} 0 0 1 ${cx+(i?23:27)} 172`} stroke="#ffd351" strokeWidth="3.5" strokeOpacity=".94" />
  </g>)}
  <path d="M226 181 L300 181" stroke="#0b111b" strokeWidth="6" />
  <path d="M290 138 L343 146" stroke="#f2f4f6" strokeWidth="3" strokeOpacity=".80" />
 </svg>;
}
const makeName=(u:{email?:string;user_metadata?:Record<string,unknown>})=>String(u.user_metadata?.display_name||u.user_metadata?.username||u.email?.split('@')[0]||'Racer').slice(0,24);
export default function KartRushClient(){
 const supabase=useMemo(()=>createClient(),[]);
 const [userId,setUserId]=useState('');const [name,setName]=useState('Racer');const [color,setColor]=useState(COLORS[0]);
 const [difficulty,setDifficulty]=useState<KartDifficulty>('normal');
 const [laps,setLaps]=useState(3);const [pace,setPace]=useState<KartPace>('standard');
 const [graphics,setGraphics]=useState<KartGraphics>('balanced');
 const [volume,setVolume]=useState(.45);
 const [menuTab,setMenuTab]=useState<'home'|'garage'|'settings'|'online'>('home');
 useEffect(()=>{try{const saved=window.localStorage.getItem('f1-kr-graphics');if(saved==='low'||saved==='balanced'||saved==='high')setGraphics(saved);const v=Number(window.localStorage.getItem('f1-kr-volume'));if(Number.isFinite(v)&&window.localStorage.getItem('f1-kr-volume')!==null)setVolume(Math.max(0,Math.min(1,v)));const c=window.localStorage.getItem('f1-kr-car');if(c&&COLORS.includes(c))setColor(c);const storedLaps=Number(window.localStorage.getItem('f1-kr-laps'));if([1,2,3,5].includes(storedLaps))setLaps(storedLaps);const savedPace=window.localStorage.getItem('f1-kr-pace');if(savedPace==='fast'||savedPace==='standard'||savedPace==='long')setPace(savedPace);}catch{}},[]);
 const changeGraphics=useCallback((value:KartGraphics)=>{setGraphics(value);try{window.localStorage.setItem('f1-kr-graphics',value);}catch{}},[]);
 const changeVolume=useCallback((v:number)=>{const value=Math.max(0,Math.min(1,v));setVolume(value);try{window.localStorage.setItem('f1-kr-volume',String(value));}catch{}},[]);
 const changeColor=useCallback((c:string)=>{setColor(c);try{window.localStorage.setItem('f1-kr-car',c);}catch{}},[]);
 const [lobbyName,setLobbyName]=useState('Medipol Grand Prix');const [privateRoom,setPrivateRoom]=useState(false);const [code,setCode]=useState('');
 const [rooms,setRooms]=useState<Room[]>([]);const [room,setRoom]=useState<Room|null>(null);const [members,setMembers]=useState<Racer[]>([]);
 const [view,setView]=useState<'hub'|'practice'|'online'>('hub');const [practiceStart,setPracticeStart]=useState(0);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 const loadRooms=useCallback(async()=>{
  const {data,error}=await supabase.from('f1_kr_rooms').select('id,code,title,host_id,is_public,status,max_players,member_count,created_at,started_at').eq('is_public',true).eq('status','lobby').gte('created_at',new Date(Date.now()-86400000).toISOString()).order('created_at',{ascending:false}).limit(20);
  if(!error)setRooms((data||[]) as Room[]);else if(error.code==='42P01'||error.code==='PGRST205')setError('Lobi tablolarÄ± henÃ¼z kurulmamÄ±ÅŸ. ZIP iÃ§indeki SQL dosyasÄ±nÄ± Supabase SQL Editorâ€™da Ã§alÄ±ÅŸtÄ±r.');
 },[supabase]);
 const loadRoom=useCallback(async(id:string)=>{
  const [{data:r,error:e},{data:m}]=await Promise.all([
   supabase.from('f1_kr_rooms').select('*').eq('id',id).maybeSingle(),
   supabase.from('f1_kr_members').select('*').eq('room_id',id).order('joined_at',{ascending:true})
  ]);
  if(e){setError(e.message);return;}
  if(!r){setError('Lobi bulunamadÄ± veya eriÅŸim izni yok.');setRoom(null);setView('hub');return;}
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
  setBusy(true);setError('');try{const {data,error}=await fn();if(error)throw Error(error.message);after?.(data);}catch(e){setError(e instanceof Error?e.message:'Ä°ÅŸlem baÅŸarÄ±sÄ±z.');}finally{setBusy(false);}
 },[]);
 const createRoom=()=>{if(!userId){setError('Ã‡evrim iÃ§i lobi kurmak iÃ§in giriÅŸ yapmalÄ±sÄ±n.');return;}
  void op(()=>supabase.rpc('f1_kr_create_room',{p_title:lobbyName.trim(),p_nickname:name.trim(),p_color:color,p_public:!privateRoom,p_max_players:8}),id=>{const v=String(id);setRoom({id:v,code:'',title:lobbyName,host_id:userId,is_public:!privateRoom,status:'lobby',max_players:8,member_count:1,created_at:new Date().toISOString(),started_at:null});setView('online');void loadRoom(v);});};
 const joinRoom=(joinCode:string)=>{if(!userId){setError('Lobiye katÄ±lmak iÃ§in giriÅŸ yapmalÄ±sÄ±n.');return;}
  void op(()=>supabase.rpc('f1_kr_join_room',{p_code:joinCode.trim().toUpperCase(),p_nickname:name.trim(),p_color:color}),id=>{const v=String(id);setRoom({id:v,code:joinCode.toUpperCase(),title:'Lobi',host_id:'',is_public:false,status:'lobby',max_players:8,member_count:1,created_at:new Date().toISOString(),started_at:null});setView('online');void loadRoom(v);});};
 const leaveRoom=()=>{if(!room){setView('hub');return;}const id=room.id;
  void op(()=>supabase.rpc('f1_kr_leave_room',{p_room_id:id}),()=>{setRoom(null);setMembers([]);setView('hub');void loadRooms();});};
 const me=members.find(x=>x.user_id===userId);const everyoneReady=members.length>=2 && members.every(x=>x.ready);
 const started=room?.status==='racing' && room.started_at;
 return <div className={s.page}>
  <header className={s.hero}>
   <div className={s.eyebrow}>F1 MEDÄ°POL / ARCADE EXPERIENCE / 2026</div>
   <div className={s.heroGrid}><div><h1>KART <em>RUSH</em> <span>3D</span></h1><p>22 araÃ§lÄ±k Grand Prix. Direksiyon, gaz ve fren tamamen sende. Kendi Formula aracÄ±nÄ± seÃ§, start gridine gir ve damalÄ± bayraÄŸa ulaÅŸ.</p></div><div className={s.launchHeroLabel}>GRAND PRIX <strong>EDITION 14</strong></div></div>
  </header>
  {error&&<div className={s.error} role="alert">{error}<button onClick={()=>setError('')}>Ã—</button></div>}
  {view==='practice' && <KartRushTrack key={practiceStart} supabase={supabase} roomId={null} userId="practice" displayName={name} color={color} startAt={practiceStart} members={[]} difficulty={difficulty} laps={laps} pace={pace} graphics={graphics} onGraphicsChange={changeGraphics} volume={volume} onVolumeChange={changeVolume} onRetry={()=>setPracticeStart(Date.now()+6200)} onExit={()=>setView('hub')} onReload={()=>{}}/>}
  {view==='online' && room && started && <KartRushTrack key={room.id+'-'+room.started_at} supabase={supabase} roomId={room.id} userId={userId} displayName={name} color={me?.color||color} startAt={Date.parse(started)} members={members} graphics={graphics} onGraphicsChange={changeGraphics} volume={volume} onVolumeChange={changeVolume} isHost={room.host_id===userId} onExit={leaveRoom} onReset={()=>{void op(()=>supabase.rpc('f1_kr_reset_room',{p_room_id:room.id}),()=>{void loadRoom(room.id);});}} onReload={()=>{void loadRoom(room.id);}}/>}
  {view==='online' && room && !started && <div className={s.lobbyPanel}>
    <div className={s.lobbyHead}><div><span>YARIÅ LOBÄ°SÄ°</span><h2>{room.title}</h2><p>ArkadaÅŸlarÄ±na ÅŸu kodu gÃ¶nder:</p><div className={s.bigCode}>{room.code||'Â·Â·Â·Â·Â·Â·'}</div></div><div className={s.status}>{members.length}/{room.max_players} OYUNCU</div></div>
    <div className={s.memberGrid}>{members.map(x=><div key={x.user_id} className={s.member}><span className={s.colorDot} style={{background:x.color}}/><strong>{x.nickname}</strong>{x.user_id===room.host_id&&<small>ğŸ‘‘ KURUCU</small>}<b className={x.ready?s.ready:s.notReady}>{x.ready?'HAZIR':'BEKLÄ°YOR'}</b></div>)}</div>
    <div className={s.lobbyActions}><button disabled={busy} onClick={()=>void op(()=>supabase.rpc('f1_kr_ready',{p_room_id:room.id,p_ready:!me?.ready}),()=>{void loadRoom(room.id);})}>{me?.ready?'HazÄ±rÄ±m âœ“ (Geri al)':'HazÄ±rÄ±m âœ“'}</button>
     {room.host_id===userId&&<button disabled={busy||!everyoneReady} className={s.primaryBtn} onClick={()=>void op(()=>supabase.rpc('f1_kr_start',{p_room_id:room.id}),()=>{void loadRoom(room.id);})}>ğŸ YarÄ±ÅŸÄ± baÅŸlat</button>}
     <button className={s.secondaryBtn} disabled={busy} onClick={leaveRoom}>Lobiden Ã§Ä±k</button></div>
    <p className={s.hint}>En az 2 kiÅŸi ve herkesin hazÄ±r olmasÄ± gerekir. YarÄ±ÅŸ 5 saniyelik geri sayÄ±mla baÅŸlar. Konuklar kodla katÄ±labilir.</p>
  </div>}
  {view==='hub' && <div className={s.mainMenu}>
   <div className={s.menuNav}>
    {([{id:'home',title:'ğŸ ANA MENÃœ'},{id:'garage',title:'ğŸï¸ GARAJ'},{id:'settings',title:'âš™ AYARLAR'},{id:'online',title:'ğŸŒ Ã‡EVRÄ°M Ä°Ã‡Ä°'}] as const).map(t=><button key={t.id} type="button" onClick={()=>setMenuTab(t.id)} className={menuTab===t.id?s.menuActive:''}>{t.title}</button>)}
   </div>
   {menuTab==='home'&&<div className={s.menuHome}>
    <section className={s.launchStage}>
     <div className={s.launchTopline}><span><i/> 2026 / GRAND PRIX HUB</span><strong>F1 SOCIAL <em>RACE WEEKEND</em></strong></div>
     <div className={s.launchHeading}><small>YOUR GRID. YOUR RACE.</small><h2>PISTE <span>Ã‡IK.</span><strong>SINIRLARI ZORLA.</strong></h2><p>GerÃ§ek bir start gridinden kalkÄ±ÅŸ yap. Fren noktanÄ± kendin seÃ§, rakiplerini geÃ§ ve 22 araÃ§lÄ±k yarÄ±ÅŸÄ±n kontrolÃ¼nÃ¼ ele al.</p></div>
     <div className={s.launchKpis}><div><b>22</b><small>ARAÃ‡ / GRID</small></div><div><b>11</b><small>TAKIM RENKLERÄ°</small></div><div><b>{laps}</b><small>SEÃ‡Ä°LÄ° TUR</small></div></div>
     <div className={s.launchConfig}>
      <div className={s.launchConfigHeader}><strong>RACE CONFIGURATION</strong><span>LOCAL GRAND PRIX</span></div>
      <div className={s.launchConfigGrid}>
       <label>TUR SAYISI<div className={s.raceSetupChoices}>{([1,2,3,5] as const).map(n=><button key={n} type="button" className={laps===n?s.raceSetupSelected:''} onClick={()=>{setLaps(n);try{localStorage.setItem('f1-kr-laps',String(n));}catch{}}}>{n} <small>TUR</small></button>)}</div></label>
       <label>HEDEF TEMPO<div className={s.raceSetupChoices}>{([{id:'fast',label:'2:00'},{id:'standard',label:'2:30'},{id:'long',label:'3:00'}] as const).map(x=><button key={x.id} type="button" className={pace===x.id?s.raceSetupSelected:''} onClick={()=>{setPace(x.id);try{localStorage.setItem('f1-kr-pace',x.id);}catch{}}}>{x.label}</button>)}</div></label>
      </div>
      <div className={s.launchConfigFooter}><span>AI: {difficulty==='hard'?'ZOR':difficulty==='easy'?'KOLAY':'ORTA'}</span><span>GRAFÄ°K: {graphics==='high'?'YÃœKSEK':graphics==='low'?'DÃœÅÃœK':'DENGELÄ°'}</span><button type="button" onClick={()=>setMenuTab('settings')}>AYARLAR â†’</button></div>
     </div>
     <div className={s.launchActions}><button className={s.launchRaceBtn} onClick={()=>{setError('');setPracticeStart(Date.now()+6200);setView('practice');}}><span>START GRAND PRIX</span><b>YARIÅI BAÅLAT <span>â†—</span></b></button><button type="button" className={s.launchSecondaryBtn} onClick={()=>setMenuTab('online')}>Ã‡EVRÄ°M Ä°Ã‡Ä° LOBÄ° <span>â†’</span></button></div>
    </section>
    <aside className={s.launchGarage}>
     <div className={s.launchGarageHeader}><span>RACE CAR / 01</span><strong>YOUR MACHINE</strong></div>
     <div className={s.launchCarScene} style={{'--car-accent':color} as CSSProperties}><div className={s.launchCarGlow}/><div className={s.launchCarArtwork}><GaragePreview color={color}/></div><div className={s.launchCarBaseline}/></div>
     <div className={s.launchCarInfo}><span>SELECTED LIVERY</span><h3>{GARAGE.find(x=>x.color===color)?.name}</h3><small>{GARAGE.find(x=>x.color===color)?.team}</small></div>
     <div className={s.launchGarageStats}><div><span>ENGINE</span><b>HYBRID</b></div><div><span>HANDLING</span><b>MANUAL</b></div><div><span>CLASS</span><b>FORMULA</b></div></div>
     <button className={s.launchGarageButton} type="button" onClick={()=>setMenuTab('garage')}>KAPLAMAYI DEÄÄ°ÅTÄ°R <span>â†—</span></button>
     <div className={s.launchControls}><strong>DRIVING CONTROLS</strong><p>W <span>GAZ</span> Â· S <span>FREN</span> Â· A/D <span>DÄ°REKSÄ°YON</span></p><p>V <span>KAMERA</span> Â· C <span>ARKAYA BAK</span></p></div>
    </aside>
   </div>}
   {menuTab==='garage'&&<section className={s.menuPanel}>
    <span className={s.sectionTag}>F1 MEDÄ°POL Â· RACE CAR STUDIO</span><h2>FORMULA GARAJI</h2><p className={s.menuIntro}>AracÄ±nÄ±n yarÄ±ÅŸ kaplamasÄ±nÄ± seÃ§. SeÃ§tiÄŸin renk tek oyunculu yarÄ±ÅŸta ve Ã§evrim iÃ§i lobide kullanÄ±lÄ±r.</p>
    <div className={s.garageGrid}>{GARAGE.map(car=><button key={car.color} type="button" aria-pressed={car.color===color} className={`${s.garageChoice} ${car.color===color?s.garageSelected:''}`} onClick={()=>changeColor(car.color)}><div className={s.carVisual} style={{'--car-accent':car.color} as CSSProperties}><GaragePreview color={car.color}/></div><strong>{car.name}</strong><small>{car.team}</small><span>{car.color===color?'âœ“ SEÃ‡Ä°LÄ° ARAÃ‡':car.tag}</span></button>)}</div>
    <button className={s.practiceBtn} onClick={()=>setMenuTab('home')}>â† ANA MENÃœYE DÃ–N <span>{GARAGE.find(x=>x.color===color)?.name}</span></button>
   </section>}
   {menuTab==='settings'&&<section className={s.menuPanel}>
    <span className={s.sectionTag}>PERFORMANS / SES / SÃœRÃœÅ</span><h2>OYUN AYARLARI</h2>
    <div className={s.settingsGrid}>
     <div className={s.settingsGroup}><h3>GRAFÄ°K KALÄ°TESÄ°</h3><p>Detay seviyesi ve Ã§Ã¶zÃ¼nÃ¼rlÃ¼k seÃ§imi</p>
      <div className={s.preGameGraphics}>{([{id:'low',name:'DÃœÅÃœK',desc:'Daha fazla FPS'},{id:'balanced',name:'DENGELÄ°',desc:'Ã–nerilen'},{id:'high',name:'YÃœKSEK',desc:'Ultra doku / Ã§evre'}] as const).map(x=><button key={x.id} aria-pressed={graphics===x.id} type="button" className={graphics===x.id?s.graphicsChosen:''} onClick={()=>changeGraphics(x.id)}><strong>{x.name}</strong><small>{x.desc}</small></button>)}</div>
     </div>
     <div className={s.settingsGroup}><h3>SES AYARLARI</h3><p>Motor, gÃ¼Ã§ ve Ã§arpÄ±ÅŸma efektleri</p>
       <label className={s.menuVolume}>SES DÃœZEYÄ° <b>{Math.round(volume*100)}%</b><input type="range" min="0" max="100" value={Math.round(volume*100)} onChange={e=>changeVolume(Number(e.target.value)/100)} /></label>
       <button className={s.secondaryBtn} onClick={()=>changeVolume(volume===0?.45:0)}>{volume>0?'â—– SESÄ° KAPAT':'â™« SESÄ° AÃ‡'}</button>
     </div>
     <div className={s.settingsGroup}><h3>BOT ZORLUÄU</h3><p>Tek oyunculu yarÄ±ÅŸ iÃ§in</p><div className={s.difficultyChoices}>{([{id:'easy',title:'KOLAY',desc:'Sakin'},{id:'normal',title:'ORTA',desc:'Dengeli'},{id:'hard',title:'ZOR',desc:'RekabetÃ§i'}] as const).map(x=><button type="button" key={x.id} aria-pressed={difficulty===x.id} className={difficulty===x.id?s.difficultyActive:''} onClick={()=>setDifficulty(x.id)}><strong>{x.title}</strong><small>{x.desc}</small></button>)}</div></div>
     <div className={s.settingsGroup}><h3>KONTROLLER</h3><p>Gaz: W / â†‘ Â· Fren: S / â†“ Â· YÃ¶n: A / D Â· GÃ¼Ã§: E / SPACE Â· Duraklat: ESC Â· Tam ekran: F</p><p>Mobilde ekrandaki GAZ ve FREN dÃ¼ÄŸmelerine basÄ±lÄ± tut.</p></div>
    </div>
    <button className={s.practiceBtn} onClick={()=>setMenuTab('home')}>âœ“ AYARLARI KAYDET VE DÃ–N <span>HAZIR â†’</span></button>
   </section>}
   {menuTab==='online'&&<div className={s.hub}>
    <section className={s.setup}><span className={s.sectionTag}>Ã‡EVRÄ°M Ä°Ã‡Ä° GARAJ</span><label>YarÄ±ÅŸÃ§Ä± adÄ±n<input value={name} maxLength={24} onChange={e=>setName(e.target.value)}/></label>
     <p className={s.label}>SeÃ§ili araÃ§: {GARAGE.find(x=>x.color===color)?.name}</p><div className={s.colors}>{COLORS.map(c=><button type="button" aria-label={'Renk '+c} aria-pressed={color===c} key={c} className={color===c?s.chosenColor:''} style={{background:c}} onClick={()=>changeColor(c)}/>)}</div>
     <button className={s.secondaryBtn} onClick={()=>setMenuTab('garage')}>GarajÄ± aÃ§ â†’</button><p className={s.hint}>Lobi yarÄ±ÅŸlarÄ±nda araÃ§ renkleri senkronize edilir. Her sÃ¼rÃ¼cÃ¼nÃ¼n gaz/fren kontrolÃ¼ baÄŸÄ±msÄ±zdÄ±r.</p>
    </section>
    <section className={s.setup}><span className={s.sectionTag}>ARKADAÅLARINLA YARIÅ</span><label>Lobi adÄ±<input maxLength={45} value={lobbyName} onChange={e=>setLobbyName(e.target.value)}/></label>
     <label className={s.checkLine}><input type="checkbox" checked={privateRoom} onChange={e=>setPrivateRoom(e.target.checked)}/> Ã–zel lobi (yalnÄ±zca kodla girilebilir)</label>
     <button disabled={busy||loading} className={s.primaryBtn} onClick={createRoom}>+ Yeni lobi kur</button>
     <div className={s.joinInput}><input placeholder="6 haneli lobi kodu" value={code} maxLength={6} onChange={e=>setCode(e.target.value.toUpperCase())}/><button disabled={busy||code.trim().length!==6} onClick={()=>joinRoom(code)}>KatÄ±l â†’</button></div>
     {!userId&&<p className={s.notice}>Ã‡evrim iÃ§i yarÄ±ÅŸ iÃ§in F1 SOCIAL hesabÄ±na giriÅŸ yapmalÄ±sÄ±n. <a href="/login">GiriÅŸ yap â†—</a></p>}
    </section>
    <section className={s.roomList}><div className={s.listTitle}><span className={s.sectionTag}>AÃ‡IK LOBÄ°LER</span><button onClick={()=>void loadRooms()}>â†» Yenile</button></div>
     {!rooms.length?<p className={s.hint}>Åu anda aÃ§Ä±k lobi gÃ¶rÃ¼nmÃ¼yor. Ä°lk lobiyi sen aÃ§!</p>:rooms.map(r=><div key={r.id} className={s.roomItem}><div><strong>{r.title}</strong><small>{r.member_count}/{r.max_players} oyuncu Â· KOD: {r.code}</small></div><button disabled={busy} onClick={()=>joinRoom(r.code)}>KatÄ±l â†’</button></div>)}
     <p className={s.hint}>Ã‡evrim iÃ§i yarÄ±ÅŸlar mevcut Supabase lobi altyapÄ±sÄ±nÄ± kullanÄ±r. Anti-hile henÃ¼z yoktur.</p>
    </section>
   </div>}
  </div>}
  <div className={s.howTo}><div><span>01</span><strong>âš¡ TURBO</strong><p>Bir anda hÄ±zlan, dÃ¼zlÃ¼kte rakiplerini geÃ§.</p></div><div><span>02</span><strong>ğŸ›¡ï¸ KALKAN</strong><p>EMP saldÄ±rÄ±larÄ±ndan korun.</p></div><div><span>03</span><strong>ğŸ’¥ EMP</strong><p>DiÄŸer yarÄ±ÅŸÃ§Ä±larÄ± kÄ±sa sÃ¼re yavaÅŸlat.</p></div></div>
 </div>;
}

