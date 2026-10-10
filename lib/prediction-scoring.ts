export type PodiumPrediction = {
  P1: number;
  P2: number;
  P3: number;
};

export type PredictionScore = {
  total: number;
  P1: number;
  P2: number;
  P3: number;
};

export type BinaryPrediction =
  | "yes"
  | "no";

export const RACE_BULLETIN_QUESTIONS = [
  {
    key: "redFlag",
    icon: "🚩",
    group: "Yarış Kontrol",
    label:
      "Yarışta kırmızı bayrak çıkar mı?",
    hint:
      "Herhangi bir kırmızı bayrak periyodu.",
    points: 12,
  },

  {
    key: "safetyCar",
    icon: "🚗",
    group: "Yarış Kontrol",
    label:
      "Safety Car piste çıkar mı?",
    hint:
      "Tam Safety Car periyodu.",
    points: 10,
  },

  {
    key: "vsc",
    icon: "🟡",
    group: "Yarış Kontrol",
    label:
      "Virtual Safety Car kullanılır mı?",
    hint:
      "En az bir VSC periyodu.",
    points: 8,
  },

  {
    key: "dnf3",
    icon: "💥",
    group: "Olaylar",
    label:
      "En az 3 pilot DNF olur mu?",
    hint:
      "Yarışı tamamlayamayan pilotlar.",
    points: 12,
  },

  {
    key: "lap1Incident",
    icon: "⚠️",
    group: "Olaylar",
    label:
      "İlk turda temas veya kaza olur mu?",
    hint:
      "İlk turdaki yarış kontrol olayları.",
    points: 10,
  },

  {
    key: "rain",
    icon: "🌧️",
    group: "Hava",
    label:
      "Yağmur yarışın akışını etkiler mi?",
    hint:
      "Yağmur veya ıslak koşullar görülmesi.",
    points: 12,
  },

  {
    key: "poleWins",
    icon: "🏁",
    group: "Liderlik",
    label:
      "Pole pozisyonundaki pilot yarışı kazanır mı?",
    hint:
      "Grid P1 ile yarış galibi aynı pilot.",
    points: 10,
  },

  {
    key: "lightsToFlag",
    icon: "👑",
    group: "Liderlik",
    label:
      "Pole sahibi liderliği hiç kaybetmeden bitirir mi?",
    hint:
      "Starttan finişe aynı yarış lideri.",
    points: 15,
  },

  {
    key: "margin10",
    icon: "⏱️",
    group: "Finiş",
    label:
      "Kazanan 10 saniyeden fazla fark atar mı?",
    hint:
      "P1 ile P2 arasındaki resmî finiş farkı.",
    points: 10,
  },

  {
    key: "fastestOnPodium",
    icon: "⚡",
    group: "Finiş",
    label:
      "En hızlı turu atan pilot podyumda olur mu?",
    hint:
      "En hızlı tur sahibi P1, P2 veya P3.",
    points: 10,
  },

  {
    key: "leaders4",
    icon: "🔄",
    group: "Yarış Akışı",
    label:
      "En az 4 farklı pilot yarış lideri olur mu?",
    hint:
      "Pit döngüleri dahil liderlik değişimleri.",
    points: 12,
  },

  {
    key: "lateNeutral",
    icon: "🧯",
    group: "Yarış Akışı",
    label:
      "Son 10 turda SC veya VSC çıkar mı?",
    hint:
      "Final bölümünde yarış nötralizasyonu.",
    points: 12,
  },
] as const;

export const RACE_SPECIAL_PICKS = [
  {
    key: "fastestLap",
    icon: "⚡",
    label:
      "En hızlı turu kim atar?",
    points: 20,
  },

  {
    key: "firstDnf",
    icon: "💥",
    label:
      "İlk DNF kim olur?",
    points: 25,
  },

  {
    key: "mostGained",
    icon: "📈",
    label:
      "En çok sıra kazanan pilot",
    points: 20,
  },

  {
    key: "winningTeam",
    icon: "🏆",
    label:
      "Kazanan takım",
    points: 15,
  },
] as const;

export type RaceBulletinKey =
  typeof RACE_BULLETIN_QUESTIONS[number]["key"];

export type RaceSpecialKey =
  typeof RACE_SPECIAL_PICKS[number]["key"];

export type RaceBulletinAnswers =
  Partial<
    Record<
      RaceBulletinKey,
      BinaryPrediction
    >
  >;

export type RaceSpecialPicks = {
  fastestLap?:
    | number
    | null;

  firstDnf?:
    | number
    | "NONE"
    | null;

  mostGained?:
    | number
    | null;

  winningTeam?:
    | string
    | null;
};

export type RaceBulletinActuals =
  Partial<
    Record<
      RaceBulletinKey,
      boolean | null
    >
  >;

export type RaceSpecialActuals = {
  fastestLap?:
    | number
    | number[]
    | null;

  firstDnf?:
    | number
    | number[]
    | "NONE"
    | null;

  mostGained?:
    | number
    | number[]
    | null;

  winningTeam?:
    | string
    | string[]
    | null;
};

const EXACT_POINTS = {
  P1: 50,
  P2: 35,
  P3: 25,
} as const;

export const PODIUM_MAX_POINTS =
  110;

export const BULLETIN_MAX_POINTS =
  RACE_BULLETIN_QUESTIONS.reduce(
    (
      total,
      item
    ) =>
      total +
      item.points,
    0
  );

export const SPECIAL_MAX_POINTS =
  RACE_SPECIAL_PICKS.reduce(
    (
      total,
      item
    ) =>
      total +
      item.points,
    0
  );

export const RACE_MAX_POINTS =
  PODIUM_MAX_POINTS +
  BULLETIN_MAX_POINTS +
  SPECIAL_MAX_POINTS;

function scorePosition(
  predictedDriver: number,
  actualDriver: number,
  actualPodium: number[],
  exactPoints: number
) {
  if (
    predictedDriver ===
    actualDriver
  ) {
    return exactPoints;
  }

  if (
    actualPodium.includes(
      predictedDriver
    )
  ) {
    return 10;
  }

  return 0;
}

export function calculatePredictionScore(
  prediction: PodiumPrediction,
  actual: PodiumPrediction
): PredictionScore {
  const actualPodium = [
    actual.P1,
    actual.P2,
    actual.P3,
  ];

  const P1 =
    scorePosition(
      prediction.P1,
      actual.P1,
      actualPodium,
      EXACT_POINTS.P1
    );

  const P2 =
    scorePosition(
      prediction.P2,
      actual.P2,
      actualPodium,
      EXACT_POINTS.P2
    );

  const P3 =
    scorePosition(
      prediction.P3,
      actual.P3,
      actualPodium,
      EXACT_POINTS.P3
    );

  return {
    P1,
    P2,
    P3,

    total:
      P1 +
      P2 +
      P3,
  };
}

function normalizeTeam(
  value: string
) {
  const raw =
    value
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ""
      );

  if (
    raw.includes(
      "mclaren"
    )
  ) {
    return "mclaren";
  }

  if (
    raw.includes(
      "ferrari"
    )
  ) {
    return "ferrari";
  }

  if (
    raw.includes(
      "mercedes"
    )
  ) {
    return "mercedes";
  }

  if (
    raw.includes(
      "redbull"
    )
  ) {
    return "redbull";
  }

  if (
    raw.includes(
      "astonmartin"
    )
  ) {
    return "astonmartin";
  }

  if (
    raw.includes(
      "alpine"
    )
  ) {
    return "alpine";
  }

  if (
    raw.includes(
      "williams"
    )
  ) {
    return "williams";
  }

  if (
    raw.includes(
      "haas"
    )
  ) {
    return "haas";
  }

  if (
    raw.includes(
      "racingbull"
    )
  ) {
    return "racingbulls";
  }

  if (
    raw.includes(
      "audi"
    )
  ) {
    return "audi";
  }

  if (
    raw.includes(
      "cadillac"
    )
  ) {
    return "cadillac";
  }

  return raw;
}

function specialMatches(
  key: RaceSpecialKey,
  predicted:
    | number
    | string
    | null
    | undefined,
  actual:
    | number
    | string
    | number[]
    | string[]
    | null
    | undefined
) {
  if (
    predicted ===
      null ||
    predicted ===
      undefined ||
    actual ===
      null ||
    actual ===
      undefined
  ) {
    return false;
  }

  if (
    Array.isArray(
      actual
    )
  ) {
    if (
      key ===
      "winningTeam"
    ) {
      return actual.some(
        (
          item
        ) =>
          normalizeTeam(
            String(item)
          ) ===
          normalizeTeam(
            String(predicted)
          )
      );
    }

    return actual.some(
      (
        item
      ) =>
        String(item) ===
        String(predicted)
    );
  }

  if (
    key ===
    "winningTeam"
  ) {
    return (
      normalizeTeam(
        String(actual)
      ) ===
      normalizeTeam(
        String(predicted)
      )
    );
  }

  return (
    String(actual) ===
    String(predicted)
  );
}

export function calculateRaceExtraScore(
  answers:
    RaceBulletinAnswers,
  specialPicks:
    RaceSpecialPicks,
  actuals:
    RaceBulletinActuals,
  specialActuals:
    RaceSpecialActuals
) {
  let bulletinPoints = 0;
  let specialPoints = 0;

  const bulletin:
    Record<
      string,
      unknown
    > = {};

  const special:
    Record<
      string,
      unknown
    > = {};

  for (
    const question of
    RACE_BULLETIN_QUESTIONS
  ) {
    const predicted =
      answers[
        question.key
      ];

    const actual =
      actuals[
        question.key
      ];

    const available =
      typeof actual ===
      "boolean";

    const predictedBoolean =
      predicted ===
      "yes"
        ? true
        : predicted ===
          "no"
        ? false
        : null;

    const correct =
      available &&
      predictedBoolean !==
        null &&
      predictedBoolean ===
        actual;

    const earned =
      correct
        ? question.points
        : 0;

    bulletinPoints +=
      earned;

    bulletin[
      question.key
    ] = {
      predicted:
        predicted ??
        null,

      actual:
        available
          ? actual
          : null,

      available,

      correct,

      points:
        earned,

      maxPoints:
        question.points,
    };
  }

  for (
    const item of
    RACE_SPECIAL_PICKS
  ) {
    const predicted =
      specialPicks[
        item.key
      ];

    const actual =
      specialActuals[
        item.key
      ];

    const available =
      actual !==
        null &&
      actual !==
        undefined;

    const correct =
      available &&
      specialMatches(
        item.key,
        predicted,
        actual
      );

    const earned =
      correct
        ? item.points
        : 0;

    specialPoints +=
      earned;

    special[
      item.key
    ] = {
      predicted:
        predicted ??
        null,

      actual:
        actual ??
        null,

      available,

      correct,

      points:
        earned,

      maxPoints:
        item.points,
    };
  }

  return {
    bulletinPoints,
    specialPoints,

    total:
      bulletinPoints +
      specialPoints,

    bulletin,
    special,
  };
}

export function getPodiumFromResults(
  results: {
    driver_number: number;
    position: number;
  }[]
): PodiumPrediction | null {
  const p1 =
    results.find(
      (
        result
      ) =>
        result.position ===
        1
    );

  const p2 =
    results.find(
      (
        result
      ) =>
        result.position ===
        2
    );

  const p3 =
    results.find(
      (
        result
      ) =>
        result.position ===
        3
    );

  if (
    !p1 ||
    !p2 ||
    !p3
  ) {
    return null;
  }

  return {
    P1:
      p1.driver_number,

    P2:
      p2.driver_number,

    P3:
      p3.driver_number,
  };
}