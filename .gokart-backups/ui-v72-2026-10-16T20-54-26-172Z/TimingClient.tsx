"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { escapeCsvCell, formatTime, parseTime, rankDrivers } from "./timing-utils";
import type { Driver, ScoreMode, ScoredDriver } from "./timing-utils";
import s from "./timing.module.css";

const STORAGE_KEY = "f1-medipol-gokart-timing-v1";
const modes: ScoreMode[] = [1, 2, 3, 5];
const makeId=()=>typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

type RaceClock = {
  running: boolean;
  elapsedMs: number;
  savedAt: number;
  lapMarks: Record<string, number>;
};
type Persisted = {
  drivers:Driver[]; bestCount:ScoreMode; trackMeters:number; sessionTitle:string;
  clock?:RaceClock;
};
function parseStored(raw:string):Persisted | null {
  try {
    const data=JSON.parse(raw) as Partial<Persisted>;
    if(!Array.isArray(data.drivers))return null;
    const drivers:Driver[]=data.drivers.filter((d):d is Driver => Boolean(d) && typeof d.id==='string' && typeof d.name==='string' && typeof d.car==='string' && Array.isArray(d.laps) && Array.isArray(d.penalties)).map(d=>({
      id:d.id,name:d.name.slice(0,60),car:d.car.slice(0,30),
      laps:d.laps.filter(x=>typeof x==='number'&&Number.isFinite(x)&&x>=1000&&x<=3600000),
      penalties:d.penalties.filter(p=>p && typeof p.id==='string' && (p.seconds===3||p.seconds===5)),
    }));
    return {
      drivers,
      bestCount:modes.includes(data.bestCount as ScoreMode)?data.bestCount as ScoreMode:1,
      trackMeters:typeof data.trackMeters==='number' && data.trackMeters>=1 && data.trackMeters<=100000 ? data.trackMeters:600,
      sessionTitle:typeof data.sessionTitle==='string'?data.sessionTitle.slice(0,70):'Go-Kart Yarışı',
      clock: data.clock && typeof data.clock === 'object' &&
        typeof data.clock.elapsedMs === 'number' && Number.isFinite(data.clock.elapsedMs) &&
        data.clock.elapsedMs >= 0 && typeof data.clock.savedAt === 'number' &&
        typeof data.clock.lapMarks === 'object' && data.clock.lapMarks !== null
        ? {
          running: data.clock.running === true,
          elapsedMs: Math.min(data.clock.elapsedMs, 12 * 60 * 60 * 1000),
          savedAt: data.clock.savedAt,
          lapMarks: Object.fromEntries(Object.entries(data.clock.lapMarks).filter(
            (entry):entry is [string,number] => typeof entry[1] === 'number' &&
              Number.isFinite(entry[1]) && entry[1] >= 0
          )),
        } : undefined,
    };
  } catch {return null;}
}
function bestSpeed(bestMs:number | null, meters:number):string {
  if(bestMs===null || bestMs<=0 || meters<=0) return "—";
  return ((meters/1000)/(bestMs/3600000)).toFixed(1)+" km/sa";
}

export default function TimingClient(){
  const [drivers,setDrivers]=useState<Driver[]>([]);
  const [activeId,setActiveId]=useState<string|null>(null);
  const [name,setName]=useState("");
  const [car,setCar]=useState("");
  const [manual,setManual]=useState("");
  const [bestCount,setBestCount]=useState<ScoreMode>(1);
  const [trackMeters,setTrackMeters]=useState(600);
  const [sessionTitle,setSessionTitle]=useState("Go-Kart Yarışı");
  const [isLoaded,setIsLoaded]=useState(false);
  const [message,setMessage]=useState("");
  const [running,setRunning]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const startRef=useRef(0);
  const accruedRef=useRef(0);
  // One global race clock; a separate last-crossing mark for every driver.
  const lapMarksRef=useRef<Record<string,number>>({});
  const runningRef=useRef(false);

  useEffect(()=>{
    try {
      const value=window.localStorage.getItem(STORAGE_KEY);
      if(value){
        const saved=parseStored(value);
        if(saved){
          setDrivers(saved.drivers);
          setBestCount(saved.bestCount);
          setTrackMeters(saved.trackMeters);
          setSessionTitle(saved.sessionTitle);
          setActiveId(saved.drivers[0]?.id ?? null);
          if(saved.clock){
            const sinceSaved=Math.max(0,Date.now()-saved.clock.savedAt);
            // Resume a live session after reload; prevent a forgotten tab from
            // silently counting a full night as a valid race session.
            const resume=saved.clock.running && sinceSaved < 4 * 60 * 60 * 1000;
            accruedRef.current=saved.clock.elapsedMs+(resume?sinceSaved:0);
            lapMarksRef.current=saved.clock.lapMarks;
            setElapsed(accruedRef.current);
            if(resume){startRef.current=Date.now();runningRef.current=true;setRunning(true);}
          }
        }
      }
    } catch {}
    setIsLoaded(true);
  },[]);
  useEffect(()=>{
    if(!isLoaded)return;
    try {
      const stamp=Date.now();
      const raceElapsed=accruedRef.current+(runningRef.current?Math.max(0,stamp-startRef.current):0);
      const data:Persisted={
        drivers,bestCount,trackMeters,sessionTitle,
        clock:{running:runningRef.current,elapsedMs:raceElapsed,savedAt:stamp,lapMarks:{...lapMarksRef.current}},
      };
      window.localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
    }catch{}
  },[drivers,bestCount,trackMeters,sessionTitle,isLoaded,running]);
  useEffect(()=>{
    if(!running)return;
    const interval=window.setInterval(()=>setElapsed(accruedRef.current + (Date.now()-startRef.current)),40);
    return ()=>window.clearInterval(interval);
  },[running]);

  const active=drivers.find(d=>d.id===activeId) ?? null;
  const ranked=useMemo(()=>rankDrivers(drivers,bestCount),[drivers,bestCount]);
  const rankedCount=ranked.filter(x=>x.position!==null).length;
  const totalLaps=drivers.reduce((n,d)=>n+d.laps.length,0);
  const globalFastest=ranked.reduce<number|null>((best,x)=>x.bestMs===null?best:best===null?x.bestMs:Math.min(best,x.bestMs),null);
  const activeBest=active?.laps.length?Math.min(...active.laps):null;

  const updateDriver=(id:string,edit:(d:Driver)=>Driver)=>setDrivers(prev=>prev.map(d=>d.id===id?edit(d):d));
  const raceNow=()=>accruedRef.current+(runningRef.current?Math.max(0,Date.now()-startRef.current):0);
  const currentLap=(id:string)=>Math.max(0,elapsed-(lapMarksRef.current[id]??0));
  const clearClock=()=>{
    runningRef.current=false;setRunning(false);
    setElapsed(0);accruedRef.current=0;startRef.current=0;
    lapMarksRef.current=Object.fromEntries(drivers.map(d=>[d.id,0]));
    setMessage("Kronometre sıfırlandı. Daha önce kaydedilen turlar korundu.");
  };
  // Switching the highlighted driver never interrupts anyone else's lap.
  const chooseDriver=(id:string)=>{setActiveId(id);setMessage("");};
  const addDriver=(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    const nextName=name.trim();
    if(!nextName){setMessage("Önce sürücü adını gir.");return;}
    const used=new Set(drivers.map(d=>d.car.trim().toLocaleLowerCase('tr-TR')));
    let n=1;
    while(used.has(`araç ${n}`))n++;
    const nextCar=car.trim()||`Araç ${n}`;
    const driver:Driver={id:makeId(),name:nextName,car:nextCar,laps:[],penalties:[]};
    // Drivers added during a race start counting from their join time.
    lapMarksRef.current[driver.id]=raceNow();
    setDrivers(prev=>[...prev,driver]);
    if(!activeId)setActiveId(driver.id);
    setName("");setCar("");setMessage(`${nextName} kaydedildi.`);
  };
  const removeDriver=(id:string)=>{
    const d=drivers.find(x=>x.id===id);if(!d)return;
    if(!window.confirm(`${d.name} ve bütün tur kayıtları silinsin mi?`))return;
    const next=drivers.filter(x=>x.id!==id);
    delete lapMarksRef.current[id];
    setDrivers(next);
    if(activeId===id)setActiveId(next[0]?.id??null);
    setMessage("");
  };
  const addLap=(ms:number)=>{
    if(!active){setMessage("Tur eklemek için bir sürücü seç.");return;}
    if(!Number.isFinite(ms)||ms<1000||ms>3600000){setMessage("Tur süresi 1 saniye ile 60 dakika arasında olmalı.");return;}
    updateDriver(active.id,d=>({...d,laps:[...d.laps,Math.round(ms)]}));
    setMessage(`${active.name} için ${formatTime(ms)} turu kaydedildi.`);
  };
  const addManual=(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    const ms=parseTime(manual);
    if(ms===null){setMessage("Geçerli format: 01:12.345 veya 72.345 (1 saniye – 60 dakika).");return;}
    if(!active){setMessage("Önce sürücü seç.");return;}
    addLap(ms);setManual("");
  };
  const toggleTimer=()=>{
    if(!drivers.length){setMessage("Önce en az bir sürücü ekle.");return;}
    if(runningRef.current){
      const ms=raceNow();
      accruedRef.current=ms;
      runningRef.current=false;
      setElapsed(ms);
      setRunning(false);
    }else{
      startRef.current=Date.now();
      runningRef.current=true;
      setRunning(true);
    }
    setMessage("");
  };
  const recordLapFor=(id:string)=>{
    const target=drivers.find(d=>d.id===id);
    if(!runningRef.current||!target){setMessage("Tur kaydı için yarışı başlat.");return;}
    // The timestamp is read at the click, not on the next React render.
    const now=raceNow();
    const mark=lapMarksRef.current[id]??0;
    const lap=now-mark;
    if(lap<1000){setMessage(`${target.name}: Son geçişin üzerinden 1 saniye geçmeli.`);return;}
    if(lap>3600000){setMessage(`${target.name}: Tur 60 dakikayı aştı; kronometreyi sıfırlayıp yeniden başlat.`);return;}
    lapMarksRef.current[id]=now;
    updateDriver(id,d=>({...d,laps:[...d.laps,Math.round(lap)]}));
    setElapsed(now);
    setActiveId(id);
    setMessage(`${target.name} · ${target.laps.length+1}. tur: ${formatTime(lap)} kaydedildi. Diğer sürücülerin süreleri devam ediyor.`);
  };
  const addPenalty=(id:string,seconds:3|5)=>{
    updateDriver(id,d=>({...d,penalties:[...d.penalties,{id:makeId(),seconds}]}));
    setMessage("");
  };
  const clearSession=()=>{
    if(!window.confirm("Bütün sürücüleri, tur zamanlarını ve cezaları silmek istiyor musun?"))return;
    runningRef.current=false;setRunning(false);setElapsed(0);
    accruedRef.current=0;startRef.current=0;lapMarksRef.current={};
    setDrivers([]);setActiveId(null);setMessage("Oturum temizlendi.");
  };
  const copyResults=async()=>{
    if(!drivers.length){setMessage("Önce sürücü ekle.");return;}
    const report=[`${sessionTitle} | En iyi ${bestCount} tur`,...ranked.map(row=>`${row.position===null?"—":`${row.position}.`} ${row.driver.car} · ${row.driver.name} | En iyi: ${formatTime(row.bestMs)} | Ceza: +${row.penaltyMs/1000}s | Net: ${formatTime(row.resultMs)}`)].join("\n");
    try{await navigator.clipboard.writeText(report);setMessage("Sıralama panoya kopyalandı.");}catch{setMessage("Kopyalama izni verilmedi. Sonuçları CSV olarak indirebilirsin.");}
  };
  const exportCsv=()=>{
    const head=['Sıra','Araç','Sürücü','Kaydedilen tur','En iyi tur','En iyi tur hızı (km/sa)','Hesaba alınan tur sayısı','Seçilen turlar toplamı','Ceza (sn)','Net sonuç','Bütün tur süreleri'];
    const rows=ranked.map(row=>{
      const d=row.driver;
      return [row.position??'Eksik tur',d.car,d.name,d.laps.length,formatTime(row.bestMs),row.bestMs===null?'':bestSpeed(row.bestMs,trackMeters),bestCount,formatTime(row.baseMs),row.penaltyMs/1000,formatTime(row.resultMs),d.laps.map(formatTime).join(' / ')];
    });
    const lines=[`# ${sessionTitle.replace(/[\r\n]/g,' ').slice(0,70)} | En iyi ${bestCount} tur | Pist ${trackMeters} m`, head.map(escapeCsvCell).join(';'), ...rows.map(row=>row.map(x=>escapeCsvCell(String(x))).join(';'))];
    const csv='\uFEFF'+lines.join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');anchor.href=url;anchor.download='f1-medipol-gokart-sonuclar.csv';document.body.appendChild(anchor);anchor.click();anchor.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),500);
  };

  return (
    <div className={s.wrap}>
      <header className={s.topbar}>
        <div>
          <span className={s.overline}>F1 MEDİPOL / KARTING RACE CONTROL</span>
          <h1>GO-KART <em>TIMING.</em></h1>
          <p>Gerçek go-kart sürüşlerinde tur kaydı, kronometre, cezalar ve otomatik sıralama.</p>
        </div>
        <div className={s.topbadges}><span>◷ ÇOKLU TUR ZAMANLAMA</span><span>◉ YEREL OTURUM</span></div>
      </header>
      {message && <div className={s.notification} role="status">{message}<button onClick={()=>setMessage("")} type="button" aria-label="Mesajı kapat">×</button></div>}
      <div className={s.stats}>
        <div><span>KAYITLI SÜRÜCÜ</span><strong>{drivers.length}</strong></div>
        <div><span>TOPLAM TUR</span><strong>{totalLaps}</strong></div>
        <div><span>EN HIZLI TUR</span><strong>{formatTime(globalFastest)}</strong></div>
        <div><span>SIRALANAN SÜRÜCÜ</span><strong>{rankedCount}</strong></div>
      </div>
      <div className={s.mainGrid}>
        <div className={s.leftColumn}>
          <section className={s.panel}>
            <div className={s.panelHeading}><div><span>01 / CANLI GRID</span><h2>Sürücüler ve canlı süreler</h2></div><strong>{drivers.length} ARAÇ</strong></div>
            <p className={s.raceHint}>Bütün sürücüler aynı anda tur atar. Sürücüye dokunup merkezde tur kaydet veya satırındaki <b>+ TUR</b> butonunu kullan.</p>
            <form className={s.addForm} onSubmit={addDriver}>
              <label>SÜRÜCÜ ADI<input value={name} maxLength={60} onChange={e=>setName(e.target.value)} placeholder="Örn. Ahmet Yılmaz" required /></label>
              <label>ARAÇ ADI / NUMARASI<input value={car} maxLength={30} onChange={e=>setCar(e.target.value)} placeholder={`Araç ${drivers.length+1}`} /></label>
              <button className={s.primaryBtn} type="submit">+ SÜRÜCÜ EKLE</button>
            </form>
            <div className={s.driverList}>
              {!drivers.length && <div className={s.empty}>Henüz sürücü eklenmedi. İstediğin kadar sürücü ve araç tanımlayabilirsin.</div>}
              {drivers.map(d=>{
                const best=d.laps.length?Math.min(...d.laps):null;
                return <div className={`${s.driverRow} ${activeId===d.id?s.driverActive:''}`} key={d.id}>
                  <button type="button" className={s.driverPick} aria-pressed={activeId===d.id} onClick={()=>chooseDriver(d.id)}>
                    <span className={s.driverCircle}>{d.name.slice(0,1).toLocaleUpperCase('tr-TR')}</span>
                    <span className={s.driverIdentity}><b>{d.name}</b><small>{d.car} · {d.laps.length} tur · PB {formatTime(best)}</small></span>
                    <span className={s.liveRowClock}>{formatTime(currentLap(d.id))}</span>
                  </button>
                  <button type="button" className={s.rowLapButton} onClick={()=>recordLapFor(d.id)} disabled={!running} aria-label={`${d.name} için tur kaydet`}>+ TUR</button>
                  <button type="button" className={s.deleteTiny} onClick={()=>removeDriver(d.id)} aria-label={`${d.name} sürücüsünü sil`}>×</button>
                </div>;
              })}
            </div>
          </section>

          <section className={s.panel}>
            <div className={s.panelHeading}><div><span>02 / YARIŞ KONTROL</span><h2>Eşzamanlı tur kronometresi</h2></div><strong>{active?active.car:'SÜRÜCÜ SEÇ'}</strong></div>
            <div className={s.raceStatus}><span className={running?s.raceOn:s.raceOff}>{running?'● TÜM SÜRÜCÜLER PİSTTE':elapsed>0?'Ⅱ YARIŞ DURAKLATILDI':'○ HAZIR'}</span><strong>YARIŞ SÜRESİ {formatTime(elapsed)}</strong></div>
            <div className={s.clockSurface}>
              <span className={s.clockLabel}>{active?active.name:'Listeden bir sürücü seç'}</span>
              <strong className={s.clockValue}>{active?formatTime(currentLap(active.id)):'00:00.000'}</strong>
              <div className={s.clockMeta}><span>{running?'● TUR SÜRESİ AKIYOR':elapsed>0?'Ⅱ DURAKLATILDI':'○ HAZIR'}</span><span>EN İYİ: {formatTime(activeBest)}</span></div>
            </div>
            <div className={s.clockActions}>
              <button type="button" className={s.primaryBtn} onClick={toggleTimer} disabled={!drivers.length}>{running?'Ⅱ TÜMÜNÜ DURAKLAT':elapsed>0?'▶ DEVAM ET':'▶ YARIŞI BAŞLAT'}</button>
              <button type="button" className={s.secondaryBtn} onClick={()=>active&&recordLapFor(active.id)} disabled={!active||!running}>+ SEÇİLİ SÜRÜCÜ TUR KAYDET</button>
              <button type="button" className={s.tertiaryBtn} onClick={clearClock} disabled={running||elapsed===0}>SAATİ SIFIRLA</button>
            </div>
            <p className={s.helper}>Yarışı başlatınca tüm sürücüler aynı anda süre tutmaya başlar. Her sürücünün tur başlangıcı ayrıdır. Sürücü değiştirmek diğer sürücülerin turunu kesmez; tur kaydı yalnızca seçtiğin sürücünün sayacını sıfırlar.</p>
            <form className={s.manualForm} onSubmit={addManual}>
              <label>MANUEL TUR SÜRESİ<input placeholder="01:12.345 veya 72.345" value={manual} onChange={e=>setManual(e.target.value)} inputMode="decimal" /></label>
              <button type="submit" disabled={!active}>TUR EKLE ↗</button>
            </form>
          </section>

          <section className={s.panel}>
            <div className={s.panelHeading}><div><span>03 / TUR GEÇMİŞİ</span><h2>Seçili sürücünün turları</h2></div><strong>{active?.laps.length??0} TUR</strong></div>
            {activeBest!==null && <div className={s.avgSpeed}>EN HIZLI TURUN ORTALAMA HIZI <strong>{bestSpeed(activeBest,trackMeters)}</strong></div>}
            {!active || !active.laps.length ? <div className={s.empty}>Sürücü seçip kronometreyle veya manuel olarak tur ekle. Her tur burada görünür.</div> :
            <div className={s.lapList}>{active.laps.map((lap,i)=><div key={`${active.id}-${i}`} className={s.lapRow}>
              <span>TUR {String(i+1).padStart(2,'0')}</span><strong>{formatTime(lap)}</strong>{lap===activeBest&&<small>EN HIZLI</small>}
              <button type="button" onClick={()=>updateDriver(active.id,d=>({...d,laps:d.laps.filter((_,index)=>index!==i)}))} aria-label={`${i+1}. turu sil`}>SİL</button>
            </div>)}</div>}
          </section>
        </div>
        <div className={s.rightColumn}>
          <section className={s.panel}>
            <div className={s.panelHeading}><div><span>04 / YARIŞ KURALLARI</span><h2>Sıralama ayarları</h2></div></div>
            <div className={s.configGrid}>
              <label>OTURUM ADI<input value={sessionTitle} maxLength={70} onChange={e=>setSessionTitle(e.target.value)} /></label>
              <label>PİST UZUNLUĞU (METRE)<input value={trackMeters} type="number" min={1} max={100000} step={1} onChange={e=>setTrackMeters(Math.max(1,Math.min(100000,Number(e.target.value)||1)))} /></label>
            </div>
            <div className={s.modeLabel}>HESAPLANACAK EN İYİ TUR SAYISI</div>
            <div className={s.modeButtons}>{modes.map(n=><button type="button" key={n} className={bestCount===n?s.modeActive:''} aria-pressed={bestCount===n} onClick={()=>setBestCount(n)}>EN İYİ {n}</button>)}</div>
            <p className={s.helper}>Her sürücünün en hızlı {bestCount} turu toplanır. +3/+5 saniye cezalar bu toplama eklenir. Yeterli turu olmayan sürücü sıralamaya girmez. Ortalama hız, girilen pist uzunluğuna göre hesaplanır.</p>
          </section>
          <section className={s.panel}>
            <div className={s.panelHeading}><div><span>05 / YARIŞ KOMİSERİ</span><h2>Süre cezaları</h2></div></div>
            {!drivers.length?<div className={s.empty}>Ceza uygulamak için önce sürücü ekle.</div>:
             <div className={s.penaltyList}>{drivers.map(d=>{
               const penalty=d.penalties.reduce((sum,p)=>sum+p.seconds,0);
               return <div className={s.penaltyRow} key={d.id}>
                 <div><strong>{d.name}</strong><small>{d.car} · {penalty?`+${penalty} sn ceza`:'Ceza yok'}</small></div>
                 <div className={s.penaltyButtons}>
                   <button type="button" onClick={()=>addPenalty(d.id,3)}>+3 sn</button>
                   <button type="button" onClick={()=>addPenalty(d.id,5)}>+5 sn</button>
                   <button type="button" disabled={!d.penalties.length} onClick={()=>updateDriver(d.id,x=>({...x,penalties:x.penalties.slice(0,-1)}))} title="Son cezayı geri al">↶</button>
                 </div>
               </div>;
             })}</div>}
          </section>
          <section className={s.panel} id="gokart-results">
            <div className={s.panelHeading}><div><span>06 / RESMÎ SONUÇLAR</span><h2>Canlı sıralama</h2></div><strong>EN İYİ {bestCount} TUR</strong></div>
            <div className={s.resultTableWrap}><table className={s.resultTable}><thead><tr><th>POS</th><th>SÜRÜCÜ</th><th>EN İYİ</th><th>CEZA</th><th>NET SÜRE</th></tr></thead><tbody>
              {ranked.length===0?<tr><td colSpan={5} className={s.tableEmpty}>Henüz sıralanacak sürücü yok.</td></tr>:ranked.map((row:ScoredDriver)=><tr key={row.driver.id} className={row.position===1?s.firstPlace:''}>
                <td className={s.place}>{row.position===null?'—':String(row.position).padStart(2,'0')}</td>
                <td><strong>{row.driver.name}</strong><small>{row.driver.car}{row.resultMs===null?` · ${bestCount-row.lapCount} tur eksik`:''}</small></td>
                <td>{formatTime(row.bestMs)}</td>
                <td>{row.penaltyMs?`+${row.penaltyMs/1000}s`:'—'}</td>
                <td className={s.finalTime}>{formatTime(row.resultMs)}</td>
              </tr>)}</tbody></table></div>
            <div className={s.resultActions}>
              <button type="button" className={s.primaryBtn} onClick={()=>void copyResults()} disabled={!drivers.length}>⧉ SONUÇLARI KOPYALA</button>
              <button type="button" className={s.secondaryBtn} onClick={exportCsv} disabled={!drivers.length}>↓ CSV İNDİR</button>
            </div>
            <p className={s.helper}>Net sonuç = seçilen en hızlı turların toplamı + süre cezaları. Eşitlikte en hızlı tek turu daha iyi olan önde olur.</p>
          </section>
        </div>
      </div>
      <div className={s.bottomBar}>
        <span>◉ KAYITLAR BU TARAYICIDA OTOMATİK SAKLANIR · SUPABASE'E GÖNDERİLMEZ</span>
        <button type="button" className={s.clearBtn} onClick={clearSession}>OTURUMU SIFIRLA</button>
      </div>
    </div>
  );
}
