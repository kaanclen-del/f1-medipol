"use client";

import { useEffect, useMemo, useState } from "react";
import type { OpenF1Radio, RadioDriver, RadioMeeting, RadioSession, TeamRadioRecord } from "@/lib/team-radio-types";
import styles from "./AdminTeamRadioManager.module.css";

async function readJson(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `İşlem başarısız (${response.status}).`);
  return body;
}

async function searchArchive<T>(resource: string, params: Record<string, string>) {
  const query = new URLSearchParams({ resource, ...params });
  const body = await readJson(await fetch(`/api/admin/team-radio/openf1?${query.toString()}`, { cache: "no-store" }));
  return (Array.isArray(body.items) ? body.items : []) as T[];
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.valueOf())
    ? date.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : value;
}

export default function AdminTeamRadioManager() {
  const [year, setYear] = useState("2024");
  const [yearRetry, setYearRetry] = useState(0);
  const [meetings, setMeetings] = useState<RadioMeeting[]>([]);
  const [meetingKey, setMeetingKey] = useState("");
  const [sessions, setSessions] = useState<RadioSession[]>([]);
  const [sessionKey, setSessionKey] = useState("");
  const [drivers, setDrivers] = useState<RadioDriver[]>([]);
  const [driverNumber, setDriverNumber] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [recordings, setRecordings] = useState<OpenF1Radio[]>([]);
  const [recordingFilter, setRecordingFilter] = useState("");
  const [selectedUrl, setSelectedUrl] = useState("");
  const [visibleCount, setVisibleCount] = useState(24);
  const [customTitle, setCustomTitle] = useState("");
  const [clips, setClips] = useState<TeamRadioRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedMeeting = meetings.find((item) => String(item.meeting_key) === meetingKey);
  const selectedSession = sessions.find((item) => String(item.session_key) === sessionKey);
  const selectedDriver = drivers.find((item) => String(item.driver_number) === driverNumber);
  const selectedRecording = recordings.find((item) => item.recording_url === selectedUrl);

  const filteredDrivers = useMemo(() => drivers.filter((driver) =>
    `${driver.full_name} ${driver.team_name} ${driver.name_acronym} ${driver.driver_number}`.toLocaleLowerCase("tr-TR")
      .includes(driverFilter.toLocaleLowerCase("tr-TR"))), [drivers, driverFilter]);
  const filteredRecordings = useMemo(() => recordings.filter((radio, index) =>
    `${index + 1} ${dateLabel(radio.date)} ${radio.date}`.toLocaleLowerCase("tr-TR")
      .includes(recordingFilter.toLocaleLowerCase("tr-TR"))), [recordings, recordingFilter]);
  const alreadyAdded = useMemo(() => new Set(clips.map((item) => item.recording_url).filter(Boolean)), [clips]);

  async function refreshClips() {
    const result = await readJson(await fetch("/api/admin/team-radio", { cache: "no-store" }));
    setClips(Array.isArray(result.clips) ? result.clips : []);
  }

  useEffect(() => {
    let active = true;
    setLoadingList(true);
    fetch("/api/admin/team-radio", { cache: "no-store" }).then(readJson)
      .then((body) => { if (active) setClips(Array.isArray(body.clips) ? body.clips : []); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Arşiv okunamadı."); })
      .finally(() => { if (active) setLoadingList(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingYears(true);
    setMeetings([]);
    setMeetingKey("");
    setSessions([]);
    setSessionKey("");
    setDrivers([]);
    setDriverNumber("");
    setRecordings([]);
    setSelectedUrl("");
    searchArchive<RadioMeeting>("meetings", { year })
      .then((items) => { if (active) setMeetings(items); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Yarışlar getirilemedi."); })
      .finally(() => { if (active) setLoadingYears(false); });
    return () => { active = false; };
  }, [year, yearRetry]);

  useEffect(() => {
    if (!meetingKey) return;
    let active = true;
    setLoadingMeetings(true);
    setSessions([]); setSessionKey("");
    setDrivers([]); setDriverNumber("");
    setRecordings([]); setSelectedUrl("");
    searchArchive<RadioSession>("sessions", { meetingKey })
      .then((items) => { if (active) setSessions(items); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Seanslar getirilemedi."); })
      .finally(() => { if (active) setLoadingMeetings(false); });
    return () => { active = false; };
  }, [meetingKey]);

  useEffect(() => {
    if (!sessionKey) return;
    let active = true;
    setLoadingSessions(true);
    setDrivers([]); setDriverNumber(""); setDriverFilter("");
    setRecordings([]); setSelectedUrl("");
    searchArchive<RadioDriver>("drivers", { sessionKey })
      .then((items) => { if (active) setDrivers(items); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Pilotlar getirilemedi."); })
      .finally(() => { if (active) setLoadingSessions(false); });
    return () => { active = false; };
  }, [sessionKey]);

  async function findRecordings() {
    setError(""); setMessage(""); setRecordings([]); setSelectedUrl(""); setRecordingFilter(""); setVisibleCount(24);
    if (!sessionKey || !driverNumber) { setError("Önce seans ve pilot seçmelisin."); return; }
    setLoadingRecordings(true);
    try {
      const items = await searchArchive<OpenF1Radio>("recordings", { sessionKey, driverNumber });
      setRecordings(items);
      setMessage(items.length ? `${items.length} telsiz kaydı bulundu. Dinleyip istediğini arşive ekleyebilirsin.` : "Bu pilot ve seans için OpenF1 arşivinde telsiz kaydı bulunamadı.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Telsizler aranamadı.");
    } finally {
      setLoadingRecordings(false);
    }
  }

  async function addRecording(recording: OpenF1Radio) {
    setError(""); setMessage(""); setBusyId(recording.recording_url);
    try {
      await readJson(await fetch("/api/admin/team-radio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey: recording.session_key,
          driverNumber: recording.driver_number,
          recordingUrl: recording.recording_url,
          title: selectedUrl === recording.recording_url ? customTitle.trim() : "",
        }),
      }));
      await refreshClips();
      setMessage("Kayıt arşive taslak olarak eklendi. Kullanım hakkını doğruladıktan sonra yayımlayabilirsin.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt eklenemedi.");
    } finally {
      setBusyId("");
    }
  }

  async function togglePublished(clip: TeamRadioRecord) {
    setError(""); setMessage("");
    if (!clip.is_published && !window.confirm("Bu ses kaydını F1 Medipol'da herkese açık oynatmak için gerekli kullanım haklarına sahip olduğunu onaylıyor musun?")) return;
    setBusyId(clip.id);
    try {
      await readJson(await fetch(`/api/admin/team-radio/${clip.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !clip.is_published, rightsConfirmed: !clip.is_published }),
      }));
      await refreshClips();
      setMessage(clip.is_published ? "Kayıt yayından kaldırıldı." : "Kayıt yayımlandı. Ana sayfa popup'ında görünecek.");
    } catch (err) { setError(err instanceof Error ? err.message : "Kayıt durumu değiştirilemedi."); }
    finally { setBusyId(""); }
  }

  async function remove(clip: TeamRadioRecord) {
    if (!window.confirm(`“${clip.title}” kaydı arşivinden kaldırılsın mı?`)) return;
    setError(""); setMessage(""); setBusyId(clip.id);
    try {
      await readJson(await fetch(`/api/admin/team-radio/${clip.id}`, { method: "DELETE" }));
      await refreshClips();
      setMessage("Kayıt listeden kaldırıldı. OpenF1 üzerindeki ses silinmedi.");
    } catch (err) { setError(err instanceof Error ? err.message : "Kayıt silinemedi."); }
    finally { setBusyId(""); }
  }

  return (
    <div className={styles.layout}>
      <section className={styles.card}>
        <div className={styles.head}>
          <span className={styles.kicker}>OPENF1 / TAKIM TELSİZLERİ</span>
          <h2>Arşivde telsiz ara</h2>
          <p className={styles.subtitle}>Yıl, Grand Prix, seans ve pilot seç. Yalnızca senin arşive eklediğin kayıtlar listelenir.</p>
        </div>
        <div className={styles.form}>
          <label>01 / Yıl
            <select value={year} onChange={(e) => { setError(""); setYear(e.target.value); }}>
              {[2026, 2025, 2024, 2023].map((value) => <option value={String(value)} key={value}>{value}</option>)}
            </select>
          </label>
          {!loadingYears && meetings.length === 0 && error && (
            <button type="button" className={styles.addButton} onClick={() => { setError(""); setYearRetry((value) => value + 1); }}>
              Yarış listesini yeniden dene
            </button>
          )}
          <label>02 / Grand Prix
            <select value={meetingKey} disabled={loadingYears || !meetings.length} onChange={(e) => { setError(""); setMeetingKey(e.target.value); setSessionKey(""); setDriverNumber(""); setRecordings([]); setSelectedUrl(""); }}>
              <option value="">{loadingYears ? "Yarışlar yükleniyor…" : meetings.length ? "Yarış seç" : "Bu yılda yarış bulunamadı"}</option>
              {meetings.map((item) => <option key={item.meeting_key} value={String(item.meeting_key)}>{item.meeting_name}</option>)}
            </select>
          </label>
          <label>03 / Seans
            <select value={sessionKey} disabled={!meetingKey || loadingMeetings || !sessions.length} onChange={(e) => { setError(""); setSessionKey(e.target.value); setDriverNumber(""); setRecordings([]); setSelectedUrl(""); }}>
              <option value="">{loadingMeetings ? "Seanslar yükleniyor…" : "Seans seç"}</option>
              {sessions.map((item) => <option key={item.session_key} value={String(item.session_key)}>{item.session_name}</option>)}
            </select>
          </label>
          <label>04 / Pilot adıyla ara
            <input value={driverFilter} onChange={(e) => { setDriverFilter(e.target.value); setDriverNumber(""); setRecordings([]); setSelectedUrl(""); }} placeholder="Örn: Hamilton, Leclerc, 16..." disabled={!sessionKey} />
          </label>
          <label>05 / Pilot
            <select value={driverNumber} disabled={!sessionKey || loadingSessions || !drivers.length} onChange={(e) => { setDriverNumber(e.target.value); setRecordings([]); setSelectedUrl(""); }}>
              <option value="">{loadingSessions ? "Pilotlar yükleniyor…" : "Pilot seç"}</option>
              {filteredDrivers.map((item) => <option key={item.driver_number} value={String(item.driver_number)}>#{item.driver_number} · {item.full_name} – {item.team_name}</option>)}
            </select>
          </label>
          <button className={styles.primary} type="button" disabled={!sessionKey || !driverNumber || loadingRecordings} onClick={() => void findRecordings()}>
            {loadingRecordings ? "Arşiv aranıyor…" : "⌕  OpenF1 telsizlerini ara"}
          </button>
          <p className={styles.help}>OpenF1 arşivi 2023 yılından başlar. 2021 ve 2022 telsizleri bu API üzerinden getirilemez. Bazı seanslarda kayıt bulunmayabilir.</p>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.head}>
          <span className={styles.kicker}>F1 MEDIPOL / YÖNETİLEN KAYITLAR</span>
          <h2>Seçilen telsizler <small>{clips.length}</small></h2>
          <p className={styles.subtitle}>Listeye eklenenler önce taslak olur. Yayımladıkların sağ alttaki telsiz penceresinde görünür.</p>
        </div>
        {loadingList && <p className={styles.help}>Liste yükleniyor…</p>}
        {!loadingList && !clips.length && <p className={styles.empty}>Henüz bir kayıt seçmedin. Soldan arama yapıp beğendiğini listeye ekle.</p>}
        <div className={styles.list}>
          {clips.map((clip) => (
            <article className={styles.item} key={clip.id}>
              <div className={styles.itemHeader}>
                <strong>{clip.title}</strong>
                <span className={clip.is_published ? styles.live : styles.draft}>{clip.is_published ? "Yayında" : "Taslak"}</span>
              </div>
              <p>{clip.driver_name} · {clip.grand_prix}{clip.season ? ` ${clip.season}` : ""} · {clip.source_type === "openf1" ? "OpenF1 bağlantısı" : "Önceden yüklenmiş"}</p>
              {clip.audio_url && <audio controls preload="none" src={clip.audio_url} className={styles.audio} />}
              <div className={styles.actions}>
                <button type="button" disabled={busyId === clip.id} onClick={() => void togglePublished(clip)}>{clip.is_published ? "Yayından kaldır" : "Yayımla"}</button>
                <button type="button" className={styles.danger} disabled={busyId === clip.id} onClick={() => void remove(clip)}>Sil</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {sessionKey && driverNumber && (
        <section className={`${styles.card} ${styles.resultCard}`}>
          <div className={styles.head}>
            <span className={styles.kicker}>KAYIT SONUÇLARI</span>
            <h2>{selectedDriver?.full_name || "Pilot"} <small>{recordings.length} kayıt</small></h2>
            <p className={styles.subtitle}>{selectedMeeting?.meeting_name || "Grand Prix"} · {selectedSession?.session_name || "Seans"} · {year}</p>
          </div>
          {loadingRecordings && <p className={styles.help}>OpenF1 telsiz kayıtları aranıyor…</p>}
          {!loadingRecordings && recordings.length === 0 && <p className={styles.empty}>Yukarıdaki “OpenF1 telsizlerini ara” düğmesine bas. Kayıt bulunursa burada tek tek dinleyebilirsin.</p>}
          {recordings.length > 0 && (
            <>
              <label className={styles.filter}>Sonuçlar içinde zaman/sıra ara
                <input value={recordingFilter} onChange={(e) => { setRecordingFilter(e.target.value); setVisibleCount(24); }} placeholder="Örn: 14:35, 15 Eki veya sıra numarası..." />
              </label>
              <div className={styles.results}>
                {filteredRecordings.slice(0, visibleCount).map((radio, index) => {
                  const active = selectedUrl === radio.recording_url;
                  const saved = alreadyAdded.has(radio.recording_url);
                  return (
                    <article key={`${radio.date}-${radio.recording_url}`} className={`${styles.result} ${active ? styles.resultActive : ""}`}>
                      <div className={styles.resultLine}>
                        <div className={styles.resultMeta}>
                          <span className={styles.resultIndex}>{String(index + 1).padStart(2, "0")}</span>
                          <div><strong>{dateLabel(radio.date)}</strong><small>#{radio.driver_number} · {selectedDriver?.full_name} · OpenF1</small></div>
                        </div>
                        <span className={saved ? styles.live : styles.draft}>{saved ? "Listede" : "Önizleme"}</span>
                      </div>
                      <audio controls preload="none" src={radio.recording_url} className={styles.audio} />
                      {!saved && (
                        <>
                          {active && <label className={styles.titleInput}>Kayıt başlığı (isteğe bağlı)
                            <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} maxLength={120} placeholder="Örn: Leclerc — unutulmaz telsiz" />
                          </label>}
                          <button type="button" disabled={Boolean(busyId)} className={styles.addButton} onClick={() => {
                            if (!active) { setSelectedUrl(radio.recording_url); setCustomTitle(""); }
                            else void addRecording(radio);
                          }}>
                            {busyId === radio.recording_url ? "Ekleniyor…" : active ? "+ Listeye ekle (taslak)" : "Bu kaydı seç"}
                          </button>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
              {filteredRecordings.length > visibleCount && (
                <button type="button" className={styles.addButton} style={{ marginTop: 14 }} onClick={() => setVisibleCount((count) => count + 24)}>
                  Daha fazla sonuç göster ({filteredRecordings.length - visibleCount} kaldı)
                </button>
              )}
              {!filteredRecordings.length && <p className={styles.empty}>Aramanla eşleşen telsiz kaydı bulunamadı.</p>}
            </>
          )}
        </section>
      )}

      {(error || message) && <div className={`${styles.feedback} ${error ? styles.failure : ""}`} role="status">{error || message}</div>}
      <p className={styles.legal}>Not: OpenF1 kaynak bağlantısını sunar; seslerin yeniden yayımlanması için ayrıca kullanım hakkı gerekebilir. F1 Medipol yalnızca kaydın bağlantısını saklar, sunucuya ses dosyası indirmez.</p>
    </div>
  );
}
