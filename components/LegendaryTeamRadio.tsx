
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TeamRadioRecord } from "@/lib/team-radio-types";
import styles from "./LegendaryTeamRadio.module.css";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const total = Math.floor(seconds);

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const waveBars = Array.from({ length: 35 }, (_, i) =>
  Math.max(
    16,
    Math.round(
      (Math.abs(Math.sin(i * 1.87) + Math.cos(i * 0.41)) / 2) * 92
    )
  )
);

function RadioIcon() {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v13" />
      <path d="M9 18h6" />
      <path d="M8.5 8.5a5 5 0 0 1 7 0" />
      <path d="M5.5 5.5a9 9 0 0 1 13 0" />
      <circle cx="12" cy="11" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 7v5h-5" />
      <path d="M4.9 9a7.5 7.5 0 0 1 12.4-2L20 12" />
      <path d="M4 17v-5h5" />
      <path d="M19.1 15a7.5 7.5 0 0 1-12.4 2L4 12" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "left" ? (
        <path d="m15 18-6-6 6-6" />
      ) : (
        <path d="m9 18 6-6-6-6" />
      )}
    </svg>
  );
}

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  ) : (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 4.8a1 1 0 0 1 1.5-.86l11 7.2a1 1 0 0 1 0 1.72l-11 7.2A1 1 0 0 1 7 19.2V4.8Z" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M16 9a5 5 0 0 1 0 6" />
      <path d="M18.5 6.5a9 9 0 0 1 0 11" />
    </svg>
  );
}

/**
 * Ana yerleşimde bir kez oluşturulur.
 * Pencere küçültülse veya kullanıcı başka sayfaya geçse de ses oynatıcı
 * yerinde kalır. Oynatıcı modal değildir; arka planı kilitlemez.
 */
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
  const loadedOnce = useRef(false);
  const requestIdRef = useRef(0);

  const selected = clips.find((clip) => clip.id === selectedId) || null;
  const selectedIndex = clips.findIndex((clip) => clip.id === selectedId);

  const loadClips = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/team-radio", {
        cache: "no-store",
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || "Telsiz kayıtları alınamadı.");
      }

      if (requestId !== requestIdRef.current) return;

      const incoming = Array.isArray(body.clips)
        ? (body.clips as TeamRadioRecord[])
        : [];

      setClips(incoming);

      setSelectedId((previous) =>
        incoming.some((clip) => clip.id === previous)
          ? previous
          : incoming[0]?.id || null
      );

      loadedOnce.current = true;
    } catch (err) {
      if (requestId !== requestIdRef.current) return;

      setError(
        err instanceof Error
          ? err.message
          : "Telsiz kayıtları alınamadı."
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (open && !loadedOnce.current) {
      void loadClips();
    }
  }, [open, loadClips]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;

    audio?.pause();

    setPlaying(false);
    setPosition(0);
    setDuration(0);
  }, [selectedId]);

  async function togglePlayback() {
    const audio = audioRef.current;

    if (!selected || !audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
      setError("");
    } catch {
      setError(
        "Ses açılamadı. Ses kaynağına erişilemiyor olabilir."
      );
    }
  }

  function switchClip(delta: number) {
    if (selectedIndex < 0 || clips.length < 2) return;

    const nextIndex =
      (selectedIndex + delta + clips.length) % clips.length;

    setSelectedId(clips[nextIndex].id);
  }

  return (
    <>
      {/* Ses öğesi, pencere küçültülse de sayfa geçişlerinde korunur. */}
      <audio
        ref={audioRef}
        src={selected?.audio_url || undefined}
        preload="none"
        onTimeUpdate={(event) =>
          setPosition(event.currentTarget.currentTime)
        }
        onLoadedMetadata={(event) =>
          setDuration(event.currentTarget.duration)
        }
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setPosition(0);
        }}
        onError={() => {
          if (selected) {
            setError(
              "Ses kaynağına ulaşılamadı. Yönetici kaydı kontrol etmeli."
            );
          }
        }}
      />

      {open && (
        <section
          className={styles.popup}
          role="region"
          aria-label="F1 takım telsizi oynatıcısı"
          id="team-radio-panel"
        >
          <div className={styles.topBar}>
            <span className={styles.topLabel}>
              <span className={styles.dot} />
              F1 SOCIAL
              <span className={styles.barSeparator}>/</span>
              TEAM RADIO
            </span>

            <div className={styles.topActions}>
              <button
                type="button"
                className={styles.refreshButton}
                onClick={() => void loadClips()}
                disabled={loading}
                title="Yayınlanan telsizleri yenile"
                aria-label="Telsizleri yenile"
              >
                <RefreshIcon />
              </button>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setOpen(false)}
                aria-label="Telsiz penceresini küçült"
                title="Küçült"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          <div className={styles.hero}>
            <span className={styles.heroIcon}>
              <RadioIcon />
            </span>

            <div>
              <h2>
                Legendary <em>Team Radio</em>
              </h2>
              <p>Seç, dinle, gezinmeye devam et.</p>
            </div>
          </div>

          <div className={styles.scrollRegion}>
            <div className={styles.sectionTitle}>
              <span>SEÇİLMİŞ TELSİZLER</span>
              <span>{clips.length.toString().padStart(2, "0")}</span>
            </div>

            {loading && clips.length === 0 && (
              <p className={styles.note}>
                Telsiz kayıtları yükleniyor…
              </p>
            )}

            {!loading && !error && clips.length === 0 && (
              <div className={styles.empty}>
                <strong>Henüz yayınlanmış telsiz yok.</strong>
                <p>
                  Yönetici panelinde seçilen OpenF1 kayıtları burada
                  görünecek.
                </p>
              </div>
            )}

            {clips.length > 0 && (
              <div
                className={styles.clipList}
                role="group"
                aria-label="Telsiz seçimi"
              >
                {clips.map((clip, index) => (
                  <button
                    key={clip.id}
                    type="button"
                    className={`${styles.clip} ${
                      selectedId === clip.id ? styles.clipActive : ""
                    }`}
                    aria-pressed={selectedId === clip.id}
                    onClick={() => setSelectedId(clip.id)}
                  >
                    <span className={styles.clipNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className={styles.clipInfo}>
                      <strong>{clip.title}</strong>
                      <small>
                        {clip.driver_name} · {clip.grand_prix}
                        {clip.season ? ` ${clip.season}` : ""}
                      </small>
                    </span>

                    <span className={styles.clipArrow} aria-hidden="true">
                      <PlayIcon playing={false} />
                    </span>
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}
          </div>

          <div className={styles.player}>
            <div className={styles.currentHeader}>
              <span className={styles.dot} />

              <div className={styles.nowText}>
                <strong title={selected?.title || "Kayıt seçilmedi"}>
                  {selected?.title || "Kayıt seçilmedi"}
                </strong>

                <small
                  title={
                    selected
                      ? [selected.driver_name, selected.grand_prix]
                          .filter(Boolean)
                          .join(" · ")
                      : ""
                  }
                >
                  {selected
                    ? [selected.driver_name, selected.grand_prix]
                        .filter(Boolean)
                        .join(" · ")
                    : "Yayınlanan telsizleri seç"}
                </small>
              </div>

              <span className={styles.radioCount}>
                RADIO /{" "}
                {selectedIndex < 0
                  ? "--"
                  : String(selectedIndex + 1).padStart(2, "0")}
              </span>
            </div>

            <div
              className={`${styles.wave} ${
                playing ? styles.wavePlaying : ""
              }`}
              aria-hidden="true"
            >
              {waveBars.map((height, index) => (
                <span
                  key={index}
                  style={{
                    height: `${height}%`,
                    animationDelay: `${(index % 9) * -0.09}s`,
                  }}
                />
              ))}
            </div>

            <div className={styles.seek}>
              <span>{formatTime(position)}</span>

              <input
                type="range"
                aria-label="Telsizde ileri geri sar"
                min={0}
                max={
                  Number.isFinite(duration) && duration > 0
                    ? duration
                    : 1
                }
                value={Math.min(
                  position,
                  Number.isFinite(duration) && duration > 0
                    ? duration
                    : 1
                )}
                step={0.1}
                disabled={!selected || !duration}
                onChange={(event) => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = Number(
                      event.target.value
                    );
                  }
                }}
              />

              <span>{formatTime(duration)}</span>
            </div>

            <div className={styles.controls}>
              <div className={styles.transport}>
                <button
                  type="button"
                  onClick={() => switchClip(-1)}
                  disabled={clips.length < 2}
                  aria-label="Önceki telsiz"
                  title="Önceki telsiz"
                >
                  <ChevronIcon direction="left" />
                </button>

                <button
                  type="button"
                  className={styles.play}
                  onClick={() => void togglePlayback()}
                  disabled={!selected}
                  aria-label={
                    playing ? "Telsizi duraklat" : "Telsizi oynat"
                  }
                  title={playing ? "Duraklat" : "Oynat"}
                >
                  <PlayIcon playing={playing} />
                </button>

                <button
                  type="button"
                  onClick={() => switchClip(1)}
                  disabled={clips.length < 2}
                  aria-label="Sonraki telsiz"
                  title="Sonraki telsiz"
                >
                  <ChevronIcon direction="right" />
                </button>
              </div>

              <label className={styles.volume}>
                <span aria-hidden="true">
                  <VolumeIcon />
                </span>

                <input
                  aria-label="Telsiz ses seviyesi"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(event) =>
                    setVolume(Number(event.target.value))
                  }
                />
              </label>
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        className={`${styles.launcher} ${
          open ? styles.launcherOpen : ""
        } ${playing ? styles.launcherPlaying : ""}`}
        onClick={() => setOpen((previous) => !previous)}
        aria-label={
          open
            ? "Telsiz penceresini küçült"
            : "Team Radio penceresini aç"
        }
        aria-expanded={open}
        aria-controls={open ? "team-radio-panel" : undefined}
        title={
          playing
            ? "Telsiz çalıyor – oynatıcıyı aç"
            : "Team Radio"
        }
      >
        <span className={styles.launcherIcon}>
          <RadioIcon />
        </span>

        <span className={styles.launcherLabel}>TEAM RADIO</span>

        <span
          className={styles.launcherIndicator}
          aria-hidden="true"
        />
      </button>
    </>
  );
}
