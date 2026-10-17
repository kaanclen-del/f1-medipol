"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import Header from "@/components/Header";
import styles from "./page.module.css";

type Member = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  favorite_team: string | null;
  favorite_driver: string | null;
};
type More = {
  username?: string | null;
  level?: number | null;
  xp?: number | null;
  profile_wallpaper?: string | null;
};

export default function MemberPage() {
  const { id } = useParams<{id: string}>();
  const [supabase] = useState(() => createClient());
  const [member, setMember] = useState<Member | null>(null);
  const [extra, setExtra] = useState<More>({});
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    (async () => {
      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {setError("Geçersiz profil bağlantısı.");return;}
      const {data, error: rpcError} = await supabase.rpc("dm_friend_profile", {p_target:id});
      if (!current) return;
      const row = (data || [])[0] as Member | undefined;
      if (rpcError || !row) {setError("Bu profil görüntülenemiyor. Kullanıcıyla arkadaş olduğundan emin ol.");return;}
      setMember(row);
      // Herkese acik RLS ile izin verilmisse ek profil istatistikleri gösterilir.
      // Izin yoksa eski friend_profile RPC verileriyle güvenle devam edilir.
      const {data: more} = await supabase.from("profiles").select("username,level,xp,profile_wallpaper").eq("id",id).maybeSingle();
      if (current && more) setExtra(more as More);
    })();
    return () => {current=false;};
  }, [supabase,id]);

  const level = extra.level ?? null;
  const xp = extra.xp ?? null;
  return <><Header/><main className={styles.page}><div className={styles.container}>
    <nav className={styles.navigation}><Link href={`/messages?dm=${encodeURIComponent(id)}`}>← Mesajlara dön</Link><span>F1 MEDİPOL / SÜRÜCÜ PROFİLİ</span></nav>
    {error ? <div className={styles.notice}>{error}</div> : !member ? <div className={styles.notice}>Profil yükleniyor...</div> : <>
      <section className={styles.hero}>
        <div className={styles.cover} aria-hidden="true"><div className={styles.orbit}/><span>F1 MEDİPOL</span><b>THE PADDOCK</b></div>
        <div className={styles.identity}>
          <div className={styles.avatar}>{member.avatar_url ? <img src={member.avatar_url} alt={member.display_name}/> : member.display_name.charAt(0).toLocaleUpperCase("tr-TR")}</div>
          <div className={styles.identityCopy}><span className={styles.kicker}>GRID MEMBER {level != null ? ` · LEVEL ${level}` : ""}</span><h1>{member.display_name}</h1>
            {extra.username && <p className={styles.username}>@{extra.username}</p>}
            <p className={styles.bio}>{member.bio || "Bu sürücü henüz kendini tanıtmamış."}</p>
          </div>
          <Link className={styles.messageButton} href={`/messages?dm=${member.user_id}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-3.6-.75L3 21l1.75-4.9A8.5 8.5 0 1 1 20 11.5Z"/></svg> Mesaj Gönder</Link>
        </div>
      </section>
      <div className={styles.columns}>
        <div className={styles.mainColumn}>
          <section className={styles.section}><span className={styles.kicker}>DRIVER PROFILE</span><h2>Hakkında</h2><p>{member.bio || "Henüz biyografi eklenmemiş."}</p></section>
          {(level !== null || xp !== null) && <section className={styles.section}><span className={styles.kicker}>RACING CAREER</span><h2>Sürücü İlerlemesi</h2><div className={styles.stats}>
            {level !== null && <div><small>SEVİYE</small><strong>{level}</strong></div>}
            {xp !== null && <div><small>TOPLAM XP</small><strong>{xp.toLocaleString("tr-TR")}</strong></div>}
          </div></section>}
        </div>
        <aside className={styles.sideColumn}><section className={styles.section}><span className={styles.kicker}>GRID PICKS</span><h2>Favorileri</h2>
          <div className={styles.pick}><span>🏎</span><div><small>FAVORİ TAKIM</small><strong>{member.favorite_team || "Henüz seçilmedi"}</strong></div></div>
          <div className={styles.pick}><span>🏁</span><div><small>FAVORİ PİLOT</small><strong>{member.favorite_driver || "Henüz seçilmedi"}</strong></div></div>
        </section></aside>
      </div>
    </>}
  </div></main></>;
}
