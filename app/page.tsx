import Header from "@/components/Header";
import RaceHeroBackground from "@/components/RaceHeroBackground";
import RaceCountdown from "@/components/RaceCountdown";
import { getCurrentRaceWeekend } from "@/lib/race-data";
import { getRaceHeroImages } from "@/lib/race-image";

function formatRaceDate(date?: string) {
  if (!date) {
    return "TARİH BEKLENİYOR";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
  })
    .format(new Date(`${date}T12:00:00Z`))
    .toLocaleUpperCase("tr-TR");
}

export default async function Home() {
  const race = await getCurrentRaceWeekend();

  const heroImages = race
    ? await getRaceHeroImages(
        race.raceName,
        race.circuitName,
        race.city
      )
    : [];

  const raceTitle =
    race?.raceName || "FORMULA 1 GRAND PRIX";

  const cleanRaceTitle = raceTitle
    .replace(/grand prix/i, "")
    .trim();

  const raceDate = formatRaceDate(
    race?.raceDate
  );

  return (
    <>
      <Header />

      <main>
        <div
          className="site-container"
          style={{
            paddingTop: "24px",
            paddingBottom: "60px",
          }}
        >
          {/* ÜST BİLGİ ŞERİDİ */}

          <div
            style={{
              padding: "10px 16px",
              border:
                "1px solid rgba(255,255,255,.08)",
              borderRadius: "12px",
              background:
                "rgba(255,255,255,.025)",
              display: "flex",
              gap: "22px",
              alignItems: "center",
              overflow: "hidden",
              fontSize: "12px",
              flexWrap: "wrap",
            }}
          >
            <b
              style={{
                color: "#ff5149",
              }}
            >
              F1 MEDİPOL
            </b>

            <span
              style={{
                color: "#aeb8c4",
              }}
            >
              {race
                ? `${race.raceName} · Round ${race.round}`
                : "Sıradaki yarış yükleniyor"}
            </span>

            {race?.sprint && (
              <span
                style={{
                  color: "#ff805c",
                }}
              >
                ⚡ Sprint Weekend
              </span>
            )}

            <span
              style={{
                color: "#aeb8c4",
              }}
            >
              {raceDate}
            </span>

            {race && (
              <span
                style={{
                  color: "#aeb8c4",
                }}
              >
                {race.city} · {race.country}
              </span>
            )}
          </div>

          {/* HERO */}

          <section
            style={{
              marginTop: "18px",
              display: "grid",
              gridTemplateColumns:
                "minmax(0,1.55fr) minmax(300px,.7fr)",
              gap: "14px",
            }}
          >
            {/* ANA YARIŞ KARTI */}

            <div
              className="card"
              style={{
                minHeight: "540px",
                padding: "42px",
                position: "relative",
                overflow: "hidden",
                isolation: "isolate",
                background:
                  "linear-gradient(135deg,#351d25,#1a2330 65%,#12171f)",
              }}
            >
              {/* OTOMATİK YARIŞ FOTOĞRAFLARI */}

              <RaceHeroBackground
                images={heroImages}
              />

              {/* ROUND SAYISI */}

              <div
                style={{
                  position: "absolute",
                  right: "-20px",
                  top: "-35px",
                  fontSize: "190px",
                  fontWeight: 1000,
                  color:
                    "rgba(255,255,255,.04)",
                  fontStyle: "italic",
                  zIndex: 2,
                  pointerEvents: "none",
                }}
              >
                {race?.round ?? "F1"}
              </div>

              {/* HERO İÇERİĞİ */}

              <div
                style={{
                  position: "relative",
                  zIndex: 3,
                }}
              >
                <div className="eyebrow">
                  {race
                    ? `ROUND ${race.round} · ${race.circuitName}`
                    : "FORMULA 1"}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "14px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      padding: "7px 10px",
                      borderRadius: "999px",
                      border:
                        "1px solid rgba(255,255,255,.12)",
                      background:
                        "rgba(255,255,255,.05)",
                      fontSize: "10px",
                      fontWeight: 900,
                    }}
                  >
                    {race?.city
                      ? race.city.toLocaleUpperCase(
                          "tr-TR"
                        )
                      : "F1"}
                  </span>

                  {race?.sprint && (
                    <span
                      style={{
                        padding:
                          "7px 10px",
                        borderRadius:
                          "999px",
                        border:
                          "1px solid rgba(255,120,80,.30)",
                        background:
                          "rgba(255,100,60,.10)",
                        color: "#ff9b75",
                        fontSize: "10px",
                        fontWeight: 900,
                      }}
                    >
                      SPRINT WEEKEND
                    </span>
                  )}

                  <span
                    style={{
                      padding: "7px 10px",
                      borderRadius: "999px",
                      border:
                        "1px solid rgba(255,255,255,.12)",
                      background:
                        "rgba(255,255,255,.05)",
                      fontSize: "10px",
                      fontWeight: 900,
                    }}
                  >
                    {raceDate}
                  </span>
                </div>

                <h1
                  style={{
                    fontSize: "74px",
                    lineHeight: ".9",
                    margin:
                      "42px 0 15px",
                    letterSpacing:
                      "-.055em",
                    textTransform:
                      "uppercase",
                    maxWidth: "760px",
                  }}
                >
                  {cleanRaceTitle}

                  <br />

                  <span
                    style={{
                      color: "#ff4942",
                    }}
                  >
                    GRAND PRIX
                  </span>
                </h1>

                <p
                  style={{
                    color: "#c2cad4",
                    fontSize: "13px",
                    fontWeight: 800,
                    letterSpacing: ".1em",
                  }}
                >
                  {race
                    ? `${race.circuitName} · ${race.city}, ${race.country}`
                    : "SIRADAKİ F1 HAFTA SONU"}
                </p>

                {/* GERÇEK GERİ SAYIM */}

                {race && (
                  <RaceCountdown
                    raceDate={
                      race.raceDate
                    }
                    raceTime={
                      race.raceTime
                    }
                  />
                )}

                <button
                  className="btn btn-red"
                >
                  Yarış Merkezine Git →
                </button>
              </div>
            </div>

            {/* QUICK INTEL */}

            <aside
              className="card"
              style={{
                padding: "25px",
                minHeight: "540px",
                background:
                  "linear-gradient(145deg,#262d39,#171d26)",
              }}
            >
              <div className="eyebrow">
                YARIŞA GİRMEDEN ÖNCE
              </div>

              <h2
                style={{
                  fontSize: "32px",
                  margin: "8px 0 24px",
                }}
              >
                QUICK INTEL
              </h2>

              {[
                [
                  "PİST",
                  race?.circuitName ||
                    "—",
                  race
                    ? `${race.city}, ${race.country}`
                    : "Pist bilgisi bekleniyor.",
                ],

                [
                  "HAFTA SONU",
                  race?.sprint
                    ? "SPRINT"
                    : "NORMAL",
                  race?.sprint
                    ? "Bu hafta Sprint formatı uygulanıyor."
                    : "Standart Grand Prix hafta sonu.",
                ],

                [
                  "ROUND",
                  race
                    ? `${race.round}`
                    : "—",
                  "Formula 1 sezonu.",
                ],

                [
                  "YARIŞ TARİHİ",
                  raceDate,
                  "Ana yarış programı.",
                ],
              ].map(
                ([
                  title,
                  value,
                  text,
                ]) => (
                  <div
                    key={title}
                    style={{
                      padding:
                        "17px 0",
                      borderBottom:
                        "1px solid rgba(255,255,255,.07)",
                    }}
                  >
                    <small
                      style={{
                        color:
                          "#8995a4",
                        fontWeight:
                          900,
                      }}
                    >
                      {title}
                    </small>

                    <div
                      style={{
                        fontSize:
                          title ===
                          "PİST"
                            ? "19px"
                            : "27px",
                        fontWeight:
                          1000,
                        margin:
                          "4px 0",
                      }}
                    >
                      {value}
                    </div>

                    <span
                      style={{
                        color:
                          "#abb5c1",
                        fontSize:
                          "12px",
                      }}
                    >
                      {text}
                    </span>
                  </div>
                )
              )}
            </aside>
          </section>

          {/* ALT KARTLAR */}

          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3,minmax(0,1fr))",
              gap: "14px",
              marginTop: "14px",
            }}
          >
            <article
              className="card"
              style={{
                padding: "22px",
              }}
            >
              <div className="eyebrow">
                CANLI YARIŞ MERKEZİ
              </div>

              <h3
                style={{
                  fontSize: "23px",
                  margin: "10px 0",
                }}
              >
                Canlı timing şu anda
                beklemede.
              </h3>

              <button className="btn">
                Canlı Merkezi Aç →
              </button>
            </article>

            <article
              className="card"
              style={{
                padding: "22px",
              }}
            >
              <div className="eyebrow">
                YARIŞ TAHMİNİ
              </div>

              <h3
                style={{
                  fontSize: "23px",
                  margin: "10px 0",
                }}
              >
                {race
                  ? `${race.raceName} için podyum tahminini oluştur.`
                  : "Podyum tahminini oluştur."}
              </h3>

              <button className="btn">
                Tahmin Yap →
              </button>
            </article>

            <article
              className="card"
              style={{
                padding: "22px",
              }}
            >
              <div className="eyebrow">
                PADDOCK NABZI
              </div>

              <h3
                style={{
                  fontSize: "23px",
                  margin: "10px 0",
                }}
              >
                Kulüp topluluğundaki
                son gelişmeleri gör.
              </h3>

              <button className="btn">
                Paddock&apos;a Git →
              </button>
            </article>
          </section>
        </div>
      </main>
    </>
  );
}