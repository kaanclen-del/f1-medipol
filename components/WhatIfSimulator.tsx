"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type WhatIfDriver = {
  id: string;
  name: string;
  code: string;
  number: string;
  teamId: string;
  teamName: string;
  points: number;
  position: number;
};

export type WhatIfTeam = { id: string; name: string; points: number; position: number };
export type WhatIfRace = { round: number; name: string; date: string; sprint: boolean };

const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] as const;

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

export default function WhatIfSimulator({ season, drivers, teams, races }: {
  season: number;
  drivers: WhatIfDriver[];
  teams: WhatIfTeam[];
  races: WhatIfRace[];
}) {
  const [raceRound, setRaceRound] = useState<number>(races[0]?.round ?? 0);
  const [order, setOrder] = useState<string[]>(() => drivers.map((driver) => driver.id));
  const [saveMessage, setSaveMessage] = useState("");
  const [winnerId, setWinnerId] = useState("");

  const driverById = useMemo(() => new Map(drivers.map((driver) => [driver.id, driver])), [drivers]);
  const selectedRace = races.find((race) => race.round === raceRound) || races[0];

  const pointsByDriver = useMemo(() => {
    const points = new Map<string, number>();
    order.forEach((id, index) => points.set(id, RACE_POINTS[index] ?? 0));
    return points;
  }, [order]);

  const driverRanking = useMemo(() => drivers.map((driver) => ({
    ...driver,
    added: pointsByDriver.get(driver.id) ?? 0,
    projected: driver.points + (pointsByDriver.get(driver.id) ?? 0),
  })).sort((a, b) => b.projected - a.projected || a.position - b.position), [drivers, pointsByDriver]);

  const teamRanking = useMemo(() => {
    const additions = new Map<string, number>();
    for (const driver of drivers) {
      additions.set(driver.teamId, (additions.get(driver.teamId) ?? 0) + (pointsByDriver.get(driver.id) ?? 0));
    }
    return teams.map((team) => ({ ...team, added: additions.get(team.id) ?? 0,
      projected: team.points + (additions.get(team.id) ?? 0),
    })).sort((a, b) => b.projected - a.projected || a.position - b.position);
  }, [teams, drivers, pointsByDriver]);

  function moveDriver(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= order.length) return;
    setOrder((current) => {
      const updated = [...current];
      [updated[index], updated[next]] = [updated[next], updated[index]];
      return updated;
    });
    setSaveMessage("");
  }

  function makeWinner(id: string) {
    setOrder((current) => [id, ...current.filter((driverId) => driverId !== id)]);
    setSaveMessage("");
  }

  async function copyResult() {
    const lines = [
      `F1 MEDİPOL · WHAT IF · ${season} ${selectedRace?.name || "Grand Prix"}`,
      `Alternatif podyum: ${order.slice(0, 3).map((id, index) => `P${index + 1} ${driverById.get(id)?.name || "?"}`).join(" / ")}`,
      "Simüle edilen pilotlar şampiyonası:",
      ...driverRanking.slice(0, 10).map((driver, index) => `${index + 1}. ${driver.name}: ${driver.projected} puan (${signed(driver.added)})`),
      "Bu sonuç resmî değildir; hayalî yarış senaryosudur.",
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setSaveMessage("Senaryo özeti kopyalandı. Paddock'ta paylaşabilirsin.");
    } catch {
      setSaveMessage("Tarayıcı kopyalamaya izin vermedi.");
    }
  }

  function saveResult() {
    try {
      window.localStorage.setItem("f1medipol-whatif-latest", JSON.stringify({
        season, round: selectedRace?.round, order, savedAt: new Date().toISOString(),
      }));
      setSaveMessage("Senaryo bu tarayıcıya kaydedildi. Henüz profiline gönderilmiyor.");
    } catch {
      setSaveMessage("Tarayıcıda kaydetme başarısız oldu.");
    }
  }

  function restoreResult() {
    try {
      const saved = JSON.parse(window.localStorage.getItem("f1medipol-whatif-latest") || "null") as
        { season?: number; round?: number; order?: string[] } | null;
      if (!saved || saved.season !== season || !Array.isArray(saved.order)) {
        setSaveMessage("Bu sezon için kayıtlı senaryo bulunamadı.");
        return;
      }
      const allKnown = saved.order.length === drivers.length && saved.order.every((id) => driverById.has(id));
      if (!allKnown || new Set(saved.order).size !== drivers.length) {
        setSaveMessage("Eski senaryo artık güncel pilot listesiyle uyuşmuyor.");
        return;
      }
      if (races.some((race) => race.round === saved.round)) setRaceRound(saved.round!);
      setOrder(saved.order);
      setSaveMessage("Kayıtlı senaryo yüklendi.");
    } catch { setSaveMessage("Kayıtlı senaryo okunamadı."); }
  }

  return <main className="wi-root">
    <style>{`
      .wi-root{min-height:100vh;padding:32px max(20px,calc((100vw - 1460px)/2)) 90px;color:#f4f5f7;
        background:radial-gradient(circle at 78% 2%,rgba(225,6,0,.18),transparent 32%),linear-gradient(145deg,#090d14,#19090d 65%,#0a0c12)}
      .wi-root *{box-sizing:border-box}.wi-back{color:#ff6b65;text-decoration:none;font-size:12px;font-weight:850}
      .wi-head{margin:15px 0 25px;padding:30px 32px;border:1px solid #ffffff1c;border-radius:20px;
        background:linear-gradient(100deg,#271017,#111822)}
      .wi-eyebrow{font-size:10px;font-weight:950;letter-spacing:.14em;color:#ff6862}
      .wi-head h1{font-size:clamp(42px,5vw,74px);letter-spacing:-.065em;line-height:1;margin:12px 0;color:#fff}
      .wi-head h1 span{color:#ff4943}.wi-head p{max-width:72ch;line-height:1.6;color:#b6bdc7;font-size:14px}
      .wi-selector{display:flex;align-items:center;gap:15px;flex-wrap:wrap;margin-top:20px}
      .wi-selector label{color:#f6c6c5;font-size:11px;font-weight:900}
      .wi-selector select{max-width:100%;background:#0e141d;border:1px solid #ffffff29;color:#fff;
        padding:13px 18px;border-radius:10px;font-size:14px;min-width:260px}
      .wi-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:15px;align-items:start}
      .wi-panel{border:1px solid #ffffff1d;border-radius:16px;background:#11151eee;overflow:hidden}
      .wi-panel-title{padding:22px 23px 16px;border-bottom:1px solid #ffffff1b}
      .wi-panel-title span{display:block;font-size:10px;font-weight:900;color:#ff7771;letter-spacing:.11em}
      .wi-panel-title h2{font-size:24px;color:#fff;margin:7px 0 4px;letter-spacing:-.025em}
      .wi-panel-title p{font-size:11px;color:#9ca7b5;margin:0}
      .wi-driver-list{max-height:650px;overflow-y:auto;scrollbar-color:#953b40 #15151c;scrollbar-width:thin}
      .wi-driver-row{display:grid;grid-template-columns:32px minmax(0,1fr) 55px 94px;
        align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #ffffff10}
      .wi-driver-row:nth-child(-n+3){background:rgba(225,6,0,.07)}
      .wi-place{font-size:21px;color:#ff5b55;font-weight:950}.wi-driver-name{display:block;font-size:13px;font-weight:850}
      .wi-driver-team{color:#99a3af;font-size:10px}.wi-driver-points{color:#f5cc75;font-weight:900;font-size:12px;text-align:right}
      .wi-moves{display:flex;gap:5px}.wi-moves button{background:#272d37;border:1px solid #ffffff20;color:#fff;
        border-radius:6px;width:29px;height:29px;cursor:pointer;font-size:15px}
      .wi-moves button:disabled{opacity:.23;cursor:default}
      .wi-rankings{display:grid;gap:15px}.wi-result-table{padding:9px 18px 16px}
      .wi-table-row{display:grid;grid-template-columns:28px minmax(0,1fr) 88px 70px;gap:9px;
        align-items:center;padding:11px 0;border-bottom:1px solid #ffffff15;font-size:12px}
      .wi-table-row:last-child{border-bottom:0}
      .wi-table-row strong{color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .wi-table-row span:first-child{color:#ff7168;font-weight:950}.wi-table-row b{color:#f5cf7b;text-align:right}
      .wi-table-row em{font-size:10px;color:#6fdda0;font-style:normal;text-align:right}
      .wi-actions{display:flex;gap:10px;flex-wrap:wrap;padding:18px 22px;border-top:1px solid #ffffff15}
      .wi-actions button{border:1px solid #ffffff36;background:#25212b;color:#fff;padding:12px 15px;border-radius:9px;
        font-size:11px;font-weight:900;cursor:pointer}
      .wi-actions button:first-child{background:#db1715;border-color:#f83531}
      .wi-alert{margin:0 22px 19px;font-size:12px;color:#f5cc75}
      .wi-warning{margin-top:16px;padding:18px 21px;color:#bfc5ce;font-size:12px;line-height:1.6;
        background:#ffffff08;border:1px solid #ffffff1a;border-radius:12px}
      .wi-quickwinner{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 16px;border-bottom:1px solid #ffffff17}
      .wi-quickwinner select,.wi-quickwinner button{padding:11px 12px;border-radius:8px;border:1px solid #ffffff2b;background:#171b24;color:#fff;min-width:0}
      .wi-quickwinner button{background:#a41d22;cursor:pointer;font-weight:850;font-size:11px}
      @media(max-width:1050px){.wi-grid{grid-template-columns:1fr}}
      @media(max-width:600px){.wi-root{padding:17px 12px 65px}.wi-head{padding:23px 18px}
        .wi-driver-row{grid-template-columns:26px minmax(0,1fr) 35px 76px;gap:8px;padding:12px 9px}
        .wi-driver-name{font-size:11px}.wi-driver-points{font-size:10px}
        .wi-panel-title h2{font-size:20px}.wi-table-row{grid-template-columns:24px minmax(0,1fr) 60px 45px;font-size:10px}}
    `}</style>
    <Link href="/arcade/manager" className="wi-back">← ARCADE MANAGER</Link>
    <header className="wi-head">
      <div className="wi-eyebrow">F1 MEDİPOL · ARCADE / WHAT IF</div>
      <h1>Ya <span>başkası</span> kazansaydı?</h1>
      <p>Gelecek bir Grand Prix'nin bitiş sırasını yeniden oluştur, puanları dağıt ve pilotlar ile takımlar şampiyonasındaki alternatif tabloyu anında gör. Tamamen hayalî bir simülasyon.</p>
      <div className="wi-selector"><label htmlFor="wi-race">SENARYO YARIŞI</label>
        <select id="wi-race" value={raceRound} onChange={(event) => setRaceRound(Number(event.target.value))} disabled={!races.length}>
          {races.length ? races.map((race) => <option value={race.round} key={race.round}>R{race.round} · {race.name}</option>) : <option value={0}>Sıradaki yarış bekleniyor</option>}
        </select>
      </div>
    </header>
    {drivers.length === 0 || teams.length === 0 ? (
      <div className="wi-panel" style={{ padding:32 }}>Jolpica'dan güncel şampiyona verisi henüz alınamadı. Biraz sonra tekrar deneyebilirsin.</div>
    ) : <>
      <div className="wi-grid">
        <section className="wi-panel">
          <div className="wi-panel-title"><span>01 · SENARYOYU BELİRLE</span><h2>Alternatif Finiş Sırası</h2>
            <p>Oklarla pilotları taşı veya aşağıdan yarış galibini seç.</p></div>
          <div className="wi-quickwinner">
            <select aria-label="Alternatif yarış galibi" id="wi-winner" value={winnerId} onChange={(event) => setWinnerId(event.target.value)}>
              <option value="" disabled>Galibi seç</option>
              {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
            </select>
            <button type="button" disabled={!winnerId} onClick={() => {
              if (winnerId && driverById.has(winnerId)) makeWinner(winnerId);
            }}>P1'E YERLEŞTİR →</button>
          </div>
          <div className="wi-driver-list">
            {order.map((id, index) => {
              const driver = driverById.get(id);
              if (!driver) return null;
              return <div className="wi-driver-row" key={id}>
                <span className="wi-place">{String(index + 1).padStart(2, "0")}</span>
                <div><strong className="wi-driver-name">{driver.name}</strong>
                  <span className="wi-driver-team">{driver.code} · {driver.teamName}</span></div>
                <span className="wi-driver-points">{RACE_POINTS[index] ?? 0} P</span>
                <div className="wi-moves">
                  <button type="button" aria-label={`${driver.name} yukarı taşı`} disabled={index === 0} onClick={() => moveDriver(index, -1)}>↑</button>
                  <button type="button" aria-label={`${driver.name} aşağı taşı`} disabled={index === order.length - 1} onClick={() => moveDriver(index, 1)}>↓</button>
                </div>
              </div>;
            })}
          </div>
          <div className="wi-actions">
            <button type="button" onClick={saveResult}>SENARYOYU KAYDET</button>
            <button type="button" onClick={restoreResult}>KAYDI YÜKLE</button>
            <button type="button" onClick={() => { setOrder(drivers.map((driver) => driver.id)); setSaveMessage(""); }}>SIFIRLA</button>
          </div>
          {saveMessage && <p className="wi-alert" role="status">{saveMessage}</p>}
        </section>
        <div className="wi-rankings">
          <section className="wi-panel"><div className="wi-panel-title"><span>02 · ALTERNATİF SONUÇ</span><h2>Pilotlar Şampiyonası</h2>
              <p>Mevcut resmî puan + senaryonun yarış puanları.</p></div>
            <div className="wi-result-table">{driverRanking.slice(0, 12).map((driver, index) => <div className="wi-table-row" key={driver.id}>
              <span>P{index + 1}</span><strong>{driver.code} · {driver.name}</strong><b>{driver.projected} P</b><em>{signed(driver.added)} P</em>
            </div>)}</div></section>
          <section className="wi-panel"><div className="wi-panel-title"><span>03 · CONSTRUCTOR STANDINGS</span><h2>Takımlar Şampiyonası</h2>
              <p>Her takımın pilotlarına verilen alternatif yarış puanları eklenir.</p></div>
            <div className="wi-result-table">{teamRanking.map((team, index) => <div className="wi-table-row" key={team.id}>
              <span>P{index + 1}</span><strong>{team.name}</strong><b>{team.projected} P</b><em>{signed(team.added)} P</em>
            </div>)}</div></section>
          <section className="wi-panel"><div className="wi-panel-title"><span>04 · PAYLAŞ</span><h2>Senaryonu Tartış</h2>
              <p>Alternatif podyumu ve puan tablosunu kopyalayıp Paddock'ta paylaş.</p></div>
            <div className="wi-actions"><button type="button" onClick={copyResult}>SONUÇ ÖZETİNİ KOPYALA</button>
              <Link className="wi-back" href="/paddock" style={{ alignSelf:"center" }}>PADDOCK'A GİT ↗</Link></div></section>
        </div>
      </div>
      <p className="wi-warning">Önemli: Bu simülasyon yalnızca seçilen Grand Prix'nin normal yarış puanlarını (25-18-15-12-10-8-6-4-2-1) ekler. Sprint, ceza, diskalifiye ve eşit puanlardaki galibiyet sayısı gibi resmî kurallar ayrıca hesaplanmaz. Veritabanındaki gerçek sonuçlar, profildeki XP ve resmî şampiyona tabloları değiştirilmez. Tarayıcıda kaydetme cihazına özeldir.</p>
    </>}
  </main>;
}
