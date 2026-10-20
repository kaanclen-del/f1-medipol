"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ProfileWallpaperBackdrop from "@/components/ProfileWallpaperBackdrop";
import { PROFILE_WALLPAPERS, DEFAULT_PROFILE_WALLPAPER, type ProfileWallpaper, getWallpaperBackground } from "@/lib/profile-wallpapers";
import { managedToWallpaper, type ManagedWallpaper } from "@/lib/profile-wallpaper-catalog";
import { createClient } from "@/utils/supabase/client";
import styles from "./wallpapers.module.css";

export default function ProfileWallpapersPage() {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<"dark" | "red" | "light">("dark");
  const [savedByTheme, setSavedByTheme] = useState({dark:DEFAULT_PROFILE_WALLPAPER,red:DEFAULT_PROFILE_WALLPAPER,light:DEFAULT_PROFILE_WALLPAPER});
  const [selectedByTheme, setSelectedByTheme] = useState({dark:DEFAULT_PROFILE_WALLPAPER,red:DEFAULT_PROFILE_WALLPAPER,light:DEFAULT_PROFILE_WALLPAPER});
  const savedId = savedByTheme[theme];
  const selectedId = selectedByTheme[theme];
  const changed = (["dark","red","light"] as const).some(t=>savedByTheme[t]!==selectedByTheme[t]);
  const setSelectedId = (id:string) => setSelectedByTheme(prev=>({...prev,[theme]:id}));
  const [managed, setManaged] = useState<ProfileWallpaper[]>([]);
  const [feedback, setFeedback] = useState("");
  const [success, setSuccess] = useState(false);
  const all: ProfileWallpaper[] = [...PROFILE_WALLPAPERS, ...managed];

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!active) return;
        if (authError || !user) { window.location.assign("/login"); return; }
        setUserId(user.id);
        const [profileResult, managedResult] = await Promise.all([
          supabase.from("profiles").select("profile_wallpaper,profile_wallpaper_light,profile_wallpaper_red").eq("id",user.id).maybeSingle(),
          fetch("/api/profile/wallpapers",{ cache:"no-store" }).then(async r => {
            const obj = await r.json();
            if (!r.ok) throw new Error(obj.error ?? "Yönetici koleksiyonu yüklenemedi.");
            return obj as { wallpapers: ManagedWallpaper[] };
          }),
        ]);
        if (!active) return;
        if (profileResult.error) throw profileResult.error;
        const additions = (managedResult.wallpapers??[]).map(managedToWallpaper);
        const options = [...PROFILE_WALLPAPERS,...additions];
        setManaged(additions);
        const current = profileResult.data?.profile_wallpaper || DEFAULT_PROFILE_WALLPAPER;
        const valid = options.some(x=>x.id===current) ? current : DEFAULT_PROFILE_WALLPAPER;
        const select = {
          dark:valid,
          light:options.some(x=>x.id===profileResult.data?.profile_wallpaper_light) ? profileResult.data!.profile_wallpaper_light! : valid,
          red:options.some(x=>x.id===profileResult.data?.profile_wallpaper_red) ? profileResult.data!.profile_wallpaper_red! : valid,
        };
        setSelectedByTheme(select);setSavedByTheme(select);
        const siteTheme=document.documentElement.getAttribute("data-site-theme");
        if(siteTheme==="light"||siteTheme==="red") setTheme(siteTheme);
      } catch (error) {
        if (active) setFeedback(error instanceof Error ? error.message : "Arka planlar yüklenemedi.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return ()=>{active=false;};
  },[supabase]);

  const selected = all.find(x=>x.id===selectedId) ?? all[0];

  async function save() {
    if (!userId || saving || !changed) return;
    setFeedback(""); setSuccess(false); setSaving(true);
    try {
      // Profile updates use the same existing Supabase RLS rules as before.
      const { data, error } = await supabase.from("profiles")
        .update({
          profile_wallpaper: selectedByTheme.dark,
          profile_wallpaper_red: selectedByTheme.red,
          profile_wallpaper_light: selectedByTheme.light,
        }).eq("id",userId).select("profile_wallpaper");
      if (error) throw error;
      if (!data || data.length!==1) throw new Error("Profil arka planı kaydedilemedi.");
      setSavedByTheme({...selectedByTheme}); setSuccess(true);
      setFeedback("Arka planın güncellendi. Profil sayfanda görüntüleyebilirsin.");
    } catch(error) { setFeedback(error instanceof Error?error.message:"Kayıt başarısız."); }
    finally {setSaving(false);}
  }

  return <><Header/><main className={styles.page}><div className={styles.container}>
    <div className={styles.heading}><div>
      <Link href="/profile" className={styles.back}>← PROFİLE DÖN</Link>
      <div className={styles.eyebrow}>F1 MEDİPOL / DRIVER CUSTOMIZATION</div>
      <h1>PROFİL ARKA PLANLARI</h1>
      <p>Her tema için kendi arka planını seç. Koyu, kırmızı ve açık tema birbirinden bağımsızdır.</p>
      <div style={{display:"flex",gap:9,flexWrap:"wrap",marginTop:16}}>
        {(["dark","red","light"] as const).map(t=><button type="button" key={t} onClick={()=>setTheme(t)}
          aria-pressed={theme===t}
          style={{cursor:"pointer",padding:"10px 14px",borderRadius:10,fontWeight:800,border:theme===t?"1px solid #f35b72":"1px solid #536072",background:theme===t?"#ffe6ea":"#171d29",color:theme===t?"#94233a":"#fff"}}>
          {t==="dark"?"Koyu Tema":t==="red"?"Kırmızı Tema":"Açık Tema"}
        </button>)}
      </div>
    </div><div className={styles.count}><strong>{all.length.toString().padStart(2,"0")}</strong><span>ARKA PLAN</span></div></div>
    {loading?<div className={styles.loading}>Koleksiyon yükleniyor...</div>:
    <div className={styles.layout}>
      <section className={styles.previewPanel}>
        <div className={styles.preview} key={selected.id}>
          <ProfileWallpaperBackdrop wallpaper={selected}/>
          <div className={styles.previewTint}/>
          <div className={styles.previewWords}>
            <span className={styles.previewEyebrow}>F1 MEDİPOL / PROFILE DESIGN</span>
            <strong>YOUR GRID.<br/>YOUR STORY.</strong>
            <span className={styles.previewCaption}>CANLI ÖN İZLEME</span>
          </div>
        </div>
        <div className={styles.previewInfo}>
          <div className={styles.detail}><span className={styles.swatch} style={{backgroundColor:selected.accent}}/>
            <div><h2>{selected.name}</h2><p>{selected.description}</p></div>
          </div>
          <div className={styles.actions}>
            {savedId===selectedId&&<span className={styles.current}>✓ BU TEMADA KULLANIMDA</span>}
            <button type="button" className={styles.save} disabled={saving} onClick={()=>setSelectedByTheme({dark:selectedId,red:selectedId,light:selectedId})}>Üç temada da seç</button>
            <button type="button" className={styles.save} disabled={saving||!changed} onClick={save}>
              {saving?"KAYDEDİLİYOR...":!changed?"KAYDEDİLDİ":"SEÇİMLERİ KAYDET ↗"}
            </button>
          </div>
          {feedback&&<p role="status" className={success?styles.success:styles.error}>{feedback}</p>}
        </div>
      </section>
      <section className={styles.library}>
        <div className={styles.libraryHeading}><h2>KOLEKSİYON</h2><span>Yeni tasarımlar yönetim tarafından eklenir</span></div>
        <div className={styles.grid}>
          {all.map((wallpaper,index)=><button type="button" key={wallpaper.id}
            className={`${styles.item} ${selectedId===wallpaper.id?styles.selected:""}`}
            onClick={()=>{setSelectedId(wallpaper.id);setFeedback("");setSuccess(false);}}
            aria-pressed={selectedId===wallpaper.id} title={wallpaper.description}>
            <span className={styles.thumb} style={{backgroundImage:getWallpaperBackground(wallpaper)}}>
              <span className={styles.number}>{String(index+1).padStart(2,"0")}</span>
              {savedId===wallpaper.id&&<span className={styles.inUse}>AKTİF</span>}
            </span><span className={styles.itemName}>{wallpaper.name}</span>
          </button>)}
        </div>
        <div className={styles.hint}>Yayınlanan yeni arka planlar buraya otomatik eklenir. Cihazının azaltılmış hareket tercihi korunur.</div>
      </section>
    </div>}

  </div></main></>;
}
