"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { formatTime, rankDrivers } from "./timing-utils";
import type { Driver, ScoreMode, ScoredDriver } from "./timing-utils";
import s from "./timing.module.css";

const STORAGE_KEY = "f1-medipol-gokart-timing-v1";
const modes: ScoreMode[] = [1, 2, 3, 5];
const makeId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

type RaceClock = {
  running: boolean;
  elapsedMs: number;
  savedAt: number;
  lapMarks: Record<string, number>;
};

type Persisted = {
  drivers: Driver[];
  teams: string[];
  bestCount: ScoreMode;
  trackMeters: number;
  sessionTitle: string;
  clock?: RaceClock;
};

function parseStored(raw: string): Persisted | null {
  try {
    const data = JSON.parse(raw) as Partial<Persisted>;
    if (!Array.isArray(data.drivers)) return null;
    const drivers: Driver[] = data.drivers
      .filter(
        (d): d is Driver =>
          Boolean(d) &&
          typeof d.id === "string" &&
          typeof d.name === "string" &&
          typeof d.car === "string" &&
          Array.isArray(d.laps) &&
          Array.isArray(d.penalties),
      )
      .map((d) => ({
        id: d.id,
        name: d.name.slice(0, 60),
        car: d.car.slice(0, 30),
        team: typeof d.team === "string" ? d.team.slice(0, 50) : "",
        photo: typeof d.photo === "string" ? d.photo : "",
        laps: d.laps.filter((x) => typeof x === "number" && Number.isFinite(x) && x >= 1000 && x <= 3600000),
        penalties: d.penalties.filter((p) => p && typeof p.id === "string" && (p.seconds === 3 || p.seconds === 5)),
      }));

    return {
      drivers,
      teams: Array.isArray(data.teams)
        ? data.teams
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.trim().slice(0, 50))
            .filter(Boolean)
            .slice(0, 100)
        : Array.from(new Set(drivers.map((d) => d.team).filter((t): t is string => Boolean(t)))),
      bestCount: modes.includes(data.bestCount as ScoreMode) ? (data.bestCount as ScoreMode) : 1,
      trackMeters:
        typeof data.trackMeters === "number" && data.trackMeters >= 1 && data.trackMeters <= 100000 ? data.trackMeters : 600,
      sessionTitle: typeof data.sessionTitle === "string" ? data.sessionTitle.slice(0, 70) : "Go-Kart Yarışı",
      clock:
        data.clock &&
        typeof data.clock === "object" &&
        typeof data.clock.elapsedMs === "number" &&
        Number.isFinite(data.clock.elapsedMs) &&
        data.clock.elapsedMs >= 0 &&
        typeof data.clock.savedAt === "number" &&
        typeof data.clock.lapMarks === "object" &&
        data.clock.lapMarks !== null
          ? {
              running: data.clock.running === true,
              elapsedMs: Math.min(data.clock.elapsedMs, 12 * 60 * 60 * 1000),
              savedAt: data.clock.savedAt,
              lapMarks: Object.fromEntries(
                Object.entries(data.clock.lapMarks).filter(
                  (entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] >= 0,
                ),
              ),
            }
          : undefined,
    };
  } catch {
    return null;
  }
}

function bestSpeed(bestMs: number | null, meters: number): string {
  if (bestMs === null || bestMs <= 0 || meters <= 0) return "—";
  return ((meters / 1000) / (bestMs / 3600000)).toFixed(1) + " km/sa";
}

function driverInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toLocaleUpperCase("tr-TR") ?? "").join("") || name.slice(0, 1).toLocaleUpperCase("tr-TR");
}

export default function TimingClient() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [teamName, setTeamName] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [showTeamWinner, setShowTeamWinner] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [driverPhoto, setDriverPhoto] = useState("");
  const bestCount: ScoreMode = 1;
  const [trackMeters, setTrackMeters] = useState(600);
  const [sessionTitle, setSessionTitle] = useState("Go-Kart Yarışı");
  const [isLoaded, setIsLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const accruedRef = useRef(0);
  const lapMarksRef = useRef<Record<string, number>>({});
  const runningRef = useRef(false);

  useEffect(() => {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      if (value) {
        const saved = parseStored(value);
        if (saved) {
          setDrivers(saved.drivers);
          setTeams(saved.teams);
          setSelectedTeam(saved.teams[0] ?? "");
          setTrackMeters(saved.trackMeters);
          setSessionTitle(saved.sessionTitle);
          setActiveId(saved.drivers[0]?.id ?? null);
          if (saved.clock) {
            const sinceSaved = Math.max(0, Date.now() - saved.clock.savedAt);
            const resume = saved.clock.running && sinceSaved < 4 * 60 * 60 * 1000;
            accruedRef.current = saved.clock.elapsedMs + (resume ? sinceSaved : 0);
            lapMarksRef.current = saved.clock.lapMarks;
            setElapsed(accruedRef.current);
            if (resume) {
              startRef.current = Date.now();
              runningRef.current = true;
              setRunning(true);
            }
          }
        }
      }
    } catch {}
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      const stamp = Date.now();
      const raceElapsed = accruedRef.current + (runningRef.current ? Math.max(0, stamp - startRef.current) : 0);
      const data: Persisted = {
        drivers,
        teams,
        bestCount,
        trackMeters,
        sessionTitle,
        clock: { running: runningRef.current, elapsedMs: raceElapsed, savedAt: stamp, lapMarks: { ...lapMarksRef.current } },
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [drivers, teams, bestCount, trackMeters, sessionTitle, isLoaded, running]);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setElapsed(accruedRef.current + (Date.now() - startRef.current)), 40);
    return () => window.clearInterval(interval);
  }, [running]);

  const active = drivers.find((d) => d.id === activeId) ?? null;
  const ranked = useMemo(() => rankDrivers(drivers, bestCount), [drivers, bestCount]);
  const rankedCount = ranked.filter((x) => x.position !== null).length;
  const totalLaps = drivers.reduce((n, d) => n + d.laps.length, 0);
  const globalFastest = ranked.reduce<number | null>((best, x) => (x.bestMs === null ? best : best === null ? x.bestMs : Math.min(best, x.bestMs)), null);
  const activeBest = active?.laps.length ? Math.min(...active.laps) : null;

  const teamResults = useMemo(
    () =>
      teams
        .map((team) => {
          const entries = rankDrivers(
            drivers.filter((d) => d.team === team),
            1,
          ).filter((row) => row.resultMs !== null);
          const fastest = entries[0] ?? null;
          return { team, drivers: drivers.filter((d) => d.team === team).length, fastest };
        })
        .sort((a, b) => (a.fastest?.resultMs ?? Infinity) - (b.fastest?.resultMs ?? Infinity) || a.team.localeCompare(b.team, "tr")),
    [teams, drivers],
  );
  const fastestTeam = teamResults.find((row) => row.fastest !== null) ?? null;

  const updateDriver = (id: string, edit: (d: Driver) => Driver) => setDrivers((prev) => prev.map((d) => (d.id === id ? edit(d) : d)));
  const raceNow = () => accruedRef.current + (runningRef.current ? Math.max(0, Date.now() - startRef.current) : 0);
  const currentLap = (id: string) => Math.max(0, elapsed - (lapMarksRef.current[id] ?? 0));

  const clearClock = () => {
    runningRef.current = false;
    setRunning(false);
    setElapsed(0);
    accruedRef.current = 0;
    startRef.current = 0;
    lapMarksRef.current = Object.fromEntries(drivers.map((d) => [d.id, 0]));
    setMessage("Kronometre sıfırlandı. Daha önce kaydedilen turlar korundu.");
  };

  const chooseDriver = (id: string) => {
    setActiveId(id);
    setMessage("");
  };

  const onPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Sadece görsel dosyası seçebilirsin.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDriverPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const addTeam = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next = teamName.trim().slice(0, 50);
    if (!next) {
      setMessage("Takım adını yaz.");
      return;
    }
    const existing = teams.find((team) => team.toLocaleLowerCase("tr-TR") === next.toLocaleLowerCase("tr-TR"));
    if (existing) {
      setSelectedTeam(existing);
      setMessage("Bu takım zaten kayıtlı.");
      return;
    }
    setTeams((prev) => [...prev, next]);
    setSelectedTeam(next);
    setTeamName("");
    setShowTeamWinner(false);
    setMessage(`${next} takımı eklendi.`);
  };

  const renameTeam = (team: string) => {
    const response = window.prompt(`“${team}” takımının yeni adını yaz:`, team);
    if (response === null) return;
    const next = response.trim().slice(0, 50);
    if (!next) { setMessage("Takım adı boş olamaz."); return; }
    if (next === team) return;
    if (teams.some(t => t !== team && t.toLocaleLowerCase("tr-TR") === next.toLocaleLowerCase("tr-TR"))) {
      setMessage("Bu isimde başka bir takım var."); return;
    }
    setTeams(prev => prev.map(t => t === team ? next : t));
    setDrivers(prev => prev.map(d => d.team === team ? {...d, team: next} : d));
    setSelectedTeam(prev => prev === team ? next : prev);
    setShowTeamWinner(false);
    setMessage(`Takım adı “${next}” olarak değiştirildi. Sürücüler ve turlar korundu.`);
  };

  const deleteTeam = (team: string) => {
    const affected = drivers.filter(d => d.team === team).length;
    if (!window.confirm(`“${team}” takımı silinsin mi? ${affected} sürücü takımsız kalacak; sürücüler, tur süreleri ve cezalar silinmeyecek.`)) return;
    const remaining = teams.filter(t => t !== team);
    setTeams(remaining);
    setDrivers(prev => prev.map(d => d.team === team ? {...d, team: ""} : d));
    setSelectedTeam(prev => prev === team ? (remaining[0] ?? "") : prev);
    setShowTeamWinner(false);
    setMessage(`“${team}” silindi. ${affected} sürücü ve tur kayıtları korundu.`);
  };

  const assignTeam = (id: string, team: string) => {
    updateDriver(id, (d) => ({ ...d, team }));
    setShowTeamWinner(false);
  };

  const addDriver = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextName = name.trim();
    if (!nextName) {
      setMessage("Önce sürücü adını gir.");
      return;
    }
    if (!selectedTeam) {
      setMessage("Önce bir takım oluşturup seç.");
      return;
    }
    const used = new Set(drivers.map((d) => d.car.trim().toLocaleLowerCase("tr-TR")));
    let n = 1;
    while (used.has(`araç ${n}`)) n++;
    const nextCar = `Araç ${n}`;
    const driver: Driver = { id: makeId(), name: nextName, car: nextCar, team: selectedTeam, photo: driverPhoto, laps: [], penalties: [] };
    lapMarksRef.current[driver.id] = raceNow();
    setDrivers((prev) => [...prev, driver]);
    if (!activeId) setActiveId(driver.id);
    setName("");
    setDriverPhoto("");
    setMessage(`${nextName} kaydedildi.`);
  };

  const removeDriver = (id: string) => {
    const d = drivers.find((x) => x.id === id);
    if (!d) return;
    if (!window.confirm(`${d.name} ve bütün tur kayıtları silinsin mi?`)) return;
    const next = drivers.filter((x) => x.id !== id);
    delete lapMarksRef.current[id];
    setDrivers(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
    setMessage("");
  };

  const addLap = (ms: number) => {
    if (!active) {
      setMessage("Tur eklemek için bir sürücü seç.");
      return;
    }
    if (!Number.isFinite(ms) || ms < 1000 || ms > 3600000) {
      setMessage("Tur süresi 1 saniye ile 60 dakika arasında olmalı.");
      return;
    }
    updateDriver(active.id, (d) => ({ ...d, laps: [...d.laps, Math.round(ms)] }));
    setMessage(`${active.name} için ${formatTime(ms)} turu kaydedildi.`);
  };


  const toggleTimer = () => {
    if (!drivers.length) {
      setMessage("Önce en az bir sürücü ekle.");
      return;
    }
    if (runningRef.current) {
      const ms = raceNow();
      accruedRef.current = ms;
      runningRef.current = false;
      setElapsed(ms);
      setRunning(false);
    } else {
      startRef.current = Date.now();
      runningRef.current = true;
      setRunning(true);
    }
    setMessage("");
  };

  const recordLapFor = (id: string) => {
    const target = drivers.find((d) => d.id === id);
    if (!runningRef.current || !target) {
      setMessage("Tur kaydı için yarışı başlat.");
      return;
    }
    const now = raceNow();
    const mark = lapMarksRef.current[id] ?? 0;
    const lap = now - mark;
    if (lap < 1000) {
      setMessage(`${target.name}: Son geçişin üzerinden 1 saniye geçmeli.`);
      return;
    }
    if (lap > 3600000) {
      setMessage(`${target.name}: Tur 60 dakikayı aştı; kronometreyi sıfırlayıp yeniden başlat.`);
      return;
    }
    lapMarksRef.current[id] = now;
    updateDriver(id, (d) => ({ ...d, laps: [...d.laps, Math.round(lap)] }));
    setElapsed(now);
    setActiveId(id);
    setMessage(`${target.name} · ${target.laps.length + 1}. tur: ${formatTime(lap)} kaydedildi.`);
  };

  const addPenalty = (id: string, seconds: 3 | 5) => {
    updateDriver(id, (d) => ({ ...d, penalties: [...d.penalties, { id: makeId(), seconds }] }));
    setMessage("");
  };

  const clearSession = () => {
    if (!window.confirm("Bütün sürücüleri, tur zamanlarını ve cezaları silmek istiyor musun?")) return;
    runningRef.current = false;
    setRunning(false);
    setElapsed(0);
    accruedRef.current = 0;
    startRef.current = 0;
    lapMarksRef.current = {};
    setDrivers([]);
    setActiveId(null);
    setShowTeamWinner(false);
    setMessage("Oturum temizlendi.");
  };

  const copyResults = async () => {
    if (!drivers.length) {
      setMessage("Önce sürücü ekle.");
      return;
    }
    const report = [
      `${sessionTitle} | En iyi ${bestCount} tur`,
      ...ranked.map(
        (row) =>
          `${row.position === null ? "—" : `${row.position}.`} ${row.driver.team ? `${row.driver.team} · ` : ""}${row.driver.name} | En iyi: ${formatTime(row.bestMs)} | Ceza: +${row.penaltyMs / 1000}s | Net: ${formatTime(row.resultMs)}`,
      ),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(report);
      setMessage("Sıralama panoya kopyalandı.");
    } catch {
      setMessage("Kopyalama izni verilmedi.");
    }
  };

  return (
    <div className={s.wrap}>
      <header className={s.topbar}>
        <div>
          <span className={s.overline}>F1 SOCIAL / KARTING RACE CONTROL</span>
          <h1>
            GO-KART <em>TIMING.</em>
          </h1>
          <p>Tur kaydı, takım karşılaştırması, cezalar ve hızlı butonlarla canlı zamanlama.</p>
        </div>
        <div className={s.topbadges}>
          <span>◷ ÇOKLU TUR ZAMANLAMA</span>
          <span>◉ YEREL OTURUM</span>
        </div>
      </header>

      {message && (
        <div className={s.notification} role="status">
          {message}
          <button onClick={() => setMessage("")} type="button" aria-label="Mesajı kapat">
            ×
          </button>
        </div>
      )}

      <div className={s.stats}>
        <div>
          <span>SÜRÜCÜ</span>
          <strong>{drivers.length}</strong>
        </div>
        <div>
          <span>TUR</span>
          <strong>{totalLaps}</strong>
        </div>
        <div>
          <span>EN HIZLI</span>
          <strong>{formatTime(globalFastest)}</strong>
        </div>
        <div>
          <span>SIRALANAN</span>
          <strong>{rankedCount}</strong>
        </div>
      </div>

      <section className={s.teamPanel}>
        <div className={s.teamHeaderCompact}>
          <div>
            <span className={s.teamOverline}>TAKIM YÖNETİMİ</span>
            <h2>Takımlar</h2>
          </div>
          <strong>{teams.length} TAKIM</strong>
        </div>
        <div className={s.teamCompactRow}>
          <form className={s.teamCreateCompact} onSubmit={addTeam}>
            <input aria-label="Yeni takım adı" placeholder="Takım adı" maxLength={50} value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            <button type="submit" className={s.secondaryBtn}>+ TAKIM</button>
          </form>
          <button type="button" className={s.primaryBtn} onClick={() => setShowTeamWinner(true)} disabled={!fastestTeam}>
            🏁 EN HIZLI TAKIMI BELİRLE
          </button>
        </div>
        {teams.length > 0 && (
          <div className={s.teamChipsCompact}>
            {teams.map((team) => (
              <span key={team} className={s.teamManageChip}>
                <b title={team}>{team}</b>
                <small>{drivers.filter((d) => d.team === team).length} sürücü</small>
                <button type="button" className={s.teamEditButton} onClick={() => renameTeam(team)} aria-label={`${team} takımını düzenle`} title="Takımı yeniden adlandır">Düzenle</button>
                <button type="button" className={s.teamDeleteButton} onClick={() => deleteTeam(team)} aria-label={`${team} takımını sil`} title="Takımı sil">Sil</button>
              </span>
            ))}
          </div>
        )}
        {showTeamWinner && fastestTeam && (
          <div className={s.teamWinnerCompact} role="status">
            <div>
              <span>🏆 EN HIZLI TAKIM</span>
              <strong>{fastestTeam.team}</strong>
              <p>
                Net tur: {formatTime(fastestTeam.fastest?.resultMs ?? null)} · Sürücü: {fastestTeam.fastest?.driver.name}
              </p>
            </div>
            <div className={s.teamStandingsCompact}>
              {teamResults
                .filter((r) => r.fastest)
                .map((r, i) => (
                  <div key={r.team}>
                    <b>{i + 1}. {r.team}</b>
                    <span>{formatTime(r.fastest?.resultMs ?? null)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </section>

      <div className={s.mainGrid}>
        <div className={s.leftColumn}>
          <section className={s.panel}>
            <div className={s.panelHeading}>
              <div>
                <span>01 / CANLI GRID</span>
                <h2>Sürücüler ve canlı süreler</h2>
              </div>
              <strong>{drivers.length} ARAÇ</strong>
            </div>
            <p className={s.raceHint}>Sürücüye dokunup merkezden veya satırındaki <b>+ TUR</b> butonundan hızlıca tur kaydet.</p>
            <form className={s.addFormCompact} onSubmit={addDriver}>
              <label>
                SÜRÜCÜ ADI
                <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Örn. Ahmet Yılmaz" required />
              </label>
              <label>
                TAKIM
                <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} required>
                  <option value="">Takım seç</option>
                  {teams.map((team) => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </label>
              <label className={s.photoPickerLabel}>
                FOTO
                <input type="file" accept="image/*" onChange={onPhotoChange} />
                <span className={s.photoPickerButton}>{driverPhoto ? "Foto değiştir" : "Foto yükle"}</span>
              </label>
              <div className={s.photoPreviewBox}>
                {driverPhoto ? <img src={driverPhoto} alt="Sürücü önizleme" className={s.photoPreview} /> : <span>{driverInitials(name || "S")}</span>}
              </div>
              <button className={s.primaryBtn} type="submit" disabled={!teams.length}>+ SÜRÜCÜ EKLE</button>
            </form>

            <div className={s.driverListCompact}>
              {!drivers.length && <div className={s.empty}>Henüz sürücü eklenmedi. Önce takım oluşturup sürücü ekleyebilirsin.</div>}
              {drivers.map((d) => {
                const best = d.laps.length ? Math.min(...d.laps) : null;
                return (
                  <div className={`${s.driverRowCompact} ${activeId === d.id ? s.driverActive : ""}`} key={d.id}>
                    <button type="button" className={s.driverPickCompact} aria-pressed={activeId === d.id} onClick={() => chooseDriver(d.id)}>
                      <span className={s.driverCirclePhoto}>
                        {d.photo ? <img src={d.photo} alt={`${d.name} profil`} className={s.driverPhoto} /> : <span>{driverInitials(d.name)}</span>}
                      </span>
                      <span className={s.driverIdentityCompact}>
                        <b>{d.name}</b>
                        <small>{d.team || "Takımsız"} · {d.car} · {d.laps.length} tur · PB {formatTime(best)}</small>
                      </span>
                    </button>
                    <span className={s.liveRowClockCompact}>{formatTime(currentLap(d.id))}</span>
                    <select className={s.driverTeamSelect} aria-label={`${d.name} takımını değiştir`} value={d.team ?? ""} onChange={(e) => assignTeam(d.id, e.target.value)}>
                      <option value="">Takımsız</option>
                      {teams.map((team) => (
                        <option key={team} value={team}>{team}</option>
                      ))}
                    </select>
                    <button type="button" className={s.rowLapButtonCompact} onClick={() => recordLapFor(d.id)} disabled={!running} aria-label={`${d.name} için tur kaydet`}>
                      + TUR
                    </button>
                    <button type="button" className={s.deleteTiny} onClick={() => removeDriver(d.id)} aria-label={`${d.name} sürücüsünü sil`}>
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={s.panel}>
            <div className={s.panelHeading}>
              <div>
                <span>02 / YARIŞ KONTROL</span>
                <h2>Eşzamanlı tur kronometresi</h2>
              </div>
              <strong>{active ? active.car : "SÜRÜCÜ SEÇ"}</strong>
            </div>
            <div className={s.raceStatus}>
              <span className={running ? s.raceOn : s.raceOff}>{running ? "● TÜM SÜRÜCÜLER PİSTTE" : elapsed > 0 ? "Ⅱ YARIŞ DURAKLATILDI" : "○ HAZIR"}</span>
              <strong>YARIŞ SÜRESİ {formatTime(elapsed)}</strong>
            </div>
            <div className={s.clockSurfaceCompact}>
              <span className={s.clockLabel}>{active ? active.name : "Listeden bir sürücü seç"}</span>
              <strong className={s.clockValue}>{active ? formatTime(currentLap(active.id)) : "00:00.000"}</strong>
              <div className={s.clockMeta}>
                <span>{running ? "● AKIYOR" : elapsed > 0 ? "Ⅱ DURAKLATILDI" : "○ HAZIR"}</span>
                <span>EN İYİ: {formatTime(activeBest)}</span>
              </div>
            </div>
            <div className={s.clockActionsCompact}>
              <button type="button" className={s.primaryBtn} onClick={toggleTimer} disabled={!drivers.length}>
                {running ? "Ⅱ DURAKLAT" : elapsed > 0 ? "▶ DEVAM ET" : "▶ YARIŞI BAŞLAT"}
              </button>
              <button type="button" className={s.secondaryBtn} onClick={() => active && recordLapFor(active.id)} disabled={!active || !running}>
                + TUR KAYDET
              </button>
              <button type="button" className={s.tertiaryBtn} onClick={clearClock} disabled={running || elapsed === 0}>
                SAATİ SIFIRLA
              </button>
            </div>
          </section>

          <section className={s.panel}>
            <div className={s.panelHeading}>
              <div>
                <span>03 / TUR GEÇMİŞİ</span>
                <h2>Seçili sürücünün turları</h2>
              </div>
              <strong>{active?.laps.length ?? 0} TUR</strong>
            </div>
            {activeBest !== null && (
              <div className={s.avgSpeed}>
                EN HIZLI TUR ORTALAMA HIZI <strong>{bestSpeed(activeBest, trackMeters)}</strong>
              </div>
            )}
            {!active || !active.laps.length ? (
              <div className={s.empty}>Sürücü seçip tur ekle. Tüm tur geçmişi burada görünür.</div>
            ) : (
              <div className={s.lapListCompact}>
                {active.laps.map((lap, i) => (
                  <div key={`${active.id}-${i}`} className={s.lapRowCompact}>
                    <span>TUR {String(i + 1).padStart(2, "0")}</span>
                    <strong>{formatTime(lap)}</strong>
                    {lap === activeBest && <small>EN HIZLI</small>}
                    <button type="button" onClick={() => updateDriver(active.id, (d) => ({ ...d, laps: d.laps.filter((_, index) => index !== i) }))} aria-label={`${i + 1}. turu sil`}>
                      SİL
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className={s.rightColumn}>
          <section className={s.panel}>
            <div className={s.panelHeading}>
              <div>
                <span>04 / YARIŞ KOMİSERİ</span>
                <h2>Süre cezaları</h2>
              </div>
            </div>
            {!drivers.length ? (
              <div className={s.empty}>Ceza uygulamak için önce sürücü ekle.</div>
            ) : (
              <div className={s.penaltyListCompact}>
                {drivers.map((d) => {
                  const penalty = d.penalties.reduce((sum, p) => sum + p.seconds, 0);
                  return (
                    <div className={s.penaltyRowCompact} key={d.id}>
                      <div>
                        <strong>{d.name}</strong>
                        <small>{d.team || "Takımsız"} · {penalty ? `+${penalty} sn ceza` : "Ceza yok"}</small>
                      </div>
                      <div className={s.penaltyButtons}>
                        <button type="button" onClick={() => addPenalty(d.id, 3)}>+3 sn</button>
                        <button type="button" onClick={() => addPenalty(d.id, 5)}>+5 sn</button>
                        <button type="button" disabled={!d.penalties.length} onClick={() => updateDriver(d.id, (x) => ({ ...x, penalties: x.penalties.slice(0, -1) }))} title="Son cezayı geri al">
                          ↶
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className={s.panel} id="gokart-results">
            <div className={s.panelHeading}>
              <div>
                <span>05 / RESMÎ SONUÇLAR</span>
                <h2>Canlı sıralama</h2>
              </div>
              <strong>EN İYİ {bestCount} TUR</strong>
            </div>
            <div className={s.resultTableWrapNoScroll}>
              <table className={s.resultTableCompact}>
                <thead>
                  <tr>
                    <th>POS</th>
                    <th>SÜRÜCÜ</th>
                    <th>EN İYİ</th>
                    <th>CEZA</th>
                    <th>NET</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={s.tableEmpty}>Henüz sıralanacak sürücü yok.</td>
                    </tr>
                  ) : (
                    ranked.map((row: ScoredDriver) => (
                      <tr key={row.driver.id} className={row.position === 1 ? s.firstPlace : ""}>
                        <td className={s.place}>{row.position === null ? "—" : String(row.position).padStart(2, "0")}</td>
                        <td>
                          <strong>{row.driver.name}</strong>
                          <small>
                            {row.driver.team ? `${row.driver.team} · ` : ""}
                            {row.driver.car}
                            {row.resultMs === null ? ` · ${bestCount - row.lapCount} tur eksik` : ""}
                          </small>
                        </td>
                        <td>{formatTime(row.bestMs)}</td>
                        <td>{row.penaltyMs ? `+${row.penaltyMs / 1000}s` : "—"}</td>
                        <td className={s.finalTime}>{formatTime(row.resultMs)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className={s.resultActionsSingle}>
              <button type="button" className={s.primaryBtn} onClick={() => void copyResults()} disabled={!drivers.length}>
                ⧉ SONUÇLARI KOPYALA
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className={s.bottomBar}>
        <span>◉ KAYITLAR BU TARAYICIDA OTOMATİK SAKLANIR</span>
        <button type="button" className={s.clearBtn} onClick={clearSession}>OTURUMU SIFIRLA</button>
      </div>
    </div>
  );
}
