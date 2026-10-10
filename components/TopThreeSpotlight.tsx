"use client";

import {
  type CSSProperties,
} from "react";

type PositionMovement =
  | "up"
  | "down"
  | null;

export type SpotlightDriver = {
  driverNumber: number;

  position:
    number | null;

  name: string;

  acronym: string;

  team: string;

  colour: string;

  headshot:
    string | null;

  currentLapTime:
    number | null;

  lastLap:
    number | null;

  bestLap:
    number | null;

  gap:
    number | string | null;

  lapNumber:
    number | null;

  tyre:
    string | null;

  tyreAge:
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

  status:
    string | null;

  inactive:
    boolean;
};

type Props = {
  drivers:
    SpotlightDriver[];

  movements?:
    Map<
      number,
      PositionMovement
    >;
};

/* =========================================================
   HELPERS
   ========================================================= */

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

function formatGap(
  value:
    number |
    string |
    null,

  leader:
    boolean
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
    return `+${value.toFixed(
      3
    )}`;
  }

  return String(
    value
  );
}

function tyreLetter(
  tyre:
    string | null
) {
  switch (
    tyre?.toUpperCase()
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
  tyre:
    string | null
) {
  switch (
    tyre?.toUpperCase()
  ) {
    case "SOFT":
      return "spot-soft";

    case "MEDIUM":
      return "spot-medium";

    case "HARD":
      return "spot-hard";

    case "INTERMEDIATE":
      return "spot-inter";

    case "WET":
      return "spot-wet";

    default:
      return "spot-unknown";
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
      return "spot-mini-yellow";

    case 2049:
      return "spot-mini-green";

    case 2051:
      return "spot-mini-purple";

    case 2064:
      return "spot-mini-pit";

    default:
      return "spot-mini-empty";
  }
}

/* =========================================================
   LAP PERFORMANCE
   ========================================================= */

type PerformanceState =
  | "waiting"
  | "best"
  | "on-pace"
  | "off-best"
  | "off-pace";

function getPerformance(
  lastLap:
    number | null,

  bestLap:
    number | null
) {
  if (
    lastLap === null ||
    bestLap === null ||
    !Number.isFinite(
      lastLap
    ) ||
    !Number.isFinite(
      bestLap
    )
  ) {
    return {
      delta:
        null,

      state:
        "waiting" as PerformanceState,

      label:
        "WAITING LAP DATA",

      description:
        "Tur verisi bekleniyor",
    };
  }

  /*
    Best lap, tamamlanan tüm turların
    en hızlısı olduğu için normal durumda
    LAST - BEST hiçbir zaman negatif olmaz.
  */

  const rawDelta =
    lastLap -
    bestLap;

  const delta =
    Math.max(
      0,
      rawDelta
    );

  if (
    delta <=
    0.0005
  ) {
    return {
      delta:
        0,

      state:
        "best" as PerformanceState,

      label:
        "BEST LAP",

      description:
        "Personal best matched",
    };
  }

  if (
    delta <=
    0.25
  ) {
    return {
      delta,

      state:
        "on-pace" as PerformanceState,

      label:
        "ON PACE",

      description:
        `${delta.toFixed(
          3
        )}s off best`,
    };
  }

  if (
    delta <=
    0.75
  ) {
    return {
      delta,

      state:
        "off-best" as PerformanceState,

      label:
        "OFF BEST",

      description:
        `${delta.toFixed(
          3
        )}s off best`,
    };
  }

  return {
    delta,

    state:
      "off-pace" as PerformanceState,

    label:
      "OFF PACE",

    description:
      `${delta.toFixed(
        3
      )}s off best`,
  };
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function TopThreeSpotlight({
  drivers,

  movements =
    new Map(),
}: Props) {
  const topThree =
    drivers
      .filter(
        (
          driver
        ) =>
          driver.position !==
            null &&
          driver.position <=
            3
      )
      .sort(
        (
          a,
          b
        ) =>
          (
            a.position ??
            99
          ) -
          (
            b.position ??
            99
          )
      );

  if (
    topThree.length ===
    0
  ) {
    return null;
  }

  return (
    <section className="spotlight-wrap">
      <style>
        {styles}
      </style>

      {topThree.map(
        (
          driver
        ) => {
          const position =
            driver.position ??
            99;

          const movement =
            movements.get(
              driver.driverNumber
            ) ??
            null;

          return (
            <article
              key={
                driver.driverNumber
              }
              className={[
                "spotlight-driver",

                position ===
                1
                  ? "spotlight-p1"
                  : "",

                position ===
                2
                  ? "spotlight-p2"
                  : "",

                position ===
                3
                  ? "spotlight-p3"
                  : "",

                movement ===
                "up"
                  ? "spotlight-up"
                  : "",

                movement ===
                "down"
                  ? "spotlight-down"
                  : "",

                driver.inactive
                  ? "spotlight-inactive"
                  : "",
              ]
                .filter(
                  Boolean
                )
                .join(
                  " "
                )}
              style={
                {
                  "--driver-colour":
                    driver.colour,
                } as CSSProperties
              }
            >
              <div className="spotlight-glow" />

              <div className="spotlight-noise" />

              {/* POSITION */}

              <div className="spotlight-position">
                <small>
                  POSITION
                </small>

                <strong>
                  P
                  {
                    position
                  }
                </strong>

                {movement ===
                  "up" && (
                  <span className="movement movement-up">
                    ▲
                  </span>
                )}

                {movement ===
                  "down" && (
                  <span className="movement movement-down">
                    ▼
                  </span>
                )}
              </div>

              {/* PORTRAIT */}

              <div className="spotlight-portrait">
                <div className="portrait-ring">
                  {driver.headshot ? (
                    <img
                      src={
                        driver.headshot
                      }
                      alt={
                        driver.name
                      }
                    />
                  ) : (
                    <span>
                      {
                        driver.acronym
                      }
                    </span>
                  )}
                </div>
              </div>

              {/* DRIVER */}

              <div className="spotlight-driver-info">
                <span className="spotlight-team">
                  {
                    driver.team
                  }
                </span>

                <h3>
                  {
                    driver.name
                  }
                </h3>

                <div className="spotlight-acronym-row">
                  <b>
                    {
                      driver.acronym
                    }
                  </b>

                  <span
                    className={
                      position ===
                      1
                        ? "spotlight-leader"
                        : ""
                    }
                  >
                    {driver.status ||
                      formatGap(
                        driver.gap,
                        position ===
                          1
                      )}
                  </span>
                </div>
              </div>

              {/* TIMING */}

              <div className="spotlight-timing">
                <div>
                  <small>
                    CURRENT
                  </small>

                  <strong className="current">
                    {formatLap(
                      driver.currentLapTime
                    )}
                  </strong>
                </div>

                <div>
                  <small>
                    LAST LAP
                  </small>

                  <strong>
                    {formatLap(
                      driver.lastLap
                    )}
                  </strong>
                </div>

                <div>
                  <small>
                    BEST
                  </small>

                  <strong>
                    {formatLap(
                      driver.bestLap
                    )}
                  </strong>
                </div>
              </div>

              {/* MINI SECTORS */}

              <div className="spotlight-sector-area">
                <small className="sector-title">
                  MINI-SECTORS
                </small>

                <SpotlightSector
                  label="S1"
                  values={
                    driver.segmentsSector1
                  }
                />

                <SpotlightSector
                  label="S2"
                  values={
                    driver.segmentsSector2
                  }
                />

                <SpotlightSector
                  label="S3"
                  values={
                    driver.segmentsSector3
                  }
                />
              </div>

              {/* LAP PERFORMANCE */}

              <DriverPerformance
                driver={
                  driver
                }
                position={
                  position
                }
              />

              {/* TYRE */}

              <div className="spotlight-tyre-zone">
                <div
                  className={`spotlight-tyre ${tyreClass(
                    driver.tyre
                  )}`}
                >
                  {tyreLetter(
                    driver.tyre
                  )}
                </div>

                {driver.tyreAge !==
                  null && (
                  <span>
                    {
                      driver.tyreAge
                    }
                    L
                  </span>
                )}
              </div>

              {driver.inactive &&
                driver.status && (
                  <div className="spotlight-status">
                    {
                      driver.status
                    }
                  </div>
                )}
            </article>
          );
        }
      )}
    </section>
  );
}

/* =========================================================
   DRIVER PERFORMANCE
   ========================================================= */

function DriverPerformance({
  driver,
  position,
}: {
  driver:
    SpotlightDriver;

  position:
    number;
}) {
  const performance =
    getPerformance(
      driver.lastLap,
      driver.bestLap
    );

  /*
    0.000s = sol taraf / BEST
    2.000s+ = sağ taraf / OFF PACE

    Marker kenarlara tamamen yapışmasın
    diye %3 - %97 aralığı kullanıyoruz.
  */

  const scaleMax =
    2;

  const rawPercent =
    performance.delta ===
    null
      ? 0
      : Math.min(
          100,
          (
            performance.delta /
            scaleMax
          ) *
            100
        );

  const markerLeft =
    3 +
    rawPercent *
      0.94;

  return (
    <div
      className={[
        "performance-panel",

        position ===
        1
          ? "performance-p1"
          : "",

        `performance-${performance.state}`,
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        )}
    >
      {/* BIG DRIVER NUMBER */}

      <div className="performance-number">
        {
          driver.driverNumber
        }
      </div>

      <div className="performance-content">

        {/* HEADER */}

        <div className="performance-head">
          <div>
            <small>
              LAP PERFORMANCE
            </small>

            <strong>
              LAST vs PERSONAL BEST
            </strong>
          </div>

          <div
            className={`performance-state state-${performance.state}`}
          >
            <i />

            {
              performance.label
            }
          </div>
        </div>

        {/* LAP VALUES */}

        <div className="performance-laps">
          <div>
            <small>
              LAST LAP
            </small>

            <strong>
              {formatLap(
                driver.lastLap
              )}
            </strong>
          </div>

          <div>
            <small>
              PERSONAL BEST
            </small>

            <strong>
              {formatLap(
                driver.bestLap
              )}
            </strong>
          </div>
        </div>

        {/* DELTA */}

        <div className="performance-delta-row">
          <span>
            DELTA
          </span>

          <strong
            className={`performance-delta delta-${performance.state}`}
          >
            {performance.delta ===
            null
              ? "—"
              : performance.state ===
                "best"
              ? "BEST"
              : `+${performance.delta.toFixed(
                  3
                )}`}
          </strong>
        </div>

        {/* SCALE */}

        <div className="pace-scale">
          <div className="pace-scale-labels">
            <span>
              BEST
            </span>

            <span>
              +2.0s
            </span>
          </div>

          <div className="pace-line">
            <div className="pace-zone pace-green" />

            <div className="pace-zone pace-yellow" />

            <div className="pace-zone pace-red" />

            {performance.delta !==
              null && (
              <i
                className={`pace-marker marker-${performance.state}`}
                style={{
                  left: `${markerLeft}%`,
                }}
              />
            )}
          </div>
        </div>

        {/* FOOT */}

        <div className="performance-foot">
          <span
            className={`performance-description description-${performance.state}`}
          >
            {
              performance.description
            }
          </span>

          <div>
            <small>
              LAP
            </small>

            <b>
              {
                driver.lapNumber ??
                "—"
              }
            </b>
          </div>

          <div>
            <small>
              GAP
            </small>

            <b>
              {formatGap(
                driver.gap,
                position ===
                  1
              )}
            </b>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MINI SECTOR
   ========================================================= */

function SpotlightSector({
  label,
  values,
}: {
  label:
    string;

  values:
    number[];
}) {
  const displayValues =
    values.length >
    0
      ? values
      : [
          0,
          0,
          0,
          0,
          0,
          0,
        ];

  return (
    <div className="spot-sector">
      <span>
        {label}
      </span>

      <div className="spot-sector-bars">
        {displayValues.map(
          (
            value,
            index
          ) => (
            <i
              key={
                index
              }
              className={miniSectorClass(
                value
              )}
            />
          )
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CSS
   ========================================================= */

const styles = `
  .spotlight-wrap {
    display:grid;

    gap:5px;

    border-bottom:
      1px solid
      rgba(255,255,255,.08);

    background:
      rgba(0,0,0,.08);
  }

  .spotlight-driver {
    --driver-colour:#777;

    position:relative;

    min-height:108px;

    display:grid;

    grid-template-columns:
      72px
      86px
      minmax(170px,1fr)
      225px
      minmax(245px,1.2fr)
      230px
      65px;

    align-items:center;

    gap:10px;

    padding:
      7px 16px 7px 10px;

    overflow:hidden;

    isolation:isolate;

    border-left:
      4px solid
      var(--driver-colour);

    border-bottom:
      1px solid
      rgba(255,255,255,.075);

    background:
      linear-gradient(
        90deg,
        rgba(255,255,255,.018),
        rgba(255,255,255,.005)
      );
  }

  .spotlight-p1 {
    min-height:140px;

    grid-template-columns:
      78px
      108px
      minmax(180px,1fr)
      230px
      minmax(250px,1.25fr)
      255px
      68px;
  }

  .spotlight-p2,
  .spotlight-p3 {
    min-height:110px;
  }

  /* TEAM GLOW */

  .spotlight-glow {
    position:absolute;

    z-index:-2;

    inset:
      -120px
      auto
      -120px
      -50px;

    width:58%;

    opacity:.27;

    pointer-events:none;

    background:
      radial-gradient(
        ellipse at 35% 50%,
        color-mix(
          in srgb,
          var(--driver-colour)
          75%,
          transparent
        ),
        transparent 64%
      );
  }

  .spotlight-p1
  .spotlight-glow {
    width:70%;

    opacity:.39;
  }

  .spotlight-driver::after {
    content:"";

    position:absolute;

    z-index:-2;

    top:0;
    right:0;

    width:46%;
    height:100%;

    pointer-events:none;

    background:
      linear-gradient(
        90deg,
        transparent,
        color-mix(
          in srgb,
          var(--driver-colour)
          9%,
          transparent
        )
      );
  }

  .spotlight-noise {
    position:absolute;

    z-index:-1;

    inset:0;

    opacity:.028;

    pointer-events:none;

    background:
      repeating-linear-gradient(
        125deg,
        transparent 0 9px,
        #fff 10px,
        transparent 11px
      );
  }

  /* POSITION */

  .spotlight-position {
    position:relative;

    min-height:68px;

    display:flex;

    flex-direction:column;

    justify-content:center;

    align-items:center;

    border-right:
      1px solid
      rgba(255,255,255,.07);
  }

  .spotlight-position small {
    color:#707985;

    font-size:5px;

    font-weight:1000;

    letter-spacing:.12em;
  }

  .spotlight-position strong {
    margin-top:3px;

    font-size:30px;

    line-height:1;

    letter-spacing:-.06em;
  }

  .spotlight-p1
  .spotlight-position strong {
    font-size:40px;
  }

  .movement {
    position:absolute;

    right:5px;
    top:50%;

    font-size:9px;
  }

  .movement-up {
    color:#58e39b;
  }

  .movement-down {
    color:#f25a54;
  }

  /* PORTRAIT */

  .spotlight-portrait {
    align-self:stretch;

    display:flex;

    align-items:flex-end;

    justify-content:center;
  }

  .portrait-ring {
    width:76px;
    height:76px;

    display:grid;

    place-items:center;

    overflow:hidden;

    border:
      2px solid
      color-mix(
        in srgb,
        var(--driver-colour)
        72%,
        #fff
      );

    border-radius:50%;

    background:
      radial-gradient(
        circle,
        color-mix(
          in srgb,
          var(--driver-colour)
          16%,
          #111
        ),
        #090c10
      );

    box-shadow:
      0 0 27px
      color-mix(
        in srgb,
        var(--driver-colour)
        25%,
        transparent
      );
  }

  .spotlight-p1
  .portrait-ring {
    width:100px;
    height:100px;
  }

  .portrait-ring img {
    width:100%;
    height:100%;

    object-fit:cover;

    object-position:center top;

    transform:
      scale(1.08);
  }

  .portrait-ring span {
    font-size:12px;

    font-weight:1000;
  }

  /* DRIVER */

  .spotlight-driver-info {
    min-width:0;
  }

  .spotlight-team {
    color:
      var(--driver-colour);

    font-size:7px;

    font-weight:1000;

    letter-spacing:.06em;
  }

  .spotlight-driver-info h3 {
    margin:
      4px 0 7px;

    overflow:hidden;

    white-space:nowrap;

    text-overflow:ellipsis;

    font-size:17px;

    letter-spacing:-.03em;
  }

  .spotlight-p1
  .spotlight-driver-info h3 {
    font-size:23px;
  }

  .spotlight-acronym-row {
    display:flex;

    align-items:center;

    gap:8px;
  }

  .spotlight-acronym-row b {
    font-size:11px;
  }

  .spotlight-acronym-row span {
    color:#8d98a4;

    font-size:8px;
  }

  .spotlight-acronym-row
  .spotlight-leader {
    color:#ff5b54;

    font-weight:1000;
  }

  /* TIMING */

  .spotlight-timing {
    display:grid;

    grid-template-columns:
      1fr 1fr;

    gap:
      9px 13px;
  }

  .spotlight-timing > div:first-child {
    grid-column:
      span 2;
  }

  .spotlight-timing small {
    display:block;

    margin-bottom:3px;

    color:#68737e;

    font-size:5px;

    font-weight:1000;

    letter-spacing:.09em;
  }

  .spotlight-timing strong {
    font-size:10px;

    font-variant-numeric:
      tabular-nums;
  }

  .spotlight-timing
  .current {
    color:#5ce99b;

    font-size:15px;
  }

  /* MINI SECTOR */

  .spotlight-sector-area {
    min-width:0;
  }

  .sector-title {
    display:block;

    margin-bottom:6px;

    color:#6d7783;

    font-size:5px;

    font-weight:1000;

    letter-spacing:.11em;
  }

  .spot-sector {
    display:grid;

    grid-template-columns:
      18px
      minmax(0,1fr);

    align-items:center;

    gap:5px;

    margin-bottom:5px;
  }

  .spot-sector > span {
    color:#737e89;

    font-size:5px;

    font-weight:1000;
  }

  .spot-sector-bars {
    display:flex;

    gap:2px;

    min-width:0;
  }

  .spot-sector-bars i {
    flex:1;

    min-width:3px;

    max-width:14px;

    height:6px;

    border-radius:1px;
  }

  .spot-mini-empty {
    background:
      rgba(255,255,255,.075);
  }

  .spot-mini-yellow {
    background:#efd32a;
  }

  .spot-mini-green {
    background:#4bdf8a;
  }

  .spot-mini-purple {
    background:#c95aff;
  }

  .spot-mini-pit {
    background:#4d99f1;
  }

  /* =========================================================
     LAP PERFORMANCE
     ========================================================= */

  .performance-panel {
    position:relative;

    min-height:94px;

    overflow:hidden;

    display:flex;

    align-items:center;

    padding:
      9px 11px;

    border:
      1px solid
      color-mix(
        in srgb,
        var(--driver-colour)
        22%,
        rgba(255,255,255,.07)
      );

    border-radius:12px;

    background:
      linear-gradient(
        135deg,
        rgba(0,0,0,.25),
        color-mix(
          in srgb,
          var(--driver-colour)
          7%,
          transparent
        )
      );
  }

  .performance-p1 {
    min-height:116px;

    box-shadow:
      inset 0 0 35px
      color-mix(
        in srgb,
        var(--driver-colour)
        6%,
        transparent
      );
  }

  .performance-number {
    position:absolute;

    right:-4px;
    top:-20px;

    z-index:0;

    color:
      var(--driver-colour);

    opacity:.075;

    font-size:92px;

    line-height:1;

    font-weight:1000;

    font-style:italic;

    letter-spacing:-.08em;

    pointer-events:none;
  }

  .performance-p1
  .performance-number {
    top:-28px;

    font-size:115px;

    opacity:.10;
  }

  .performance-content {
    position:relative;

    z-index:2;

    width:100%;
  }

  /* HEAD */

  .performance-head {
    display:flex;

    align-items:flex-start;

    justify-content:
      space-between;

    gap:7px;
  }

  .performance-head small {
    display:block;

    color:#68737e;

    font-size:5px;

    font-weight:1000;

    letter-spacing:.1em;
  }

  .performance-head > div:first-child > strong {
    display:block;

    margin-top:2px;

    color:#969fa8;

    font-size:5px;
  }

  /* STATE */

  .performance-state {
    min-height:19px;

    padding:
      0 6px;

    display:flex;

    align-items:center;

    gap:4px;

    flex:0 0 auto;

    border:
      1px solid
      rgba(255,255,255,.08);

    border-radius:999px;

    font-size:5px;

    font-weight:1000;

    letter-spacing:.04em;
  }

  .performance-state i {
    width:4px;
    height:4px;

    border-radius:50%;

    background:
      currentColor;
  }

  .state-waiting {
    color:#77818c;
  }

  .state-best {
    color:#cb5dff;

    border-color:
      rgba(203,93,255,.23);

    background:
      rgba(203,93,255,.055);
  }

  .state-best i {
    box-shadow:
      0 0 9px
      #cb5dff;
  }

  .state-on-pace {
    color:#50df91;

    border-color:
      rgba(80,223,145,.20);

    background:
      rgba(80,223,145,.045);
  }

  .state-off-best {
    color:#efcf43;

    border-color:
      rgba(239,207,67,.20);

    background:
      rgba(239,207,67,.04);
  }

  .state-off-pace {
    color:#ef6962;

    border-color:
      rgba(239,105,98,.20);

    background:
      rgba(239,105,98,.04);
  }

  /* LAP VALUES */

  .performance-laps {
    display:grid;

    grid-template-columns:
      1fr 1fr;

    gap:7px;

    margin-top:7px;
  }

  .performance-laps > div {
    min-width:0;

    padding:
      5px 6px;

    border:
      1px solid
      rgba(255,255,255,.055);

    border-radius:6px;

    background:
      rgba(0,0,0,.12);
  }

  .performance-laps small {
    display:block;

    color:#5d6873;

    font-size:4px;

    font-weight:1000;

    letter-spacing:.07em;
  }

  .performance-laps strong {
    display:block;

    margin-top:2px;

    color:#b8bec5;

    font-size:7px;

    font-variant-numeric:
      tabular-nums;
  }

  /* DELTA */

  .performance-delta-row {
    margin-top:6px;

    display:flex;

    align-items:center;

    justify-content:
      space-between;
  }

  .performance-delta-row > span {
    color:#626d78;

    font-size:4px;

    font-weight:1000;

    letter-spacing:.09em;
  }

  .performance-delta {
    font-size:11px;

    font-weight:1000;

    font-variant-numeric:
      tabular-nums;
  }

  .delta-waiting {
    color:#77818c;
  }

  .delta-best {
    color:#cb5dff;

    text-shadow:
      0 0 10px
      rgba(203,93,255,.35);
  }

  .delta-on-pace {
    color:#50df91;
  }

  .delta-off-best {
    color:#efcf43;
  }

  .delta-off-pace {
    color:#ef6962;
  }

  /* PACE SCALE */

  .pace-scale {
    margin-top:3px;
  }

  .pace-scale-labels {
    display:flex;

    justify-content:
      space-between;

    margin-bottom:2px;
  }

  .pace-scale-labels span {
    color:#515c67;

    font-size:4px;

    font-weight:1000;
  }

  .pace-line {
    position:relative;

    height:7px;

    display:flex;

    overflow:visible;

    border-radius:999px;

    background:
      rgba(255,255,255,.045);
  }

  .pace-zone {
    height:3px;

    margin-top:2px;
  }

  /*
    0.25 / 2.0 = 12.5%
    0.75 / 2.0 = 37.5%

    Böylece:
    yeşil 0 - .25
    sarı .25 - .75
    kırmızı .75 - 2.0+
  */

  .pace-green {
    width:12.5%;

    border-radius:
      999px 0 0 999px;

    background:
      linear-gradient(
        90deg,
        #c858ff,
        #4fdf90
      );
  }

  .pace-yellow {
    width:25%;

    background:
      linear-gradient(
        90deg,
        #4fdf90,
        #efd043
      );
  }

  .pace-red {
    width:62.5%;

    border-radius:
      0 999px 999px 0;

    background:
      linear-gradient(
        90deg,
        #efd043,
        #e95b55
      );
  }

  .pace-marker {
    position:absolute;

    top:-2px;

    width:9px;
    height:9px;

    transform:
      translateX(-50%);

    border:
      2px solid
      #fff;

    border-radius:50%;

    background:#818a94;

    box-shadow:
      0 0 8px
      rgba(255,255,255,.25);

    transition:
      left .35s ease;
  }

  .marker-best {
    background:#ca5dff;

    box-shadow:
      0 0 10px
      rgba(202,93,255,.7);
  }

  .marker-on-pace {
    background:#4fdf90;

    box-shadow:
      0 0 9px
      rgba(79,223,144,.6);
  }

  .marker-off-best {
    background:#efd043;

    box-shadow:
      0 0 9px
      rgba(239,208,67,.5);
  }

  .marker-off-pace {
    background:#eb625b;

    box-shadow:
      0 0 9px
      rgba(235,98,91,.5);
  }

  /* FOOT */

  .performance-foot {
    margin-top:5px;

    display:grid;

    grid-template-columns:
      minmax(0,1fr)
      30px
      48px;

    align-items:end;

    gap:5px;
  }

  .performance-description {
    overflow:hidden;

    white-space:nowrap;

    text-overflow:ellipsis;

    font-size:5px;

    font-weight:900;
  }

  .description-waiting {
    color:#707a84;
  }

  .description-best {
    color:#cb5dff;
  }

  .description-on-pace {
    color:#50df91;
  }

  .description-off-best {
    color:#efcf43;
  }

  .description-off-pace {
    color:#ef6962;
  }

  .performance-foot > div {
    text-align:right;
  }

  .performance-foot small {
    display:block;

    color:#59646f;

    font-size:4px;

    font-weight:1000;
  }

  .performance-foot b {
    display:block;

    margin-top:1px;

    overflow:hidden;

    white-space:nowrap;

    text-overflow:ellipsis;

    color:#9ca5ae;

    font-size:5px;
  }

  /* TYRE */

  .spotlight-tyre-zone {
    display:flex;

    flex-direction:column;

    align-items:center;

    gap:4px;
  }

  .spotlight-tyre {
    width:34px;
    height:34px;

    display:grid;

    place-items:center;

    border:
      2px solid;

    border-radius:50%;

    font-size:8px;

    font-weight:1000;
  }

  .spotlight-tyre-zone span {
    color:#747e89;

    font-size:6px;
  }

  .spot-soft {
    color:#ff4e47;
    border-color:#ff4e47;
  }

  .spot-medium {
    color:#ead02e;
    border-color:#ead02e;
  }

  .spot-hard {
    color:#f0f2f4;
    border-color:#f0f2f4;
  }

  .spot-inter {
    color:#50da87;
    border-color:#50da87;
  }

  .spot-wet {
    color:#55a5ff;
    border-color:#55a5ff;
  }

  .spot-unknown {
    color:#737d87;
    border-color:#5b646d;
  }

  /* POSITION FLASH */

  .spotlight-up {
    animation:
      spotlightUp
      .65s ease-out;
  }

  .spotlight-down {
    animation:
      spotlightDown
      .65s ease-out;
  }

  @keyframes spotlightUp {
    0% {
      box-shadow:
        inset 7px 0 0
        #4fe092;

      background:
        rgba(65,216,133,.19);
    }

    100% {
      box-shadow:
        inset 0 0 0
        transparent;

      background:
        transparent;
    }
  }

  @keyframes spotlightDown {
    0% {
      box-shadow:
        inset 7px 0 0
        #f1534e;

      background:
        rgba(229,66,61,.17);
    }

    100% {
      box-shadow:
        inset 0 0 0
        transparent;

      background:
        transparent;
    }
  }

  /* INACTIVE */

  .spotlight-inactive {
    opacity:.42;

    filter:
      grayscale(.92)
      saturate(.2);
  }

  .spotlight-status {
    position:absolute;

    top:10px;
    right:10px;

    padding:
      4px 7px;

    border:
      1px solid
      rgba(255,255,255,.14);

    border-radius:5px;

    color:#bdc3c9;

    background:
      rgba(0,0,0,.35);

    font-size:6px;

    font-weight:1000;
  }

  /* =========================================================
     RESPONSIVE
     ========================================================= */

  @media(max-width:1250px) {
    .spotlight-driver,
    .spotlight-p1 {
      grid-template-columns:
        65px
        80px
        minmax(150px,1fr)
        180px
        minmax(210px,1fr)
        190px
        55px;
    }

    .spotlight-p1
    .portrait-ring {
      width:82px;
      height:82px;
    }

    .performance-number {
      font-size:72px;
    }

    .performance-laps strong {
      font-size:6px;
    }
  }

  @media(max-width:900px) {
    .spotlight-wrap {
      display:none;
    }
  }
`;