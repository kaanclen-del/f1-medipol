import Link from "next/link";

import Header from "@/components/Header";
import PredictionSelector from "@/components/PredictionSelector";

import {
  BULLETIN_MAX_POINTS,
  PODIUM_MAX_POINTS,
  RACE_MAX_POINTS,
  SPECIAL_MAX_POINTS,
  type RaceBulletinAnswers,
  type RaceSpecialPicks,
} from "@/lib/prediction-scoring";

import {
  getCurrentRaceWeekend,
} from "@/lib/race-data";

import {
  getLatestF1Drivers,
} from "@/lib/openf1";

import {
  createClient,
} from "@/utils/supabase/server";

export const dynamic =
  "force-dynamic";

type PredictPageProps = {
  searchParams:
    Promise<{
      mode?:
        | string
        | string[];
    }>;
};

export default async function PredictPage({
  searchParams,
}: PredictPageProps) {
  const params =
    await searchParams;

  const race =
    await getCurrentRaceWeekend();

  const drivers =
    await getLatestF1Drivers();

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  const season =
    race?.raceDate
      ? Number(
          race.raceDate.slice(
            0,
            4
          )
        )
      : new Date()
          .getFullYear();

  const requestedMode =
    Array.isArray(
      params.mode
    )
      ? params.mode[0]
      : params.mode;

  const predictionType:
    | "race"
    | "sprint" =
    requestedMode ===
      "sprint" &&
    race?.sprint
      ? "sprint"
      : "race";

  const isSprint =
    predictionType ===
    "sprint";

  const lockAt =
    isSprint
      ? race?.sprintDate
        ? `${race.sprintDate}T${
            race.sprintTime ||
            "12:00:00Z"
          }`
        : null
      : race?.raceDate
      ? `${race.raceDate}T${
          race.raceTime ||
          "12:00:00Z"
        }`
      : null;

  let initialPrediction: {
    P1:
      | number
      | null;

    P2:
      | number
      | null;

    P3:
      | number
      | null;
  } | null =
    null;

  let initialBulletin:
    RaceBulletinAnswers =
    {};

  let initialSpecialPicks:
    RaceSpecialPicks =
    {};

  let predictionPoints:
    number |
    null =
    null;

  let podiumPoints =
    0;

  let bulletinPoints =
    0;

  let specialPoints =
    0;

  if (
    user &&
    race
  ) {
    const {
      data:
        prediction,
    } =
      await supabase
        .from(
          "predictions"
        )
        .select(
          `
            p1_driver_number,
            p2_driver_number,
            p3_driver_number,
            race_bulletin,
            special_picks,
            points,
            podium_points,
            bulletin_points,
            special_points
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "season",
          season
        )
        .eq(
          "round",
          race.round
        )
        .eq(
          "prediction_type",
          predictionType
        )
        .maybeSingle();

    if (prediction) {
      initialPrediction = {
        P1:
          prediction
            .p1_driver_number ??
          null,

        P2:
          prediction
            .p2_driver_number ??
          null,

        P3:
          prediction
            .p3_driver_number ??
          null,
      };

      initialBulletin =
        (
          prediction
            .race_bulletin ??
          {}
        ) as RaceBulletinAnswers;

      initialSpecialPicks =
        (
          prediction
            .special_picks ??
          {}
        ) as RaceSpecialPicks;

      predictionPoints =
        Number(
          prediction.points ??
            0
        );

      podiumPoints =
        Number(
          prediction
            .podium_points ??
            0
        );

      bulletinPoints =
        Number(
          prediction
            .bulletin_points ??
            0
        );

      specialPoints =
        Number(
          prediction
            .special_points ??
            0
        );
    }
  }

  return (
    <>
      <Header />

      <main className="predict-page">
        <style>{`
          .predict-page {
            min-height:
              100vh;

            padding:
              30px 0 90px;

            color:
              var(--text);

            background:
              radial-gradient(
                circle at 85% 5%,
                rgba(225,6,0,.11),
                transparent 28%
              ),
              radial-gradient(
                circle at 8% 70%,
                rgba(55,88,140,.08),
                transparent 30%
              );
          }

          .predict-wrap {
            width:
              min(
                1420px,
                calc(100% - 32px)
              );

            margin:
              0 auto;
          }

          .predict-hero {
            display:
              flex;

            align-items:
              flex-end;

            justify-content:
              space-between;

            gap:
              25px;

            margin-bottom:
              20px;
          }

          .predict-hero h1 {
            margin:
              7px 0 5px;

            font-size:
              clamp(
                40px,
                5vw,
                62px
              );

            letter-spacing:
              -.055em;
          }

          .predict-hero p {
            margin:
              0;

            color:
              var(--muted);

            font-size:
              13px;
          }

          .mode-tabs {
            display:
              flex;

            gap:
              7px;
          }

          .mode-tab {
            min-width:
              125px;

            height:
              43px;

            display:
              inline-flex;

            align-items:
              center;

            justify-content:
              center;

            border:
              1px solid
              var(--border);

            border-radius:
              10px;

            color:
              var(--muted);

            background:
              var(--panel-soft);

            font-size:
              10px;

            font-weight:
              1000;
          }

          .mode-tab.active {
            border-color:
              rgba(
                255,
                76,
                68,
                .50
              );

            color:
              white;

            background:
              linear-gradient(
                135deg,
                rgba(
                  225,
                  6,
                  0,
                  .25
                ),
                rgba(
                  225,
                  6,
                  0,
                  .08
                )
              );
          }

          .mode-tab.sprint.active {
            border-color:
              rgba(
                255,
                149,
                72,
                .55
              );

            color:
              #ffad7f;

            background:
              rgba(
                255,
                122,
                48,
                .11
              );
          }

          .predict-layout {
            display:
              grid;

            grid-template-columns:
              minmax(
                0,
                1fr
              )
              330px;

            gap:
              15px;

            align-items:
              start;
          }

          .prediction-main {
            padding:
              27px;

            border:
              1px solid
              var(--border);

            border-radius:
              18px;

            background:
              linear-gradient(
                145deg,
                var(--panel),
                var(--panel-2)
              );

            box-shadow:
              var(--shadow);
          }

          .prediction-main-head {
            display:
              flex;

            align-items:
              flex-end;

            justify-content:
              space-between;

            gap:
              20px;

            margin-bottom:
              23px;
          }

          .prediction-main-head h2 {
            margin:
              6px 0 0;

            font-size:
              29px;
          }

          .max-chip {
            padding:
              8px 10px;

            border:
              1px solid
              rgba(
                255,
                70,
                61,
                .22
              );

            border-radius:
              999px;

            color:
              #ff6962;

            font-size:
              9px;

            font-weight:
              1000;
          }

          .prediction-side {
            position:
              sticky;

            top:
              88px;

            display:
              grid;

            gap:
              12px;
          }

          .side-card {
            padding:
              20px;

            border:
              1px solid
              var(--border);

            border-radius:
              15px;

            background:
              linear-gradient(
                145deg,
                var(--panel),
                var(--panel-2)
              );
          }

          .score-card {
            overflow:
              hidden;

            background:
              radial-gradient(
                circle at 90% 5%,
                rgba(
                  225,
                  6,
                  0,
                  .25
                ),
                transparent 38%
              ),
              linear-gradient(
                145deg,
                var(--panel),
                var(--panel-2)
              );
          }

          .side-eyebrow {
            color:
              #ff5e57;

            font-size:
              8px;

            font-weight:
              1000;

            letter-spacing:
              .14em;
          }

          .big-score {
            display:
              flex;

            align-items:
              flex-end;

            gap:
              8px;

            margin-top:
              10px;
          }

          .big-score strong {
            font-size:
              56px;

            line-height:
              .9;

            letter-spacing:
              -.07em;
          }

          .big-score span {
            margin-bottom:
              5px;

            color:
              var(--muted);

            font-size:
              10px;

            font-weight:
              900;
          }

          .score-status {
            margin-top:
              13px;

            color:
              var(--muted);

            font-size:
              10px;

            line-height:
              1.6;
          }

          .score-row {
            display:
              flex;

            align-items:
              center;

            justify-content:
              space-between;

            gap:
              15px;

            min-height:
              42px;

            border-top:
              1px solid
              var(--border);

            font-size:
              10px;
          }

          .score-row span {
            color:
              var(--muted);
          }

          .score-row b {
            color:
              var(--text);
          }

          .side-card h3 {
            margin:
              7px 0 14px;

            font-size:
              19px;
          }

          .weekend-row {
            display:
              flex;

            justify-content:
              space-between;

            gap:
              14px;

            padding:
              8px 0;

            border-top:
              1px solid
              var(--border);

            font-size:
              10px;
          }

          .weekend-row span {
            color:
              var(--muted);
          }

          .weekend-row b {
            max-width:
              175px;

            text-align:
              right;
          }

          @media(
            max-width:
              1050px
          ) {
            .predict-layout {
              grid-template-columns:
                1fr;
            }

            .prediction-side {
              position:
                static;

              grid-template-columns:
                repeat(
                  2,
                  minmax(
                    0,
                    1fr
                  )
                );
            }
          }

          @media(
            max-width:
              720px
          ) {
            .predict-hero {
              align-items:
                flex-start;

              flex-direction:
                column;
            }

            .prediction-main {
              padding:
                18px;
            }

            .prediction-main-head {
              align-items:
                flex-start;

              flex-direction:
                column;
            }

            .prediction-side {
              grid-template-columns:
                1fr;
            }
          }
        `}</style>

        <div className="predict-wrap">
          <div className="predict-hero">
            <div>
              <div className="eyebrow">
                F1 MEDİPOL · PREDICTION CENTER
              </div>

              <h1>
                {isSprint
                  ? "SPRINT TAHMİNİ"
                  : "YARIŞ TAHMİNİ"}
              </h1>

              <p>
                {race
                  ? `${race.raceName} · Round ${race.round} · ${race.circuitName}`
                  : "Sıradaki Formula 1 yarışı"}
              </p>
            </div>

            <div className="mode-tabs">
              <Link
                href="/predict"
                className={`mode-tab ${
                  !isSprint
                    ? "active"
                    : ""
                }`}
              >
                🏁 YARIŞ
              </Link>

              {race?.sprint && (
                <Link
                  href="/predict?mode=sprint"
                  className={`mode-tab sprint ${
                    isSprint
                      ? "active"
                      : ""
                  }`}
                >
                  ⚡ SPRINT
                </Link>
              )}
            </div>
          </div>

          <div className="predict-layout">
            <section className="prediction-main">
              <div className="prediction-main-head">
                <div>
                  <div className="eyebrow">
                    {isSprint
                      ? "SPRINT PODIUM"
                      : "FULL RACE PREDICTION"}
                  </div>

                  <h2>
                    {isSprint
                      ? "Sprint Podyumunu Oluştur"
                      : "Hafta Sonu Tahmin Paketini Oluştur"}
                  </h2>
                </div>

                <div className="max-chip">
                  MAKS.{" "}
                  {isSprint
                    ? PODIUM_MAX_POINTS
                    : RACE_MAX_POINTS}{" "}
                  PUAN
                </div>
              </div>

              {race &&
              drivers.length >
                0 ? (
                <PredictionSelector
                  key={`${season}-${race.round}-${predictionType}`}
                  drivers={
                    drivers
                  }
                  season={
                    season
                  }
                  round={
                    race.round
                  }
                  raceName={
                    race.raceName
                  }
                  predictionType={
                    predictionType
                  }
                  initialPrediction={
                    initialPrediction
                  }
                  initialBulletin={
                    initialBulletin
                  }
                  initialSpecialPicks={
                    initialSpecialPicks
                  }
                  lockAt={
                    lockAt
                  }
                />
              ) : (
                <div
                  style={{
                    minHeight:
                      "420px",

                    display:
                      "grid",

                    placeItems:
                      "center",

                    color:
                      "var(--muted)",

                    textAlign:
                      "center",
                  }}
                >
                  Yarış veya pilot verileri yüklenemedi.
                </div>
              )}
            </section>

            <aside className="prediction-side">
              <div className="side-card score-card">
                <div className="side-eyebrow">
                  {isSprint
                    ? "SPRINT SCORE"
                    : "RACE SCORE"}
                </div>

                <div className="big-score">
                  <strong>
                    {predictionPoints !==
                    null
                      ? predictionPoints
                      : "—"}
                  </strong>

                  <span>
                    PUAN
                  </span>
                </div>

                <div className="score-status">
                  {initialPrediction
                    ? "Tahminin kayıtlı. Sonuç işlendiğinde puanlar otomatik güncellenir."
                    : "Bu hafta sonu için henüz tahmin kaydetmedin."}
                </div>
              </div>

              <div className="side-card">
                <div className="side-eyebrow">
                  PUAN DAĞILIMI
                </div>

                <h3>
                  Skor Kartı
                </h3>

                <div className="score-row">
                  <span>
                    Podyum
                  </span>

                  <b>
                    {podiumPoints} / {PODIUM_MAX_POINTS}
                  </b>
                </div>

                {!isSprint && (
                  <>
                    <div className="score-row">
                      <span>
                        Yarış Senaryoları
                      </span>

                      <b>
                        {bulletinPoints} / {BULLETIN_MAX_POINTS}
                      </b>
                    </div>

                    <div className="score-row">
                      <span>
                        Özel Seçimler
                      </span>

                      <b>
                        {specialPoints} / {SPECIAL_MAX_POINTS}
                      </b>
                    </div>

                    <div className="score-row">
                      <span>
                        Maksimum
                      </span>

                      <b>
                        {RACE_MAX_POINTS}
                      </b>
                    </div>
                  </>
                )}
              </div>

              <div className="side-card">
                <div className="side-eyebrow">
                  RACE WEEKEND
                </div>

                <h3>
                  {race?.raceName ||
                    "Formula 1"}
                </h3>

                <div className="weekend-row">
                  <span>
                    Sezon
                  </span>

                  <b>
                    {season}
                  </b>
                </div>

                <div className="weekend-row">
                  <span>
                    Round
                  </span>

                  <b>
                    {race?.round ||
                      "—"}
                  </b>
                </div>

                <div className="weekend-row">
                  <span>
                    Pist
                  </span>

                  <b>
                    {race?.circuitName ||
                      "—"}
                  </b>
                </div>

                <div className="weekend-row">
                  <span>
                    Mod
                  </span>

                  <b>
                    {isSprint
                      ? "Sprint"
                      : "Race"}
                  </b>
                </div>
              </div>

              <div className="side-card">
                <div className="side-eyebrow">
                  SYSTEM
                </div>

                <h3>
                  Otomatik Puanlama
                </h3>

                <div className="score-status">
                  Podyum ve özel seçimler resmî sonuçlardan; yarış olayları ise mümkün olduğunda yarış kontrolü, hava ve canlı seans verilerinden hesaplanır.
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}