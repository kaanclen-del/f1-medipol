
/*
  F1 SOCIAL
  AUTOMATIC ACHIEVEMENT CONDITIONS

  Otomatik basarim kosullari icin
  merkezi tanim dosyasi.
*/

export const ACHIEVEMENT_CONDITIONS = [
  {
    value: "manual",
    label: "Manuel",
    category: "manual",
  },

  // PADDOCK

  {
    value: "paddock_post_count",
    label: "Paddock paylaÅŸÄ±m sayÄ±sÄ±",
    category: "paddock",
  },
  {
    value: "paddock_comment_count",
    label: "Paddock yorum sayÄ±sÄ±",
    category: "paddock",
  },
  {
    value: "paddock_likes_given",
    label: "Verilen beÄŸeni sayÄ±sÄ±",
    category: "paddock",
  },
  {
    value: "paddock_likes_received",
    label: "AlÄ±nan beÄŸeni sayÄ±sÄ±",
    category: "paddock",
  },

  // TAHMIN KATILIMI

  {
    value: "prediction_count",
    label: "Toplam tahmin sayÄ±sÄ±",
    category: "prediction",
  },
  {
    value: "race_prediction_count",
    label: "YarÄ±ÅŸ tahmini sayÄ±sÄ±",
    category: "prediction",
  },
  {
    value: "sprint_prediction_count",
    label: "Sprint tahmini sayÄ±sÄ±",
    category: "prediction",
  },
  {
    value: "scored_prediction_count",
    label: "PuanlanmÄ±ÅŸ tahmin sayÄ±sÄ±",
    category: "prediction",
  },

  // TAHMIN PUANLARI

  {
    value: "prediction_points",
    label: "Toplam tahmin puanÄ±",
    category: "prediction",
  },
  {
    value: "race_prediction_points",
    label: "Toplam yarÄ±ÅŸ tahmini puanÄ±",
    category: "prediction",
  },
  {
    value: "sprint_prediction_points",
    label: "Toplam Sprint tahmini puanÄ±",
    category: "prediction",
  },
  {
    value: "best_prediction_score",
    label: "Tek tahminde en yÃ¼ksek puan",
    category: "prediction",
  },

  // DOGRU TAHMINLER

  {
    value: "race_winner_correct_count",
    label: "DoÄŸru yarÄ±ÅŸ galibi tahmini",
    category: "prediction",
  },
  {
    value: "sprint_winner_correct_count",
    label: "DoÄŸru Sprint galibi tahmini",
    category: "prediction",
  },
  {
    value: "race_exact_podium_count",
    label: "Tam doÄŸru yarÄ±ÅŸ podyumu",
    category: "prediction",
  },
  {
    value: "sprint_exact_podium_count",
    label: "Tam doÄŸru Sprint podyumu",
    category: "prediction",
  },

  // PROFIL

  {
    value: "profile_avatar_set",
    label: "Profil fotoÄŸrafÄ± ekleme",
    category: "profile",
  },
  {
    value: "profile_bio_set",
    label: "Profil biyografisi ekleme",
    category: "profile",
  },
] as const;

export type AchievementConditionType =
  (typeof ACHIEVEMENT_CONDITIONS)[number]["value"];

export const VALID_ACHIEVEMENT_CONDITIONS: string[] =
  ACHIEVEMENT_CONDITIONS.map(
    (condition) => condition.value
  );

export const ACHIEVEMENT_CONDITION_LABELS:
  Record<string, string> =
  Object.fromEntries(
    ACHIEVEMENT_CONDITIONS.map(
      (condition) => [
        condition.value,
        condition.label,
      ]
    )
  );
