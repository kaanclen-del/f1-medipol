import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    lobbyId: string;
  }>;
};

type Difficulty =
  | "easy"
  | "normal"
  | "hard"
  | "expert";

type IncidentType =
  | "mechanical"
  | "driver_error"
  | "collision"
  | "easter_egg";

type Incident = {
  incident_type: IncidentType;
  incident_key: string;
  incident_message: string;
  incident_lap: number;
};

type RaceEvent = {
  event_type:
    | "rain_start"
    | "rain_stop"
    | "safety_car";

  event_lap: number;
  duration_laps: number;

  message: string;

  meta: Record<
    string,
    string | number | boolean
  >;
};

type DriverStats = {
  key: string;
  name: string;

  pace: number;
  consistency: number;
  wet: number;
  racecraft: number;
  potential: number;
};

type RaceStrategy = {
  starting_tire:
    | "soft"
    | "medium"
    | "hard";

  second_tire:
    | "soft"
    | "medium"
    | "hard";

  pit_lap: number;
  aggression: number;
};

type UpgradeField =
  | "aero_level"
  | "chassis_level"
  | "power_level"
  | "reliability_level";

const POINTS = [
  25,
  18,
  15,
  12,
  10,
  8,
  6,
  4,
  2,
  1,
];

const UPGRADE_FIELDS: UpgradeField[] = [
  "aero_level",
  "chassis_level",
  "power_level",
  "reliability_level",
];

const DRIVERS: Record<
  string,
  DriverStats
> = {
  "lando-norris": {
    key: "lando-norris",
    name: "Lando Norris",
    pace: 93,
    consistency: 92,
    wet: 90,
    racecraft: 93,
    potential: 95,
  },

  "oscar-piastri": {
    key: "oscar-piastri",
    name: "Oscar Piastri",
    pace: 92,
    consistency: 91,
    wet: 87,
    racecraft: 92,
    potential: 96,
  },

  "charles-leclerc": {
    key: "charles-leclerc",
    name: "Charles Leclerc",
    pace: 95,
    consistency: 92,
    wet: 92,
    racecraft: 94,
    potential: 95,
  },

  "lewis-hamilton": {
    key: "lewis-hamilton",
    name: "Lewis Hamilton",
    pace: 93,
    consistency: 93,
    wet: 96,
    racecraft: 95,
    potential: 91,
  },

  "max-verstappen": {
    key: "max-verstappen",
    name: "Max Verstappen",
    pace: 96,
    consistency: 95,
    wet: 96,
    racecraft: 97,
    potential: 96,
  },

  "isack-hadjar": {
    key: "isack-hadjar",
    name: "Isack Hadjar",
    pace: 89,
    consistency: 87,
    wet: 87,
    racecraft: 90,
    potential: 96,
  },

  "george-russell": {
    key: "george-russell",
    name: "George Russell",
    pace: 94,
    consistency: 94,
    wet: 91,
    racecraft: 94,
    potential: 94,
  },

  "kimi-antonelli": {
    key: "kimi-antonelli",
    name: "Kimi Antonelli",
    pace: 95,
    consistency: 90,
    wet: 88,
    racecraft: 92,
    potential: 98,
  },

  "fernando-alonso": {
    key: "fernando-alonso",
    name: "Fernando Alonso",
    pace: 92,
    consistency: 96,
    wet: 96,
    racecraft: 97,
    potential: 85,
  },

  "lance-stroll": {
    key: "lance-stroll",
    name: "Lance Stroll",
    pace: 84,
    consistency: 85,
    wet: 87,
    racecraft: 85,
    potential: 82,
  },

  "pierre-gasly": {
    key: "pierre-gasly",
    name: "Pierre Gasly",
    pace: 89,
    consistency: 90,
    wet: 92,
    racecraft: 90,
    potential: 90,
  },

  "franco-colapinto": {
    key: "franco-colapinto",
    name: "Franco Colapinto",
    pace: 86,
    consistency: 84,
    wet: 86,
    racecraft: 87,
    potential: 93,
  },

  "carlos-sainz": {
    key: "carlos-sainz",
    name: "Carlos Sainz",
    pace: 91,
    consistency: 93,
    wet: 92,
    racecraft: 93,
    potential: 90,
  },

  "alexander-albon": {
    key: "alexander-albon",
    name: "Alexander Albon",
    pace: 90,
    consistency: 91,
    wet: 89,
    racecraft: 92,
    potential: 89,
  },

  "esteban-ocon": {
    key: "esteban-ocon",
    name: "Esteban Ocon",
    pace: 88,
    consistency: 89,
    wet: 90,
    racecraft: 90,
    potential: 87,
  },

  "oliver-bearman": {
    key: "oliver-bearman",
    name: "Oliver Bearman",
    pace: 88,
    consistency: 86,
    wet: 85,
    racecraft: 89,
    potential: 95,
  },

  "liam-lawson": {
    key: "liam-lawson",
    name: "Liam Lawson",
    pace: 87,
    consistency: 86,
    wet: 85,
    racecraft: 88,
    potential: 93,
  },

  "arvid-lindblad": {
    key: "arvid-lindblad",
    name: "Arvid Lindblad",
    pace: 86,
    consistency: 84,
    wet: 83,
    racecraft: 86,
    potential: 97,
  },

  "nico-hulkenberg": {
    key: "nico-hulkenberg",
    name: "Nico Hulkenberg",
    pace: 88,
    consistency: 91,
    wet: 89,
    racecraft: 90,
    potential: 85,
  },

  "gabriel-bortoleto": {
    key: "gabriel-bortoleto",
    name: "Gabriel Bortoleto",
    pace: 87,
    consistency: 86,
    wet: 84,
    racecraft: 88,
    potential: 94,
  },

  "sergio-perez": {
    key: "sergio-perez",
    name: "Sergio Perez",
    pace: 87,
    consistency: 91,
    wet: 92,
    racecraft: 91,
    potential: 84,
  },

  "valtteri-bottas": {
    key: "valtteri-bottas",
    name: "Valtteri Bottas",
    pace: 88,
    consistency: 93,
    wet: 90,
    racecraft: 91,
    potential: 83,
  },
};

const DEFAULT_DRIVER: DriverStats = {
  key: "default-driver",
  name: "Manager Driver",

  pace: 90,
  consistency: 90,
  wet: 90,
  racecraft: 90,
  potential: 90,
};

const EASTER_EGGS = [
  {
    key: "ufo",

    message:
      "Araç bilinmeyen bir UFO tarafından pistten alındı. FIA olayla ilgili yorum yapmıyor.",
  },

  {
    key: "update",

    message:
      "Araç sistemi yarış ortasında 'Güncelle ve yeniden başlat' seçeneğini seçti.",
  },

  {
    key: "wheelgun",

    message:
      "Pit ekibi bijon tabancasını bulamadı. Son görüldüğü yer kahve makinesinin yanı.",
  },

  {
    key: "delivery",

    message:
      "Takım telsizi yanlışlıkla yemek siparişi hattına bağlandı.",
  },

  {
    key: "pigeon",

    message:
      "Bir güvercin aracın sensör paketine savaş açtı. Sensörler mücadeleyi kaybetti.",
  },

  {
    key: "gps",

    message:
      "Navigasyon 'Müsait bir yerde U dönüşü yapınız' dedi ve araç yarıştan çekildi.",
  },
];

function getDriver(
  driverKey:
    | string
    | null
    | undefined
) {
  return (
    (driverKey
      ? DRIVERS[driverKey]
      : null) ??
    DEFAULT_DRIVER
  );
}

function createRng(
  seedText: string
) {
  let seed = 2166136261;

  for (
    let i = 0;
    i < seedText.length;
    i++
  ) {
    seed ^=
      seedText.charCodeAt(i);

    seed =
      Math.imul(
        seed,
        16777619
      );
  }

  let state =
    seed >>> 0;

  return () => {
    state += 0x6d2b79f5;

    let t = state;

    t =
      Math.imul(
        t ^ (t >>> 15),
        t | 1
      );

    t ^=
      t +
      Math.imul(
        t ^ (t >>> 7),
        t | 61
      );

    return (
      ((t ^ (t >>> 14)) >>>
        0) /
      4294967296
    );
  };
}

function randomInt(
  rng: () => number,
  min: number,
  max: number
) {
  return (
    Math.floor(
      rng() *
        (max - min + 1)
    ) + min
  );
}

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function pickRandom<T>(
  rng: () => number,
  values: T[]
) {
  return values[
    Math.floor(
      rng() *
        values.length
    )
  ];
}

/*
  R&D MALİYETİ

  İnsan oyuncunun mevcut
  geliştirme sistemiyle aynı:
  L1 -> L2 = €4m
  L2 -> L3 = €6m
  L3 -> L4 = €8m
  ...
*/

function getUpgradeCost(
  currentLevel: number
) {
  return (
    4_000_000 +
    Math.max(
      0,
      currentLevel - 1
    ) *
      2_000_000
  );
}

/*
  AI'NIN YATIRIM YAPIP
  YAPMAYACAĞI.

  EASY   %30
  NORMAL %55
  HARD   %80
  EXPERT %100
*/

function getInvestmentChance(
  difficulty: Difficulty
) {
  if (
    difficulty === "easy"
  ) {
    return 0.3;
  }

  if (
    difficulty === "normal"
  ) {
    return 0.55;
  }

  if (
    difficulty === "hard"
  ) {
    return 0.8;
  }

  return 1;
}

/*
  YATIRIM ALANI SEÇİMİ.

  Easy:
  neredeyse rastgele.

  Normal:
  zayıf departmanlara yönelir.

  Hard:
  daha dengeli ve reliability
  ihtiyacını hesaba katar.

  Expert:
  en zayıf / en değerli bölümü
  sistematik olarak seçer.
*/

function chooseUpgradeField({
  difficulty,
  levels,
  rng,
}: {
  difficulty: Difficulty;

  levels: Record<
    UpgradeField,
    number
  >;

  rng: () => number;
}) {
  const available =
    UPGRADE_FIELDS.filter(
      (field) =>
        levels[field] < 10
    );

  if (
    available.length === 0
  ) {
    return null;
  }

  if (
    difficulty === "easy"
  ) {
    return pickRandom(
      rng,
      available
    );
  }

  if (
    difficulty === "normal"
  ) {
    const sorted =
      [...available].sort(
        (a, b) =>
          levels[a] -
          levels[b]
      );

    return pickRandom(
      rng,
      sorted.slice(
        0,
        Math.min(
          2,
          sorted.length
        )
      )
    );
  }

  if (
    difficulty === "hard"
  ) {
    const scored =
      available
        .map(
          (field) => {
            let score =
              10 -
              levels[field];

            if (
              field ===
              "reliability_level" &&
              levels[field] < 5
            ) {
              score += 1.25;
            }

            score +=
              rng() * 0.8;

            return {
              field,
              score,
            };
          }
        )
        .sort(
          (a, b) =>
            b.score -
            a.score
        );

    return scored[0]
      .field;
  }

  /*
    EXPERT
  */

  const scored =
    available
      .map(
        (field) => {
          let score =
            (10 -
              levels[field]) *
            2;

          if (
            field ===
            "reliability_level"
          ) {
            if (
              levels[field] <=
              3
            ) {
              score += 3;
            } else if (
              levels[field] <=
              5
            ) {
              score += 1;
            }
          }

          if (
            field ===
            "aero_level"
          ) {
            score += 0.6;
          }

          if (
            field ===
            "power_level"
          ) {
            score += 0.4;
          }

          return {
            field,
            score,
          };
        }
      )
      .sort(
        (a, b) =>
          b.score -
          a.score
      );

  return scored[0]
    .field;
}

/*
  BOT R&D

  last_ai_development_round
  sayesinde aynı round iki kez
  çağrılsa bile AI ikinci kez
  para harcamaz.
*/

async function applyAiDevelopment(
  admin: ReturnType<
    typeof createAdminClient
  >,
  lobbyId: string,
  round: number,
  defaultDifficulty: Difficulty
) {
  const {
    data: bots,
    error: botsError,
  } = await admin
    .from(
      "manager_team_states"
    )
    .select(`
      id,
      bot_key,
      ai_difficulty,
      budget,
      team_rating,
      aero_level,
      chassis_level,
      power_level,
      reliability_level,
      total_spent,
      last_ai_development_round
    `)
    .eq(
      "lobby_id",
      lobbyId
    )
    .eq(
      "is_bot",
      true
    );

  if (botsError) {
    throw new Error(
      botsError.message
    );
  }

  for (const bot of
    bots ?? []) {
    if (
      Number(
        bot.last_ai_development_round ??
          0
      ) >= round
    ) {
      continue;
    }

    const difficulty =
      (bot.ai_difficulty ??
        defaultDifficulty ??
        "normal") as Difficulty;

    const rng =
      createRng(
        `${lobbyId}:${round}:${bot.bot_key}:ai-development-v1`
      );

    let budget =
      Number(
        bot.budget
      );

    let teamRating =
      Number(
        bot.team_rating
      );

    let totalSpent =
      Number(
        bot.total_spent
      );

    const levels: Record<
      UpgradeField,
      number
    > = {
      aero_level:
        Number(
          bot.aero_level
        ),

      chassis_level:
        Number(
          bot.chassis_level
        ),

      power_level:
        Number(
          bot.power_level
        ),

      reliability_level:
        Number(
          bot.reliability_level
        ),
    };

    let upgradesToAttempt =
      0;

    if (
      rng() <
      getInvestmentChance(
        difficulty
      )
    ) {
      upgradesToAttempt =
        1;
    }

    /*
      Uzman AI sezonun ikinci
      yarısında bazen iki departman
      birden geliştirir.

      Bu çok sık değil; böylece
      insan oyuncuyu anlamsız şekilde
      ezmez.
    */

    if (
      difficulty ===
        "expert" &&
      round >= 5 &&
      rng() < 0.22
    ) {
      upgradesToAttempt =
        2;
    }

    /*
      Hard AI de sezon sonunda
      nadiren ikinci upgrade yapar.
    */

    if (
      difficulty ===
        "hard" &&
      round >= 7 &&
      rng() < 0.1
    ) {
      upgradesToAttempt =
        Math.max(
          upgradesToAttempt,
          2
        );
    }

    for (
      let i = 0;
      i < upgradesToAttempt;
      i++
    ) {
      const field =
        chooseUpgradeField({
          difficulty,
          levels,
          rng,
        });

      if (!field) {
        break;
      }

      const currentLevel =
        levels[field];

      const cost =
        getUpgradeCost(
          currentLevel
        );

      if (
        budget < cost
      ) {
        /*
          Seçilen bölüm pahalıysa,
          ödenebilen başka bir bölüm
          var mı kontrol et.
        */

        const affordable =
          UPGRADE_FIELDS.filter(
            (candidate) =>
              levels[candidate] <
                10 &&
              getUpgradeCost(
                levels[
                  candidate
                ]
              ) <= budget
          );

        if (
          affordable.length ===
          0
        ) {
          break;
        }

        const fallback =
          chooseUpgradeField({
            difficulty,
            levels:
              Object.fromEntries(
                UPGRADE_FIELDS.map(
                  (candidate) => [
                    candidate,

                    affordable.includes(
                      candidate
                    )
                      ? levels[
                          candidate
                        ]
                      : 10,
                  ]
                )
              ) as Record<
                UpgradeField,
                number
              >,

            rng,
          });

        if (!fallback) {
          break;
        }

        const fallbackCost =
          getUpgradeCost(
            levels[
              fallback
            ]
          );

        budget -=
          fallbackCost;

        totalSpent +=
          fallbackCost;

        levels[fallback] +=
          1;

        teamRating =
          Math.min(
            100,
            teamRating +
              1
          );

        continue;
      }

      budget -= cost;

      totalSpent += cost;

      levels[field] += 1;

      teamRating =
        Math.min(
          100,
          teamRating + 1
        );
    }

    const {
      error: updateError,
    } = await admin
      .from(
        "manager_team_states"
      )
      .update({
        budget,

        team_rating:
          teamRating,

        aero_level:
          levels.aero_level,

        chassis_level:
          levels.chassis_level,

        power_level:
          levels.power_level,

        reliability_level:
          levels.reliability_level,

        total_spent:
          totalSpent,

        last_ai_development_round:
          round,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        bot.id
      );

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }
  }
}

function generateWeatherEvents(
  rng: () => number
): RaceEvent[] {
  if (rng() >= 0.2) {
    return [];
  }

  const startLap =
    randomInt(
      rng,
      8,
      42
    );

  const intensity =
    rng() < 0.33
      ? "heavy"
      : "light";

  const events: RaceEvent[] = [
    {
      event_type:
        "rain_start",

      event_lap:
        startLap,

      duration_laps: 0,

      message:
        intensity === "heavy"
          ? "Yoğun yağmur başladı. Pist hızla ıslanıyor."
          : "Yağmur başladı. Pist yüzeyi kayganlaşıyor.",

      meta: {
        intensity,
      },
    },
  ];

  if (rng() < 0.72) {
    const stopLap =
      Math.min(
        68,

        startLap +
          randomInt(
            rng,
            12,
            28
          )
      );

    events.push({
      event_type:
        "rain_stop",

      event_lap:
        stopLap,

      duration_laps: 0,

      message:
        "Yağmur durdu. Pist kurumaya başlıyor.",

      meta: {},
    });
  }

  return events;
}

function getRainInfo(
  events: RaceEvent[]
) {
  const start =
    events.find(
      (event) =>
        event.event_type ===
        "rain_start"
    );

  if (!start) {
    return {
      rainy: false,
      wetFraction: 0,
      intensity: "none",
    };
  }

  const stop =
    events.find(
      (event) =>
        event.event_type ===
          "rain_stop" &&
        event.event_lap >
          start.event_lap
    );

  const endLap =
    stop?.event_lap ??
    70;

  return {
    rainy: true,

    wetFraction:
      Math.max(
        0,
        endLap -
          start.event_lap
      ) / 70,

    intensity:
      String(
        start.meta
          ?.intensity ??
          "light"
      ),
  };
}

function generateAiStrategy({
  difficulty,
  driver,
  round,
  rainy,
  rng,
}: {
  difficulty: Difficulty;

  driver: DriverStats;

  round: number;

  rainy: boolean;

  rng: () => number;
}): RaceStrategy {
  const idealPit =
    18 +
    ((round * 3) % 12);

  let pitError = 0;

  if (
    difficulty === "easy"
  ) {
    pitError =
      randomInt(
        rng,
        -11,
        11
      );
  }

  if (
    difficulty === "normal"
  ) {
    pitError =
      randomInt(
        rng,
        -6,
        6
      );
  }

  if (
    difficulty === "hard"
  ) {
    pitError =
      randomInt(
        rng,
        -3,
        3
      );
  }

  if (
    difficulty === "expert"
  ) {
    pitError =
      randomInt(
        rng,
        -1,
        1
      );
  }

  let starting_tire:
    | "soft"
    | "medium"
    | "hard";

  let second_tire:
    | "soft"
    | "medium"
    | "hard";

  if (
    difficulty === "easy"
  ) {
    const tires = [
      "soft",
      "medium",
      "hard",
    ] as const;

    starting_tire =
      pickRandom(
        rng,
        [...tires]
      );

    second_tire =
      pickRandom(
        rng,
        [...tires]
      );
  } else if (
    difficulty ===
    "normal"
  ) {
    const plans = [
      [
        "soft",
        "hard",
      ],
      [
        "medium",
        "hard",
      ],
      [
        "soft",
        "medium",
      ],
    ] as const;

    const plan =
      pickRandom(
        rng,
        [...plans]
      );

    starting_tire =
      plan[0];

    second_tire =
      plan[1];
  } else if (
    difficulty ===
    "hard"
  ) {
    if (rng() < 0.68) {
      starting_tire =
        "soft";

      second_tire =
        "hard";
    } else {
      starting_tire =
        "medium";

      second_tire =
        "hard";
    }
  } else {
    starting_tire =
      "soft";

    second_tire =
      "hard";
  }

  let baseAggression =
    58 +
    (driver.racecraft -
      90) *
      1.1 +
    (driver.consistency -
      90) *
      0.35;

  if (rainy) {
    baseAggression -=
      5 +
      Math.max(
        0,
        92 -
          driver.wet
      ) *
        0.7;
  }

  let aggressionNoise = 0;

  if (
    difficulty === "easy"
  ) {
    aggressionNoise =
      randomInt(
        rng,
        -25,
        25
      );
  }

  if (
    difficulty ===
    "normal"
  ) {
    aggressionNoise =
      randomInt(
        rng,
        -12,
        12
      );
  }

  if (
    difficulty === "hard"
  ) {
    aggressionNoise =
      randomInt(
        rng,
        -6,
        6
      );
  }

  if (
    difficulty ===
    "expert"
  ) {
    aggressionNoise =
      randomInt(
        rng,
        -2,
        2
      );
  }

  return {
    starting_tire,

    second_tire,

    pit_lap:
      clamp(
        idealPit +
          pitError,
        5,
        60
      ),

    aggression:
      Math.round(
        clamp(
          baseAggression +
            aggressionNoise,
          25,
          90
        )
      ),
  };
}

function determineIncident({
  reliabilityLevel,
  aggression,
  fieldSize,
  rainy,
  driver,
  rng,
}: {
  reliabilityLevel: number;

  aggression: number;

  fieldSize: number;

  rainy: boolean;

  driver: DriverStats;

  rng: () => number;
}): Incident | null {
  if (rng() < 0.0015) {
    const event =
      pickRandom(
        rng,
        EASTER_EGGS
      );

    return {
      incident_type:
        "easter_egg",

      incident_key:
        event.key,

      incident_message:
        event.message,

      incident_lap:
        randomInt(
          rng,
          5,
          62
        ),
    };
  }

  const mechanicalChance =
    Math.max(
      0.006,

      0.028 -
        (reliabilityLevel -
          1) *
          0.0024
    );

  if (
    rng() <
    mechanicalChance
  ) {
    return {
      incident_type:
        "mechanical",

      incident_key:
        "mechanical",

      incident_message:
        "Mekanik arıza nedeniyle araç yarış dışı kaldı.",

      incident_lap:
        randomInt(
          rng,
          5,
          62
        ),
    };
  }

  const inconsistency =
    Math.max(
      0,
      95 -
        driver.consistency
    );

  const aggressionRisk =
    Math.max(
      0,
      aggression - 60
    );

  let driverErrorChance =
    0.0025 +
    inconsistency *
      0.00032 +
    aggressionRisk *
      0.0003;

  if (rainy) {
    driverErrorChance +=
      0.001 +
      Math.max(
        0,
        95 -
          driver.wet
      ) *
        0.00028;
  }

  if (
    rng() <
    driverErrorChance
  ) {
    return {
      incident_type:
        "driver_error",

      incident_key:
        "driver_error",

      incident_message:
        "Pilot kontrolü kaybetti ve araç yarışa devam edemedi.",

      incident_lap:
        randomInt(
          rng,
          5,
          62
        ),
    };
  }

  if (fieldSize > 1) {
    let collisionChance =
      0.006 +
      Math.max(
        0,
        aggression - 70
      ) *
        0.00028 -
      Math.max(
        0,
        driver.racecraft -
          85
      ) *
        0.00018;

    collisionChance =
      Math.max(
        0.0015,
        collisionChance
      );

    if (rainy) {
      collisionChance +=
        Math.max(
          0,
          94 -
            driver.wet
        ) *
        0.00012;
    }

    if (
      rng() <
      collisionChance
    ) {
      return {
        incident_type:
          "collision",

        incident_key:
          "collision",

        incident_message:
          "Geçiş mücadelesinde temas yaşandı. Araç yarış dışı kaldı.",

        incident_lap:
          randomInt(
            rng,
            4,
            60
          ),
      };
    }
  }

  return null;
}

function generateSafetyCarEvent({
  incidents,
  rng,
}: {
  incidents: Array<
    Incident | null
  >;

  rng: () => number;
}): RaceEvent | null {
  const realIncidents =
    incidents.filter(
      (
        incident
      ): incident is Incident =>
        !!incident
    );

  const collision =
    realIncidents.find(
      (incident) =>
        incident.incident_type ===
        "collision"
    );

  let chance = 0.12;

  if (
    realIncidents.length >
    0
  ) {
    chance = 0.35;
  }

  if (collision) {
    chance = 0.55;
  }

  if (rng() >= chance) {
    return null;
  }

  let eventLap =
    randomInt(
      rng,
      10,
      55
    );

  if (
    realIncidents.length >
      0 &&
    rng() < 0.72
  ) {
    eventLap =
      realIncidents
        .sort(
          (a, b) =>
            a.incident_lap -
            b.incident_lap
        )[0]
        .incident_lap;
  }

  return {
    event_type:
      "safety_car",

    event_lap:
      eventLap,

    duration_laps:
      randomInt(
        rng,
        4,
        8
      ),

    message:
      "Pist üzerindeki olay nedeniyle Safety Car piste çıktı.",

    meta: {},
  };
}

function getTireBonus(
  startingTire: string,
  secondTire: string
) {
  let bonus = 0;

  if (
    startingTire ===
    "soft"
  ) {
    bonus += 0.8;
  }

  if (
    startingTire ===
    "medium"
  ) {
    bonus += 0.4;
  }

  if (
    startingTire ===
    "hard"
  ) {
    bonus -= 0.2;
  }

  if (
    secondTire ===
    "hard"
  ) {
    bonus += 0.4;
  }

  if (
    secondTire ===
    "medium"
  ) {
    bonus += 0.2;
  }

  return bonus;
}

function getDriverDryBonus(
  driver: DriverStats
) {
  return (
    (driver.pace - 90) *
      0.3 +
    (driver.racecraft -
      90) *
      0.15 +
    (driver.consistency -
      90) *
      0.08
  );
}

function getRainAdjustment({
  driver,
  aggression,
  weatherEvents,
}: {
  driver: DriverStats;

  aggression: number;

  weatherEvents: RaceEvent[];
}) {
  const rain =
    getRainInfo(
      weatherEvents
    );

  if (!rain.rainy) {
    return 0;
  }

  const intensity =
    rain.intensity ===
    "heavy"
      ? 1.35
      : 1;

  const wetSkill =
    (driver.wet - 90) *
    0.32 *
    rain.wetFraction *
    intensity;

  const aggressionPenalty =
    Math.max(
      0,
      aggression - 62
    ) *
    0.055 *
    rain.wetFraction *
    intensity *
    Math.max(
      0.25,

      1 -
        Math.max(
          0,
          driver.wet - 85
        ) /
          20
    );

  return (
    wetSkill -
    aggressionPenalty
  );
}

function getRandomPerformance(
  driver: DriverStats,
  rng: () => number
) {
  const consistency =
    clamp(
      driver.consistency,
      80,
      100
    );

  const spread =
    6 -
    (consistency - 80) *
      0.15;

  return (
    (rng() - 0.5) *
    spread *
    2
  );
}

function calculatePerformance({
  teamRating,
  driver,
  startingTire,
  secondTire,
  pitLap,
  aggression,
  round,
  weatherEvents,
  rng,
}: {
  teamRating: number;

  driver: DriverStats;

  startingTire: string;
  secondTire: string;

  pitLap: number;
  aggression: number;

  round: number;

  weatherEvents: RaceEvent[];

  rng: () => number;
}) {
  const idealPitLap =
    18 +
    ((round * 3) % 12);

  const pitPenalty =
    Math.min(
      4,

      Math.abs(
        pitLap -
          idealPitLap
      ) * 0.2
    );

  const racecraftFactor =
    0.8 +
    Math.max(
      0,
      driver.racecraft - 80
    ) /
      100;

  const aggressionBonus =
    ((aggression - 50) /
      50) *
    2.5 *
    racecraftFactor;

  return (
    teamRating +
    getDriverDryBonus(
      driver
    ) +
    aggressionBonus +
    getTireBonus(
      startingTire,
      secondTire
    ) +
    getRainAdjustment({
      driver,
      aggression,
      weatherEvents,
    }) -
    pitPenalty +
    getRandomPerformance(
      driver,
      rng
    )
  );
}

async function reconcileSeason(
  admin: ReturnType<
    typeof createAdminClient
  >,
  lobbyId: string,
  completedRound: number
) {
  const {
    data: allResults,
    error: resultsError,
  } = await admin
    .from(
      "manager_race_results"
    )
    .select(`
      user_id,
      bot_key,
      is_bot,
      position,
      points,
      finish_status
    `)
    .eq(
      "lobby_id",
      lobbyId
    );

  if (resultsError) {
    throw new Error(
      resultsError.message
    );
  }

  const {
    data: states,
    error: statesError,
  } = await admin
    .from(
      "manager_team_states"
    )
    .select(`
      id,
      user_id,
      bot_key,
      is_bot
    `)
    .eq(
      "lobby_id",
      lobbyId
    );

  if (statesError) {
    throw new Error(
      statesError.message
    );
  }

  for (const state of
    states ?? []) {
    const ownResults =
      (
        allResults ?? []
      ).filter(
        (result) =>
          state.is_bot
            ? result.is_bot &&
              result.bot_key ===
                state.bot_key
            : !result.is_bot &&
              result.user_id ===
                state.user_id
      );

    const points =
      ownResults.reduce(
        (sum, result) =>
          sum +
          Number(
            result.points
          ),
        0
      );

    const wins =
      ownResults.filter(
        (result) =>
          result.position ===
            1 &&
          result.finish_status ===
            "finished"
      ).length;

    const podiums =
      ownResults.filter(
        (result) =>
          result.position <=
            3 &&
          result.finish_status ===
            "finished"
      ).length;

    const {
      error: updateError,
    } = await admin
      .from(
        "manager_team_states"
      )
      .update({
        season_points:
          points,

        wins,
        podiums,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        state.id
      );

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }
  }

  await admin
    .from(
      "manager_races"
    )
    .update({
      status:
        "finished",

      completed_at:
        new Date().toISOString(),
    })
    .eq(
      "lobby_id",
      lobbyId
    )
    .eq(
      "round",
      completedRound
    );

  const {
    data: nextRace,
  } = await admin
    .from(
      "manager_races"
    )
    .select(`
      id,
      round,
      name,
      country,
      status
    `)
    .eq(
      "lobby_id",
      lobbyId
    )
    .gt(
      "round",
      completedRound
    )
    .order(
      "round",
      {
        ascending: true,
      }
    )
    .limit(1)
    .maybeSingle();

  if (nextRace) {
    await admin
      .from(
        "manager_seasons"
      )
      .update({
        current_round:
          nextRace.round,

        status:
          "active",

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "lobby_id",
        lobbyId
      );

    return {
      seasonFinished:
        false,

      nextRound:
        nextRace.round,

      nextRace,
    };
  }

  await admin
    .from(
      "manager_seasons"
    )
    .update({
      current_round:
        completedRound +
        1,

      status:
        "finished",

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "lobby_id",
      lobbyId
    );

  return {
    seasonFinished:
      true,

    nextRound: null,
    nextRace: null,
  };
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  try {
    const { lobbyId } =
      await context.params;

    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Giriş yapmalısın.",
        },
        {
          status: 401,
        }
      );
    }

    const admin =
      createAdminClient();

    const {
      data: lobby,
      error: lobbyError,
    } = await admin
      .from(
        "manager_lobbies"
      )
      .select(`
        id,
        created_by,
        status,
        ai_difficulty
      `)
      .eq(
        "id",
        lobbyId
      )
      .maybeSingle();

    if (
      lobbyError ||
      !lobby
    ) {
      return NextResponse.json(
        {
          error:
            "Lobi bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      lobby.created_by !==
      user.id
    ) {
      return NextResponse.json(
        {
          error:
            "Yarışı yalnızca lobi sahibi başlatabilir.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      lobby.status !==
      "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Manager sezonu aktif değil.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: season,
    } = await admin
      .from(
        "manager_seasons"
      )
      .select(`
        current_round,
        status
      `)
      .eq(
        "lobby_id",
        lobbyId
      )
      .maybeSingle();

    if (!season) {
      return NextResponse.json(
        {
          error:
            "Sezon bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      season.status ===
      "finished"
    ) {
      return NextResponse.json(
        {
          error:
            "Sezon tamamlandı.",
        },
        {
          status: 400,
        }
      );
    }

    const round =
      season.current_round;

    const rng =
      createRng(
        `${lobbyId}:${round}:ai-grid-v1`
      );

    const {
      data: race,
    } = await admin
      .from(
        "manager_races"
      )
      .select(`
        id,
        round,
        name,
        country,
        status
      `)
      .eq(
        "lobby_id",
        lobbyId
      )
      .eq(
        "round",
        round
      )
      .maybeSingle();

    if (!race) {
      return NextResponse.json(
        {
          error:
            "Yarış bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    /*
      SONUÇ ZATEN VARSA
      R&D'Yİ TEKRAR ÇALIŞTIRMA.
    */

    const {
      data:
        existingResults,
    } = await admin
      .from(
        "manager_race_results"
      )
      .select("id")
      .eq(
        "lobby_id",
        lobbyId
      )
      .eq(
        "round",
        round
      );

    if (
      existingResults &&
      existingResults.length >
        0
    ) {
      await reconcileSeason(
        admin,
        lobbyId,
        round
      );

      return NextResponse.json({
        ok: true,

        next:
          `/arcade/manager/lobbies/${lobbyId}/game/live-race?round=${round}`,
      });
    }

    /*
      AI R&D

      Yarış simülasyonu başlamadan
      hemen önce her bot o round için
      yatırım kararını verir.

      Aynı round tekrar çağrılsa bile
      last_ai_development_round
      tekrar yatırım yapılmasını
      engeller.
    */

    await applyAiDevelopment(
      admin,
      lobbyId,
      round,
      (lobby.ai_difficulty ??
        "normal") as Difficulty
    );

    const {
      data: members,
      error: membersError,
    } = await admin
      .from(
        "manager_lobby_members"
      )
      .select(`
        user_id,
        team_key,
        driver_key,
        status
      `)
      .eq(
        "lobby_id",
        lobbyId
      )
      .eq(
        "status",
        "active"
      );

    if (membersError) {
      return NextResponse.json(
        {
          error:
            membersError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
      R&D SONRASI YENİ GÜÇ
      DEĞERLERİNİ OKUYORUZ.
    */

    const {
      data: teamStates,
      error:
        teamStatesError,
    } = await admin
      .from(
        "manager_team_states"
      )
      .select(`
        id,
        user_id,
        team_key,
        driver_key,
        team_rating,
        reliability_level,
        is_bot,
        bot_key,
        bot_name,
        ai_difficulty
      `)
      .eq(
        "lobby_id",
        lobbyId
      );

    if (
      teamStatesError
    ) {
      return NextResponse.json(
        {
          error:
            teamStatesError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      !teamStates ||
      teamStates.length ===
        0
    ) {
      return NextResponse.json(
        {
          error:
            "Grid oluşturulmamış.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: strategies,
      error:
        strategiesError,
    } = await admin
      .from(
        "manager_race_strategies"
      )
      .select(`
        user_id,
        starting_tire,
        second_tire,
        pit_lap,
        aggression
      `)
      .eq(
        "lobby_id",
        lobbyId
      )
      .eq(
        "round",
        round
      );

    if (
      strategiesError
    ) {
      return NextResponse.json(
        {
          error:
            strategiesError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
      SADECE İNSAN OYUNCULARIN
      STRATEJİ KAYDI ZORUNLU.
    */

    const missing =
      (members ?? []).filter(
        (member) =>
          !strategies?.some(
            (strategy) =>
              strategy.user_id ===
              member.user_id
          )
      );

    if (
      missing.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            `${missing.length} oyuncu henüz stratejisini kaydetmedi.`,
        },
        {
          status: 400,
        }
      );
    }

    const weatherEvents =
      generateWeatherEvents(
        rng
      );

    const rain =
      getRainInfo(
        weatherEvents
      );

    const participants =
      teamStates
        .map(
          (state) => {
            if (
              state.is_bot
            ) {
              return {
                participantKey:
                  state.bot_key ??
                  state.id,

                isBot: true,

                userId:
                  null as
                    | string
                    | null,

                botKey:
                  state.bot_key,

                botName:
                  state.bot_name ??
                  "AI Manager",

                teamKey:
                  state.team_key,

                driverKey:
                  state.driver_key,

                state,
              };
            }

            const member =
              members?.find(
                (item) =>
                  item.user_id ===
                  state.user_id
              );

            if (!member) {
              return null;
            }

            return {
              participantKey:
                member.user_id,

              isBot: false,

              userId:
                member.user_id,

              botKey: null,

              botName: null,

              teamKey:
                member.team_key ??
                state.team_key,

              driverKey:
                member.driver_key ??
                state.driver_key,

              state,
            };
          }
        )
        .filter(
          (
            participant
          ): participant is NonNullable<
            typeof participant
          > =>
            !!participant
        )
        .sort(
          (a, b) =>
            a.participantKey.localeCompare(
              b.participantKey
            )
        );

    const simulated =
      participants.map(
        (participant) => {
          const driver =
            getDriver(
              participant.driverKey
            );

          let strategy:
            RaceStrategy;

          if (
            participant.isBot
          ) {
            strategy =
              generateAiStrategy({
                difficulty:
                  (participant
                    .state
                    .ai_difficulty ??
                    lobby.ai_difficulty ??
                    "normal") as Difficulty,

                driver,

                round,

                rainy:
                  rain.rainy,

                rng,
              });
          } else {
            const humanStrategy =
              strategies?.find(
                (item) =>
                  item.user_id ===
                  participant.userId
              );

            if (
              !humanStrategy
            ) {
              throw new Error(
                "Oyuncunun stratejisi bulunamadı."
              );
            }

            strategy = {
              starting_tire:
                humanStrategy.starting_tire,

              second_tire:
                humanStrategy.second_tire,

              pit_lap:
                Number(
                  humanStrategy.pit_lap
                ),

              aggression:
                Number(
                  humanStrategy.aggression
                ),
            };
          }

          const incident =
            determineIncident({
              reliabilityLevel:
                Number(
                  participant
                    .state
                    .reliability_level
                ),

              aggression:
                strategy.aggression,

              fieldSize:
                participants.length,

              rainy:
                rain.rainy,

              driver,

              rng,
            });

          const performance =
            calculatePerformance({
              teamRating:
                Number(
                  participant
                    .state
                    .team_rating
                ),

              driver,

              startingTire:
                strategy.starting_tire,

              secondTire:
                strategy.second_tire,

              pitLap:
                strategy.pit_lap,

              aggression:
                strategy.aggression,

              round,

              weatherEvents,

              rng,
            });

          return {
            ...participant,

            driver,
            strategy,
            incident,

            finish_status:
              incident
                ? "dnf"
                : "finished",

            performance_score:
              performance,
          };
        }
      );

    const safetyCar =
      generateSafetyCarEvent({
        incidents:
          simulated.map(
            (item) =>
              item.incident
          ),

        rng,
      });

    const raceEvents = [
      ...weatherEvents,

      ...(safetyCar
        ? [safetyCar]
        : []),
    ].sort(
      (a, b) =>
        a.event_lap -
        b.event_lap
    );

    if (
      raceEvents.length > 0
    ) {
      const {
        error:
          eventError,
      } = await admin
        .from(
          "manager_race_events"
        )
        .upsert(
          raceEvents.map(
            (event) => ({
              lobby_id:
                lobbyId,

              round,

              event_type:
                event.event_type,

              event_lap:
                event.event_lap,

              duration_laps:
                event.duration_laps,

              message:
                event.message,

              meta:
                event.meta,
            })
          ),
          {
            onConflict:
              "lobby_id,round,event_type,event_lap",

            ignoreDuplicates:
              true,
          }
        );

      if (eventError) {
        return NextResponse.json(
          {
            error:
              eventError.message,
          },
          {
            status: 500,
          }
        );
      }
    }

    simulated.sort(
      (a, b) => {
        if (
          a.finish_status !==
          b.finish_status
        ) {
          return a.finish_status ===
            "finished"
            ? -1
            : 1;
        }

        if (
          a.finish_status ===
            "dnf" &&
          b.finish_status ===
            "dnf"
        ) {
          return (
            (b.incident
              ?.incident_lap ??
              0) -
            (a.incident
              ?.incident_lap ??
              0)
          );
        }

        return (
          b.performance_score -
          a.performance_score
        );
      }
    );

    const rows =
      simulated.map(
        (
          item,
          index
        ) => {
          const position =
            index + 1;

          return {
            lobby_id:
              lobbyId,

            round,

            user_id:
              item.userId,

            is_bot:
              item.isBot,

            bot_key:
              item.botKey,

            bot_name:
              item.botName,

            team_key:
              item.teamKey,

            driver_key:
              item.driver.key,

            position,

            points:
              item.finish_status ===
              "finished"
                ? POINTS[
                    position -
                      1
                  ] ?? 0
                : 0,

            finish_status:
              item.finish_status,

            performance_score:
              Number(
                item.performance_score.toFixed(
                  3
                )
              ),

            team_rating:
              Number(
                item.state
                  .team_rating
              ),

            starting_tire:
              item.strategy
                .starting_tire,

            second_tire:
              item.strategy
                .second_tire,

            pit_lap:
              item.strategy
                .pit_lap,

            aggression:
              item.strategy
                .aggression,

            incident_type:
              item.incident
                ?.incident_type ??
              null,

            incident_key:
              item.incident
                ?.incident_key ??
              null,

            incident_message:
              item.incident
                ?.incident_message ??
              null,

            incident_lap:
              item.incident
                ?.incident_lap ??
              null,
          };
        }
      );

    const {
      error: insertError,
    } = await admin
      .from(
        "manager_race_results"
      )
      .insert(rows);

    if (insertError) {
      console.error(
        "AI RACE INSERT:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            insertError.message,
        },
        {
          status: 500,
        }
      );
    }

    await reconcileSeason(
      admin,
      lobbyId,
      round
    );

    return NextResponse.json({
      ok: true,

      round,

      next:
        `/arcade/manager/lobbies/${lobbyId}/game/live-race?round=${round}`,
    });
  } catch (error) {
    console.error(
      "RACE SIMULATION:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Yarış simüle edilemedi.",
      },
      {
        status: 500,
      }
    );
  }
}