import Header from "@/components/Header";
import PredictionSelector from "@/components/PredictionSelector";

import { getCurrentRaceWeekend } from "@/lib/race-data";
import { getLatestF1Drivers } from "@/lib/openf1";

import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function PredictPage() {
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
        race.raceDate.slice(0, 4)
      )
    : new Date().getFullYear();

  /*
    YARIŞ BAŞLAMA ZAMANI
  */

  const lockAt =
    race?.raceDate
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
    KULLANICININ BU YARIŞTAN
    KAZANDIĞI PUAN
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
        "race"
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
            paddingBottom: "70px",
          }}
        >
          <div className="eyebrow">
            F1 MEDİPOL · PREDICTION CENTER
          </div>

          <h1
            style={{
              fontSize: "50px",
              margin: "8px 0 5px",
              letterSpacing: "-.04em",
            }}
          >
            YARIŞ TAHMİNİ
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

          <section
            style={{
              marginTop: "25px",

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
                minHeight: "580px",
              }}
            >
              <div className="eyebrow">
                PODIUM PREDICTION
              </div>

              <h2
                style={{
                  fontSize: "30px",
                  margin: "8px 0 25px",
                }}
              >
                Podyumunu Oluştur
              </h2>

              {race &&
              drivers.length > 0 ? (
                <PredictionSelector
                  drivers={drivers}
                  season={season}
                  round={race.round}
                  raceName={
                    race.raceName
                  }
                  predictionType="race"
                  initialPrediction={
                    initialPrediction
                  }
                  lockAt={
                    lockAt
                  }
                />
              ) : (
                <div
                  style={{
                    minHeight: "420px",

                    display: "grid",

                    placeItems: "center",

                    color: "#929dab",

                    textAlign: "center",
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
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {/* PUAN */}

              <div
                className="card"
                style={{
                  padding: "22px",

                  background:
                    "linear-gradient(145deg,rgba(225,6,0,.15),rgba(27,34,44,.96))",
                }}
              >
                <div className="eyebrow">
                  BU YARIŞ
                </div>

                <div
                  style={{
                    display: "flex",

                    alignItems:
                      "flex-end",

                    gap: "8px",

                    marginTop: "8px",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "52px",

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
                      color: "#929dab",

                      fontSize: "12px",

                      fontWeight: 900,

                      marginBottom: "6px",
                    }}
                  >
                    PUAN
                  </span>
                </div>

                <p
                  style={{
                    color: "#929dab",

                    fontSize: "11px",

                    lineHeight: 1.6,

                    margin:
                      "12px 0 0",
                  }}
                >
                  {initialPrediction
                    ? "Yarış sonucu işlendiğinde kazandığın puan burada otomatik güncellenir."
                    : "Bu yarış için henüz kayıtlı tahminin yok."}
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
                    fontSize: "22px",
                    margin: "8px 0 18px",
                  }}
                >
                  Nasıl Puan Kazanılır?
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
                  ([label, value]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",

                        justifyContent:
                          "space-between",

                        gap: "20px",

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
                        {label}
                      </span>

                      <b>{value}</b>
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
                    margin: "8px 0",

                    fontSize: "22px",

                    color: "#35d477",
                  }}
                >
                  OTOMATİK
                </h3>

                <p
                  style={{
                    color: "#929dab",

                    fontSize: "12px",

                    lineHeight: 1.7,

                    marginBottom: 0,
                  }}
                >
                  Yarış başladığında
                  tahminler otomatik
                  kilitlenir. Yarış
                  sonucu açıklandıktan
                  sonra puanlar sistem
                  tarafından hesaplanır.
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

                    fontSize: "20px",
                  }}
                >
                  {user
                    ? "Oturum Açık"
                    : "Misafir"}
                </h3>

                <p
                  style={{
                    color: "#929dab",

                    fontSize: "12px",

                    lineHeight: 1.7,

                    margin: 0,
                  }}
                >
                  {user
                    ? initialPrediction
                      ? "Kayıtlı tahmin bulundu ve otomatik yüklendi."
                      : "Bu yarış için henüz tahmin kaydetmedin."
                    : "Tahmin kaydetmek için giriş yapmalısın."}
                </p>
              </div>

              {/* RACE WEEKEND */}

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

                    fontSize: "20px",
                  }}
                >
                  {race?.raceName ||
                    "Formula 1"}
                </h3>

                <div
                  style={{
                    display: "grid",

                    gap: "10px",

                    fontSize: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",

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

                    <b>{season}</b>
                  </div>

                  <div
                    style={{
                      display: "flex",

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
                      display: "flex",

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
                      display: "flex",

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
                      Format
                    </span>

                    <b>
                      {race?.sprint
                        ? "Sprint"
                        : "Normal"}
                    </b>
                  </div>
                </div>
              </div>

              {/* SPRINT */}

              {race?.sprint && (
                <div
                  className="card"
                  style={{
                    padding: "22px",

                    border:
                      "1px solid rgba(255,110,70,.18)",
                  }}
                >
                  <div className="eyebrow">
                    SPRINT WEEKEND
                  </div>

                  <h3
                    style={{
                      margin: "8px 0",
                    }}
                  >
                    Sprint Tahmini
                  </h3>

                  <p
                    style={{
                      color: "#929dab",

                      fontSize: "12px",

                      lineHeight: 1.7,

                      margin: 0,
                    }}
                  >
                    Sprint için ayrı
                    P1 / P2 / P3 tahmini
                    de ekleyeceğiz.
                  </p>
                </div>
              )}
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}