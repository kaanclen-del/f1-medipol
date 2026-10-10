"use client";

import {
  useEffect,
  useMemo,
  useRef,
} from "react";

type TrackPoint = {
  x: number;
  y: number;
  z: number;
};

type TrackData = {
  points: TrackPoint[];

  sourceDriver: number;
  sourceLap: number;
};

type Driver = {
  driverNumber: number;

  acronym: string;

  teamColour:
    | string
    | null;
};

type FrameDriver = {
  driverNumber: number;

  position:
    | number
    | null;

  trackProgress:
    | number
    | null;
};

type Props = {
  track:
    | TrackData
    | null;

  drivers:
    Driver[];

  frameDrivers:
    FrameDriver[];

  sessionName?: string;

  animationMs?: number;
};

type ScreenPoint = {
  x: number;
  y: number;
};

type PreparedTrack = {
  points: ScreenPoint[];

  path: string;

  cumulative: number[];

  totalLength: number;
};

type AnimatedDriver = {
  driverNumber: number;

  acronym: string;

  colour: string;

  position:
    | number
    | null;

  progress: number;
};

/* =========================================================
   HELPERS
   ========================================================= */

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}

function modulo1(
  value: number
) {
  const result =
    value % 1;

  return result < 0
    ? result + 1
    : result;
}

function normalizeColour(
  value:
    | string
    | null
) {
  if (!value) {
    return "#c5ccd3";
  }

  return value.startsWith(
    "#"
  )
    ? value
    : `#${value}`;
}

function distance(
  a: ScreenPoint,
  b: ScreenPoint
) {
  const dx =
    b.x - a.x;

  const dy =
    b.y - a.y;

  return Math.sqrt(
    dx * dx +
      dy * dy
  );
}

/* =========================================================
   TRACK PREPARATION
   ========================================================= */

function prepareTrack(
  rawPoints:
    TrackPoint[]
): PreparedTrack | null {
  if (
    rawPoints.length <
    5
  ) {
    return null;
  }

  const clean:
    TrackPoint[] =
    [];

  for (
    const point of
      rawPoints
  ) {
    const previous =
      clean[
        clean.length - 1
      ];

    if (
      previous &&
      previous.x ===
        point.x &&
      previous.y ===
        point.y
    ) {
      continue;
    }

    clean.push(
      point
    );
  }

  if (
    clean.length <
    5
  ) {
    return null;
  }

  const averageX =
    clean.reduce(
      (
        sum,
        point
      ) =>
        sum +
        point.x,
      0
    ) /
    clean.length;

  const averageY =
    clean.reduce(
      (
        sum,
        point
      ) =>
        sum +
        point.y,
      0
    ) /
    clean.length;

  const minZ =
    Math.min(
      ...clean.map(
        (
          point
        ) =>
          point.z
      )
    );

  const maxZ =
    Math.max(
      ...clean.map(
        (
          point
        ) =>
          point.z
      )
    );

  const zRange =
    Math.max(
      1,
      maxZ -
        minZ
    );

  let centered =
    clean.map(
      (
        point
      ) => {
        const z =
          (
            point.z -
            minZ
          ) /
          zRange;

        return {
          x:
            point.x -
            averageX,

          y:
            point.y -
            averageY -
            (
              z -
              0.5
            ) *
              105,
        };
      }
    );

  const rawMinX =
    Math.min(
      ...centered.map(
        (
          point
        ) =>
          point.x
      )
    );

  const rawMaxX =
    Math.max(
      ...centered.map(
        (
          point
        ) =>
          point.x
      )
    );

  const rawMinY =
    Math.min(
      ...centered.map(
        (
          point
        ) =>
          point.y
      )
    );

  const rawMaxY =
    Math.max(
      ...centered.map(
        (
          point
        ) =>
          point.y
      )
    );

  /*
    Pisti dikey panele daha iyi
    oturtmak iÃƒÂ§in gerekirse dÃƒÂ¶ndÃƒÂ¼r.
  */

  if (
    rawMaxX -
      rawMinX >
    rawMaxY -
      rawMinY
  ) {
    centered =
      centered.map(
        (
          point
        ) => ({
          x:
            -point.y,

          y:
            point.x,
        })
      );
  }

  const minX =
    Math.min(
      ...centered.map(
        (
          point
        ) =>
          point.x
      )
    );

  const maxX =
    Math.max(
      ...centered.map(
        (
          point
        ) =>
          point.x
      )
    );

  const minY =
    Math.min(
      ...centered.map(
        (
          point
        ) =>
          point.y
      )
    );

  const maxY =
    Math.max(
      ...centered.map(
        (
          point
        ) =>
          point.y
      )
    );

  const width =
    Math.max(
      1,
      maxX -
        minX
    );

  const height =
    Math.max(
      1,
      maxY -
        minY
    );

  const scale =
    Math.min(
      292 /
        width,

      455 /
        height
    );

  const points =
    centered.map(
      (
        point
      ): ScreenPoint => ({
        x:
          200 +
          (
            point.x -
            (
              minX +
              maxX
            ) /
              2
          ) *
            scale,

        y:
          300 +
          (
            point.y -
            (
              minY +
              maxY
            ) /
              2
          ) *
            scale,
      })
    );

  const path =
    points
      .map(
        (
          point,
          index
        ) =>
          `${
            index ===
            0
              ? "M"
              : "L"
          } ${point.x.toFixed(
            2
          )} ${point.y.toFixed(
            2
          )}`
      )
      .join(" ") +
    " Z";

  const cumulative:
    number[] =
    [0];

  let totalLength =
    0;

  for (
    let index =
      1;
    index <
    points.length;
    index += 1
  ) {
    totalLength +=
      distance(
        points[
          index -
          1
        ],
        points[
          index
        ]
      );

    cumulative.push(
      totalLength
    );
  }

  if (
    points.length >
    1
  ) {
    totalLength +=
      distance(
        points[
          points.length -
          1
        ],
        points[
          0
        ]
      );
  }

  return {
    points,
    path,
    cumulative,
    totalLength,
  };
}

/* =========================================================
   PROGRESS Ã¢â€ â€™ SVG POSITION
   ========================================================= */

function positionAtProgress(
  track:
    PreparedTrack,

  inputProgress:
    number
): ScreenPoint {
  const progress =
    modulo1(
      inputProgress
    );

  const targetDistance =
    progress *
    track.totalLength;

  for (
    let index =
      1;
    index <
    track.cumulative
      .length;
    index += 1
  ) {
    const endDistance =
      track.cumulative[
        index
      ];

    if (
      targetDistance <=
      endDistance
    ) {
      const startDistance =
        track.cumulative[
          index -
          1
        ];

      const segmentLength =
        Math.max(
          0.0001,

          endDistance -
            startDistance
        );

      const local =
        (
          targetDistance -
          startDistance
        ) /
        segmentLength;

      const start =
        track.points[
          index -
          1
        ];

      const end =
        track.points[
          index
        ];

      return {
        x:
          start.x +
          (
            end.x -
            start.x
          ) *
            local,

        y:
          start.y +
          (
            end.y -
            start.y
          ) *
            local,
      };
    }
  }

  const last =
    track.points[
      track.points.length -
      1
    ];

  const first =
    track.points[
      0
    ];

  const previousDistance =
    track.cumulative[
      track.cumulative
        .length -
        1
    ];

  const closingLength =
    Math.max(
      0.0001,

      track.totalLength -
        previousDistance
    );

  const local =
    clamp(
      (
        targetDistance -
        previousDistance
      ) /
        closingLength,

      0,
      1
    );

  return {
    x:
      last.x +
      (
        first.x -
        last.x
      ) *
        local,

    y:
      last.y +
      (
        first.y -
        last.y
      ) *
        local,
  };
}

/* =========================================================
   UNWRAPPED PROGRESS

   Kritik dÃƒÂ¼zeltme burada.

   Ãƒâ€“rnek:

   start = 1.06
   yeni API progress = 0.12

   Eski kod:
   1.06 Ã¢â€ â€™ 0.12
   neredeyse bir tur geriye uÃƒÂ§uyordu.

   Yeni kod:
   1.06 Ã¢â€ â€™ 1.12

   BÃƒÂ¶ylece finish ÃƒÂ§izgisi geÃƒÂ§iÃ…Å¸leri
   sÃƒÂ¼rekli kalÃ„Â±yor.
   ========================================================= */

function resolveTargetProgress(
  current:
    number,

  rawTarget:
    number
) {
  const normalizedCurrent =
    modulo1(
      current
    );

  const lapBase =
    Math.floor(
      current
    );

  /*
    Yeni hedefi mevcut tur numarasÃ„Â±
    ÃƒÂ¼zerine yerleÃ…Å¸tir.
  */

  let target =
    lapBase +
    modulo1(
      rawTarget
    );

  /*
    Finish ÃƒÂ§izgisi ileri geÃƒÂ§iÃ…Å¸i.

    0.94 Ã¢â€ â€™ 0.06
    aslÃ„Â±nda:
    0.94 Ã¢â€ â€™ 1.06
  */

  if (
    modulo1(
      rawTarget
    ) <
    normalizedCurrent -
      0.5
  ) {
    target +=
      1;
  }

  /*
    Timeline geriye alÃ„Â±nÃ„Â±rsa veya
    veri geriye sÃ„Â±ÃƒÂ§rarsa en yakÃ„Â±n
    ÃƒÂ¶nceki turu seÃƒÂ§.
  */

  if (
    modulo1(
      rawTarget
    ) >
    normalizedCurrent +
      0.5
  ) {
    target -=
      1;
  }

  return target;
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function F1TrackMap({
  track,

  drivers,

  frameDrivers,

  sessionName,

  animationMs =
    680,
}: Props) {
  const prepared =
    useMemo(
      () =>
        track
          ? prepareTrack(
              track.points
            )
          : null,

      [track]
    );

  const driverMap =
    useMemo(
      () => {
        const map =
          new Map<
            number,
            Driver
          >();

        for (
          const driver of
            drivers
        ) {
          map.set(
            driver.driverNumber,
            driver
          );
        }

        return map;
      },

      [drivers]
    );

  const markerRefs =
    useRef<
      Map<
        number,
        SVGGElement
      >
    >(
      new Map()
    );

  /*
    Buradaki deÃ„Å¸er artÃ„Â±k sadece
    0 Ã¢â€ â€™ 1 deÃ„Å¸il.

    Tur geÃƒÂ§tikÃƒÂ§e:
    0.95
    1.05
    1.70
    2.03
    gibi devam eder.
  */

  const currentProgressRef =
    useRef<
      Map<
        number,
        number
      >
    >(
      new Map()
    );

  const animationRef =
    useRef<
      number | null
    >(
      null
    );

  const targetDrivers =
    useMemo(
      () => {
        if (
          !prepared
        ) {
          return [];
        }

        return frameDrivers
          .filter(
            (
              driver
            ) =>
              driver.trackProgress !==
                null &&
              driver.trackProgress !==
                undefined
          )
          .map(
            (
              frameDriver
            ): AnimatedDriver => {
              const driver =
                driverMap.get(
                  frameDriver.driverNumber
                );

              return {
                driverNumber:
                  frameDriver.driverNumber,

                acronym:
                  driver?.acronym ||
                  String(
                    frameDriver.driverNumber
                  ),

                colour:
                  normalizeColour(
                    driver?.teamColour ??
                      null
                  ),

                position:
                  frameDriver.position,

                progress:
                  frameDriver.trackProgress ??
                  0,
              };
            }
          )
          .sort(
            (
              a,
              b
            ) =>
              (
                b.position ??
                999
              ) -
              (
                a.position ??
                999
              )
          );
      },

      [
        prepared,
        frameDrivers,
        driverMap,
      ]
    );

  /* =======================================================
     60 FPS ANIMATION
     ======================================================= */

  useEffect(
    () => {
      if (
        !prepared ||
        targetDrivers.length ===
          0
      ) {
        return;
      }

      if (
        animationRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationRef.current
        );

        animationRef.current =
          null;
      }

      const startTime =
        performance.now();

      const transitions =
        targetDrivers.map(
          (
            driver
          ) => {
            const rawTarget =
              driver.progress;

            const saved =
              currentProgressRef.current.get(
                driver.driverNumber
              );

            /*
              Ã„Â°lk kez ekrana gelen pilot.
            */

            if (
              saved ===
              undefined
            ) {
              currentProgressRef.current.set(
                driver.driverNumber,

                rawTarget
              );

              return {
                driverNumber:
                  driver.driverNumber,

                start:
                  rawTarget,

                target:
                  rawTarget,

                instant:
                  true,
              };
            }

            let target =
              resolveTargetProgress(
                saved,
                rawTarget
              );

            const delta =
              target -
              saved;

            /*
              Normal replay frame'lerinde
              aracÃ„Â±n bir gÃƒÂ¼ncellemede
              yarÃ„Â±m pist atlamasÃ„Â± beklenmez.

              BÃƒÂ¶yle bir fark varsa:
              - timeline kullanÃ„Â±cÃ„Â± tarafÃ„Â±ndan sÃƒÂ¼rÃƒÂ¼lmÃƒÂ¼Ã…Å¸ olabilir
              - OpenF1 datasÃ„Â±nda boÃ…Å¸luk olabilir
              - pit / timing verisinde kopma olabilir

              BÃƒÂ¶yle durumlarda aracÃ„Â±n pist boyunca
              roket gibi gitmesini gÃƒÂ¶stermiyoruz.
            */

            const abnormalJump =
              Math.abs(
                delta
              ) >
              0.42;

            if (
              abnormalJump
            ) {
              /*
                En yakÃ„Â±n fiziksel pist konumuna
                sessiz resync.

                Hareket animasyonu yapmÃ„Â±yoruz.
              */

              currentProgressRef.current.set(
                driver.driverNumber,

                target
              );

              const point =
                positionAtProgress(
                  prepared,

                  target
                );

              const element =
                markerRefs.current.get(
                  driver.driverNumber
                );

              if (
                element
              ) {
                element.style.opacity =
                  "0.35";

                element.setAttribute(
                  "transform",

                  `translate(${point.x.toFixed(
                    2
                  )} ${point.y.toFixed(
                    2
                  )})`
                );

                requestAnimationFrame(
                  () => {
                    element.style.opacity =
                      "1";
                  }
                );
              }

              return {
                driverNumber:
                  driver.driverNumber,

                start:
                  target,

                target,

                instant:
                  true,
              };
            }

            return {
              driverNumber:
                driver.driverNumber,

              start:
                saved,

              target,

              instant:
                false,
            };
          }
        );

      const duration = Math.max(120, animationMs * 1.08);

      /*
        Smoothstep.

        Linear yerine ÃƒÂ§ok hafif
        giriÃ…Å¸/ÃƒÂ§Ã„Â±kÃ„Â±Ã…Å¸ yumuÃ…Å¸atma.

        AÃ…Å¸Ã„Â±rÃ„Â± ease yok;
        araÃƒÂ§ hala doÃ„Å¸al ilerliyor.
      */

      function smoothStep(
        value:
          number
      ) {
        return (
          value *
          value *
          (
            3 -
            2 *
              value
          )
        );
      }

      function animate(
        now:
          number
      ) {
        const elapsed =
          now -
          startTime;

        const rawT =
          clamp(
            elapsed /
              duration,

            0,
            1
          );

        const t = rawT;

        let hasAnimatedDriver =
          false;

        for (
          const transition of
            transitions
        ) {
          if (
            transition.instant
          ) {
            continue;
          }

          hasAnimatedDriver =
            true;

          const progress =
            transition.start +
            (
              transition.target -
              transition.start
            ) *
              t;

          currentProgressRef.current.set(
            transition.driverNumber,

            progress
          );

          const point =
            positionAtProgress(prepared!, progress);

          const element =
            markerRefs.current.get(
              transition.driverNumber
            );

          if (
            element
          ) {
            element.setAttribute(
              "transform",

              `translate(${point.x.toFixed(
                2
              )} ${point.y.toFixed(
                2
              )})`
            );
          }
        }

        if (
          rawT <
            1 &&
          hasAnimatedDriver
        ) {
          animationRef.current =
            requestAnimationFrame(
              animate
            );

          return;
        }

        /*
          Animasyon sonunda hedefe
          tam oturt.
        */

        for (
          const transition of
            transitions
        ) {
          currentProgressRef.current.set(
            transition.driverNumber,

            transition.target
          );

          if (
            transition.instant
          ) {
            continue;
          }

          const point =
            positionAtProgress(prepared!, transition.target);

          const element =
            markerRefs.current.get(
              transition.driverNumber
            );

          if (
            element
          ) {
            element.setAttribute(
              "transform",

              `translate(${point.x.toFixed(
                2
              )} ${point.y.toFixed(
                2
              )})`
            );
          }
        }

        animationRef.current =
          null;
      }

      animationRef.current =
        requestAnimationFrame(
          animate
        );

      return () => {
        if (
          animationRef.current !==
          null
        ) {
          cancelAnimationFrame(
            animationRef.current
          );

          animationRef.current =
            null;
        }
      };
    },

    [
      prepared,
      targetDrivers,
      animationMs,
    ]
  );

  /* =======================================================
     TRACK CHANGE RESET

     BaÃ…Å¸ka piste / seansa geÃƒÂ§erse
     eski unwrapped progress bilgileri
     tutulmasÃ„Â±n.
     ======================================================= */

  useEffect(
    () => {
      currentProgressRef.current.clear();

      markerRefs.current.clear();
    },

    [track]
  );

  /* =======================================================
     CLEANUP
     ======================================================= */

  useEffect(
    () => {
      return () => {
        if (
          animationRef.current !==
          null
        ) {
          cancelAnimationFrame(
            animationRef.current
          );
        }
      };
    },

    []
  );

  /* =======================================================
     EMPTY
     ======================================================= */

  if (
    !track ||
    !prepared
  ) {
    return (
      <section className="track-panel">
        <style>
          {styles}
        </style>

        <div className="track-header">
          <div>
            <span>
              TRACK MAP
            </span>

            <h3>
              Circuit Tracking
            </h3>
          </div>

          <div className="track-status waiting">
            WAITING
          </div>
        </div>

        <div className="track-empty">
          <div className="track-empty-icon">
            Ã¢â€”â€¡
          </div>

          <strong>
            Pist verisi hazÃ„Â±rlanÃ„Â±yor
          </strong>

          <p>
            Bu seans iÃƒÂ§in OpenF1 konum
            verisi henÃƒÂ¼z eriÃ…Å¸ilebilir deÃ„Å¸il.
          </p>
        </div>
      </section>
    );
  }

  /* =======================================================
     UI
     ======================================================= */

  return (
    <section className="track-panel">
      <style>
        {styles}
      </style>

      <div className="track-header">
        <div>
          <span>
            3D TRACK MAP
          </span>

          <h3>
            {sessionName ||
              "Circuit Map"}
          </h3>
        </div>

        <div className="track-status">
          <i />

          SMOOTH TRACKING
        </div>
      </div>

      <div className="track-stage">
        <div className="track-grid" />

        <svg
          className="track-svg"
          viewBox="0 0 400 600"
          role="img"
          aria-label="Formula 1 pist haritasÃ„Â±"
        >
          <defs>
            <filter
              id="trackGlowStable"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feGaussianBlur
                stdDeviation="4"
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

            <filter
              id="driverGlowStable"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur
                stdDeviation="2.8"
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

            <linearGradient
              id="trackLineStable"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#eff2f4"
              />

              <stop
                offset="45%"
                stopColor="#89939e"
              />

              <stop
                offset="100%"
                stopColor="#f0f2f4"
              />
            </linearGradient>
          </defs>

          {/* ALT DERÃ„Â°NLÃ„Â°K */}

          <path
            d={
              prepared.path
            }
            transform="translate(0 9)"
            fill="none"
            stroke="rgba(0,0,0,.78)"
            strokeWidth="17"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d={
              prepared.path
            }
            transform="translate(0 4)"
            fill="none"
            stroke="rgba(66,75,85,.6)"
            strokeWidth="15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* PÃ„Â°ST */}

          <path
            d={
              prepared.path
            }
            fill="none"
            stroke="rgba(255,255,255,.09)"
            strokeWidth="19"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d={
              prepared.path
            }
            fill="none"
            stroke="url(#trackLineStable)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#trackGlowStable)"
          />

          <path
            d={
              prepared.path
            }
            fill="none"
            stroke="rgba(10,13,18,.94)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* START / FINISH */}

          {prepared.points[
            0
          ] && (
            <g
              transform={`translate(${
                prepared.points[
                  0
                ].x
              } ${
                prepared.points[
                  0
                ].y
              })`}
            >
              <circle
                r="8"
                fill="#fff"
                stroke="#0b0e12"
                strokeWidth="3"
              />

              <circle
                r="3"
                fill="#0b0e12"
              />
            </g>
          )}

          {/* DRIVERS */}

          {targetDrivers.map(
            (
              driver
            ) => {
              const existing =
                currentProgressRef.current.get(
                  driver.driverNumber
                );

              const initialProgress =
                existing ??
                driver.progress;

              const initial =
                positionAtProgress(
                  prepared,

                  initialProgress
                );

              const leader =
                driver.position ===
                1;

              return (
                <g
                  key={
                    driver.driverNumber
                  }
                  ref={(
                    element
                  ) => {
                    if (
                      element
                    ) {
                      markerRefs.current.set(
                        driver.driverNumber,

                        element
                      );
                    } else {
                      markerRefs.current.delete(
                        driver.driverNumber
                      );
                    }
                  }}
                  transform={`translate(${initial.x} ${initial.y})`}
                  className="driver-marker"
                >
                  {leader && (
                    <circle
                      r="18"
                      fill="none"
                      stroke={
                        driver.colour
                      }
                      strokeWidth="1.4"
                      opacity=".5"
                      className="leader-pulse"
                    />
                  )}

                  <circle
                    r={
                      leader
                        ? 8
                        : 6
                    }
                    fill={
                      driver.colour
                    }
                    stroke="#ffffff"
                    strokeWidth={
                      leader
                        ? 2.4
                        : 1.5
                    }
                    filter="url(#driverGlowStable)"
                  />

                  <g
                    transform="translate(11 -12)"
                  >
                    <rect
                      x="-3"
                      y="-12"
                      width="42"
                      height="21"
                      rx="6"
                      fill="rgba(7,10,14,.94)"
                      stroke={
                        driver.colour
                      }
                      strokeWidth="1"
                    />

                    <text
                      x="18"
                      y="2"
                      textAnchor="middle"
                      fill="#fff"
                      fontSize="10"
                      fontWeight="900"
                    >
                      {
                        driver.acronym
                      }
                    </text>
                  </g>
                </g>
              );
            }
          )}
        </svg>

        <div className="track-scale">
          <span>
            TRACK POSITION
          </span>

          <div />

          <small>
            INTERPOLATED TELEMETRY
          </small>
        </div>
      </div>

      <div className="track-footer">
        <div>
          <span>
            SOURCE LAP
          </span>

          <strong>
            LAP{" "}
            {
              track.sourceLap
            }
          </strong>
        </div>

        <div>
          <span>
            ACTIVE CARS
          </span>

          <strong>
            {
              targetDrivers.length
            }
          </strong>
        </div>

        <div>
          <span>
            TRACKING
          </span>

          <strong>
            STABLE 60 FPS
          </strong>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   CSS
   ========================================================= */

const styles = `
  .track-panel {
    --track-panel:#10151c;
    --track-panel2:#161d26;
    --track-border:rgba(255,255,255,.085);
    --track-text:#f6f7f9;
    --track-muted:#7c8794;

    position:relative;
    overflow:hidden;

    border:1px solid var(--track-border);
    border-radius:16px;

    color:var(--track-text);

    background:
      radial-gradient(
        circle at 50% 38%,
        rgba(255,255,255,.035),
        transparent 38%
      ),
      linear-gradient(
        150deg,
        var(--track-panel),
        var(--track-panel2)
      );
  }

  :root[data-site-theme="red"]
  .track-panel {
    --track-panel:#251013;
    --track-panel2:#180b0d;
    --track-border:rgba(255,255,255,.13);
  }

  :root[data-site-theme="light"]
  .track-panel {
    --track-panel:#fff;
    --track-panel2:#eef1f5;
    --track-border:rgba(20,25,32,.13);
    --track-text:#161b21;
    --track-muted:#68737f;
  }

  .track-panel * {
    box-sizing:border-box;
  }

  .track-header {
    min-height:74px;

    padding:16px 18px;

    display:flex;
    align-items:center;
    justify-content:space-between;

    gap:15px;

    border-bottom:
      1px solid
      var(--track-border);
  }

  .track-header span {
    display:block;

    color:#ff5048;

    font-size:8px;
    font-weight:1000;

    letter-spacing:.13em;
  }

  .track-header h3 {
    margin:5px 0 0;

    font-size:18px;

    letter-spacing:-.02em;
  }

  .track-status {
    min-height:30px;

    padding:0 9px;

    display:flex;
    align-items:center;

    gap:6px;

    border:
      1px solid
      rgba(69,220,132,.18);

    border-radius:999px;

    color:#56df93;

    background:
      rgba(69,220,132,.05);

    font-size:7px;

    font-weight:1000;
  }

  .track-status.waiting {
    color:#88929e;
  }

  .track-status i {
    width:6px;
    height:6px;

    border-radius:50%;

    background:
      currentColor;

    box-shadow:
      0 0 10px
      currentColor;
  }

  .track-stage {
    position:relative;

    min-height:590px;

    overflow:hidden;

    background:
      radial-gradient(
        ellipse at center,
        rgba(255,255,255,.025),
        transparent 60%
      );
  }

  .track-grid {
    position:absolute;
    inset:0;

    pointer-events:none;

    opacity:.32;

    background:
      linear-gradient(
        rgba(255,255,255,.025)
        1px,
        transparent
        1px
      ),
      linear-gradient(
        90deg,
        rgba(255,255,255,.02)
        1px,
        transparent
        1px
      );

    background-size:
      32px 32px;
  }

  .track-svg {
    position:relative;
    z-index:2;

    display:block;

    width:100%;
    height:auto;

    min-height:590px;

    max-height:660px;
  }

  .driver-marker {
    will-change:
      transform,
      opacity;

    transition:
      opacity .16s ease;
  }

  .leader-pulse {
    transform-origin:center;

    animation:
      trackLeaderPulse
      1.4s
      ease-out
      infinite;
  }

  @keyframes trackLeaderPulse {
    0% {
      opacity:.55;

      transform:
        scale(.65);
    }

    100% {
      opacity:0;

      transform:
        scale(1.65);
    }
  }

  .track-scale {
    position:absolute;

    z-index:3;

    right:13px;
    bottom:17px;

    display:flex;

    flex-direction:column;

    align-items:flex-end;

    gap:5px;

    pointer-events:none;
  }

  .track-scale span {
    color:
      var(--track-muted);

    font-size:6px;

    font-weight:1000;

    letter-spacing:.1em;
  }

  .track-scale div {
    width:57px;
    height:1px;

    background:
      linear-gradient(
        to right,
        transparent,
        rgba(255,255,255,.35)
      );
  }

  .track-scale small {
    color:
      var(--track-muted);

    font-size:6px;
  }

  .track-footer {
    display:grid;

    grid-template-columns:
      repeat(3,1fr);

    border-top:
      1px solid
      var(--track-border);
  }

  .track-footer > div {
    min-width:0;

    padding:12px 13px;

    border-right:
      1px solid
      var(--track-border);
  }

  .track-footer > div:last-child {
    border-right:0;
  }

  .track-footer span {
    display:block;

    margin-bottom:4px;

    color:
      var(--track-muted);

    font-size:6px;

    font-weight:1000;

    letter-spacing:.08em;
  }

  .track-footer strong {
    display:block;

    overflow:hidden;

    text-overflow:ellipsis;

    white-space:nowrap;

    font-size:9px;
  }

  .track-empty {
    min-height:500px;

    padding:30px;

    display:flex;

    flex-direction:column;

    justify-content:center;

    align-items:center;

    text-align:center;
  }

  .track-empty-icon {
    width:70px;
    height:70px;

    margin-bottom:17px;

    display:grid;

    place-items:center;

    border:
      1px solid
      var(--track-border);

    border-radius:50%;

    color:
      var(--track-muted);

    font-size:30px;

    background:
      rgba(255,255,255,.025);
  }

  .track-empty strong {
    font-size:17px;
  }

  .track-empty p {
    max-width:270px;

    margin:8px 0 0;

    color:
      var(--track-muted);

    font-size:10px;

    line-height:1.7;
  }

  @media(max-width:720px) {
    .track-stage,
    .track-svg {
      min-height:470px;
    }
  }

  @media(
    prefers-reduced-motion:
      reduce
  ) {
    .leader-pulse {
      animation:none;
    }
  }
`;