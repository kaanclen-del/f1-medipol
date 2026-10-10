import { getOpenF1AccessToken } from "@/lib/openf1-auth";

/* =========================================================
   F1 MEDIPOL
   REPLAY ENGINE V3

   - Practice / Qualifying:
     current lap
     last lap
     sector timing
     mini sectors
     live-like classification

   - Race / Sprint:
     lap
     position
     intervals

   - Track:
     gerçek OpenF1 x/y/z geometrisi
   ========================================================= */

export type ReplaySessionKind =
  | "practice"
  | "qualifying"
  | "race";

export type ReplaySession = {
  sessionKey: number;
  meetingKey: number;

  sessionName: string;
  sessionType: string;

  kind: ReplaySessionKind;

  location: string;
  country: string;

  circuitName: string;

  dateStart: string;
  dateEnd: string;

  year: number;

  durationMs: number;
};

export type ReplayDriver = {
  driverNumber: number;

  name: string;
  acronym: string;

  team: string;

  teamColour:
    | string
    | null;

  headshotUrl:
    | string
    | null;
};

export type ReplayDriverFrame = {
  driverNumber: number;

  position:
    | number
    | null;

  lapNumber: number;

  /*
    O anda devam eden turun
    geçen süresi.
  */

  currentLapTime:
    | number
    | null;

  /*
    Son tamamlanan tur.
  */

  lastLap:
    | number
    | null;

  /*
    Session içindeki o ana kadarki
    en iyi tur.
  */

  bestLap:
    | number
    | null;

  /*
    Current lap sector süreleri.

    Sector tamamlanmadan null.
  */

  sector1:
    | number
    | null;

  sector2:
    | number
    | null;

  sector3:
    | number
    | null;

  /*
    OpenF1 mini-sector kodları.

    0    = henüz tamamlanmadı / yok
    2048 = yellow
    2049 = green
    2051 = purple
    2064 = pit
  */

  segmentsSector1:
    number[];

  segmentsSector2:
    number[];

  segmentsSector3:
    number[];

  gap:
    | number
    | string
    | null;

  interval:
    | number
    | string
    | null;

  tyre:
    | string
    | null;

  tyreAge:
    | number
    | null;

  stintNumber:
    | number
    | null;

  /*
    0 → 1

    Track map üzerinde aracın
    mevcut tur içindeki konumu.
  */

  trackProgress:
    | number
    | null;

  dnf: boolean;
  dns: boolean;
  dsq: boolean;
};

export type ReplayFrame = {
  timestamp: number;

  elapsedMs: number;

  remainingMs: number;

  lapNumber: number;

  drivers:
    ReplayDriverFrame[];
};

export type ReplayRaceControlEvent = {
  timestamp: number;

  category:
    | string
    | null;

  flag:
    | string
    | null;

  message: string;

  lapNumber:
    | number
    | null;
};

export type ReplayTrackPoint = {
  x: number;
  y: number;
  z: number;
};

export type ReplayTrack = {
  points:
    ReplayTrackPoint[];

  sourceDriver:
    number;

  sourceLap:
    number;
};

export type F1ReplayData = {
  session:
    ReplaySession;

  latestCompletedSession:
    ReplaySession | null;

  archivePending:
    boolean;

  drivers:
    ReplayDriver[];

  frames:
    ReplayFrame[];

  events:
    ReplayRaceControlEvent[];

  totalLaps:
    number;

  track:
    ReplayTrack | null;

  generatedAt:
    string;
};

/* =========================================================
   OPENF1 TYPES
   ========================================================= */

type RawSession = {
  session_key:
    number;

  meeting_key:
    number;

  session_name:
    string;

  session_type:
    string;

  country_name?:
    string;

  location?:
    string;

  circuit_short_name?:
    string;

  date_start:
    string;

  date_end:
    string;

  year:
    number;

  is_cancelled?:
    boolean;
};

type RawDriver = {
  driver_number:
    number;

  first_name?:
    string;

  last_name?:
    string;

  full_name?:
    string;

  broadcast_name?:
    string;

  name_acronym?:
    string;

  team_name?:
    string;

  team_colour?:
    string;

  headshot_url?:
    string;

  session_key:
    number;

  meeting_key:
    number;
};

type RawPosition = {
  date:
    string;

  driver_number:
    number;

  position:
    number;

  session_key:
    number;

  meeting_key:
    number;
};

type RawLap = {
  date_start?:
    string;

  driver_number:
    number;

  lap_duration:
    | number
    | null;

  lap_number:
    number;

  is_pit_out_lap?:
    boolean;

  /*
    SECTOR DURATIONS
  */

  duration_sector_1?:
    number | null;

  duration_sector_2?:
    number | null;

  duration_sector_3?:
    number | null;

  /*
    MINI SECTORS
  */

  segments_sector_1?:
    number[];

  segments_sector_2?:
    number[];

  segments_sector_3?:
    number[];

  i1_speed?:
    number | null;

  i2_speed?:
    number | null;

  st_speed?:
    number | null;

  session_key:
    number;

  meeting_key:
    number;
};

type RawStint = {
  compound?:
    string;

  driver_number:
    number;

  lap_start:
    number;

  lap_end?:
    number | null;

  stint_number:
    number;

  tyre_age_at_start?:
    number;

  session_key:
    number;

  meeting_key:
    number;
};

type RawResult = {
  driver_number:
    number;

  position:
    number | null;

  gap_to_leader:
    | number
    | string
    | (
        | number
        | string
        | null
      )[]
    | null;

  duration:
    | number
    | number[]
    | null;

  number_of_laps:
    number;

  dnf:
    boolean;

  dns:
    boolean;

  dsq:
    boolean;

  session_key:
    number;

  meeting_key:
    number;
};

type RawInterval = {
  date:
    string;

  driver_number:
    number;

  gap_to_leader:
    | number
    | string
    | null;

  interval:
    | number
    | string
    | null;

  session_key:
    number;

  meeting_key:
    number;
};

type RawRaceControl = {
  date:
    string;

  category?:
    string | null;

  flag?:
    string | null;

  message?:
    string | null;

  lap_number?:
    number | null;

  session_key:
    number;

  meeting_key:
    number;
};

type RawLocation = {
  date:
    string;

  driver_number:
    number;

  x:
    number;

  y:
    number;

  z:
    number;

  session_key:
    number;

  meeting_key:
    number;
};

/* =========================================================
   INTERNAL TYPES
   ========================================================= */

type TimedPosition =
  RawPosition & {
    timestamp:
      number;
  };

type TimedInterval =
  RawInterval & {
    timestamp:
      number;
  };

type TimedLap =
  RawLap & {
    startTimestamp:
      number;

    completedTimestamp:
      number | null;

    estimatedEndTimestamp:
      number;
  };

type ReplayCandidate = {
  session:
    RawSession;

  drivers:
    RawDriver[];

  laps:
    RawLap[];

  results:
    RawResult[];
};

type MiniSectorSnapshot = {
  sector1:
    number | null;

  sector2:
    number | null;

  sector3:
    number | null;

  segments1:
    number[];

  segments2:
    number[];

  segments3:
    number[];
};

/* =========================================================
   RATE LIMIT
   ========================================================= */

const OPENF1_GAP_MS =
  430;

let lastOpenF1RequestAt =
  0;

function sleep(
  milliseconds:
    number
) {
  return new Promise<void>(
    (
      resolve
    ) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

async function waitForOpenF1() {
  const elapsed =
    Date.now() -
    lastOpenF1RequestAt;

  const wait =
    OPENF1_GAP_MS -
    elapsed;

  if (
    wait > 0
  ) {
    await sleep(
      wait
    );
  }

  lastOpenF1RequestAt =
    Date.now();
}

/* =========================================================
   FETCH
   ========================================================= */

async function fetchOpenF1<
  T
>(
  path:
    string,

  retry =
    true
): Promise<T[]> {
  await waitForOpenF1();

  try {
    const token = await getOpenF1AccessToken();

    const response =
      await fetch(
        `https://api.openf1.org/v1/${path}`,
        {
          next: {
            revalidate:
              600,
          },

          headers: {
            Accept:
              "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

    if (
      response.status ===
        429 &&
      retry
    ) {
      await sleep(
        1600
      );

      return fetchOpenF1<T>(
        path,
        false
      );
    }

    if (
      !response.ok
    ) {
      console.warn(
        "OPENF1 REPLAY:",
        path,
        response.status
      );

      return [];
    }

    const data =
      await response.json();

    if (
      !Array.isArray(
        data
      )
    ) {
      return [];
    }

    return data as T[];
  } catch (
    error
  ) {
    console.error(
      "OPENF1 REPLAY FETCH:",
      path,
      error
    );

    return [];
  }
}

/* =========================================================
   HELPERS
   ========================================================= */

function clamp(
  value:
    number,

  min:
    number,

  max:
    number
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}

function addToMap<T>(
  map:
    Map<
      number,
      T[]
    >,

  key:
    number,

  value:
    T
) {
  const current =
    map.get(
      key
    );

  if (
    current
  ) {
    current.push(
      value
    );

    return;
  }

  map.set(
    key,
    [value]
  );
}

function getSessionKind(
  session:
    RawSession
): ReplaySessionKind {
  const type =
    (
      session.session_type ||
      ""
    )
      .trim()
      .toLowerCase();

  const name =
    (
      session.session_name ||
      ""
    )
      .trim()
      .toLowerCase();

  if (
    type.includes(
      "practice"
    ) ||
    name.includes(
      "practice"
    )
  ) {
    return "practice";
  }

  if (
    type.includes(
      "qualifying"
    ) ||
    name.includes(
      "qualifying"
    ) ||
    name.includes(
      "shootout"
    )
  ) {
    return "qualifying";
  }

  return "race";
}

function normalizeSession(
  session:
    RawSession
): ReplaySession {
  const start =
    new Date(
      session.date_start
    ).getTime();

  const end =
    new Date(
      session.date_end
    ).getTime();

  return {
    sessionKey:
      session.session_key,

    meetingKey:
      session.meeting_key,

    sessionName:
      session.session_name,

    sessionType:
      session.session_type,

    kind:
      getSessionKind(
        session
      ),

    location:
      session.location ||
      "Formula 1",

    country:
      session.country_name ||
      "",

    circuitName:
      session.circuit_short_name ||
      session.location ||
      "Formula 1 Circuit",

    dateStart:
      session.date_start,

    dateEnd:
      session.date_end,

    year:
      session.year,

    durationMs:
      Number.isFinite(
        start
      ) &&
      Number.isFinite(
        end
      )
        ? Math.max(
            0,
            end -
              start
          )
        : 0,
  };
}

function latestBefore<
  T extends {
    timestamp:
      number;
  },
>(
  items:
    T[],

  timestamp:
    number
): T | null {
  if (
    items.length ===
    0
  ) {
    return null;
  }

  let left =
    0;

  let right =
    items.length -
    1;

  let result:
    T | null =
    null;

  while (
    left <= right
  ) {
    const middle =
      Math.floor(
        (
          left +
          right
        ) /
          2
      );

    const item =
      items[
        middle
      ];

    if (
      item.timestamp <=
      timestamp
    ) {
      result =
        item;

      left =
        middle +
        1;
    } else {
      right =
        middle -
        1;
    }
  }

  return result;
}

function normalizeResultGap(
  value:
    RawResult["gap_to_leader"]
):
  | number
  | string
  | null {
  if (
    Array.isArray(
      value
    )
  ) {
    for (
      let index =
        value.length -
        1;
      index >= 0;
      index -= 1
    ) {
      const item =
        value[
          index
        ];

      if (
        item !== null &&
        item !==
          undefined
      ) {
        return item;
      }
    }

    return null;
  }

  return value;
}

function normalizeResultDuration(
  value:
    RawResult["duration"]
):
  | number
  | null {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  ) {
    return value;
  }

  if (
    Array.isArray(
      value
    )
  ) {
    for (
      let index =
        value.length -
        1;
      index >= 0;
      index -= 1
    ) {
      const item =
        value[
          index
        ];

      if (
        typeof item ===
          "number" &&
        Number.isFinite(
          item
        )
      ) {
        return item;
      }
    }
  }

  return null;
}

function isValidTimedLap(
  lap:
    RawLap
) {
  return (
    typeof lap.lap_duration ===
      "number" &&
    Number.isFinite(
      lap.lap_duration
    ) &&
    lap.lap_duration >
      30 &&
    lap.lap_duration <
      300 &&
    !lap.is_pit_out_lap
  );
}

/* =========================================================
   SESSIONS
   ========================================================= */

async function getCompletedSessions() {
  const currentYear =
    new Date()
      .getUTCFullYear();

  const thisYear =
    await fetchOpenF1<RawSession>(
      `sessions?year=${currentYear}`
    );

  let all =
    [...thisYear];

  if (
    all.length <
    10
  ) {
    const previous =
      await fetchOpenF1<RawSession>(
        `sessions?year=${
          currentYear -
          1
        }`
      );

    all = [
      ...all,
      ...previous,
    ];
  }

  const safeNow =
    Date.now() -
    5 *
      60 *
      1000;

  return all
    .filter(
      (
        session
      ) => {
        if (
          session.is_cancelled
        ) {
          return false;
        }

        const end =
          new Date(
            session.date_end
          ).getTime();

        if (
          !Number.isFinite(
            end
          ) ||
          end >
            safeNow
        ) {
          return false;
        }

        const name =
          (
            session.session_name ||
            ""
          )
            .toLowerCase();

        if (
          name.includes(
            "test"
          )
        ) {
          return false;
        }

        return true;
      }
    )
    .sort(
      (
        a,
        b
      ) =>
        new Date(
          b.date_end
        ).getTime() -
        new Date(
          a.date_end
        ).getTime()
    );
}

/* =========================================================
   FIND REPLAYABLE SESSION
   ========================================================= */

async function findReplayCandidate():
  Promise<{
    candidate:
      ReplayCandidate | null;

    latest:
      RawSession | null;
  }> {
  const sessions =
    await getCompletedSessions();

  const latest =
    sessions[
      0
    ] ??
    null;

  const candidates =
    sessions.slice(
      0,
      10
    );

  for (
    const session of
      candidates
  ) {
    const sessionKey =
      session.session_key;

    const results =
      await fetchOpenF1<RawResult>(
        `session_result?session_key=${sessionKey}`
      );

    if (
      results.length <
      5
    ) {
      continue;
    }

    const drivers =
      await fetchOpenF1<RawDriver>(
        `drivers?session_key=${sessionKey}`
      );

    if (
      drivers.length <
      5
    ) {
      continue;
    }

    /*
      Laps artık sector +
      mini-sector verilerini de içerir.
    */

    const laps =
      await fetchOpenF1<RawLap>(
        `laps?session_key=${sessionKey}`
      );

    const usableLaps =
      laps.filter(
        isValidTimedLap
      );

    if (
      usableLaps.length <
      10
    ) {
      continue;
    }

    return {
      candidate: {
        session,
        drivers,
        laps,
        results,
      },

      latest,
    };
  }

  return {
    candidate:
      null,

    latest,
  };
}

/* =========================================================
   LAP MAP
   ========================================================= */

function buildLapMap(
  rawLaps:
    RawLap[]
) {
  const lapsByDriver =
    new Map<
      number,
      TimedLap[]
    >();

  for (
    const lap of
      rawLaps
  ) {
    if (
      !lap.date_start
    ) {
      continue;
    }

    const start =
      new Date(
        lap.date_start
      ).getTime();

    if (
      !Number.isFinite(
        start
      )
    ) {
      continue;
    }

    const completed =
      typeof lap.lap_duration ===
        "number" &&
      Number.isFinite(
        lap.lap_duration
      )
        ? start +
          lap.lap_duration *
            1000
        : null;

    const estimatedEnd =
      completed ??
      start +
        120 *
          1000;

    addToMap(
      lapsByDriver,
      lap.driver_number,
      {
        ...lap,

        startTimestamp:
          start,

        completedTimestamp:
          completed,

        estimatedEndTimestamp:
          estimatedEnd,
      }
    );
  }

  for (
    const laps of
      lapsByDriver.values()
  ) {
    laps.sort(
      (
        a,
        b
      ) =>
        a.startTimestamp -
        b.startTimestamp
    );

    for (
      let index =
        0;
      index <
      laps.length -
        1;
      index += 1
    ) {
      const current =
        laps[
          index
        ];

      const next =
        laps[
          index +
          1
        ];

      if (
        current.completedTimestamp ===
        null
      ) {
        current.estimatedEndTimestamp =
          next.startTimestamp;
      }
    }
  }

  return lapsByDriver;
}

/* =========================================================
   LAP HELPERS
   ========================================================= */

function getLatestCompletedLap(
  laps:
    TimedLap[],

  timestamp:
    number
): TimedLap | null {
  let result:
    TimedLap | null =
    null;

  for (
    const lap of
      laps
  ) {
    if (
      lap.completedTimestamp ===
        null
    ) {
      continue;
    }

    if (
      lap.completedTimestamp <=
      timestamp
    ) {
      result =
        lap;
    } else {
      break;
    }
  }

  return result;
}

function getCurrentLap(
  laps:
    TimedLap[],

  timestamp:
    number
): TimedLap | null {
  let result:
    TimedLap | null =
    null;

  for (
    const lap of
      laps
  ) {
    if (
      lap.startTimestamp <=
      timestamp
    ) {
      result =
        lap;
    } else {
      break;
    }
  }

  return result;
}

function getBestLap(
  laps:
    TimedLap[],

  timestamp:
    number
): number | null {
  let best:
    number | null =
    null;

  for (
    const lap of
      laps
  ) {
    if (
      lap.completedTimestamp ===
        null ||
      lap.completedTimestamp >
        timestamp
    ) {
      continue;
    }

    if (
      !isValidTimedLap(
        lap
      )
    ) {
      continue;
    }

    const duration =
      lap.lap_duration;

    if (
      duration ===
      null
    ) {
      continue;
    }

    if (
      best ===
        null ||
      duration <
        best
    ) {
      best =
        duration;
    }
  }

  return best;
}

function getTrackProgress(
  laps:
    TimedLap[],

  timestamp:
    number
): number | null {
  const current =
    getCurrentLap(
      laps,
      timestamp
    );

  if (
    !current
  ) {
    return null;
  }

  const duration =
    Math.max(
      1000,

      current.estimatedEndTimestamp -
        current.startTimestamp
    );

  const progress =
    (
      timestamp -
      current.startTimestamp
    ) /
    duration;

  return clamp(
    progress,
    0,
    0.999999
  );
}

/* =========================================================
   CURRENT LAP TIMER
   ========================================================= */

function getCurrentLapTime(
  lap:
    TimedLap | null,

  timestamp:
    number
): number | null {
  if (
    !lap
  ) {
    return null;
  }

  const elapsed =
    Math.max(
      0,

      (
        timestamp -
        lap.startTimestamp
      ) /
        1000
    );

  /*
    Elimizde final lap duration varsa
    onun üzerine çıkma.
  */

  if (
    typeof lap.lap_duration ===
      "number" &&
    Number.isFinite(
      lap.lap_duration
    )
  ) {
    return Math.min(
      elapsed,
      lap.lap_duration
    );
  }

  return elapsed;
}

/* =========================================================
   MINI SECTOR REVEAL

   Historical API bütün turun final mini-sector
   datasını verir.

   Replay sırasında geleceği önceden göstermemek
   için segmentleri aracın trackProgress'i kadar
   adım adım açıyoruz.
   ========================================================= */

function blankSegments(
  length:
    number
) {
  return Array.from(
    {
      length,
    },

    () => 0
  );
}

function revealSegmentArray(
  source:
    number[],

  revealCount:
    number
) {
  if (
    source.length ===
    0
  ) {
    return [];
  }

  return source.map(
    (
      value,
      index
    ) =>
      index <
      revealCount
        ? value
        : 0
  );
}

function getMiniSectorSnapshot(
  lap:
    TimedLap | null,

  progress:
    number | null,

  forceComplete =
    false
): MiniSectorSnapshot {
  if (
    !lap
  ) {
    return {
      sector1:
        null,

      sector2:
        null,

      sector3:
        null,

      segments1:
        [],

      segments2:
        [],

      segments3:
        [],
    };
  }

  const source1 =
    Array.isArray(
      lap.segments_sector_1
    )
      ? lap.segments_sector_1
      : [];

  const source2 =
    Array.isArray(
      lap.segments_sector_2
    )
      ? lap.segments_sector_2
      : [];

  const source3 =
    Array.isArray(
      lap.segments_sector_3
    )
      ? lap.segments_sector_3
      : [];

  const total =
    source1.length +
    source2.length +
    source3.length;

  /*
    Eski sessionlarda mini-sector
    verisi hiç olmayabilir.
  */

  if (
    total ===
    0
  ) {
    return {
      sector1:
        forceComplete
          ? lap.duration_sector_1 ??
            null
          : null,

      sector2:
        forceComplete
          ? lap.duration_sector_2 ??
            null
          : null,

      sector3:
        forceComplete
          ? lap.duration_sector_3 ??
            null
          : null,

      segments1:
        blankSegments(
          source1.length
        ),

      segments2:
        blankSegments(
          source2.length
        ),

      segments3:
        blankSegments(
          source3.length
        ),
    };
  }

  const safeProgress =
    forceComplete
      ? 1
      : clamp(
          progress ??
            0,
          0,
          1
        );

  const revealed =
    forceComplete
      ? total
      : Math.floor(
          safeProgress *
            total
        );

  const revealed1 =
    Math.min(
      source1.length,
      revealed
    );

  const revealed2 =
    Math.min(
      source2.length,

      Math.max(
        0,

        revealed -
          source1.length
      )
    );

  const revealed3 =
    Math.min(
      source3.length,

      Math.max(
        0,

        revealed -
          source1.length -
          source2.length
      )
    );

  const sector1Done =
    forceComplete ||
    revealed >=
      source1.length;

  const sector2Done =
    forceComplete ||
    revealed >=
      source1.length +
        source2.length;

  const sector3Done =
    forceComplete ||
    revealed >=
      total;

  return {
    sector1:
      sector1Done
        ? lap.duration_sector_1 ??
          null
        : null,

    sector2:
      sector2Done
        ? lap.duration_sector_2 ??
          null
        : null,

    sector3:
      sector3Done
        ? lap.duration_sector_3 ??
          null
        : null,

    segments1:
      revealSegmentArray(
        source1,
        revealed1
      ),

    segments2:
      revealSegmentArray(
        source2,
        revealed2
      ),

    segments3:
      revealSegmentArray(
        source3,
        revealed3
      ),
  };
}

/* =========================================================
   POSITION MAP
   ========================================================= */

function buildPositionMap(
  raw:
    RawPosition[]
) {
  const map =
    new Map<
      number,
      TimedPosition[]
    >();

  for (
    const item of
      raw
  ) {
    const timestamp =
      new Date(
        item.date
      ).getTime();

    if (
      !Number.isFinite(
        timestamp
      )
    ) {
      continue;
    }

    addToMap(
      map,
      item.driver_number,
      {
        ...item,

        timestamp,
      }
    );
  }

  for (
    const positions of
      map.values()
  ) {
    positions.sort(
      (
        a,
        b
      ) =>
        a.timestamp -
        b.timestamp
    );
  }

  return map;
}

/* =========================================================
   INTERVAL MAP
   ========================================================= */

function buildIntervalMap(
  raw:
    RawInterval[]
) {
  const map =
    new Map<
      number,
      TimedInterval[]
    >();

  for (
    const item of
      raw
  ) {
    const timestamp =
      new Date(
        item.date
      ).getTime();

    if (
      !Number.isFinite(
        timestamp
      )
    ) {
      continue;
    }

    addToMap(
      map,
      item.driver_number,
      {
        ...item,

        timestamp,
      }
    );
  }

  for (
    const intervals of
      map.values()
  ) {
    intervals.sort(
      (
        a,
        b
      ) =>
        a.timestamp -
        b.timestamp
    );
  }

  return map;
}

/* =========================================================
   STINT MAP
   ========================================================= */

function buildStintMap(
  raw:
    RawStint[]
) {
  const map =
    new Map<
      number,
      RawStint[]
    >();

  for (
    const stint of
      raw
  ) {
    addToMap(
      map,
      stint.driver_number,
      stint
    );
  }

  for (
    const stints of
      map.values()
  ) {
    stints.sort(
      (
        a,
        b
      ) =>
        a.lap_start -
        b.lap_start
    );
  }

  return map;
}

function getCurrentStint(
  stints:
    RawStint[],

  lapNumber:
    number
): RawStint | null {
  if (
    stints.length ===
    0
  ) {
    return null;
  }

  if (
    lapNumber <=
    0
  ) {
    return (
      stints[
        0
      ] ??
      null
    );
  }

  for (
    const stint of
      stints
  ) {
    const end =
      stint.lap_end ??
      Number.MAX_SAFE_INTEGER;

    if (
      lapNumber >=
        stint.lap_start &&
      lapNumber <=
        end
    ) {
      return stint;
    }
  }

  return (
    stints[
      stints.length -
      1
    ] ??
    null
  );
}

/* =========================================================
   TRACK GEOMETRY
   ========================================================= */

async function buildTrackGeometry(
  sessionKey:
    number,

  rawLaps:
    RawLap[]
): Promise<ReplayTrack | null> {
  const usable =
    rawLaps
      .filter(
        (
          lap
        ) =>
          Boolean(
            lap.date_start
          ) &&
          isValidTimedLap(
            lap
          )
      )
      .sort(
        (
          a,
          b
        ) =>
          (
            a.lap_duration ??
            9999
          ) -
          (
            b.lap_duration ??
            9999
          )
      );

  const lap =
    usable[
      0
    ];

  if (
    !lap ||
    !lap.date_start ||
    !lap.lap_duration
  ) {
    return null;
  }

  const start =
    new Date(
      lap.date_start
    );

  const end =
    new Date(
      start.getTime() +
        lap.lap_duration *
          1000
    );

  const startIso =
    new Date(
      start.getTime() -
        1000
    ).toISOString();

  const endIso =
    new Date(
      end.getTime() +
        1000
    ).toISOString();

  const path =
    `location?session_key=${sessionKey}` +
    `&driver_number=${lap.driver_number}` +
    `&date>${encodeURIComponent(
      startIso
    )}` +
    `&date<${encodeURIComponent(
      endIso
    )}`;

  const rawLocation =
    await fetchOpenF1<RawLocation>(
      path
    );

  if (
    rawLocation.length <
    20
  ) {
    return null;
  }

  /*
    Daha önce yaklaşık 190 nokta
    kullanıyorduk.

    Haritayı biraz daha pürüzsüz
    yapmak için 320 noktaya çıkardık.
  */

  const target =
    320;

  const step =
    Math.max(
      1,

      Math.ceil(
        rawLocation.length /
          target
      )
    );

  const points:
    ReplayTrackPoint[] =
    [];

  for (
    let index =
      0;
    index <
    rawLocation.length;
    index += step
  ) {
    const item =
      rawLocation[
        index
      ];

    points.push({
      x:
        item.x,

      y:
        item.y,

      z:
        item.z,
    });
  }

  const final =
    rawLocation[
      rawLocation.length -
      1
    ];

  const last =
    points[
      points.length -
      1
    ];

  if (
    final &&
    (
      !last ||
      final.x !==
        last.x ||
      final.y !==
        last.y
    )
  ) {
    points.push({
      x:
        final.x,

      y:
        final.y,

      z:
        final.z,
    });
  }

  return {
    points,

    sourceDriver:
      lap.driver_number,

    sourceLap:
      lap.lap_number,
  };
}

/* =========================================================
   MAIN
   ========================================================= */

export async function getLatestF1Replay():
  Promise<F1ReplayData | null> {
  const {
    candidate,
    latest,
  } =
    await findReplayCandidate();

  if (
    !candidate
  ) {
    console.error(
      "No replayable F1 session found."
    );

    return null;
  }

  const {
    session,

    drivers:
      rawDrivers,

    laps:
      rawLaps,

    results:
      rawResults,
  } =
    candidate;

  const sessionKey =
    session.session_key;

  const kind =
    getSessionKind(
      session
    );

  const rawPositions =
    await fetchOpenF1<RawPosition>(
      `position?session_key=${sessionKey}`
    );

  const rawStints =
    await fetchOpenF1<RawStint>(
      `stints?session_key=${sessionKey}`
    );

  let rawIntervals:
    RawInterval[] =
    [];

  if (
    kind ===
    "race"
  ) {
    rawIntervals =
      await fetchOpenF1<RawInterval>(
        `intervals?session_key=${sessionKey}`
      );
  }

  const rawRaceControl =
    await fetchOpenF1<RawRaceControl>(
      `race_control?session_key=${sessionKey}`
    );

  const track =
    await buildTrackGeometry(
      sessionKey,
      rawLaps
    );

  /* =======================================================
     DRIVERS
     ======================================================= */

  const driverMap =
    new Map<
      number,
      ReplayDriver
    >();

  for (
    const driver of
      rawDrivers
  ) {
    const name =
      driver.full_name ||
      driver.broadcast_name ||
      `${driver.first_name ?? ""} ${
        driver.last_name ?? ""
      }`.trim() ||
      `Driver #${driver.driver_number}`;

    driverMap.set(
      driver.driver_number,
      {
        driverNumber:
          driver.driver_number,

        name,

        acronym:
          driver.name_acronym ||
          name
            .slice(
              0,
              3
            )
            .toUpperCase(),

        team:
          driver.team_name ||
          "Formula 1",

        teamColour:
          driver.team_colour
            ? driver.team_colour.startsWith(
                "#"
              )
              ? driver.team_colour
              : `#${driver.team_colour}`
            : null,

        headshotUrl:
          driver.headshot_url ||
          null,
      }
    );
  }

  for (
    const result of
      rawResults
  ) {
    if (
      driverMap.has(
        result.driver_number
      )
    ) {
      continue;
    }

    driverMap.set(
      result.driver_number,
      {
        driverNumber:
          result.driver_number,

        name:
          `Driver #${result.driver_number}`,

        acronym:
          String(
            result.driver_number
          ),

        team:
          "Formula 1",

        teamColour:
          null,

        headshotUrl:
          null,
      }
    );
  }

  const drivers =
    Array.from(
      driverMap.values()
    );

  /* =======================================================
     MAPS
     ======================================================= */

  const lapsByDriver =
    buildLapMap(
      rawLaps
    );

  const positionsByDriver =
    buildPositionMap(
      rawPositions
    );

  const intervalsByDriver =
    buildIntervalMap(
      rawIntervals
    );

  const stintsByDriver =
    buildStintMap(
      rawStints
    );

  const resultsByDriver =
    new Map<
      number,
      RawResult
    >();

  let totalLaps =
    0;

  for (
    const result of
      rawResults
  ) {
    resultsByDriver.set(
      result.driver_number,
      result
    );

    totalLaps =
      Math.max(
        totalLaps,
        result.number_of_laps
      );
  }

  /* =======================================================
     SESSION TIMES
     ======================================================= */

  const sessionStart =
    new Date(
      session.date_start
    ).getTime();

  const sessionEnd =
    new Date(
      session.date_end
    ).getTime();

  if (
    !Number.isFinite(
      sessionStart
    ) ||
    !Number.isFinite(
      sessionEnd
    ) ||
    sessionEnd <=
      sessionStart
  ) {
    return null;
  }

  let earliestData =
    sessionEnd;

  for (
    const lap of
      rawLaps
  ) {
    if (
      !lap.date_start
    ) {
      continue;
    }

    const time =
      new Date(
        lap.date_start
      ).getTime();

    if (
      Number.isFinite(
        time
      )
    ) {
      earliestData =
        Math.min(
          earliestData,
          time
        );
    }
  }

  for (
    const position of
      rawPositions
  ) {
    const time =
      new Date(
        position.date
      ).getTime();

    if (
      Number.isFinite(
        time
      )
    ) {
      earliestData =
        Math.min(
          earliestData,
          time
        );
    }
  }

  const replayStart =
    Math.max(
      sessionStart,

      Math.min(
        earliestData -
          5000,

        sessionEnd
      )
    );

  const replayDuration =
    sessionEnd -
    replayStart;

  /*
    Önceki 260 frame yerine 420.

    Map ve timing değişimleri daha sık.
  */

  const targetFrameCount =
    420;

  const frameStep =
    clamp(
      Math.ceil(
        replayDuration /
          targetFrameCount
      ),

      4000,

      18000
    );

  /* =======================================================
     CREATE FRAME
     ======================================================= */

  function createFrame(
    timestamp:
      number,

    finalFrame:
      boolean
  ): ReplayFrame {
    const working =
      drivers.map(
        (
          driver
        ) => {
          const driverNumber =
            driver.driverNumber;

          const laps =
            lapsByDriver.get(
              driverNumber
            ) ??
            [];

          const latestLap =
            getLatestCompletedLap(
              laps,
              timestamp
            );

          const currentLap =
            getCurrentLap(
              laps,
              timestamp
            );

          const bestLap =
            getBestLap(
              laps,
              timestamp
            );

          const lapNumber =
            currentLap
              ?.lap_number ??
            latestLap
              ?.lap_number ??
            0;

          const trackProgress =
            getTrackProgress(
              laps,
              timestamp
            );

          const currentLapTime =
            getCurrentLapTime(
              currentLap,
              timestamp
            );

          /*
            Mini sectors current lap üzerinden
            adım adım açılıyor.
          */

          const miniSectors =
            getMiniSectorSnapshot(
              currentLap,

              trackProgress,

              finalFrame
            );

          const stints =
            stintsByDriver.get(
              driverNumber
            ) ??
            [];

          const currentStint =
            getCurrentStint(
              stints,
              lapNumber
            );

          const tyreAge =
            currentStint
              ? (
                  currentStint
                    .tyre_age_at_start ??
                  0
                ) +
                Math.max(
                  0,

                  lapNumber -
                    currentStint.lap_start
                )
              : null;

          const positions =
            positionsByDriver.get(
              driverNumber
            ) ??
            [];

          const positionEvent =
            latestBefore(
              positions,
              timestamp
            );

          const intervals =
            intervalsByDriver.get(
              driverNumber
            ) ??
            [];

          const intervalEvent =
            latestBefore(
              intervals,
              timestamp
            );

          const result =
            resultsByDriver.get(
              driverNumber
            );

          return {
            driverNumber,

            latestLap,
            currentLap,

            bestLap,

            lapNumber,

            currentLapTime,

            miniSectors,

            currentStint,

            tyreAge,

            positionEvent,

            intervalEvent,

            result,

            trackProgress,
          };
        }
      );

    const rows:
      ReplayDriverFrame[] =
      [];

    /* =====================================================
       PRACTICE / QUALIFYING
       ===================================================== */

    if (
      kind ===
        "practice" ||
      kind ===
        "qualifying"
    ) {
      const sorted =
        [...working].sort(
          (
            a,
            b
          ) => {
            if (
              finalFrame
            ) {
              const posA =
                a.result
                  ?.position ??
                999;

              const posB =
                b.result
                  ?.position ??
                999;

              if (
                posA !==
                posB
              ) {
                return (
                  posA -
                  posB
                );
              }
            }

            const timeA =
              a.bestLap ??
              Number.POSITIVE_INFINITY;

            const timeB =
              b.bestLap ??
              Number.POSITIVE_INFINITY;

            if (
              timeA !==
              timeB
            ) {
              return (
                timeA -
                timeB
              );
            }

            return (
              a.driverNumber -
              b.driverNumber
            );
          }
        );

      const leaderBest =
        sorted.find(
          (
            item
          ) =>
            item.bestLap !==
            null
        )?.bestLap ??
        null;

      for (
        let index =
          0;
        index <
        sorted.length;
        index += 1
      ) {
        const item =
          sorted[
            index
          ];

        const result =
          item.result;

        const officialBest =
          finalFrame
            ? normalizeResultDuration(
                result
                  ?.duration ??
                  null
              )
            : null;

        const bestLap =
          officialBest ??
          item.bestLap;

        const position =
          finalFrame
            ? result
                ?.position ??
              null
            : bestLap !==
              null
            ? index +
              1
            : null;

        let gap:
          | number
          | string
          | null =
          null;

        if (
          finalFrame
        ) {
          gap =
            normalizeResultGap(
              result
                ?.gap_to_leader ??
                null
            );
        } else if (
          leaderBest !==
            null &&
          bestLap !==
            null
        ) {
          gap =
            Math.max(
              0,

              bestLap -
                leaderBest
            );
        }

        rows.push({
          driverNumber:
            item.driverNumber,

          position,

          lapNumber:
            item.lapNumber,

          currentLapTime:
            item.currentLapTime,

          lastLap:
            item.latestLap
              ?.lap_duration ??
            null,

          bestLap,

          sector1:
            item.miniSectors
              .sector1,

          sector2:
            item.miniSectors
              .sector2,

          sector3:
            item.miniSectors
              .sector3,

          segmentsSector1:
            item.miniSectors
              .segments1,

          segmentsSector2:
            item.miniSectors
              .segments2,

          segmentsSector3:
            item.miniSectors
              .segments3,

          gap,

          interval:
            null,

          tyre:
            item.currentStint
              ?.compound ??
            null,

          tyreAge:
            item.tyreAge,

          stintNumber:
            item.currentStint
              ?.stint_number ??
            null,

          trackProgress:
            item.trackProgress,

          dnf:
            finalFrame
              ? result
                  ?.dnf ??
                false
              : false,

          dns:
            finalFrame
              ? result
                  ?.dns ??
                false
              : false,

          dsq:
            finalFrame
              ? result
                  ?.dsq ??
                false
              : false,
        });
      }
    } else {
      /* ===================================================
         RACE / SPRINT
         =================================================== */

      for (
        const item of
          working
      ) {
        const result =
          item.result;

        const position =
          finalFrame
            ? result
                ?.position ??
              item.positionEvent
                ?.position ??
              null
            : item.positionEvent
                ?.position ??
              null;

        const gap =
          finalFrame
            ? normalizeResultGap(
                result
                  ?.gap_to_leader ??
                  null
              )
            : item.intervalEvent
                ?.gap_to_leader ??
              null;

        rows.push({
          driverNumber:
            item.driverNumber,

          position,

          lapNumber:
            item.lapNumber,

          currentLapTime:
            item.currentLapTime,

          lastLap:
            item.latestLap
              ?.lap_duration ??
            null,

          bestLap:
            item.bestLap,

          /*
            Race'te OpenF1 mini-sectors
            desteklemiyor.
          */

          sector1:
            null,

          sector2:
            null,

          sector3:
            null,

          segmentsSector1:
            [],

          segmentsSector2:
            [],

          segmentsSector3:
            [],

          gap,

          interval:
            item.intervalEvent
              ?.interval ??
            null,

          tyre:
            item.currentStint
              ?.compound ??
            null,

          tyreAge:
            item.tyreAge,

          stintNumber:
            item.currentStint
              ?.stint_number ??
            null,

          trackProgress:
            item.trackProgress,

          dnf:
            finalFrame
              ? result
                  ?.dnf ??
                false
              : false,

          dns:
            finalFrame
              ? result
                  ?.dns ??
                false
              : false,

          dsq:
            finalFrame
              ? result
                  ?.dsq ??
                false
              : false,
        });
      }

      rows.sort(
        (
          a,
          b
        ) =>
          (
            a.position ??
            999
          ) -
          (
            b.position ??
            999
          )
      );
    }

    const currentRaceLap =
      kind ===
      "race"
        ? Math.max(
            0,

            ...rows.map(
              (
                row
              ) =>
                row.lapNumber
            )
          )
        : 0;

    return {
      timestamp,

      elapsedMs:
        Math.max(
          0,

          timestamp -
            sessionStart
        ),

      remainingMs:
        Math.max(
          0,

          sessionEnd -
            timestamp
        ),

      lapNumber:
        currentRaceLap,

      drivers:
        rows,
    };
  }

  /* =======================================================
     FRAMES
     ======================================================= */

  const frames:
    ReplayFrame[] =
    [];

  let timestamp =
    replayStart;

  while (
    timestamp <
    sessionEnd
  ) {
    frames.push(
      createFrame(
        timestamp,
        false
      )
    );

    timestamp +=
      frameStep;
  }

  frames.push(
    createFrame(
      sessionEnd,
      true
    )
  );

  /* =======================================================
     RACE CONTROL
     ======================================================= */

  const events:
    ReplayRaceControlEvent[] =
    [];

  for (
    const event of
      rawRaceControl
  ) {
    const eventTimestamp =
      new Date(
        event.date
      ).getTime();

    if (
      !Number.isFinite(
        eventTimestamp
      )
    ) {
      continue;
    }

    events.push({
      timestamp:
        eventTimestamp,

      category:
        event.category ??
        null,

      flag:
        event.flag ??
        null,

      message:
        event.message ||
        event.flag ||
        event.category ||
        "Race Control",

      lapNumber:
        event.lap_number ??
        null,
    });
  }

  events.sort(
    (
      a,
      b
    ) =>
      a.timestamp -
      b.timestamp
  );

  const latestSession =
    latest
      ? normalizeSession(
          latest
        )
      : null;

  const replaySession =
    normalizeSession(
      session
    );

  const archivePending =
    Boolean(
      latestSession &&
      latestSession.sessionKey !==
        replaySession.sessionKey
    );

  console.log(
    "F1 REPLAY V3:",
    {
      latestCompleted:
        latestSession
          ? `${latestSession.location} · ${latestSession.sessionName}`
          : null,

      replay:
        `${replaySession.location} · ${replaySession.sessionName}`,

      kind,

      archivePending,

      drivers:
        drivers.length,

      laps:
        rawLaps.length,

      frames:
        frames.length,

      trackPoints:
        track
          ?.points
          .length ??
        0,

      miniSectorLaps:
        rawLaps.filter(
          (
            lap
          ) =>
            (
              lap.segments_sector_1
                ?.length ??
              0
            ) >
            0
        ).length,
    }
  );

  return {
    session:
      replaySession,

    latestCompletedSession:
      latestSession,

    archivePending,

    drivers,

    frames,

    events,

    totalLaps,

    track,

    generatedAt:
      new Date()
        .toISOString(),
  };
}