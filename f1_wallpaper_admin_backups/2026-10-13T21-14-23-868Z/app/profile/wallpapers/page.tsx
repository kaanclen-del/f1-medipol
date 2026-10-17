"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ProfileWallpaperBackdrop from "@/components/ProfileWallpaperBackdrop";
import { PROFILE_WALLPAPERS, DEFAULT_PROFILE_WALLPAPER } from "@/lib/profile-wallpapers";
import { createClient } from "@/utils/supabase/client";
import styles from "./wallpapers.module.css";

export default function ProfileWallpapersPage() {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(DEFAULT_PROFILE_WALLPAPER);
  const [selectedId, setSelectedId] = useState(DEFAULT_PROFILE_WALLPAPER);
  const [feedback, setFeedback] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !user) {
        window.location.assign("/login");
        return;
      }
      setUserId(user.id);
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("profile_wallpaper")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (error) setFeedback(`Profil arka planı alınamadı: ${error.message}`);
      const current = profile?.profile_wallpaper || DEFAULT_PROFILE_WALLPAPER;
      const valid = PROFILE_WALLPAPERS.some((item) => item.id === current)
        ? current
        : DEFAULT_PROFILE_WALLPAPER;
      setSavedId(valid);
      setSelectedId(valid);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [supabase]);

  const selected = PROFILE_WALLPAPERS.find((wallpaper) => wallpaper.id === selectedId) ?? PROFILE_WALLPAPERS[0];

  async function save() {
    if (!userId || saving || selectedId === savedId) return;
    setFeedback("");
    setSuccess(false);
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ profile_wallpaper: selectedId })
        .eq("id", userId)
        .select("profile_wallpaper");
      if (error) throw error;
      if (!data || data.length !== 1) {
        throw new Error("Profil kaydı güncellenemedi. Lütfen tekrar giriş yapıp dene.");
      }
      setSavedId(selectedId);
      setSuccess(true);
      setFeedback("Arka planın kaydedildi. Profilinde artık bu tema görünecek.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Arka plan kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.heading}>
            <div>
              <Link href="/profile" className={styles.back}>← PROFİLE DÖN</Link>
              <div className={styles.eyebrow}>F1 MEDİPOL / DRIVER CUSTOMIZATION</div>
              <h1>PROFİL ARKA PLANLARI</h1>
              <p>15 farklı yarış atmosferi. Birini seç, canlı ön izlemesini gör ve profilinde kullan.</p>
            </div>
            <div className={styles.count}><strong>{PROFILE_WALLPAPERS.length.toString().padStart(2,"0")}</strong><span>ARKA PLAN</span></div>
          </div>

          {loading ? (
            <div className={styles.loading}>Arka planların yükleniyor...</div>
          ) : (
            <div className={styles.layout}>
              <div className={styles.previewPanel}>
                <div className={styles.preview} key={selected.id}>
                  <ProfileWallpaperBackdrop wallpaper={selected} />
                  <div className={styles.previewTint} />
                  <div className={styles.previewWords}>
                    <span className={styles.previewEyebrow}>F1 MEDİPOL / PROFILE DESIGN</span>
                    <strong>YOUR GRID.<br/>YOUR STORY.</strong>
                    <span className={styles.previewCaption}>CANLI ÖN İZLEME</span>
                  </div>
                </div>
                <div className={styles.previewInfo}>
                  <div className={styles.detail}>
                    <span className={styles.swatch} style={{backgroundColor:selected.accent}} />
                    <div><h2>{selected.name}</h2><p>{selected.description}</p></div>
                  </div>
                  <div className={styles.actions}>
                    {selectedId === savedId && <span className={styles.current}>✓ SEÇİLİ TEMA</span>}
                    <button type="button" className={styles.save} disabled={saving || selectedId===savedId} onClick={save}>
                      {saving ? "KAYDEDİLİYOR..." : selectedId===savedId ? "KAYDEDİLDİ" : "BU ARKA PLANI KAYDET ↗"}
                    </button>
                  </div>
                  {feedback && <p className={success?styles.success:styles.error} role="status">{feedback}</p>}
                </div>
              </div>
              <div className={styles.library}>
                <div className={styles.libraryHeading}><h2>KOLEKSİYON</h2><span>İstediğin zaman değiştirebilirsin</span></div>
                <div className={styles.grid}>
                  {PROFILE_WALLPAPERS.map((wallpaper,index) => (
                    <button
                      type="button"
                      key={wallpaper.id}
                      className={`${styles.item} ${selectedId===wallpaper.id?styles.selected:""}`}
                      onClick={() => { setSelectedId(wallpaper.id); setFeedback(""); setSuccess(false); }}
                      aria-pressed={selectedId===wallpaper.id}
                      title={wallpaper.description}
                    >
                      <span className={styles.thumb} style={{backgroundImage:wallpaper.fallback}}>
                        <span className={styles.number}>{String(index+1).padStart(2,"0")}</span>
                        {savedId === wallpaper.id && <span className={styles.inUse}>AKTİF</span>}
                      </span>
                      <span className={styles.itemName}>{wallpaper.name}</span>
                    </button>
                  ))}
                </div>
                <div className={styles.hint}>Hareketli ışıklar ve animasyonlar, cihazının azaltılmış hareket tercihine saygı gösterir.</div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
