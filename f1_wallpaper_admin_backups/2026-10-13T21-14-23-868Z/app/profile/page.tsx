import Link from "next/link";
import Header from "@/components/Header";
import ProfileWallpaperBackdrop from "@/components/ProfileWallpaperBackdrop";
import ProfileActions from "@/components/ProfileActions";
import ProfileAchievements from "@/components/ProfileAchievements";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getTeamBranding } from "@/lib/team-branding";
import { getProfileWallpaper, getWallpaperBackground } from "@/lib/profile-wallpapers";
import { getProfileAccent } from "@/lib/profile-accents";
import { getLatestF1Drivers, type OpenF1Driver } from "@/lib/openf1";
export const dynamic = "force-dynamic";
type Prediction = {
  id: string;
  season: number;
  round: number;
  race_name: string;
  prediction_type: "race" | "sprint";
  p1_driver_number: number;
  p2_driver_number: number;
  p3_driver_number: number;
  points: number | null;
  podium_points: number | null;
  bulletin_points: number | null;
  special_points: number | null;
  score_breakdown: unknown;
  created_at: string;
};
type PredictionDetail = {
  predicted?: unknown;
  actual?: unknown;
  available?: boolean;
  correct?: boolean;
  points?: number;
  maxPoints?: number;
};
type ScoreBreakdown = {
  type?: "race" | "sprint";
  podium?: Record<string, number>;
  bulletin?: Record<string, PredictionDetail>;
  special?: Record<string, PredictionDetail>;
  total?: number;
};
const BULLETIN_NAMES: Record<string, string> = {
  redFlag: "KÄ±rmÄ±zÄ± bayrak",
  safetyCar: "GÃ¼venlik aracÄ±",
  vsc: "Sanal gÃ¼venlik aracÄ±",
  dnf3: "En az 3 pilot yarÄ±ÅŸÄ± bÄ±rakÄ±r mÄ±?",
  lap1Incident: "Ä°lk turda olay",
  rain: "YaÄŸmur",
  poleWins: "Pole sahibi yarÄ±ÅŸÄ± kazanÄ±r mÄ±?",
  lightsToFlag: "Liderlik el deÄŸiÅŸtirmez mi?",
  margin10: "Fark 10 saniyeyi aÅŸar mÄ±?",
  fastestOnPodium: "En hÄ±zlÄ± tur sahibi podyumda mÄ±?",
  leaders4: "En az 4 farklÄ± lider olur mu?",
  lateNeutral: "GeÃ§ bÃ¶lÃ¼mde nÃ¶tralizasyon",
};
const SPECIAL_NAMES: Record<string, string> = {
  fastestLap: "En hÄ±zlÄ± tur",
  firstDnf: "Ä°lk yarÄ±ÅŸÄ± bÄ±rakan pilot",
  mostGained: "En Ã§ok sÄ±ra kazanan pilot",
  winningTeam: "Kazanan takÄ±m",
};
function readScoreBreakdown(value: unknown): ScoreBreakdown | null {
  let parsed = value;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { return null; }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const data = parsed as Record<string, unknown>;
  if (data.type !== "race" && data.type !== "sprint") return null;
  return data as ScoreBreakdown;
}
function detailRows(value?: Record<string, PredictionDetail>): Array<[string, PredictionDetail]> {
  return Object.entries(value ?? {}).filter(([, detail]) =>
    !!detail && typeof detail === "object" && !Array.isArray(detail)
  );
}
function formatAnswer(value: unknown): string {
  if (value === null || value === undefined) return "Belirlenmedi";
  if (typeof value === "boolean") return value ? "Evet" : "HayÄ±r";
  if (Array.isArray(value)) return value.length ? value.map(formatAnswer).join(", ") : "Yok";
  if (typeof value === "string") {
    if (value.toLowerCase() === "yes") return "Evet";
    if (value.toLowerCase() === "no") return "HayÄ±r";
    return value;
  }
  return String(value);
}
function scoreNumber(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}
type PaddockPost = {
  id: string; user_id: string; content: string | null;
  is_admin_post: boolean; is_pinned: boolean; created_at: string;
};
type PaddockMedia = {
  id: string; post_id: string; media_url: string;
  media_type: "image" | "video"; sort_order: number;
};
type Achievement = {
  id: string; slug: string; name: string; description: string | null;
  image_url: string | null; category: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  xp_reward: number; is_automatic: boolean; condition_type: string;
  condition_value: number | null; is_published: boolean; sort_order: number;
};
type UserAchievement = {
  achievement_id: string; award_source: string;
  awarded_at: string; xp_awarded: number;
};
function formatPaddockDate(value: string) {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      timeZone: "Europe/Istanbul",
    }).format(new Date(value));
  } catch { return value; }
}
function driverInitials(driver?: string | null) {
  return driver ? driver.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((word) => word.charAt(0)).join("").toUpperCase() : "â€”";
}
function normalizeDriverName(value?: string | null) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]/g, "");
}
function findFavoriteDriver(drivers: OpenF1Driver[], favoriteDriver?: string | null) {
  if (!favoriteDriver) return null;
  const target = normalizeDriverName(favoriteDriver);
  const exact = drivers.find((driver) => [
    driver.full_name, driver.broadcast_name,
    [driver.first_name, driver.last_name].filter(Boolean).join(" "),
  ].some((name) => normalizeDriverName(name) === target));
  if (exact) return exact;
  const words = favoriteDriver.trim().split(/\s+/);
  const lastName = normalizeDriverName(words[words.length - 1]);
  return drivers.find((driver) => normalizeDriverName(driver.last_name) === lastName) ?? null;
}
function xpRequiredForLevel(level: number) {
  return level <= 1 ? 0 : 50 * level * (level - 1);
}
function calculateLevel(xp: number) {
  let level = 1;
  while (Math.max(0, xp) >= xpRequiredForLevel(level + 1)) level++;
  return level;
}
export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <>
    <Header />
    <main className="profile-login"><style>{styles}</style>
      <div className="login-card">
        <span className="profile-kicker">F1 MEDÄ°POL Â· DRIVER PROFILE</span>
        <h1>Profiline giriÅŸ yap</h1>
        <p>Profilini, seviyeni, baÅŸarÄ±mlarÄ±nÄ± ve yarÄ±ÅŸ istatistiklerini gÃ¶rmek iÃ§in giriÅŸ yap.</p>
        <Link href="/login" className="profile-red-button">GiriÅŸ Yap â†’</Link>
      </div>
    </main>
  </>;
  const { data: profile } = await supabase.from("profiles")
    .select("display_name,username,avatar_url,bio,favorite_team,favorite_driver,profile_wallpaper,profile_accent,xp,level,is_admin")
    .eq("id", user.id).maybeSingle();
  const { data: predictionData } = await supabase.from("predictions")
    .select("id,season,round,race_name,prediction_type,p1_driver_number,p2_driver_number,p3_driver_number,points,podium_points,bulletin_points,special_points,score_breakdown,created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  const predictions = (predictionData ?? []) as Prediction[];
  const totalPoints = predictions.reduce((total, p) => total + Math.max(Number(p.points ?? 0), 0), 0);
  const predictionXp = totalPoints;
  const predictionCount = predictions.length;
  const bestScore = predictionCount ? Math.max(...predictions.map((p) => Math.max(Number(p.points ?? 0), 0))) : 0;
  const recentPredictions = predictions;
  const admin = createAdminClient();
  const [paddockPostsResult, paddockCountResult] = await Promise.all([
    admin.from("paddock_posts")
      .select("id,user_id,content,is_admin_post,is_pinned,created_at")
      .eq("user_id", user.id).eq("is_published", true)
      .order("created_at", { ascending: false }).limit(4),
    admin.from("paddock_posts").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("is_published", true),
  ]);
  const paddockPosts = (paddockPostsResult.data ?? []) as PaddockPost[];
  const paddockPostCount = paddockCountResult.count ?? 0;
  const paddockPostIds = paddockPosts.map((post) => post.id);
  let paddockMedia: PaddockMedia[] = [];
  if (paddockPostIds.length) {
    const { data } = await admin.from("paddock_post_media")
      .select("id,post_id,media_url,media_type,sort_order")
      .in("post_id", paddockPostIds).order("sort_order", { ascending: true });
    paddockMedia = (data ?? []) as PaddockMedia[];
  }
  const mediaByPost = new Map<string, PaddockMedia[]>();
  for (const media of paddockMedia) {
    const existing = mediaByPost.get(media.post_id) ?? [];
    existing.push(media);
    mediaByPost.set(media.post_id, existing);
  }
  const [achievementsResult, userAchievementsResult] = await Promise.all([
    admin.from("achievements")
      .select("id,slug,name,description,image_url,category,rarity,xp_reward,is_automatic,condition_type,condition_value,is_published,sort_order")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    admin.from("user_achievements")
      .select("achievement_id,award_source,awarded_at,xp_awarded")
      .eq("user_id", user.id),
  ]);
  const achievements = (achievementsResult.data ?? []) as Achievement[];
  const userAchievements = (userAchievementsResult.data ?? []) as UserAchievement[];
  const awardIds = new Set(userAchievements.map((a) => a.achievement_id));
  const unlockedAchievementCount = achievements.filter((a) => awardIds.has(a.id)).length;
  const totalAchievementCount = achievements.length;
  const achievementXp = userAchievements.reduce((total, a) => total + Math.max(Number(a.xp_awarded ?? 0), 0), 0);
  const totalXp = predictionXp + achievementXp;
  const currentLevel = calculateLevel(totalXp);
  const nextLevel = currentLevel + 1;
  const currentLevelStartXp = xpRequiredForLevel(currentLevel);
  const nextLevelTotalXp = xpRequiredForLevel(nextLevel);
  const levelXpNeeded = nextLevelTotalXp - currentLevelStartXp;
  const levelXpProgress = Math.max(0, totalXp - currentLevelStartXp);
  const xpRemaining = Math.max(0, nextLevelTotalXp - totalXp);
  const levelProgressPercentage = levelXpNeeded > 0 ? Math.min(100, Math.max(0, levelXpProgress / levelXpNeeded * 100)) : 100;
  const displayName = profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "F1 SOCIAL Ãœyesi";
  const initial = displayName.charAt(0).toUpperCase();
  const teamBrand = getTeamBranding(profile?.favorite_team);
  let latestDrivers: OpenF1Driver[] = [];
  try { latestDrivers = await getLatestF1Drivers(); } catch { latestDrivers = []; }
  const favoriteDriverData = findFavoriteDriver(latestDrivers, profile?.favorite_driver);
  const favoriteDriverImage = favoriteDriverData?.headshot_url || null;
  const favoriteDriverTeamColor = favoriteDriverData?.team_colour
    ? `#${favoriteDriverData.team_colour.replace("#", "")}` : null;
  const wallpaper = getProfileWallpaper(profile?.profile_wallpaper);
  const profileAccent = getProfileAccent(profile?.profile_accent);
  const background = getWallpaperBackground(wallpaper);
  return <>
    <Header />
    <main className="steam-profile" style={{
      ["--profile-accent" as string]: profileAccent.primary,
      ["--profile-accent-2" as string]: profileAccent.secondary,
      ["--profile-accent-soft" as string]: profileAccent.soft,
      ["--profile-accent-glow" as string]: profileAccent.glow,
    }}>
      <style>{styles}</style>
      <ProfileWallpaperBackdrop wallpaper={wallpaper} />
      <div className="profile-page-shade" />
      <div className="profile-container">
        <div className="profile-top-strip">
          <div><span>F1 MEDÄ°POL</span><strong>DRIVER PROFILE</strong></div>
          <Link href="/profile/edit" className="edit-profile-button">PROFÄ°LÄ° DÃœZENLE</Link>
        </div>
        <section className="profile-shell">
          <div className="hero-accent-top" />
          <div className="wallpaper-glow" />
          <div className="profile-header">
            <div className="avatar-column">
              <div className="profile-avatar-frame">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt={displayName} /> :
                  <div className="avatar-fallback">{initial}</div>}
              </div>
            </div>
            <div className="profile-identity">
              <div className="identity-line">
                <span className="profile-kicker">F1 MEDÄ°POL MEMBER</span>
                <span className="member-badge">LEVEL {currentLevel}</span>
              </div>
              <h1>{displayName}</h1>
              <div className="identity-meta">
                {profile?.username && <span>@{profile.username}</span>}
                <span>F1 MEDÄ°POL</span>
                <span className="identity-level">LEVEL {currentLevel}</span>
                {teamBrand && <span style={{ color: teamBrand.color }}>{teamBrand.name}</span>}
              </div>
              <p className="profile-bio">{profile?.bio || "Bu kullanÄ±cÄ± henÃ¼z profil aÃ§Ä±klamasÄ± eklemedi."}</p>
              <div className="identity-accent"><span /><small>{totalXp} XP Â· LEVEL {currentLevel}</small></div>
            </div>
            <aside className="profile-summary">
              <div className="summary-title">DRIVER SUMMARY</div>
              <SummaryRow label="Seviye" value={`LEVEL ${currentLevel}`} />
              <SummaryRow label="Toplam XP" value={`${totalXp} XP`} />
              <SummaryRow label="Tahmin PuanÄ±" value={`${totalPoints}`} />
              <SummaryRow label="BaÅŸarÄ±m" value={`${unlockedAchievementCount}/${totalAchievementCount}`} />
            </aside>
          </div>
        </section>
        <section className="level-panel">
          <div className="level-badge-area">
            <div className="level-ring"><span>LEVEL</span><strong>{currentLevel}</strong></div>
            <div className="level-total-xp"><strong>{totalXp}</strong><span>TOTAL XP</span></div>
          </div>
          <div className="level-progress-area">
            <div className="level-progress-title">
              <div><span>LEVEL {currentLevel}</span><strong>Seviye Ä°lerlemesi</strong></div>
              <div className="next-level-label">LEVEL {nextLevel}</div>
            </div>
            <div className="level-big-track">
              <div className="level-big-fill" style={{ width: `${levelProgressPercentage}%` }} />
            </div>
            <div className="level-progress-info">
              <div><strong>{levelXpProgress} / {levelXpNeeded} XP</strong><span>bu seviyede</span></div>
              <div className="level-remaining"><strong>{xpRemaining} XP</strong><span>LEVEL {nextLevel}'E KALDI</span></div>
            </div>
            <div className="level-threshold-info">Bir sonraki seviyeye ulaÅŸmak iÃ§in toplam <strong>{nextLevelTotalXp} XP</strong> gerekiyor.</div>
          </div>
          <div className="xp-source-area">
            <div className="xp-source-title">XP SOURCES</div>
            <div className="xp-source-card">
              <div className="xp-source-icon">ğŸ</div>
              <div><span>TAHMÄ°NLER</span><strong>+{predictionXp} XP</strong></div>
            </div>
            <div className="xp-source-card">
              <div className="xp-source-icon">ğŸ†</div>
              <div><span>ROZETLER</span><strong>+{achievementXp} XP</strong></div>
            </div>
          </div>
        </section>
        <section className="profile-content-grid">
          <div className="profile-column">
            <section className="profile-stats-layout">
              <div className="profile-stats-primary">
                <StatCard label="LEVEL" value={`${currentLevel}`} description={`${xpRemaining} XP sonraki seviyeye`} accent />
                <StatCard label="TOTAL XP" value={`${totalXp}`} description="Toplam profil deneyimi" accent />
              </div>
              <div className="profile-stats-secondary">
                <StatCard label="CHAMPIONSHIP POINTS" value={`${totalPoints}`} description={`${predictionXp} XP katkÄ±sÄ±`} />
                <StatCard label="ACHIEVEMENTS" value={`${unlockedAchievementCount}/${totalAchievementCount}`} description={`${achievementXp} XP kazanÄ±ldÄ±`} />
              </div>
            </section>
            <section className="glass-panel showcase-panel">
              <PanelHeader kicker="PROFILE SHOWCASE" title="SÃ¼rÃ¼cÃ¼ Vitrini" />
              <div className="showcase-grid">
                <ShowcaseItem icon="âš¡" label="Level" title={`LEVEL ${currentLevel}`} text={`${xpRemaining} XP daha kazanarak Level ${nextLevel}'e ulaÅŸ.`} />
                <ShowcaseItem icon="ğŸ" label="Prediction XP" title={`+${predictionXp} XP`} text="Tahmin puanlarÄ±ndan kazanÄ±lan deneyim." />
                <ShowcaseItem icon="ğŸ†" label="Achievement XP" title={`+${achievementXp} XP`} text="Rozet ve baÅŸarÄ±mlardan kazanÄ±lan deneyim." />
              </div>
            </section>
            <section className="glass-panel">
              <div className="panel-header-row">
                <PanelHeader kicker="PADDOCK ACTIVITY" title="Paddock PaylaÅŸÄ±mlarÄ±" />
                <Link href="/paddock" className="panel-link">PADDOCK'A GÄ°T â†’</Link>
              </div>
              {paddockPosts.length === 0 ? <div className="empty-history">HenÃ¼z Paddock paylaÅŸÄ±mÄ± yok.</div> :
                <div className="paddock-profile-grid">
                  {paddockPosts.map((post) => {
                    const media = mediaByPost.get(post.id) ?? [];
                    const firstMedia = media[0];
                    return <Link href={`/paddock#post-${post.id}`} className="paddock-profile-post" key={post.id}>
                      {firstMedia && <div className="paddock-profile-media">
                        {firstMedia.media_type === "image" ? <img src={firstMedia.media_url} alt="" /> :
                          <video src={firstMedia.media_url} muted preload="metadata" />}
                        {media.length > 1 && <span className="media-count">+{media.length - 1}</span>}
                      </div>}
                      <div className="paddock-profile-copy">
                        <div className="paddock-post-meta"><span>{formatPaddockDate(post.created_at)}</span>{post.is_pinned && <strong>PINNED</strong>}</div>
                        <p>{post.content || "Medya paylaÅŸÄ±mÄ±"}</p>
                        <div className="paddock-open">GÃ–NDERÄ°YÄ° GÃ–R â†’</div>
                      </div>
                    </Link>;
                  })}
                </div>
              }
            </section>
            <section className="glass-panel">
              <PanelHeader kicker="PREDICTION HISTORY" title="Tahmin GeÃ§miÅŸi" />
              <div className="prediction-xp-note">
                <div>âš¡</div>
                <p>
                  SonuÃ§landÄ±rÄ±lmÄ±ÅŸ her <strong>1 tahmin puanÄ± = 1 XP</strong>.
                  Her kartÄ± aÃ§arak hangi seÃ§imlerden puan aldÄ±ÄŸÄ±nÄ± gÃ¶rebilirsin.
                </p>
              </div>
              {recentPredictions.length === 0 ? (
                <div className="empty-history">HenÃ¼z kayÄ±tlÄ± tahminin yok.</div>
              ) : (
                <div className="prediction-list">
                  {recentPredictions.map((prediction) => {
                    const breakdown = readScoreBreakdown(prediction.score_breakdown);
                    const isScored = breakdown !== null;
                    const score = scoreNumber(prediction.points);
                    const picks = [
                      { position: "P1", number: prediction.p1_driver_number },
                      { position: "P2", number: prediction.p2_driver_number },
                      { position: "P3", number: prediction.p3_driver_number },
                    ];
                    const podiumHits = picks.filter((pick) =>
                      scoreNumber(breakdown?.podium?.[pick.position]) > 0
                    ).length;
                    const bulletin = detailRows(breakdown?.bulletin);
                    const specials = detailRows(breakdown?.special);
                    const bulletinAvailable = bulletin.filter(([, answer]) => answer.available !== false);
                    const bulletinCorrect = bulletinAvailable.filter(([, answer]) => answer.correct === true).length;
                    const specialAvailable = specials.filter(([, answer]) => answer.available !== false);
                    const specialCorrect = specialAvailable.filter(([, answer]) => answer.correct === true).length;
                    return (
                      <article className="prediction-history-card" key={prediction.id}>
                        <div className="prediction-row">
                          <div className="prediction-info">
                            <strong>{prediction.race_name}</strong>
                            <span>
                              {prediction.season} Â· ROUND {prediction.round} Â· {prediction.prediction_type === "sprint" ? "SPRINT" : "RACE"}
                            </span>
                            <small>
                              P1 #{prediction.p1_driver_number} Â· P2 #{prediction.p2_driver_number} Â· P3 #{prediction.p3_driver_number}
                            </small>
                            <div className={`prediction-status ${isScored ? "done" : "pending"}`}>
                              {isScored ? "âœ“ SONUÃ‡LANDI" : "â—· SONUÃ‡ BEKLENÄ°YOR"}
                            </div>
                          </div>
                          <div className="prediction-result-area">
                            {isScored ? (
                              <>
                                <div className={`prediction-score ${score > 0 ? "positive" : ""}`}>
                                  <strong>{score}</strong><span>PTS</span>
                                </div>
                                <div className="prediction-xp-earned">+{score} XP</div>
                              </>
                            ) : (
                              <div className="prediction-awaiting">â€”<span>BEKLENÄ°YOR</span></div>
                            )}
                          </div>
                        </div>
                        {isScored && breakdown && (
                          <details className="prediction-breakdown">
                            <summary>
                              <span>TAHMÄ°N SONUÃ‡LARINI GÃ–R</span>
                              <span className="prediction-summary-meta">
                                Podyumdan puan: {podiumHits}/3
                                {bulletinAvailable.length > 0 ? ` Â· BÃ¼lten: ${bulletinCorrect}/${bulletinAvailable.length}` : ""}
                                {specialAvailable.length > 0 ? ` Â· Ã–zel: ${specialCorrect}/${specialAvailable.length}` : ""}
                              </span>
                              <span className="prediction-toggle-icon">âŒ„</span>
                            </summary>
                            <div className="prediction-breakdown-content">
                              <div className="prediction-detail-heading">
                                <strong>ğŸ Podyum tahminleri</strong>
                                <span>{scoreNumber(prediction.podium_points)} P</span>
                              </div>
                              <div className="prediction-podium-grid">
                                {picks.map((pick) => {
                                  const earned = scoreNumber(breakdown.podium?.[pick.position]);
                                  return (
                                    <div className={`prediction-podium-item ${earned > 0 ? "earned" : "missed"}`} key={pick.position}>
                                      <span>{pick.position}</span>
                                      <strong>#{pick.number}</strong>
                                      <small>{earned > 0 ? `+${earned} puan` : "0 puan"}</small>
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="prediction-detail-footnote">
                                Podyum puanÄ±, pilotun doÄŸru sÄ±rada veya farklÄ± bir podyum sÄ±rasÄ±nda tahmin edilmesine gÃ¶re deÄŸiÅŸebilir.
                              </p>
                              {bulletin.length > 0 && (
                                <>
                                  <div className="prediction-detail-heading">
                                    <strong>ğŸ“‹ YarÄ±ÅŸ bÃ¼lteni</strong>
                                    <span>{scoreNumber(prediction.bulletin_points)} P Â· {bulletinCorrect}/{bulletinAvailable.length} doÄŸru</span>
                                  </div>
                                  <div className="prediction-answers">
                                    {bulletin.map(([key, answer]) => (
                                      <div className="prediction-answer" key={key}>
                                        <span className={answer.available === false ? "unavailable" : answer.correct ? "correct" : "incorrect"}>
                                          {answer.available === false ? "â€”" : answer.correct ? "âœ“" : "Ã—"}
                                        </span>
                                        <div>
                                          <strong>{BULLETIN_NAMES[key] ?? key}</strong>
                                          <small>Sen: {formatAnswer(answer.predicted)} Â· SonuÃ§: {formatAnswer(answer.actual)}</small>
                                        </div>
                                        <b>+{scoreNumber(answer.points)} P</b>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                              {specials.length > 0 && (
                                <>
                                  <div className="prediction-detail-heading">
                                    <strong>â­ Ã–zel tahminler</strong>
                                    <span>{scoreNumber(prediction.special_points)} P Â· {specialCorrect}/{specialAvailable.length} doÄŸru</span>
                                  </div>
                                  <div className="prediction-answers">
                                    {specials.map(([key, answer]) => (
                                      <div className="prediction-answer" key={key}>
                                        <span className={answer.available === false ? "unavailable" : answer.correct ? "correct" : "incorrect"}>
                                          {answer.available === false ? "â€”" : answer.correct ? "âœ“" : "Ã—"}
                                        </span>
                                        <div>
                                          <strong>{SPECIAL_NAMES[key] ?? key}</strong>
                                          <small>Sen: {formatAnswer(answer.predicted)} Â· SonuÃ§: {formatAnswer(answer.actual)}</small>
                                        </div>
                                        <b>+{scoreNumber(answer.points)} P</b>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </details>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
          <aside className="profile-sidebar">
            <section className="glass-panel">
              <PanelHeader kicker="GRID PICKS" title="Favoriler" />
              <div className="favorites-grid">
                <div className="favorite-pick" style={{ ["--pick-accent" as string]: teamBrand?.color || profileAccent.primary }}>
                  <div className="favorite-pick-glow" />
                  <span>FAVORÄ° TAKIM</span>
                  <div className="favorite-pick-main">
                    {teamBrand ? <div className="favorite-logo"><img src={teamBrand.logoUrl} alt={teamBrand.name} /></div> : <div className="favorite-monogram">F1</div>}
                    <div className="favorite-pick-copy"><small>TEAM</small><strong>{teamBrand ? teamBrand.name : "SeÃ§ilmedi"}</strong></div>
                  </div>
                  <div className="favorite-line" />
                </div>
                <div className="favorite-pick" style={{ ["--pick-accent" as string]: favoriteDriverTeamColor || profileAccent.primary }}>
                  <div className="favorite-pick-glow" />
                  <span>FAVORÄ° PÄ°LOT</span>
                  <div className="favorite-pick-main">
                    <div className="driver-visual">
                      {favoriteDriverImage ? <img src={favoriteDriverImage} alt={profile?.favorite_driver || "Favori pilot"} /> : <div className="driver-monogram">{driverInitials(profile?.favorite_driver)}</div>}
                    </div>
                    <div className="favorite-pick-copy"><small>DRIVER</small><strong>{profile?.favorite_driver || "SeÃ§ilmedi"}</strong>{favoriteDriverData?.team_name && <em>{favoriteDriverData.team_name}</em>}</div>
                  </div>
                  <div className="favorite-line" />
                </div>
              </div>
            </section>
            <ProfileAchievements achievements={achievements} userAchievements={userAchievements}
              stats={{ paddockPostCount, predictionCount, totalPoints, bestScore }} />
            <section className="glass-panel">
              <PanelHeader kicker="DRIVER INFO" title="Profil" />
              <InfoRow label="GÃ¶rÃ¼nen Ad" value={displayName} />
              <InfoRow label="KullanÄ±cÄ± AdÄ±" value={profile?.username ? `@${profile.username}` : "Belirlenmedi"} />
              <InfoRow label="Seviye" value={`LEVEL ${currentLevel}`} />
              <InfoRow label="Toplam XP" value={`${totalXp} XP`} />
              <InfoRow label="Sonraki Level" value={`${xpRemaining} XP`} />
              <InfoRow label="BaÅŸarÄ±mlar" value={`${unlockedAchievementCount}/${totalAchievementCount}`} />
              <Link href="/profile/edit" className="side-button">Profili DÃ¼zenle</Link>
              <Link href="/predict" className="side-button accent">Tahmin Merkezine Git â†’</Link>
              <ProfileActions />
            </section>
            <section className="glass-panel wallpaper-info">
              <span className="profile-kicker">PROFILE BACKGROUND</span>
              <div className="wallpaper-thumb" style={{ backgroundImage: background }} />
              <strong>{wallpaper.name}</strong>
              <p>{wallpaper.description}</p>
              <Link href="/profile/wallpapers">ARKA PLANI DEÄÄ°ÅTÄ°R â†’</Link>
            </section>
          </aside>
        </section>
        {profile?.is_admin && (
          <section className="glass-panel" style={{marginTop:20,padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            <div><span className="profile-kicker">F1 MEDÄ°POL Â· YÃ–NETÄ°M</span>
              <div style={{color:"#f5f7fa",fontWeight:900,marginTop:6}}>YÃ¶netim Paneli</div>
              <div style={{color:"#aeb8c4",fontSize:12,marginTop:5}}>Etkinlikler, bildirimler ve yÃ¶netim iÅŸlemleri.</div>
            </div>
            <Link href="/admin" className="side-button accent" style={{minWidth:190,textAlign:"center"}}>ADMÄ°N PANELÄ°NE GÄ°T â†’</Link>
          </section>
        )}
      </div>
    </main>
  </>;
}
function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="summary-row"><span>{label}</span><strong>{value}</strong></div>;
}
function StatCard({ label, value, description, accent = false }: {
  label: string; value: string; description: string; accent?: boolean;
}) {
  return <div className="stat-card">
    <span>{label}</span><strong className={accent ? "stat-accent" : ""}>{value}</strong><small>{description}</small>
  </div>;
}
function PanelHeader({ kicker, title }: { kicker: string; title: string }) {
  return <div className="panel-header"><span>{kicker}</span><h2>{title}</h2></div>;
}
function ShowcaseItem({ icon, label, title, text }: { icon: string; label: string; title: string; text: string }) {
  return <div className="showcase-item"><div className="showcase-icon">{icon}</div><span>{label}</span><strong>{title}</strong><p>{text}</p></div>;
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="info-row"><span>{label}</span><strong>{value}</strong></div>;
}
const styles = `
.profile-login { min-height:calc(100vh - 70px); padding:90px 20px; display:grid; place-items:start center; background:#080b10; color:#fff; }
.login-card { width:min(620px,100%); padding:48px; border:1px solid rgba(255,255,255,.1); border-radius:20px; background:#151a22; text-align:center; }
.login-card h1 { margin:10px 0; font-size:40px; }
.login-card p { color:#8e99a7; line-height:1.65; }
.profile-red-button { min-height:44px; margin-top:15px; padding:0 19px; display:inline-flex; align-items:center; border-radius:8px; background:#e10600; color:#fff; font-size:12px; font-weight:900; }
.steam-profile { position:relative; min-height:calc(100vh - 60px); color:#f5f7fa; background-size:cover,cover,cover; background-position:center; background-attachment:fixed; }
.steam-profile h1,.steam-profile h2,.steam-profile h3,.steam-profile strong { color:#f5f7fa; }
:root[data-site-theme="light"] .steam-profile,:root[data-site-theme="light"] .steam-profile h1,:root[data-site-theme="light"] .steam-profile h2,:root[data-site-theme="light"] .steam-profile h3,:root[data-site-theme="light"] .steam-profile strong { color:#f5f7fa !important; }
.profile-wallpaper-layer { position:absolute; inset:0; z-index:0; pointer-events:none; background-size:cover; background-position:center top; background-repeat:no-repeat; }
.profile-page-shade { position:absolute; z-index:1; inset:0; pointer-events:none; background:linear-gradient( 90deg,rgba(4,7,11,.36),rgba(4,7,11,.05) 50%,rgba(4,7,11,.36) ); }
.profile-container { position:relative; z-index:2; width:min( 1540px,calc(100% - 48px) ); margin:auto; padding:36px 0 100px; }
.profile-top-strip { min-height:50px; margin-bottom:10px; padding:0 18px; display:flex; align-items:center; justify-content:space-between; border:1px solid rgba(255,255,255,.10); border-radius:10px; background:rgba(10,14,20,.77); backdrop-filter:blur(18px); }
.profile-top-strip > div { display:flex; align-items:center; gap:10px; }
.profile-top-strip span { color:var(--profile-accent); font-size:9px; font-weight:1000; }
.profile-top-strip strong { color:#87929e !important; font-size:9px; }
.edit-profile-button { color:#e0e5eb !important; font-size:9px; font-weight:900; }
.profile-shell { position:relative; overflow:hidden; border:1px solid color-mix( in srgb,var(--profile-accent),transparent 82% ); border-radius:18px; background:linear-gradient( 135deg,rgba(13,18,25,.91),rgba(8,12,18,.82) ); backdrop-filter:blur(18px); box-shadow:0 26px 80px rgba(0,0,0,.24),0 0 45px var(--profile-accent-glow); }
.hero-accent-top { position:absolute; z-index:4; left:0; right:0; top:0; height:4px; background:linear-gradient( 90deg,var(--profile-accent),var(--profile-accent-2),transparent 78% ); }
.wallpaper-glow { position:absolute; width:620px; height:620px; right:-220px; top:-330px; border-radius:50%; opacity:.22; filter:blur(105px); background:var(--profile-accent); }
.profile-header { position:relative; z-index:2; min-height:390px; padding:48px 52px; display:grid; grid-template-columns:245px minmax(0,1fr) 325px; gap:44px; align-items:center; }
.avatar-column { display:flex; justify-content:center; }
.profile-avatar-frame { width:220px; height:220px; overflow:hidden; padding:6px; border:3px solid var(--profile-accent); border-radius:11px; background:#fff; box-shadow:0 22px 60px rgba(0,0,0,.34),0 0 38px var(--profile-accent-glow); }
.profile-avatar-frame img,.avatar-fallback { width:100%; height:100%; border-radius:6px; }
.profile-avatar-frame img { display:block; object-fit:contain; object-position:center; background:#fff; }
.avatar-fallback { display:grid; place-items:center; color:#fff; background:linear-gradient( 135deg,var(--profile-accent-2),var(--profile-accent) ); font-size:68px; font-weight:1000; }
.identity-line { display:flex; align-items:center; gap:10px; }
.profile-kicker,.panel-header span { color:var(--profile-accent); font-size:9px; font-weight:1000; letter-spacing:.12em; }
.member-badge { padding:5px 9px; border:1px solid color-mix( in srgb,var(--profile-accent),transparent 62% ); border-radius:999px; color:var(--profile-accent); background:var(--profile-accent-soft); font-size:7px; font-weight:1000; }
.profile-identity h1 { margin:12px 0 8px; font-size:clamp( 48px,4.7vw,68px ); line-height:.95; letter-spacing:-.055em; }
.identity-meta { display:flex; flex-wrap:wrap; gap:11px; color:#9ba6b1; font-size:11px; font-weight:800; }
.identity-meta span + span::before { content:"â€¢"; margin-right:11px; color:#555f69; }
.identity-level { color:var(--profile-accent); }
.profile-bio { max-width:760px; margin:23px 0 0; color:#bac3cd !important; font-size:14px; line-height:1.7; }
.identity-accent { margin-top:24px; display:flex; align-items:center; gap:10px; }
.identity-accent > span { width:75px; height:3px; border-radius:999px; background:linear-gradient( 90deg,var(--profile-accent),var(--profile-accent-2) ); }
.identity-accent small { color:#8a96a2; font-size:7px; font-weight:1000; letter-spacing:.12em; }
.profile-summary { padding:22px; border:1px solid rgba(255,255,255,.085); border-radius:12px; background:rgba(5,8,12,.46); }
.summary-title { margin-bottom:10px; color:var(--profile-accent); font-size:8px; font-weight:1000; }
.summary-row { min-height:45px; display:flex; align-items:center; justify-content:space-between; gap:15px; border-top:1px solid rgba(255,255,255,.07); }
.summary-row span { color:#8c97a2; font-size:9px; }
.summary-row strong { font-size:10px; }
.level-panel { margin-top:10px; min-height:225px; padding:28px; display:grid; grid-template-columns:230px minmax(0,1fr) 260px; gap:30px; align-items:center; border:1px solid color-mix( in srgb,var(--profile-accent),transparent 76% ); border-radius:16px; background:linear-gradient( 135deg,rgba(8,12,18,.93),rgba(14,18,25,.87) ); backdrop-filter:blur(18px); }
.level-badge-area { display:flex; align-items:center; gap:18px; }
.level-ring { width:112px; height:112px; flex:0 0 112px; display:grid; place-items:center; align-content:center; border:3px solid var(--profile-accent); border-radius:50%; background:radial-gradient( circle,var(--profile-accent-soft),rgba(6,9,13,.9) ); box-shadow:0 0 30px var(--profile-accent-glow),inset 0 0 25px var(--profile-accent-soft); }
.level-ring span { color:#8995a1; font-size:7px; font-weight:1000; letter-spacing:.15em; }
.level-ring strong { margin-top:2px; color:var(--profile-accent) !important; font-size:40px; line-height:1; }
.level-total-xp strong,.level-total-xp span { display:block; }
.level-total-xp strong { font-size:27px; }
.level-total-xp span { margin-top:4px; color:#76828e; font-size:7px; font-weight:1000; }
.level-progress-title { display:flex; justify-content:space-between; align-items:flex-end; gap:15px; }
.level-progress-title span { display:block; color:var(--profile-accent); font-size:8px; font-weight:1000; }
.level-progress-title strong { display:block; margin-top:5px; font-size:20px; }
.next-level-label { color:#7d8995; font-size:9px; font-weight:1000; }
.level-big-track { height:14px; margin-top:20px; overflow:hidden; border:1px solid rgba(255,255,255,.06); border-radius:999px; background:rgba(255,255,255,.05); }
.level-big-fill { height:100%; border-radius:inherit; background:linear-gradient( 90deg,var(--profile-accent-2),var(--profile-accent) ); box-shadow:0 0 20px var(--profile-accent-glow); }
.level-progress-info { margin-top:12px; display:flex; justify-content:space-between; gap:15px; }
.level-progress-info strong,.level-progress-info span { display:block; }
.level-progress-info strong { font-size:10px; }
.level-progress-info span { margin-top:3px; color:#7c8792; font-size:7px; }
.level-remaining { text-align:right; }
.level-remaining strong { color:var(--profile-accent) !important; }
.level-threshold-info { margin-top:14px; padding-top:11px; border-top:1px solid rgba(255,255,255,.06); color:#818c97; font-size:9px; }
.level-threshold-info strong { color:#e6ebf0 !important; }
.xp-source-area { display:grid; gap:8px; }
.xp-source-title { color:#75818d; font-size:7px; font-weight:1000; letter-spacing:.13em; }
.xp-source-card { min-height:67px; padding:10px 13px; display:flex; align-items:center; gap:11px; border:1px solid rgba(255,255,255,.07); border-radius:10px; background:rgba(255,255,255,.025); }
.xp-source-icon { width:39px; height:39px; display:grid; place-items:center; border-radius:8px; background:var(--profile-accent-soft); }
.xp-source-card span,.xp-source-card strong { display:block; }
.xp-source-card span { color:#79848f; font-size:7px; font-weight:1000; }
.xp-source-card strong { margin-top:4px; color:var(--profile-accent) !important; font-size:15px; }
.profile-stats-layout { display:grid; grid-template-columns:minmax(0,1.9fr) minmax(190px,.85fr); gap:10px; align-items:stretch; }
.profile-stats-primary { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.profile-stats-secondary { display:grid; grid-template-columns:minmax(0,1fr); grid-template-rows:repeat(2,minmax(0,1fr)); gap:10px; }
.profile-stats-secondary .stat-card { min-height:0; padding:12px 18px; }
.profile-stats-secondary .stat-card > strong { margin-top:3px; font-size:24px; }
.profile-stats-secondary .stat-card > small { margin-top:3px; font-size:8px; }
.stat-card { min-height:134px; padding:23px; display:flex; flex-direction:column; justify-content:center; border:1px solid rgba(255,255,255,.095); border-radius:12px; background:rgba(9,13,19,.80); backdrop-filter:blur(16px); }
.stat-card > span { color:#8b96a1; font-size:8px; font-weight:1000; }
.stat-card > strong { margin-top:10px; font-size:35px; }
.stat-card > strong.stat-accent { color:var(--profile-accent) !important; }
.stat-card > small { margin-top:6px; color:#8c97a2; font-size:9px; }
.profile-content-grid { margin-top:10px; display:grid; grid-template-columns:minmax(0,1.55fr) minmax(350px,.45fr); gap:10px; align-items:start; }
.profile-column,.profile-sidebar { display:grid; gap:10px; }
.glass-panel { padding:30px; border:1px solid rgba(255,255,255,.095); border-radius:14px; background:rgba(10,14,20,.83); backdrop-filter:blur(18px); }
.panel-header-row { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; }
.panel-header h2 { margin:7px 0 22px; font-size:29px; }
.panel-link { padding:10px 12px; border:1px solid rgba(255,255,255,.08); border-radius:7px; color:#afb8c2 !important; font-size:8px; font-weight:900; }
.showcase-panel { padding:20px 24px; }
.showcase-panel .panel-header h2 { margin-bottom:13px; font-size:26px; }
.showcase-grid { display:grid; grid-template-columns:repeat( 3,minmax(0,1fr) ); gap:10px; }
.showcase-item { min-height:136px; padding:17px; border:1px solid rgba(255,255,255,.07); border-radius:10px; background:rgba(255,255,255,.025); }
.showcase-icon { width:35px; height:35px; display:grid; place-items:center; border-radius:8px; background:var(--profile-accent-soft); }
.showcase-item > span { display:block; margin-top:10px; color:#87929d; font-size:8px; font-weight:1000; }
.showcase-item > strong { display:block; margin-top:4px; font-size:18px; }
.showcase-item p { margin:6px 0 0; color:#939eaa !important; font-size:10px; line-height:1.55; }
.prediction-xp-note { margin:-6px 0 18px; padding:12px 14px; display:flex; align-items:center; gap:11px; border:1px solid rgba(240,199,94,.12); border-radius:9px; background:rgba(240,199,94,.045); }
.prediction-xp-note > div { width:33px; height:33px; flex:0 0 33px; display:grid; place-items:center; border-radius:8px; background:rgba(240,199,94,.09); }
.prediction-xp-note p { margin:0; color:#969fa8 !important; font-size:9px; line-height:1.55; }
.prediction-xp-note strong { color:#f0c75e !important; }
.favorites-grid { display:grid; gap:10px; }
.favorite-pick { position:relative; min-height:160px; overflow:hidden; padding:18px; border:1px solid rgba(255,255,255,.08); border-radius:11px; background:rgba(255,255,255,.025); isolation:isolate; }
.favorite-pick-glow { position:absolute; z-index:-1; width:175px; height:175px; right:-55px; top:-70px; border-radius:50%; background:var(--pick-accent); opacity:.20; filter:blur(42px); }
.favorite-pick > span { color:#858f9a; font-size:7px; font-weight:1000; }
.favorite-pick-main { margin-top:17px; display:flex; align-items:center; gap:16px; }
.favorite-pick-copy small { display:block; color:#747f89; font-size:7px; }
.favorite-pick-copy strong { display:block; margin-top:4px; font-size:16px; }
.favorite-pick-copy em { display:block; margin-top:6px; color:var(--pick-accent); font-size:8px; font-style:normal; }
.favorite-logo,.favorite-monogram { width:72px; height:72px; flex:0 0 72px; display:grid; place-items:center; border-radius:12px; }
.favorite-logo { background:#fff; }
.favorite-logo img { width:52px; height:52px; object-fit:contain; }
.favorite-monogram { background:rgba(255,255,255,.05); color:#fff; font-weight:1000; }
.driver-visual { position:relative; width:88px; height:100px; flex:0 0 88px; overflow:hidden; border:1px solid color-mix( in srgb,var(--pick-accent),transparent 48% ); border-radius:13px; background:rgba(255,255,255,.025); }
.driver-visual > img { width:100%; height:100%; display:block; object-fit:contain; object-position:center bottom; transform:scale(1.08); transform-origin:center bottom; }
.driver-monogram { width:100%; height:100%; display:grid; place-items:center; color:var(--pick-accent); font-size:20px; font-weight:1000; }
.favorite-line { position:absolute; left:18px; right:18px; bottom:14px; height:3px; border-radius:999px; background:linear-gradient( 90deg,var(--pick-accent),transparent ); }
.paddock-profile-grid { display:grid; grid-template-columns:repeat( 2,minmax(0,1fr) ); gap:12px; }
.paddock-profile-post { min-height:195px; overflow:hidden; display:grid; grid-template-columns:minmax(145px,.48fr) minmax(0,.52fr); border:1px solid rgba(255,255,255,.07); border-radius:11px; color:inherit; text-decoration:none; background:rgba(255,255,255,.024); transition:.18s ease; }
.paddock-profile-post:hover { transform:translateY(-2px); border-color:color-mix( in srgb,var(--profile-accent),transparent 55% ); }
.paddock-profile-media { position:relative; min-height:195px; overflow:hidden; background:#070a0e; }
.paddock-profile-media img,.paddock-profile-media video { width:100%; height:100%; object-fit:cover; }
.media-count { position:absolute; right:8px; top:8px; min-width:29px; height:29px; display:grid; place-items:center; border-radius:999px; background:rgba(5,8,12,.82); color:#fff; font-size:9px; font-weight:1000; }
.paddock-profile-copy { padding:20px; display:flex; flex-direction:column; }
.paddock-post-meta { display:flex; justify-content:space-between; gap:10px; color:#808b96; font-size:8px; }
.paddock-post-meta strong { color:var(--profile-accent) !important; }
.paddock-profile-copy p { margin:14px 0; color:#c4ccd4 !important; font-size:12px; line-height:1.6; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; }
.paddock-open { margin-top:auto; color:var(--profile-accent); font-size:8px; font-weight:1000; }
.prediction-list { display:grid; gap:8px; }
.prediction-row { min-height:95px; padding:17px 20px; display:flex; align-items:center; justify-content:space-between; gap:20px; border:1px solid rgba(255,255,255,.07); border-radius:9px; background:rgba(255,255,255,.022); }
.prediction-info strong { display:block; font-size:14px; }
.prediction-info span,.prediction-info small { display:block; margin-top:5px; color:#87929d; font-size:9px; }
.prediction-result-area { min-width:85px; display:grid; justify-items:center; gap:5px; }
.prediction-score { text-align:center; }
.prediction-score strong { display:block; font-size:30px; }
.prediction-score span { color:#7b8691; font-size:7px; }
.prediction-score.positive strong { color:#55df94 !important; }
.prediction-xp-earned { padding:4px 7px; border:1px solid rgba(240,199,94,.15); border-radius:999px; color:#f0c75e; background:rgba(240,199,94,.06); font-size:7px; font-weight:1000; }
.empty-history { min-height:170px; display:grid; place-items:center; color:#87929d; font-size:11px; }
.info-row { min-height:52px; display:flex; align-items:center; justify-content:space-between; gap:14px; border-top:1px solid rgba(255,255,255,.065); }
.info-row span { color:#87929d; font-size:9px; }
.info-row strong { font-size:10px; }
.side-button { min-height:45px; margin-top:10px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,.10); border-radius:8px; background:rgba(255,255,255,.04); color:#fff !important; font-size:9px; font-weight:900; }
.side-button.accent { border:0; background:linear-gradient( 135deg,var(--profile-accent-2),var(--profile-accent) ); box-shadow:0 8px 22px var(--profile-accent-glow); }
.wallpaper-info > strong { display:block; margin-top:14px; font-size:16px; }
.wallpaper-info > p { margin:7px 0 0; color:#909ba6 !important; font-size:10px; line-height:1.55; }
.wallpaper-info > a { display:block; margin-top:15px; color:var(--profile-accent) !important; font-size:8px; font-weight:1000; }
.wallpaper-thumb { height:145px; margin-top:15px; border:1px solid rgba(255,255,255,.09); border-radius:9px; background-size:cover,cover,cover; background-position:center; }
@media( max-width:1250px ) { .level-panel { grid-template-columns:190px 1fr; }
.xp-source-area { grid-column:1 / -1; grid-template-columns:100px 1fr 1fr; align-items:center; }
}
@media( max-width:1150px ) { .profile-header { grid-template-columns:220px 1fr; }
.profile-summary { grid-column:1 / -1; }
.profile-content-grid { grid-template-columns:1fr; }
}
@media( max-width:850px ) { .profile-stats-layout { grid-template-columns:1fr; }
.profile-stats-primary { grid-template-columns:repeat(2,minmax(0,1fr)); }
.showcase-grid { grid-template-columns:1fr; }
.paddock-profile-grid { grid-template-columns:1fr; }
.level-panel { grid-template-columns:1fr; }
.xp-source-area { grid-column:auto; grid-template-columns:1fr 1fr; }
.xp-source-title { grid-column:1 / -1; }
}
@media( max-width:650px ) { .profile-container { width:calc(100% - 18px); padding-top:15px; }
.profile-header { padding:27px 23px; grid-template-columns:1fr; text-align:center; }
.profile-avatar-frame { width:175px; height:175px; }
.identity-line,.identity-meta,.identity-accent { justify-content:center; }
.profile-bio { margin-left:auto; margin-right:auto; }
.profile-stats-primary { grid-template-columns:1fr; }
.profile-stats-secondary { grid-template-rows:auto; }
.level-panel { padding:22px; }
.level-badge-area { justify-content:center; }
.level-progress-info { flex-direction:column; }
.level-remaining { text-align:left; }
.xp-source-area { grid-template-columns:1fr; }
.xp-source-title { grid-column:auto; }
.glass-panel { padding:22px; }
.panel-header-row { flex-direction:column; }
.paddock-profile-post { grid-template-columns:1fr; }
.paddock-profile-media { height:210px; }
.profile-top-strip strong { display:none; }
}
/* TAHMÄ°N GEÃ‡MÄ°ÅÄ° â€” AÃ‡ILABÄ°LÄ°R SONUÃ‡ KARTLARI */
.prediction-history-card { overflow:hidden; border:1px solid rgba(255,255,255,.09); border-radius:11px; background:rgba(255,255,255,.025); }
.prediction-history-card .prediction-row { border:0; border-radius:0; background:transparent; }
.prediction-status { display:inline-flex; align-items:center; margin-top:10px; padding:5px 9px; border-radius:999px; font-size:8px; font-weight:900; letter-spacing:.045em; }
.prediction-status.done { border:1px solid rgba(83,219,148,.18); color:#72e7a5; background:rgba(83,219,148,.07); }
.prediction-status.pending { border:1px solid rgba(239,194,97,.18); color:#f0c75e; background:rgba(239,194,97,.07); }
.prediction-awaiting { text-align:center; font-size:27px; font-weight:800; color:#aab4be; }
.prediction-awaiting span { display:block; font-size:8px; letter-spacing:.07em; color:#8d99a7; }
.prediction-breakdown { border-top:1px solid rgba(255,255,255,.07); }
.prediction-breakdown summary { padding:14px 18px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; cursor:pointer; list-style:none; color:#c9d2dc; font-size:9px; font-weight:950; letter-spacing:.035em; background:rgba(255,255,255,.015); }
.prediction-breakdown summary::-webkit-details-marker { display:none; }
.prediction-summary-meta { margin-left:auto; color:#92a0ad; font-size:9px; font-weight:700; letter-spacing:0; }
.prediction-toggle-icon { color:var(--profile-accent); font-size:20px; line-height:1; transition:transform .2s ease; }
.prediction-breakdown[open] .prediction-toggle-icon { transform:rotate(180deg); }
.prediction-breakdown-content { padding:4px 18px 20px; }
.prediction-detail-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:18px 0 12px; }
.prediction-detail-heading strong { font-size:12px; }
.prediction-detail-heading span { color:#6fe0a0; font-size:10px; font-weight:900; }
.prediction-podium-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:9px; }
.prediction-podium-item { padding:12px; display:grid; gap:6px; border:1px solid rgba(255,255,255,.08); border-radius:9px; background:rgba(255,255,255,.025); }
.prediction-podium-item > span { font-size:9px; font-weight:950; color:#98a6b3; }
.prediction-podium-item > strong { font-size:20px; }
.prediction-podium-item > small { font-size:10px; color:#a6b2be; }
.prediction-podium-item.earned { border-color:rgba(83,219,148,.24); background:rgba(83,219,148,.045); }
.prediction-podium-item.earned > small { color:#7be4a8; }
.prediction-detail-footnote { margin:10px 0 0; color:#84919e !important; font-size:9px; line-height:1.55; }
.prediction-answers { display:grid; gap:6px; }
.prediction-answer { padding:10px 12px; display:flex; align-items:center; gap:12px; border:1px solid rgba(255,255,255,.055); border-radius:8px; background:rgba(255,255,255,.018); }
.prediction-answer > span { width:23px; height:23px; flex:0 0 23px; display:grid; place-items:center; border-radius:6px; font-size:13px; font-weight:900; }
.prediction-answer > span.correct { color:#8cedb4; background:rgba(83,219,148,.12); }
.prediction-answer > span.incorrect { color:#ff9b98; background:rgba(225,6,0,.13); }
.prediction-answer > span.unavailable { color:#aab4be; background:rgba(255,255,255,.06); }
.prediction-answer > div { min-width:0; flex:1; }
.prediction-answer > div strong { display:block; font-size:10px; }
.prediction-answer > div small { display:block; margin-top:5px; color:#929eaa; font-size:9px; line-height:1.5; overflow-wrap:anywhere; }
.prediction-answer > b { white-space:nowrap; font-size:10px; color:#79e3aa; }
@media(max-width:650px) { .prediction-history-card .prediction-row { gap:10px; padding:15px 12px; } .prediction-summary-meta { width:100%; margin-left:0; order:3; } .prediction-toggle-icon { margin-left:auto; } .prediction-breakdown-content { padding:4px 12px 16px; } .prediction-podium-item { padding:9px; } .prediction-podium-item > strong { font-size:16px; } }
`;

