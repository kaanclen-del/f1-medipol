import Link from "next/link";
import Header from "@/components/Header";
import ProfileWallpaperBackdrop from "@/components/ProfileWallpaperBackdrop";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getProfileWallpaper } from "@/lib/profile-wallpapers";
import { managedToWallpaper, type ManagedWallpaper } from "@/lib/profile-wallpaper-catalog";
import { getProfileAccent } from "@/lib/profile-accents";
import { getTeamBranding } from "@/lib/team-branding";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type PublicFriend = {
  user_id: string; display_name: string;
  avatar_url: string | null; bio: string | null;
  favorite_team: string | null; favorite_driver: string | null;
};
type ProfileRow = {
  display_name: string | null; username: string | null;
  avatar_url: string | null; bio: string | null;
  favorite_team: string | null; favorite_driver: string | null;
  profile_wallpaper: string | null; profile_accent: string | null;
};
type Award = { achievement_id: string; xp_awarded: number };
type Badge = { id: string; name: string; rarity: string; image_url: string | null };
type Post = { id: string; content: string | null; created_at: string };

const isUUID = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const xpForLevel = (level: number) => level <= 1 ? 0 : 50 * level * (level - 1);
function levelFromXp(xp: number) {
  let level = 1;
  while (level < 1000 && xp >= xpForLevel(level + 1)) level++;
  return level;
}
function initials(name: string | null) {
  return name?.trim().split(/\s+/).slice(0, 2).map(s => s[0]).join("").toUpperCase() || "F1";
}

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.id === id) redirect("/profile");
  if (!isUUID(id)) {
    return <><Header/><main className={styles.page}><div className={styles.container}><Link href="/paddock">← Paddock</Link><p>Geçersiz profil bağlantısı.</p></div></main></>;
  }
  // Public member profile: only profile presentation fields, published posts and
  // achievement/XP totals are rendered. No e-mail, account metadata, or private predictions.
  const admin = createAdminClient();
  let friend: PublicFriend | undefined;
  const { data:friendData } = await supabase.rpc("dm_friend_profile", { p_target:id });
  if (Array.isArray(friendData)) friend = friendData[0] as PublicFriend | undefined;
  const [profileResult, predictionsResult, awardsResult, postsResult] = await Promise.all([
    admin.from("profiles").select("display_name,username,avatar_url,bio,favorite_team,favorite_driver,profile_wallpaper,profile_accent").eq("id",id).maybeSingle(),
    admin.from("predictions").select("points").eq("user_id",id).not("points","is",null),
    admin.from("user_achievements").select("achievement_id,xp_awarded").eq("user_id",id),
    admin.from("paddock_posts").select("id,content,created_at").eq("user_id",id).eq("is_published",true).order("created_at",{ascending:false}).limit(4),
  ]);
  const profile = profileResult.data as ProfileRow | null;
  if (!profile) {
    return <><Header/><main className={styles.page}><div className={styles.container}><Link href="/paddock">← Paddock</Link><p>Bu üyenin profili bulunamadı.</p></div></main></>;
  }
  const name = profile.display_name || friend?.display_name || "F1 Medipol Üyesi";
  const avatar = profile.avatar_url || friend?.avatar_url;
  const bio = profile.bio ?? friend?.bio;
  const team = profile.favorite_team ?? friend?.favorite_team;
  const driver = profile.favorite_driver ?? friend?.favorite_driver;
  const themeAccent = getProfileAccent(profile?.profile_accent);
  const teamBrand = getTeamBranding(team);
  const awards = (awardsResult.data || []) as Award[];
  const predictionXp = (predictionsResult.data || []).reduce((sum, item) => sum + Math.max(0, Number(item.points || 0)), 0);
  const awardXp = awards.reduce((sum, award) => sum + Math.max(0, Number(award.xp_awarded || 0)), 0);
  const xp = predictionXp + awardXp;
  const level = levelFromXp(xp);
  const nextXp = xpForLevel(level + 1);
  const progress = Math.min(100, Math.max(0, ((xp - xpForLevel(level)) / Math.max(1, nextXp - xpForLevel(level))) * 100));
  const posts = (postsResult.data || []) as Post[];
  const awardIds = awards.map(item => item.achievement_id);
  const badgesResult = awardIds.length
    ? await admin.from("achievements").select("id,name,rarity,image_url").eq("is_published",true).in("id",awardIds).limit(20)
    : {data: []};
  const badges = (badgesResult.data || []) as Badge[];

  const wallpaperId = profile?.profile_wallpaper;
  const custom = wallpaperId?.startsWith("custom-")
    ? await admin.from("profile_wallpaper_options")
        .select("id,name,description,image_url,color_a,color_b,accent,motion,is_published,sort_order")
        .eq("id",wallpaperId).eq("is_published",true).maybeSingle()
    : {data:null};
  const wallpaper = custom.data
    ? managedToWallpaper(custom.data as ManagedWallpaper)
    : getProfileWallpaper(wallpaperId);
  const accentStyle = {
    "--profile-accent": themeAccent.primary,
    "--profile-accent-2": themeAccent.secondary,
    "--profile-accent-soft": themeAccent.soft,
  } as CSSProperties;

  return <><Header/><main className={styles.page} style={accentStyle}>
    <ProfileWallpaperBackdrop wallpaper={wallpaper}/><div className={styles.shade}/>
    <div className={styles.container}>
      <nav className={styles.nav}><span>F1 MEDİPOL <strong>· SÜRÜCÜ PROFİLİ</strong></span><Link href={friend ? `/messages?dm=${encodeURIComponent(id)}` : "/paddock"}>← {friend ? "Sohbete dön" : "Paddock'a dön"}</Link></nav>
      <section className={styles.hero}>
        <div className={styles.heroTop}/>
        <div className={styles.heroInner}>
          <div className={styles.avatar}>{avatar ? <img src={avatar} alt={name}/> : <span>{initials(name)}</span>}</div>
          <div className={styles.identity}>
            <div className={styles.kicker}>F1 MEDİPOL MEMBER <span className={styles.levelPill}>LEVEL {level}</span></div>
            <h1>{name}</h1>
            <div className={styles.identityMeta}>{profile?.username && <span>@{profile.username}</span>}<span>F1 MEDİPOL</span>{teamBrand && <span style={{color:teamBrand.color}}>{teamBrand.name}</span>}</div>
            <p className={styles.bio}>{bio || "Bu kullanıcı henüz profil açıklaması eklemedi."}</p>
            <div className={styles.identityAccent}><i/><span>{xp.toLocaleString("tr-TR")} XP · LEVEL {level}</span></div>
          </div>
          <aside className={styles.favorites}>
            <div className={styles.kicker}>FAVORİLER</div>
            <div className={styles.favRow}>
              <div className={styles.favVisual}>{teamBrand ? <img src={teamBrand.logoUrl} alt={teamBrand.name}/> : "F1"}</div>
              <div><small>FAVORİ TAKIM</small><strong>{teamBrand?.name || team || "Seçilmedi"}</strong></div>
            </div>
            <div className={styles.favRow}>
              <div className={styles.favVisual}>{initials(driver ?? null)}</div>
              <div><small>FAVORİ PİLOT</small><strong>{driver || "Seçilmedi"}</strong></div>
            </div>
          </aside>
        </div>
      </section>
      <section className={styles.levelPanel}>
        <div className={styles.levelBadge}><div className={styles.ring}><small>LEVEL</small><b>{level}</b></div><div><strong>{xp.toLocaleString("tr-TR")}</strong><small>TOPLAM XP</small></div></div>
        <div className={styles.progressArea}><span className={styles.kicker}>LEVEL {level} · SEVİYE İLERLEMESİ</span><div className={styles.track}><div style={{width:`${progress}%`}}/></div><div className={styles.progressInfo}><span>{(xp-xpForLevel(level)).toLocaleString("tr-TR")} XP kazanıldı</span><span>{Math.max(0,nextXp-xp).toLocaleString("tr-TR")} XP kaldı</span></div></div>
      </section>
      <div className={styles.contentGrid}>
        <section className={styles.panel}><div className={styles.kicker}>PADDOCK ACTIVITY</div><h2>Paddock Paylaşımları</h2>{posts.length ? posts.map(post=><article className={styles.post} key={post.id}><span>{new Date(post.created_at).toLocaleDateString("tr-TR")}</span><p>{post.content || "Medya paylaşımı"}</p></article>):<p className={styles.empty}>Henüz herkese açık gönderi yok.</p>}</section>
        <section className={styles.panel}><div className={styles.kicker}>ACHIEVEMENT GARAGE</div><h2>Rozetler & Başarımlar</h2><span className={styles.total}>{badges.length} kazanılan rozet</span>{badges.length ? <div className={styles.badges}>{badges.map(badge=><div className={styles.badge} key={badge.id}>{badge.image_url ? <img src={badge.image_url} alt=""/>:<span>🏆</span>}<div><strong>{badge.name}</strong><small>{badge.rarity}</small></div></div>)}</div> : <p className={styles.empty}>Henüz kazanılmış rozet yok.</p>}</section>
      </div>
    </div>
  </main></>;
}
