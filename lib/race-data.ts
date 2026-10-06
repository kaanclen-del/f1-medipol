export type RaceWeekend = {
  round: number;
  raceName: string;

  circuitName: string;

  city: string;
  country: string;

  raceDate: string;
  raceTime?: string;

  sprint: boolean;

  /*
    Sprint hafta sonuysa
    Sprint'in gerçek başlangıç zamanı
  */

  sprintDate?: string;
  sprintTime?: string;
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
  TARİH + SAATİ
  TIMESTAMP'E ÇEVİR
*/

function getTimestamp(
  date?: string,
  time?: string
) {
  if (!date) {
    return null;
  }

  const dateTime = `${date}T${
    time || "12:00:00Z"
  }`;

  const timestamp =
    new Date(dateTime).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return timestamp;
}

/*
  BİR YARIŞ HAFTA SONUNUN
  İLK SEANS ZAMANINI BUL
*/

function getWeekendStart(
  race: JolpicaRace
) {
  const possibleSessions = [
    race.FirstPractice,

    race.SprintQualifying,

    race.Sprint,

    race.SecondPractice,

    race.ThirdPractice,

    race.Qualifying,
  ];

  const timestamps =
    possibleSessions
      .map((session) =>
        getTimestamp(
          session?.date,
          session?.time
        )
      )
      .filter(
        (
          value
        ): value is number =>
          value !== null
      );

  /*
    API seans bilgisi vermezse
    yarış tarihini kullan.
  */

  if (timestamps.length === 0) {
    return getTimestamp(
      race.date,
      race.time
    );
  }

  return Math.min(
    ...timestamps
  );
}

/*
  API VERİSİNİ
  BİZİM FORMATIMIZA ÇEVİR
*/

function normalizeRace(
  race: JolpicaRace
): RaceWeekend {
  return {
    round:
      Number(race.round),

    raceName:
      race.raceName,

    circuitName:
      race.Circuit
        ?.circuitName ||
      "Formula 1 Circuit",

    city:
      race.Circuit
        ?.Location
        ?.locality ||
      "Unknown",

    country:
      race.Circuit
        ?.Location
        ?.country ||
      "Unknown",

    raceDate:
      race.date,

    raceTime:
      race.time,

    sprint:
      Boolean(
        race.Sprint?.date
      ),

    sprintDate:
      race.Sprint?.date,

    sprintTime:
      race.Sprint?.time,
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
    const response =
      await fetch(
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
      data.MRData?.RaceTable
        ?.Races ?? [];

    return races.map(
      normalizeRace
    );
  } catch (error) {
    console.error(
      "F1 takvimi alınamadı:",
      error
    );

    return [];
  }
}

/*
  ŞU AN AKTİF OLAN
  VEYA SIRADAKİ YARIŞI BUL
*/

export async function getCurrentRaceWeekend(): Promise<RaceWeekend | null> {
  try {
    const now = new Date();

    const year =
      now.getUTCFullYear();

    const response =
      await fetch(
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
      data.MRData?.RaceTable
        ?.Races ?? [];

    if (races.length === 0) {
      return null;
    }

    const nowTimestamp =
      Date.now();

    /*
      ÖNCE AKTİF YARIŞ
      HAFTA SONUNU ARA

      İlk seans başladığı andan
      yarış bittikten 12 saat
      sonrasına kadar bu yarış
      aktif kabul edilir.
    */

    const activeRace =
      races.find((race) => {
        const start =
          getWeekendStart(
            race
          );

        const raceStart =
          getTimestamp(
            race.date,
            race.time
          );

        if (
          start === null ||
          raceStart === null
        ) {
          return false;
        }

        const weekendEnd =
          raceStart +
          12 *
            60 *
            60 *
            1000;

        return (
          nowTimestamp >=
            start &&
          nowTimestamp <=
            weekendEnd
        );
      });

    if (activeRace) {
      return normalizeRace(
        activeRace
      );
    }

    /*
      AKTİF HAFTA SONU YOKSA
      SIRADAKİ YARIŞI BUL
    */

    const nextRace =
      races.find((race) => {
        const raceStart =
          getTimestamp(
            race.date,
            race.time
          );

        if (
          raceStart === null
        ) {
          return false;
        }

        return (
          raceStart >
          nowTimestamp
        );
      });

    if (nextRace) {
      return normalizeRace(
        nextRace
      );
    }

    /*
      SEZON BİTMİŞSE
      SON YARIŞI DÖNDÜR
    */

    const lastRace =
      races[
        races.length - 1
      ];

    return lastRace
      ? normalizeRace(
          lastRace
        )
      : null;
  } catch (error) {
    console.error(
      "Mevcut F1 yarışı alınamadı:",
      error
    );

    return null;
  }
}