import Header from "@/components/Header";
import LiveAutoRefresh from "@/components/LiveAutoRefresh";

import {
  getLatestF1Session,
  getLatestF1Drivers,
  getLatestF1Positions,
} from "@/lib/openf1";

import {
  getCurrentRaceWeekend,
} from "@/lib/race-data";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const race =
    await getCurrentRaceWeekend();

  const latestSession =
    await getLatestF1Session();

  const drivers =
    await getLatestF1Drivers();

  const positions =
    await getLatestF1Positions();

  /* ŞU AN SESSION CANLI MI? */

  const now = new Date();

  const sessionStart =
    latestSession
      ? new Date(
          latestSession.date_start
        )
      : null;

  const sessionEnd =
    latestSession
      ? new Date(
          latestSession.date_end
        )
      : null;

  const isLive =
    Boolean(sessionStart) &&
    Boolean(sessionEnd) &&
    now >= sessionStart! &&
    now <= sessionEnd!;

  /*
    SÜRÜCÜLERİ CANLI POZİSYON
    VERİLERİYLE EŞLEŞTİR
  */

  const liveDrivers = drivers
    .map((driver) => {
      const positionData =
        positions.find(
          (position) =>
            position.driver_number ===
            driver.driver_number
        );

      return {
        ...driver,
        livePosition:
          positionData?.position ??
          null,
      };
    })
    .sort((a, b) => {
      const positionA =
        a.livePosition ?? 999;

      const positionB =
        b.livePosition ?? 999;

      return (
        positionA -
        positionB
      );
    });

  return (
    <>
      {/* 15 SANİYEDE BİR OTOMATİK KONTROL */}

      <LiveAutoRefresh />

      <Header />

      <main>
        <div
          className="site-container"
          style={{
            paddingTop: "26px",
            paddingBottom: "70px",
          }}
        >
          {/* ÜST BAŞLIK */}

          <section
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "flex-end",
              gap: "20px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <div>
              <div className="eyebrow">
                F1 MEDİPOL · RACE CENTER
              </div>

              <h1
                style={{
                  margin: "8px 0 4px",
                  fontSize: "48px",
                  letterSpacing: "-.04em",
                }}
              >
                CANLI
              </h1>

              <p
                style={{
                  margin: 0,
                  color: "#9da8b5",
                  fontSize: "14px",
                }}
              >
                {race
                  ? `${race.raceName} · ${race.circuitName}`
                  : "Formula 1 Race Center"}
              </p>
            </div>

            {/* SESSION DURUMU */}

            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: "999px",
                border:
                  "1px solid rgba(255,255,255,.08)",
                background:
                  "rgba(255,255,255,.035)",
              }}
            >
              <span
                style={{
                  width: "9px",
                  height: "9px",
                  borderRadius: "50%",
                  background: isLive
                    ? "#35d477"
                    : "#7b8490",
                  display: "inline-block",
                  boxShadow: isLive
                    ? "0 0 15px rgba(53,212,119,.65)"
                    : "none",
                }}
              />

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 900,
                  color: isLive
                    ? "#55e68f"
                    : "#aeb8c4",
                  letterSpacing: ".08em",
                }}
              >
                {isLive
                  ? "SESSION LIVE"
                  : "SESSION OFFLINE"}
              </span>
            </div>
          </section>

          {/* OPENF1 DURUM ŞERİDİ */}

          <div
            className="card"
            style={{
              padding: "14px 18px",
              marginBottom: "14px",
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background:
                    latestSession
                      ? "#35d477"
                      : "#e10600",
                }}
              />

              <b
                style={{
                  fontSize: "12px",
                }}
              >
                OPENF1 API
              </b>

              <b
                style={{
                  color:
                    latestSession
                      ? "#35d477"
                      : "#ff6762",
                  fontSize: "11px",
                }}
              >
                {latestSession
                  ? "BAĞLANDI"
                  : "BAĞLANTI YOK"}
              </b>
            </div>

            <div
              style={{
                color: "#aeb8c4",
                fontSize: "12px",
              }}
            >
              {isLive
                ? "Canlı session otomatik algılandı"
                : "Canlı session bekleniyor"}
            </div>
          </div>

          {/* ANA GRID */}

          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0,1.7fr) minmax(300px,.65fr)",
              gap: "14px",
            }}
          >
            {/* TIMING */}

            <div
              className="card"
              style={{
                minHeight: "650px",
                overflow: "hidden",
              }}
            >
              {/* TIMING ÜST */}

              <div
                style={{
                  padding: "20px 22px",
                  borderBottom:
                    "1px solid rgba(255,255,255,.08)",
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: "15px",
                }}
              >
                <div>
                  <div className="eyebrow">
                    LIVE TIMING
                  </div>

                  <h2
                    style={{
                      margin: "5px 0 0",
                      fontSize: "25px",
                    }}
                  >
                    Sürücü Sıralaması
                  </h2>
                </div>

                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "999px",
                    background:
                      isLive
                        ? "rgba(53,212,119,.10)"
                        : "rgba(255,255,255,.05)",
                    border:
                      "1px solid rgba(255,255,255,.07)",
                    fontSize: "11px",
                    fontWeight: 900,
                    color: isLive
                      ? "#55e68f"
                      : "#aab3bf",
                  }}
                >
                  {isLive
                    ? "CANLI VERİ"
                    : "TIMING KAPALI"}
                </div>
              </div>

              {/* TABLO BAŞLIK */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "55px minmax(170px,1fr) 120px 120px 90px",
                  gap: "10px",
                  padding: "12px 22px",
                  fontSize: "10px",
                  fontWeight: 900,
                  color: "#778290",
                  letterSpacing: ".07em",
                  borderBottom:
                    "1px solid rgba(255,255,255,.06)",
                }}
              >
                <span>POS</span>

                <span>SÜRÜCÜ</span>

                <span>INTERVAL</span>

                <span>LAST LAP</span>

                <span>TYRE</span>
              </div>

              {/* CANLI SESSION VARSA */}

              {isLive ? (
                <div>
                  {liveDrivers.length >
                  0 ? (
                    liveDrivers.map(
                      (driver) => (
                        <div
                          key={
                            driver.driver_number
                          }
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "55px minmax(170px,1fr) 120px 120px 90px",
                            gap: "10px",
                            alignItems:
                              "center",
                            padding:
                              "12px 22px",
                            borderBottom:
                              "1px solid rgba(255,255,255,.055)",
                          }}
                        >
                          {/* POZİSYON */}

                          <b
                            style={{
                              fontSize:
                                "15px",
                              color:
                                driver.livePosition ===
                                1
                                  ? "#ffffff"
                                  : "#d6dce3",
                            }}
                          >
                            {driver.livePosition
                              ? `P${driver.livePosition}`
                              : "—"}
                          </b>

                          {/* SÜRÜCÜ */}

                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: "12px",
                              minWidth: 0,
                            }}
                          >
                            {/* TAKIM RENGİ */}

                            <div
                              style={{
                                width: "4px",
                                height:
                                  "40px",
                                borderRadius:
                                  "999px",
                                background:
                                  driver.team_colour
                                    ? `#${driver.team_colour}`
                                    : "#666",
                                flexShrink: 0,
                              }}
                            />

                            {/* FOTOĞRAF */}

                            {driver.headshot_url ? (
                              <img
                                src={
                                  driver.headshot_url
                                }
                                alt={
                                  driver.full_name ||
                                  "F1 Driver"
                                }
                                style={{
                                  width:
                                    "40px",
                                  height:
                                    "40px",
                                  borderRadius:
                                    "50%",
                                  objectFit:
                                    "cover",
                                  background:
                                    "#2a313c",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width:
                                    "40px",
                                  height:
                                    "40px",
                                  borderRadius:
                                    "50%",
                                  background:
                                    "#2a313c",
                                  display:
                                    "grid",
                                  placeItems:
                                    "center",
                                  fontSize:
                                    "10px",
                                  fontWeight:
                                    900,
                                }}
                              >
                                {driver.name_acronym ||
                                  "F1"}
                              </div>
                            )}

                            <div
                              style={{
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  fontWeight:
                                    900,
                                  fontSize:
                                    "14px",
                                }}
                              >
                                {driver.full_name ||
                                  driver.broadcast_name ||
                                  `${driver.first_name || ""} ${driver.last_name || ""}`}
                              </div>

                              <div
                                style={{
                                  color:
                                    "#8793a1",
                                  fontSize:
                                    "10px",
                                  marginTop:
                                    "3px",
                                }}
                              >
                                {driver.team_name ||
                                  "Formula 1"}
                              </div>
                            </div>
                          </div>

                          {/* INTERVAL */}

                          <span
                            style={{
                              color:
                                "#929dab",
                              fontSize:
                                "12px",
                            }}
                          >
                            —
                          </span>

                          {/* LAST LAP */}

                          <span
                            style={{
                              color:
                                "#929dab",
                              fontSize:
                                "12px",
                            }}
                          >
                            —
                          </span>

                          {/* TYRE */}

                          <span
                            style={{
                              color:
                                "#929dab",
                              fontSize:
                                "12px",
                            }}
                          >
                            —
                          </span>
                        </div>
                      )
                    )
                  ) : (
                    <div
                      style={{
                        minHeight:
                          "500px",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        color:
                          "#929dab",
                      }}
                    >
                      Canlı sürücü verisi
                      bekleniyor.
                    </div>
                  )}
                </div>
              ) : (
                /* SESSION YOKSA */

                <div
                  style={{
                    minHeight: "500px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "center",
                    textAlign: "center",
                    padding: "40px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        width: "66px",
                        height: "66px",
                        borderRadius: "50%",
                        margin:
                          "0 auto 20px",
                        border:
                          "1px solid rgba(255,255,255,.10)",
                        background:
                          "rgba(255,255,255,.035)",
                        display: "grid",
                        placeItems:
                          "center",
                        fontSize: "27px",
                      }}
                    >
                      ⏱
                    </div>

                    <h3
                      style={{
                        margin:
                          "0 0 10px",
                        fontSize:
                          "24px",
                      }}
                    >
                      Canlı timing şu
                      anda kapalı
                    </h3>

                    <p
                      style={{
                        maxWidth:
                          "450px",
                        margin: "0 auto",
                        color:
                          "#929dab",
                        lineHeight: 1.7,
                        fontSize:
                          "13px",
                      }}
                    >
                      Formula 1
                      antrenman,
                      sıralama, Sprint
                      veya yarış
                      session&apos;ı
                      başladığında bu
                      bölüm otomatik
                      olarak açılacak.
                    </p>
                  </div>
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
              {/* SESSION */}

              <div
                className="card"
                style={{
                  padding: "22px",
                }}
              >
                <div className="eyebrow">
                  SESSION STATUS
                </div>

                <h2
                  style={{
                    fontSize: "26px",
                    margin:
                      "8px 0 18px",
                  }}
                >
                  {isLive
                    ? latestSession
                        ?.session_name
                    : "Beklemede"}
                </h2>

                {[
                  [
                    "Durum",
                    isLive
                      ? "CANLI"
                      : "KAPALI",
                  ],

                  [
                    "Session",
                    isLive
                      ? latestSession
                          ?.session_name ||
                        "—"
                      : "—",
                  ],

                  [
                    "Tür",
                    isLive
                      ? latestSession
                          ?.session_type ||
                        "—"
                      : "—",
                  ],

                  [
                    "Konum",
                    isLive
                      ? latestSession
                          ?.location ||
                        latestSession
                          ?.country_name ||
                        "—"
                      : "—",
                  ],

                  [
                    "Canlı Pilot",
                    isLive
                      ? String(
                          liveDrivers.length
                        )
                      : "—",
                  ],
                ].map(
                  ([label, value]) => (
                    <div
                      key={label}
                      style={{
                        padding:
                          "13px 0",
                        borderTop:
                          "1px solid rgba(255,255,255,.07)",
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: "20px",
                      }}
                    >
                      <span
                        style={{
                          color:
                            "#8793a1",
                          fontSize:
                            "12px",
                        }}
                      >
                        {label}
                      </span>

                      <b
                        style={{
                          fontSize:
                            "12px",
                          textAlign:
                            "right",
                          color:
                            label ===
                              "Durum" &&
                            isLive
                              ? "#35d477"
                              : "white",
                        }}
                      >
                        {value}
                      </b>
                    </div>
                  )
                )}
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
                      "8px 0 16px",
                    fontSize:
                      "20px",
                  }}
                >
                  {race?.raceName ||
                    "Formula 1"}
                </h3>

                <p
                  style={{
                    color: "#929dab",
                    fontSize: "12px",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {race
                    ? `${race.circuitName} · ${race.city}, ${race.country} · Round ${race.round}`
                    : "Yarış bilgileri yükleniyor."}
                </p>
              </div>

              {/* OTOMATİK SİSTEM */}

              <div
                className="card"
                style={{
                  padding: "22px",
                }}
              >
                <div className="eyebrow">
                  AUTO LIVE
                </div>

                <h3
                  style={{
                    margin:
                      "8px 0 12px",
                  }}
                >
                  Otomatik Kontrol
                </h3>

                <p
                  style={{
                    color: "#929dab",
                    fontSize: "12px",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  Sistem OpenF1
                  session durumunu
                  yaklaşık her 15
                  saniyede bir
                  kontrol eder.
                  Session başladığında
                  timing otomatik
                  açılır, bittiğinde
                  tekrar kapanır.
                </p>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}