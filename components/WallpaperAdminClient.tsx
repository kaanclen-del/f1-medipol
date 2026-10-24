"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { ManagedWallpaper, WallpaperMotion } from "@/lib/profile-wallpaper-catalog";
import { managedToWallpaper } from "@/lib/profile-wallpaper-catalog";
import ProfileWallpaperBackdrop from "@/components/ProfileWallpaperBackdrop";
import styles from "./WallpaperAdminClient.module.css";

const motions: { id: WallpaperMotion; label: string; detail: string }[] = [
  { id:"drift", label:"Yumuşak kayma", detail:"Sakin sinematik ışık" },
  { id:"pulse", label:"Nabız", detail:"Yavaş parlayan ışık" },
  { id:"speed", label:"Hız çizgileri", detail:"Yarış hissi veren hareket" },
  { id:"aurora", label:"Aurora", detail:"Yumuşak dalgalanan ışık" },
  { id:"rain", label:"Yağmur", detail:"Yarış gecesi efekti" },
];
const endpoint = "/api/admin/profile-wallpapers";

export default function WallpaperAdminClient() {
  const [wallpapers, setWallpapers] = useState<ManagedWallpaper[]>([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [actionId,setActionId] = useState<string|null>(null);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");
  const [name,setName] = useState("");
  const [description,setDescription] = useState("");
  const [colorA,setColorA] = useState("#080e20");
  const [colorB,setColorB] = useState("#45152d");
  const [accent,setAccent] = useState("#fa3449");
  const [motion,setMotion] = useState<WallpaperMotion>("aurora");
  const [published,setPublished] = useState(false);
  const [file,setFile] = useState<File|null>(null);
  const [localPreview,setLocalPreview] = useState<string|null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(endpoint,{ cache:"no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Liste yüklenemedi.");
    setWallpapers(json.wallpapers ?? []);
  },[]);

  useEffect(()=>{
    let active = true;
    const run = async()=>{
      try { await refresh(); }
      catch(e){ if(active)setError(e instanceof Error?e.message:"Koleksiyon yüklenemedi."); }
      finally{if(active)setLoading(false);}
    };
    void run();
    return ()=>{active=false;};
  },[refresh]);

  useEffect(()=>{
    if(!file) { setLocalPreview(null);return; }
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    return()=>URL.revokeObjectURL(url);
  },[file]);

  async function add(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy)return;
    setError("");setSuccess("");setBusy(true);
    try {
      const body=new FormData();
      body.set("name", name.trim());
      body.set("description", description.trim());
      body.set("color_a", colorA);
      body.set("color_b", colorB);
      body.set("accent", accent);
      body.set("motion", motion);
      body.set("is_published",String(published));
      if(file)body.set("image",file);
      const response=await fetch(endpoint,{method:"POST",body});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error??"Kaydedilemedi.");
      await refresh();
      setName("");setDescription("");setFile(null);setPublished(false);
      setSuccess("Arka plan eklendi. Yayındaysa üyeler hemen seçebilir.");
    }catch(e){setError(e instanceof Error?e.message:"Kayıt işlemi başarısız.");}
    finally{setBusy(false);}
  }

  async function toggle(item:ManagedWallpaper) {
    if(busy||actionId)return;
    setError("");setSuccess("");setActionId(item.id);
    try{
      const response=await fetch(endpoint,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,is_published:!item.is_published})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error??"Güncellenemedi.");
      await refresh();
      setSuccess(`${item.name}: ${!item.is_published ? "Yayına alındı" : "Yayından kaldırıldı"}.`);
    }catch(e){setError(e instanceof Error?e.message:"Değişiklik kaydedilemedi.");}
    finally{setActionId(null);}
  }

  async function remove(item:ManagedWallpaper) {
    if(busy||actionId)return;
    if(!window.confirm(`“${item.name}” arka planını tamamen silmek istiyor musun? Bu seçiliyse üyelerin profilleri varsayılan arka plana döner.`))return;
    setError("");setSuccess("");setActionId(item.id);
    try{
      const response=await fetch(endpoint,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error??"Silinemedi.");
      await refresh();
      setSuccess(`${item.name} kaldırıldı.`);
    }catch(e){setError(e instanceof Error?e.message:"Silme işlemi başarısız.");}
    finally{setActionId(null);}
  }

  const previewItem:ManagedWallpaper={
    id:"custom-preview",name:name||"Yeni Tasarım",description,
    image_url:localPreview,color_a:colorA,color_b:colorB,accent,motion,
    is_published:published,sort_order:100,
  };

  return <main className={styles.page}>
    <div className={styles.shell}>
      <Link className={styles.back} href="/admin">← YÖNETİM PANELİNE DÖN</Link>
      <div className={styles.heading}>
        <div><span className={styles.eyebrow}>F1 SOCIAL · CUSTOMIZATION CONTROL</span><h1>PROFİL ARKA PLANLARI</h1><p>Üyelerin kullanabileceği koleksiyona yeni tasarımlar ekle, yayına al ve yönet.</p></div>
        <Link href="/profile/wallpapers" className={styles.viewer}>ÜYE GÖRÜNÜMÜNÜ AÇ ↗</Link>
      </div>

      {error && <p className={styles.error} role="alert">{error} {error.includes("profile_wallpaper_options") && "Önce paketteki Supabase SQL kurulumunu yapmalısın."}</p>}
      {success && <p className={styles.success} role="status">✓ {success}</p>}
      <div className={styles.cols}>
        <section className={styles.panel}>
          <div className={styles.panelHead}><span>01 / TASARIM EKLE</span><strong>YENİ ARKA PLAN</strong></div>
          <div className={styles.preview}>
            <ProfileWallpaperBackdrop wallpaper={managedToWallpaper(previewItem)} />
            <div className={styles.tint}/>
            <div className={styles.previewText}><small>CANLI ÖN İZLEME</small><strong>{name||"YENİ TASARIM"}</strong></div>
          </div>
          <form onSubmit={add} className={styles.form}>
            <label>Arka plan adı<input required minLength={2} maxLength={60} value={name} placeholder="Örn. Monaco Midnight" onChange={e=>setName(e.target.value)}/></label>
            <label>Açıklama<textarea rows={2} maxLength={240} value={description} placeholder="Bu tasarımın atmosferi..." onChange={e=>setDescription(e.target.value)}/></label>
            <label>İsteğe bağlı görsel (JPG, PNG, WEBP · en fazla 6 MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setFile(e.target.files?.[0]??null)} /></label>
            <div className={styles.colors}>
              <label>Başlangıç rengi<input type="color" value={colorA} onChange={e=>setColorA(e.target.value)}/></label>
              <label>Bitiş rengi<input type="color" value={colorB} onChange={e=>setColorB(e.target.value)}/></label>
              <label>Işık rengi<input type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></label>
            </div>
            <label>Animasyon
              <select value={motion} onChange={e=>setMotion(e.target.value as WallpaperMotion)}>
                {motions.map(m=><option key={m.id} value={m.id}>{m.label} — {m.detail}</option>)}
              </select>
            </label>
            <label className={styles.check}><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/><span>Kaydedince üyelerin kullanımına aç</span></label>
            <button disabled={busy} className={styles.primary} type="submit">{busy?"YÜKLENİYOR...":"ARKA PLANI EKLE ↗"}</button>
          </form>
        </section>
        <section className={styles.panel}>
          <div className={styles.panelHead}><span>02 / KOLEKSİYON</span><strong>{wallpapers.length} ÖZEL TASARIM</strong></div>
          <div className={styles.list}>
            {loading?<div className={styles.placeholder}>Koleksiyon yükleniyor...</div>:wallpapers.length===0?<div className={styles.placeholder}>Henüz özel arka plan yok. İlk tasarımını soldan ekleyebilirsin. Mevcut 15 temel tasarım üyelerde görünmeye devam eder.</div>:wallpapers.map(item=><article className={styles.item} key={item.id}>
              <div className={styles.mini} style={{backgroundImage:item.image_url?`linear-gradient(0deg,rgba(3,5,10,.3),transparent),url("${item.image_url}")`:`linear-gradient(125deg,${item.color_a},${item.color_b})`}}/>
              <div className={styles.itemBody}>
                <div className={styles.itemTop}><strong>{item.name}</strong><span className={item.is_published?styles.live:styles.draft}>{item.is_published?"YAYINDA":"TASLAK"}</span></div>
                <p>{item.description||"Özel profil arka planı"}</p>
                <small>{motions.find(m=>m.id===item.motion)?.label??"Animasyon"}</small>
                <div className={styles.itemActions}>
                  <button type="button" disabled={actionId!==null||busy} onClick={()=>toggle(item)}>{actionId===item.id?"KAYDEDİLİYOR...":item.is_published?"Yayından kaldır":"Yayınla"}</button>
                  <button type="button" className={styles.remove} disabled={actionId!==null||busy} onClick={()=>remove(item)}>Sil</button>
                </div>
              </div>
            </article>)}
          </div>
          <div className={styles.note}>Temel 15 tasarım korunur. Yeni seçenekleri burada yayınladığında tüm üyelerin listesine otomatik eklenir.</div>
        </section>
      </div>
    </div>
  </main>;
}
