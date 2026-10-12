"use client";

import {
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import Header from "@/components/Header";

type RaceEvent = {
  id: string;

  event_type:
    | "rain_start"
    | "rain_stop"
    | "safety_car";

  event_lap: number;
  duration_laps: number;

  message: string;

  meta:
    | Record<string, any>
    | null;
};

type RaceResult = {
  id: string;

  user_id: string;

  is_bot: boolean;

  bot_key:
    | string
    | null;

  bot_name:
    | string
    | null;

  team_key: string;
  team_name: string;

  driver_key:
    | string
    | null;

  position: number;
  points: number;

  finish_status:
    | "finished"
    | "dnf";

  performance_score: number;
  team_rating: number;

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

  incident_type:
    | string
    | null;

  incident_key:
    | string
    | null;

  incident_message:
    | string
    | null;

  incident_lap:
    | number
    | null;

  profile: {
    id: string;

    display_name:
      | string
      | null;

    username:
      | string
      | null;

    avatar_url:
      | string
      | null;
  } | null;

  isMe: boolean;
};

type Data = {
  race: {
    id: string;
    round: number;
    name: string;
    country: string;
    status: string;
  };

  season:
    | {
        season_number: number;
        current_round: number;
        status: string;
      }
    | null;

  events: RaceEvent[];

  results: RaceResult[];
};

type Movement = {
  delta: number;
  expiresAt: number;
};

const DRIVER_NAMES: Record<
  string,
  string
> = {
  "lando-norris":
    "Lando Norris",

  "oscar-piastri":
    "Oscar Piastri",

  "charles-leclerc":
    "Charles Leclerc",

  "lewis-hamilton":
    "Lewis Hamilton",

  "max-verstappen":
    "Max Verstappen",

  "isack-hadjar":
    "Isack Hadjar",

  "george-russell":
    "George Russell",

  "kimi-antonelli":
    "Kimi Antonelli",

  "fernando-alonso":
    "Fernando Alonso",

  "lance-stroll":
    "Lance Stroll",

  "pierre-gasly":
    "Pierre Gasly",

  "franco-colapinto":
    "Franco Colapinto",

  "carlos-sainz":
    "Carlos Sainz",

  "alexander-albon":
    "Alexander Albon",

  "esteban-ocon":
    "Esteban Ocon",

  "oliver-bearman":
    "Oliver Bearman",

  "liam-lawson":
    "Liam Lawson",

  "arvid-lindblad":
    "Arvid Lindblad",

  "nico-hulkenberg":
    "Nico Hulkenberg",

  "gabriel-bortoleto":
    "Gabriel Bortoleto",

  "sergio-perez":
    "Sergio Perez",

  "valtteri-bottas":
    "Valtteri Bottas",
};

const TEAM_COLORS: Record<
  string,
  string
> = {
  mclaren: "#ff8000",

  ferrari: "#e8002d",

  "red-bull": "#3671c6",

  mercedes: "#27f4d2",

  "aston-martin": "#229971",

  alpine: "#ff87bc",

  williams: "#64c4ff",

  haas: "#b6babd",

  "racing-bulls": "#6692ff",

  audi: "#f50537",

  cadillac: "#e6e6e6",
};

const COUNTDOWN_MS =
  5600;

/*
  Normal hızda yaklaşık
  90 saniyelik yarış.
*/

const RACE_DURATION_MS =
  90_000;

const TOTAL_LAPS = 70;

/*
  70 gerçek turu birebir
  ekranda döndürmüyoruz.

  Araçlar görsel pistte
  yalnızca ~7.5 tur atıyor.
  Böylece takip etmek mümkün.
*/

const VISUAL_LAPS = 7.5;

const TRACK_PATH =
  "M 116 252 C 72 185 111 104 214 91 C 312 78 343 132 430 118 C 527 101 551 58 659 78 C 790 102 838 179 799 249 C 765 310 680 299 633 341 C 576 393 500 408 428 373 C 355 338 314 326 239 354 C 156 384 79 337 89 285 C 93 270 102 260 116 252 Z";

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function hashNumber(
  value: string
) {
  let hash = 0;

  for (
    let i = 0;
    i < value.length;
    i++
  ) {
    hash =
      (hash * 31 +
        value.charCodeAt(i)) %
      100000;
  }

  return hash;
}

function smoothStep(
  value: number
) {
  const x =
    clamp(value, 0, 1);

  return (
    x *
    x *
    (3 - 2 * x)
  );
}

function getDriverName(
  result: RaceResult
) {
  if (
    result.driver_key &&
    DRIVER_NAMES[
      result.driver_key
    ]
  ) {
    return DRIVER_NAMES[
      result.driver_key
    ];
  }

  return (
    result.profile
      ?.display_name ||
    result.profile
      ?.username ||
    result.bot_name ||
    "Driver"
  );
}

function getSurname(
  result: RaceResult
) {
  const name =
    getDriverName(result);

  return (
    name
      .split(" ")
      .filter(Boolean)
      .at(-1) ??
    name
  );
}

function getInitials(
  result: RaceResult
) {
  const parts =
    getDriverName(result)
      .split(" ")
      .filter(Boolean);

  if (
    parts.length === 1
  ) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toUpperCase();
}

function getTeamColor(
  result: RaceResult
) {
  return (
    TEAM_COLORS[
      result.team_key
    ] ?? "#ffffff"
  );
}

function getParticipantId(
  result: RaceResult
) {
  return (
    result.user_id ||
    result.bot_key ||
    result.id
  );
}

function getStartOrder(
  results: RaceResult[]
) {
  return [...results]
    .sort((a, b) => {
      const noiseA =
        (hashNumber(
          `${getParticipantId(
            a
          )}:grid`
        ) %
          500) /
          100;

      const noiseB =
        (hashNumber(
          `${getParticipantId(
            b
          )}:grid`
        ) %
          500) /
          100;

      return (
        Number(
          b.team_rating
        ) +
          noiseB -
        (Number(
          a.team_rating
        ) +
          noiseA)
      );
    })
    .map(
      (result) =>
        getParticipantId(
          result
        )
    );
}

function tireLetter(
  tire: string
) {
  if (tire === "soft") {
    return "S";
  }

  if (
    tire === "medium"
  ) {
    return "M";
  }

  return "H";
}

function tireColor(
  tire: string
) {
  if (tire === "soft") {
    return "#ff4052";
  }

  if (
    tire === "medium"
  ) {
    return "#ffd84d";
  }

  return "#f0f0f0";
}

export default function LiveRacePage({
  params,
}: {
  params: Promise<{
    lobbyId: string;
  }>;
}) {
  const { lobbyId } =
    use(params);

  const searchParams =
    useSearchParams();

  const round =
    Number(
      searchParams.get(
        "round"
      ) ?? "1"
    );

  const [data, setData] =
    useState<Data | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  /*
    Simülasyon saati.
  */

  const [clock, setClock] =
    useState(0);

  const simTimeRef =
    useRef(0);

  const lastTickRef =
    useRef<number | null>(
      null
    );

  const [
    speed,
    setSpeed,
  ] = useState(1);

  const [
    paused,
    setPaused,
  ] = useState(false);

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<string | null>(
      null
    );

  const [
    movements,
    setMovements,
  ] = useState<
    Record<string, Movement>
  >({});

  const [
    positionToast,
    setPositionToast,
  ] = useState<{
    delta: number;
    key: number;
  } | null>(null);

  const previousPositions =
    useRef<
      Record<string, number>
    >({});

  const pathRef =
    useRef<SVGPathElement | null>(
      null
    );

  async function load() {
    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/race-results?round=${round}`,
          {
            cache:
              "no-store",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ||
            "Canlı yarış yüklenemedi."
        );

        return;
      }

      const normalized: Data =
        {
          ...result,

          events:
            Array.isArray(
              result.events
            )
              ? result.events
              : [],

          results:
            Array.isArray(
              result.results
            )
              ? result.results
              : [],
        };

      setData(normalized);

      const me =
        normalized.results.find(
          (result) =>
            result.isMe
        );

      const first =
        normalized.results[0];

      setSelectedId(
        getParticipantId(
          me ?? first
        )
      );
    } catch {
      setMessage(
        "Canlı yarış verisine ulaşılamadı."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [lobbyId, round]);

  /*
    Yarış saati.

    Hızı buradan kontrol
    ediyoruz. Böylece 1x/1.5x/2x
    geçişinde animasyon atlamıyor.
  */

  useEffect(() => {
    if (!data) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          const now =
            performance.now();

          if (
            lastTickRef.current ===
            null
          ) {
            lastTickRef.current =
              now;

            return;
          }

          const delta =
            now -
            lastTickRef.current;

          lastTickRef.current =
            now;

          if (paused) {
            return;
          }

          simTimeRef.current +=
            delta * speed;

          const max =
            COUNTDOWN_MS +
            RACE_DURATION_MS;

          if (
            simTimeRef.current >=
            max
          ) {
            simTimeRef.current =
              max;

            setPaused(true);
          }

          setClock(
            simTimeRef.current
          );
        },
        50
      );

    return () => {
      window.clearInterval(
        timer
      );

      lastTickRef.current =
        null;
    };
  }, [
    data,
    paused,
    speed,
  ]);

  const countdownActive =
    clock < COUNTDOWN_MS;

  const raceProgress =
    clamp(
      (clock -
        COUNTDOWN_MS) /
        RACE_DURATION_MS,
      0,
      1
    );

  const finished =
    raceProgress >= 1;

  const currentLap =
    countdownActive
      ? 0
      : raceProgress >= 1
      ? TOTAL_LAPS
      : Math.max(
          1,

          Math.floor(
            raceProgress *
              TOTAL_LAPS
          ) + 1
        );

  const startOrder =
    useMemo(
      () =>
        getStartOrder(
          data?.results ??
            []
        ),
      [data]
    );

  const startPositionMap =
    useMemo(() => {
      const map: Record<
        string,
        number
      > = {};

      startOrder.forEach(
        (id, index) => {
          map[id] =
            index + 1;
        }
      );

      return map;
    }, [startOrder]);

  function isDnfNow(
    result: RaceResult
  ) {
    return (
      result.finish_status ===
        "dnf" &&
      !!result.incident_lap &&
      currentLap >=
        result.incident_lap
    );
  }

  function isPittingNow(
    result: RaceResult
  ) {
    if (
      countdownActive ||
      finished ||
      isDnfNow(result)
    ) {
      return false;
    }

    return (
      Math.abs(
        currentLap -
          result.pit_lap
      ) <= 1
    );
  }

  function isSafetyCarNow() {
    return (
      data?.events.some(
        (event) =>
          event.event_type ===
            "safety_car" &&
          currentLap >=
            event.event_lap &&
          currentLap <=
            event.event_lap +
              Math.max(
                1,
                event.duration_laps
              )
      ) ?? false
    );
  }

  function isRainingNow() {
    if (
      !data ||
      currentLap <= 0
    ) {
      return false;
    }

    const rainStarts =
      data.events
        .filter(
          (event) =>
            event.event_type ===
              "rain_start" &&
            event.event_lap <=
              currentLap
        )
        .sort(
          (a, b) =>
            b.event_lap -
            a.event_lap
        );

    if (
      rainStarts.length ===
      0
    ) {
      return false;
    }

    const latestStart =
      rainStarts[0];

    const stop =
      data.events.find(
        (event) =>
          event.event_type ===
            "rain_stop" &&
          event.event_lap >
            latestStart.event_lap &&
          event.event_lap <=
            currentLap
      );

    return !stop;
  }

  const safetyCarActive =
    isSafetyCarNow();

  const raining =
    isRainingNow();

  function getLiveScore(
    result: RaceResult
  ) {
    const id =
      getParticipantId(
        result
      );

    const startPos =
      startPositionMap[id] ??
      result.position;

    const finalPos =
      result.position;

    /*
      İlk bölüm daha karışık,
      sonlara doğru gerçek
      sonuca yaklaşır.
    */

    const progressInfluence =
      smoothStep(
        raceProgress
      );

    let score =
      startPos *
        (1 -
          progressInfluence) +
      finalPos *
        progressInfluence;

    const phase =
      (hashNumber(id) %
        628) /
      100;

    /*
      Ufak canlı mücadeleler.
      Çok yüksek değer vermiyoruz,
      sıralama saniyede 5 kez
      değişmesin.
    */

    score +=
      Math.sin(
        raceProgress *
          Math.PI *
          8 +
          phase
      ) *
      0.16 *
      (1 -
        raceProgress *
          0.55);

    /*
      Yarışın ilk turlarında
      start karmaşası.
    */

    if (
      raceProgress <
      0.18
    ) {
      score +=
        Math.sin(
          raceProgress *
            Math.PI *
            22 +
            phase
        ) *
        0.15 *
        (1 -
          raceProgress /
            0.18);
    }

    /*
      PIT STOP sırasında
      kısa süreli pozisyon
      kaybı.
    */

    if (
      result.pit_lap &&
      currentLap > 0
    ) {
      const difference =
        Math.abs(
          currentLap -
            result.pit_lap
        );

      if (
        difference <= 1.3
      ) {
        score +=
          1.1 *
          (1 -
            difference /
              1.3);
      }
    }

    /*
      DNF yapanlar gridin
      arkasına geçer.
    */

    if (
      isDnfNow(result)
    ) {
      score +=
        20 +
        (TOTAL_LAPS -
          (result.incident_lap ??
            0)) /
          100;
    }

    return score;
  }

  const liveOrder =
    useMemo(() => {
      if (!data) {
        return [];
      }

      if (
        countdownActive
      ) {
        return [...data.results]
          .sort(
            (a, b) =>
              (startPositionMap[
                getParticipantId(
                  a
                )
              ] ?? 99) -
              (startPositionMap[
                getParticipantId(
                  b
                )
              ] ?? 99)
          );
      }

      return [...data.results]
        .sort(
          (a, b) =>
            getLiveScore(a) -
            getLiveScore(b)
        );
    }, [
      data,
      countdownActive,
      raceProgress,
      currentLap,
      startPositionMap,
    ]);

  const livePositionMap =
    useMemo(() => {
      const map: Record<
        string,
        number
      > = {};

      liveOrder.forEach(
        (result, index) => {
          map[
            getParticipantId(
              result
            )
          ] = index + 1;
        }
      );

      return map;
    }, [liveOrder]);

  /*
    POZİSYON KAZANMA /
    KAYBETME TESPİTİ
  */

  const orderSignature =
    liveOrder
      .map(
        (result) =>
          getParticipantId(
            result
          )
      )
      .join("|");

  useEffect(() => {
    if (
      !data ||
      countdownActive ||
      raceProgress <
        0.015
    ) {
      return;
    }

    const previous =
      previousPositions.current;

    const next: Record<
      string,
      number
    > = {};

    liveOrder.forEach(
      (result, index) => {
        const id =
          getParticipantId(
            result
          );

        const newPosition =
          index + 1;

        next[id] =
          newPosition;

        const oldPosition =
          previous[id];

        if (
          oldPosition &&
          oldPosition !==
            newPosition
        ) {
          const delta =
            oldPosition -
            newPosition;

          setMovements(
            (current) => ({
              ...current,

              [id]: {
                delta,

                expiresAt:
                  Date.now() +
                  1800,
              },
            })
          );

          if (
            result.isMe
          ) {
            setPositionToast({
              delta,

              key:
                Date.now(),
            });

            window.setTimeout(
              () => {
                setPositionToast(
                  null
                );
              },
              1900
            );
          }
        }
      }
    );

    previousPositions.current =
      next;
  }, [
    orderSignature,
    data,
    countdownActive,
  ]);

  /*
    İlk sıralamayı baseline
    olarak kaydet.
  */

  useEffect(() => {
    if (
      !data ||
      liveOrder.length ===
        0
    ) {
      return;
    }

    if (
      Object.keys(
        previousPositions.current
      ).length > 0
    ) {
      return;
    }

    const baseline: Record<
      string,
      number
    > = {};

    liveOrder.forEach(
      (result, index) => {
        baseline[
          getParticipantId(
            result
          )
        ] = index + 1;
      }
    );

    previousPositions.current =
      baseline;
  }, [data, liveOrder]);

  const selectedResult =
    liveOrder.find(
      (result) =>
        getParticipantId(
          result
        ) === selectedId
    ) ??
    liveOrder[0] ??
    null;

  const selectedPosition =
    selectedResult
      ? livePositionMap[
          getParticipantId(
            selectedResult
          )
        ]
      : null;

  function currentTire(
    result: RaceResult
  ) {
    return currentLap >=
      result.pit_lap
      ? result.second_tire
      : result.starting_tire;
  }

  function getGap(
    result: RaceResult,
    index: number
  ) {
    if (index === 0) {
      return "LEADER";
    }

    if (
      isDnfNow(result)
    ) {
      return "DNF";
    }

    const leader =
      liveOrder[0];

    if (!leader) {
      return "—";
    }

    let gap =
      Math.max(
        0.15,

        (getLiveScore(
          result
        ) -
          getLiveScore(
            leader
          )) *
          1.42
      );

    if (
      safetyCarActive
    ) {
      gap *= 0.28;
    }

    return `+${gap.toFixed(
      3
    )}`;
  }

  const visibleEvents =
    useMemo(() => {
      if (!data) {
        return [];
      }

      const logs: {
        key: string;
        lap: number;
        message: string;
        type: string;
      }[] = [];

      if (
        !countdownActive
      ) {
        logs.push({
          key: "start",
          lap: 1,
          message:
            "LIGHTS OUT! Yarış başladı.",
          type: "start",
        });
      }

      for (const event of
        data.events) {
        if (
          event.event_lap <=
          currentLap
        ) {
          logs.push({
            key:
              event.id,

            lap:
              event.event_lap,

            message:
              event.message,

            type:
              event.event_type,
          });
        }
      }

      for (const result of
        data.results) {
        if (
          result.pit_lap <=
          currentLap
        ) {
          logs.push({
            key:
              `pit-${result.id}`,

            lap:
              result.pit_lap,

            message:
              `${getDriverName(
                result
              )} pit stop yaptı.`,

            type: "pit",
          });
        }

        if (
          result.incident_lap &&
          result.incident_lap <=
            currentLap &&
          result.incident_message
        ) {
          logs.push({
            key:
              `incident-${result.id}`,

            lap:
              result.incident_lap,

            message:
              `${getDriverName(
                result
              )}: ${
                result.incident_message
              }`,

            type:
              "incident",
          });
        }
      }

      return logs
        .sort(
          (a, b) =>
            a.lap -
            b.lap
        )
        .slice(-7)
        .reverse();
    }, [
      data,
      currentLap,
      countdownActive,
    ]);

  function getTrackPoint(
    result: RaceResult
  ) {
    const path =
      pathRef.current;

    if (!path) {
      return {
        x: 400,
        y: 250,
      };
    }

    const length =
      path.getTotalLength();

    const id =
      getParticipantId(
        result
      );

    const livePosition =
      livePositionMap[id] ??
      result.position;

    let visualProgress =
      raceProgress *
      VISUAL_LAPS;

    /*
      Araçlar sıralamalarına göre
      pist üzerinde küçük mesafe
      farkıyla ayrılıyor.
    */

    const gapFactor =
      safetyCarActive
        ? 0.0025
        : 0.006;

    visualProgress +=
      (liveOrder.length -
        livePosition) *
      gapFactor;

    /*
      Her araç aynı pixelin
      üzerinde başlamasın.
    */

    visualProgress +=
      (hashNumber(id) %
        12) *
      0.00022;

    /*
      DNF yapan aracı olay
      yaşadığı noktada bırak.
    */

    if (
      isDnfNow(result) &&
      result.incident_lap
    ) {
      visualProgress =
        (result.incident_lap /
          TOTAL_LAPS) *
          VISUAL_LAPS +
        (liveOrder.length -
          livePosition) *
          gapFactor;
    }

    const normalized =
      ((visualProgress %
        1) +
        1) %
      1;

    const point =
      path.getPointAtLength(
        normalized *
          length
      );

    /*
      Pit sırasında aracı
      pist çizgisinden biraz
      içeri alıyoruz.
    */

    if (
      isPittingNow(
        result
      )
    ) {
      return {
        x:
          point.x -
          13,

        y:
          point.y +
          16,
      };
    }

    return {
      x: point.x,
      y: point.y,
    };
  }

  if (loading) {
    return (
      <>
        <Header />

        <main
          style={
            loadingStyle
          }
        >
          Yarış kontrol merkezi
          hazırlanıyor...
        </main>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Header />

        <main
          style={
            loadingStyle
          }
        >
          {message ||
            "Yarış yüklenemedi."}
        </main>
      </>
    );
  }

  const lightsOn =
    Math.min(
      5,

      Math.floor(
        clock / 900
      )
    );

  return (
    <>
      <Header />

      <style>
        {`
          @keyframes rainFall {
            from {
              transform: translateY(-80px) translateX(0);
            }

            to {
              transform: translateY(620px) translateX(-110px);
            }
          }

          @keyframes gainFlash {
            0% {
              background: rgba(43, 214, 112, .42);
              box-shadow: inset 4px 0 0 #4ce486;
            }

            100% {
              background: transparent;
              box-shadow: inset 4px 0 0 transparent;
            }
          }

          @keyframes lossFlash {
            0% {
              background: rgba(255, 62, 78, .32);
              box-shadow: inset 4px 0 0 #ff5263;
            }

            100% {
              background: transparent;
              box-shadow: inset 4px 0 0 transparent;
            }
          }

          @keyframes toastGain {
            0% {
              opacity: 0;
              transform: translateY(-15px) scale(.95);
            }

            12% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }

            82% {
              opacity: 1;
            }

            100% {
              opacity: 0;
              transform: translateY(-8px);
            }
          }

          @keyframes toastLoss {
            0% {
              opacity: 0;
              transform: translateY(-15px) scale(.95);
            }

            12% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }

            82% {
              opacity: 1;
            }

            100% {
              opacity: 0;
              transform: translateY(-8px);
            }
          }

          @keyframes pulseRing {
            0%,100% {
              opacity: .35;
              transform: scale(1);
            }

            50% {
              opacity: .85;
              transform: scale(1.28);
            }
          }

          @keyframes scPulse {
            0%,100% {
              opacity: .55;
            }

            50% {
              opacity: 1;
            }
          }

          .liveRaceGrid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 380px;
            gap: 16px;
            align-items: start;
          }

          .trackBox {
            min-height: 580px;
          }

          .leaderboard {
            max-height: 680px;
            overflow-y: auto;
          }

          .gain-row {
            animation: gainFlash 1.6s ease-out;
          }

          .loss-row {
            animation: lossFlash 1.6s ease-out;
          }

          @media (max-width: 1050px) {
            .liveRaceGrid {
              grid-template-columns: 1fr;
            }

            .trackBox {
              min-height: 500px;
            }

            .leaderboard {
              max-height: none;
            }
          }

          @media (max-width: 650px) {
            .trackBox {
              min-height: 390px;
            }
          }
        `}
      </style>

      <main
        style={{
          minHeight:
            "100vh",

          background:
            raining
              ? "radial-gradient(circle at 50% 0%, rgba(45,78,112,.22), transparent 38%), #040506"
              : "radial-gradient(circle at 50% 0%, rgba(210,38,61,.12), transparent 36%), #050505",

          color: "#fff",

          padding:
            "28px 18px 80px",

          overflowX:
            "hidden",
        }}
      >
        {/* POSITION TOAST */}

        {positionToast && (
          <div
            key={
              positionToast.key
            }

            style={{
              position:
                "fixed",

              zIndex: 100,

              top: "88px",

              left: "50%",

              transform:
                "translateX(-50%)",

              minWidth:
                "260px",

              padding:
                "14px 20px",

              borderRadius:
                "12px",

              border:
                positionToast.delta >
                0
                  ? "1px solid rgba(76,228,134,.45)"
                  : "1px solid rgba(255,82,99,.45)",

              background:
                positionToast.delta >
                0
                  ? "rgba(9,45,26,.94)"
                  : "rgba(54,11,17,.94)",

              boxShadow:
                "0 15px 50px rgba(0,0,0,.45)",

              textAlign:
                "center",

              animation:
                positionToast.delta >
                0
                  ? "toastGain 1.9s ease forwards"
                  : "toastLoss 1.9s ease forwards",
            }}
          >
            <div
              style={{
                fontSize:
                  "9px",

                fontWeight:
                  900,

                letterSpacing:
                  "1.3px",

                color:
                  positionToast.delta >
                  0
                    ? "#63ed99"
                    : "#ff7684",
              }}
            >
              {positionToast.delta >
              0
                ? "▲ POZİSYON KAZANDIN"
                : "▼ POZİSYON KAYBETTİN"}
            </div>

            <div
              style={{
                marginTop:
                  "3px",

                fontSize:
                  "20px",

                fontWeight:
                  1000,
              }}
            >
              {positionToast.delta >
              0
                ? `+${positionToast.delta}`
                : positionToast.delta}
            </div>
          </div>
        )}

        <div
          style={{
            maxWidth:
              "1580px",

            margin:
              "0 auto",
          }}
        >
          {/* TOP BAR */}

          <section
            style={{
              ...panel,

              marginBottom:
                "14px",

              padding:
                "15px 18px",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "space-between",

              gap: "15px",

              flexWrap:
                "wrap",
            }}
          >
            <div>
              <div
                style={
                  redLabel
                }
              >
                LIVE RACE · ROUND{" "}
                {
                  data.race
                    .round
                }
              </div>

              <h1
                style={{
                  margin:
                    "4px 0 0",

                  fontSize:
                    "clamp(25px,4vw,42px)",

                  letterSpacing:
                    "-1.5px",
                }}
              >
                {
                  data.race
                    .name
                }
              </h1>

              <div
                style={{
                  color:
                    "#68717b",

                  marginTop:
                    "3px",

                  fontSize:
                    "9px",
                }}
              >
                {
                  data.race
                    .country
                }
              </div>
            </div>

            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                gap: "8px",

                flexWrap:
                  "wrap",
              }}
            >
              <StatusBadge
                text={
                  countdownActive
                    ? "START"
                    : finished
                    ? "FINISHED"
                    : `LAP ${currentLap}/${TOTAL_LAPS}`
                }

                active
              />

              {raining && (
                <StatusBadge
                  text="RAIN"
                  color="#65b9ff"
                />
              )}

              {safetyCarActive && (
                <StatusBadge
                  text="SAFETY CAR"
                  color="#ffd84d"
                />
              )}

              {!countdownActive &&
                !finished && (
                  <button
                    type="button"

                    onClick={() =>
                      setPaused(
                        (value) =>
                          !value
                      )
                    }

                    style={
                      controlButton
                    }
                  >
                    {paused
                      ? "▶ DEVAM"
                      : "Ⅱ DURAKLAT"}
                  </button>
                )}

              {[1, 1.5, 2].map(
                (value) => (
                  <button
                    key={value}

                    type="button"

                    onClick={() =>
                      setSpeed(
                        value
                      )
                    }

                    style={{
                      ...controlButton,

                      border:
                        speed ===
                        value
                          ? "1px solid #d2263d"
                          : controlButton.border,

                      background:
                        speed ===
                        value
                          ? "rgba(210,38,61,.12)"
                          : controlButton.background,
                    }}
                  >
                    {value}x
                  </button>
                )
              )}
            </div>
          </section>

          {/* PROGRESS */}

          <div
            style={{
              height: "3px",

              marginBottom:
                "14px",

              overflow:
                "hidden",

              borderRadius:
                "999px",

              background:
                "rgba(255,255,255,.06)",
            }}
          >
            <div
              style={{
                width:
                  `${raceProgress * 100}%`,

                height:
                  "100%",

                background:
                  "#d2263d",

                transition:
                  "width .15s linear",
              }}
            />
          </div>

          <div
            className="liveRaceGrid"
          >
            {/* LEFT */}

            <div>
              {/* TRACK */}

              <section
                className="trackBox"

                style={{
                  ...panel,

                  position:
                    "relative",

                  overflow:
                    "hidden",

                  background:
                    raining
                      ? "radial-gradient(circle at 50% 50%, rgba(59,90,119,.16), transparent 60%), #07090b"
                      : "radial-gradient(circle at 50% 50%, rgba(255,255,255,.025), transparent 60%), #070707",
                }}
              >
                {/* GRID BACKGROUND */}

                <div
                  style={{
                    position:
                      "absolute",

                    inset: 0,

                    opacity:
                      0.14,

                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)",

                    backgroundSize:
                      "34px 34px",
                  }}
                />

                {/* RAIN */}

                {raining && (
                  <RainOverlay />
                )}

                {/* TRACK SVG */}

                <svg
                  viewBox="0 0 900 480"

                  style={{
                    position:
                      "absolute",

                    inset: 0,

                    width:
                      "100%",

                    height:
                      "100%",
                  }}
                >
                  <defs>
                    <filter
                      id="trackGlow"
                      x="-50%"
                      y="-50%"
                      width="200%"
                      height="200%"
                    >
                      <feGaussianBlur
                        stdDeviation="5"
                        result="blur"
                      />

                      <feMerge>
                        <feMergeNode
                          in="blur"
                        />

                        <feMergeNode
                          in="SourceGraphic"
                        />
                      </feMerge>
                    </filter>
                  </defs>

                  <path
                    d={
                      TRACK_PATH
                    }

                    fill="none"

                    stroke="rgba(255,255,255,.035)"

                    strokeWidth="40"

                    strokeLinecap="round"

                    strokeLinejoin="round"
                  />

                  <path
                    ref={
                      pathRef
                    }

                    d={
                      TRACK_PATH
                    }

                    fill="none"

                    stroke={
                      raining
                        ? "rgba(123,170,206,.38)"
                        : "rgba(255,255,255,.28)"
                    }

                    strokeWidth="4"

                    strokeLinecap="round"

                    strokeLinejoin="round"
                  />

                  <path
                    d="M 614 341 C 651 361 706 348 744 314"

                    fill="none"

                    stroke="rgba(255,255,255,.14)"

                    strokeWidth="8"

                    strokeDasharray="8 8"
                  />

                  <text
                    x="683"
                    y="371"

                    fill="rgba(255,255,255,.3)"

                    fontSize="12"

                    fontWeight="900"
                  >
                    PIT LANE
                  </text>

                  {liveOrder.map(
                    (
                      result
                    ) => {
                      const id =
                        getParticipantId(
                          result
                        );

                      const point =
                        getTrackPoint(
                          result
                        );

                      const selected =
                        id ===
                        selectedId;

                      const me =
                        result.isMe;

                      const dnf =
                        isDnfNow(
                          result
                        );

                      const pit =
                        isPittingNow(
                          result
                        );

                      const color =
                        getTeamColor(
                          result
                        );

                      return (
                        <g
                          key={id}

                          transform={`translate(${point.x},${point.y})`}

                          onClick={() =>
                            setSelectedId(
                              id
                            )
                          }

                          style={{
                            cursor:
                              "pointer",

                            transition:
                              "transform .14s linear",

                            opacity:
                              dnf
                                ? 0.38
                                : 1,
                          }}
                        >
                          {(selected ||
                            me) && (
                            <circle
                              r="17"

                              fill="none"

                              stroke={
                                selected
                                  ? "#fff"
                                  : color
                              }

                              strokeWidth="2"

                              opacity=".7"

                              style={{
                                transformOrigin:
                                  "center",

                                animation:
                                  "pulseRing 1.5s ease-in-out infinite",
                              }}
                            />
                          )}

                          <circle
                            r={
                              selected
                                ? 11
                                : 9
                            }

                            fill={
                              color
                            }

                            stroke={
                              selected
                                ? "#fff"
                                : "#070707"
                            }

                            strokeWidth={
                              selected
                                ? 3
                                : 2
                            }

                            filter={
                              selected
                                ? "url(#trackGlow)"
                                : undefined
                            }
                          />

                          <text
                            x="0"
                            y="3"

                            textAnchor="middle"

                            fill={
                              result.team_key ===
                                "mercedes" ||
                              result.team_key ===
                                "cadillac"
                                ? "#050505"
                                : "#fff"
                            }

                            fontSize="6.5"

                            fontWeight="1000"

                            pointerEvents="none"
                          >
                            {getInitials(
                              result
                            )}
                          </text>

                          {selected && (
                            <>
                              <rect
                                x="-46"
                                y="-42"

                                width="92"
                                height="22"

                                rx="7"

                                fill="rgba(3,3,3,.92)"

                                stroke="rgba(255,255,255,.16)"
                              />

                              <text
                                x="0"
                                y="-28"

                                textAnchor="middle"

                                fill="#fff"

                                fontSize="9"

                                fontWeight="900"

                                pointerEvents="none"
                              >
                                {getSurname(
                                  result
                                )}
                              </text>
                            </>
                          )}

                          {pit && (
                            <text
                              x="0"
                              y="30"

                              textAnchor="middle"

                              fill="#ffd84d"

                              fontSize="8"

                              fontWeight="1000"
                            >
                              PIT
                            </text>
                          )}

                          {dnf && (
                            <text
                              x="0"
                              y="30"

                              textAnchor="middle"

                              fill="#ff5263"

                              fontSize="9"

                              fontWeight="1000"
                            >
                              DNF
                            </text>
                          )}
                        </g>
                      );
                    }
                  )}

                  {safetyCarActive && (
                    <g
                      transform="translate(450,50)"

                      style={{
                        animation:
                          "scPulse 1s ease-in-out infinite",
                      }}
                    >
                      <rect
                        x="-65"
                        y="-17"

                        width="130"
                        height="34"

                        rx="10"

                        fill="#ffd84d"
                      />

                      <text
                        x="0"
                        y="5"

                        textAnchor="middle"

                        fill="#080808"

                        fontSize="12"

                        fontWeight="1000"
                      >
                        SAFETY CAR
                      </text>
                    </g>
                  )}
                </svg>

                {/* START LIGHTS */}

                {countdownActive && (
                  <div
                    style={{
                      position:
                        "absolute",

                      inset: 0,

                      zIndex: 15,

                      display:
                        "flex",

                      flexDirection:
                        "column",

                      justifyContent:
                        "center",

                      alignItems:
                        "center",

                      background:
                        "rgba(0,0,0,.66)",

                      backdropFilter:
                        "blur(5px)",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",

                        gap: "13px",

                        padding:
                          "16px 19px",

                        background:
                          "#0b0b0b",

                        border:
                          "1px solid rgba(255,255,255,.1)",

                        borderRadius:
                          "18px",
                      }}
                    >
                      {[0, 1, 2, 3, 4].map(
                        (index) => (
                          <div
                            key={
                              index
                            }

                            style={{
                              width:
                                "35px",

                              height:
                                "35px",

                              borderRadius:
                                "50%",

                              background:
                                index <
                                lightsOn
                                  ? "#ff182f"
                                  : "#242424",

                              boxShadow:
                                index <
                                lightsOn
                                  ? "0 0 30px rgba(255,24,47,.72)"
                                  : "inset 0 0 0 3px #111",

                              transition:
                                "all .15s ease",
                            }}
                          />
                        )
                      )}
                    </div>

                    <div
                      style={{
                        marginTop:
                          "18px",

                        fontSize:
                          "11px",

                        fontWeight:
                          900,

                        letterSpacing:
                          "2px",

                        color:
                          "#858d96",
                      }}
                    >
                      {lightsOn >= 5
                        ? "LIGHTS OUT..."
                        : "START SEQUENCE"}
                    </div>
                  </div>
                )}

                {/* TRACK HUD */}

                {!countdownActive && (
                  <div
                    style={{
                      position:
                        "absolute",

                      top: "18px",

                      left: "18px",

                      display:
                        "flex",

                      gap: "8px",

                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div
                      style={
                        trackHud
                      }
                    >
                      <span>
                        LAP
                      </span>

                      <strong>
                        {
                          currentLap
                        }
                        /70
                      </strong>
                    </div>

                    <div
                      style={
                        trackHud
                      }
                    >
                      <span>
                        TRACK
                      </span>

                      <strong
                        style={{
                          color:
                            raining
                              ? "#7bc8ff"
                              : "#70df99",
                        }}
                      >
                        {raining
                          ? "WET"
                          : "DRY"}
                      </strong>
                    </div>
                  </div>
                )}
              </section>

              {/* SELECTED DRIVER */}

              {selectedResult && (
                <section
                  style={{
                    ...panel,

                    marginTop:
                      "14px",

                    padding:
                      "17px 19px",

                    display:
                      "grid",

                    gridTemplateColumns:
                      "minmax(170px,1fr) repeat(4,minmax(75px,.35fr))",

                    gap: "14px",

                    alignItems:
                      "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        ...redLabel,

                        color:
                          getTeamColor(
                            selectedResult
                          ),
                      }}
                    >
                      FOLLOWING
                    </div>

                    <div
                      style={{
                        marginTop:
                          "4px",

                        fontSize:
                          "21px",

                        fontWeight:
                          1000,
                      }}
                    >
                      {getDriverName(
                        selectedResult
                      )}
                    </div>

                    <div
                      style={{
                        marginTop:
                          "4px",

                        color:
                          "#69727c",

                        fontSize:
                          "9px",
                      }}
                    >
                      {
                        selectedResult.team_name
                      }

                      {selectedResult.is_bot
                        ? " · AI"
                        : selectedResult.isMe
                        ? " · SEN"
                        : ""}
                    </div>
                  </div>

                  <MiniStat
                    label="POSITION"
                    value={
                      selectedPosition
                        ? `P${selectedPosition}`
                        : "—"
                    }
                  />

                  <MiniStat
                    label="TYRE"
                    value={tireLetter(
                      currentTire(
                        selectedResult
                      )
                    )}
                    valueColor={tireColor(
                      currentTire(
                        selectedResult
                      )
                    )}
                  />

                  <MiniStat
                    label="PIT LAP"
                    value={`${selectedResult.pit_lap}`}
                  />

                  <MiniStat
                    label="AGGRESSION"
                    value={`${selectedResult.aggression}%`}
                  />
                </section>
              )}

              {/* LIVE FEED */}

              <section
                style={{
                  ...panel,

                  marginTop:
                    "14px",
                }}
              >
                <div
                  style={
                    sectionHeader
                  }
                >
                  <div
                    style={
                      redLabel
                    }
                  >
                    RACE CONTROL
                  </div>

                  <h3
                    style={{
                      margin:
                        "4px 0 0",
                    }}
                  >
                    Canlı Olay Akışı
                  </h3>
                </div>

                {visibleEvents.length ===
                0 ? (
                  <div
                    style={{
                      padding:
                        "18px",

                      color:
                        "#626b74",

                      fontSize:
                        "10px",
                    }}
                  >
                    Yarışın başlaması
                    bekleniyor...
                  </div>
                ) : (
                  visibleEvents.map(
                    (event) => (
                      <div
                        key={
                          event.key
                        }

                        style={{
                          display:
                            "grid",

                          gridTemplateColumns:
                            "60px 1fr",

                          gap: "12px",

                          padding:
                            "11px 18px",

                          borderTop:
                            "1px solid rgba(255,255,255,.045)",
                        }}
                      >
                        <strong
                          style={{
                            color:
                              event.type ===
                              "incident"
                                ? "#ff6878"
                                : event.type ===
                                  "safety_car"
                                ? "#ffd84d"
                                : event.type ===
                                  "rain_start"
                                ? "#6fc4ff"
                                : "#878f98",

                            fontSize:
                              "9px",
                          }}
                        >
                          LAP{" "}
                          {
                            event.lap
                          }
                        </strong>

                        <div
                          style={{
                            color:
                              "#adb3ba",

                            fontSize:
                              "10px",

                            lineHeight:
                              1.45,
                          }}
                        >
                          {
                            event.message
                          }
                        </div>
                      </div>
                    )
                  )
                )}
              </section>
            </div>

            {/* RIGHT LEADERBOARD */}

            <aside
              style={panel}
            >
              <div
                style={{
                  ...sectionHeader,

                  position:
                    "sticky",

                  top: 0,

                  zIndex: 4,

                  background:
                    "#090909",
                }}
              >
                <div
                  style={
                    redLabel
                  }
                >
                  LIVE TIMING
                </div>

                <h2
                  style={{
                    margin:
                      "4px 0 0",

                    fontSize:
                      "22px",
                  }}
                >
                  Anlık Sıralama
                </h2>

                <div
                  style={{
                    marginTop:
                      "5px",

                    color:
                      "#616a74",

                    fontSize:
                      "9px",
                  }}
                >
                  Bir pilota tıklayarak
                  pistte takip edebilirsin.
                </div>
              </div>

              <div
                className="leaderboard"
              >
                {liveOrder.map(
                  (
                    result,
                    index
                  ) => {
                    const id =
                      getParticipantId(
                        result
                      );

                    const movement =
                      movements[id];

                    const movementActive =
                      !!movement &&
                      movement.expiresAt >
                        Date.now();

                    const selected =
                      id ===
                      selectedId;

                    const dnf =
                      isDnfNow(
                        result
                      );

                    const pit =
                      isPittingNow(
                        result
                      );

                    const tire =
                      currentTire(
                        result
                      );

                    return (
                      <button
                        key={id}

                        type="button"

                        onClick={() =>
                          setSelectedId(
                            id
                          )
                        }

                        className={
                          movementActive
                            ? movement.delta >
                              0
                              ? "gain-row"
                              : "loss-row"
                            : ""
                        }

                        style={{
                          width:
                            "100%",

                          minHeight:
                            "61px",

                          display:
                            "grid",

                          gridTemplateColumns:
                            "37px 5px minmax(0,1fr) 31px 62px",

                          gap: "9px",

                          alignItems:
                            "center",

                          padding:
                            "8px 12px",

                          border: 0,

                          borderBottom:
                            "1px solid rgba(255,255,255,.045)",

                          background:
                            selected
                              ? "rgba(255,255,255,.055)"
                              : result.isMe
                              ? "rgba(210,38,61,.045)"
                              : "transparent",

                          color:
                            "#fff",

                          cursor:
                            "pointer",

                          textAlign:
                            "left",
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              "17px",

                            fontWeight:
                              1000,

                            textAlign:
                              "center",
                          }}
                        >
                          {index +
                            1}
                        </div>

                        <div
                          style={{
                            width:
                              "5px",

                            height:
                              "31px",

                            borderRadius:
                              "5px",

                            background:
                              getTeamColor(
                                result
                              ),
                          }}
                        />

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",

                              alignItems:
                                "center",

                              gap:
                                "6px",

                              minWidth:
                                0,
                            }}
                          >
                            <strong
                              style={{
                                overflow:
                                  "hidden",

                                textOverflow:
                                  "ellipsis",

                                whiteSpace:
                                  "nowrap",

                                fontSize:
                                  "11px",
                              }}
                            >
                              {getSurname(
                                result
                              )}
                            </strong>

                            {result.isMe && (
                              <span
                                style={{
                                  color:
                                    "#ff7183",

                                  fontSize:
                                    "7px",

                                  fontWeight:
                                    1000,
                                }}
                              >
                                SEN
                              </span>
                            )}

                            {result.is_bot && (
                              <span
                                style={{
                                  padding:
                                    "2px 4px",

                                  borderRadius:
                                    "4px",

                                  background:
                                    "rgba(255,255,255,.06)",

                                  color:
                                    "#6f7881",

                                  fontSize:
                                    "6px",

                                  fontWeight:
                                    900,
                                }}
                              >
                                AI
                              </span>
                            )}
                          </div>

                          <div
                            style={{
                              marginTop:
                                "3px",

                              color:
                                "#5f6871",

                              fontSize:
                                "7.5px",

                              whiteSpace:
                                "nowrap",

                              overflow:
                                "hidden",

                              textOverflow:
                                "ellipsis",
                            }}
                          >
                            {
                              result.team_name
                            }
                          </div>

                          {movementActive && (
                            <div
                              style={{
                                marginTop:
                                  "3px",

                                color:
                                  movement.delta >
                                  0
                                    ? "#5ce68f"
                                    : "#ff6676",

                                fontSize:
                                  "8px",

                                fontWeight:
                                  1000,
                              }}
                            >
                              {movement.delta >
                              0
                                ? `▲ +${movement.delta}`
                                : `▼ ${movement.delta}`}
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            width:
                              "25px",

                            height:
                              "25px",

                            display:
                              "flex",

                            alignItems:
                              "center",

                            justifyContent:
                              "center",

                            borderRadius:
                              "50%",

                            border:
                              `2px solid ${tireColor(
                                tire
                              )}`,

                            color:
                              tireColor(
                                tire
                              ),

                            fontSize:
                              "8px",

                            fontWeight:
                              1000,
                          }}
                        >
                          {tireLetter(
                            tire
                          )}
                        </div>

                        <div
                          style={{
                            textAlign:
                              "right",

                            color:
                              dnf
                                ? "#ff596a"
                                : pit
                                ? "#ffd84d"
                                : index ===
                                  0
                                ? "#fff"
                                : "#89919a",

                            fontSize:
                              "8px",

                            fontWeight:
                              900,
                          }}
                        >
                          {dnf
                            ? "DNF"
                            : pit
                            ? "PIT"
                            : getGap(
                                result,
                                index
                              )}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </aside>
          </div>

          {/* FINISH */}

          {finished && (
            <section
              style={{
                ...panel,

                marginTop:
                  "16px",

                padding:
                  "25px",

                display:
                  "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "center",

                gap: "20px",

                flexWrap:
                  "wrap",

                background:
                  "linear-gradient(120deg, rgba(210,38,61,.10), rgba(255,255,255,.02))",
              }}
            >
              <div>
                <div
                  style={
                    redLabel
                  }
                >
                  CHEQUERED FLAG
                </div>

                <h2
                  style={{
                    margin:
                      "5px 0 0",

                    fontSize:
                      "28px",
                  }}
                >
                  Yarış Tamamlandı
                </h2>

                <div
                  style={{
                    marginTop:
                      "5px",

                    color:
                      "#737c86",

                    fontSize:
                      "10px",
                  }}
                >
                  Resmî sonuçlar
                  hazır.
                </div>
              </div>

              <Link
                href={`/arcade/manager/lobbies/${lobbyId}/game/results?round=${round}`}

                style={{
                  minWidth:
                    "210px",

                  minHeight:
                    "48px",

                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  borderRadius:
                    "10px",

                  background:
                    "#d2263d",

                  color: "#fff",

                  textDecoration:
                    "none",

                  fontWeight:
                    900,

                  fontSize:
                    "10px",
                }}
              >
                SONUÇLARI GÖR →
              </Link>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

function RainOverlay() {
  const drops =
    Array.from({
      length: 50,
    });

  return (
    <div
      style={{
        position:
          "absolute",

        inset: 0,

        overflow:
          "hidden",

        pointerEvents:
          "none",

        zIndex: 3,

        background:
          "linear-gradient(rgba(40,72,98,.10), rgba(14,25,35,.15))",
      }}
    >
      {drops.map(
        (_, index) => {
          const left =
            (index * 37) %
            105;

          const delay =
            -(
              (index * 83) %
              1200
            );

          const duration =
            650 +
            ((index * 41) %
              450);

          return (
            <div
              key={
                index
              }

              style={{
                position:
                  "absolute",

                left:
                  `${left}%`,

                top:
                  "-80px",

                width:
                  "1px",

                height:
                  `${20 + (index % 4) * 8}px`,

                background:
                  "linear-gradient(transparent, rgba(151,207,244,.75))",

                transform:
                  "rotate(13deg)",

                animation:
                  `rainFall ${duration}ms linear ${delay}ms infinite`,
              }}
            />
          );
        }
      )}
    </div>
  );
}

function StatusBadge({
  text,
  color = "#d2263d",
  active = false,
}: {
  text: string;
  color?: string;
  active?: boolean;
}) {
  return (
    <div
      style={{
        minHeight:
          "34px",

        display:
          "flex",

        alignItems:
          "center",

        padding:
          "0 11px",

        border:
          `1px solid ${color}45`,

        borderRadius:
          "8px",

        background:
          `${color}12`,

        color,

        fontSize:
          "8px",

        fontWeight:
          1000,

        letterSpacing:
          ".7px",

        boxShadow:
          active
            ? `0 0 25px ${color}16`
            : "none",
      }}
    >
      {text}
    </div>
  );
}

function MiniStat({
  label,
  value,
  valueColor = "#fff",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div>
      <div
        style={{
          color:
            "#626b74",

          fontSize:
            "7px",

          fontWeight:
            900,

          letterSpacing:
            ".8px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            "5px",

          color:
            valueColor,

          fontSize:
            "17px",

          fontWeight:
            1000,
        }}
      >
        {value}
      </div>
    </div>
  );
}

const panel: CSSProperties =
  {
    border:
      "1px solid rgba(255,255,255,.075)",

    borderRadius:
      "16px",

    background:
      "rgba(255,255,255,.018)",

    overflow:
      "hidden",
  };

const sectionHeader:
  CSSProperties = {
    padding:
      "16px 18px",

    borderBottom:
      "1px solid rgba(255,255,255,.055)",
  };

const redLabel: CSSProperties =
  {
    color:
      "#d2263d",

    fontSize:
      "8px",

    fontWeight:
      1000,

    letterSpacing:
      "1.3px",
  };

const controlButton:
  CSSProperties = {
    minHeight:
      "34px",

    padding:
      "0 10px",

    border:
      "1px solid rgba(255,255,255,.09)",

    borderRadius:
      "8px",

    background:
      "rgba(255,255,255,.025)",

    color: "#fff",

    cursor:
      "pointer",

    fontSize:
      "8px",

    fontWeight:
      900,
  };

const trackHud:
  CSSProperties = {
    minWidth:
      "74px",

    padding:
      "8px 10px",

    display:
      "flex",

    flexDirection:
      "column",

    gap: "3px",

    border:
      "1px solid rgba(255,255,255,.09)",

    borderRadius:
      "8px",

    background:
      "rgba(0,0,0,.65)",

    backdropFilter:
      "blur(6px)",

    color:
      "#717a84",

    fontSize:
      "7px",
  };

const loadingStyle:
  CSSProperties = {
    minHeight:
      "100vh",

    background:
      "#050505",

    color: "#fff",

    padding:
      "100px 24px",
  };