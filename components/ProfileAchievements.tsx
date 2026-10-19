
import {
  ACHIEVEMENT_CONDITION_LABELS,
} from "@/lib/achievement-conditions";

type Achievement = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  xp_reward: number;
  is_automatic: boolean;
  condition_type: string;
  condition_value: number | null;
  is_published: boolean;
  show_when_locked?: boolean;
  sort_order: number;
};

type UserAchievement = {
  achievement_id: string;
  award_source: string;
  awarded_at: string;
  xp_awarded: number;
};

type Props = {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  stats: {
    paddockPostCount: number;
    predictionCount: number;
    totalPoints: number;
    bestScore: number;
  };
};

function rarityLabel(rarity: string) {
  const labels: Record<string, string> = {
    common: "COMMON",
    rare: "RARE",
    epic: "EPIC",
    legendary: "LEGENDARY",
  };

  return labels[rarity] ?? "COMMON";
}

function conditionLabel(
  type: string,
  value: number | null
) {
  const target = value ?? 1;

  switch (type) {
    case "paddock_post_count":
      return `${target} Paddock paylaşımı yap`;

    case "paddock_comment_count":
      return `${target} Paddock yorumu yap`;

    case "paddock_likes_given":
      return `${target} paylaşımı beğen`;

    case "paddock_likes_received":
      return `Paylaşımlarına ${target} beğeni al`;

    case "prediction_count":
      return `${target} tahmin yap`;

    case "race_prediction_count":
      return `${target} yarış tahmini yap`;

    case "sprint_prediction_count":
      return `${target} Sprint tahmini yap`;

    case "scored_prediction_count":
      return `${target} tahminden puan kazan`;

    case "prediction_points":
      return `Toplam ${target} tahmin puanına ulaş`;

    case "race_prediction_points":
      return `Yarış tahminlerinden ${target} puan kazan`;

    case "sprint_prediction_points":
      return `Sprint tahminlerinden ${target} puan kazan`;

    case "best_prediction_score":
      return `Tek tahminde ${target} puana ulaş`;

    case "race_winner_correct_count":
      return `${target} yarış galibini doğru tahmin et`;

    case "sprint_winner_correct_count":
      return `${target} Sprint galibini doğru tahmin et`;

    case "race_exact_podium_count":
      return `${target} yarış podyumunu tamamen doğru tahmin et`;

    case "sprint_exact_podium_count":
      return `${target} Sprint podyumunu tamamen doğru tahmin et`;

    case "profile_avatar_set":
      return "Profil fotoğrafı ekle";

    case "profile_bio_set":
      return "Profil biyografini doldur";

    default:
      return (
        ACHIEVEMENT_CONDITION_LABELS[type] ??
        "Yönetici tarafından verilen özel rozet"
      );
  }
}

function currentConditionValue(
  type: string,
  stats: Props["stats"]
): number | null {
  switch (type) {
    case "paddock_post_count":
      return stats.paddockPostCount;

    case "prediction_count":
      return stats.predictionCount;

    case "prediction_points":
      return stats.totalPoints;

    case "best_prediction_score":
      return stats.bestScore;

    default:
      return null;
  }
}

function compareByXp(a: Achievement, b: Achievement) {
  const xpDifference =
    Number(b.xp_reward ?? 0) -
    Number(a.xp_reward ?? 0);

  if (xpDifference !== 0) {
    return xpDifference;
  }

  const orderDifference =
    a.sort_order - b.sort_order;

  if (orderDifference !== 0) {
    return orderDifference;
  }

  return a.name.localeCompare(b.name, "tr");
}

function AchievementCard({
  achievement,
  award,
  stats,
}: {
  achievement: Achievement;
  award?: UserAchievement;
  stats: Props["stats"];
}) {
  const unlocked = Boolean(award);

  const currentValue = currentConditionValue(
    achievement.condition_type,
    stats
  );

  const target = achievement.condition_value;

  const showProgress =
    !unlocked &&
    achievement.is_automatic &&
    currentValue !== null &&
    target !== null &&
    target > 0;

  const percentage = showProgress
    ? Math.min(
        100,
        Math.max(0, (currentValue / target) * 100)
      )
    : 0;

  return (
    <details
      className={[
        "profile-ach-card",
        unlocked ? "is-unlocked" : "is-locked",
        `rarity-${achievement.rarity}`,
      ].join(" ")}
    >
      <summary className="profile-ach-card-summary">
        <div className="profile-ach-image">
          {achievement.image_url ? (
            <img
              src={achievement.image_url}
              alt=""
              loading="lazy"
            />
          ) : (
            <span className="profile-ach-placeholder">
              🏆
            </span>
          )}

          {!unlocked && (
            <span
              className="profile-ach-lock"
              aria-hidden="true"
            >
              🔒
            </span>
          )}
        </div>

        <div className="profile-ach-info">
          <span
            className={`profile-ach-rarity rarity-${achievement.rarity}`}
          >
            {rarityLabel(achievement.rarity)}
          </span>

          <strong title={achievement.name}>
            {achievement.name}
          </strong>

          <span className="profile-ach-status">
            {unlocked ? "KAZANILDI" : "KİLİTLİ"}
          </span>
        </div>

        <div className="profile-ach-reward">
          <strong>
            +{Number(achievement.xp_reward ?? 0)}
          </strong>
          <span>XP</span>
        </div>
      </summary>

      <div className="profile-ach-details">
        <p className="profile-ach-description">
          {achievement.description ||
            "Bu başarım için açıklama eklenmemiş."}
        </p>

        {unlocked ? (
          <div className="profile-ach-earned">
            <span>✓ Başarım açıldı</span>

            <strong>
              {Number(
                award?.xp_awarded ??
                  achievement.xp_reward ??
                  0
              )}{" "}
              XP kazanıldı
            </strong>
          </div>
        ) : (
          <>
            <div className="profile-ach-condition">
              <span>NASIL KAZANILIR?</span>

              <strong>
                {achievement.is_automatic
                  ? conditionLabel(
                      achievement.condition_type,
                      achievement.condition_value
                    )
                  : "Yönetici tarafından verilen özel rozet"}
              </strong>
            </div>

            {showProgress && (
              <div className="profile-ach-progress">
                <div className="profile-ach-progress-label">
                  <span>İlerleme</span>

                  <strong>
                    {Math.min(currentValue, target)} /{" "}
                    {target}
                  </strong>
                </div>

                <div className="profile-ach-progress-track">
                  <div
                    className="profile-ach-progress-fill"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}

export default function ProfileAchievements({
  achievements,
  userAchievements,
  stats,
}: Props) {
  const awardMap = new Map(
    userAchievements.map((award) => [
      award.achievement_id,
      award,
    ])
  );

  const unlocked = achievements
    .filter((achievement) =>
      awardMap.has(achievement.id)
    )
    .sort(compareByXp);

  const locked = achievements
    .filter(
      (achievement) =>
        !awardMap.has(achievement.id) && achievement.show_when_locked !== false
    )
    .sort(compareByXp);

  return (
    <section className="profile-achievements-sidebar">
      <style>{styles}</style>

      <div className="profile-ach-header">
        <div className="profile-ach-heading">
          <span>ACHIEVEMENT GARAGE</span>
          <h2>Rozetler &amp; Başarımlar</h2>
        </div>

        <div className="profile-ach-counter">
          <strong>{unlocked.length}</strong>
          <span>/{unlocked.length + locked.length}</span>
        </div>
      </div>

      <p className="profile-ach-subtitle">
        Kazandığın rozetler ve sıradaki hedeflerin.
      </p>

      {achievements.length === 0 ? (
        <div className="profile-ach-empty">
          Henüz yayınlanmış başarım bulunmuyor.
        </div>
      ) : (
        <div className="profile-ach-scroll">
          <div className="profile-ach-group">
            <div className="profile-ach-group-heading">
              <span className="profile-ach-group-dot unlocked" />
              <strong>KAZANILANLAR</strong>
              <small>{unlocked.length}</small>
            </div>

            {unlocked.length === 0 ? (
              <div className="profile-ach-group-empty">
                Henüz açılan bir başarım yok.
              </div>
            ) : (
              unlocked.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  award={awardMap.get(achievement.id)}
                  stats={stats}
                />
              ))
            )}
          </div>

          <div className="profile-ach-group locked-group">
            <div className="profile-ach-group-heading">
              <span className="profile-ach-group-dot locked" />
              <strong>KİLİTLİLER</strong>
              <small>{locked.length}</small>
            </div>

            {locked.length === 0 ? (
              <div className="profile-ach-group-empty">
                Bütün başarımlar açıldı!
              </div>
            ) : (
              locked.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  stats={stats}
                />
              ))
            )}
          </div>
        </div>
      )}

      <div className="profile-ach-footer">
        <span>En yüksek XP ödülü üstte</span>
        <span>Kaydır ↓</span>
      </div>
    </section>
  );
}

const styles = `
  .profile-achievements-sidebar {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    padding: 17px 14px 13px;
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 14px;
    background: #0a1117;
    color: #f4f7fb;
  }

  .profile-ach-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .profile-ach-heading {
    min-width: 0;
  }

  .profile-ach-heading > span {
    color: var(--profile-accent, #ff443c);
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .12em;
  }

  .profile-ach-heading h2 {
    margin: 7px 0 0 !important;
    color: #f5f7fa !important;
    font-size: 17px !important;
    font-weight: 800;
    line-height: 1.3 !important;
    letter-spacing: -.025em;
  }

  .profile-ach-counter {
    flex-shrink: 0;
    display: flex;
    align-items: baseline;
    padding: 8px 10px;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 9px;
    background: rgba(255,255,255,.035);
    white-space: nowrap;
  }

  .profile-ach-counter strong {
    color: var(--profile-accent, #ff443c);
    font-size: 18px;
    font-weight: 900;
  }

  .profile-ach-counter span {
    margin-left: 3px;
    color: #8895a3;
    font-size: 11px;
  }

  .profile-ach-subtitle {
    margin: 9px 0 13px !important;
    color: #8f9aa6 !important;
    font-size: 10px !important;
    line-height: 1.5;
  }

  .profile-ach-scroll {
    max-height: 470px;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 4px;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: #394450 transparent;
  }

  .profile-ach-scroll::-webkit-scrollbar {
    width: 5px;
  }

  .profile-ach-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .profile-ach-scroll::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background: #394450;
  }

  .profile-ach-group-heading {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 9px;
    padding: 0 3px;
  }

  .profile-ach-group-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .profile-ach-group-dot.unlocked {
    background: #6ddfac;
    box-shadow: 0 0 9px rgba(109,223,172,.4);
  }

  .profile-ach-group-dot.locked {
    background: #8a95a3;
  }

  .profile-ach-group-heading strong {
    color: #d5e0e9;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: .1em;
  }

  .profile-ach-group-heading small {
    margin-left: auto;
    color: #8793a1;
    font-size: 10px;
  }

  .profile-ach-group.locked-group {
    margin-top: 18px;
  }

  .profile-ach-card {
    margin-bottom: 7px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.085);
    border-radius: 10px;
    background: rgba(255,255,255,.023);
    transition:
      background .15s ease,
      border-color .15s ease;
  }

  .profile-ach-card:hover {
    background: rgba(255,255,255,.045);
    border-color: rgba(255,255,255,.17);
  }

  .profile-ach-card.is-unlocked {
    border-color: rgba(115,221,164,.19);
  }

  .profile-ach-card.is-unlocked.rarity-rare {
    border-color: rgba(98,151,255,.30);
  }

  .profile-ach-card.is-unlocked.rarity-epic {
    border-color: rgba(197,121,255,.30);
  }

  .profile-ach-card.is-unlocked.rarity-legendary {
    border-color: rgba(242,202,98,.36);
  }

  .profile-ach-card-summary {
    display: grid;
    grid-template-columns: 48px minmax(0,1fr) auto;
    align-items: center;
    gap: 9px;
    min-height: 68px;
    padding: 9px 8px;
    cursor: pointer;
    list-style: none;
  }

  .profile-ach-card-summary::-webkit-details-marker {
    display: none;
  }

  .profile-ach-card-summary:focus-visible {
    outline: 2px solid #8fbaff;
    outline-offset: -2px;
  }

  .profile-ach-image {
    position: relative;
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.10);
    border-radius: 9px;
    background: #05090d;
  }

  .profile-ach-image img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .profile-ach-placeholder {
    font-size: 24px;
  }

  .profile-ach-card.is-locked .profile-ach-image img {
    filter: grayscale(1) brightness(.53);
    opacity: .7;
  }

  .profile-ach-lock {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0,0,0,.3);
    font-size: 17px;
  }

  .profile-ach-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    gap: 4px;
  }

  .profile-ach-rarity {
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .1em;
  }

  .profile-ach-rarity.rarity-common {
    color: #cbd5e1;
  }

  .profile-ach-rarity.rarity-rare {
    color: #79aaff;
  }

  .profile-ach-rarity.rarity-epic {
    color: #d39aff;
  }

  .profile-ach-rarity.rarity-legendary {
    color: #f4ce69;
  }

  .profile-ach-info > strong {
    display: -webkit-box;
    max-width: 100%;
    overflow: hidden;
    color: #f3f7fb;
    font-size: 12px;
    font-weight: 750;
    line-height: 1.3;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .profile-ach-status {
    color: #919ca9;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: .06em;
  }

  .profile-ach-card.is-unlocked .profile-ach-status {
    color: #79d7aa;
  }

  .profile-ach-reward {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    gap: 3px;
    min-width: 42px;
  }

  .profile-ach-reward strong {
    color: #e6bf63;
    font-size: 13px;
    font-weight: 900;
    white-space: nowrap;
  }

  .profile-ach-reward span {
    color: #97855c;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .1em;
  }

  .profile-ach-card.is-locked .profile-ach-reward {
    opacity: .6;
  }

  .profile-ach-details {
    padding: 10px 11px 12px;
    border-top: 1px solid rgba(255,255,255,.07);
  }

  .profile-ach-description {
    margin: 0 0 10px !important;
    color: #a6b1bd !important;
    font-size: 11px !important;
    line-height: 1.55;
    overflow-wrap: anywhere;
  }

  .profile-ach-condition > span {
    display: block;
    color: #7d8996;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .09em;
  }

  .profile-ach-condition > strong {
    display: block;
    margin-top: 6px;
    color: #d7dfe8;
    font-size: 11px;
    font-weight: 700;
    line-height: 1.5;
  }

  .profile-ach-earned {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .profile-ach-earned span {
    color: #75d8aa;
    font-size: 10px;
    font-weight: 900;
  }

  .profile-ach-earned strong {
    color: #e8c572;
    font-size: 11px;
  }

  .profile-ach-progress {
    margin-top: 13px;
  }

  .profile-ach-progress-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: #95a1ad;
    font-size: 10px;
  }

  .profile-ach-progress-label strong {
    color: #d0d9e3;
  }

  .profile-ach-progress-track {
    height: 5px;
    margin-top: 7px;
    overflow: hidden;
    border-radius: 99px;
    background: rgba(255,255,255,.09);
  }

  .profile-ach-progress-fill {
    height: 100%;
    border-radius: 99px;
    background: linear-gradient(
      90deg,
      var(--profile-accent-2, #b90000),
      var(--profile-accent, #ff443c)
    );
  }

  .profile-ach-group-empty {
    padding: 10px;
    border: 1px dashed rgba(255,255,255,.1);
    border-radius: 8px;
    color: #8b97a4;
    font-size: 10px;
    line-height: 1.5;
  }

  .profile-ach-empty {
    padding: 24px 10px;
    color: #94a1af;
    font-size: 11px;
    text-align: center;
  }

  .profile-ach-footer {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 11px;
    padding-top: 9px;
    border-top: 1px solid rgba(255,255,255,.07);
    color: #768390;
    font-size: 9px;
  }

  @media (max-width: 600px) {
    .profile-achievements-sidebar {
      padding: 16px 12px 12px;
    }

    .profile-ach-scroll {
      max-height: 420px;
    }
  }
`;
