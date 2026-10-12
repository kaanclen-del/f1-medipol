"use client";

import {
  use,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import Header from "@/components/Header";

type Tire =
  | "soft"
  | "medium"
  | "hard";

type StrategyData = {
  lobby: {
    id: string;
    name: string;
  };

  season: {
    season_number: number;
    current_round: number;
  };

  race: {
    id: string;
    round: number;
    name: string;
    country: string;
    status: string;
  };

  strategy: {
    starting_tire: Tire;
    second_tire: Tire;
    pit_lap: number;
    aggression: number;
  };

  saved: boolean;
};

const tires: Array<{
  id: Tire;
  name: string;
  description: string;
}> = [
  {
    id: "soft",
    name: "Soft",
    description:
      "En hızlı lastik. Daha yüksek aşınma.",
  },

  {
    id: "medium",
    name: "Medium",
    description:
      "Hız ve dayanıklılık arasında dengeli.",
  },

  {
    id: "hard",
    name: "Hard",
    description:
      "Daha yavaş fakat uzun ömürlü.",
  },
];

export default function StrategyPage({
  params,
}: {
  params: Promise<{
    lobbyId: string;
  }>;
}) {
  const { lobbyId } =
    use(params);

  const [data, setData] =
    useState<StrategyData | null>(
      null
    );

  const [
    startingTire,
    setStartingTire,
  ] =
    useState<Tire>(
      "medium"
    );

  const [
    secondTire,
    setSecondTire,
  ] =
    useState<Tire>(
      "hard"
    );

  const [pitLap, setPitLap] =
    useState(20);

  const [
    aggression,
    setAggression,
  ] =
    useState(50);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  async function loadStrategy() {
    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/strategy`,
          {
            cache: "no-store",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ||
            "Strateji yüklenemedi."
        );

        return;
      }

      setData(result);

      setStartingTire(
        result.strategy
          .starting_tire
      );

      setSecondTire(
        result.strategy
          .second_tire
      );

      setPitLap(
        result.strategy
          .pit_lap
      );

      setAggression(
        result.strategy
          .aggression
      );
    } catch {
      setMessage(
        "Strateji yüklenirken bağlantı hatası oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStrategy();
  }, [lobbyId]);

  async function saveStrategy() {
    if (saving) {
      return;
    }

    setSaving(true);
    setSuccess(false);
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/strategy`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                startingTire,
                secondTire,
                pitLap,
                aggression,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ||
            "Strateji kaydedilemedi."
        );

        return;
      }

      setSuccess(true);

      setMessage(
        result?.message ||
          "Yarış stratejin kaydedildi."
      );

      setData((old) =>
        old
          ? {
              ...old,
              saved: true,
              strategy:
                result.strategy,
            }
          : old
      );
    } catch {
      setMessage(
        "Strateji kaydedilirken bağlantı hatası oluştu."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Header />

        <main
          style={{
            minHeight:
              "100vh",
            background:
              "#070707",
            color:
              "#fff",
            padding:
              "100px 24px",
          }}
        >
          Yarış stratejisi
          yükleniyor...
        </main>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Header />

        <main
          style={{
            minHeight:
              "100vh",
            background:
              "#070707",
            color:
              "#fff",
            padding:
              "100px 24px",
          }}
        >
          {message ||
            "Strateji bulunamadı."}
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <main
        style={{
          minHeight:
            "100vh",

          background:
            "radial-gradient(circle at 15% 0%, rgba(210,38,61,.18), transparent 30%), #070707",

          color: "#fff",

          padding:
            "52px 24px 110px",
        }}
      >
        <div
          style={{
            maxWidth:
              "1180px",
            margin:
              "0 auto",
          }}
        >
          <Link
            href={`/arcade/manager/lobbies/${lobbyId}/game`}
            style={{
              color:
                "#7e8792",
              textDecoration:
                "none",
              fontSize:
                "12px",
            }}
          >
            ← Manager Dashboard
          </Link>

          <div
            style={{
              marginTop:
                "25px",
              marginBottom:
                "30px",
            }}
          >
            <div
              style={{
                color:
                  "#d2263d",
                fontSize:
                  "10px",
                fontWeight:
                  900,
                letterSpacing:
                  "1.8px",
              }}
            >
              RACE STRATEGY · ROUND{" "}
              {data.race.round}
            </div>

            <h1
              style={{
                margin:
                  "8px 0 0",
                fontSize:
                  "clamp(40px, 6vw, 68px)",
                letterSpacing:
                  "-3px",
              }}
            >
              {data.race.name}
            </h1>

            <div
              style={{
                marginTop:
                  "10px",
                color:
                  "#78818b",
              }}
            >
              {data.race.country} ·{" "}
              {data.lobby.name}
            </div>
          </div>

          <section
            style={panelStyle}
          >
            <div
              style={headerStyle}
            >
              <div
                style={redLabel}
              >
                STARTING COMPOUND
              </div>

              <h2
                style={{
                  margin:
                    "7px 0 0",
                }}
              >
                Başlangıç Lastiği
              </h2>
            </div>

            <div
              style={tireGrid}
            >
              {tires.map(
                (tire) => (
                  <TireCard
                    key={
                      tire.id
                    }
                    tire={tire}
                    active={
                      startingTire ===
                      tire.id
                    }
                    onClick={() =>
                      setStartingTire(
                        tire.id
                      )
                    }
                  />
                )
              )}
            </div>
          </section>

          <section
            style={{
              ...panelStyle,
              marginTop:
                "16px",
            }}
          >
            <div
              style={headerStyle}
            >
              <div
                style={redLabel}
              >
                SECOND STINT
              </div>

              <h2
                style={{
                  margin:
                    "7px 0 0",
                }}
              >
                İkinci Lastik
              </h2>
            </div>

            <div
              style={tireGrid}
            >
              {tires.map(
                (tire) => (
                  <TireCard
                    key={
                      tire.id
                    }
                    tire={tire}
                    active={
                      secondTire ===
                      tire.id
                    }
                    onClick={() =>
                      setSecondTire(
                        tire.id
                      )
                    }
                  />
                )
              )}
            </div>
          </section>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "16px",
              marginTop:
                "16px",
            }}
          >
            <section
              style={panelStyle}
            >
              <div
                style={headerStyle}
              >
                <div
                  style={redLabel}
                >
                  PIT WINDOW
                </div>

                <h2
                  style={{
                    margin:
                      "7px 0 0",
                  }}
                >
                  Pit Stop Turu
                </h2>
              </div>

              <div
                style={{
                  padding:
                    "25px",
                }}
              >
                <div
                  style={{
                    fontSize:
                      "42px",
                    fontWeight:
                      900,
                  }}
                >
                  TUR {pitLap}
                </div>

                <input
                  type="range"
                  min={1}
                  max={70}
                  value={pitLap}
                  onChange={(
                    event
                  ) =>
                    setPitLap(
                      Number(
                        event
                          .target
                          .value
                      )
                    )
                  }
                  style={{
                    width:
                      "100%",
                    marginTop:
                      "24px",
                    cursor:
                      "pointer",
                  }}
                />

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    color:
                      "#656d77",
                    fontSize:
                      "10px",
                    marginTop:
                      "8px",
                  }}
                >
                  <span>
                    TUR 1
                  </span>

                  <span>
                    TUR 70
                  </span>
                </div>
              </div>
            </section>

            <section
              style={panelStyle}
            >
              <div
                style={headerStyle}
              >
                <div
                  style={redLabel}
                >
                  DRIVER PACE
                </div>

                <h2
                  style={{
                    margin:
                      "7px 0 0",
                  }}
                >
                  Agresiflik
                </h2>
              </div>

              <div
                style={{
                  padding:
                    "25px",
                }}
              >
                <div
                  style={{
                    fontSize:
                      "42px",
                    fontWeight:
                      900,
                  }}
                >
                  {aggression}%
                </div>

                <div
                  style={{
                    marginTop:
                      "5px",
                    color:
                      "#7b838d",
                    fontSize:
                      "12px",
                  }}
                >
                  {getAggressionLabel(
                    aggression
                  )}
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={
                    aggression
                  }
                  onChange={(
                    event
                  ) =>
                    setAggression(
                      Number(
                        event
                          .target
                          .value
                      )
                    )
                  }
                  style={{
                    width:
                      "100%",
                    marginTop:
                      "24px",
                    cursor:
                      "pointer",
                  }}
                />

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    color:
                      "#656d77",
                    fontSize:
                      "10px",
                    marginTop:
                      "8px",
                  }}
                >
                  <span>
                    TEMKİNLİ
                  </span>

                  <span>
                    AGRESİF
                  </span>
                </div>
              </div>
            </section>
          </div>

          <section
            style={{
              ...panelStyle,
              marginTop:
                "16px",
              padding:
                "22px",
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap:
                "20px",
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <div
                style={redLabel}
              >
                STRATEGY SUMMARY
              </div>

              <div
                style={{
                  marginTop:
                    "8px",
                  fontSize:
                    "18px",
                  fontWeight:
                    900,
                }}
              >
                {tireName(
                  startingTire
                )}{" "}
                →{" "}
                {tireName(
                  secondTire
                )}
              </div>

              <div
                style={{
                  marginTop:
                    "5px",
                  color:
                    "#737c87",
                  fontSize:
                    "11px",
                }}
              >
                Pit: Tur{" "}
                {pitLap} ·
                Agresiflik:{" "}
                {aggression}%
              </div>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={
                saveStrategy
              }
              style={{
                minWidth:
                  "230px",
                minHeight:
                  "52px",
                border: 0,
                borderRadius:
                  "11px",
                background:
                  "#d2263d",
                color:
                  "#fff",
                fontWeight:
                  900,
                cursor:
                  saving
                    ? "wait"
                    : "pointer",
                opacity:
                  saving
                    ? 0.6
                    : 1,
              }}
            >
              {saving
                ? "Kaydediliyor..."
                : data.saved
                ? "Stratejiyi Güncelle"
                : "Stratejiyi Kaydet"}
            </button>
          </section>

          {message && (
            <div
              style={{
                marginTop:
                  "16px",
                padding:
                  "14px 16px",
                borderRadius:
                  "12px",
                border:
                  success
                    ? "1px solid rgba(82,215,130,.25)"
                    : "1px solid rgba(210,38,61,.25)",
                background:
                  success
                    ? "rgba(82,215,130,.08)"
                    : "rgba(210,38,61,.08)",
                color:
                  success
                    ? "#8ae0a6"
                    : "#ff9aaa",
              }}
            >
              {message}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function TireCard({
  tire,
  active,
  onClick,
}: {
  tire: {
    id: Tire;
    name: string;
    description: string;
  };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight:
          "130px",
        textAlign:
          "left",
        padding:
          "20px",
        borderRadius:
          "16px",
        border: active
          ? "1px solid #d2263d"
          : "1px solid rgba(255,255,255,.07)",
        background:
          active
            ? "rgba(210,38,61,.12)"
            : "rgba(255,255,255,.018)",
        color:
          "#fff",
        cursor:
          "pointer",
      }}
    >
      <div
        style={{
          fontSize:
            "20px",
          fontWeight:
            900,
        }}
      >
        {tire.name}
      </div>

      <div
        style={{
          marginTop:
            "8px",
          color:
            "#747d87",
          fontSize:
            "11px",
          lineHeight:
            1.5,
        }}
      >
        {tire.description}
      </div>

      {active && (
        <div
          style={{
            marginTop:
              "12px",
            color:
              "#d2263d",
            fontSize:
              "9px",
            fontWeight:
              900,
          }}
        >
          ✓ SEÇİLDİ
        </div>
      )}
    </button>
  );
}

function tireName(
  tire: Tire
) {
  if (tire === "soft") {
    return "Soft";
  }

  if (tire === "hard") {
    return "Hard";
  }

  return "Medium";
}

function getAggressionLabel(
  value: number
) {
  if (value <= 25) {
    return "Temkinli";
  }

  if (value <= 60) {
    return "Dengeli";
  }

  if (value <= 80) {
    return "Agresif";
  }

  return "Maksimum Atak";
}

const panelStyle = {
  border:
    "1px solid rgba(255,255,255,.075)",

  borderRadius:
    "20px",

  background:
    "rgba(255,255,255,.02)",

  overflow:
    "hidden",
};

const headerStyle = {
  padding:
    "20px 24px",

  borderBottom:
    "1px solid rgba(255,255,255,.06)",
};

const tireGrid = {
  display:
    "grid",

  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",

  gap:
    "14px",

  padding:
    "18px",
};

const redLabel = {
  color:
    "#d2263d",

  fontSize:
    "9px",

  fontWeight:
    900,

  letterSpacing:
    "1.5px",
};