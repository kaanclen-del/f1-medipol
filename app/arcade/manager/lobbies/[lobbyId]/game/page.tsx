"use client";

import {
  use,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import Link from "next/link";

import Header from "@/components/Header";
import PaddockNews from "@/components/manager/PaddockNews";
import DriverContractCenter from "@/components/manager/DriverContractCenter";
import SeasonEndCenter from "@/components/manager/SeasonEndCenter";
import CareerArchive from "@/components/manager/CareerArchive";

type Driver = {
  key: string;
  name: string;
  teamKey: string;
  image: string;

  pace: number;
  consistency: number;
  wet: number;
  racecraft: number;
  potential: number;
};

type TeamState = {
  id: string;

  user_id:
    | string
    | null;

  team_key: string;

  driver_key:
    | string
    | null;

  budget: number;
  team_rating: number;

  season_points: number;

  wins: number;
  podiums: number;

  aero_level: number;
  chassis_level: number;
  power_level: number;
  reliability_level: number;

  total_spent: number;

  is_bot?: boolean;

  bot_key?:
    | string
    | null;

  bot_name?:
    | string
    | null;
};

type Race = {
  id: string;
  round: number;
  name: string;
  country: string;

  status:
    | "scheduled"
    | "active"
    | "finished";

  completed_at:
    | string
    | null;
};

type Standing =
  TeamState & {
    position: number;

    teamName: string;
    teamColor: string;

    driver:
      | Driver
      | null;

    profile: {
      id: string;

      display_name:
        | string
        | null;

      username:
        | string
        | null;

      avatar_url:
        | string
        | null;
    } | null;
  };

type GameData = {
  lobby: {
    id: string;
    name: string;
    created_by: string;
    status: string;

    ai_difficulty?:
      string;
  };

  season: {
    id: string;

    season_number: number;

    current_round: number;

    status: string;
  };

  races: Race[];

  nextRace:
    | Race
    | null;

  standings:
    Standing[];

  currentUserId:
    string;

  isOwner: boolean;

  currentTeamState:
    | TeamState
    | null;

  currentTeam: {
    key: string;
    name: string;
    color: string;
  } | null;

  currentDriver:
    | Driver
    | null;

  botCount?: number;

  aiDifficulty?:
    string;
};

type Tire =
  | "soft"
  | "medium"
  | "hard";

type Strategy = {
  startingTire: Tire;
  secondTire: Tire;

  pitLap: number;
  aggression: number;
};

const DEFAULT_STRATEGY: Strategy =
  {
    startingTire:
      "medium",

    secondTire:
      "hard",

    pitLap: 20,

    aggression: 50,
  };

export default function ManagerGamePage({
  params,
}: {
  params: Promise<{
    lobbyId: string;
  }>;
}) {
  const { lobbyId } =
    use(params);

  const [
    data,
    setData,
  ] =
    useState<GameData | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    startingRace,
    setStartingRace,
  ] =
    useState(false);

  /*
    STRATEGY DRAWER
  */

  const [
    strategyOpen,
    setStrategyOpen,
  ] =
    useState(false);

  const [
    strategyLoading,
    setStrategyLoading,
  ] =
    useState(false);

  const [
    strategySaving,
    setStrategySaving,
  ] =
    useState(false);

  const [
    strategySaved,
    setStrategySaved,
  ] =
    useState(false);

  const [
    strategyMessage,
    setStrategyMessage,
  ] =
    useState("");

  const [
    strategy,
    setStrategy,
  ] =
    useState<Strategy>(
      DEFAULT_STRATEGY
    );

  async function loadGame() {
    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/game`,
          {
            cache:
              "no-store",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ||
            "Manager Dashboard yüklenemedi."
        );

        return;
      }

      setData(result);
    } catch {
      setMessage(
        "Sunucuya bağlanılamadı."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadStrategy(
    showLoading = false
  ) {
    if (showLoading) {
      setStrategyLoading(
        true
      );
    }

    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/strategy-inline`,
          {
            cache:
              "no-store",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setStrategySaved(
          false
        );

        if (showLoading) {
          setStrategyMessage(
            result?.error ||
              "Strateji yüklenemedi."
          );
        }

        return;
      }

      setStrategy({
        startingTire:
          result.strategy
            ?.starting_tire ??
          "medium",

        secondTire:
          result.strategy
            ?.second_tire ??
          "hard",

        pitLap:
          Number(
            result.strategy
              ?.pit_lap ??
              20
          ),

        aggression:
          Number(
            result.strategy
              ?.aggression ??
              50
          ),
      });

      setStrategySaved(
        !!result.saved
      );
    } catch {
      if (showLoading) {
        setStrategyMessage(
          "Strateji verisine ulaşılamadı."
        );
      }
    } finally {
      if (showLoading) {
        setStrategyLoading(
          false
        );
      }
    }
  }

  useEffect(() => {
    loadGame();
    loadStrategy();

    const interval =
      window.setInterval(
        loadGame,
        5000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [lobbyId]);

  /*
    Round değiştiğinde
    yeni yarış stratejisini
    tekrar kontrol et.
  */

  useEffect(() => {
    if (!data) {
      return;
    }

    setStrategySaved(
      false
    );

    setStrategy(
      DEFAULT_STRATEGY
    );

    loadStrategy();
  }, [
    data?.season
      .current_round,
  ]);

  const lastFinishedRace =
    useMemo(() => {
      if (!data) {
        return null;
      }

      return (
        [...data.races]
          .filter(
            (race) =>
              race.status ===
              "finished"
          )
          .sort(
            (a, b) =>
              b.round -
              a.round
          )[0] ?? null
      );
    }, [data]);

  const activeRace =
    data?.nextRace ??
    data?.races.find(
      (race) =>
        race.round ===
        data.season
          .current_round
    ) ??
    null;

  function openStrategy() {
    setStrategyOpen(
      true
    );

    setStrategyMessage(
      ""
    );

    loadStrategy(true);
  }

  async function saveStrategy() {
    setStrategySaving(
      true
    );

    setStrategyMessage(
      ""
    );

    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/strategy-inline`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                startingTire:
                  strategy.startingTire,

                secondTire:
                  strategy.secondTire,

                pitLap:
                  strategy.pitLap,

                aggression:
                  strategy.aggression,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setStrategyMessage(
          result?.error ||
            "Strateji kaydedilemedi."
        );

        return;
      }

      setStrategySaved(
        true
      );

      setStrategyMessage(
        "Strateji kaydedildi."
      );
    } catch {
      setStrategyMessage(
        "Strateji kaydedilirken bağlantı hatası oluştu."
      );
    } finally {
      setStrategySaving(
        false
      );
    }
  }

  function applyPreset(
    preset:
      | "safe"
      | "balanced"
      | "attack"
  ) {
    if (
      preset === "safe"
    ) {
      setStrategy({
        startingTire:
          "medium",

        secondTire:
          "hard",

        pitLap: 24,

        aggression: 38,
      });

      return;
    }

    if (
      preset ===
      "attack"
    ) {
      setStrategy({
        startingTire:
          "soft",

        secondTire:
          "medium",

        pitLap: 16,

        aggression: 78,
      });

      return;
    }

    setStrategy({
      startingTire:
        "medium",

      secondTire:
        "hard",

      pitLap: 20,

      aggression: 55,
    });
  }

  async function startRace() {
    if (
      !data?.isOwner ||
      startingRace
    ) {
      return;
    }

    /*
      Host kendi stratejisini
      kaydetmeden yarışı
      başlatamasın.
    */

    if (
      !strategySaved
    ) {
      setMessage(
        "Yarış başlamadan önce stratejini kaydetmelisin."
      );

      openStrategy();

      return;
    }

    setStartingRace(
      true
    );

    setMessage("");

    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/race`,
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
            "Yarış başlatılamadı."
        );

        return;
      }

      if (result.next) {
        window.location.href =
          result.next;
      }
    } catch {
      setMessage(
        "Yarış başlatılırken bağlantı hatası oluştu."
      );
    } finally {
      setStartingRace(
        false
      );
    }
  }

  if (loading) {
    return (
      <>
        <Header />

        <main
          style={
            loadingStyle
          }
        >
          Manager sezonu
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
          style={
            loadingStyle
          }
        >
          {message ||
            "Dashboard yüklenemedi."}
        </main>
      </>
    );
  }

  const state =
    data.currentTeamState;

  const driver =
    data.currentDriver;

  const team =
    data.currentTeam;

  return (
    <>
      <Header />

      <style>
        {`
          @keyframes drawerIn {
            from {
              transform: translateX(100%);
            }

            to {
              transform: translateX(0);
            }
          }

          @keyframes fadeOverlay {
            from {
              opacity: 0;
            }

            to {
              opacity: 1;
            }
          }

          @keyframes savedPulse {
            0% {
              box-shadow: 0 0 0 rgba(74, 225, 132, 0);
            }

            50% {
              box-shadow: 0 0 35px rgba(74, 225, 132, .18);
            }

            100% {
              box-shadow: 0 0 0 rgba(74, 225, 132, 0);
            }
          }

          .managerDashboardGrid {
            display: grid;
            grid-template-columns: repeat(auto-fit,minmax(330px,1fr));
            gap: 16px;
          }

          .strategyDrawer {
            width: min(520px, 100vw);
          }

          @media (max-width: 650px) {
            .strategyDrawer {
              width: 100vw;
            }
          }
        `}
      </style>

      <main
        style={{
          minHeight:
            "100vh",

          background:
            `radial-gradient(circle at 75% 0%, ${
              team?.color ??
              "#d2263d"
            }20, transparent 30%), #050505`,

          color: "#fff",

          padding:
            "42px 24px 100px",
        }}
      >
        <div
          style={{
            maxWidth:
              "1450px",

            margin:
              "0 auto",
          }}
        >
          {/* HEADER */}

          <div
            style={{
              display: "flex",

              justifyContent:
                "space-between",

              alignItems:
                "flex-end",

              gap: "20px",

              flexWrap:
                "wrap",

              marginBottom:
                "24px",
            }}
          >
            <div>
              <div
                style={
                  redLabel
                }
              >
                MANAGER · SEASON{" "}
                {
                  data.season
                    .season_number
                }
              </div>

              <h1
                style={{
                  margin:
                    "7px 0 0",

                  fontSize:
                    "clamp(38px,6vw,68px)",

                  lineHeight: 1,

                  letterSpacing:
                    "-3px",
                }}
              >
                {team?.name ??
                  "Manager Team"}
              </h1>

              <div
                style={{
                  marginTop:
                    "10px",

                  color:
                    "#737c86",

                  fontSize:
                    "12px",
                }}
              >
                {driver
                  ? `${driver.name} · Round ${data.season.current_round}`
                  : `Round ${data.season.current_round}`}
              </div>
            </div>

            <div
              style={{
                display:
                  "flex",

                gap: "8px",

                alignItems:
                  "center",
              }}
            >
              {data.botCount !==
                undefined && (
                <div
                  style={
                    topBadge
                  }
                >
                  {
                    data.botCount
                  }{" "}
                  AI
                </div>
              )}

              <div
                style={{
                  ...topBadge,

                  color:
                    data.isOwner
                      ? "#ff7183"
                      : "#888",
                }}
              >
                {data.isOwner
                  ? "HOST"
                  : "PLAYER"}
              </div>
            </div>
          </div>

          {message && (
            <div
              style={{
                marginBottom:
                  "18px",

                padding:
                  "13px 16px",

                border:
                  "1px solid rgba(210,38,61,.22)",

                borderRadius:
                  "11px",

                background:
                  "rgba(210,38,61,.07)",

                fontSize:
                  "12px",
              }}
            >
              {message}
            </div>
          )}

          {/* RACE CONTROL */}

          {data.season.status ===
            "active" &&
            activeRace && (
              <section
                style={{
                  ...panel,

                  marginBottom:
                    "16px",

                  padding:
                    "22px",

                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "space-between",

                  gap: "20px",

                  flexWrap:
                    "wrap",

                  border:
                    "1px solid rgba(210,38,61,.20)",

                  background:
                    "linear-gradient(120deg,rgba(210,38,61,.10),rgba(255,255,255,.015))",
                }}
              >
                <div>
                  <div
                    style={
                      redLabel
                    }
                  >
                    RACE CONTROL ·
                    ROUND{" "}
                    {
                      activeRace.round
                    }
                  </div>

                  <h2
                    style={{
                      margin:
                        "6px 0 0",

                      fontSize:
                        "28px",
                    }}
                  >
                    {
                      activeRace.name
                    }
                  </h2>

                  <div
                    style={{
                      marginTop:
                        "5px",

                      color:
                        "#747d87",

                      fontSize:
                        "11px",
                    }}
                  >
                    {
                      activeRace.country
                    }
                  </div>

                  <div
                    style={{
                      marginTop:
                        "11px",

                      display:
                        "flex",

                      alignItems:
                        "center",

                      gap: "7px",
                    }}
                  >
                    <div
                      style={{
                        width:
                          "7px",

                        height:
                          "7px",

                        borderRadius:
                          "50%",

                        background:
                          strategySaved
                            ? "#56e28b"
                            : "#ffb347",
                      }}
                    />

                    <span
                      style={{
                        color:
                          strategySaved
                            ? "#75e99f"
                            : "#cf9e61",

                        fontSize:
                          "9px",

                        fontWeight:
                          900,
                      }}
                    >
                      {strategySaved
                        ? "STRATEJİ HAZIR"
                        : "STRATEJİ BEKLENİYOR"}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display:
                      "flex",

                    gap: "8px",

                    flexWrap:
                      "wrap",
                  }}
                >
                  <button
                    type="button"

                    onClick={
                      openStrategy
                    }

                    style={{
                      minWidth:
                        "170px",

                      minHeight:
                        "50px",

                      border:
                        "1px solid rgba(255,255,255,.10)",

                      borderRadius:
                        "11px",

                      background:
                        "rgba(255,255,255,.035)",

                      color:
                        "#fff",

                      cursor:
                        "pointer",

                      fontWeight:
                        900,
                    }}
                  >
                    STRATEJİYİ AÇ
                  </button>

                  {data.isOwner && (
                    <button
                      type="button"

                      onClick={
                        startRace
                      }

                      disabled={
                        startingRace
                      }

                      style={{
                        minWidth:
                          "220px",

                        minHeight:
                          "50px",

                        border: 0,

                        borderRadius:
                          "11px",

                        background:
                          startingRace
                            ? "#55151e"
                            : "#d2263d",

                        color:
                          "#fff",

                        cursor:
                          startingRace
                            ? "not-allowed"
                            : "pointer",

                        fontWeight:
                          900,
                      }}
                    >
                      {startingRace
                        ? "Yarış hazırlanıyor..."
                        : "YARIŞI BAŞLAT"}
                    </button>
                  )}
                </div>
              </section>
            )}

          {/* DRIVER + TEAM */}

          <div
            className="managerDashboardGrid"

            style={{
              marginBottom:
                "16px",
            }}
          >
            <section
              style={{
                ...panel,

                position:
                  "relative",

                minHeight:
                  "390px",

                overflow:
                  "hidden",

                background:
                  `radial-gradient(circle at 80% 80%, ${
                    team?.color ??
                    "#d2263d"
                  }2c, transparent 45%), rgba(255,255,255,.02)`,
              }}
            >
              {driver ? (
                <>
                  <img
                    src={
                      driver.image
                    }

                    alt={
                      driver.name
                    }

                    style={{
                      position:
                        "absolute",

                      right:
                        "-10px",

                      bottom: 0,

                      width:
                        "54%",

                      height:
                        "90%",

                      objectFit:
                        "contain",

                      objectPosition:
                        "center bottom",

                      opacity:
                        0.88,

                      pointerEvents:
                        "none",
                    }}
                  />

                  <div
                    style={{
                      position:
                        "relative",

                      zIndex: 2,

                      width:
                        "58%",

                      padding:
                        "24px",
                    }}
                  >
                    <div
                      style={{
                        ...redLabel,

                        color:
                          team?.color ??
                          "#d2263d",
                      }}
                    >
                      YOUR DRIVER
                    </div>

                    <h2
                      style={{
                        margin:
                          "7px 0 4px",

                        fontSize:
                          "32px",

                        lineHeight: 1,
                      }}
                    >
                      {
                        driver.name
                      }
                    </h2>

                    <div
                      style={{
                        color:
                          "#747d87",

                        fontSize:
                          "10px",

                        marginBottom:
                          "20px",
                      }}
                    >
                      {team?.name}
                    </div>

                    <DriverStats
                      driver={
                        driver
                      }

                      color={
                        team?.color ??
                        "#d2263d"
                      }
                    />
                  </div>
                </>
              ) : (
                <div
                  style={{
                    padding:
                      "24px",
                  }}
                >
                  Pilot seçilmemiş.
                </div>
              )}
            </section>

            <section
              style={{
                ...panel,

                padding:
                  "24px",
              }}
            >
              <div
                style={
                  redLabel
                }
              >
                TEAM OVERVIEW
              </div>

              <h2
                style={{
                  margin:
                    "6px 0 22px",
                }}
              >
                Takım Durumu
              </h2>

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(2,1fr)",

                  gap: "10px",
                }}
              >
                <BigStat
                  label="BÜTÇE"
                  value={
                    state
                      ? formatMoney(
                          state.budget
                        )
                      : "—"
                  }
                />

                <BigStat
                  label="TAKIM GÜCÜ"
                  value={
                    state
                      ? `${state.team_rating}`
                      : "—"
                  }
                />

                <BigStat
                  label="PUAN"
                  value={
                    state
                      ? `${state.season_points}`
                      : "0"
                  }
                />

                <BigStat
                  label="GALİBİYET"
                  value={
                    state
                      ? `${state.wins}`
                      : "0"
                  }
                />

                <BigStat
                  label="PODYUM"
                  value={
                    state
                      ? `${state.podiums}`
                      : "0"
                  }
                />

                <BigStat
                  label="ROUND"
                  value={`${data.season.current_round}/10`}
                />
              </div>
            </section>
          </div>

          {/* MANAGEMENT */}

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit,minmax(260px,1fr))",

              gap: "14px",

              marginBottom:
                "16px",
            }}
          >
            <DashboardLink
              href={`/arcade/manager/lobbies/${lobbyId}/game/team`}
              kicker="R&D"
              title="Takım Yönetimi"
              description="Aero, şasi, güç ünitesi ve dayanıklılığı geliştir."
            />

            <button
              type="button"

              onClick={
                openStrategy
              }

              style={{
                ...panel,

                padding:
                  "20px",

                color: "#fff",

                textAlign:
                  "left",

                cursor:
                  "pointer",

                minHeight:
                  "150px",

                position:
                  "relative",
              }}
            >
              <div
                style={
                  redLabel
                }
              >
                ROUND{" "}
                {
                  data.season
                    .current_round
                }
              </div>

              <h3
                style={{
                  margin:
                    "7px 0 6px",

                  fontSize:
                    "19px",
                }}
              >
                Yarış Stratejisi
              </h3>

              <div
                style={{
                  color:
                    "#727b85",

                  fontSize:
                    "10px",

                  lineHeight:
                    1.55,
                }}
              >
                Sayfadan ayrılmadan
                lastik, pit turu ve
                agresiflik ayarlarını
                değiştir.
              </div>

              <div
                style={{
                  marginTop:
                    "18px",

                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "space-between",
                }}
              >
                <strong
                  style={{
                    fontSize:
                      "9px",
                  }}
                >
                  PANELİ AÇ →
                </strong>

                <span
                  style={{
                    color:
                      strategySaved
                        ? "#67e697"
                        : "#bd8c55",

                    fontSize:
                      "8px",

                    fontWeight:
                      900,
                  }}
                >
                  {strategySaved
                    ? "✓ HAZIR"
                    : "AYARLANMADI"}
                </span>
              </div>
            </button>

            {lastFinishedRace ? (
              <DashboardLink
                href={`/arcade/manager/lobbies/${lobbyId}/game/results?round=${lastFinishedRace.round}`}
                kicker="LAST RESULT"
                title="Son Yarış Sonucu"
                description={`${lastFinishedRace.name} sonuçlarını tekrar görüntüle.`}
              />
            ) : (
              <InfoCard
                kicker="RESULTS"
                title="Henüz Yarış Yok"
                description="İlk yarış tamamlandıktan sonra sonuçlar burada görünecek."
              />
            )}
          </div>

          <SeasonEndCenter lobbyId={lobbyId} />

          <DriverContractCenter lobbyId={lobbyId} />

          <CareerArchive lobbyId={lobbyId} />

          <PaddockNews lobbyId={lobbyId} />

          {/* STANDINGS */}

          <section
            style={{
              ...panel,

              marginBottom:
                "16px",
            }}
          >
            <div
              style={
                panelHeader
              }
            >
              <div
                style={
                  redLabel
                }
              >
                CHAMPIONSHIP
              </div>

              <h2
                style={{
                  margin:
                    "6px 0 0",
                }}
              >
                Şampiyona Sıralaması
              </h2>
            </div>

            {data.standings.map(
              (
                standing,
                index
              ) => (
                <div
                  key={
                    standing.id
                  }

                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "55px 6px minmax(130px,1fr) minmax(130px,.8fr) 80px",

                    gap: "12px",

                    alignItems:
                      "center",

                    padding:
                      "15px 20px",

                    borderBottom:
                      "1px solid rgba(255,255,255,.045)",

                    background:
                      standing.user_id ===
                      data.currentUserId
                        ? "rgba(210,38,61,.055)"
                        : "transparent",
                  }}
                >
                  <strong
                    style={{
                      fontSize:
                        "19px",
                    }}
                  >
                    P
                    {index + 1}
                  </strong>

                  <div
                    style={{
                      height:
                        "30px",

                      borderRadius:
                        "999px",

                      background:
                        standing.teamColor,
                    }}
                  />

                  <div>
                    <div
                      style={{
                        fontSize:
                          "12px",

                        fontWeight:
                          900,
                      }}
                    >
                      {getProfileName(
                        standing
                      )}

                      {standing.is_bot && (
                        <span
                          style={{
                            marginLeft:
                              "7px",

                            padding:
                              "2px 5px",

                            borderRadius:
                              "5px",

                            background:
                              "rgba(255,255,255,.06)",

                            color:
                              "#737c86",

                            fontSize:
                              "7px",
                          }}
                        >
                          AI
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        color:
                          "#747d87",

                        fontSize:
                          "9px",

                        marginTop:
                          "3px",
                      }}
                    >
                      {
                        standing.teamName
                      }
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize:
                          "11px",

                        fontWeight:
                          800,
                      }}
                    >
                      {standing.driver
                        ?.name ??
                        "Pilot yok"}
                    </div>

                    <div
                      style={{
                        marginTop:
                          "3px",

                        color:
                          "#666f79",

                        fontSize:
                          "8px",
                      }}
                    >
                      W{" "}
                      {
                        standing.wins
                      }{" "}
                      · P{" "}
                      {
                        standing.podiums
                      }
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign:
                        "right",

                      fontSize:
                        "18px",

                      fontWeight:
                        900,
                    }}
                  >
                    {
                      standing.season_points
                    }

                    <div
                      style={{
                        color:
                          "#68717b",

                        fontSize:
                          "8px",
                      }}
                    >
                      PTS
                    </div>
                  </div>
                </div>
              )
            )}
          </section>

          {/* CALENDAR */}

          <section
            style={
              panel
            }
          >
            <div
              style={
                panelHeader
              }
            >
              <div
                style={
                  redLabel
                }
              >
                SEASON CALENDAR
              </div>

              <h2
                style={{
                  margin:
                    "6px 0 0",
                }}
              >
                Yarış Takvimi
              </h2>
            </div>

            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",

                gap: "1px",

                background:
                  "rgba(255,255,255,.045)",
              }}
            >
              {data.races.map(
                (race) => {
                  const current =
                    race.round ===
                    data.season
                      .current_round;

                  return (
                    <div
                      key={
                        race.id
                      }

                      style={{
                        minHeight:
                          "115px",

                        padding:
                          "17px",

                        background:
                          current
                            ? "rgba(210,38,61,.10)"
                            : "#080808",

                        border:
                          current
                            ? "1px solid rgba(210,38,61,.25)"
                            : "1px solid transparent",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          gap:
                            "10px",
                        }}
                      >
                        <div
                          style={
                            redLabel
                          }
                        >
                          ROUND{" "}
                          {
                            race.round
                          }
                        </div>

                        <div
                          style={{
                            color:
                              race.status ===
                              "finished"
                                ? "#70df99"
                                : current
                                ? "#ff7183"
                                : "#555",

                            fontSize:
                              "8px",

                            fontWeight:
                              900,
                          }}
                        >
                          {race.status ===
                          "finished"
                            ? "FINISHED"
                            : current
                            ? "NEXT"
                            : "SCHEDULED"}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop:
                            "10px",

                          fontWeight:
                            900,
                        }}
                      >
                        {
                          race.name
                        }
                      </div>

                      <div
                        style={{
                          marginTop:
                            "5px",

                          color:
                            "#68717b",

                          fontSize:
                            "9px",
                        }}
                      >
                        {
                          race.country
                        }
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </section>
        </div>
      </main>

      {/* STRATEGY DRAWER */}

      {strategyOpen && (
        <>
          <button
            type="button"

            aria-label="Strateji panelini kapat"

            onClick={() =>
              setStrategyOpen(
                false
              )
            }

            style={{
              position:
                "fixed",

              inset: 0,

              zIndex: 90,

              border: 0,

              background:
                "rgba(0,0,0,.72)",

              backdropFilter:
                "blur(5px)",

              animation:
                "fadeOverlay .2s ease",
            }}
          />

          <aside
            className="strategyDrawer"

            style={{
              position:
                "fixed",

              zIndex: 100,

              top: 0,
              right: 0,
              bottom: 0,

              overflowY:
                "auto",

              background:
                "#080808",

              borderLeft:
                "1px solid rgba(255,255,255,.09)",

              boxShadow:
                "-30px 0 90px rgba(0,0,0,.6)",

              animation:
                "drawerIn .28s cubic-bezier(.2,.8,.2,1)",
            }}
          >
            {/* DRAWER HEADER */}

            <div
              style={{
                position:
                  "sticky",

                top: 0,

                zIndex: 5,

                padding:
                  "22px",

                display:
                  "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "center",

                gap: "15px",

                borderBottom:
                  "1px solid rgba(255,255,255,.07)",

                background:
                  "rgba(8,8,8,.96)",

                backdropFilter:
                  "blur(15px)",
              }}
            >
              <div>
                <div
                  style={
                    redLabel
                  }
                >
                  RACE STRATEGY ·
                  ROUND{" "}
                  {
                    data.season
                      .current_round
                  }
                </div>

                <h2
                  style={{
                    margin:
                      "5px 0 0",

                    fontSize:
                      "25px",
                  }}
                >
                  {activeRace
                    ?.name ??
                    "Yarış Stratejisi"}
                </h2>
              </div>

              <button
                type="button"

                onClick={() =>
                  setStrategyOpen(
                    false
                  )
                }

                style={{
                  width:
                    "38px",

                  height:
                    "38px",

                  borderRadius:
                    "50%",

                  border:
                    "1px solid rgba(255,255,255,.10)",

                  background:
                    "rgba(255,255,255,.03)",

                  color:
                    "#fff",

                  cursor:
                    "pointer",

                  fontSize:
                    "18px",
                }}
              >
                ×
              </button>
            </div>

            {strategyLoading ? (
              <div
                style={{
                  padding:
                    "35px 22px",

                  color:
                    "#777",
                }}
              >
                Strateji
                yükleniyor...
              </div>
            ) : (
              <div
                style={{
                  padding:
                    "22px",

                  display:
                    "grid",

                  gap: "18px",
                }}
              >
                {/* STATUS */}

                <div
                  style={{
                    padding:
                      "15px",

                    borderRadius:
                      "12px",

                    border:
                      strategySaved
                        ? "1px solid rgba(86,226,139,.20)"
                        : "1px solid rgba(255,179,71,.18)",

                    background:
                      strategySaved
                        ? "rgba(86,226,139,.05)"
                        : "rgba(255,179,71,.045)",
                  }}
                >
                  <div
                    style={{
                      color:
                        strategySaved
                          ? "#70e49b"
                          : "#d6a05e",

                      fontSize:
                        "9px",

                      fontWeight:
                        900,
                    }}
                  >
                    {strategySaved
                      ? "✓ STRATEJİ KAYITLI"
                      : "STRATEJİ HENÜZ KAYDEDİLMEDİ"}
                  </div>
                </div>

                {/* PRESETS */}

                <DrawerSection
                  kicker="QUICK SETUP"
                  title="Hazır Stratejiler"
                >
                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "repeat(3,1fr)",

                      gap: "8px",
                    }}
                  >
                    <PresetButton
                      label="Güvenli"
                      description="Düşük risk"
                      onClick={() =>
                        applyPreset(
                          "safe"
                        )
                      }
                    />

                    <PresetButton
                      label="Dengeli"
                      description="Standart"
                      onClick={() =>
                        applyPreset(
                          "balanced"
                        )
                      }
                    />

                    <PresetButton
                      label="Atak"
                      description="Yüksek risk"
                      onClick={() =>
                        applyPreset(
                          "attack"
                        )
                      }
                    />
                  </div>
                </DrawerSection>

                {/* START TYRE */}

                <DrawerSection
                  kicker="STINT 01"
                  title="Başlangıç Lastiği"
                >
                  <TireSelector
                    value={
                      strategy.startingTire
                    }

                    onChange={(
                      tire
                    ) =>
                      setStrategy(
                        (current) => ({
                          ...current,

                          startingTire:
                            tire,
                        })
                      )
                    }
                  />
                </DrawerSection>

                {/* SECOND TYRE */}

                <DrawerSection
                  kicker="STINT 02"
                  title="İkinci Lastik"
                >
                  <TireSelector
                    value={
                      strategy.secondTire
                    }

                    onChange={(
                      tire
                    ) =>
                      setStrategy(
                        (current) => ({
                          ...current,

                          secondTire:
                            tire,
                        })
                      )
                    }
                  />
                </DrawerSection>

                {/* PIT */}

                <DrawerSection
                  kicker="PIT WINDOW"
                  title="Pit Stop Turu"
                >
                  <div
                    style={{
                      display:
                        "flex",

                      justifyContent:
                        "space-between",

                      alignItems:
                        "flex-end",

                      marginBottom:
                        "15px",
                    }}
                  >
                    <div
                      style={{
                        color:
                          "#6e7780",

                        fontSize:
                          "10px",
                      }}
                    >
                      Planlanan pit
                      turu
                    </div>

                    <strong
                      style={{
                        fontSize:
                          "35px",

                        lineHeight: 1,
                      }}
                    >
                      LAP{" "}
                      {
                        strategy.pitLap
                      }
                    </strong>
                  </div>

                  <input
                    type="range"

                    min="1"
                    max="70"

                    value={
                      strategy.pitLap
                    }

                    onChange={(
                      event
                    ) =>
                      setStrategy(
                        (current) => ({
                          ...current,

                          pitLap:
                            Number(
                              event
                                .target
                                .value
                            ),
                        })
                      )
                    }

                    style={{
                      width:
                        "100%",

                      accentColor:
                        "#d2263d",
                    }}
                  />

                  <div
                    style={
                      rangeEnds
                    }
                  >
                    <span>
                      LAP 1
                    </span>

                    <span>
                      LAP 70
                    </span>
                  </div>
                </DrawerSection>

                {/* AGGRESSION */}

                <DrawerSection
                  kicker="DRIVER MODE"
                  title="Agresiflik"
                >
                  <div
                    style={{
                      display:
                        "flex",

                      justifyContent:
                        "space-between",

                      alignItems:
                        "center",

                      marginBottom:
                        "14px",
                    }}
                  >
                    <div
                      style={{
                        color:
                          getAggressionColor(
                            strategy.aggression
                          ),

                        fontSize:
                          "11px",

                        fontWeight:
                          900,
                      }}
                    >
                      {getAggressionName(
                        strategy.aggression
                      )}
                    </div>

                    <strong
                      style={{
                        fontSize:
                          "31px",
                      }}
                    >
                      {
                        strategy.aggression
                      }
                      %
                    </strong>
                  </div>

                  <input
                    type="range"

                    min="0"
                    max="100"

                    value={
                      strategy.aggression
                    }

                    onChange={(
                      event
                    ) =>
                      setStrategy(
                        (current) => ({
                          ...current,

                          aggression:
                            Number(
                              event
                                .target
                                .value
                            ),
                        })
                      )
                    }

                    style={{
                      width:
                        "100%",

                      accentColor:
                        getAggressionColor(
                          strategy.aggression
                        ),
                    }}
                  />

                  <div
                    style={
                      rangeEnds
                    }
                  >
                    <span>
                      KONTROLLÜ
                    </span>

                    <span>
                      MAKSİMUM
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop:
                        "12px",

                      padding:
                        "11px",

                      borderRadius:
                        "9px",

                      background:
                        "rgba(255,255,255,.025)",

                      color:
                        "#69727c",

                      fontSize:
                        "9px",

                      lineHeight:
                        1.5,
                    }}
                  >
                    Yüksek
                    agresiflik tempo
                    kazandırabilir,
                    ancak pilot
                    hatası ve temas
                    riskini artırır.
                  </div>
                </DrawerSection>

                {/* SUMMARY */}

                <DrawerSection
                  kicker="SUMMARY"
                  title="Yarış Planı"
                >
                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "repeat(2,1fr)",

                      gap: "8px",
                    }}
                  >
                    <StrategySummary
                      label="START"
                      value={
                        strategy.startingTire.toUpperCase()
                      }
                    />

                    <StrategySummary
                      label="SECOND"
                      value={
                        strategy.secondTire.toUpperCase()
                      }
                    />

                    <StrategySummary
                      label="PIT"
                      value={`LAP ${strategy.pitLap}`}
                    />

                    <StrategySummary
                      label="AGGRESSION"
                      value={`${strategy.aggression}%`}
                    />
                  </div>
                </DrawerSection>

                {strategyMessage && (
                  <div
                    style={{
                      padding:
                        "12px",

                      borderRadius:
                        "10px",

                      border:
                        strategyMessage.includes(
                          "kaydedildi"
                        )
                          ? "1px solid rgba(86,226,139,.20)"
                          : "1px solid rgba(210,38,61,.25)",

                      background:
                        strategyMessage.includes(
                          "kaydedildi"
                        )
                          ? "rgba(86,226,139,.06)"
                          : "rgba(210,38,61,.06)",

                      color:
                        strategyMessage.includes(
                          "kaydedildi"
                        )
                          ? "#75e99f"
                          : "#ff7685",

                      fontSize:
                        "10px",
                    }}
                  >
                    {
                      strategyMessage
                    }
                  </div>
                )}

                <button
                  type="button"

                  disabled={
                    strategySaving
                  }

                  onClick={
                    saveStrategy
                  }

                  style={{
                    minHeight:
                      "54px",

                    border: 0,

                    borderRadius:
                      "11px",

                    background:
                      strategySaving
                        ? "#641923"
                        : "#d2263d",

                    color:
                      "#fff",

                    cursor:
                      strategySaving
                        ? "not-allowed"
                        : "pointer",

                    fontWeight:
                      1000,

                    animation:
                      strategySaved
                        ? "savedPulse 2s ease"
                        : "none",
                  }}
                >
                  {strategySaving
                    ? "KAYDEDİLİYOR..."
                    : strategySaved
                    ? "STRATEJİYİ GÜNCELLE"
                    : "STRATEJİYİ KAYDET"}
                </button>
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
}

function DrawerSection({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children:
    React.ReactNode;
}) {
  return (
    <section
      style={{
        padding:
          "17px",

        border:
          "1px solid rgba(255,255,255,.065)",

        borderRadius:
          "13px",

        background:
          "rgba(255,255,255,.018)",
      }}
    >
      <div
        style={
          redLabel
        }
      >
        {kicker}
      </div>

      <h3
        style={{
          margin:
            "5px 0 17px",

          fontSize:
            "17px",
        }}
      >
        {title}
      </h3>

      {children}
    </section>
  );
}

function TireSelector({
  value,
  onChange,
}: {
  value: Tire;

  onChange: (
    tire: Tire
  ) => void;
}) {
  const tires: {
    key: Tire;
    label: string;
    color: string;
    description: string;
  }[] = [
    {
      key: "soft",
      label: "SOFT",
      color: "#ff4052",
      description:
        "Hızlı · Daha fazla aşınma",
    },

    {
      key: "medium",
      label: "MEDIUM",
      color: "#ffd84d",
      description:
        "Dengeli",
    },

    {
      key: "hard",
      label: "HARD",
      color: "#eeeeee",
      description:
        "Dayanıklı · Daha yavaş",
    },
  ];

  return (
    <div
      style={{
        display:
          "grid",

        gap: "8px",
      }}
    >
      {tires.map(
        (tire) => {
          const selected =
            value ===
            tire.key;

          return (
            <button
              key={
                tire.key
              }

              type="button"

              onClick={() =>
                onChange(
                  tire.key
                )
              }

              style={{
                minHeight:
                  "64px",

                display:
                  "grid",

                gridTemplateColumns:
                  "42px 1fr auto",

                gap: "11px",

                alignItems:
                  "center",

                padding:
                  "9px 12px",

                border:
                  selected
                    ? `1px solid ${tire.color}`
                    : "1px solid rgba(255,255,255,.07)",

                borderRadius:
                  "10px",

                background:
                  selected
                    ? `${tire.color}0d`
                    : "rgba(255,255,255,.015)",

                color:
                  "#fff",

                cursor:
                  "pointer",

                textAlign:
                  "left",
              }}
            >
              <div
                style={{
                  width:
                    "34px",

                  height:
                    "34px",

                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  borderRadius:
                    "50%",

                  border:
                    `3px solid ${tire.color}`,

                  color:
                    tire.color,

                  fontWeight:
                    1000,

                  fontSize:
                    "9px",
                }}
              >
                {
                  tire.label[0]
                }
              </div>

              <div>
                <strong
                  style={{
                    fontSize:
                      "11px",
                  }}
                >
                  {
                    tire.label
                  }
                </strong>

                <div
                  style={{
                    marginTop:
                      "3px",

                    color:
                      "#69727b",

                    fontSize:
                      "8px",
                  }}
                >
                  {
                    tire.description
                  }
                </div>
              </div>

              <div
                style={{
                  color:
                    selected
                      ? tire.color
                      : "#444",

                  fontSize:
                    "16px",
                }}
              >
                {selected
                  ? "✓"
                  : "○"}
              </div>
            </button>
          );
        }
      )}
    </div>
  );
}

function PresetButton({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"

      onClick={
        onClick
      }

      style={{
        minHeight:
          "65px",

        padding:
          "9px",

        border:
          "1px solid rgba(255,255,255,.07)",

        borderRadius:
          "9px",

        background:
          "rgba(255,255,255,.018)",

        color:
          "#fff",

        cursor:
          "pointer",
      }}
    >
      <strong
        style={{
          display:
            "block",

          fontSize:
            "9px",
        }}
      >
        {label}
      </strong>

      <span
        style={{
          display:
            "block",

          marginTop:
            "4px",

          color:
            "#69727b",

          fontSize:
            "7px",
        }}
      >
        {description}
      </span>
    </button>
  );
}

function StrategySummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding:
          "12px",

        borderRadius:
          "9px",

        background:
          "rgba(255,255,255,.025)",
      }}
    >
      <div
        style={{
          color:
            "#626b74",

          fontSize:
            "7px",

          fontWeight:
            900,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          display:
            "block",

          marginTop:
            "5px",

          fontSize:
            "14px",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function getAggressionName(
  value: number
) {
  if (value < 30) {
    return "KONTROLLÜ";
  }

  if (value < 60) {
    return "DENGELİ";
  }

  if (value < 80) {
    return "ATAK";
  }

  return "MAKSİMUM ATAK";
}

function getAggressionColor(
  value: number
) {
  if (value < 30) {
    return "#70df99";
  }

  if (value < 60) {
    return "#ddd76a";
  }

  if (value < 80) {
    return "#ff9c4a";
  }

  return "#ff5263";
}

function DriverStats({
  driver,
  color,
}: {
  driver: Driver;
  color: string;
}) {
  const stats = [
    [
      "PACE",
      driver.pace,
    ],

    [
      "CONSISTENCY",
      driver.consistency,
    ],

    [
      "WET",
      driver.wet,
    ],

    [
      "RACECRAFT",
      driver.racecraft,
    ],

    [
      "POTENTIAL",
      driver.potential,
    ],
  ] as const;

  return (
    <div
      style={{
        display:
          "grid",

        gap: "9px",
      }}
    >
      {stats.map(
        ([
          label,
          value,
        ]) => (
          <div
            key={
              label
            }
          >
            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "space-between",

                marginBottom:
                  "4px",

                color:
                  "#737c86",

                fontSize:
                  "8px",

                fontWeight:
                  900,
              }}
            >
              <span>
                {label}
              </span>

              <span
                style={{
                  color:
                    "#fff",
                }}
              >
                {value}
              </span>
            </div>

            <div
              style={{
                height:
                  "4px",

                borderRadius:
                  "999px",

                overflow:
                  "hidden",

                background:
                  "rgba(255,255,255,.07)",
              }}
            >
              <div
                style={{
                  width:
                    `${value}%`,

                  height:
                    "100%",

                  background:
                    color,
                }}
              />
            </div>
          </div>
        )
      )}
    </div>
  );
}

function BigStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding:
          "16px",

        border:
          "1px solid rgba(255,255,255,.055)",

        borderRadius:
          "12px",

        background:
          "rgba(255,255,255,.018)",
      }}
    >
      <div
        style={{
          color:
            "#69727c",

          fontSize:
            "8px",

          fontWeight:
            900,

          letterSpacing:
            "1px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            "6px",

          fontSize:
            "22px",

          fontWeight:
            900,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DashboardLink({
  href,
  kicker,
  title,
  description,
}: {
  href: string;
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={
        href
      }

      style={{
        ...panel,

        display:
          "block",

        padding:
          "20px",

        color:
          "#fff",

        textDecoration:
          "none",
      }}
    >
      <div
        style={
          redLabel
        }
      >
        {kicker}
      </div>

      <h3
        style={{
          margin:
            "7px 0 6px",

          fontSize:
            "19px",
        }}
      >
        {title}
      </h3>

      <div
        style={{
          color:
            "#727b85",

          fontSize:
            "10px",

          lineHeight:
            1.55,
        }}
      >
        {description}
      </div>

      <div
        style={{
          marginTop:
            "18px",

          fontSize:
            "9px",

          fontWeight:
            900,
        }}
      >
        AÇ →
      </div>
    </Link>
  );
}

function InfoCard({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        ...panel,

        padding:
          "20px",
      }}
    >
      <div
        style={
          redLabel
        }
      >
        {kicker}
      </div>

      <h3
        style={{
          margin:
            "7px 0 6px",

          fontSize:
            "19px",
        }}
      >
        {title}
      </h3>

      <div
        style={{
          color:
            "#727b85",

          fontSize:
            "10px",

          lineHeight:
            1.55,
        }}
      >
        {description}
      </div>
    </div>
  );
}

function getProfileName(
  standing: Standing
) {
  return (
    standing.profile
      ?.display_name ||
    standing.profile
      ?.username ||
    standing.bot_name ||
    "Menajer"
  );
}

function formatMoney(
  amount: number
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",

      currency:
        "EUR",

      maximumFractionDigits:
        0,
    }
  ).format(
    amount
  );
}

const panel: CSSProperties =
  {
    border:
      "1px solid rgba(255,255,255,.075)",

    borderRadius:
      "18px",

    background:
      "rgba(255,255,255,.02)",

    overflow:
      "hidden",
  };

const panelHeader:
  CSSProperties = {
    padding:
      "19px 20px",

    borderBottom:
      "1px solid rgba(255,255,255,.06)",
  };

const redLabel:
  CSSProperties = {
    color:
      "#d2263d",

    fontSize:
      "9px",

    fontWeight:
      900,

    letterSpacing:
      "1.4px",
  };

const rangeEnds:
  CSSProperties = {
    display:
      "flex",

    justifyContent:
      "space-between",

    marginTop:
      "6px",

    color:
      "#505861",

    fontSize:
      "7px",

    fontWeight:
      900,
  };

const topBadge:
  CSSProperties = {
    padding:
      "8px 11px",

    borderRadius:
      "8px",

    border:
      "1px solid rgba(255,255,255,.08)",

    background:
      "rgba(255,255,255,.02)",

    color:
      "#777",

    fontSize:
      "8px",

    fontWeight:
      900,
  };

const loadingStyle:
  CSSProperties = {
    minHeight:
      "100vh",

    background:
      "#050505",

    color:
      "#fff",

    padding:
      "100px 24px",
  };