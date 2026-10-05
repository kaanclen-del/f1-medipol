export type RaceWeekend = {
  round: number;
  raceName: string;
  circuitName: string;
  city: string;
  country: string;
  raceDate: string;
  raceTime?: string;
  sprint: boolean;
};

type ApiRace = {
  round: string;
  raceName: string;
  date: string;
  time?: string;

  Circuit: {
    circuitName: string;
    Location: {
      locality: string;
      country: string;
    };
  };

  FirstPractice?: {
    date: string;
    time?: string;
  };

  Sprint?: {
    date: string;
    time?: string;
  };

  Qualifying?: {
    date: string;
    time?: string;
  };
};

function makeDate(date: string, time?: string) {
  return new Date(`${date}T${time || "12:00:00Z"}`);
}

export async function getCurrentRaceWeekend(): Promise<RaceWeekend | null> {
  const now = new Date();
  const year = now.getFullYear();

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

  const data = await response.json();

  const races: ApiRace[] =
    data?.MRData?.RaceTable?.Races || [];

  if (!races.length) {
    return null;
  }

  /*
    Önce içinde bulunduğumuz yarış hafta sonunu buluyoruz.

    Örneğin bugün cuma/cumartesi/pazar ise:
    Singapore GP otomatik olarak aktif yarış olur.

    Yarış haftasında değilsek sıradaki GP seçilir.
  */

  const activeRace = races.find((race) => {
    const possibleStarts = [
      race.FirstPractice
        ? makeDate(
            race.FirstPractice.date,
            race.FirstPractice.time
          )
        : null,

      race.Sprint
        ? makeDate(
            race.Sprint.date,
            race.Sprint.time
          )
        : null,

      race.Qualifying
        ? makeDate(
            race.Qualifying.date,
            race.Qualifying.time
          )
        : null,
    ].filter(Boolean) as Date[];

    const raceDate = makeDate(
      race.date,
      race.time
    );

    const startDate =
      possibleStarts.length > 0
        ? new Date(
            Math.min(
              ...possibleStarts.map((d) =>
                d.getTime()
              )
            )
          )
        : new Date(
            raceDate.getTime() -
              2 * 24 * 60 * 60 * 1000
          );

    const endDate = new Date(
      raceDate.getTime() +
        12 * 60 * 60 * 1000
    );

    return now >= startDate && now <= endDate;
  });

  const nextRace =
    activeRace ||
    races.find(
      (race) =>
        makeDate(
          race.date,
          race.time
        ) >= now
    );

  if (!nextRace) {
    return null;
  }

  return {
    round: Number(nextRace.round),

    raceName: nextRace.raceName,

    circuitName:
      nextRace.Circuit.circuitName,

    city:
      nextRace.Circuit.Location.locality,

    country:
      nextRace.Circuit.Location.country,

    raceDate: nextRace.date,

    raceTime: nextRace.time,

    sprint: Boolean(nextRace.Sprint),
  };
}