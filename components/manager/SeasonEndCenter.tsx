"use client";

import {
  useEffect,
  useState,
} from "react";

type Standing = {
  position: number;

  team_state_id: string;

  is_bot: boolean;

  team_key: string;
  team_name: string;
  team_color: string;

  manager_name: string;

  driver_key:
    | string
    | null;

  driver_name: string;

  points: number;
  wins: number;
  podiums: number;
  rating: number;
};

type DevelopmentLog = {
  id: string;

  driver_key: string;
  driver_name: string;

  pace_before: number;
  pace_after: number;

  consistency_before: number;
  consistency_after: number;

  wet_before: number;
  wet_after: number;

  racecraft_before: number;
  racecraft_after: number;

  potential: number;
  growth_points: number;
};

type Data = {
  finished: boolean;

  testMode?: boolean;

  isOwner: boolean;

  season: {
    season_number: number;

    current_round?: number;

    status?: string;

    next_season?: number;
  };

  champion?:
    | Standing
    | null;

  podium?: Standing[];

  standings?: Standing[];

  developmentLogs?:
    DevelopmentLog[];

  contracts?: {
    total: number;
    ready: number;
    missing: number;
    allReady: boolean;

    mine:
      | {
          team_name: string;

          driver_name:
            | string
            | null;

          contract_until:
            | number
            | null;

          ready: boolean;
        }
      | null;
  };
};

export default function SeasonEndCenter({
  lobbyId,
}: {
  lobbyId: string;
}) {
  const [
    data,
    setData,
  ] =
    useState<Data | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    testLoading,
    setTestLoading,
  ] =
    useState(false);

  const [
    starting,
    setStarting,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  async function load(
    test = false
  ) {
    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/season-end${
            test
              ? "?test=1"
              : ""
          }`,
          {
            cache:
              "no-store",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ??
            "Sezon sonu verisi yüklenemedi."
        );

        return;
      }

      setData(result);
    } catch {
      setMessage(
        "Sezon sonu verisine ulaşılamadı."
      );
    } finally {
      setLoading(false);
      setTestLoading(false);
    }
  }

  useEffect(() => {
    load(false);

    const timer =
      window.setInterval(
        () => {
          /*
            Test ekranı açıksa
            polling normal moda
            geri atmasın.
          */

          if (
            !data?.testMode
          ) {
            load(false);
          }
        },
        8000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [
    lobbyId,
    data?.testMode,
  ]);

  async function openTestMode() {
    setTestLoading(true);
    setMessage("");

    await load(true);
  }

  async function closeTestMode() {
    setTestLoading(true);
    setMessage("");

    await load(false);
  }

  async function startNextSeason() {
    if (
      data?.testMode
    ) {
      return;
    }

    setStarting(true);
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/season-end`,
          {
            method:
              "POST",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ||
            "Yeni sezon başlatılamadı."
        );

        return;
      }

      window.location.href =
        result.next ??
        `/arcade/manager/lobbies/${lobbyId}/game`;
    } catch {
      setMessage(
        "Yeni sezon başlatılırken bağlantı hatası oluştu."
      );
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return null;
  }

  /*
    SEZON DEVAM EDİYORSA
    SADECE TEST BUTONU.
  */

  if (
    data &&
    !data.finished
  ) {
    if (!data.isOwner) {
      return null;
    }

    return (
      <section
        style={{
          marginBottom:
            "16px",

          padding:
            "15px 18px",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap: "18px",

          flexWrap:
            "wrap",

          border:
            "1px dashed rgba(255,196,70,.25)",

          borderRadius:
            "14px",

          background:
            "rgba(255,196,70,.025)",
        }}
      >
        <div>
          <div
            style={{
              color:
                "#d8ad4b",

              fontSize:
                "8px",

              fontWeight:
                1000,

              letterSpacing:
                "1.2px",
            }}
          >
            DEVELOPMENT TEST MODE
          </div>

          <div
            style={{
              marginTop:
                "4px",

              color:
                "#858d96",

              fontSize:
                "9px",
            }}
          >
            Sezonu gerçekten
            bitirmeden sezon sonu
            ekranını test et.
          </div>
        </div>

        <button
          type="button"

          disabled={
            testLoading
          }

          onClick={
            openTestMode
          }

          style={{
            minHeight:
              "38px",

            padding:
              "0 14px",

            border:
              "1px solid rgba(216,173,75,.35)",

            borderRadius:
              "8px",

            background:
              "rgba(216,173,75,.08)",

            color:
              "#e2bb62",

            cursor:
              testLoading
                ? "not-allowed"
                : "pointer",

            fontSize:
              "8px",

            fontWeight:
              1000,
          }}
        >
          {testLoading
            ? "AÇILIYOR..."
            : "TEST: SEZONU BİTİR →"}
        </button>
      </section>
    );
  }

  if (
    !data ||
    !data.finished
  ) {
    return null;
  }

  const champion =
    data.champion;

  const podium =
    data.podium ?? [];

  const development =
    (
      data.developmentLogs ??
      []
    )
      .filter(
        (item) =>
          item.growth_points >
          0
      )
      .slice(0, 8);

  const contracts =
    data.contracts;

  return (
    <section
      style={{
        marginBottom:
          "18px",

        border:
          data.testMode
            ? "1px solid rgba(255,170,60,.34)"
            : "1px solid rgba(255,215,80,.18)",

        borderRadius:
          "20px",

        overflow:
          "hidden",

        background:
          data.testMode
            ? "radial-gradient(circle at 50% 0%,rgba(255,150,40,.10),transparent 34%),#080808"
            : "radial-gradient(circle at 50% 0%,rgba(255,205,55,.10),transparent 34%),#080808",
      }}
    >
      {/* TEST WARNING */}

      {data.testMode && (
        <div
          style={{
            padding:
              "12px 18px",

            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            gap: "12px",

            flexWrap:
              "wrap",

            background:
              "rgba(255,157,54,.09)",

            borderBottom:
              "1px solid rgba(255,157,54,.20)",
          }}
        >
          <div>
            <strong
              style={{
                color:
                  "#ffb35d",

                fontSize:
                  "9px",

                letterSpacing:
                  "1px",
              }}
            >
              ⚠ TEST MODU
            </strong>

            <div
              style={{
                marginTop:
                  "3px",

                color:
                  "#957a5e",

                fontSize:
                  "8px",
              }}
            >
              Gerçek sezon
              bitirilmedi. Hiçbir
              puan, kontrat veya
              kariyer verisi
              değiştirilmedi.
            </div>
          </div>

          <button
            type="button"

            onClick={
              closeTestMode
            }

            disabled={
              testLoading
            }

            style={{
              minHeight:
                "34px",

              padding:
                "0 11px",

              border:
                "1px solid rgba(255,255,255,.09)",

              borderRadius:
                "7px",

              background:
                "rgba(255,255,255,.025)",

              color:
                "#fff",

              cursor:
                "pointer",

              fontSize:
                "8px",

              fontWeight:
                900,
            }}
          >
            TESTTEN ÇIK
          </button>
        </div>
      )}

      {/* HEADER */}

      <div
        style={{
          padding:
            "25px",

          textAlign:
            "center",

          borderBottom:
            "1px solid rgba(255,255,255,.06)",
        }}
      >
        <div
          style={{
            color:
              data.testMode
                ? "#e79b4b"
                : "#dfbd4a",

            fontSize:
              "9px",

            fontWeight:
              1000,

            letterSpacing:
              "2px",
          }}
        >
          {data.testMode
            ? "SEASON END PREVIEW"
            : `SEASON ${data.season.season_number} COMPLETE`}
        </div>

        <h2
          style={{
            margin:
              "8px 0 0",

            fontSize:
              "clamp(30px,5vw,50px)",

            letterSpacing:
              "-2px",
          }}
        >
          {data.testMode
            ? "Sezon Sonu Testi"
            : "Sezon Tamamlandı"}
        </h2>

        <div
          style={{
            marginTop:
              "7px",

            color:
              "#747d86",

            fontSize:
              "10px",
          }}
        >
          {data.testMode
            ? "Şu anki puan durumuna göre sezon sonu ekranının önizlemesi."
            : "Şampiyona sonucu, pilot gelişimleri ve yeni sezon hazırlıkları."}
        </div>
      </div>

      {/* CHAMPION */}

      {champion && (
        <div
          style={{
            padding:
              "22px",

            textAlign:
              "center",

            borderBottom:
              "1px solid rgba(255,255,255,.055)",
          }}
        >
          <div
            style={{
              fontSize:
                "38px",
            }}
          >
            🏆
          </div>

          <div
            style={{
              marginTop:
                "7px",

              color:
                "#dfbd4a",

              fontSize:
                "8px",

              fontWeight:
                1000,

              letterSpacing:
                "1.4px",
            }}
          >
            {data.testMode
              ? "CURRENT LEADER"
              : "WORLD CHAMPION"}
          </div>

          <h3
            style={{
              margin:
                "5px 0 0",

              fontSize:
                "30px",
            }}
          >
            {
              champion.team_name
            }
          </h3>

          <div
            style={{
              marginTop:
                "5px",

              color:
                "#9aa1a8",

              fontSize:
                "11px",
            }}
          >
            {
              champion.driver_name
            }{" "}
            ·{" "}
            {
              champion.points
            }{" "}
            PTS ·{" "}
            {
              champion.wins
            }{" "}
            galibiyet
          </div>
        </div>
      )}

      {/* PODIUM */}

      <div
        style={{
          padding:
            "18px",

          display:
            "grid",

          gridTemplateColumns:
            "repeat(auto-fit,minmax(180px,1fr))",

          gap: "9px",
        }}
      >
        {podium.map(
          (item) => (
            <div
              key={
                item.team_state_id
              }

              style={{
                padding:
                  "17px",

                border:
                  item.position ===
                  1
                    ? "1px solid rgba(223,189,74,.28)"
                    : "1px solid rgba(255,255,255,.065)",

                borderRadius:
                  "12px",

                background:
                  item.position ===
                  1
                    ? "rgba(223,189,74,.055)"
                    : "rgba(255,255,255,.018)",
              }}
            >
              <div
                style={{
                  color:
                    item.position ===
                    1
                      ? "#dfbd4a"
                      : "#6a737c",

                  fontSize:
                    "8px",

                  fontWeight:
                    1000,
                }}
              >
                P{item.position}
              </div>

              <div
                style={{
                  width:
                    "36px",

                  height:
                    "4px",

                  marginTop:
                    "9px",

                  borderRadius:
                    "999px",

                  background:
                    item.team_color,
                }}
              />

              <strong
                style={{
                  display:
                    "block",

                  marginTop:
                    "10px",

                  fontSize:
                    "15px",
                }}
              >
                {
                  item.team_name
                }
              </strong>

              <div
                style={{
                  marginTop:
                    "4px",

                  color:
                    "#747d86",

                  fontSize:
                    "8px",
                }}
              >
                {
                  item.driver_name
                }
              </div>

              <div
                style={{
                  marginTop:
                    "12px",

                  fontSize:
                    "19px",

                  fontWeight:
                    1000,
                }}
              >
                {
                  item.points
                }{" "}
                <span
                  style={{
                    color:
                      "#5e6670",

                    fontSize:
                      "8px",
                  }}
                >
                  PTS
                </span>
              </div>
            </div>
          )
        )}
      </div>

      {/* DRIVER DEVELOPMENT */}

      <div
        style={{
          padding:
            "20px",

          borderTop:
            "1px solid rgba(255,255,255,.055)",
        }}
      >
        <div
          style={
            label
          }
        >
          DRIVER DEVELOPMENT
        </div>

        <h3
          style={{
            margin:
              "5px 0 15px",
          }}
        >
          Sezon Sonu Pilot
          Gelişimleri
        </h3>

        {data.testMode ? (
          <div
            style={{
              padding:
                "13px",

              border:
                "1px solid rgba(255,174,76,.12)",

              borderRadius:
                "9px",

              background:
                "rgba(255,174,76,.035)",

              color:
                "#ad8259",

              fontSize:
                "9px",

              lineHeight:
                1.55,
            }}
          >
            Test modunda pilot
            statları bilinçli olarak
            değiştirilmez. Gerçek
            sezon tamamlandığında
            POTENTIAL sistemine göre
            gelişimler burada
            görünecek.
          </div>
        ) : development.length ===
          0 ? (
          <div
            style={{
              color:
                "#676f78",

              fontSize:
                "9px",
            }}
          >
            Bu sezon stat artışı
            yaşayan pilot olmadı.
          </div>
        ) : (
          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit,minmax(250px,1fr))",

              gap: "8px",
            }}
          >
            {development.map(
              (driver) => (
                <DevelopmentCard
                  key={
                    driver.id
                  }

                  driver={
                    driver
                  }
                />
              )
            )}
          </div>
        )}
      </div>

      {/* CONTRACT */}

      {contracts && (
        <div
          style={{
            padding:
              "20px",

            borderTop:
              "1px solid rgba(255,255,255,.055)",
          }}
        >
          <div
            style={
              label
            }
          >
            CONTRACT CHECK
          </div>

          <h3
            style={{
              margin:
                "5px 0 14px",
            }}
          >
            Yeni Sezon
            Hazırlığı
          </h3>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit,minmax(190px,1fr))",

              gap: "8px",
            }}
          >
            <InfoBox
              label="HEDEF"
              value={`SEZON ${
                data.season
                  .next_season ??
                data.season
                  .season_number +
                  1
              }`}
            />

            <InfoBox
              label="KONTRATI HAZIR"
              value={`${contracts.ready}/${contracts.total}`}
              good={
                contracts.allReady
              }
            />

            <InfoBox
              label="SENİN KONTRATIN"
              value={
                contracts.mine
                  ?.ready
                  ? "HAZIR"
                  : "YENİLENMELİ"
              }
              good={
                !!contracts.mine
                  ?.ready
              }
            />
          </div>

          {data.testMode && (
            <div
              style={{
                marginTop:
                  "12px",

                padding:
                  "12px",

                border:
                  "1px solid rgba(255,174,76,.14)",

                borderRadius:
                  "9px",

                background:
                  "rgba(255,174,76,.035)",

                color:
                  "#ac8056",

                fontSize:
                  "9px",
              }}
            >
              Test modunda yeni
              sezon başlatma işlemi
              kapalıdır. Böylece
              mevcut kariyer verin
              değişmez.
            </div>
          )}

          {message && (
            <div
              style={{
                marginTop:
                  "11px",

                padding:
                  "12px",

                border:
                  "1px solid rgba(210,38,61,.23)",

                borderRadius:
                  "9px",

                background:
                  "rgba(210,38,61,.06)",

                color:
                  "#ff7c8d",

                fontSize:
                  "9px",
              }}
            >
              {message}
            </div>
          )}

          <div
            style={{
              marginTop:
                "15px",
            }}
          >
            {data.testMode ? (
              <button
                type="button"

                disabled

                style={{
                  width:
                    "100%",

                  minHeight:
                    "53px",

                  border:
                    "1px solid rgba(255,174,76,.10)",

                  borderRadius:
                    "10px",

                  background:
                    "rgba(255,174,76,.035)",

                  color:
                    "#8d6a48",

                  cursor:
                    "not-allowed",

                  fontWeight:
                    1000,
                }}
              >
                TEST MODU · GERÇEK
                SEZON GEÇİŞİ KAPALI
              </button>
            ) : data.isOwner ? (
              <button
                type="button"

                disabled={
                  starting ||
                  !contracts.allReady
                }

                onClick={
                  startNextSeason
                }

                style={{
                  width:
                    "100%",

                  minHeight:
                    "53px",

                  border: 0,

                  borderRadius:
                    "10px",

                  background:
                    !contracts.allReady
                      ? "#242424"
                      : starting
                      ? "#5d4d1b"
                      : "#d7b647",

                  color:
                    !contracts.allReady
                      ? "#666"
                      : "#090909",

                  cursor:
                    !contracts.allReady ||
                    starting
                      ? "not-allowed"
                      : "pointer",

                  fontWeight:
                    1000,
                }}
              >
                {starting
                  ? "YENİ SEZON HAZIRLANIYOR..."
                  : contracts.allReady
                  ? `SEZON ${
                      data.season
                        .next_season
                    }'Yİ BAŞLAT →`
                  : `${contracts.missing} KONTRAT BEKLENİYOR`}
              </button>
            ) : (
              <div
                style={{
                  padding:
                    "13px",

                  border:
                    "1px solid rgba(255,255,255,.06)",

                  borderRadius:
                    "9px",

                  textAlign:
                    "center",

                  color:
                    "#6b747d",

                  fontSize:
                    "9px",
                }}
              >
                Yeni sezonu lobi
                sahibinin başlatması
                bekleniyor.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function DevelopmentCard({
  driver,
}: {
  driver: DevelopmentLog;
}) {
  const changes: string[] =
    [];

  if (
    driver.pace_after >
    driver.pace_before
  ) {
    changes.push(
      `PACE ${driver.pace_before}→${driver.pace_after}`
    );
  }

  if (
    driver.consistency_after >
    driver.consistency_before
  ) {
    changes.push(
      `CONS ${driver.consistency_before}→${driver.consistency_after}`
    );
  }

  if (
    driver.wet_after >
    driver.wet_before
  ) {
    changes.push(
      `WET ${driver.wet_before}→${driver.wet_after}`
    );
  }

  if (
    driver.racecraft_after >
    driver.racecraft_before
  ) {
    changes.push(
      `RACE ${driver.racecraft_before}→${driver.racecraft_after}`
    );
  }

  return (
    <div
      style={{
        padding:
          "13px",

        border:
          "1px solid rgba(88,225,139,.12)",

        borderRadius:
          "10px",

        background:
          "rgba(88,225,139,.035)",
      }}
    >
      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          gap: "8px",
        }}
      >
        <strong
          style={{
            fontSize:
              "11px",
          }}
        >
          {
            driver.driver_name
          }
        </strong>

        <span
          style={{
            color:
              "#69e69a",

            fontSize:
              "8px",

            fontWeight:
              1000,
          }}
        >
          +
          {
            driver.growth_points
          }
        </span>
      </div>

      <div
        style={{
          marginTop:
            "8px",

          display:
            "flex",

          gap: "5px",

          flexWrap:
            "wrap",
        }}
      >
        {changes.map(
          (change) => (
            <span
              key={
                change
              }

              style={{
                padding:
                  "4px 6px",

                borderRadius:
                  "5px",

                background:
                  "rgba(255,255,255,.04)",

                color:
                  "#8cebae",

                fontSize:
                  "7px",

                fontWeight:
                  900,
              }}
            >
              {change}
            </span>
          )
        )}
      </div>

      <div
        style={{
          marginTop:
            "8px",

          color:
            "#5f6871",

          fontSize:
            "7px",
        }}
      >
        POTENTIAL{" "}
        {
          driver.potential
        }
      </div>
    </div>
  );
}

function InfoBox({
  label: title,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div
      style={{
        padding:
          "13px",

        border:
          "1px solid rgba(255,255,255,.06)",

        borderRadius:
          "9px",

        background:
          "rgba(255,255,255,.018)",
      }}
    >
      <div
        style={
          label
        }
      >
        {title}
      </div>

      <strong
        style={{
          display:
            "block",

          marginTop:
            "5px",

          color:
            good === undefined
              ? "#fff"
              : good
              ? "#6be69a"
              : "#e0a35f",

          fontSize:
            "15px",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

const label = {
  color: "#68717a",
  fontSize: "7px",
  fontWeight: 1000,
  letterSpacing: "1px",
};