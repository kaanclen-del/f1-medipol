export type RaceSession = {
  name: string;
  date: string;
  time?: string;
};

export type RaceWeekend = {
  round: number;
  raceName: string;
  circuitName: string;
  city: string;
  country: string;
  raceDate: string;
  raceTime?: string;
  sprint: boolean;
  sprintDate?: string;
  sprintTime?: string;
  sessions?: RaceSession[];
};

type JolpicaSession = {
  date?: string;
  time?: string;
};

type JolpicaRace = {
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit?: {
    circuitName?: string;
    Location?: {
      locality?: string;
      country?: string;
    };
  };
  FirstPractice?: JolpicaSession;
  SecondPractice?: JolpicaSession;
  ThirdPractice?: JolpicaSession;
  Qualifying?: JolpicaSession;
  Sprint?: JolpicaSession;
  SprintQualifying?: JolpicaSession;
  SprintShootout?: JolpicaSession;
  Results?: unknown[];
};

type JolpicaResponse = {
  MRData?: {
    RaceTable?: {
      season?: string;
      Races?: JolpicaRace[];
    };
  };
};

const CALENDAR_URL = "https://api.jolpi.ca/ergast/f1";

function getTimestamp(
  date?: string,
  time?: string
): number | null {
  if (!date) return null;

  const normalizedTime = time
    ? time.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(time)
      ? time
      : `${time}Z`
    : "12:00:00Z";

  const timestamp = Date.parse(`${date}T${normalizedTime}`);

  return Number.isFinite(timestamp) ? timestamp : null;
}

function getWeekendStart(race: JolpicaRace): number | null {
  const sessions = [
    race.FirstPractice,
    race.SprintQualifying ?? race.SprintShootout,
    race.Sprint,
    race.SecondPractice,
    race.ThirdPractice,
    race.Qualifying,
  ];

  const timestamps = sessions
    .map((session) => getTimestamp(session?.date, session?.time))
    .filter((value): value is number => value !== null);

  if (timestamps.length > 0) {
    return Math.min(...timestamps);
  }

  return getTimestamp(race.date, race.time);
}

function getRaceSessions(race: JolpicaRace): RaceSession[] {
  const schedule: {
    name: string;
    session?: JolpicaSession;
  }[] = [
    { name: "1. Antrenman", session: race.FirstPractice },
    { name: "2. Antrenman", session: race.SecondPractice },
    { name: "3. Antrenman", session: race.ThirdPractice },
    {
      name: "Sprint Sıralama",
      session: race.SprintQualifying ?? race.SprintShootout,
    },
    { name: "Sprint", session: race.Sprint },
    { name: "Sıralama", session: race.Qualifying },
    {
      name: "Yarış",
      session: { date: race.date, time: race.time },
    },
  ];

  return schedule
    .filter(
      (
        item
      ): item is { name: string; session: JolpicaSession & { date: string } } =>
        Boolean(item.session?.date)
    )
    .map((item) => ({
      name: item.name,
      date: item.session.date,
      time: item.session.time,
    }))
    .sort(
      (a, b) =>
        (getTimestamp(a.date, a.time) ?? 0) -
        (getTimestamp(b.date, b.time) ?? 0)
    );
}

function normalizeRace(race: JolpicaRace): RaceWeekend {
  return {
    round: Number(race.round),
    raceName: race.raceName,
    circuitName: race.Circuit?.circuitName || "Formula 1 Circuit",
    city: race.Circuit?.Location?.locality || "Unknown",
    country: race.Circuit?.Location?.country || "Unknown",
    raceDate: race.date,
    raceTime: race.time,
    sprint: Boolean(race.Sprint?.date),
    sprintDate: race.Sprint?.date,
    sprintTime: race.Sprint?.time,
    sessions: getRaceSessions(race),
  };
}

async function fetchSeasonCalendar(
  year: number,
  revalidateSeconds: number
): Promise<JolpicaRace[]> {
  const url = `${CALENDAR_URL}/${year}.json`;

  const response = await fetch(url, {
    next: { revalidate: revalidateSeconds },
  });

  if (!response.ok) {
    throw new Error(
      `Jolpica takvim isteği başarısız: HTTP ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as JolpicaResponse;
  const races = data.MRData?.RaceTable?.Races;

  if (!Array.isArray(races)) {
    throw new Error("Jolpica yanıtında yarış takvimi bulunamadı.");
  }

  return races;
}

export async function getSeasonRaces(
  year: number
): Promise<RaceWeekend[]> {
  try {
    const races = await fetchSeasonCalendar(year, 3600);
    return races.map(normalizeRace);
  } catch (error) {
    console.error("F1 takvimi alınamadı:", error);
    return [];
  }
}

async function hasRaceResults(
  year: number,
  round: number
): Promise<boolean> {
  try {
    const response = await fetch(
      `${CALENDAR_URL}/${year}/${round}/results.json`,
      { next: { revalidate: 120 } }
    );

    if (!response.ok) {
      console.error(
        "F1 yarış sonuçları kontrol edilemedi:",
        response.status,
        response.statusText
      );
      return false;
    }

    const data = (await response.json()) as JolpicaResponse;
    const results = data.MRData?.RaceTable?.Races?.[0]?.Results ?? [];

    return results.length >= 3;
  } catch (error) {
    console.error("F1 yarış sonuçları kontrol edilemedi:", error);
    return false;
  }
}

function findNextRace(
  races: JolpicaRace[],
  nowTimestamp: number
): JolpicaRace | undefined {
  return races.find((race) => {
    const raceStart = getTimestamp(race.date, race.time);
    return raceStart !== null && raceStart > nowTimestamp;
  });
}

export async function getCurrentRaceWeekend(): Promise<RaceWeekend | null> {
  try {
    const year = new Date().getUTCFullYear();
    const races = await fetchSeasonCalendar(year, 3600);

    if (races.length === 0) {
      console.error("F1 takvimi boş döndü:", year);
      return null;
    }

    const now = Date.now();

    const activeRace = races.find((race) => {
      const weekendStart = getWeekendStart(race);
      const raceStart = getTimestamp(race.date, race.time);

      if (weekendStart === null || raceStart === null) {
        return false;
      }

      const weekendEnd = raceStart + 12 * 60 * 60 * 1000;

      return now >= weekendStart && now <= weekendEnd;
    });

    if (activeRace) {
      const raceStart = getTimestamp(activeRace.date, activeRace.time);

      if (raceStart !== null && now >= raceStart) {
        const resultsAvailable = await hasRaceResults(
          year,
          Number(activeRace.round)
        );

        if (resultsAvailable) {
          const nextRace = findNextRace(races, now);

          if (nextRace) return normalizeRace(nextRace);
        }
      }

      return normalizeRace(activeRace);
    }

    const nextRace = findNextRace(races, now);

    if (nextRace) {
      return normalizeRace(nextRace);
    }

    // Sezon takvimindeki son yarış geçmişse son yarışı göster.
    const lastRace = races[races.length - 1];

    return lastRace ? normalizeRace(lastRace) : null;
  } catch (error) {
    console.error("Mevcut F1 yarışı alınamadı:", error);
    return null;
  }
}