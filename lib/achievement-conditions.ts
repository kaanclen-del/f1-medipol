
/*
  F1 MEDIPOL
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
    label: "Paddock paylaşım sayısı",
    category: "paddock",
  },
  {
    value: "paddock_comment_count",
    label: "Paddock yorum sayısı",
    category: "paddock",
  },
  {
    value: "paddock_likes_given",
    label: "Verilen beğeni sayısı",
    category: "paddock",
  },
  {
    value: "paddock_likes_received",
    label: "Alınan beğeni sayısı",
    category: "paddock",
  },

  // TAHMIN KATILIMI

  {
    value: "prediction_count",
    label: "Toplam tahmin sayısı",
    category: "prediction",
  },
  {
    value: "race_prediction_count",
    label: "Yarış tahmini sayısı",
    category: "prediction",
  },
  {
    value: "sprint_prediction_count",
    label: "Sprint tahmini sayısı",
    category: "prediction",
  },
  {
    value: "scored_prediction_count",
    label: "Puanlanmış tahmin sayısı",
    category: "prediction",
  },

  // TAHMIN PUANLARI

  {
    value: "prediction_points",
    label: "Toplam tahmin puanı",
    category: "prediction",
  },
  {
    value: "race_prediction_points",
    label: "Toplam yarış tahmini puanı",
    category: "prediction",
  },
  {
    value: "sprint_prediction_points",
    label: "Toplam Sprint tahmini puanı",
    category: "prediction",
  },
  {
    value: "best_prediction_score",
    label: "Tek tahminde en yüksek puan",
    category: "prediction",
  },

  // DOGRU TAHMINLER

  {
    value: "race_winner_correct_count",
    label: "Doğru yarış galibi tahmini",
    category: "prediction",
  },
  {
    value: "sprint_winner_correct_count",
    label: "Doğru Sprint galibi tahmini",
    category: "prediction",
  },
  {
    value: "race_exact_podium_count",
    label: "Tam doğru yarış podyumu",
    category: "prediction",
  },
  {
    value: "sprint_exact_podium_count",
    label: "Tam doğru Sprint podyumu",
    category: "prediction",
  },

  // PROFIL

  {
    value: "profile_avatar_set",
    label: "Profil fotoğrafı ekleme",
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