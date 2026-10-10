"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import F1TrackMap from "@/components/F1TrackMap";

import TopThreeSpotlight, {
  type SpotlightDriver,
} from "@/components/TopThreeSpotlight";

import ProjectedChampionship, {
  type ChampionshipStanding,
  type ChampionshipLiveDriver,
} from "@/components/ProjectedChampionship";

/* =========================================================
   TYPES
   ========================================================= */

type SessionKind =
  | "practice"
  | "qualifying"
  | "race";

type RaceHubTab =
  | "championship"
  | "track"
  | "control";

type ReplayDriver = {
  driverNumber: number;
  name: string;
  acronym: string;
  team: string;
  teamColour: string | null;
  headshotUrl: string | null;
};

type ReplayFrameDriver = {
  driverNumber: number;

  position:
    | number
    | null;

  lapNumber: number;

  currentLapTime:
    | number
    | null;

  lastLap:
    | number
    | null;

  bestLap:
    | number
    | null;

  sector1:
    | number
    | null;

  sector2:
    | number
    | null;

  sector3:
    | number
    | null;

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

  trackProgress:
    | number
    | null;

  dnf: boolean;
  dns: boolean;
  dsq: boolean;
};

type ReplayFrame = {
  timestamp: number;
  elapsedMs: number;
  remainingMs: number;
  lapNumber: number;

  drivers:
    ReplayFrameDriver[];
};

type ReplayEvent = {
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

type ReplayTrack = {
  points: {
    x: number;
    y: number;
    z: number;
  }[];

  sourceDriver: number;
  sourceLap: number;
};

type ReplaySession = {
  sessionKey: number;
  meetingKey: number;

  sessionName: string;
  sessionType: string;

  kind:
    SessionKind;

  location: string;
  country: string;

  circuitName: string;

  dateStart: string;
  dateEnd: string;

  year: number;

  durationMs: number;
};

type ReplayData = {
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
    ReplayEvent[];

  totalLaps: number;

  track:
    ReplayTrack | null;

  generatedAt: string;
};

type ReplayApiResponse = {
  ok: boolean;

  replay?:
    ReplayData;

  error?:
    string;
};

/* =========================================================
   LIVE
   ========================================================= */

type LiveDriver = {
  driver_number?:
    number;

  driverNumber?:
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

  livePosition?:
    number | null;

  position?:
    number | null;

  gap?:
    number | string | null;

  gap_to_leader?:
    number | string | null;

  interval?:
    number | string | null;

  lastLap?:
    number | null;

  last_lap?:
    number | null;

  bestLap?:
    number | null;

  best_lap?:
    number | null;

  lapNumber?:
    number | null;

  lap_number?:
    number | null;

  tyre?:
    string | null;

  compound?:
    string | null;

  tyreAge?:
    number | null;

  tyre_age?:
    number | null;

  stintNumber?:
    number | null;

  stint_number?:
    number | null;
};

type LiveResponse = {
  live?:
    boolean;

  timingAvailable?:
    boolean;

  currentSession?: {
    label?:
      string;

    shortLabel?:
      string;

    key?:
      string;

    startTimestamp?:
      number;

    endTimestamp?:
      number;
  } | null;

  nextSession?: {
    label?:
      string;

    shortLabel?:
      string;

    key?:
      string;

    startTimestamp?:
      number;

    endTimestamp?:
      number;
  } | null;

  session?: {
    session_name?:
      string;

    session_type?:
      string;

    location?:
      string;

    country_name?:
      string;

    date_start?:
      string;

    date_end?:
      string;
  } | null;

  openF1Session?: {
    session_name?:
      string;

    session_type?:
      string;

    location?:
      string;

    country_name?:
      string;

    date_start?:
      string;

    date_end?:
      string;
  } | null;

  drivers?:
    LiveDriver[];
};

/* =========================================================
   CHAMPIONSHIP
   ========================================================= */

type ChampionshipApiResponse = {
  ok: boolean;

  season?:
    number;

  round?:
    number;

  standings?:
    ChampionshipStanding[];

  error?:
    string;
};

/* =========================================================
   DISPLAY
   ========================================================= */

type PositionMovement =
  | "up"
  | "down"
  | null;

type DisplayRow = {
  driverNumber: number;

  position:
    number | null;

  name: string;
  acronym: string;

  team: string;
  colour: string;

  headshot:
    string | null;

  lapNumber:
    number | null;

  currentLapTime:
    number | null;

  lastLap:
    number | null;

  bestLap:
    number | null;

  sector1:
    number | null;

  sector2:
    number | null;

  sector3:
    number | null;

  segmentsSector1:
    number[];

  segmentsSector2:
    number[];

  segmentsSector3:
    number[];

  gap:
    number | string | null;

  interval:
    number | string | null;

  tyre:
    string | null;

  tyreAge:
    number | null;

  stint:
    number | null;

  status:
    string | null;

  inactive:
    boolean;
};

type RetirementInfo = {
  startIndex: number;

  status:
    | "DNF"
    | "DNS"
    | "DSQ";
};

type PlaybackSpeed =
  | 0.5
  | 1
  | 2
  | 4;

/* =========================================================
   HELPERS
   ========================================================= */

function inferKind(
  value: string
): SessionKind {
  const text =
    value.toLowerCase();

  if (
    text.includes(
      "practice"
    ) ||
    text.includes(
      "fp"
    )
  ) {
    return "practice";
  }

  if (
    text.includes(
      "qualifying"
    ) ||
    text.includes(
      "shootout"
    )
  ) {
    return "qualifying";
  }

  return "race";
}

function normaliseColour(
  colour:
    string | undefined
) {
  if (!colour) {
    return "#79828d";
  }

  return colour.startsWith(
    "#"
  )
    ? colour
    : `#${colour}`;
}

function formatLap(
  seconds:
    number |
    null |
    undefined
) {
  if (
    seconds === null ||
    seconds === undefined ||
    !Number.isFinite(
      seconds
    )
  ) {
    return "—";
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  const remaining =
    seconds -
    minutes * 60;

  return `${minutes}:${remaining
    .toFixed(3)
    .padStart(
      6,
      "0"
    )}`;
}

function formatSector(
  seconds:
    number |
    null |
    undefined
) {
  if (
    seconds === null ||
    seconds === undefined ||
    !Number.isFinite(
      seconds
    )
  ) {
    return "—";
  }

  return seconds.toFixed(
    3
  );
}

function formatGap(
  value:
    number |
    string |
    null |
    undefined,

  leader =
    false
) {
  if (leader) {
    return "LEADER";
  }

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (
    typeof value ===
    "number"
  ) {
    if (
      Math.abs(
        value
      ) <
      0.0005
    ) {
      return "0.000";
    }

    return `+${value.toFixed(
      3
    )}`;
  }

  return String(
    value
  );
}

function formatClock(
  milliseconds:
    number
) {
  const totalSeconds =
    Math.max(
      0,
      Math.floor(
        milliseconds /
          1000
      )
    );

  const hours =
    Math.floor(
      totalSeconds /
        3600
    );

  const minutes =
    Math.floor(
      (
        totalSeconds %
        3600
      ) /
        60
    );

  const seconds =
    totalSeconds %
    60;

  if (
    hours > 0
  ) {
    return `${String(
      hours
    ).padStart(
      2,
      "0"
    )}:${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      seconds
    ).padStart(
      2,
      "0"
    )}`;
  }

  return `${String(
    minutes
  ).padStart(
    2,
    "0"
  )}:${String(
    seconds
  ).padStart(
    2,
    "0"
  )}`;
}

function formatDateTR(
  value:
    string
) {
  try {
    return new Intl.DateTimeFormat(
      "tr-TR",
      {
        day:
          "2-digit",

        month:
          "long",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",

        timeZone:
          "Europe/Istanbul",
      }
    ).format(
      new Date(
        value
      )
    );
  } catch {
    return value;
  }
}

function tyreLetter(
  value:
    string | null
) {
  switch (
    value?.toUpperCase()
  ) {
    case "SOFT":
      return "S";

    case "MEDIUM":
      return "M";

    case "HARD":
      return "H";

    case "INTERMEDIATE":
      return "I";

    case "WET":
      return "W";

    default:
      return "—";
  }
}

function tyreClass(
  value:
    string | null
) {
  switch (
    value?.toUpperCase()
  ) {
    case "SOFT":
      return "soft";

    case "MEDIUM":
      return "medium";

    case "HARD":
      return "hard";

    case "INTERMEDIATE":
      return "inter";

    case "WET":
      return "wet";

    default:
      return "unknown";
  }
}

function miniSectorClass(
  code:
    number
) {
  switch (
    code
  ) {
    case 2048:
      return "mini-yellow";

    case 2049:
      return "mini-green";

    case 2051:
      return "mini-purple";

    case 2064:
      return "mini-pit";

    default:
      return "mini-empty";
  }
}

function findFirstUsefulFrame(
  replay:
    ReplayData
) {
  const index =
    replay.frames.findIndex(
      (
        frame
      ) =>
        frame.drivers.some(
          (
            driver
          ) =>
            driver.position !==
              null ||
            driver.bestLap !==
              null ||
            driver.lastLap !==
              null ||
            driver.lapNumber >
              0
        )
    );

  return index >=
    0
    ? index
    : 0;
}

/* =========================================================
   MAIN
   ========================================================= */

export default function F1LiveReplayCenter() {
  const [
    liveData,
    setLiveData,
  ] =
    useState<LiveResponse | null>(
      null
    );

  const [
    replay,
    setReplay,
  ] =
    useState<ReplayData | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  const [
    frameIndex,
    setFrameIndex,
  ] =
    useState(
      0
    );

  const [
    playing,
    setPlaying,
  ] =
    useState(
      true
    );

  const [
    speed,
    setSpeed,
  ] =
    useState<PlaybackSpeed>(
      1
    );

  const [
    hubTab,
    setHubTab,
  ] =
    useState<RaceHubTab>(
      "championship"
    );

  /* =======================================================
     CHAMPIONSHIP STATE
     ======================================================= */

  const [
    championshipStandings,
    setChampionshipStandings,
  ] =
    useState<
      ChampionshipStanding[]
    >(
      []
    );

  const [
    championshipLoading,
    setChampionshipLoading,
  ] =
    useState(
      true
    );

  const [
    championshipSeason,
    setChampionshipSeason,
  ] =
    useState<
      number | null
    >(
      null
    );

  /* =======================================================
     MOVEMENT
     ======================================================= */

  const [
    liveMovements,
    setLiveMovements,
  ] =
    useState<
      Map<
        number,
        PositionMovement
      >
    >(
      new Map()
    );

  const previousLivePositions =
    useRef<
      Map<
        number,
        number
      >
    >(
      new Map()
    );

  const liveMovementTimer =
    useRef<
      number | null
    >(
      null
    );

  const replayRef =
    useRef<ReplayData | null>(
      null
    );

  const loadingReplayRef =
    useRef(
      false
    );

  const lastReplayFetch =
    useRef(
      0
    );

  useEffect(
    () => {
      replayRef.current =
        replay;
    },
    [
      replay,
    ]
  );

  useEffect(
    () => {
      return () => {
        if (
          liveMovementTimer.current !==
          null
        ) {
          window.clearTimeout(
            liveMovementTimer.current
          );
        }
      };
    },
    []
  );

  const live =
    Boolean(
      liveData?.live
    );

  /* =======================================================
     CHAMPIONSHIP FETCH
     ======================================================= */

  const loadChampionship =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              `/api/live/championship?t=${Date.now()}`,
              {
                cache:
                  "no-store",
              }
            );

          const data =
            (
              await response.json()
            ) as ChampionshipApiResponse;

          if (
            !response.ok ||
            !data.ok ||
            !data.standings
          ) {
            throw new Error(
              data.error ||
                "Şampiyona sıralaması alınamadı."
            );
          }

          setChampionshipStandings(
            data.standings
          );

          setChampionshipSeason(
            data.season ??
              null
          );
        } catch (
          championshipError
        ) {
          console.error(
            "CHAMPIONSHIP FETCH ERROR:",
            championshipError
          );
        } finally {
          setChampionshipLoading(
            false
          );
        }
      },
      []
    );

  useEffect(
    () => {
      void loadChampionship();

      const timer =
        window.setInterval(
          () => {
            void loadChampionship();
          },

          5 *
            60 *
            1000
        );

      return () => {
        window.clearInterval(
          timer
        );
      };
    },
    [
      loadChampionship,
    ]
  );

  /* =======================================================
     LOAD REPLAY
     ======================================================= */

  const loadReplay =
    useCallback(
      async (
        force =
          false
      ) => {
        if (
          loadingReplayRef.current
        ) {
          return;
        }

        const now =
          Date.now();

        if (
          !force &&
          replayRef.current &&
          now -
            lastReplayFetch.current <
            5 *
              60 *
              1000
        ) {
          return;
        }

        loadingReplayRef.current =
          true;

        try {
          const response =
            await fetch(
              `/api/live/replay?t=${now}`,
              {
                cache:
                  "no-store",
              }
            );

          const data =
            (
              await response.json()
            ) as ReplayApiResponse;

          if (
            !response.ok ||
            !data.ok ||
            !data.replay
          ) {
            throw new Error(
              data.error ||
                `Replay alınamadı. HTTP ${response.status}`
            );
          }

          const nextReplay =
            data.replay;

          replayRef.current =
            nextReplay;

          setReplay(
            nextReplay
          );

          setFrameIndex(
            findFirstUsefulFrame(
              nextReplay
            )
          );

          setPlaying(
            true
          );

          lastReplayFetch.current =
            now;

          setError(
            ""
          );
        } catch (
          replayError
        ) {
          console.error(
            replayError
          );

          setError(
            replayError instanceof Error
              ? replayError.message
              : "Replay yüklenemedi."
          );
        } finally {
          loadingReplayRef.current =
            false;
        }
      },
      []
    );

  /* =======================================================
     LIVE WATCH
     ======================================================= */

  const checkLive =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              `/api/live?t=${Date.now()}`,
              {
                cache:
                  "no-store",
              }
            );

          if (
            !response.ok
          ) {
            throw new Error(
              "Live endpoint çalışmadı."
            );
          }

          const data =
            (
              await response.json()
            ) as LiveResponse;

          setLiveData(
            data
          );

          if (
            !data.live
          ) {
            await loadReplay();
          }
        } catch (
          liveError
        ) {
          console.error(
            liveError
          );

          await loadReplay();
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        loadReplay,
      ]
    );

  useEffect(
    () => {
      void checkLive();

      const timer =
        window.setInterval(
          () => {
            void checkLive();
          },
          15000
        );

      return () => {
        window.clearInterval(
          timer
        );
      };
    },
    [
      checkLive,
    ]
  );

  /* =======================================================
     REPLAY PLAYER
     ======================================================= */

  useEffect(
    () => {
      if (
        live ||
        !replay ||
        !playing ||
        replay.frames.length <=
          1
      ) {
        return;
      }

      const interval =
        Math.max(
          120,

          Math.round(
            700 /
              speed
          )
        );

      const timer =
        window.setInterval(
          () => {
            setFrameIndex(
              (
                current
              ) => {
                const finalIndex =
                  replay.frames.length -
                  1;

                if (
                  current >=
                  finalIndex
                ) {
                  setPlaying(
                    false
                  );

                  return finalIndex;
                }

                return (
                  current +
                  1
                );
              }
            );
          },
          interval
        );

      return () => {
        window.clearInterval(
          timer
        );
      };
    },
    [
      live,
      replay,
      playing,
      speed,
    ]
  );

  /* =======================================================
     FRAME
     ======================================================= */

  const safeFrameIndex =
    replay
      ? Math.min(
          frameIndex,

          Math.max(
            0,

            replay.frames.length -
              1
          )
        )
      : 0;

  const currentFrame =
    replay
      ?.frames[
        safeFrameIndex
      ] ??
    null;

  const previousFrame =
    replay &&
    safeFrameIndex >
      0
      ? replay.frames[
          safeFrameIndex -
            1
        ]
      : null;

  const sessionKind:
    SessionKind =
    live
      ? inferKind(
          liveData
            ?.currentSession
            ?.label ||
            liveData
              ?.session
              ?.session_name ||
            ""
        )
      : replay
      ? replay.session.kind
      : "race";

  /* =======================================================
     SESSION DESCRIPTION
     ======================================================= */

  const sessionDescriptor =
    (
      live
        ? [
            liveData
              ?.currentSession
              ?.label,

            liveData
              ?.currentSession
              ?.shortLabel,

            liveData
              ?.session
              ?.session_name,

            liveData
              ?.session
              ?.session_type,

            liveData
              ?.openF1Session
              ?.session_name,

            liveData
              ?.openF1Session
              ?.session_type,
          ]
        : [
            replay
              ?.session
              .sessionName,

            replay
              ?.session
              .sessionType,
          ]
    )
      .filter(
        Boolean
      )
      .join(
        " "
      )
      .toLowerCase();

  const isSprintSession =
    sessionDescriptor.includes(
      "sprint"
    ) &&
    !sessionDescriptor.includes(
      "qualifying"
    ) &&
    !sessionDescriptor.includes(
      "shootout"
    );

  const isPointsSession =
    sessionKind ===
      "race" &&
    !sessionDescriptor.includes(
      "qualifying"
    ) &&
    !sessionDescriptor.includes(
      "shootout"
    ) &&
    !sessionDescriptor.includes(
      "practice"
    );

  const projectionActive =
    live &&
    Boolean(
      liveData
        ?.timingAvailable
    ) &&
    isPointsSession;

  useEffect(
    () => {
      if (
        projectionActive
      ) {
        setHubTab(
          "championship"
        );
      }
    },
    [
      projectionActive,
    ]
  );

  /* =======================================================
     DRIVER MAP
     ======================================================= */

  const replayDriverMap =
    useMemo(
      () => {
        const map =
          new Map<
            number,
            ReplayDriver
          >();

        for (
          const driver of
            replay?.drivers ??
          []
        ) {
          map.set(
            driver.driverNumber,
            driver
          );
        }

        return map;
      },
      [
        replay,
      ]
    );

  /* =======================================================
     RETIREMENTS
     ======================================================= */

  const retirementMap =
    useMemo(
      () => {
        const map =
          new Map<
            number,
            RetirementInfo
          >();

        if (
          !replay ||
          replay.frames.length ===
            0
        ) {
          return map;
        }

        const finalFrame =
          replay.frames[
            replay.frames.length -
              1
          ];

        for (
          const finalDriver of
            finalFrame.drivers
        ) {
          let status:
            | RetirementInfo["status"]
            | null =
            null;

          if (
            finalDriver.dsq
          ) {
            status =
              "DSQ";
          } else if (
            finalDriver.dns
          ) {
            status =
              "DNS";
          } else if (
            finalDriver.dnf
          ) {
            status =
              "DNF";
          }

          if (!status) {
            continue;
          }

          if (
            status ===
            "DNS"
          ) {
            map.set(
              finalDriver.driverNumber,
              {
                startIndex:
                  0,

                status,
              }
            );

            continue;
          }

          let previousLap =
            0;

          let lastLapChangeIndex =
            0;

          for (
            let index =
              0;
            index <
            replay.frames.length;
            index += 1
          ) {
            const driver =
              replay.frames[
                index
              ].drivers.find(
                (
                  item
                ) =>
                  item.driverNumber ===
                  finalDriver.driverNumber
              );

            if (!driver) {
              continue;
            }

            if (
              driver.lapNumber >
              previousLap
            ) {
              previousLap =
                driver.lapNumber;

              lastLapChangeIndex =
                index;
            }
          }

          map.set(
            finalDriver.driverNumber,
            {
              startIndex:
                Math.min(
                  replay.frames.length -
                    1,

                  lastLapChangeIndex +
                    3
                ),

              status,
            }
          );
        }

        return map;
      },
      [
        replay,
      ]
    );

  /* =======================================================
     REPLAY POSITION CHANGES
     ======================================================= */

  const replayMovements =
    useMemo(
      () => {
        const map =
          new Map<
            number,
            PositionMovement
          >();

        if (
          !currentFrame ||
          !previousFrame
        ) {
          return map;
        }

        const previousPositions =
          new Map<
            number,
            number
          >();

        for (
          const driver of
            previousFrame.drivers
        ) {
          if (
            driver.position !==
            null
          ) {
            previousPositions.set(
              driver.driverNumber,
              driver.position
            );
          }
        }

        for (
          const driver of
            currentFrame.drivers
        ) {
          if (
            driver.position ===
            null
          ) {
            continue;
          }

          const previous =
            previousPositions.get(
              driver.driverNumber
            );

          if (
            previous ===
            undefined
          ) {
            continue;
          }

          if (
            driver.position <
            previous
          ) {
            map.set(
              driver.driverNumber,
              "up"
            );
          } else if (
            driver.position >
            previous
          ) {
            map.set(
              driver.driverNumber,
              "down"
            );
          }
        }

        return map;
      },
      [
        currentFrame,
        previousFrame,
      ]
    );

  /* =======================================================
     ROWS
     ======================================================= */

  const rows =
    useMemo<
      DisplayRow[]
    >(
      () => {
        if (
          live
        ) {
          return (
            liveData
              ?.drivers ??
            []
          )
            .map(
              (
                driver
              ): DisplayRow => {
                const number =
                  driver.driver_number ??
                  driver.driverNumber ??
                  0;

                const name =
                  driver.full_name ||
                  driver.broadcast_name ||
                  `${driver.first_name ?? ""} ${
                    driver.last_name ?? ""
                  }`.trim() ||
                  `#${number}`;

                return {
                  driverNumber:
                    number,

                  position:
                    driver.livePosition ??
                    driver.position ??
                    null,

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

                  colour:
                    normaliseColour(
                      driver.team_colour
                    ),

                  headshot:
                    driver.headshot_url ||
                    null,

                  lapNumber:
                    driver.lapNumber ??
                    driver.lap_number ??
                    null,

                  currentLapTime:
                    null,

                  lastLap:
                    driver.lastLap ??
                    driver.last_lap ??
                    null,

                  bestLap:
                    driver.bestLap ??
                    driver.best_lap ??
                    null,

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

                  gap:
                    driver.gap ??
                    driver.gap_to_leader ??
                    null,

                  interval:
                    driver.interval ??
                    null,

                  tyre:
                    driver.tyre ??
                    driver.compound ??
                    null,

                  tyreAge:
                    driver.tyreAge ??
                    driver.tyre_age ??
                    null,

                  stint:
                    driver.stintNumber ??
                    driver.stint_number ??
                    null,

                  status:
                    null,

                  inactive:
                    false,
                };
              }
            )
            .filter(
              (
                driver
              ) =>
                driver.driverNumber >
                0
            )
            .sort(
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

        if (
          !currentFrame
        ) {
          return [];
        }

        return currentFrame.drivers
          .map(
            (
              frameDriver
            ): DisplayRow => {
              const driver =
                replayDriverMap.get(
                  frameDriver.driverNumber
                );

              const retirement =
                retirementMap.get(
                  frameDriver.driverNumber
                );

              const retired =
                Boolean(
                  retirement &&
                  safeFrameIndex >=
                    retirement.startIndex
                );

              let status:
                string | null =
                null;

              if (
                retired &&
                retirement
              ) {
                status =
                  retirement.status;
              } else if (
                frameDriver.dsq
              ) {
                status =
                  "DSQ";
              } else if (
                frameDriver.dns
              ) {
                status =
                  "DNS";
              } else if (
                frameDriver.dnf
              ) {
                status =
                  "DNF";
              }

              return {
                driverNumber:
                  frameDriver.driverNumber,

                position:
                  frameDriver.position,

                name:
                  driver?.name ||
                  `Driver #${frameDriver.driverNumber}`,

                acronym:
                  driver?.acronym ||
                  String(
                    frameDriver.driverNumber
                  ),

                team:
                  driver?.team ||
                  "Formula 1",

                colour:
                  driver?.teamColour ||
                  "#79828d",

                headshot:
                  driver?.headshotUrl ||
                  null,

                lapNumber:
                  frameDriver.lapNumber,

                currentLapTime:
                  frameDriver.currentLapTime ??
                  null,

                lastLap:
                  frameDriver.lastLap,

                bestLap:
                  frameDriver.bestLap,

                sector1:
                  frameDriver.sector1 ??
                  null,

                sector2:
                  frameDriver.sector2 ??
                  null,

                sector3:
                  frameDriver.sector3 ??
                  null,

                segmentsSector1:
                  frameDriver.segmentsSector1 ??
                  [],

                segmentsSector2:
                  frameDriver.segmentsSector2 ??
                  [],

                segmentsSector3:
                  frameDriver.segmentsSector3 ??
                  [],

                gap:
                  frameDriver.gap,

                interval:
                  frameDriver.interval,

                tyre:
                  frameDriver.tyre,

                tyreAge:
                  frameDriver.tyreAge,

                stint:
                  frameDriver.stintNumber,

                status,

                inactive:
                  retired,
              };
            }
          )
          .sort(
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
      },
      [
        live,
        liveData,
        currentFrame,
        replayDriverMap,
        retirementMap,
        safeFrameIndex,
      ]
    );

  /* =======================================================
     LIVE MOVEMENT
     ======================================================= */

  useEffect(
    () => {
      if (
        !live
      ) {
        previousLivePositions.current =
          new Map();

        setLiveMovements(
          new Map()
        );

        return;
      }

      const nextPositions =
        new Map<
          number,
          number
        >();

      const changes =
        new Map<
          number,
          PositionMovement
        >();

      for (
        const row of
          rows
      ) {
        if (
          row.position ===
          null
        ) {
          continue;
        }

        nextPositions.set(
          row.driverNumber,
          row.position
        );

        const previous =
          previousLivePositions.current.get(
            row.driverNumber
          );

        if (
          previous ===
          undefined
        ) {
          continue;
        }

        if (
          row.position <
          previous
        ) {
          changes.set(
            row.driverNumber,
            "up"
          );
        } else if (
          row.position >
          previous
        ) {
          changes.set(
            row.driverNumber,
            "down"
          );
        }
      }

      previousLivePositions.current =
        nextPositions;

      if (
        changes.size >
        0
      ) {
        setLiveMovements(
          changes
        );

        if (
          liveMovementTimer.current !==
          null
        ) {
          window.clearTimeout(
            liveMovementTimer.current
          );
        }

        liveMovementTimer.current =
          window.setTimeout(
            () => {
              setLiveMovements(
                new Map()
              );
            },
            1100
          );
      }
    },
    [
      live,
      rows,
    ]
  );

  const currentMovements =
    live
      ? liveMovements
      : replayMovements;

  /* =======================================================
     SPOTLIGHT
     ======================================================= */

  const spotlightDrivers =
    useMemo<
      SpotlightDriver[]
    >(
      () =>
        rows
          .filter(
            (
              row
            ) =>
              row.position !==
                null &&
              row.position <=
                3
          )
          .map(
            (
              row
            ) => ({
              driverNumber:
                row.driverNumber,

              position:
                row.position,

              name:
                row.name,

              acronym:
                row.acronym,

              team:
                row.team,

              colour:
                row.colour,

              headshot:
                row.headshot,

              currentLapTime:
                row.currentLapTime,

              lastLap:
                row.lastLap,

              bestLap:
                row.bestLap,

              gap:
                row.gap,

              lapNumber:
                row.lapNumber,

              tyre:
                row.tyre,

              tyreAge:
                row.tyreAge,

              sector1:
                row.sector1,

              sector2:
                row.sector2,

              sector3:
                row.sector3,

              segmentsSector1:
                row.segmentsSector1,

              segmentsSector2:
                row.segmentsSector2,

              segmentsSector3:
                row.segmentsSector3,

              status:
                row.status,

              inactive:
                row.inactive,
            })),
      [
        rows,
      ]
    );

  const regularRows =
    useMemo(
      () =>
        rows.filter(
          (
            row
          ) =>
            row.position ===
              null ||
            row.position >
              3
        ),
      [
        rows,
      ]
    );

  /* =======================================================
     CHAMPIONSHIP DRIVER BRIDGE
     ======================================================= */

  const championshipDrivers =
    useMemo<
      ChampionshipLiveDriver[]
    >(
      () =>
        rows.map(
          (
            row
          ) => ({
            driverNumber:
              row.driverNumber,

            position:
              row.position,

            acronym:
              row.acronym,

            name:
              row.name,

            team:
              row.team,

            colour:
              row.colour,

            headshot:
              row.headshot,

            status:
              row.status,
          })
        ),
      [
        rows,
      ]
    );

  /* =======================================================
     EVENT
     ======================================================= */

  const currentEvent =
    useMemo(
      () => {
        if (
          !replay ||
          !currentFrame
        ) {
          return null;
        }

        for (
          let index =
            replay.events.length -
            1;
          index >= 0;
          index -= 1
        ) {
          const event =
            replay.events[
              index
            ];

          if (
            event.timestamp <=
            currentFrame.timestamp
          ) {
            return event;
          }
        }

        return null;
      },
      [
        replay,
        currentFrame,
      ]
    );

  /* =======================================================
     METRICS
     ======================================================= */

  const leader =
    rows.find(
      (
        row
      ) =>
        row.position ===
        1
    ) ??
    null;

  const currentLap =
    sessionKind ===
      "race"
      ? live
        ? Math.max(
            0,
            ...rows.map(
              (
                row
              ) =>
                row.lapNumber ??
                0
            )
          )
        : currentFrame
            ?.lapNumber ??
          0
      : 0;

  const currentBestLap =
    useMemo(
      () => {
        if (
          sessionKind ===
          "race"
        ) {
          return null;
        }

        const valid =
          rows
            .map(
              (
                row
              ) =>
                row.bestLap
            )
            .filter(
              (
                value
              ): value is number =>
                typeof value ===
                  "number" &&
                Number.isFinite(
                  value
                ) &&
                value >
                  0
            );

        if (
          valid.length ===
          0
        ) {
          return null;
        }

        return Math.min(
          ...valid
        );
      },
      [
        rows,
        sessionKind,
      ]
    );

  const remainingMs =
    !live
      ? currentFrame
          ?.remainingMs ??
        0
      : liveData
          ?.currentSession
          ?.endTimestamp
      ? Math.max(
          0,

          liveData.currentSession
            .endTimestamp -
            Date.now()
        )
      : 0;

  const replayProgress =
    replay &&
    replay.frames.length >
      1
      ? (
          safeFrameIndex /
          (
            replay.frames.length -
            1
          )
        ) *
        100
      : 0;

  const sessionTitle =
    live
      ? liveData
          ?.currentSession
          ?.label ||
        liveData
          ?.openF1Session
          ?.session_name ||
        liveData
          ?.session
          ?.session_name ||
        "Formula 1"
      : replay
      ? replay.session
          .sessionName
      : "Formula 1";

  const sessionLocation =
    live
      ? liveData
          ?.openF1Session
          ?.location ||
        liveData
          ?.session
          ?.location ||
        ""
      : replay
      ? replay.session
          .location
      : "";

  const circuitName =
    !live
      ? replay?.session
          .circuitName ||
        ""
      : "";

  const hubTimingValue =
    sessionKind ===
    "race"
      ? currentLap >
        0
        ? `LAP ${currentLap}`
        : "—"
      : remainingMs >
        0
      ? formatClock(
          remainingMs
        )
      : "00:00";

  const hubControlValue =
    currentEvent?.flag ||
    currentEvent?.category ||
    (live
      ? "LIVE FEED"
      : "TRACK CLEAR");

  /* =======================================================
     LOADING
     ======================================================= */

  if (
    loading &&
    !replay
  ) {
    return (
      <div className="race-center">
        <style>
          {styles}
        </style>

        <div className="loading">
          <div className="spinner" />

          <strong>
            Race Control bağlanıyor...
          </strong>

          <span>
            Live session ve replay arşivi kontrol ediliyor.
          </span>
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
     ======================================================= */

  return (
    <div className="race-center">
      <style>
        {styles}
      </style>

      <div className="background-grid" />

      <div className="race-wrap">
        {!live &&
          replay?.archivePending &&
          replay.latestCompletedSession && (
            <section className="archive-banner">
              <div className="archive-light" />

              <div>
                <span>
                  LATEST SESSION ARCHIVING
                </span>

                <strong>
                  {
                    replay.latestCompletedSession.location
                  }{" "}
                  ·{" "}
                  {
                    replay.latestCompletedSession.sessionName
                  }
                </strong>

                <p>
                  En son tamamlanan seansın telemetrisi henüz
                  replay arşivine açılmadı. Şu anda erişilebilir
                  en yeni seans oynatılıyor.
                </p>
              </div>
            </section>
          )}

        {/* =================================================
            COMPACT HEADER
            ================================================= */}

        <section className="broadcast-header">
          <div className="broadcast-left">
            <span className="broadcast-eyebrow">
              F1 MEDİPOL · RACE CONTROL
            </span>

            <div className="broadcast-title-line">
              <h1>
                {sessionTitle.toUpperCase()}
              </h1>

              <span className="broadcast-divider">
                /
              </span>

              <p>
                {sessionLocation ||
                  "Formula 1"}

                {circuitName
                  ? ` · ${circuitName}`
                  : ""}
              </p>
            </div>
          </div>

          <div
            className={[
              "broadcast-mode",

              live
                ? "broadcast-mode-live"
                : "broadcast-mode-replay",
            ].join(
              " "
            )}
          >
            <i />

            <div>
              <small>
                {live
                  ? "SESSION"
                  : "OFFICIAL"}
              </small>

              <strong>
                {live
                  ? "LIVE"
                  : "REPLAY"}
              </strong>
            </div>
          </div>
        </section>

        {/* =================================================
            METRICS
            ================================================= */}

        <section className="metrics">
          <Metric
            label="MODE"
            value={
              live
                ? "LIVE"
                : "REPLAY"
            }
            accent={
              live
                ? "green"
                : "amber"
            }
          />

          {sessionKind ===
          "race" ? (
            <Metric
              label="CURRENT LAP"
              value={
                currentLap >
                0
                  ? `LAP ${currentLap}${
                      replay?.totalLaps
                        ? ` / ${replay.totalLaps}`
                        : ""
                    }`
                  : "—"
              }
            />
          ) : (
            <Metric
              label="TIME REMAINING"
              value={
                remainingMs >
                0
                  ? formatClock(
                      remainingMs
                    )
                  : "00:00"
              }
            />
          )}

          <LeaderMetric
            leader={
              leader
            }
          />

          {sessionKind ===
          "race" ? (
            <Metric
              label={
                projectionActive
                  ? "CHAMPIONSHIP"
                  : "TIMING"
              }
              value={
                projectionActive
                  ? "PROJECTING"
                  : live
                  ? liveData
                      ?.timingAvailable
                    ? "ACTIVE"
                    : "WAITING"
                  : "HISTORICAL"
              }
              accent={
                projectionActive
                  ? "green"
                  : undefined
              }
            />
          ) : (
            <Metric
              label="SESSION BEST"
              value={
                formatLap(
                  currentBestLap
                )
              }
            />
          )}
        </section>

        {/* =================================================
            REPLAY PLAYER
            ================================================= */}

        {!live &&
          replay &&
          currentFrame && (
            <section className="player">
              <div className="player-info">
                <div>
                  <span>
                    ↻ OFFICIAL SESSION REPLAY
                  </span>

                  <strong>
                    {
                      replay.session.location
                    }{" "}
                    ·{" "}
                    {
                      replay.session.sessionName
                    }
                  </strong>
                </div>

                <div className="player-clock">
                  {formatClock(
                    currentFrame.elapsedMs
                  )}
                </div>
              </div>

              <input
                type="range"
                className="timeline"
                min="0"
                max={Math.max(
                  0,

                  replay.frames.length -
                    1
                )}
                value={
                  safeFrameIndex
                }
                onChange={(
                  event
                ) => {
                  setFrameIndex(
                    Number(
                      event.target.value
                    )
                  );
                }}
                style={{
                  background: `linear-gradient(to right,#ed493f ${replayProgress}%,rgba(255,255,255,.10) ${replayProgress}%)`,
                }}
              />

              <div className="player-actions">
                <button
                  className="play"
                  type="button"
                  onClick={() => {
                    const last =
                      replay.frames.length -
                      1;

                    if (
                      safeFrameIndex >=
                      last
                    ) {
                      setFrameIndex(
                        findFirstUsefulFrame(
                          replay
                        )
                      );

                      setPlaying(
                        true
                      );

                      return;
                    }

                    setPlaying(
                      (
                        current
                      ) =>
                        !current
                    );
                  }}
                >
                  {safeFrameIndex >=
                  replay.frames.length -
                    1
                    ? "↻"
                    : playing
                    ? "❚❚"
                    : "▶"}
                </button>

                <button
                  className="restart"
                  type="button"
                  onClick={() => {
                    setFrameIndex(
                      findFirstUsefulFrame(
                        replay
                      )
                    );

                    setPlaying(
                      true
                    );
                  }}
                >
                  BAŞA DÖN
                </button>

                <div className="speed">
                  {(
                    [
                      0.5,
                      1,
                      2,
                      4,
                    ] as PlaybackSpeed[]
                  ).map(
                    (
                      value
                    ) => (
                      <button
                        type="button"
                        key={
                          value
                        }
                        className={
                          speed ===
                          value
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setSpeed(
                            value
                          )
                        }
                      >
                        {value}x
                      </button>
                    )
                  )}
                </div>
              </div>
            </section>
          )}

        {/* =================================================
            MAIN
            ================================================= */}

        <section className="main-grid">

          {/* =================================================
              LEFT / TIMING
              ================================================= */}

          <div className="timing-card">
            <div className="card-header">
              <div>
                <span>
                  {live
                    ? "LIVE TIMING"
                    : "REPLAY TIMING"}
                </span>

                <h2>
                  Sürücü Sıralaması
                </h2>
              </div>

              <div
                className={
                  live
                    ? "small-mode live"
                    : "small-mode replay"
                }
              >
                {live
                  ? "● LIVE"
                  : "↻ REPLAY"}
              </div>
            </div>

            {/* P1 - P3 AYNI */}

            <TopThreeSpotlight
              drivers={
                spotlightDrivers
              }
              movements={
                currentMovements
              }
            />

            <div className="field-label">
              <span>
                FIELD TIMING
              </span>

              <b>
                P4 — P20
              </b>
            </div>

            <div className="table-scroll">
              <div
                className={
                  sessionKind ===
                  "race"
                    ? "timing-table race-table"
                    : "timing-table session-table"
                }
              >
                {sessionKind ===
                "race" ? (
                  <div className="row table-head">
                    <span>POS</span>
                    <span>DRIVER</span>
                    <span>GAP</span>
                    <span>INTERVAL</span>
                    <span>LAST LAP</span>
                    <span>LAP</span>
                    <span>TYRE</span>
                    <span>STINT</span>
                  </div>
                ) : (
                  <div className="row table-head">
                    <span>POS</span>
                    <span>DRIVER</span>
                    <span>GAP</span>
                    <span>CURRENT</span>
                    <span>LAST</span>
                    <span>MINI-SECTORS</span>
                    <span>LAPS</span>
                    <span>TYRE</span>
                  </div>
                )}

                {regularRows.length >
                0 ? (
                  regularRows.map(
                    (
                      row
                    ) => {
                      const movement =
                        currentMovements.get(
                          row.driverNumber
                        ) ??
                        null;

                      return sessionKind ===
                        "race" ? (
                        <RaceRow
                          key={
                            row.driverNumber
                          }
                          row={
                            row
                          }
                          movement={
                            movement
                          }
                        />
                      ) : (
                        <SessionRow
                          key={
                            row.driverNumber
                          }
                          row={
                            row
                          }
                          movement={
                            movement
                          }
                        />
                      );
                    }
                  )
                ) : (
                  <div className="no-data">
                    <strong>
                      Timing verisi bekleniyor
                    </strong>

                    <p>
                      Henüz P4 ve sonrası için anlamlı timing
                      verisi oluşmadı.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* =================================================
              RIGHT / RACE HUB
              ================================================= */}

          <aside className="race-hub">
            <div className="hub-top">
              <div>
                <span className="hub-eyebrow">
                  F1 MEDİPOL
                </span>

                <div className="hub-title-row">
                  <h2>
                    RACE HUB
                  </h2>

                  <div
                    className={[
                      "hub-status",

                      live
                        ? "hub-status-live"
                        : "hub-status-replay",
                    ].join(
                      " "
                    )}
                  >
                    <i />

                    {live
                      ? "LIVE"
                      : "REPLAY"}
                  </div>
                </div>
              </div>

              <span className="hub-session-name">
                {sessionTitle}
              </span>
            </div>

            {/* QUICK DATA */}

            <div className="hub-quick">
              <HubStat
                label={
                  sessionKind ===
                  "race"
                    ? "LAP"
                    : "TIME"
                }
                value={
                  hubTimingValue
                }
              />

              <HubStat
                label="LEADER"
                value={
                  leader?.acronym ??
                  "—"
                }
                accent={
                  leader?.colour
                }
              />

              <HubStat
                label="CONTROL"
                value={
                  hubControlValue
                }
              />
            </div>

            {/* TABS */}

            <div className="hub-tabs">
              <button
                type="button"
                className={
                  hubTab ===
                  "championship"
                    ? "hub-tab active"
                    : "hub-tab"
                }
                onClick={() =>
                  setHubTab(
                    "championship"
                  )
                }
              >
                <span>
                  CHAMPIONSHIP
                </span>

                {projectionActive && (
                  <i className="projection-dot" />
                )}
              </button>

              <button
                type="button"
                className={
                  hubTab ===
                  "track"
                    ? "hub-tab active"
                    : "hub-tab"
                }
                onClick={() =>
                  setHubTab(
                    "track"
                  )
                }
              >
                TRACK
              </button>

              <button
                type="button"
                className={
                  hubTab ===
                  "control"
                    ? "hub-tab active"
                    : "hub-tab"
                }
                onClick={() =>
                  setHubTab(
                    "control"
                  )
                }
              >
                CONTROL
              </button>
            </div>

            {/* =================================================
                CHAMPIONSHIP TAB
                ================================================= */}

            {hubTab ===
              "championship" && (
              <div className="hub-panel championship-panel">
                {championshipStandings.length >
                0 ? (
                  <ProjectedChampionship
                    standings={
                      championshipStandings
                    }
                    drivers={
                      projectionActive
                        ? championshipDrivers
                        : []
                    }
                    active={
                      projectionActive
                    }
                    isSprint={
                      isSprintSession
                    }
                    sessionName={
                      sessionTitle
                    }
                  />
                ) : (
                  <div className="hub-empty">
                    <span>
                      CHAMPIONSHIP
                    </span>

                    <strong>
                      {championshipLoading
                        ? "Standings yükleniyor..."
                        : "Standings kullanılamıyor"}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* =================================================
                TRACK TAB
                ================================================= */}

            {hubTab ===
              "track" && (
              <div className="hub-panel track-panel">
                <div className="panel-section-head">
                  <div>
                    <span>
                      CIRCUIT VIEW
                    </span>

                    <strong>
                      {circuitName ||
                        sessionLocation ||
                        "Formula 1"}
                    </strong>
                  </div>

                  <b>
                    {sessionKind ===
                    "race"
                      ? hubTimingValue
                      : sessionTitle}
                  </b>
                </div>

                {!live &&
                replay &&
                currentFrame ? (
                  <div className="hub-map">
                    <F1TrackMap
                      track={
                        replay.track
                      }
                      drivers={replay.drivers.map(
                        (
                          driver
                        ) => ({
                          driverNumber:
                            driver.driverNumber,

                          acronym:
                            driver.acronym,

                          teamColour:
                            driver.teamColour,
                        })
                      )}
                      frameDrivers={currentFrame.drivers.map(
                        (
                          driver
                        ) => ({
                          driverNumber:
                            driver.driverNumber,

                          position:
                            driver.position,

                          trackProgress:
                            driver.trackProgress,
                        })
                      )}
                      sessionName={
                        replay.session.circuitName
                      }
                      animationMs={Math.max(
                        100,

                        Math.round(
                          700 /
                            speed
                        )
                      )}
                    />
                  </div>
                ) : (
                  <div className="hub-map-placeholder">
                    <div className="map-orbit">
                      <i />
                      <i />
                      <i />

                      <span>
                        F1
                      </span>
                    </div>

                    <strong>
                      Live Track Map
                    </strong>

                    <p>
                      Canlı pist konum verisi kullanılabilir olduğunda
                      sürücüler burada anlık olarak gösterilecek.
                    </p>

                    <div className="map-status">
                      <i />

                      LIVE DATA WATCHING
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =================================================
                CONTROL TAB
                ================================================= */}

            {hubTab ===
              "control" && (
              <div className="hub-panel control-panel">

                {/* EVENT */}

                <div className="control-block control-feature">
                  <div className="control-heading">
                    <span>
                      RACE CONTROL
                    </span>

                    <b>
                      {currentEvent?.lapNumber
                        ? `LAP ${currentEvent.lapNumber}`
                        : live
                        ? "LIVE"
                        : "REPLAY"}
                    </b>
                  </div>

                  {currentEvent ? (
                    <>
                      <div className="control-flag">
                        <i />

                        {currentEvent.flag ||
                          currentEvent.category ||
                          "RACE CONTROL"}
                      </div>

                      <p>
                        {
                          currentEvent.message
                        }
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="control-flag control-clear">
                        <i />

                        {live
                          ? "LIVE CONTROL FEED"
                          : "TRACK CLEAR"}
                      </div>

                      <p>
                        {live
                          ? "Canlı Race Control verisi bekleniyor."
                          : "Bu noktaya kadar yeni bir Race Control olayı bulunmuyor."}
                      </p>
                    </>
                  )}
                </div>

                {/* SESSION */}

                <div className="control-block">
                  <div className="control-heading">
                    <span>
                      SESSION INFO
                    </span>

                    <b>
                      {live
                        ? "CURRENT"
                        : "ARCHIVE"}
                    </b>
                  </div>

                  <ControlRow
                    label="Session"
                    value={
                      sessionTitle
                    }
                  />

                  <ControlRow
                    label="Status"
                    value={
                      live
                        ? "LIVE"
                        : "REPLAY"
                    }
                    accent={
                      live
                        ? "green"
                        : "amber"
                    }
                  />

                  {championshipSeason && (
                    <ControlRow
                      label="Championship"
                      value={`${championshipSeason} FIA F1`}
                    />
                  )}

                  {!live &&
                    replay && (
                      <>
                        <ControlRow
                          label="Location"
                          value={
                            replay.session.location
                          }
                        />

                        <ControlRow
                          label="Type"
                          value={
                            replay.session.kind ===
                            "practice"
                              ? "PRACTICE"
                              : replay.session.kind ===
                                "qualifying"
                              ? "QUALIFYING"
                              : "RACE"
                          }
                        />

                        <ControlRow
                          label="Date"
                          value={formatDateTR(
                            replay.session.dateStart
                          )}
                        />
                      </>
                    )}
                </div>

                {/* SYSTEM */}

                <div className="control-block system-block">
                  <div className="system-status">
                    <div className="system-icon">
                      <i />
                    </div>

                    <div>
                      <span>
                        AUTO LIVE WATCH
                      </span>

                      <strong>
                        SYSTEM ACTIVE
                      </strong>
                    </div>
                  </div>

                  <p>
                    Gerçek Formula 1 seansı otomatik kontrol edilir.
                    Race veya Sprint canlı olduğunda timing ve
                    şampiyona projeksiyonu otomatik olarak devreye girer.
                  </p>

                  <div className="system-lines">
                    <span>
                      <i />

                      SESSION WATCH
                    </span>

                    <span>
                      <i />

                      TIMING FEED
                    </span>

                    <span>
                      <i />

                      WDC PROJECTION
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PERMANENT BOTTOM TICKER */}

            <div className="hub-ticker">
              <span>
                <i />

                RACE CONTROL
              </span>

              <p>
                {currentEvent
                  ? currentEvent.message
                  : live
                  ? "Live control feed aktif."
                  : "Track clear · Replay monitoring active"}
              </p>
            </div>
          </aside>
        </section>

        {error && (
          <div className="error">
            {
              error
            }
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   METRIC
   ========================================================= */

function Metric({
  label,
  value,
  accent,
}: {
  label:
    string;

  value:
    string;

  accent?:
    | "green"
    | "amber";
}) {
  return (
    <div className="metric">
      <small>
        {label}
      </small>

      <strong
        className={
          accent
            ? `metric-${accent}`
            : ""
        }
      >
        {value}
      </strong>
    </div>
  );
}

/* =========================================================
   HUB STAT
   ========================================================= */

function HubStat({
  label,
  value,
  accent,
}: {
  label:
    string;

  value:
    string;

  accent?:
    string;
}) {
  return (
    <div className="hub-stat">
      <small>
        {label}
      </small>

      <strong
        style={
          accent
            ? {
                color:
                  accent,
              }
            : undefined
        }
      >
        {value}
      </strong>
    </div>
  );
}

/* =========================================================
   LEADER
   ========================================================= */

function LeaderMetric({
  leader,
}: {
  leader:
    DisplayRow | null;
}) {
  return (
    <div className="metric leader-metric">
      <small>
        LEADER
      </small>

      {leader ? (
        <div className="leader-driver">
          <div
            className="leader-photo"
            style={{
              borderColor:
                leader.colour,
            }}
          >
            {leader.headshot ? (
              <img
                src={
                  leader.headshot
                }
                alt={
                  leader.name
                }
              />
            ) : (
              <span>
                {
                  leader.acronym
                }
              </span>
            )}
          </div>

          <div className="leader-copy">
            <strong>
              {
                leader.acronym
              }
            </strong>

            <span>
              {
                leader.name
              }
            </span>

            <small>
              {
                leader.team
              }
            </small>
          </div>
        </div>
      ) : (
        <strong>
          —
        </strong>
      )}
    </div>
  );
}

/* =========================================================
   CONTROL ROW
   ========================================================= */

function ControlRow({
  label,
  value,
  accent,
}: {
  label:
    string;

  value:
    string;

  accent?:
    | "green"
    | "amber";
}) {
  return (
    <div className="control-row">
      <span>
        {label}
      </span>

      <b
        className={
          accent
            ? `text-${accent}`
            : ""
        }
      >
        {value}
      </b>
    </div>
  );
}

/* =========================================================
   DRIVER CELL
   ========================================================= */

function DriverCell({
  row,
}: {
  row:
    DisplayRow;
}) {
  return (
    <div className="driver-cell">
      <div className="avatar">
        {row.headshot ? (
          <img
            src={
              row.headshot
            }
            alt={
              row.name
            }
          />
        ) : (
          row.acronym
        )}
      </div>

      <div className="driver-name">
        <b>
          {
            row.name
          }
        </b>

        <small>
          {
            row.team
          }
        </small>
      </div>
    </div>
  );
}

/* =========================================================
   POSITION
   ========================================================= */

function PositionCell({
  row,
  movement,
}: {
  row:
    DisplayRow;

  movement:
    PositionMovement;
}) {
  return (
    <div className="position-cell">
      <strong>
        {row.position
          ? `P${row.position}`
          : "—"}
      </strong>

      {movement ===
        "up" && (
        <span className="position-up-arrow">
          ▲
        </span>
      )}

      {movement ===
        "down" && (
        <span className="position-down-arrow">
          ▼
        </span>
      )}
    </div>
  );
}

/* =========================================================
   TYRE
   ========================================================= */

function TyreCell({
  row,
}: {
  row:
    DisplayRow;
}) {
  return (
    <div className="tyre-cell">
      <i
        className={`tyre ${tyreClass(
          row.tyre
        )}`}
      >
        {tyreLetter(
          row.tyre
        )}
      </i>

      {row.tyreAge !==
        null && (
        <small>
          {
            row.tyreAge
          }
          L
        </small>
      )}
    </div>
  );
}

/* =========================================================
   MINI SECTORS
   ========================================================= */

function MiniSectors({
  row,
}: {
  row:
    DisplayRow;
}) {
  return (
    <div className="mini-sectors">
      <SectorGroup
        title="S1"
        time={
          row.sector1
        }
        values={
          row.segmentsSector1
        }
      />

      <SectorGroup
        title="S2"
        time={
          row.sector2
        }
        values={
          row.segmentsSector2
        }
      />

      <SectorGroup
        title="S3"
        time={
          row.sector3
        }
        values={
          row.segmentsSector3
        }
      />
    </div>
  );
}

function SectorGroup({
  title,
  time,
  values,
}: {
  title:
    string;

  time:
    number | null;

  values:
    number[];
}) {
  return (
    <div className="sector-group">
      <div className="sector-bars">
        {(values.length >
        0
          ? values
          : [
              0,
              0,
              0,
              0,
              0,
              0,
            ]
        ).map(
          (
            value,
            index
          ) => (
            <i
              key={
                index
              }
              className={`mini-sector ${miniSectorClass(
                value
              )}`}
            />
          )
        )}
      </div>

      <div className="sector-bottom">
        <span>
          {
            title
          }
        </span>

        <b>
          {formatSector(
            time
          )}
        </b>
      </div>
    </div>
  );
}

/* =========================================================
   RACE ROW
   ========================================================= */

function RaceRow({
  row,
  movement,
}: {
  row:
    DisplayRow;

  movement:
    PositionMovement;
}) {
  return (
    <div
      className={[
        "row",
        "driver-row",

        movement ===
        "up"
          ? "position-up"
          : "",

        movement ===
        "down"
          ? "position-down"
          : "",

        row.inactive
          ? "inactive-driver"
          : "",
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        )}
      style={{
        borderLeftColor:
          row.inactive
            ? "#666d75"
            : row.colour,
      }}
    >
      <PositionCell
        row={
          row
        }
        movement={
          movement
        }
      />

      <DriverCell
        row={
          row
        }
      />

      <span
        className={
          row.status
            ? "status-text"
            : ""
        }
      >
        {row.status ||
          formatGap(
            row.gap
          )}
      </span>

      <span>
        {formatGap(
          row.interval
        )}
      </span>

      <span>
        {formatLap(
          row.lastLap
        )}
      </span>

      <span>
        {row.lapNumber
          ? `L${row.lapNumber}`
          : "—"}
      </span>

      <TyreCell
        row={
          row
        }
      />

      <span>
        {row.stint
          ? `S${row.stint}`
          : "—"}
      </span>
    </div>
  );
}

/* =========================================================
   SESSION ROW
   ========================================================= */

function SessionRow({
  row,
  movement,
}: {
  row:
    DisplayRow;

  movement:
    PositionMovement;
}) {
  return (
    <div
      className={[
        "row",
        "driver-row",

        movement ===
        "up"
          ? "position-up"
          : "",

        movement ===
        "down"
          ? "position-down"
          : "",

        row.inactive
          ? "inactive-driver"
          : "",
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        )}
      style={{
        borderLeftColor:
          row.inactive
            ? "#666d75"
            : row.colour,
      }}
    >
      <PositionCell
        row={
          row
        }
        movement={
          movement
        }
      />

      <DriverCell
        row={
          row
        }
      />

      <span>
        {row.status ||
          formatGap(
            row.gap
          )}
      </span>

      <span className="current-lap">
        {formatLap(
          row.currentLapTime
        )}
      </span>

      <span>
        {formatLap(
          row.lastLap
        )}
      </span>

      <MiniSectors
        row={
          row
        }
      />

      <span>
        {row.lapNumber ||
          "—"}
      </span>

      <TyreCell
        row={
          row
        }
      />
    </div>
  );
}

/* =========================================================
   CSS
   ========================================================= */

const styles = `
  .race-center {
    --panel:#10151c;
    --panel2:#151b24;
    --panel3:#0c1117;
    --border:rgba(255,255,255,.085);
    --text:#f5f7f9;
    --muted:#818b97;

    min-height:100vh;

    position:relative;

    overflow:hidden;

    color:var(--text);

    background:
      radial-gradient(
        circle at 93% 3%,
        rgba(225,6,0,.13),
        transparent 27%
      ),
      linear-gradient(
        145deg,
        #090d12,
        #06080c
      );
  }

  :root[data-site-theme="red"] .race-center {
    --panel:#281114;
    --panel2:#190b0d;
    --panel3:#16090b;
    --border:rgba(255,255,255,.13);

    background:
      radial-gradient(
        circle at 90% 3%,
        rgba(255,90,75,.25),
        transparent 26%
      ),
      linear-gradient(
        140deg,
        #a5080e,
        #40070b 48%,
        #16080a
      );
  }

  :root[data-site-theme="light"] .race-center {
    --panel:#fff;
    --panel2:#f1f4f7;
    --panel3:#e9edf2;
    --border:rgba(20,25,32,.13);
    --text:#161b21;
    --muted:#697480;

    background:
      linear-gradient(
        145deg,
        #fff,
        #e8ecf1
      );
  }

  .race-center * {
    box-sizing:border-box;
  }

  .race-wrap {
    position:relative;

    z-index:2;

    width:min(
      1600px,
      calc(100% - 32px)
    );

    margin:auto;

    padding:
      14px 0 90px;
  }

  .background-grid {
    position:absolute;

    inset:0;

    pointer-events:none;

    opacity:.3;

    background-image:
      linear-gradient(
        rgba(255,255,255,.012) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        rgba(255,255,255,.012) 1px,
        transparent 1px
      );

    background-size:
      34px 34px;
  }

  /* =========================================================
     ARCHIVE
     ========================================================= */

  .archive-banner {
    padding:
      12px 15px;

    display:flex;

    gap:12px;

    margin-bottom:7px;

    border:
      1px solid
      rgba(255,177,79,.2);

    border-radius:11px;

    background:
      rgba(255,177,79,.055);
  }

  .archive-light {
    width:7px;
    height:7px;

    margin-top:5px;

    border-radius:50%;

    background:#ffb151;

    box-shadow:
      0 0 12px
      #ffb151;
  }

  .archive-banner span {
    color:#ffb151;

    font-size:7px;

    font-weight:1000;
  }

  .archive-banner strong {
    display:block;

    margin-top:4px;

    font-size:11px;
  }

  .archive-banner p {
    margin:
      4px 0 0;

    color:var(--muted);

    font-size:8px;
  }

  /* =========================================================
     COMPACT HEADER
     ========================================================= */

  .broadcast-header {
    position:relative;

    min-height:86px;

    padding:
      14px 18px;

    display:flex;

    align-items:center;

    justify-content:
      space-between;

    gap:20px;

    overflow:hidden;

    border:
      1px solid
      var(--border);

    border-radius:13px;

    background:
      radial-gradient(
        circle at 92% 0%,
        rgba(225,6,0,.10),
        transparent 31%
      ),
      linear-gradient(
        145deg,
        var(--panel),
        var(--panel2)
      );
  }

  .broadcast-header::before {
    content:"";

    position:absolute;

    left:0;
    top:0;
    bottom:0;

    width:3px;

    background:
      linear-gradient(
        180deg,
        #ed4c44,
        rgba(237,76,68,.12)
      );
  }

  .broadcast-header::after {
    content:"";

    position:absolute;

    right:-70px;
    top:-100px;

    width:260px;
    height:260px;

    border-radius:50%;

    background:
      radial-gradient(
        circle,
        rgba(225,6,0,.09),
        transparent 67%
      );

    pointer-events:none;
  }

  .broadcast-left {
    position:relative;

    z-index:2;

    min-width:0;
  }

  .broadcast-eyebrow {
    display:block;

    margin-bottom:7px;

    color:#e84c45;

    font-size:6px;

    font-weight:1000;

    letter-spacing:.15em;
  }

  .broadcast-title-line {
    display:flex;

    align-items:baseline;

    gap:9px;

    min-width:0;
  }

  .broadcast-title-line h1 {
    margin:0;

    flex:
      0 1 auto;

    max-width:620px;

    overflow:hidden;

    white-space:nowrap;

    text-overflow:ellipsis;

    font-size:
      clamp(
        23px,
        2.6vw,
        34px
      );

    line-height:1;

    letter-spacing:-.045em;

    font-style:italic;

    font-weight:1000;
  }

  .broadcast-divider {
    flex:
      0 0 auto;

    color:
      rgba(255,255,255,.16);

    font-size:16px;

    font-weight:300;
  }

  .broadcast-title-line p {
    margin:0;

    min-width:0;

    overflow:hidden;

    white-space:nowrap;

    text-overflow:ellipsis;

    color:var(--muted);

    font-size:8px;

    font-weight:700;
  }

  .broadcast-mode {
    position:relative;

    z-index:2;

    min-width:105px;

    min-height:40px;

    padding:
      0 11px;

    flex:
      0 0 auto;

    display:flex;

    align-items:center;

    justify-content:center;

    gap:8px;

    border:
      1px solid
      var(--border);

    border-radius:8px;

    background:
      rgba(255,255,255,.018);
  }

  .broadcast-mode > i {
    width:7px;
    height:7px;

    flex:
      0 0 7px;

    border-radius:50%;

    background:
      currentColor;
  }

  .broadcast-mode > div {
    display:flex;

    flex-direction:column;

    gap:1px;
  }

  .broadcast-mode small {
    color:#69737e;

    font-size:4px;

    font-weight:1000;

    letter-spacing:.11em;
  }

  .broadcast-mode strong {
    font-size:8px;

    letter-spacing:.06em;
  }

  .broadcast-mode-live {
    color:#55e297;

    border-color:
      rgba(85,226,151,.16);

    background:
      rgba(85,226,151,.035);
  }

  .broadcast-mode-live > i {
    box-shadow:
      0 0 11px
      rgba(85,226,151,.8);
  }

  .broadcast-mode-replay {
    color:#ffad4f;

    border-color:
      rgba(255,173,79,.17);

    background:
      rgba(255,173,79,.035);
  }

  .broadcast-mode-replay > i {
    box-shadow:
      0 0 10px
      rgba(255,173,79,.55);
  }

  /* =========================================================
     METRICS
     ========================================================= */

  .metrics {
    display:grid;

    grid-template-columns:
      repeat(
        4,
        minmax(0,1fr)
      );

    gap:7px;

    margin-top:7px;
  }

  .metric {
    position:relative;

    min-height:70px;

    padding:
      10px 14px;

    display:flex;

    flex-direction:column;

    justify-content:
      space-between;

    overflow:hidden;

    border:
      1px solid
      var(--border);

    border-radius:9px;

    background:
      linear-gradient(
        145deg,
        var(--panel),
        var(--panel2)
      );
  }

  .metric > small {
    color:var(--muted);

    font-size:5px;

    font-weight:1000;

    letter-spacing:.09em;
  }

  .metric > strong {
    font-size:14px;
  }

  .metric-green {
    color:#56df92;
  }

  .metric-amber {
    color:#ffb255;
  }

  .leader-driver {
    display:flex;

    align-items:center;

    gap:8px;
  }

  .leader-photo {
    width:39px;
    height:39px;

    flex:
      0 0 39px;

    overflow:hidden;

    display:grid;

    place-items:center;

    border:
      2px solid;

    border-radius:50%;

    background:
      rgba(255,255,255,.025);
  }

  .leader-photo img {
    width:100%;
    height:100%;

    object-fit:cover;

    object-position:center top;
  }

  .leader-photo span {
    font-size:6px;

    font-weight:1000;
  }

  .leader-copy strong {
    display:block;

    font-size:13px;
  }

  .leader-copy span {
    display:block;

    margin-top:1px;

    font-size:6px;
  }

  .leader-copy small {
    display:block;

    margin-top:1px;

    color:var(--muted);

    font-size:5px;
  }

  /* =========================================================
     PLAYER
     ========================================================= */

  .player {
    margin-top:7px;

    padding:
      12px 15px;

    border:
      1px solid
      rgba(255,178,85,.16);

    border-radius:10px;

    background:
      linear-gradient(
        90deg,
        rgba(255,178,85,.045),
        var(--panel)
      );
  }

  .player-info {
    display:flex;

    justify-content:
      space-between;

    gap:15px;

    margin-bottom:9px;
  }

  .player-info span {
    display:block;

    color:#ffb255;

    font-size:6px;

    font-weight:1000;
  }

  .player-info strong {
    font-size:9px;
  }

  .player-clock {
    font-size:10px;

    font-weight:1000;
  }

  .timeline {
    width:100%;

    height:4px;

    appearance:none;

    border:0;

    border-radius:999px;
  }

  .timeline::-webkit-slider-thumb {
    appearance:none;

    width:14px;
    height:14px;

    border:
      3px solid
      #fff;

    border-radius:50%;

    background:#e73d35;

    cursor:pointer;
  }

  .player-actions {
    margin-top:9px;

    display:flex;

    align-items:center;

    gap:7px;
  }

  .player-actions button {
    color:var(--text);

    border:
      1px solid
      var(--border);

    background:
      rgba(255,255,255,.035);

    cursor:pointer;
  }

  .play {
    width:36px;
    height:36px;

    border-radius:50%;
  }

  .restart {
    min-height:32px;

    padding:
      0 10px;

    border-radius:6px;

    font-size:6px;
  }

  .speed {
    margin-left:auto;

    display:flex;

    gap:4px;
  }

  .speed button {
    min-width:35px;

    min-height:29px;

    border-radius:5px;
  }

  .speed button.active {
    background:#d93530;

    border-color:#d93530;
  }

  /* =========================================================
     MAIN
     ========================================================= */

  .main-grid {
    margin-top:8px;

    display:grid;

    grid-template-columns:
      minmax(0,1fr)
      430px;

    gap:9px;

    align-items:start;
  }

  .timing-card {
    overflow:hidden;

    border:
      1px solid
      var(--border);

    border-radius:13px;

    background:
      linear-gradient(
        145deg,
        var(--panel),
        var(--panel2)
      );
  }

  .card-header {
    min-height:66px;

    padding:
      13px 17px;

    display:flex;

    align-items:center;

    justify-content:
      space-between;

    border-bottom:
      1px solid
      var(--border);
  }

  .card-header span {
    color:#ff5149;

    font-size:6px;

    font-weight:1000;
  }

  .card-header h2 {
    margin:
      4px 0 0;

    font-size:19px;
  }

  .small-mode {
    padding:
      5px 8px;

    border:
      1px solid
      var(--border);

    border-radius:999px;

    font-size:6px;
  }

  .small-mode.live {
    color:#56df92;
  }

  .small-mode.replay {
    color:#ffb255;
  }

  /* =========================================================
     FIELD
     ========================================================= */

  .field-label {
    min-height:32px;

    padding:
      0 17px;

    display:flex;

    align-items:center;

    justify-content:
      space-between;

    border-top:
      1px solid
      rgba(255,255,255,.055);

    border-bottom:
      1px solid
      rgba(255,255,255,.075);

    background:
      rgba(0,0,0,.13);
  }

  .field-label span {
    color:#737e89;

    font-size:6px;

    font-weight:1000;

    letter-spacing:.13em;
  }

  .field-label b {
    color:#9aa3ac;

    font-size:6px;
  }

  /* =========================================================
     TABLE
     ========================================================= */

  .table-scroll {
    overflow-x:auto;
  }

  .timing-table {
    min-width:940px;
  }

  .row {
    min-height:62px;

    padding:
      0 15px;

    display:grid;

    gap:8px;

    align-items:center;

    border-bottom:
      1px solid
      var(--border);
  }

  .race-table .row {
    grid-template-columns:
      55px
      minmax(190px,1.25fr)
      80px
      80px
      94px
      58px
      76px
      55px;
  }

  .session-table {
    min-width:1120px;
  }

  .session-table .row {
    grid-template-columns:
      55px
      minmax(185px,1.05fr)
      80px
      94px
      94px
      minmax(280px,1.45fr)
      52px
      76px;
  }

  .table-head {
    min-height:34px;

    color:var(--muted);

    background:
      rgba(0,0,0,.08);

    font-size:6px;

    font-weight:1000;
  }

  .driver-row {
    border-left:
      3px solid
      #777;
  }

  .position-cell {
    display:flex;

    align-items:center;

    gap:5px;
  }

  .position-cell strong {
    font-size:14px;
  }

  .position-up-arrow {
    color:#54e294;
  }

  .position-down-arrow {
    color:#f45b55;
  }

  .position-up {
    animation:
      positionUpFlash
      .62s ease-out;
  }

  .position-down {
    animation:
      positionDownFlash
      .62s ease-out;
  }

  @keyframes positionUpFlash {
    0% {
      background:
        rgba(59,213,126,.35);
    }

    100% {
      background:
        transparent;
    }
  }

  @keyframes positionDownFlash {
    0% {
      background:
        rgba(236,70,65,.32);
    }

    100% {
      background:
        transparent;
    }
  }

  .inactive-driver {
    opacity:.43;

    filter:
      grayscale(.92)
      saturate(.25);
  }

  .status-text {
    color:#aaa !important;

    font-weight:1000;
  }

  .driver-row > span {
    color:var(--muted);

    font-size:8px;
  }

  .current-lap {
    color:#70e9a0 !important;

    font-weight:900;
  }

  .driver-cell {
    display:flex;

    align-items:center;

    gap:9px;

    min-width:0;
  }

  .avatar {
    width:38px;
    height:38px;

    flex:
      0 0 38px;

    overflow:hidden;

    display:grid;

    place-items:center;

    border:
      1px solid
      var(--border);

    border-radius:50%;
  }

  .avatar img {
    width:100%;
    height:100%;

    object-fit:cover;

    object-position:center top;
  }

  .driver-name {
    min-width:0;
  }

  .driver-name b {
    display:block;

    font-size:9px;
  }

  .driver-name small {
    display:block;

    margin-top:3px;

    color:var(--muted);

    font-size:7px;
  }

  /* =========================================================
     TYRE
     ========================================================= */

  .tyre-cell {
    display:flex;

    align-items:center;

    gap:5px;
  }

  .tyre {
    width:27px;
    height:27px;

    display:grid;

    place-items:center;

    border:
      2px solid;

    border-radius:50%;

    font-style:normal;

    font-size:7px;

    font-weight:1000;
  }

  .soft {
    color:#ff4d45;
    border-color:#ff4d45;
  }

  .medium {
    color:#e9ca39;
    border-color:#e9ca39;
  }

  .hard {
    color:#e8edf0;
    border-color:#e8edf0;
  }

  .inter {
    color:#49cf7d;
    border-color:#49cf7d;
  }

  .wet {
    color:#5aa8ff;
    border-color:#5aa8ff;
  }

  .unknown {
    color:#707a86;
    border-color:#59616a;
  }

  /* =========================================================
     MINI SECTORS
     ========================================================= */

  .mini-sectors {
    display:grid;

    grid-template-columns:
      repeat(
        3,
        minmax(0,1fr)
      );

    gap:7px;
  }

  .sector-bars {
    display:flex;

    gap:2px;
  }

  .mini-sector {
    flex:1;

    height:5px;

    border-radius:1px;
  }

  .mini-yellow {
    background:#f0d526;
  }

  .mini-green {
    background:#48dc86;
  }

  .mini-purple {
    background:#c35eff;
  }

  .mini-pit {
    background:#4b91eb;
  }

  .mini-empty {
    background:
      rgba(255,255,255,.07);
  }

  .sector-bottom {
    margin-top:3px;

    display:flex;

    justify-content:
      space-between;
  }

  .sector-bottom span,
  .sector-bottom b {
    font-size:5px;
  }

  /* =========================================================
     RACE HUB
     ========================================================= */

  .race-hub {
    position:sticky;

    top:10px;

    align-self:start;

    overflow:hidden;

    border:
      1px solid
      var(--border);

    border-radius:14px;

    background:
      linear-gradient(
        155deg,
        rgba(20,26,35,.98),
        rgba(9,13,18,.98)
      );

    box-shadow:
      0 20px 55px
      rgba(0,0,0,.22);
  }

  :root[data-site-theme="red"] .race-hub {
    background:
      linear-gradient(
        155deg,
        rgba(54,15,19,.98),
        rgba(21,8,10,.98)
      );
  }

  :root[data-site-theme="light"] .race-hub {
    background:
      linear-gradient(
        155deg,
        #fff,
        #eef1f5
      );
  }

  /* HUB TOP */

  .hub-top {
    min-height:83px;

    padding:
      15px 16px 13px;

    display:flex;

    align-items:flex-start;

    justify-content:
      space-between;

    gap:12px;

    position:relative;

    overflow:hidden;

    border-bottom:
      1px solid
      var(--border);
  }

  .hub-top::after {
    content:"";

    position:absolute;

    width:170px;
    height:170px;

    right:-55px;
    top:-95px;

    border-radius:50%;

    background:
      radial-gradient(
        circle,
        rgba(225,6,0,.18),
        transparent 70%
      );

    pointer-events:none;
  }

  .hub-eyebrow {
    display:block;

    color:#ef5149;

    font-size:5px;

    font-weight:1000;

    letter-spacing:.16em;
  }

  .hub-title-row {
    display:flex;

    align-items:center;

    gap:8px;

    margin-top:5px;
  }

  .hub-title-row h2 {
    margin:0;

    font-size:21px;

    letter-spacing:-.045em;

    font-style:italic;
  }

  .hub-status {
    min-height:21px;

    padding:
      0 7px;

    display:flex;

    align-items:center;

    gap:5px;

    border:
      1px solid
      var(--border);

    border-radius:999px;

    font-size:5px;

    font-weight:1000;
  }

  .hub-status i {
    width:5px;
    height:5px;

    border-radius:50%;

    background:currentColor;
  }

  .hub-status-live {
    color:#55df94;

    border-color:
      rgba(85,223,148,.17);
  }

  .hub-status-live i {
    box-shadow:
      0 0 8px
      #55df94;
  }

  .hub-status-replay {
    color:#ffae50;

    border-color:
      rgba(255,174,80,.17);
  }

  .hub-session-name {
    position:relative;

    z-index:2;

    max-width:145px;

    overflow:hidden;

    white-space:nowrap;

    text-overflow:ellipsis;

    color:#747e89;

    font-size:6px;

    font-weight:800;

    text-align:right;
  }

  /* QUICK INFO */

  .hub-quick {
    display:grid;

    grid-template-columns:
      repeat(
        3,
        minmax(0,1fr)
      );

    border-bottom:
      1px solid
      var(--border);

    background:
      rgba(0,0,0,.12);
  }

  .hub-stat {
    min-width:0;

    padding:
      9px 10px;

    border-right:
      1px solid
      var(--border);
  }

  .hub-stat:last-child {
    border-right:0;
  }

  .hub-stat small {
    display:block;

    margin-bottom:3px;

    color:#5f6a75;

    font-size:4px;

    font-weight:1000;

    letter-spacing:.09em;
  }

  .hub-stat strong {
    display:block;

    overflow:hidden;

    white-space:nowrap;

    text-overflow:ellipsis;

    font-size:8px;

    font-weight:1000;
  }

  /* HUB TABS */

  .hub-tabs {
    padding:
      7px;

    display:grid;

    grid-template-columns:
      1.35fr
      .75fr
      .8fr;

    gap:5px;

    border-bottom:
      1px solid
      var(--border);

    background:
      rgba(0,0,0,.10);
  }

  .hub-tab {
    min-width:0;

    min-height:35px;

    display:flex;

    align-items:center;

    justify-content:center;

    gap:5px;

    border:
      1px solid
      transparent;

    border-radius:7px;

    color:#727c87;

    background:
      transparent;

    font-size:5px;

    font-weight:1000;

    letter-spacing:.04em;

    cursor:pointer;

    transition:
      .18s ease;
  }

  .hub-tab:hover {
    color:var(--text);

    background:
      rgba(255,255,255,.035);
  }

  .hub-tab.active {
    color:#fff;

    border-color:
      rgba(231,64,57,.26);

    background:
      linear-gradient(
        135deg,
        rgba(225,6,0,.16),
        rgba(225,6,0,.045)
      );

    box-shadow:
      inset 0 -2px 0
      rgba(235,71,64,.65);
  }

  .projection-dot {
    width:5px;
    height:5px;

    border-radius:50%;

    background:#53df94;

    box-shadow:
      0 0 9px
      #53df94;
  }

  /* HUB PANELS */

  .hub-panel {
    min-height:420px;

    padding:9px;

    animation:
      hubFade
      .18s ease;
  }

  @keyframes hubFade {
    from {
      opacity:.45;

      transform:
        translateY(3px);
    }

    to {
      opacity:1;

      transform:
        translateY(0);
    }
  }

  .championship-panel {
    padding:8px;
  }

  .hub-empty {
    min-height:360px;

    display:flex;

    flex-direction:column;

    align-items:center;

    justify-content:center;

    text-align:center;
  }

  .hub-empty span {
    color:#ee5149;

    font-size:6px;

    font-weight:1000;
  }

  .hub-empty strong {
    margin-top:7px;

    font-size:11px;
  }

  /* TRACK */

  .track-panel {
    padding:
      12px;
  }

  .panel-section-head {
    min-height:45px;

    display:flex;

    align-items:flex-start;

    justify-content:
      space-between;

    gap:10px;

    margin-bottom:8px;

    padding-bottom:8px;

    border-bottom:
      1px solid
      var(--border);
  }

  .panel-section-head span {
    display:block;

    color:#e64b45;

    font-size:5px;

    font-weight:1000;

    letter-spacing:.1em;
  }

  .panel-section-head strong {
    display:block;

    margin-top:4px;

    font-size:11px;
  }

  .panel-section-head > b {
    color:#69747f;

    font-size:6px;
  }

  .hub-map {
    overflow:hidden;

    border-radius:10px;

    background:
      rgba(0,0,0,.10);
  }

  .hub-map-placeholder {
    min-height:330px;

    padding:20px;

    display:flex;

    flex-direction:column;

    align-items:center;

    justify-content:center;

    text-align:center;

    border:
      1px solid
      rgba(255,255,255,.055);

    border-radius:10px;

    background:
      radial-gradient(
        circle at 50% 45%,
        rgba(225,6,0,.08),
        transparent 40%
      ),
      rgba(0,0,0,.10);
  }

  .map-orbit {
    position:relative;

    width:130px;
    height:130px;

    margin-bottom:16px;

    display:grid;

    place-items:center;
  }

  .map-orbit > i {
    position:absolute;

    inset:0;

    border:
      1px solid
      rgba(255,255,255,.07);

    border-radius:
      48% 52% 60% 40% /
      55% 35% 65% 45%;

    transform:
      rotate(12deg);
  }

  .map-orbit > i:nth-child(2) {
    inset:14px;

    transform:
      rotate(-24deg);

    border-color:
      rgba(225,6,0,.18);
  }

  .map-orbit > i:nth-child(3) {
    inset:30px;

    transform:
      rotate(45deg);

    border-color:
      rgba(255,255,255,.11);
  }

  .map-orbit span {
    position:relative;

    z-index:2;

    color:#ee5149;

    font-size:18px;

    font-weight:1000;

    font-style:italic;
  }

  .hub-map-placeholder strong {
    font-size:13px;
  }

  .hub-map-placeholder p {
    max-width:280px;

    margin:
      7px auto 0;

    color:#6e7884;

    font-size:7px;

    line-height:1.6;
  }

  .map-status {
    margin-top:15px;

    display:flex;

    align-items:center;

    gap:5px;

    color:#55df94;

    font-size:5px;

    font-weight:1000;
  }

  .map-status i {
    width:5px;
    height:5px;

    border-radius:50%;

    background:#55df94;

    box-shadow:
      0 0 9px
      #55df94;
  }

  /* CONTROL */

  .control-panel {
    display:grid;

    gap:8px;

    padding:
      10px;
  }

  .control-block {
    padding:
      12px;

    border:
      1px solid
      var(--border);

    border-radius:9px;

    background:
      rgba(255,255,255,.018);
  }

  .control-feature {
    position:relative;

    overflow:hidden;

    background:
      linear-gradient(
        135deg,
        rgba(225,6,0,.065),
        rgba(255,255,255,.012)
      );
  }

  .control-feature::after {
    content:"";

    position:absolute;

    width:120px;
    height:120px;

    right:-50px;
    top:-55px;

    border-radius:50%;

    background:
      radial-gradient(
        circle,
        rgba(225,6,0,.12),
        transparent 70%
      );
  }

  .control-heading {
    position:relative;

    z-index:2;

    display:flex;

    align-items:center;

    justify-content:
      space-between;

    gap:10px;

    margin-bottom:10px;
  }

  .control-heading span {
    color:#e94e47;

    font-size:5px;

    font-weight:1000;

    letter-spacing:.09em;
  }

  .control-heading b {
    color:#666f79;

    font-size:5px;
  }

  .control-flag {
    position:relative;

    z-index:2;

    width:fit-content;

    min-height:26px;

    padding:
      0 8px;

    display:flex;

    align-items:center;

    gap:6px;

    border:
      1px solid
      rgba(238,205,65,.20);

    border-radius:6px;

    color:#eed044;

    background:
      rgba(238,205,65,.04);

    font-size:6px;

    font-weight:1000;
  }

  .control-flag i {
    width:6px;
    height:6px;

    border-radius:50%;

    background:currentColor;

    box-shadow:
      0 0 8px
      currentColor;
  }

  .control-clear {
    color:#54df93;

    border-color:
      rgba(84,223,147,.19);

    background:
      rgba(84,223,147,.035);
  }

  .control-feature p {
    position:relative;

    z-index:2;

    margin:
      10px 0 0;

    color:#7b8590;

    font-size:8px;

    line-height:1.55;
  }

  .control-row {
    min-height:35px;

    display:flex;

    align-items:center;

    justify-content:
      space-between;

    gap:10px;

    border-top:
      1px solid
      var(--border);
  }

  .control-row:first-of-type {
    border-top:0;
  }

  .control-row span {
    color:#68737e;

    font-size:6px;
  }

  .control-row b {
    max-width:62%;

    overflow:hidden;

    white-space:nowrap;

    text-overflow:ellipsis;

    font-size:7px;

    text-align:right;
  }

  .text-green {
    color:#56df92 !important;
  }

  .text-amber {
    color:#ffb255 !important;
  }

  .system-block {
    background:
      linear-gradient(
        135deg,
        rgba(75,216,140,.045),
        rgba(255,255,255,.01)
      );
  }

  .system-status {
    display:flex;

    align-items:center;

    gap:9px;
  }

  .system-icon {
    width:31px;
    height:31px;

    display:grid;

    place-items:center;

    border:
      1px solid
      rgba(84,223,147,.18);

    border-radius:50%;
  }

  .system-icon i {
    width:8px;
    height:8px;

    border-radius:50%;

    background:#54df93;

    box-shadow:
      0 0 12px
      #54df93;
  }

  .system-status span {
    display:block;

    color:#68737e;

    font-size:5px;

    font-weight:1000;
  }

  .system-status strong {
    display:block;

    margin-top:2px;

    color:#54df93;

    font-size:8px;
  }

  .system-block p {
    margin:
      10px 0;

    color:#737d88;

    font-size:7px;

    line-height:1.55;
  }

  .system-lines {
    display:grid;

    grid-template-columns:
      repeat(
        3,
        1fr
      );

    gap:4px;
  }

  .system-lines span {
    min-height:27px;

    display:flex;

    align-items:center;

    justify-content:center;

    gap:4px;

    border:
      1px solid
      rgba(255,255,255,.055);

    border-radius:5px;

    color:#7b8590;

    font-size:4px;

    font-weight:1000;

    text-align:center;
  }

  .system-lines i {
    width:4px;
    height:4px;

    border-radius:50%;

    background:#54df93;
  }

  /* TICKER */

  .hub-ticker {
    min-height:39px;

    padding:
      0 11px;

    display:grid;

    grid-template-columns:
      auto
      minmax(0,1fr);

    align-items:center;

    gap:9px;

    border-top:
      1px solid
      var(--border);

    background:
      rgba(0,0,0,.16);
  }

  .hub-ticker > span {
    display:flex;

    align-items:center;

    gap:5px;

    color:#ef5149;

    font-size:5px;

    font-weight:1000;

    white-space:nowrap;
  }

  .hub-ticker > span i {
    width:5px;
    height:5px;

    border-radius:50%;

    background:#ef5149;

    box-shadow:
      0 0 8px
      rgba(239,81,73,.55);
  }

  .hub-ticker p {
    margin:0;

    overflow:hidden;

    white-space:nowrap;

    text-overflow:ellipsis;

    color:#747f89;

    font-size:6px;
  }

  /* =========================================================
     STATES
     ========================================================= */

  .no-data {
    min-height:220px;

    display:grid;

    place-content:center;

    text-align:center;
  }

  .no-data p {
    color:var(--muted);
  }

  .error {
    margin-top:10px;

    padding:12px;

    color:#ff7b75;
  }

  .loading {
    min-height:560px;

    display:grid;

    place-content:center;

    gap:12px;

    text-align:center;
  }

  .loading span {
    color:var(--muted);
  }

  .spinner {
    width:40px;
    height:40px;

    margin:auto;

    border:
      3px solid
      rgba(255,255,255,.1);

    border-top-color:
      #e10600;

    border-radius:50%;

    animation:
      spinner .8s
      linear infinite;
  }

  @keyframes spinner {
    to {
      transform:
        rotate(360deg);
    }
  }

  /* =========================================================
     RESPONSIVE
     ========================================================= */

  @media(max-width:1180px) {
    .main-grid {
      grid-template-columns:
        1fr;
    }

    .race-hub {
      position:static;
    }
  }

  @media(max-width:760px) {
    .race-wrap {
      width:
        calc(100% - 18px);

      padding-top:9px;
    }

    .broadcast-header {
      min-height:78px;

      padding:
        12px 14px;
    }

    .broadcast-title-line {
      display:block;
    }

    .broadcast-title-line h1 {
      font-size:22px;
    }

    .broadcast-divider {
      display:none;
    }

    .broadcast-title-line p {
      margin-top:5px;

      font-size:7px;
    }

    .broadcast-mode {
      min-width:78px;

      min-height:36px;
    }

    .metrics {
      grid-template-columns:
        1fr 1fr;
    }

    .main-grid {
      margin-top:7px;
    }

    .player-actions {
      flex-wrap:wrap;
    }

    .speed {
      width:100%;

      margin-left:0;
    }

    .speed button {
      flex:1;
    }

    .race-hub {
      border-radius:11px;
    }

    .hub-panel {
      min-height:360px;
    }
  }

  @media(max-width:520px) {
    .broadcast-header {
      gap:9px;
    }

    .broadcast-eyebrow {
      font-size:5px;
    }

    .broadcast-title-line h1 {
      font-size:18px;
    }

    .broadcast-mode {
      min-width:68px;

      padding:
        0 8px;
    }

    .metric {
      min-height:65px;

      padding:
        9px 11px;
    }

    .metric > strong {
      font-size:12px;
    }

    .hub-top {
      min-height:72px;

      padding:
        12px;
    }

    .hub-title-row h2 {
      font-size:18px;
    }

    .hub-session-name {
      max-width:105px;
    }

    .hub-tabs {
      grid-template-columns:
        1.45fr
        .7fr
        .75fr;
    }

    .hub-tab {
      min-height:32px;

      font-size:4px;
    }

    .system-lines {
      grid-template-columns:
        1fr;
    }
  }
`;