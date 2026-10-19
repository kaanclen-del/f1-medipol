"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TeamRadioRecord } from "@/lib/team-radio-types";
import styles from "./LegendaryTeamRadio.module.css";

function time(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const bars = Array.from({ length: 44 }, (_, i) => Math.max(12, Math.round((Math.abs(Math.sin(i * 1.9) + Math.cos(i * 0.37)) / 2) * 94)));

export default function LegendaryTeamRadio() {
  const [open, setOpen] = useState(false);
  const [clips, setClips] = useState<TeamRadioRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const selected = clips.find((clip) => clip.id === selectedId) || null;
  const selectedIndex = clips.findIndex((clip) => clip.id === selectedId);

  const loadClips = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/team-radio", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Telsiz kayıtları alınamadı.");
      const incoming = Array.isArray(body.clips) ? body.clips as TeamRadioRecord[] : [];
      setClips(incoming);
      setSelectedId((previous) => incoming.some((clip) => clip.id === previous) ? previous : incoming[0]?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Telsiz kayıtları alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      return;
    }
    void loadClips();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, loadClips]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    audioRef.current?.pause();
    setPlaying(false);
    setPosition(0);
    setDuration(0);
  }, [selectedId]);

  async function toggle() {
    if (!selected || !audioRef.current) return;
    const audio = audioRef.current;
    if (audio.paused) {
      try {
        await audio.play();
        setError("");
      } catch {
        setError("Ses açılamadı. Dosyaya erişim mümkün olmayabilir.");
      }
    } else audio.pause();
  }

  function switchClip(delta: number) {
    if (selectedIndex < 0 || clips.length < 2) return;
    setSelectedId(clips[(selectedIndex + delta + clips.length) % clips.length].id);
  }

  return (
    <>
      <button
        type="button"
        className={`${styles.launcher} ${open ? styles.launcherOpen : ""}`}
        onClick={() => setOpen((state) => !state)}
        aria-label={open ? "Telsiz oynatıcısını kapat" : "Efsanevi F1 telsizlerini aç"}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Efsanevi takım telsizleri"
      >
        {open ? <span aria-hidden="true" className={styles.closeGlyph}>×</span> : <span aria-hidden="true" className={styles.radioGlyph}>◉</span>}
        {!open && <span className={styles.launcherLabel}>TEAM RADIO</span>}
      </button>

      {open && (
        <>
          <button type="button" className={styles.scrim} aria-label="Telsiz panelini kapat" onClick={() => setOpen(false)} />
          <section className={styles.popup} role="dialog" aria-modal="true" aria-label="Legendary Team Radio">
            <div className={styles.topBar}>
              <div className={styles.topLabel}><span className={styles.dot} /> F1 MEDIPOL / RADIO ARCHIVE</div>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} className={styles.closeButton} aria-label="Kapat">×</button>
            </div>
            <div className={styles.hero}>
              <span className={styles.heroIcon} aria-hidden="true">⌁</span>
              <div>
                <h2>Legendary <em>Team Radio</em></h2>
                <p>Unutulmaz telsizleri sen seç, istediğinde dinle.</p>
              </div>
            </div>
            <div className={styles.scrollRegion}>
              <div className={styles.sectionTitle}>
                <span>SEÇİLMİŞ TELSİZLER</span>
                <span>{clips.length.toString().padStart(2, "0")}</span>
              </div>
              {loading && <p className={styles.note}>Telsiz kayıtları yükleniyor…</p>}
              {!loading && !error && clips.length === 0 && (
                <div className={styles.empty}>
                  <span className={styles.emptyIcon} aria-hidden="true">⌁</span>
                  <strong>Henüz telsiz kaydı yok.</strong>
                  <p>Yönetim ekibi OpenF1 arşivinden telsiz seçip yayımladığında burada görünecek.</p>
                </div>
              )}
              {!loading && clips.length > 0 && (
                <div className={styles.clipList} role="group" aria-label="Yüklü telsiz kayıtlarını seç">
                  {clips.map((clip, index) => (
                    <button
                      key={clip.id}
                      className={`${styles.clip} ${selectedId === clip.id ? styles.clipActive : ""}`}
                      type="button"
                      onClick={() => setSelectedId(clip.id)}
                      aria-pressed={selectedId === clip.id}
                    >
                      <span className={styles.clipNumber}>{String(index + 1).padStart(2, "0")}</span>
                      <span className={styles.clipInfo}>
                        <strong>{clip.title}</strong>
                        <small>{clip.driver_name} · {clip.grand_prix}{clip.season ? ` ${clip.season}` : ""}</small>
                      </span>
                      <span className={styles.clipArrow} aria-hidden="true">▶</span>
                    </button>
                  ))}
                </div>
              )}
              {error && <div className={styles.error} role="alert">{error}</div>}
            </div>
            <div className={styles.player}>
              <div className={styles.nowLine}><span className={styles.dot} /> ŞİMDİ SEÇİLİ <span>RADIO / 01</span></div>
              <strong className={styles.currentTitle}>{selected?.title || "Kayıt seçilmedi"}</strong>
              <p className={styles.currentMeta}>{selected ? [selected.driver_name, selected.team_name, selected.grand_prix].filter(Boolean).join(" · ") : "Yayınlanan telsiz kayıtları burada oynatılabilir."}</p>
              <div className={`${styles.wave} ${playing ? styles.wavePlaying : ""}`} aria-hidden="true">
                {bars.map((height, index) => <span key={index} style={{ height: `${height}%`, animationDelay: `${(index % 9) * -0.09}s` }} />)}
              </div>
              <audio
                ref={audioRef}
                src={selected?.audio_url || undefined}
                preload="none"
                onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onError={() => { if (selected) setError("Ses dosyasına ulaşılamadı. Yönetici kaydı kontrol etmeli."); }}
              />
              <div className={styles.seek}>
                <span>{time(position)}</span>
                <input type="range" min={0} max={Number.isFinite(duration) && duration > 0 ? duration : 1} value={position} step={0.1} disabled={!selected || !duration} onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} aria-label="Telsiz konumu" />
                <span>{time(duration)}</span>
              </div>
              <div className={styles.controls}>
                <div className={styles.transport}>
                  <button type="button" onClick={() => switchClip(-1)} disabled={clips.length < 2} aria-label="Önceki kayıt">‹</button>
                  <button type="button" className={styles.play} onClick={() => void toggle()} disabled={!selected}>
                    {playing ? "❚❚ Duraklat" : "▶ Telsizi dinle"}
                  </button>
                  <button type="button" onClick={() => switchClip(1)} disabled={clips.length < 2} aria-label="Sonraki kayıt">›</button>
                </div>
                <label className={styles.volume}>
                  <span aria-hidden="true">◖))</span>
                  <input aria-label="Ses seviyesi" type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
                </label>
              </div>
              <p className={styles.footnote}>Ses yalnızca sen oynat düğmesine bastığında başlar.</p>
            </div>
          </section>
        </>
      )}
    </>
  );
}
