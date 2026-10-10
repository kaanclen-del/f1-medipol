type Achievement = {
  id: string;

  slug: string;

  name: string;

  description:
    | string
    | null;

  image_url:
    | string
    | null;

  category: string;

  rarity:
    | "common"
    | "rare"
    | "epic"
    | "legendary";

  xp_reward: number;

  is_automatic: boolean;

  condition_type: string;

  condition_value:
    | number
    | null;

  is_published: boolean;

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

  userAchievements:
    UserAchievement[];

  stats: {
    paddockPostCount:
      number;

    predictionCount:
      number;

    totalPoints:
      number;

    bestScore:
      number;
  };
};

/* =========================================================
   HELPERS
   ========================================================= */

function rarityLabel(
  rarity: string
) {
  if (
    rarity ===
    "legendary"
  ) {
    return "LEGENDARY";
  }

  if (
    rarity ===
    "epic"
  ) {
    return "EPIC";
  }

  if (
    rarity ===
    "rare"
  ) {
    return "RARE";
  }

  return "COMMON";
}

function conditionLabel(
  type: string,
  value:
    | number
    | null
) {
  const target =
    value ??
    0;

  if (
    type ===
    "paddock_post_count"
  ) {
    return `${target} Paddock paylaşımı yap`;
  }

  if (
    type ===
    "prediction_count"
  ) {
    return `${target} tahmin yap`;
  }

  if (
    type ===
    "prediction_points"
  ) {
    return `${target} toplam tahmin puanına ulaş`;
  }

  if (
    type ===
    "best_prediction_score"
  ) {
    return `Tek tahminde ${target} puana ulaş`;
  }

  return "Yönetici tarafından verilen özel rozet";
}

function currentConditionValue(
  type: string,
  stats: Props["stats"]
) {
  if (
    type ===
    "paddock_post_count"
  ) {
    return stats
      .paddockPostCount;
  }

  if (
    type ===
    "prediction_count"
  ) {
    return stats
      .predictionCount;
  }

  if (
    type ===
    "prediction_points"
  ) {
    return stats
      .totalPoints;
  }

  if (
    type ===
    "best_prediction_score"
  ) {
    return stats
      .bestScore;
  }

  return null;
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function ProfileAchievements({
  achievements,
  userAchievements,
  stats,
}: Props) {
  const awardMap =
    new Map<
      string,
      UserAchievement
    >();

  for (
    const award of
      userAchievements
  ) {
    awardMap.set(
      award.achievement_id,
      award
    );
  }

  const unlockedCount =
    achievements.filter(
      (
        achievement
      ) =>
        awardMap.has(
          achievement.id
        )
    ).length;

  return (
    <section className="f1-achievements-v2">
      <style>
        {styles}
      </style>

      {/* ===============================================
          HEADER
          =============================================== */}

      <div className="f1-achievements-v2-header">
        <div>
          <span>
            ACHIEVEMENT GARAGE
          </span>

          <h2>
            Rozetler & Başarımlar
          </h2>

          <p>
            Kazandığın başarımlar renkli,
            henüz açmadıkların kilitli
            görünür. Kilitli başarımın
            şartını ve mevcut ilerlemeni
            görebilirsin.
          </p>
        </div>

        <div className="f1-achievements-v2-count">
          <strong>
            {unlockedCount}
          </strong>

          <span>
            / {achievements.length}
          </span>

          <small>
            AÇILDI
          </small>
        </div>
      </div>

      {/* ===============================================
          LIST
          =============================================== */}

      {achievements.length ===
      0 ? (
        <div className="f1-achievements-v2-empty">
          Henüz yayınlanmış
          başarım bulunmuyor.
        </div>
      ) : (
        <div className="f1-achievements-v2-list">
          {achievements.map(
            (
              achievement
            ) => {
              const award =
                awardMap.get(
                  achievement.id
                );

              const unlocked =
                Boolean(
                  award
                );

              const currentValue =
                currentConditionValue(
                  achievement.condition_type,
                  stats
                );

              const target =
                achievement.condition_value;

              const percentage =
                currentValue !==
                  null &&
                target !==
                  null &&
                target >
                  0
                  ? Math.min(
                      100,
                      Math.max(
                        0,
                        (
                          currentValue /
                          target
                        ) *
                          100
                      )
                    )
                  : 0;

              const displayedXp =
                unlocked &&
                award
                  ? Number(
                      award.xp_awarded ??
                        0
                    )
                  : Number(
                      achievement.xp_reward ??
                        0
                    );

              return (
                <article
                  key={
                    achievement.id
                  }
                  className={[
                    "f1-achievement-row-v2",

                    unlocked
                      ? "is-unlocked"
                      : "is-locked",

                    `is-${achievement.rarity}`,
                  ].join(
                    " "
                  )}
                >
                  {/* ===================================
                      IMAGE
                      =================================== */}

                  <div className="f1-achievement-row-v2-image">
                    {achievement.image_url ? (
                      <img
                        src={
                          achievement.image_url
                        }
                        alt={
                          achievement.name
                        }
                      />
                    ) : (
                      <div className="f1-achievement-row-v2-placeholder">
                        🏆
                      </div>
                    )}

                    {!unlocked && (
                      <div className="f1-achievement-row-v2-lock">
                        <span>
                          🔒
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ===================================
                      CONTENT
                      =================================== */}

                  <div className="f1-achievement-row-v2-content">
                    <div className="f1-achievement-row-v2-topline">
                      <span
                        className={`f1-achievement-row-v2-rarity rarity-${achievement.rarity}`}
                      >
                        {rarityLabel(
                          achievement.rarity
                        )}
                      </span>

                      {!unlocked && (
                        <span className="f1-achievement-row-v2-locked-label">
                          KİLİTLİ
                        </span>
                      )}
                    </div>

                    <h3>
                      {
                        achievement.name
                      }
                    </h3>

                    <p>
                      {achievement.description ||
                        "Bu başarım için açıklama eklenmemiş."}
                    </p>

                    {/* ===============================
                        LOCKED INFORMATION
                        =============================== */}

                    {!unlocked && (
                      <div className="f1-achievement-row-v2-condition">
                        <div className="f1-achievement-row-v2-condition-text">
                          <span>
                            NASIL KAZANILIR?
                          </span>

                          <strong>
                            {achievement.is_automatic
                              ? conditionLabel(
                                  achievement.condition_type,
                                  achievement.condition_value
                                )
                              : "Yönetici tarafından verilen özel rozet"}
                          </strong>
                        </div>

                        {achievement.is_automatic &&
                          currentValue !==
                            null &&
                          target !==
                            null && (
                            <div className="f1-achievement-row-v2-progress">
                              <div className="f1-achievement-row-v2-progress-meta">
                                <span>
                                  İlerleme
                                </span>

                                <strong>
                                  {Math.min(
                                    currentValue,
                                    target
                                  )}{" "}
                                  /{" "}
                                  {target}
                                </strong>
                              </div>

                              <div className="f1-achievement-row-v2-track">
                                <div
                                  className="f1-achievement-row-v2-fill"
                                  style={{
                                    width:
                                      `${percentage}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  {/* ===================================
                      XP
                      =================================== */}

                  <div className="f1-achievement-row-v2-xp">
                    <strong>
                      +
                      {
                        displayedXp
                      }
                    </strong>

                    <span>
                      XP
                    </span>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   CSS
   ========================================================= */

const styles = `
  /* =====================================================
     OUTER PANEL
     ===================================================== */

  .f1-achievements-v2 {
    width:
      100%;

    padding:
      34px;

    border:
      1px solid
      rgba(255,255,255,.10);

    border-radius:
      16px;

    background:
      rgba(10,14,20,.86);

    backdrop-filter:
      blur(18px);
  }

  /* =====================================================
     HEADER
     ===================================================== */

  .f1-achievements-v2-header {
    margin-bottom:
      26px;

    display:
      flex;

    align-items:
      flex-start;

    justify-content:
      space-between;

    gap:
      30px;
  }

  .f1-achievements-v2-header >
  div:first-child >
  span {
    color:
      var(
        --profile-accent,
        #ff443c
      );

    font-size:
      10px;

    font-weight:
      1000;

    letter-spacing:
      .15em;
  }

  .f1-achievements-v2-header h2 {
    margin:
      7px 0 8px !important;

    color:
      #f5f7fa !important;

    font-size:
      32px !important;

    line-height:
      1.1;

    letter-spacing:
      -.025em;
  }

  .f1-achievements-v2-header p {
    max-width:
      720px;

    margin:
      0;

    color:
      #939eaa !important;

    font-size:
      13px !important;

    line-height:
      1.65;
  }

  .f1-achievements-v2-count {
    min-width:
      120px;

    padding:
      14px 17px;

    border:
      1px solid
      rgba(255,255,255,.08);

    border-radius:
      12px;

    text-align:
      center;

    background:
      rgba(255,255,255,.025);
  }

  .f1-achievements-v2-count strong {
    color:
      var(
        --profile-accent,
        #ff443c
      ) !important;

    font-size:
      29px !important;
  }

  .f1-achievements-v2-count >
  span {
    margin-left:
      3px;

    color:
      #8994a0;

    font-size:
      16px;
  }

  .f1-achievements-v2-count small {
    display:
      block;

    margin-top:
      3px;

    color:
      #707b87;

    font-size:
      8px;

    font-weight:
      1000;

    letter-spacing:
      .12em;
  }

  /* =====================================================
     LIST
     ===================================================== */

  .f1-achievements-v2-list {
    width:
      100%;

    display:
      flex;

    flex-direction:
      column;

    gap:
      12px;
  }

  /* =====================================================
     HORIZONTAL CARD
     ===================================================== */

  .f1-achievement-row-v2 {
    position:
      relative;

    box-sizing:
      border-box;

    width:
      100% !important;

    min-height:
      170px !important;

    padding:
      20px 22px !important;

    display:
      grid !important;

    grid-template-columns:
      128px
      minmax(0,1fr)
      112px !important;

    grid-template-rows:
      auto !important;

    align-items:
      center !important;

    gap:
      25px !important;

    overflow:
      hidden;

    border:
      1px solid
      rgba(255,255,255,.09);

    border-radius:
      15px !important;

    background:
      linear-gradient(
        125deg,
        rgba(255,255,255,.042),
        rgba(255,255,255,.014)
      ) !important;

    transition:
      transform .18s ease,
      border-color .18s ease,
      background .18s ease,
      box-shadow .18s ease;
  }

  .f1-achievement-row-v2.is-unlocked:hover {
    transform:
      translateY(-2px);

    background:
      linear-gradient(
        125deg,
        rgba(255,255,255,.06),
        rgba(255,255,255,.02)
      ) !important;
  }

  /* =====================================================
     BADGE IMAGE
     ===================================================== */

  .f1-achievement-row-v2-image {
    position:
      relative;

    width:
      128px !important;

    height:
      128px !important;

    min-width:
      128px;

    overflow:
      hidden;

    display:
      grid;

    place-items:
      center;

    border:
      1px solid
      rgba(255,255,255,.11);

    border-radius:
      17px;

    background:
      #070a0f;

    box-shadow:
      0 14px 35px
      rgba(0,0,0,.28);
  }

  .f1-achievement-row-v2-image img {
    width:
      100% !important;

    height:
      100% !important;

    display:
      block;

    object-fit:
      cover !important;
  }

  .f1-achievement-row-v2-placeholder {
    font-size:
      43px;
  }

  /* =====================================================
     CONTENT
     ===================================================== */

  .f1-achievement-row-v2-content {
    min-width:
      0;

    align-self:
      center;
  }

  .f1-achievement-row-v2-topline {
    min-height:
      20px;

    display:
      flex;

    align-items:
      center;

    gap:
      10px;
  }

  .f1-achievement-row-v2-rarity {
    font-size:
      9px !important;

    font-weight:
      1000;

    letter-spacing:
      .15em;
  }

  .f1-achievement-row-v2-rarity.rarity-common {
    color:
      #c6ced7;
  }

  .f1-achievement-row-v2-rarity.rarity-rare {
    color:
      #72a8ff;
  }

  .f1-achievement-row-v2-rarity.rarity-epic {
    color:
      #ca82ff;
  }

  .f1-achievement-row-v2-rarity.rarity-legendary {
    color:
      #f2ca62;
  }

  .f1-achievement-row-v2 h3 {
    margin:
      8px 0 0 !important;

    color:
      #f8fafc !important;

    font-size:
      24px !important;

    line-height:
      1.15 !important;

    letter-spacing:
      -.025em;
  }

  .f1-achievement-row-v2-content >
  p {
    max-width:
      760px;

    margin:
      12px 0 0 !important;

    color:
      #abb5bf !important;

    font-size:
      13px !important;

    line-height:
      1.6 !important;
  }

  /* =====================================================
     LOCKED LABEL
     ===================================================== */

  .f1-achievement-row-v2-locked-label {
    padding:
      4px 7px;

    border:
      1px solid
      rgba(255,255,255,.09);

    border-radius:
      999px;

    color:
      #929ba5;

    background:
      rgba(255,255,255,.035);

    font-size:
      7px;

    font-weight:
      1000;

    letter-spacing:
      .1em;
  }

  /* =====================================================
     XP
     ===================================================== */

  .f1-achievement-row-v2-xp {
    width:
      112px !important;

    min-height:
      82px;

    padding:
      10px;

    display:
      flex;

    flex-direction:
      column;

    align-items:
      center;

    justify-content:
      center;

    justify-self:
      end;

    border:
      1px solid
      rgba(240,199,94,.26);

    border-radius:
      13px;

    background:
      linear-gradient(
        145deg,
        rgba(240,199,94,.09),
        rgba(240,199,94,.025)
      );
  }

  .f1-achievement-row-v2-xp strong {
    color:
      #f2cb63 !important;

    font-size:
      24px !important;

    line-height:
      1;
  }

  .f1-achievement-row-v2-xp span {
    margin-top:
      7px;

    color:
      #9e894f;

    font-size:
      8px;

    font-weight:
      1000;

    letter-spacing:
      .16em;
  }

  /* =====================================================
     LOCKED CARD
     ===================================================== */

  .f1-achievement-row-v2.is-locked {
    border-color:
      rgba(255,255,255,.07);

    background:
      linear-gradient(
        125deg,
        rgba(100,105,112,.045),
        rgba(30,33,38,.025)
      ) !important;
  }

  .f1-achievement-row-v2.is-locked
  .f1-achievement-row-v2-image img {
    filter:
      grayscale(1)
      brightness(.52);

    opacity:
      .62;
  }

  .f1-achievement-row-v2.is-locked
  .f1-achievement-row-v2-content >
  p {
    color:
      #777f88 !important;
  }

  .f1-achievement-row-v2.is-locked
  .f1-achievement-row-v2-xp {
    filter:
      grayscale(1);

    opacity:
      .58;
  }

  .f1-achievement-row-v2-lock {
    position:
      absolute;

    inset:
      0;

    display:
      grid;

    place-items:
      center;

    background:
      rgba(5,7,10,.42);
  }

  .f1-achievement-row-v2-lock span {
    width:
      43px;

    height:
      43px;

    display:
      grid;

    place-items:
      center;

    border:
      1px solid
      rgba(255,255,255,.10);

    border-radius:
      50%;

    background:
      rgba(5,7,10,.72);

    font-size:
      19px;
  }

  /* =====================================================
     LOCKED CONDITION
     ===================================================== */

  .f1-achievement-row-v2-condition {
    max-width:
      720px;

    margin-top:
      16px;

    padding-top:
      13px;

    border-top:
      1px solid
      rgba(255,255,255,.065);
  }

  .f1-achievement-row-v2-condition-text >
  span {
    display:
      block;

    color:
      #717b85;

    font-size:
      8px;

    font-weight:
      1000;

    letter-spacing:
      .13em;
  }

  .f1-achievement-row-v2-condition-text >
  strong {
    display:
      block;

    margin-top:
      6px;

    color:
      #b7c0c8 !important;

    font-size:
      12px !important;

    line-height:
      1.5;
  }

  /* =====================================================
     PROGRESS
     ===================================================== */

  .f1-achievement-row-v2-progress {
    margin-top:
      13px;
  }

  .f1-achievement-row-v2-progress-meta {
    display:
      flex;

    align-items:
      center;

    justify-content:
      space-between;

    gap:
      15px;

    color:
      #808b96;

    font-size:
      9px;
  }

  .f1-achievement-row-v2-progress-meta
  strong {
    color:
      #abb5be !important;

    font-size:
      9px !important;
  }

  .f1-achievement-row-v2-track {
    height:
      7px;

    margin-top:
      8px;

    overflow:
      hidden;

    border-radius:
      999px;

    background:
      rgba(255,255,255,.07);
  }

  .f1-achievement-row-v2-fill {
    height:
      100%;

    border-radius:
      inherit;

    background:
      linear-gradient(
        90deg,
        var(
          --profile-accent-2,
          #b90000
        ),
        var(
          --profile-accent,
          #ff443c
        )
      );

    box-shadow:
      0 0 15px
      var(
        --profile-accent-glow,
        rgba(255,68,60,.25)
      );
  }

  /* =====================================================
     UNLOCKED RARITY BORDERS
     ===================================================== */

  .f1-achievement-row-v2.is-unlocked.is-common {
    border-color:
      rgba(205,212,220,.20);
  }

  .f1-achievement-row-v2.is-unlocked.is-rare {
    border-color:
      rgba(82,143,255,.34);

    box-shadow:
      inset 3px 0 0
      rgba(82,143,255,.65);
  }

  .f1-achievement-row-v2.is-unlocked.is-epic {
    border-color:
      rgba(190,105,255,.36);

    box-shadow:
      inset 3px 0 0
      rgba(190,105,255,.70);
  }

  .f1-achievement-row-v2.is-unlocked.is-legendary {
    border-color:
      rgba(241,195,75,.38);

    box-shadow:
      inset 3px 0 0
      rgba(241,195,75,.78),
      inset 0 0 35px
      rgba(241,195,75,.035);
  }

  /* =====================================================
     EMPTY
     ===================================================== */

  .f1-achievements-v2-empty {
    min-height:
      150px;

    display:
      grid;

    place-items:
      center;

    color:
      #7e8994;

    font-size:
      12px;
  }

  /* =====================================================
     TABLET
     ===================================================== */

  @media(
    max-width:
      850px
  ) {
    .f1-achievements-v2 {
      padding:
        25px;
    }

    .f1-achievement-row-v2 {
      grid-template-columns:
        105px
        minmax(0,1fr)
        92px !important;

      gap:
        18px !important;
    }

    .f1-achievement-row-v2-image {
      width:
        105px !important;

      height:
        105px !important;

      min-width:
        105px;
    }

    .f1-achievement-row-v2-xp {
      width:
        92px !important;
    }

    .f1-achievement-row-v2 h3 {
      font-size:
        21px !important;
    }
  }

  /* =====================================================
     MOBILE
     ===================================================== */

  @media(
    max-width:
      600px
  ) {
    .f1-achievements-v2 {
      padding:
        20px;
    }

    .f1-achievements-v2-header {
      flex-direction:
        column;

      gap:
        16px;
    }

    .f1-achievements-v2-header h2 {
      font-size:
        27px !important;
    }

    .f1-achievements-v2-count {
      width:
        100%;

      text-align:
        left;
    }

    .f1-achievement-row-v2 {
      grid-template-columns:
        84px
        minmax(0,1fr) !important;

      min-height:
        auto !important;

      padding:
        15px !important;

      gap:
        15px !important;

      align-items:
        start !important;
    }

    .f1-achievement-row-v2-image {
      width:
        84px !important;

      height:
        84px !important;

      min-width:
        84px;
    }

    .f1-achievement-row-v2 h3 {
      font-size:
        19px !important;
    }

    .f1-achievement-row-v2-content >
    p {
      font-size:
        12px !important;
    }

    .f1-achievement-row-v2-xp {
      grid-column:
        2;

      width:
        auto !important;

      min-width:
        78px;

      min-height:
        42px;

      justify-self:
        start;

      flex-direction:
        row;

      gap:
        5px;
    }

    .f1-achievement-row-v2-xp strong {
      font-size:
        15px !important;
    }

    .f1-achievement-row-v2-xp span {
      margin-top:
        0;

      font-size:
        7px;
    }
  }
`;