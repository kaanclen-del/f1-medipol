import Header from "@/components/Header";
import LiveAutoRefresh from "@/components/LiveAutoRefresh";
import LiveTimingClient from "@/components/LiveTimingClient";

import { getCurrentRaceWeekend } from "@/lib/race-data";
import { getLatestF1Session } from "@/lib/openf1";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const race = await getCurrentRaceWeekend();

  const latestSession =
    await getLatestF1Session();

  const now = new Date();

  const sessionStart = latestSession
    ? new Date(latestSession.date_start)
    : null;

  const sessionEnd = latestSession
    ? new Date(latestSession.date_end)
    : null;

  const isLive =
    Boolean(sessionStart) &&
    Boolean(sessionEnd) &&
    now >= sessionStart! &&
    now <= sessionEnd!;

  return (
    <>
      {/* Sayfanın genel session durumu 15 sn'de bir kontrol edilir */}
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
              justifyContent: "space-between",
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

          {/* API DURUM ŞERİDİ */}

          <div
            className="card"
            style={{
              padding: "14px 18px",
              marginBottom: "14px",
              display: "flex",
              justifyContent: "space-between",
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
                  background: latestSession
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
                  color: latestSession
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
                ? "Canlı timing aktif · yaklaşık 4 sn güncelleme"
                : "Canlı Formula 1 session'ı bekleniyor"}
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
              {/* TIMING BAŞLIĞI */}

              <div
                style={{
                  padding: "20px 22px",
                  borderBottom:
                    "1px solid rgba(255,255,255,.08)",
                  display: "flex",
                  justifyContent: "space-between",
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
                    background: isLive
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

              {/* TABLO BAŞLIKLARI */}

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

              {/* 
                ASIL CANLI SİSTEM
                /api/live adresini kendi içinde
                yaklaşık 4 saniyede bir kontrol eder
              */}

              <LiveTimingClient />
            </div>

            {/* SAĞ PANEL */}

            <aside
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {/* SESSION STATUS */}

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
                    margin: "8px 0 18px",
                  }}
                >
                  {isLive
                    ? latestSession?.session_name ||
                      "Canlı"
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
                      ? latestSession?.session_name ||
                        "—"
                      : "—",
                  ],

                  [
                    "Tür",
                    isLive
                      ? latestSession?.session_type ||
                        "—"
                      : "—",
                  ],

                  [
                    "Konum",
                    isLive
                      ? latestSession?.location ||
                        latestSession?.country_name ||
                        "—"
                      : "—",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      padding: "13px 0",
                      borderTop:
                        "1px solid rgba(255,255,255,.07)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "20px",
                    }}
                  >
                    <span
                      style={{
                        color: "#8793a1",
                        fontSize: "12px",
                      }}
                    >
                      {label}
                    </span>

                    <b
                      style={{
                        fontSize: "12px",
                        textAlign: "right",
                        color:
                          label === "Durum" &&
                          isLive
                            ? "#35d477"
                            : "white",
                      }}
                    >
                      {value}
                    </b>
                  </div>
                ))}
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
                    margin: "8px 0 16px",
                    fontSize: "20px",
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

              {/* CANLI VERİ SİSTEMİ */}

              <div
                className="card"
                style={{
                  padding: "22px",
                }}
              >
                <div className="eyebrow">
                  LIVE DATA
                </div>

                <h3
                  style={{
                    margin: "8px 0 14px",
                    fontSize: "20px",
                  }}
                >
                  Otomatik Timing
                </h3>

                <div
                  style={{
                    display: "grid",
                    gap: "9px",
                  }}
                >
                  {[
                    [
                      "Session kontrolü",
                      "15 sn",
                    ],
                    [
                      "Timing verisi",
                      "~4 sn",
                    ],
                    [
                      "Pozisyon",
                      "Otomatik",
                    ],
                    [
                      "Interval",
                      "Otomatik",
                    ],
                    [
                      "Son tur",
                      "Otomatik",
                    ],
                    [
                      "Lastik",
                      "Otomatik",
                    ],
                  ].map(([name, value]) => (
                    <div
                      key={name}
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: "15px",
                        fontSize: "12px",
                        padding: "7px 0",
                      }}
                    >
                      <span
                        style={{
                          color: "#8793a1",
                        }}
                      >
                        {name}
                      </span>

                      <b>{value}</b>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2026 SYSTEMS */}

              <div
                className="card"
                style={{
                  padding: "22px",
                }}
              >
                <div className="eyebrow">
                  2026 SYSTEMS
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: "10px",
                    marginTop: "15px",
                  }}
                >
                  <div
                    style={{
                      padding: "15px",
                      borderRadius: "12px",
                      background:
                        "rgba(255,255,255,.035)",
                    }}
                  >
                    <small
                      style={{
                        color: "#8995a4",
                      }}
                    >
                      ACTIVE AERO
                    </small>

                    <div
                      style={{
                        marginTop: "6px",
                        fontWeight: 900,
                      }}
                    >
                      —
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "15px",
                      borderRadius: "12px",
                      background:
                        "rgba(255,255,255,.035)",
                    }}
                  >
                    <small
                      style={{
                        color: "#8995a4",
                      }}
                    >
                      OVERTAKE
                    </small>

                    <div
                      style={{
                        marginTop: "6px",
                        fontWeight: 900,
                      }}
                    >
                      —
                    </div>
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