"use client";

export type ChampionshipStanding = {
  position: number;
  points: number;
  wins: number;

  driverId: string;

  driverNumber:
    number | null;

  acronym: string;

  givenName: string;
  familyName: string;
  fullName: string;

  constructor: string;
};

export type ChampionshipLiveDriver = {
  driverNumber: number;

  position:
    number | null;

  acronym: string;

  name: string;

  team: string;

  colour: string;

  headshot:
    string | null;

  status:
    string | null;
};

type Props = {
  standings:
    ChampionshipStanding[];

  drivers:
    ChampionshipLiveDriver[];

  active:
    boolean;

  isSprint:
    boolean;

  sessionName:
    string;
};

/* =========================================================
   POINT SYSTEM
   ========================================================= */

const RACE_POINTS = [
  25,
  18,
  15,
  12,
  10,
  8,
  6,
  4,
  2,
  1,
];

const SPRINT_POINTS = [
  8,
  7,
  6,
  5,
  4,
  3,
  2,
  1,
];

/* =========================================================
   HELPERS
   ========================================================= */

function normalize(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

function pointsForPosition(
  position:
    number | null,

  isSprint:
    boolean
) {
  if (
    position === null ||
    position < 1
  ) {
    return 0;
  }

  const table =
    isSprint
      ? SPRINT_POINTS
      : RACE_POINTS;

  return (
    table[
      position - 1
    ] ?? 0
  );
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function ProjectedChampionship({
  standings,
  drivers,
  active,
  isSprint,
  sessionName,
}: Props) {
  const liveMapByNumber =
    new Map<
      number,
      ChampionshipLiveDriver
    >();

  const liveMapByAcronym =
    new Map<
      string,
      ChampionshipLiveDriver
    >();

  const liveMapByName =
    new Map<
      string,
      ChampionshipLiveDriver
    >();

  for (
    const driver of
      drivers
  ) {
    liveMapByNumber.set(
      driver.driverNumber,
      driver
    );

    liveMapByAcronym.set(
      normalize(
        driver.acronym
      ),
      driver
    );

    liveMapByName.set(
      normalize(
        driver.name
      ),
      driver
    );
  }

  const projected =
    standings
      .map(
        (
          standing
        ) => {
          let liveDriver:
            ChampionshipLiveDriver |
            undefined;

          if (
            standing.driverNumber !==
            null
          ) {
            liveDriver =
              liveMapByNumber.get(
                standing.driverNumber
              );
          }

          if (
            !liveDriver &&
            standing.acronym
          ) {
            liveDriver =
              liveMapByAcronym.get(
                normalize(
                  standing.acronym
                )
              );
          }

          if (
            !liveDriver &&
            standing.fullName
          ) {
            liveDriver =
              liveMapByName.get(
                normalize(
                  standing.fullName
                )
              );
          }

          const status =
            liveDriver
              ?.status
              ?.toUpperCase() ??
            null;

       const cannotScore =
  status === "DNS" ||
  status === "DSQ";

          const gain =
            active &&
            liveDriver &&
            !cannotScore
              ? pointsForPosition(
                  liveDriver.position,
                  isSprint
                )
              : 0;

          return {
            ...standing,

            liveDriver,

            sessionPosition:
              liveDriver?.position ??
              null,

            gain,

            projectedPoints:
              standing.points +
              gain,
          };
        }
      )
      .sort(
        (
          a,
          b
        ) => {
          if (
            b.projectedPoints !==
            a.projectedPoints
          ) {
            return (
              b.projectedPoints -
              a.projectedPoints
            );
          }

          /*
            Eşit puanda şimdilik mevcut
            şampiyona sırasını koruyoruz.
          */

          return (
            a.position -
            b.position
          );
        }
      )
      .map(
        (
          driver,
          index
        ) => ({
          ...driver,

          projectedPosition:
            index + 1,

          movement:
            driver.position -
            (
              index + 1
            ),
        })
      );

  return (
    <section className="projected-card">
      <style>
        {styles}
      </style>

      {/* HEADER */}

      <div className="projected-header">
        <div>
          <span>
            LIVE CHAMPIONSHIP
          </span>

          <h3>
            Projected Standings
          </h3>

          <p>
            {active
              ? `${sessionName} mevcut sıralamasına göre`
              : "Puan veren canlı seans başladığında aktif olacak"}
          </p>
        </div>

        <div
          className={
            active
              ? "projection-state active"
              : "projection-state"
          }
        >
          <i />

          {active
            ? "LIVE PROJECTION"
            : "STANDBY"}
        </div>
      </div>

      {/* EXPLANATION */}

      {active && (
        <div className="projection-note">
          <span>
            {isSprint
              ? "SPRINT POINTS"
              : "RACE POINTS"}
          </span>

          <strong>
            Anlık pozisyona göre şampiyona puanları yeniden hesaplanıyor
          </strong>
        </div>
      )}

      {/* LIST */}

      <div className="projected-list">
        {projected
          .slice(
            0,
            10
          )
          .map(
            (
              driver
            ) => {
              const live =
                driver.liveDriver;

              return (
                <div
                  key={
                    driver.driverId ||
                    driver.acronym
                  }
                  className={[
                    "projected-row",

                    driver.projectedPosition <=
                    3
                      ? "projected-top"
                      : "",

                    driver.projectedPosition ===
                    1
                      ? "projected-leader"
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
                      live?.colour ||
                      "#68717b",
                  }}
                >
                  {/* POSITION */}

                  <div className="projected-position">
                    <strong>
                      P
                      {
                        driver.projectedPosition
                      }
                    </strong>

                    {driver.movement >
                      0 && (
                      <span className="movement-up">
                        ▲
                        {
                          driver.movement
                        }
                      </span>
                    )}

                    {driver.movement <
                      0 && (
                      <span className="movement-down">
                        ▼
                        {
                          Math.abs(
                            driver.movement
                          )
                        }
                      </span>
                    )}
                  </div>

                  {/* DRIVER */}

                  <div className="projected-driver">
                    <div className="projected-avatar">
                      {live?.headshot ? (
                        <img
                          src={
                            live.headshot
                          }
                          alt={
                            driver.fullName
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

                    <div>
                      <b>
                        {driver.acronym ||
                          driver.familyName}
                      </b>

                      <small>
                        {live?.team ||
                          driver.constructor}
                      </small>
                    </div>
                  </div>

                  {/* LIVE POSITION */}

                  <div className="session-position">
                    <small>
                      SESSION
                    </small>

                    <strong>
                      {driver.sessionPosition
                        ? `P${driver.sessionPosition}`
                        : "—"}
                    </strong>
                  </div>

                  {/* CURRENT POINTS */}

                  <div className="points-column">
                    <small>
                      CURRENT
                    </small>

                    <strong>
                      {
                        driver.points
                      }
                    </strong>
                  </div>

                  {/* GAIN */}

                  <div
                    className={[
                      "points-gain",

                      driver.gain >
                      0
                        ? "has-points"
                        : "",
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        " "
                      )}
                  >
                    {driver.gain >
                    0
                      ? `+${driver.gain}`
                      : "+0"}
                  </div>

                  {/* PROJECTED */}

                  <div className="projected-points">
                    <small>
                      PROJECTED
                    </small>

                    <strong>
                      {
                        driver.projectedPoints
                      }
                    </strong>

                    <span>
                      PTS
                    </span>
                  </div>
                </div>
              );
            }
          )}
      </div>

      {/* FOOTER */}

      <div className="projected-footer">
        <span>
          LIVE PROJECTION · NOT OFFICIAL
        </span>

        <b>
          {isSprint
            ? "TOP 8 SCORE"
            : "TOP 10 SCORE"}
        </b>
      </div>
    </section>
  );
}

/* =========================================================
   CSS
   ========================================================= */

const styles = `
  .projected-card {
    overflow:hidden;

    border:
      1px solid
      rgba(255,255,255,.085);

    border-radius:14px;

    background:
      radial-gradient(
        circle at 90% 0%,
        rgba(225,6,0,.08),
        transparent 36%
      ),
      linear-gradient(
        145deg,
        #10151c,
        #151b24
      );

    color:#f4f6f8;
  }

  /* HEADER */

  .projected-header {
    min-height:83px;

    padding:
      16px 17px;

    display:flex;

    align-items:center;

    justify-content:
      space-between;

    gap:12px;

    border-bottom:
      1px solid
      rgba(255,255,255,.07);
  }

  .projected-header > div:first-child {
    min-width:0;
  }

  .projected-header span {
    display:block;

    color:#ff5149;

    font-size:6px;

    font-weight:1000;

    letter-spacing:.12em;
  }

  .projected-header h3 {
    margin:
      5px 0 3px;

    font-size:17px;

    letter-spacing:-.025em;
  }

  .projected-header p {
    margin:0;

    color:#707b86;

    font-size:7px;
  }

  .projection-state {
    min-height:28px;

    padding:
      0 9px;

    flex:0 0 auto;

    display:flex;

    align-items:center;

    gap:6px;

    border:
      1px solid
      rgba(255,255,255,.08);

    border-radius:999px;

    color:#79838d;

    font-size:6px;

    font-weight:1000;
  }

  .projection-state i {
    width:5px;
    height:5px;

    border-radius:50%;

    background:
      currentColor;
  }

  .projection-state.active {
    color:#54df94;

    border-color:
      rgba(84,223,148,.18);

    background:
      rgba(84,223,148,.045);
  }

  .projection-state.active i {
    box-shadow:
      0 0 10px
      #54df94;
  }

  /* NOTE */

  .projection-note {
    padding:
      9px 14px;

    display:flex;

    align-items:center;

    justify-content:
      space-between;

    gap:12px;

    border-bottom:
      1px solid
      rgba(255,255,255,.06);

    background:
      rgba(84,223,148,.035);
  }

  .projection-note span {
    color:#54df94;

    font-size:5px;

    font-weight:1000;

    letter-spacing:.1em;
  }

  .projection-note strong {
    color:#85909b;

    font-size:6px;

    text-align:right;
  }

  /* LIST */

  .projected-list {
    display:grid;
  }

  .projected-row {
    min-height:58px;

    padding:
      7px 11px;

    display:grid;

    grid-template-columns:
      48px
      minmax(105px,1fr)
      42px
      45px
      43px
      62px;

    align-items:center;

    gap:5px;

    border-left:
      3px solid
      #68717b;

    border-bottom:
      1px solid
      rgba(255,255,255,.055);

    transition:
      background .25s ease;
  }

  .projected-row:last-child {
    border-bottom:0;
  }

  .projected-top {
    background:
      rgba(255,255,255,.012);
  }

  .projected-leader {
    background:
      linear-gradient(
        90deg,
        rgba(225,6,0,.075),
        transparent 58%
      );
  }

  /* POSITION */

  .projected-position {
    display:flex;

    flex-direction:column;

    gap:2px;
  }

  .projected-position strong {
    font-size:12px;
  }

  .projected-position span {
    width:fit-content;

    font-size:5px;

    font-weight:1000;
  }

  .movement-up {
    color:#53df93;
  }

  .movement-down {
    color:#f05c56;
  }

  /* DRIVER */

  .projected-driver {
    min-width:0;

    display:flex;

    align-items:center;

    gap:7px;
  }

  .projected-avatar {
    width:30px;
    height:30px;

    flex:
      0 0 30px;

    overflow:hidden;

    display:grid;

    place-items:center;

    border:
      1px solid
      rgba(255,255,255,.08);

    border-radius:50%;

    background:
      rgba(255,255,255,.025);
  }

  .projected-avatar img {
    width:100%;
    height:100%;

    object-fit:cover;

    object-position:center top;
  }

  .projected-avatar span {
    color:#9ba4ae;

    font-size:6px;

    font-weight:1000;
  }

  .projected-driver > div:last-child {
    min-width:0;
  }

  .projected-driver b {
    display:block;

    overflow:hidden;

    text-overflow:ellipsis;

    white-space:nowrap;

    font-size:9px;
  }

  .projected-driver small {
    display:block;

    margin-top:2px;

    overflow:hidden;

    text-overflow:ellipsis;

    white-space:nowrap;

    color:#697580;

    font-size:5px;
  }

  /* SESSION */

  .session-position,
  .points-column,
  .projected-points {
    text-align:center;
  }

  .session-position small,
  .points-column small,
  .projected-points small {
    display:block;

    margin-bottom:2px;

    color:#5f6974;

    font-size:4px;

    font-weight:1000;

    letter-spacing:.07em;
  }

  .session-position strong,
  .points-column strong {
    font-size:8px;
  }

  /* GAIN */

  .points-gain {
    min-height:24px;

    display:grid;

    place-items:center;

    border:
      1px solid
      rgba(255,255,255,.07);

    border-radius:6px;

    color:#68727d;

    background:
      rgba(255,255,255,.02);

    font-size:7px;

    font-weight:1000;
  }

  .points-gain.has-points {
    color:#54df94;

    border-color:
      rgba(84,223,148,.17);

    background:
      rgba(84,223,148,.055);

    box-shadow:
      inset 0 0 12px
      rgba(84,223,148,.035);
  }

  /* PROJECTED */

  .projected-points strong {
    font-size:12px;

    font-variant-numeric:
      tabular-nums;
  }

  .projected-points span {
    display:block;

    margin-top:1px;

    color:#606b76;

    font-size:4px;

    font-weight:1000;
  }

  /* FOOTER */

  .projected-footer {
    min-height:31px;

    padding:
      0 12px;

    display:flex;

    align-items:center;

    justify-content:
      space-between;

    gap:10px;

    border-top:
      1px solid
      rgba(255,255,255,.06);

    background:
      rgba(0,0,0,.1);
  }

  .projected-footer span {
    color:#68737e;

    font-size:5px;

    font-weight:1000;

    letter-spacing:.08em;
  }

  .projected-footer b {
    color:#8e98a2;

    font-size:5px;
  }

  @media(max-width:480px) {
    .projected-row {
      grid-template-columns:
        42px
        minmax(90px,1fr)
        38px
        38px
        38px
        54px;

      padding:
        7px 8px;
    }

    .projected-avatar {
      display:none;
    }
  }
`;