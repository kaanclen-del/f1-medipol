
import { NextResponse } from "next/server";
import { openF1Request } from "@/lib/openf1-auth";

export const dynamic = "force-dynamic";

type JolpicaDriver = {
  driverId?: string;
  permanentNumber?: string;
  code?: string;
  givenName?: string;
  familyName?: string;
};

type JolpicaStanding = {
  position?: string;
  points?: string;
  wins?: string;
  Driver?: JolpicaDriver;
  Constructors?: Array<{ name?: string }>;
};

type JolpicaStandingsResponse = {
  MRData?: {
    StandingsTable?: {
      season?: string;
      round?: string;
      StandingsLists?: Array<{
        season?: string;
        round?: string;
        DriverStandings?: JolpicaStanding[];
      }>;
    };
  };
};

type JolpicaCalendarResponse = {
  MRData?: {
    RaceTable?: {
      Races?: Array<{
        round?: string;
        Sprint?: {
          date?: string;
          time?: string;
        };
      }>;
    };
  };
};

type OpenF1Session = {
  session_key?: number;
  session_name?: string;
  date_start?: string;
  date_end?: string;
  is_cancelled?: boolean;
};

type OpenF1Result = {
  driver_number?: number;
  position?: number | null;
  dnf?: boolean;
  dns?: boolean;
  dsq?: boolean;
};

export type ChampionshipStanding = {
  position: number;
  points: number;
  wins: number;
  driverId: string;
  driverNumber: number | null;
  acronym: string;
  givenName: string;
  familyName: string;
  fullName: string;
  constructor: string;
};

const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

const HOUR_MS = 60 * 60 * 1000;

function safeNumber(
  value: string | number | undefined | null,
  fallback = 0
) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

async function getJolpica<T>(
  path: string,
  revalidate: number
): Promise<T> {
  const response = await fetch(
    `https://api.jolpi.ca/ergast/f1/${path}`,
    {
      headers: {
        "User-Agent": "F1Medipol/1.0 NextJS",
      },
      next: {
        revalidate,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Jolpica HTTP ${response.status}: ${path}`
    );
  }

  return (await response.json()) as T;
}

function makeStandings(
  raw: JolpicaStanding[]
): ChampionshipStanding[] {
  return raw
    .map((item) => {
      const driver = item.Driver ?? {};

      const number = driver.permanentNumber
        ? Number(driver.permanentNumber)
        : null;

      return {
        position: safeNumber(item.position, 999),

        points: safeNumber(item.points),

        wins: safeNumber(item.wins),

        driverId: driver.driverId ?? "",

        driverNumber:
          number !== null && Number.isFinite(number)
            ? number
            : null,

        acronym: (driver.code ?? "").toUpperCase(),

        givenName: driver.givenName ?? "",

        familyName: driver.familyName ?? "",

        fullName: [
          driver.givenName,
          driver.familyName,
        ]
          .filter(Boolean)
          .join(" "),

        constructor:
          item.Constructors?.at(-1)?.name ?? "",
      };
    })
    .sort((a, b) => a.position - b.position);
}

function completedTopEight(
  results: OpenF1Result[]
): OpenF1Result[] | null {
  const topEight = results
    .filter((result) => {
      const position = result.position;

      return (
        typeof position === "number" &&
        Number.isInteger(position) &&
        position >= 1 &&
        position <= 8
      );
    })
    .sort(
      (a, b) =>
        (a.position ?? 999) -
        (b.position ?? 999)
    );

  if (topEight.length !== 8) {
    return null;
  }

  for (let index = 0; index < 8; index += 1) {
    const driver = topEight[index];

    if (
      driver.position !== index + 1 ||
      typeof driver.driver_number !== "number" ||
      driver.dns === true ||
      driver.dnf === true ||
      driver.dsq === true
    ) {
      return null;
    }
  }

  const uniqueNumbers = new Set(
    topEight.map((item) => item.driver_number)
  );

  if (uniqueNumbers.size !== 8) {
    return null;
  }

  return topEight;
}

export async function GET() {
  try {
    // 1. Resmi sampiyona puanlarini Jolpica'dan al.
    const official =
      await getJolpica<JolpicaStandingsResponse>(
        "current/driverstandings/",
        300
      );

    const table = official.MRData?.StandingsTable;

    const latest = table?.StandingsLists?.[0];

    const raw = latest?.DriverStandings ?? [];

    if (raw.length === 0) {
      throw new Error(
        "Jolpica has no driver standings"
      );
    }

    const season = safeNumber(
      latest?.season ?? table?.season,
      new Date().getUTCFullYear()
    );

    const officialRound = safeNumber(
      latest?.round ?? table?.round
    );

    const standings = makeStandings(raw);

    // Esit puanlarda onceki siralamayi korumak icin.
    const originalRank = new Map(
      standings.map((driver) => [
        driver.driverId,
        driver.position,
      ])
    );

    // OpenF1 pilot numaralarini Jolpica pilotlariyla eslestir.
    const byNumber = new Map<
      number,
      ChampionshipStanding
    >();

    for (const driver of standings) {
      if (driver.driverNumber !== null) {
        byNumber.set(driver.driverNumber, driver);
      }
    }

    const appliedSprints: Array<{
      round: number;
      sessionKey: number;
    }> = [];

    let sprintSyncStatus:
      | "up-to-date"
      | "applied"
      | "pending"
      | "unavailable" = "up-to-date";

    try {
      // 2. Sezon takvimindeki Sprint yarislarini bul.
      const calendar =
        await getJolpica<JolpicaCalendarResponse>(
          `${season}/races/?limit=100`,
          3600
        );

      const now = Date.now();

      // Resmi puan tablosunun henuz islemedigi
      // Sprint hafta sonlarini sec.
      const pendingRounds = (
        calendar.MRData?.RaceTable?.Races ?? []
      )
        .filter((race) => {
          const round = safeNumber(race.round);

          const sprintDate = race.Sprint?.date;

          if (
            round <= officialRound ||
            !sprintDate
          ) {
            return false;
          }

          const plannedDate = Date.parse(
            `${sprintDate}T00:00:00Z`
          );

          return (
            Number.isFinite(plannedDate) &&
            plannedDate <= now
          );
        })
        .sort(
          (a, b) =>
            safeNumber(a.round) -
            safeNumber(b.round)
        );

      if (pendingRounds.length > 0) {
        sprintSyncStatus = "pending";

        // 3. OpenF1'den sezonun Sprint oturumlarini al.
        const sessionsResponse =
          await openF1Request(
            `sessions?year=${season}&session_name=Sprint`
          );

        if (!sessionsResponse.ok) {
          throw new Error(
            `OpenF1 sessions HTTP ${sessionsResponse.status}`
          );
        }

        const sessionsData: unknown =
          await sessionsResponse.json();

        if (!Array.isArray(sessionsData)) {
          throw new Error(
            "OpenF1 sessions response is not an array"
          );
        }

        const sessions =
          sessionsData as OpenF1Session[];

        // 4. Henuz resmi puana eklenmeyen Sprintleri isle.
        for (const race of pendingRounds) {
          const plannedDay = Date.parse(
            `${race.Sprint?.date}T12:00:00Z`
          );

          const matchingSession = sessions.find(
            (session) => {
              if (
                session.session_name !== "Sprint" ||
                session.is_cancelled === true ||
                typeof session.session_key !== "number"
              ) {
                return false;
              }

              const start = Date.parse(
                session.date_start ?? ""
              );

              const end = Date.parse(
                session.date_end ?? ""
              );

              return (
                Number.isFinite(start) &&
                Number.isFinite(end) &&
                Math.abs(start - plannedDay) <=
                  36 * HOUR_MS &&
                end < now
              );
            }
          );

          if (!matchingSession?.session_key) {
            continue;
          }

          // 5. Gercek Sprint bitiris siralamasini al.
          const resultResponse =
            await openF1Request(
              `session_result?session_key=${matchingSession.session_key}`
            );

          if (!resultResponse.ok) {
            continue;
          }

          const resultsData: unknown =
            await resultResponse.json();

          if (!Array.isArray(resultsData)) {
            continue;
          }

          const topEight = completedTopEight(
            resultsData as OpenF1Result[]
          );

          if (!topEight) {
            continue;
          }

          // Sekiz pilotun tamamini tanimiyorsak
          // yanlis puan eklememek icin atla.
          const allDriversKnown = topEight.every(
            (result) =>
              typeof result.driver_number === "number" &&
              byNumber.has(result.driver_number)
          );

          if (!allDriversKnown) {
            continue;
          }

          // 6. Sprint puanlarini ekle: 8,7,6,5,4,3,2,1.
          topEight.forEach((result, index) => {
            const driver = byNumber.get(
              result.driver_number ?? -1
            );

            if (driver) {
              driver.points += SPRINT_POINTS[index];
            }
          });

          appliedSprints.push({
            round: safeNumber(race.round),
            sessionKey: matchingSession.session_key,
          });
        }

        if (appliedSprints.length > 0) {
          sprintSyncStatus = "applied";
        }
      }
    } catch (error) {
      // OpenF1 gecici olarak calismazsa
      // resmi Jolpica puanlarini gostermeye devam et.
      sprintSyncStatus = "unavailable";

      console.error(
        "CHAMPIONSHIP SPRINT SYNC:",
        error
      );
    }

    // 7. Sprint puanlarina gore siralamayi yenile.
    standings.sort(
      (a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        (originalRank.get(a.driverId) ?? 999) -
          (originalRank.get(b.driverId) ?? 999)
    );

    standings.forEach((driver, index) => {
      driver.position = index + 1;
    });

    // 8. LIVE ekranina guncel tabloyu gonder.
    return NextResponse.json(
      {
        ok: true,

        season,

        round: Math.max(
          officialRound,
          ...appliedSprints.map((s) => s.round)
        ),

        officialRound,

        sprintSyncStatus,

        appliedSprints,

        standings,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error(
      "CHAMPIONSHIP API ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Veriler alinamadi.",
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
