"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import styles from "./WelcomeTour.module.css";

const slides = [
  { label: "01 / 03 · YARIŞ HAFTASI", title: "TAHMİNİNİ YAP.", sub: "Podyumu tahmin et, puan topla, arkadaşlarınla yarış.", marker: "01", icon: "🏁", tags: ["GRAND PRIX", "TAHMİNLER", "LİDERLİK"] },
  { label: "02 / 03 · TOPLULUK", title: "PADDOCK'A KATIL.", sub: "Paylaşımlara göz at, yarış sohbetlerine katıl.", marker: "02", icon: "💬", tags: ["PADDOCK", "SOHBET", "TOPLULUK"] },
  { label: "03 / 03 · SENİN PROFİLİN", title: "KENDİ GRIDİNİ KUR.", sub: "Arkadaş ekle, mesajlaş, seviye atla ve profilini kişiselleştir.", marker: "03", icon: "🏆", tags: ["ARKADAŞLAR", "DM", "BAŞARIMLAR"] },
] as const;

export default function WelcomeTour() {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [saving, setSaving] = useState(false);

  const check = useCallback(async (id: string) => {
    const { data, error } = await supabase.from("profiles")
      .select("onboarding_seen_at").eq("id", id).maybeSingle();
    if (!error && data && data.onboarding_seen_at === null) {
      setUserId(id); setOpen(true);
    }
  }, [supabase]);

  useEffect(() => {
    let live = true;
    void supabase.auth.getUser().then(({data}) => {
      if (live && data.user) void check(data.user.id);
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session) => {
      if (live && session?.user) void check(session.user.id);
      else if (!session) setOpen(false);
    });
    return () => {live=false;subscription.unsubscribe();};
  }, [supabase, check]);

  async function complete() {
    if (!userId || saving) return;
    setSaving(true);
    const {error} = await supabase.from("profiles")
      .update({onboarding_seen_at: new Date().toISOString()}).eq("id", userId);
    if (!error) setOpen(false);
    setSaving(false);
  }

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {document.body.style.overflow = overflow;};
  }, [open]);

  if (!open) return null;
  const current = slides[slide];
  return (
    <div className={styles.layer} role="dialog" aria-modal="true" aria-label="F1 Medipol'e hoş geldin">
      <section className={styles.card}>
        <div className={styles.art} aria-hidden="true">
          <div className={styles.track} />
          <span className={styles.artIcon}>{current.icon}</span>
          <span className={styles.ghost}>{current.marker}</span>
          <div className={styles.racingLine} />
          <span className={styles.artCorner}>F1 MEDİPOL · DIGITAL PADDOCK</span>
        </div>
        <div className={styles.content}>
          <div className={styles.topline}><span>GRID'E HOŞ GELDİN</span><span>{current.label}</span></div>
          <h2>{current.title}</h2>
          <p>{current.sub}</p>
          <div className={styles.tags}>{current.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
          <div className={styles.dots}>{slides.map((_,index)=><button key={index} className={index===slide?styles.selected:""} onClick={()=>setSlide(index)} aria-label={`${index+1}. sayfa`}/>)}</div>
          <div className={styles.actions}>
            <button type="button" className={styles.skip} disabled={saving} onClick={()=>void complete()}>Tanıtımı geç</button>
            <button type="button" className={styles.next} disabled={saving} onClick={()=>slide===2?void complete():setSlide(slide+1)}>
              {saving?"Kaydediliyor...":slide===2?"SİTEYİ KEŞFET →":"DEVAM ET →"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
