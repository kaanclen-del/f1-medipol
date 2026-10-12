
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

  // Resmî takvimde yayımlanan antrenman, sıralama, Sprint ve yarış saatleri.
  sessions?: RaceSession[];
};

/*
  JOLPICA API TİPLERİ
*/

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

/*
  TARİH VE SAATİ TIMESTAMP'E ÇEVİR
*/

function getTimestamp(
  date?: string,
  time?: string
): number | null {
  if (!date) {
    return null;
  }

  const dateTime = `${date}T${time || "12:00:00Z"}`;

  const timestamp = new Date(dateTime).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return timestamp;
}

/*
  YARIŞ HAFTA SONUNUN
  İLK SEANSINI BUL
*/

function getWeekendStart(
  race: JolpicaRace
): number | null {
  const possibleSessions = [
    race.FirstPractice,
    race.SprintQualifying,
    race.Sprint,
    race.SecondPractice,
    race.ThirdPractice,
    race.Qualifying,
  ];

  const timestamps = possibleSessions
    .map((session) =>
      getTimestamp(session?.date, session?.time)
    )
    .filter(
      (value): value is number => value !== null
    );

  if (timestamps.length === 0) {
    return getTimestamp(race.date, race.time);
  }

  return Math.min(...timestamps);
}

/*
  HAFTA SONU SEANSLARI
  Takvimde saat açıklanmamışsa saat uydurmayız.
*/
function getRaceSessions(race: JolpicaRace): RaceSession[] {
  const schedule: { name: string; session?: JolpicaSession }[] = [
    { name: "1. Antrenman", session: race.FirstPractice },
    { name: "2. Antrenman", session: race.SecondPractice },
    { name: "3. Antrenman", session: race.ThirdPractice },
    { name: "Sprint Sıralama", session: race.SprintQualifying ?? race.SprintShootout },
    { name: "Sprint", session: race.Sprint },
    { name: "Sıralama", session: race.Qualifying },
    { name: "Yarış", session: { date: race.date, time: race.time } },
  ];

  return schedule
    .filter((item): item is { name: string; session: JolpicaSession } => Boolean(item.session?.date))
    .map((item) => ({ name: item.name, date: item.session.date!, time: item.session.time }))
    .sort((a, b) =>
      (getTimestamp(a.date, a.time) ?? 0) - (getTimestamp(b.date, b.time) ?? 0)
    );
}

/*
  JOLPICA VERİSİNİ
  SİTENİN FORMATINA ÇEVİR
*/

function normalizeRace(
  race: JolpicaRace
): RaceWeekend {
  return {
    round: Number(race.round),

    raceName: race.raceName,

    circuitName:
      race.Circuit?.circuitName ||
      "Formula 1 Circuit",

    city:
      race.Circuit?.Location?.locality ||
      "Unknown",

    country:
      race.Circuit?.Location?.country ||
      "Unknown",

    raceDate: race.date,
    raceTime: race.time,

    sprint: Boolean(race.Sprint?.date),

    sprintDate: race.Sprint?.date,
    sprintTime: race.Sprint?.time,
    sessions: getRaceSessions(race),
  };
}

/*
  BELİRLİ BİR SEZONUN
  TÜM YARIŞLARINI AL
*/

export async function getSeasonRaces(
  year: number
): Promise<RaceWeekend[]> {
  try {
    const response = await fetch(
      `https://api.jolpi.ca/ergast/f1/${year}.json`,
      {
        next: {
          revalidate: 3600,
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data =
      (await response.json()) as JolpicaResponse;

    const races =
      data.MRData?.RaceTable?.Races ?? [];

    return races.map(normalizeRace);
  } catch (error) {
    console.error(
      "F1 takvimi alınamadı:",
      error
    );

    return [];
  }
}

/*
  YARIŞ SONUÇLARI YAYIMLANDI MI?

  En az ilk üç pilotun sonucu varsa
  yarış sonuçlarını kullanılabilir
  kabul ediyoruz.

  Bu kontrol hiçbir puanı değiştirmez.
*/

async function hasRaceResults(
  year: number,
  round: number
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.jolpi.ca/ergast/f1/${year}/${round}/results.json`,
      {
        next: {
          revalidate: 120,
        },
      }
    );

    if (!response.ok) {
      return false;
    }

    const data =
      (await response.json()) as JolpicaResponse;

    const results =
      data.MRData?.RaceTable?.Races?.[0]
        ?.Results ?? [];

    return results.length >= 3;
  } catch (error) {
    console.error(
      "F1 yarış sonuçları kontrol edilemedi:",
      error
    );

    return false;
  }
}

/*
  VERİLEN ZAMANDAN SONRAKİ
  İLK YARIŞI BUL
*/

function findNextRace(
  races: JolpicaRace[],
  nowTimestamp: number
): JolpicaRace | undefined {
  return races.find((race) => {
    const raceStart = getTimestamp(
      race.date,
      race.time
    );

    return (
      raceStart !== null &&
      raceStart > nowTimestamp
    );
  });
}

/*
  ŞU AN AKTİF OLAN
  VEYA SIRADAKİ YARIŞI BUL
*/

export async function getCurrentRaceWeekend(): Promise<RaceWeekend | null> {
  try {
    const year = new Date().getUTCFullYear();

    const response = await fetch(
      `https://api.jolpi.ca/ergast/f1/${year}.json`,
      {
        next: {
          revalidate: 3600,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data =
      (await response.json()) as JolpicaResponse;

    const races =
      data.MRData?.RaceTable?.Races ?? [];

    if (races.length === 0) {
      return null;
    }

    const nowTimestamp = Date.now();

    /*
      AKTİF YARIŞ HAFTA SONUNU BUL

      İlk seans başladığında aktif olur.

      Sonuçlar açıklanmazsa yarış
      başlangıcından 12 saat sonrasına
      kadar aktif kalır.
    */

    const activeRace = races.find((race) => {
      const weekendStart =
        getWeekendStart(race);

      const raceStart = getTimestamp(
        race.date,
        race.time
      );

      if (
        weekendStart === null ||
        raceStart === null
      ) {
        return false;
      }

      const weekendEnd =
        raceStart + 12 * 60 * 60 * 1000;

      return (
        nowTimestamp >= weekendStart &&
        nowTimestamp <= weekendEnd
      );
    });

    if (activeRace) {
      const raceStart = getTimestamp(
        activeRace.date,
        activeRace.time
      );

      /*
        YARIŞ BAŞLADIKTAN SONRA
        SONUÇLARI KONTROL ET

        Sonuçlar yayımlandıysa
        bir sonraki GP'ye geç.
      */

      if (
        raceStart !== null &&
        nowTimestamp >= raceStart
      ) {
        const resultsAvailable =
          await hasRaceResults(
            year,
            Number(activeRace.round)
          );

        if (resultsAvailable) {
          const nextRace = findNextRace(
            races,
            nowTimestamp
          );

          if (nextRace) {
            return normalizeRace(nextRace);
          }

          /*
            Son yarış tamamlanmışsa
            sezonun son yarışını göster.
          */

          return normalizeRace(activeRace);
        }
      }

      /*
        Sonuçlar henüz yoksa
        mevcut yarış devam eder.
      */

      return normalizeRace(activeRace);
    }

    /*
      AKTİF HAFTA SONU YOKSA
      SIRADAKİ YARIŞI BUL
    */

    const nextRace = findNextRace(
      races,
      nowTimestamp
    );

    if (nextRace) {
      return normalizeRace(nextRace);
    }

    /*
      SEZON BİTMİŞSE
      SON YARIŞI DÖNDÜR
    */

    const lastRace =
      races[races.length - 1];

    return lastRace
      ? normalizeRace(lastRace)
      : null;
  } catch (error) {
    console.error(
      "Mevcut F1 yarışı alınamadı:",
      error
    );

    return null;
  }
}
