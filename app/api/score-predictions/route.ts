
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { openF1Request } from "@/lib/openf1-auth";

import {
  calculatePredictionScore,
  calculateRaceExtraScore,
  getPodiumFromResults,
  type RaceBulletinActuals,
  type RaceBulletinAnswers,
  type RaceSpecialActuals,
  type RaceSpecialPicks,
} from "@/lib/prediction-scoring";

export const dynamic = "force-dynamic";

type PredictionType = "race" | "sprint";

type JolpicaResult = {
  number: string;
  position: string;
  grid?: string;
  laps?: string;
  status?: string;
  Constructor?: {
    name?: string;
  };
  Time?: {
    time?: string;
    millis?: string;
  };
  FastestLap?: {
    rank?: string;
    lap?: string;
    Time?: {
      time?: string;
    };
  };
};

type JolpicaRace = {
  season: string;
  round: string;
  raceName: string;
  date?: string;
  Sprint?: {
    date?: string;
    time?: string;
  };
  Circuit?: {
    circuitName?: string;
    Location?: {
      locality?: string;
      country?: string;
    };
  };
  Results?: JolpicaResult[];
  SprintResults?: JolpicaResult[];
};

type JolpicaResponse = {
  MRData?: {
    RaceTable?: {
      Races?: JolpicaRace[];
    };
  };
};

type OpenMeeting = {
  meeting_key: number;
  meeting_name?: string;
  location?: string;
  country_name?: string;
  date_start?: string;
};

type OpenSession = {
  session_key: number;
  session_name?: string;
  session_type?: string;
  date_start?: string;
  date_end?: string;
};

type RaceControl = {
  category?: string;
  flag?: string;
  message?: string;
  lap_number?: number | null;
};

type Weather = {
  rainfall?: number;
};

type Position = {
  driver_number: number;
  position: number;
};

type SessionResult = {
  driver_number: number;
  position: number | null;
  number_of_laps?: number;
  dnf?: boolean;
  dns?: boolean;
  dsq?: boolean;
  gap_to_leader?:
    | number
    | string
    | (number | string | null)[]
    | null;
};

type Podium = NonNullable<
  ReturnType<typeof getPodiumFromResults>
>;

type ScoringResult =
  | {
      ok: true;
      type: PredictionType;
      race: JolpicaRace;
      rawResults: JolpicaResult[];
      podium: Podium;
      season: number;
      round: number;
      source: "jolpica" | "openf1";
    }
  | {
      ok: false;
      type: PredictionType;
      reason: string;
    };

function clean(
  value: string | null | undefined
): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/grand prix/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function fetchJolpica(
  url: string
): Promise<JolpicaResponse> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "F1-Medipol-Website/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Jolpica HTTP ${response.status}`
    );
  }

  return (await response.json()) as JolpicaResponse;
}

async function fetchOpenArray<T>(
  path: string
): Promise<T[] | null> {
  try {
    const response = await openF1Request(path, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(
        "PREDICTION OpenF1 HTTP:",
        path,
        response.status
      );

      return null;
    }

    const data: unknown = await response.json();

    return Array.isArray(data)
      ? (data as T[])
      : null;
  } catch (error) {
    console.error(
      "PREDICTION OpenF1 FETCH:",
      path,
      error
    );

    return null;
  }
}

function resultFromJolpica(
  type: PredictionType,
  race: JolpicaRace | undefined
): ScoringResult {
  if (!race) {
    return {
      ok: false,
      type,
      reason: "Tamamlanmış sonuç bulunamadı.",
    };
  }

  const rawResults =
    type === "race"
      ? (race.Results ?? [])
      : (race.SprintResults ?? []);

  const podium = getPodiumFromResults(
    rawResults.map((item) => ({
      driver_number: Number(item.number),
      position: Number(item.position),
    }))
  );

  if (!podium) {
    return {
      ok: false,
      type,
      reason: "Podyum sonucu hazır değil.",
    };
  }

  const season = Number(race.season);
  const round = Number(race.round);

  if (
    !Number.isInteger(season) ||
    !Number.isInteger(round) ||
    round < 1
  ) {
    return {
      ok: false,
      type,
      reason:
        "Sonuç sezon veya tur bilgisi geçersiz.",
    };
  }

  return {
    ok: true,
    type,
    race,
    rawResults,
    podium,
    season,
    round,
    source: "jolpica",
  };
}

async function getJolpicaResult(
  type: PredictionType
): Promise<ScoringResult> {
  const url =
    type === "race"
      ? "https://api.jolpi.ca/ergast/f1/current/last/results/"
      : "https://api.jolpi.ca/ergast/f1/current/sprint/";

  try {
    const data = await fetchJolpica(url);

    const races =
      data.MRData?.RaceTable?.Races ?? [];

    const race =
      type === "race"
        ? races[0]
        : races.at(-1);

    return resultFromJolpica(type, race);
  } catch (error) {
    return {
      ok: false,
      type,
      reason:
        error instanceof Error
          ? error.message
          : "Jolpica sonucu alınamadı.",
    };
  }
}

async function getOpenF1SprintResult():
  Promise<ScoringResult> {
  const type = "sprint" as const;

  try {
    const season = new Date().getUTCFullYear();

    const calendar = await fetchJolpica(
      `https://api.jolpi.ca/ergast/f1/${season}/races/?limit=100`
    );

    const now = Date.now();

    const sprintRaces = (
      calendar.MRData?.RaceTable?.Races ?? []
    )
      .filter((race) => {
        if (!race.Sprint?.date) {
          return false;
        }

        const sprintDay = Date.parse(
          `${race.Sprint.date}T00:00:00Z`
        );

        return (
          Number.isFinite(sprintDay) &&
          sprintDay < now
        );
      })
      .sort(
        (a, b) =>
          Number(b.round) - Number(a.round)
      );

    if (sprintRaces.length === 0) {
      return {
        ok: false,
        type,
        reason:
          "Tamamlanmış Sprint takvimde bulunamadı.",
      };
    }

    const sessions =
      await fetchOpenArray<OpenSession>(
        `sessions?year=${season}&session_name=Sprint`
      );

    if (!sessions) {
      return {
        ok: false,
        type,
        reason:
          "OpenF1 Sprint oturumları alınamadı.",
      };
    }

    for (const race of sprintRaces) {
      const sprintDay = Date.parse(
        `${race.Sprint?.date}T12:00:00Z`
      );

      const session = sessions.find((item) => {
        const start = Date.parse(
          item.date_start ?? ""
        );

        const end = Date.parse(
          item.date_end ?? ""
        );

        return (
          item.session_name === "Sprint" &&
          Number.isFinite(start) &&
          Number.isFinite(end) &&
          Math.abs(start - sprintDay) <=
            36 * 60 * 60 * 1000 &&
          end + 5 * 60 * 1000 < now
        );
      });

      if (!session) {
        continue;
      }

      const results =
        await fetchOpenArray<SessionResult>(
          `session_result?session_key=${session.session_key}`
        );

      if (!results) {
        continue;
      }

      const topThree = results
        .filter(
          (item) =>
            Number.isInteger(item.position) &&
            item.position !== null &&
            item.position >= 1 &&
            item.position <= 3
        )
        .sort(
          (a, b) =>
            (a.position ?? 999) -
            (b.position ?? 999)
        );

      const validPodium =
        topThree.length === 3 &&
        topThree.every(
          (item, index) =>
            item.position === index + 1 &&
            Number.isInteger(
              item.driver_number
            ) &&
            !item.dnf &&
            !item.dns &&
            !item.dsq
        ) &&
        new Set(
          topThree.map(
            (item) => item.driver_number
          )
        ).size === 3;

      if (!validPodium) {
        continue;
      }

      const podium = getPodiumFromResults(
        topThree.map((item) => ({
          driver_number: item.driver_number,
          position: item.position as number,
        }))
      );

      if (!podium) {
        continue;
      }

      return {
        ok: true,
        type,
        race,
        rawResults: [],
        podium,
        season,
        round: Number(race.round),
        source: "openf1",
      };
    }

    return {
      ok: false,
      type,
      reason:
        "Tamamlanmış OpenF1 Sprint sonucu bulunamadı.",
    };
  } catch (error) {
    return {
      ok: false,
      type,
      reason:
        error instanceof Error
          ? error.message
          : "OpenF1 Sprint hatası.",
    };
  }
}

async function fetchResult(
  type: PredictionType
): Promise<ScoringResult> {
  const jolpica = await getJolpicaResult(type);

  if (type === "race") {
    return jolpica;
  }

  // Jolpica eski Sprint sonucunu dondurebilir.
  // Daha yeni OpenF1 sonucunu tercih ediyoruz.
  const openf1 = await getOpenF1SprintResult();

  if (
    openf1.ok &&
    (!jolpica.ok ||
      openf1.round >= jolpica.round)
  ) {
    return openf1;
  }

  return jolpica.ok ? jolpica : openf1;
}

async function findRaceSession(
  race: JolpicaRace
): Promise<OpenSession | null> {
  const year = Number(race.season);

  const meetings =
    await fetchOpenArray<OpenMeeting>(
      `meetings?year=${year}`
    );

  if (!meetings?.length) {
    return null;
  }

  const raceName = clean(race.raceName);

  const country = clean(
    race.Circuit?.Location?.country
  );

  const locality = clean(
    race.Circuit?.Location?.locality
  );

  const raceDate = race.date
    ? Date.parse(`${race.date}T12:00:00Z`)
    : null;

  let best: OpenMeeting | null = null;
  let bestScore = -1;

  for (const meeting of meetings) {
    let score = 0;
    const name = clean(meeting.meeting_name);

    if (
      name &&
      raceName &&
      (name.includes(raceName) ||
        raceName.includes(name))
    ) {
      score += 10;
    }

    if (
      country &&
      clean(meeting.country_name) === country
    ) {
      score += 5;
    }

    if (
      locality &&
      clean(meeting.location).includes(
        locality
      )
    ) {
      score += 5;
    }

    if (raceDate && meeting.date_start) {
      const difference = Math.abs(
        Date.parse(meeting.date_start) -
          raceDate
      );

      if (difference <= 4 * 86400000) {
        score += 8;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = meeting;
    }
  }

  if (!best || bestScore < 8) {
    return null;
  }

  const sessions =
    await fetchOpenArray<OpenSession>(
      `sessions?meeting_key=${best.meeting_key}`
    );

  return (
    sessions?.find(
      (item) =>
        clean(item.session_name) === "race" ||
        clean(item.session_type) === "race"
    ) ?? null
  );
}

function isFullSafetyCar(
  item: RaceControl
) {
  const text =
    `${item.category ?? ""} ` +
    `${item.message ?? ""} ` +
    `${item.flag ?? ""}`;

  const upper = text.toUpperCase();

  return (
    upper.includes("SAFETY CAR") &&
    !upper.includes(
      "VIRTUAL SAFETY CAR"
    ) &&
    !upper.includes("VSC")
  );
}

function isVsc(item: RaceControl) {
  const text =
    `${item.category ?? ""} ` +
    `${item.message ?? ""}`;

  const upper = text.toUpperCase();

  return (
    upper.includes(
      "VIRTUAL SAFETY CAR"
    ) ||
    /\bVSC\b/.test(upper)
  );
}

function isRedFlag(item: RaceControl) {
  const text =
    `${item.flag ?? ""} ` +
    `${item.message ?? ""}`;

  const upper = text.toUpperCase();

  return (
    upper.includes("RED") &&
    (upper.includes("FLAG") ||
      item.flag?.toUpperCase() === "RED")
  );
}

function isIncident(item: RaceControl) {
  const text =
    `${item.category ?? ""} ` +
    `${item.message ?? ""}`;

  const upper = text.toUpperCase();

  return [
    "INCIDENT",
    "COLLISION",
    "CRASH",
    "STOPPED",
    "SPUN",
  ].some((word) => upper.includes(word));
}

function parseGap(
  value: SessionResult["gap_to_leader"]
): number | null {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const number = Number(
      value.replace("+", "")
    );

    return Number.isFinite(number)
      ? number
      : null;
  }

  if (Array.isArray(value)) {
    for (
      let index = value.length - 1;
      index >= 0;
      index -= 1
    ) {
      const parsed = parseGap(
        value[index]
      );

      if (parsed !== null) {
        return parsed;
      }
    }
  }

  return null;
}

function jolpicaGap(
  result: JolpicaResult | undefined
): number | null {
  const text = result?.Time?.time;

  if (!text) {
    return null;
  }

  const match = text.match(
    /\+?([\d.]+)/
  );

  if (!match) {
    return null;
  }

  const value = Number(match[1]);

  return Number.isFinite(value)
    ? value
    : null;
}

function isJolpicaDnf(
  result: JolpicaResult
) {
  const status = (
    result.status ?? ""
  ).trim();

  return Boolean(
    status &&
      status !== "Finished" &&
      !status.startsWith("+")
  );
}

async function buildRaceActuals(
  race: JolpicaRace,
  results: JolpicaResult[]
) {
  const actuals: RaceBulletinActuals = {};
  const specials: RaceSpecialActuals = {};

  const winner = results[0];

  const podiumNumbers = results
    .slice(0, 3)
    .map((item) => Number(item.number));

  const pole = results.find(
    (item) => Number(item.grid) === 1
  );

  const fastest = results.find(
    (item) =>
      item.FastestLap?.rank === "1"
  );

  const fastestNumber = fastest
    ? Number(fastest.number)
    : null;

  actuals.poleWins = Boolean(
    pole &&
      winner &&
      Number(pole.number) ===
        Number(winner.number)
  );

  actuals.fastestOnPodium =
    fastestNumber !== null
      ? podiumNumbers.includes(
          fastestNumber
        )
      : null;

  specials.fastestLap =
    fastestNumber;

  specials.winningTeam =
    winner?.Constructor?.name ?? null;

  const gains = results
    .map((item) => {
      const grid = Number(item.grid);
      const finish = Number(item.position);

      if (
        !Number.isFinite(grid) ||
        grid <= 0 ||
        !Number.isFinite(finish)
      ) {
        return null;
      }

      return {
        driver: Number(item.number),
        gain: grid - finish,
      };
    })
    .filter(
      (
        item
      ): item is {
        driver: number;
        gain: number;
      } => item !== null
    );

  if (gains.length) {
    const maxGain = Math.max(
      ...gains.map((item) => item.gain)
    );

    specials.mostGained = gains
      .filter(
        (item) => item.gain === maxGain
      )
      .map((item) => item.driver);
  }

  const fallbackDnfs = results.filter(
    isJolpicaDnf
  );

  actuals.dnf3 =
    fallbackDnfs.length >= 3;

  if (!fallbackDnfs.length) {
    specials.firstDnf = "NONE";
  } else {
    const minLaps = Math.min(
      ...fallbackDnfs.map(
        (item) =>
          Number(item.laps ?? 999)
      )
    );

    specials.firstDnf = fallbackDnfs
      .filter(
        (item) =>
          Number(item.laps ?? 999) ===
          minLaps
      )
      .map(
        (item) => Number(item.number)
      );
  }

  const fallbackGap = jolpicaGap(
    results[1]
  );

  actuals.margin10 =
    fallbackGap === null
      ? null
      : fallbackGap > 10;

  const session = await findRaceSession(
    race
  );

  if (!session) {
    return {
      actuals,
      specials,
    };
  }

  const [
    raceControl,
    weather,
    positions,
    sessionResults,
  ] = await Promise.all([
    fetchOpenArray<RaceControl>(
      `race_control?session_key=${session.session_key}`
    ),

    fetchOpenArray<Weather>(
      `weather?session_key=${session.session_key}`
    ),

    fetchOpenArray<Position>(
      `position?session_key=${session.session_key}`
    ),

    fetchOpenArray<SessionResult>(
      `session_result?session_key=${session.session_key}`
    ),
  ]);

  if (raceControl !== null) {
    actuals.redFlag =
      raceControl.some(isRedFlag);

    actuals.safetyCar =
      raceControl.some(
        isFullSafetyCar
      );

    actuals.vsc =
      raceControl.some(isVsc);

    actuals.lap1Incident =
      raceControl.some(
        (item) =>
          Number(item.lap_number) === 1 &&
          isIncident(item)
      );

    const totalLaps = Math.max(
      0,
      ...results.map(
        (item) =>
          Number(item.laps ?? 0)
      )
    );

    if (totalLaps > 0) {
      const threshold = Math.max(
        1,
        totalLaps - 9
      );

      actuals.lateNeutral =
        raceControl.some(
          (item) =>
            Number(
              item.lap_number ?? 0
            ) >= threshold &&
            (isFullSafetyCar(item) ||
              isVsc(item))
        );
    }
  }

  if (
    weather !== null &&
    weather.length > 0
  ) {
    actuals.rain = weather.some(
      (item) =>
        Number(
          item.rainfall ?? 0
        ) > 0
    );
  }

  if (
    positions !== null &&
    positions.length > 0
  ) {
    const leaders = new Set(
      positions
        .filter(
          (item) =>
            Number(item.position) === 1
        )
        .map(
          (item) =>
            Number(item.driver_number)
        )
    );

    actuals.leaders4 =
      leaders.size >= 4;

    if (pole && winner) {
      actuals.lightsToFlag =
        leaders.size === 1 &&
        leaders.has(
          Number(pole.number)
        ) &&
        Number(pole.number) ===
          Number(winner.number);
    }
  }

  if (
    sessionResults !== null &&
    sessionResults.length > 0
  ) {
    const dnfs = sessionResults.filter(
      (item) =>
        item.dnf && !item.dns
    );

    actuals.dnf3 =
      dnfs.length >= 3;

    if (!dnfs.length) {
      specials.firstDnf = "NONE";
    } else {
      const minLaps = Math.min(
        ...dnfs.map(
          (item) =>
            Number(
              item.number_of_laps ?? 999
            )
        )
      );

      specials.firstDnf = dnfs
        .filter(
          (item) =>
            Number(
              item.number_of_laps ?? 999
            ) === minLaps
        )
        .map(
          (item) =>
            item.driver_number
        );
    }

    const p2 = sessionResults.find(
      (item) => item.position === 2
    );

    if (p2) {
      const gap = parseGap(
        p2.gap_to_leader
      );

      if (gap !== null) {
        actuals.margin10 =
          gap > 10;
      }
    }
  }

  return {
    actuals,
    specials,
  };
}

async function scoreEvent(
  type: PredictionType,
  dryRun: boolean
) {
  const result = await fetchResult(type);

  if (!result.ok) {
    return {
      type,
      ok: true,
      skipped: true,
      reason: result.reason,
      scored: 0,
    };
  }

  const supabase = createAdminClient();

  const {
    data: predictions,
    error: predictionsError,
  } = await supabase
    .from("predictions")
    .select(
      "id,p1_driver_number,p2_driver_number,p3_driver_number,race_bulletin,special_picks"
    )
    .eq("season", result.season)
    .eq("round", result.round)
    .eq("prediction_type", type);

  if (predictionsError) {
    return {
      type,
      ok: false,
      skipped: false,
      error: predictionsError.message,
      scored: 0,
    };
  }

  if (!predictions?.length) {
    return {
      type,
      ok: true,
      skipped: false,
      event: {
        season: result.season,
        round: result.round,
        raceName: result.race.raceName,
      },
      source: result.source,
      message:
        "Bu etkinlik için kayıtlı tahmin yok.",
      scored: 0,
    };
  }

  let raceActuals: RaceBulletinActuals = {};
  let raceSpecialActuals: RaceSpecialActuals = {};

  if (type === "race") {
    const actual = await buildRaceActuals(
      result.race,
      result.rawResults
    );

    raceActuals = actual.actuals;
    raceSpecialActuals =
      actual.specials;
  }

  const scored = predictions.map(
    (prediction) => {
      const podium =
        calculatePredictionScore(
          {
            P1: Number(
              prediction.p1_driver_number
            ),
            P2: Number(
              prediction.p2_driver_number
            ),
            P3: Number(
              prediction.p3_driver_number
            ),
          },
          result.podium
        );

      if (type === "sprint") {
        return {
          id: prediction.id,
          total: podium.total,
          podiumPoints: podium.total,
          bulletinPoints: 0,
          specialPoints: 0,
          breakdown: {
            type: "sprint",
            podium,
            total: podium.total,
          },
        };
      }

      const extras =
        calculateRaceExtraScore(
          (
            prediction.race_bulletin ??
            {}
          ) as RaceBulletinAnswers,
          (
            prediction.special_picks ??
            {}
          ) as RaceSpecialPicks,
          raceActuals,
          raceSpecialActuals
        );

      const total =
        podium.total + extras.total;

      return {
        id: prediction.id,
        total,
        podiumPoints: podium.total,
        bulletinPoints:
          extras.bulletinPoints,
        specialPoints:
          extras.specialPoints,
        breakdown: {
          type: "race",
          podium,
          bulletin: extras.bulletin,
          special: extras.special,
          actuals: raceActuals,
          specialActuals:
            raceSpecialActuals,
          total,
        },
      };
    }
  );

  const event = {
    season: result.season,
    round: result.round,
    raceName: result.race.raceName,
  };

  // Test modu.
  // Supabase'e herhangi bir puan yazilmaz.
  if (dryRun) {
    return {
      type,
      ok: true,
      dryRun: true,
      skipped: false,
      event,
      source: result.source,
      podium: result.podium,
      wouldScore: scored.length,
      scored: 0,
    };
  }

  // Mevcut puanlarin uzerine ekleme yapilmaz.
  // Hesaplanan puan tahmin kaydina yazilir.
  const updates = await Promise.all(
    scored.map(async (item) => {
      const { error } = await supabase
        .from("predictions")
        .update({
          points: item.total,
          podium_points:
            item.podiumPoints,
          bulletin_points:
            item.bulletinPoints,
          special_points:
            item.specialPoints,
          score_breakdown:
            item.breakdown,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", item.id);

      return {
        ...item,
        error:
          error?.message ?? null,
      };
    })
  );

  const failed = updates.filter(
    (item) => item.error
  );

  if (failed.length) {
    return {
      type,
      ok: false,
      skipped: false,
      error:
        "Bazı tahminlerin puanı kaydedilemedi.",
      failed,
      scored:
        updates.length -
        failed.length,
    };
  }

  return {
    type,
    ok: true,
    skipped: false,
    event,
    source: result.source,
    podium: result.podium,
    raceActuals:
      type === "race"
        ? raceActuals
        : undefined,
    raceSpecialActuals:
      type === "race"
        ? raceSpecialActuals
        : undefined,
    scored: updates.length,
    results: updates,
  };
}

export async function GET(
  request: Request
) {
  const cronSecret =
    process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "CRON_SECRET tanımlı değil.",
      },
      {
        status: 500,
      }
    );
  }

  if (
    request.headers.get(
      "authorization"
    ) !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Yetkisiz istek.",
      },
      {
        status: 401,
      }
    );
  }

  const dryRun =
    new URL(request.url)
      .searchParams.get("dryRun") ===
    "1";

  try {
    const [race, sprint] =
      await Promise.all([
        scoreEvent("race", dryRun),
        scoreEvent("sprint", dryRun),
      ]);

    const hasError =
      !race.ok || !sprint.ok;

    return NextResponse.json(
      {
        ok: !hasError,
        dryRun,
        race,
        sprint,
        totalScored:
          race.scored + sprint.scored,
      },
      {
        status:
          hasError ? 500 : 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "PREDICTION SCORE ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Bilinmeyen sunucu hatası.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
