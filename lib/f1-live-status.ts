export type F1RaceReference = {
  round: number;
  raceDate: string;
};

export type F1WeekendSessionKey =
  | "fp1"
  | "fp2"
  | "fp3"
  | "sprint-qualifying"
  | "sprint"
  | "qualifying"
  | "race";

export type F1WeekendSession = {
  key: F1WeekendSessionKey;

  label: string;
  shortLabel: string;

  date: string;
  time?: string;

  startTimestamp: number;
  endTimestamp: number;

  durationMinutes: number;
};

export type F1LiveStatus = {
  isLive: boolean;

  currentSession:
    | F1WeekendSession
    | null;

  nextSession:
    | F1WeekendSession
    | null;

  sessions:
    F1WeekendSession[];
};

type JolpicaSession = {
  date?: string;
  time?: string;
};

type JolpicaRace = {
  date?: string;
  time?: string;

  FirstPractice?: JolpicaSession;
  SecondPractice?: JolpicaSession;
  ThirdPractice?: JolpicaSession;

  SprintQualifying?: JolpicaSession;
  SprintShootout?: JolpicaSession;

  Sprint?: JolpicaSession;

  Qualifying?: JolpicaSession;
};

/*
  Normal seans süresinden biraz
  geniş tutuluyor.

  Böylece kırmızı bayrak,
  gecikme, restart vb. durumlarda
  site hemen "kapalı" durumuna geçmez.
*/

const SESSION_DURATION_MINUTES: Record<
  F1WeekendSessionKey,
  number
> = {
  fp1: 75,
  fp2: 75,
  fp3: 75,

  "sprint-qualifying": 80,

  sprint: 90,

  qualifying: 105,

  race: 210,
};

/*
  Seans başlamadan 2 dakika önce
  canlı duruma geçebilir.
*/

const LIVE_PRE_BUFFER_MS =
  2 * 60 * 1000;

function getTimestamp(
  date?: string,
  time?: string
) {
  if (!date) {
    return null;
  }

  const value = new Date(
    `${date}T${
      time ||
      "12:00:00Z"
    }`
  ).getTime();

  if (
    Number.isNaN(value)
  ) {
    return null;
  }

  return value;
}

function addSession(
  sessions:
    F1WeekendSession[],

  key:
    F1WeekendSessionKey,

  label:
    string,

  shortLabel:
    string,

  session?:
    JolpicaSession | null
) {
  if (
    !session?.date
  ) {
    return;
  }

  const startTimestamp =
    getTimestamp(
      session.date,
      session.time
    );

  if (
    startTimestamp ===
    null
  ) {
    return;
  }

  const durationMinutes =
    SESSION_DURATION_MINUTES[
      key
    ];

  const endTimestamp =
    startTimestamp +
    durationMinutes *
      60 *
      1000;

  sessions.push({
    key,

    label,

    shortLabel,

    date:
      session.date,

    time:
      session.time,

    startTimestamp,

    endTimestamp,

    durationMinutes,
  });
}

export async function getF1WeekendSchedule(
  race:
    | F1RaceReference
    | null
): Promise<
  F1WeekendSession[]
> {
  if (!race) {
    return [];
  }

  try {
    const season =
      Number(
        race.raceDate.slice(
          0,
          4
        )
      );

    if (
      !Number.isFinite(
        season
      )
    ) {
      return [];
    }

    const response =
      await fetch(
        `https://api.jolpi.ca/ergast/f1/${season}/${race.round}.json`,
        {
          next: {
            revalidate: 1800,
          },
        }
      );

    if (
      !response.ok
    ) {
      return [];
    }

    const data =
      await response.json();

    const weekend:
      | JolpicaRace
      | undefined =
      data?.MRData
        ?.RaceTable
        ?.Races?.[0];

    if (!weekend) {
      return [];
    }

    const sessions:
      F1WeekendSession[] =
      [];

    addSession(
      sessions,
      "fp1",
      "1. Antrenman",
      "FP1",
      weekend.FirstPractice
    );

    addSession(
      sessions,
      "fp2",
      "2. Antrenman",
      "FP2",
      weekend.SecondPractice
    );

    addSession(
      sessions,
      "fp3",
      "3. Antrenman",
      "FP3",
      weekend.ThirdPractice
    );

    addSession(
      sessions,
      "sprint-qualifying",
      "Sprint Sıralama",
      "SQ",
      weekend.SprintQualifying ??
        weekend.SprintShootout
    );

    addSession(
      sessions,
      "sprint",
      "Sprint",
      "SPR",
      weekend.Sprint
    );

    addSession(
      sessions,
      "qualifying",
      "Sıralama",
      "Q",
      weekend.Qualifying
    );

    if (
      weekend.date
    ) {
      addSession(
        sessions,
        "race",
        "Yarış",
        "RACE",
        {
          date:
            weekend.date,

          time:
            weekend.time,
        }
      );
    }

    return sessions.sort(
      (
        a,
        b
      ) =>
        a.startTimestamp -
        b.startTimestamp
    );
  } catch (
    error
  ) {
    console.error(
      "F1 hafta sonu programı alınamadı:",
      error
    );

    return [];
  }
}

export async function getF1LiveStatus(
  race:
    | F1RaceReference
    | null,

  now:
    Date =
    new Date()
): Promise<F1LiveStatus> {
  const sessions =
    await getF1WeekendSchedule(
      race
    );

  const nowTimestamp =
    now.getTime();

  const currentSession =
    sessions.find(
      (
        session
      ) =>
        nowTimestamp >=
          session.startTimestamp -
            LIVE_PRE_BUFFER_MS &&
        nowTimestamp <=
          session.endTimestamp
    ) ??
    null;

  const nextSession =
    sessions.find(
      (
        session
      ) =>
        session.startTimestamp >
        nowTimestamp
    ) ??
    null;

  return {
    isLive:
      currentSession !==
      null,

    currentSession,

    nextSession,

    sessions,
  };
}

export function formatF1SessionDayTR(
  timestamp:
    number
) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      weekday:
        "short",

      day:
        "2-digit",

      month:
        "short",

      timeZone:
        "Europe/Istanbul",
    }
  )
    .format(
      new Date(
        timestamp
      )
    )
    .replace(
      ".",
      ""
    )
    .toUpperCase();
}

export function formatF1SessionTimeTR(
  timestamp:
    number
) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        false,

      timeZone:
        "Europe/Istanbul",
    }
  ).format(
    new Date(
      timestamp
    )
  );
}

/*
  OpenF1 verisinin gerçekten
  şu an takvimde canlı kabul edilen
  seansa ait olup olmadığını kontrol eder.

  Böylece örneğin FP2 sırasında
  OpenF1 bize eski FP1 verisi döndürürse
  onu yanlışlıkla canlı göstermeyiz.
*/

export function openF1SessionMatchesScheduled(
  openF1Session:
    | {
        session_name?: string;
        session_type?: string;
        date_start?: string;
      }
    | null
    | undefined,

  scheduled:
    | F1WeekendSession
    | null
) {
  if (
    !openF1Session ||
    !scheduled
  ) {
    return false;
  }

  const name =
    (
      openF1Session
        .session_name ??
      ""
    )
      .toLowerCase()
      .trim();

  const type =
    (
      openF1Session
        .session_type ??
      ""
    )
      .toLowerCase()
      .trim();

  let nameMatch =
    false;

  switch (
    scheduled.key
  ) {
    case "fp1":
      nameMatch =
        name.includes(
          "practice 1"
        ) ||
        name.includes(
          "free practice 1"
        ) ||
        name === "fp1";
      break;

    case "fp2":
      nameMatch =
        name.includes(
          "practice 2"
        ) ||
        name.includes(
          "free practice 2"
        ) ||
        name === "fp2";
      break;

    case "fp3":
      nameMatch =
        name.includes(
          "practice 3"
        ) ||
        name.includes(
          "free practice 3"
        ) ||
        name === "fp3";
      break;

    case "sprint-qualifying":
      nameMatch =
        name.includes(
          "sprint qualifying"
        ) ||
        name.includes(
          "sprint shootout"
        );
      break;

    case "sprint":
      nameMatch =
        (
          name.includes(
            "sprint"
          ) ||
          type.includes(
            "sprint"
          )
        ) &&
        !name.includes(
          "qualifying"
        ) &&
        !name.includes(
          "shootout"
        );
      break;

    case "qualifying":
      nameMatch =
        (
          name.includes(
            "qualifying"
          ) ||
          type.includes(
            "qualifying"
          )
        ) &&
        !name.includes(
          "sprint"
        );
      break;

    case "race":
      nameMatch =
        name === "race" ||
        name.includes(
          "race"
        ) ||
        type === "race";
      break;
  }

  if (!nameMatch) {
    return false;
  }

  if (
    !openF1Session
      .date_start
  ) {
    return true;
  }

  const openF1Start =
    new Date(
      openF1Session
        .date_start
    ).getTime();

  if (
    Number.isNaN(
      openF1Start
    )
  ) {
    return true;
  }

  /*
    Takvim ile OpenF1 başlangıcı arasında
    maksimum 2 saat fark kabul edilir.
    Bu da ertelenen seanslar için pay bırakır.
  */

  const difference =
    Math.abs(
      openF1Start -
        scheduled.startTimestamp
    );

  return (
    difference <=
    2 *
      60 *
      60 *
      1000
  );
}