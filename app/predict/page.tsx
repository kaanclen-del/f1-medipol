import Link from "next/link";

import Header from "@/components/Header";
import PredictionSelector from "@/components/PredictionSelector";

import { getCurrentRaceWeekend } from "@/lib/race-data";
import { getLatestF1Drivers } from "@/lib/openf1";

import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type PredictPageProps = {
  searchParams: Promise<{
    mode?: string | string[];
  }>;
};

export default async function PredictPage({
  searchParams,
}: PredictPageProps) {
  const params = await searchParams;

  const race =
    await getCurrentRaceWeekend();

  const drivers =
    await getLatestF1Drivers();

  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const season = race?.raceDate
    ? Number(
        race.raceDate.slice(
          0,
          4
        )
      )
    : new Date().getFullYear();

  /*
    HANGİ TAHMİN MODUNDAYIZ?
  */

  const requestedMode =
    Array.isArray(params.mode)
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

  /*
    KİLİT ZAMANI

    Race tahmini:
    yarış başladığında kilitlenir.

    Sprint tahmini:
    Sprint başladığında kilitlenir.
  */

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

  /*
    KAYITLI TAHMİN
  */

  let initialPrediction: {
    P1: number | null;
    P2: number | null;
    P3: number | null;
  } | null = null;

  /*
    BU MODDAN KAZANILAN PUAN
  */

  let predictionPoints:
    | number
    | null = null;

  if (user && race) {
    const {
      data: prediction,
    } = await supabase
      .from("predictions")
      .select(
        `
        p1_driver_number,
        p2_driver_number,
        p3_driver_number,
        points
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

      predictionPoints =
        prediction.points ?? 0;
    }
  }

  return (
    <>
      <Header />

      <main>
        <div
          className="site-container"
          style={{
            paddingTop: "28px",
            paddingBottom:
              "70px",
          }}
        >
          {/* SAYFA BAŞLIĞI */}

          <div className="eyebrow">
            F1 MEDİPOL ·
            PREDICTION CENTER
          </div>

          <h1
            style={{
              fontSize: "50px",
              margin:
                "8px 0 5px",
              letterSpacing:
                "-.04em",
            }}
          >
            {isSprint
              ? "SPRINT TAHMİNİ"
              : "YARIŞ TAHMİNİ"}
          </h1>

          <p
            style={{
              margin: 0,
              color: "#9da8b5",
              fontSize: "14px",
            }}
          >
            {race
              ? `${race.raceName} · Round ${race.round}`
              : "Sıradaki Formula 1 yarışı"}
          </p>

          {/* RACE / SPRINT SEKMELERİ */}

          <div
            style={{
              marginTop: "22px",
              display: "flex",
              gap: "8px",
              alignItems:
                "center",
            }}
          >
            <Link
              href="/predict"
              style={{
                minWidth: "130px",
                height: "42px",

                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",

                borderRadius:
                  "10px",

                border:
                  predictionType ===
                  "race"
                    ? "1px solid rgba(255,80,72,.55)"
                    : "1px solid rgba(255,255,255,.08)",

                background:
                  predictionType ===
                  "race"
                    ? "linear-gradient(135deg,rgba(225,6,0,.24),rgba(225,6,0,.08))"
                    : "rgba(255,255,255,.025)",

                color:
                  predictionType ===
                  "race"
                    ? "#ffffff"
                    : "#929dab",

                fontSize: "11px",
                fontWeight: 1000,
                letterSpacing:
                  ".06em",
              }}
            >
              🏁 YARIŞ
            </Link>

            {race?.sprint && (
              <Link
                href="/predict?mode=sprint"
                style={{
                  minWidth:
                    "130px",

                  height:
                    "42px",

                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  borderRadius:
                    "10px",

                  border:
                    predictionType ===
                    "sprint"
                      ? "1px solid rgba(255,145,70,.60)"
                      : "1px solid rgba(255,255,255,.08)",

                  background:
                    predictionType ===
                    "sprint"
                      ? "linear-gradient(135deg,rgba(255,115,55,.24),rgba(255,115,55,.07))"
                      : "rgba(255,255,255,.025)",

                  color:
                    predictionType ===
                    "sprint"
                      ? "#ff9a6f"
                      : "#929dab",

                  fontSize:
                    "11px",

                  fontWeight:
                    1000,

                  letterSpacing:
                    ".06em",
                }}
              >
                ⚡ SPRINT
              </Link>
            )}
          </div>

          {/* ANA ALAN */}

          <section
            style={{
              marginTop: "14px",

              display: "grid",

              gridTemplateColumns:
                "minmax(0,1.5fr) minmax(300px,.6fr)",

              gap: "14px",
            }}
          >
            {/* PODIUM */}

            <div
              className="card"
              style={{
                padding: "28px",
                minHeight:
                  "580px",
              }}
            >
              <div className="eyebrow">
                {isSprint
                  ? "SPRINT PODIUM"
                  : "PODIUM PREDICTION"}
              </div>

              <h2
                style={{
                  fontSize:
                    "30px",

                  margin:
                    "8px 0 25px",
                }}
              >
                {isSprint
                  ? "Sprint Podyumunu Oluştur"
                  : "Podyumunu Oluştur"}
              </h2>

              {race &&
              drivers.length >
                0 ? (
       <PredictionSelector
  key={`${season}-${race.round}-${predictionType}`}
  drivers={drivers}
  season={season}
  round={race.round}
  raceName={race.raceName}
  predictionType={predictionType}
  initialPrediction={initialPrediction}
  lockAt={lockAt}
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
                      "#929dab",

                    textAlign:
                      "center",
                  }}
                >
                  Yarış veya pilot
                  verileri yüklenemedi.
                </div>
              )}
            </div>

            {/* SAĞ PANEL */}

            <aside
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: "14px",
              }}
            >
              {/* PUAN */}

              <div
                className="card"
                style={{
                  padding: "22px",

                  background:
                    isSprint
                      ? "linear-gradient(145deg,rgba(255,105,45,.14),rgba(27,34,44,.96))"
                      : "linear-gradient(145deg,rgba(225,6,0,.15),rgba(27,34,44,.96))",
                }}
              >
                <div className="eyebrow">
                  {isSprint
                    ? "BU SPRINT"
                    : "BU YARIŞ"}
                </div>

                <div
                  style={{
                    display: "flex",

                    alignItems:
                      "flex-end",

                    gap: "8px",

                    marginTop:
                      "8px",
                  }}
                >
                  <strong
                    style={{
                      fontSize:
                        "52px",

                      lineHeight: 1,

                      letterSpacing:
                        "-.05em",
                    }}
                  >
                    {predictionPoints !==
                    null
                      ? predictionPoints
                      : "—"}
                  </strong>

                  <span
                    style={{
                      color:
                        "#929dab",

                      fontSize:
                        "12px",

                      fontWeight:
                        900,

                      marginBottom:
                        "6px",
                    }}
                  >
                    PUAN
                  </span>
                </div>

                <p
                  style={{
                    color:
                      "#929dab",

                    fontSize:
                      "11px",

                    lineHeight:
                      1.6,

                    margin:
                      "12px 0 0",
                  }}
                >
                  {initialPrediction
                    ? `${
                        isSprint
                          ? "Sprint"
                          : "Yarış"
                      } sonucu işlendiğinde kazandığın puan burada otomatik güncellenir.`
                    : `${
                        isSprint
                          ? "Bu Sprint"
                          : "Bu yarış"
                      } için henüz kayıtlı tahminin yok.`}
                </p>
              </div>

              {/* PUANLAMA */}

              <div
                className="card"
                style={{
                  padding: "22px",
                }}
              >
                <div className="eyebrow">
                  PUANLAMA
                </div>

                <h3
                  style={{
                    fontSize:
                      "22px",

                    margin:
                      "8px 0 18px",
                  }}
                >
                  Nasıl Puan
                  Kazanılır?
                </h3>

                {[
                  [
                    "P1 doğru",
                    "+50",
                  ],
                  [
                    "P2 doğru",
                    "+35",
                  ],
                  [
                    "P3 doğru",
                    "+25",
                  ],
                  [
                    "Podyumda ama yanlış sıra",
                    "+10",
                  ],
                ].map(
                  ([
                    label,
                    value,
                  ]) => (
                    <div
                      key={
                        label
                      }
                      style={{
                        display:
                          "flex",

                        justifyContent:
                          "space-between",

                        gap:
                          "20px",

                        padding:
                          "13px 0",

                        borderTop:
                          "1px solid rgba(255,255,255,.07)",
                      }}
                    >
                      <span
                        style={{
                          color:
                            "#929dab",

                          fontSize:
                            "12px",
                        }}
                      >
                        {
                          label
                        }
                      </span>

                      <b>
                        {
                          value
                        }
                      </b>
                    </div>
                  )
                )}
              </div>

              {/* DURUM */}

              <div
                className="card"
                style={{
                  padding: "22px",
                }}
              >
                <div className="eyebrow">
                  TAHMİN DURUMU
                </div>

                <h3
                  style={{
                    margin:
                      "8px 0",

                    fontSize:
                      "22px",

                    color:
                      "#35d477",
                  }}
                >
                  OTOMATİK
                </h3>

                <p
                  style={{
                    color:
                      "#929dab",

                    fontSize:
                      "12px",

                    lineHeight:
                      1.7,

                    marginBottom:
                      0,
                  }}
                >
                  {isSprint
                    ? "Sprint başladığında Sprint tahminleri otomatik kilitlenir."
                    : "Yarış başladığında yarış tahminleri otomatik kilitlenir."}
                </p>
              </div>

              {/* HESAP */}

              <div
                className="card"
                style={{
                  padding: "22px",
                }}
              >
                <div className="eyebrow">
                  HESAP
                </div>

                <h3
                  style={{
                    margin:
                      "8px 0 10px",

                    fontSize:
                      "20px",
                  }}
                >
                  {user
                    ? "Oturum Açık"
                    : "Misafir"}
                </h3>

                <p
                  style={{
                    color:
                      "#929dab",

                    fontSize:
                      "12px",

                    lineHeight:
                      1.7,

                    margin: 0,
                  }}
                >
                  {user
                    ? initialPrediction
                      ? `${
                          isSprint
                            ? "Sprint"
                            : "Yarış"
                        } tahminin kayıtlı ve otomatik yüklendi.`
                      : `${
                          isSprint
                            ? "Bu Sprint"
                            : "Bu yarış"
                        } için henüz tahmin kaydetmedin.`
                    : "Tahmin kaydetmek için giriş yapmalısın."}
                </p>
              </div>

              {/* WEEKEND */}

              <div
                className="card"
                style={{
                  padding: "22px",
                }}
              >
                <div className="eyebrow">
                  RACE WEEKEND
                </div>

                <h3
                  style={{
                    margin:
                      "8px 0 14px",

                    fontSize:
                      "20px",
                  }}
                >
                  {race?.raceName ||
                    "Formula 1"}
                </h3>

                <div
                  style={{
                    display:
                      "grid",

                    gap: "10px",

                    fontSize:
                      "12px",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",

                      justifyContent:
                        "space-between",
                    }}
                  >
                    <span
                      style={{
                        color:
                          "#8793a1",
                      }}
                    >
                      Sezon
                    </span>

                    <b>
                      {season}
                    </b>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",

                      justifyContent:
                        "space-between",

                      gap: "15px",
                    }}
                  >
                    <span
                      style={{
                        color:
                          "#8793a1",
                      }}
                    >
                      Pist
                    </span>

                    <b
                      style={{
                        textAlign:
                          "right",
                      }}
                    >
                      {race?.circuitName ||
                        "—"}
                    </b>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",

                      justifyContent:
                        "space-between",
                    }}
                  >
                    <span
                      style={{
                        color:
                          "#8793a1",
                      }}
                    >
                      Round
                    </span>

                    <b>
                      {race?.round ||
                        "—"}
                    </b>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",

                      justifyContent:
                        "space-between",
                    }}
                  >
                    <span
                      style={{
                        color:
                          "#8793a1",
                      }}
                    >
                      Mod
                    </span>

                    <b
                      style={{
                        color:
                          isSprint
                            ? "#ff9368"
                            : "white",
                      }}
                    >
                      {isSprint
                        ? "Sprint"
                        : "Race"}
                    </b>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}