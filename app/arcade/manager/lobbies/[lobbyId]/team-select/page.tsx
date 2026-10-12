"use client";

import {
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import Header from "@/components/Header";

type Difficulty =
  | "easy"
  | "normal"
  | "hard"
  | "expert";

type Driver = {
  key: string;
  name: string;
  image: string;

  pace: number;
  consistency: number;
  wet: number;
  racecraft: number;
  potential: number;
};

type Team = {
  key: string;
  name: string;
  color: string;
  carImage: string;
  drivers: Driver[];
};

type Member = {
  id: string;
  user_id: string;

  team_key:
    | string
    | null;

  driver_key:
    | string
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

type Data = {
  lobby: {
    id: string;
    name: string;
    created_by: string;
    status: string;

    ai_difficulty:
      Difficulty;
  };

  members: Member[];

  teams: Team[];

  currentUserId: string;

  isOwner: boolean;
};

type Stage =
  | "team"
  | "driver"
  | "confirm";

const DIFFICULTIES: {
  key: Difficulty;
  name: string;
  description: string;
}[] = [
  {
    key: "easy",
    name: "Kolay",

    description:
      "AI daha fazla strateji hatası yapar ve ideal pit penceresini sık kaçırır.",
  },

  {
    key: "normal",
    name: "Normal",

    description:
      "Dengeli AI. Genellikle mantıklı stratejiler seçer fakat kusursuz değildir.",
  },

  {
    key: "hard",
    name: "Zor",

    description:
      "AI stratejiyi iyi optimize eder ve pilot/takım avantajlarını etkili kullanır.",
  },

  {
    key: "expert",
    name: "Uzman",

    description:
      "AI pit, lastik ve agresiflik kararlarında ideale çok yakın davranır.",
  },
];

export default function TeamSelectPage({
  params,
}: {
  params: Promise<{
    lobbyId: string;
  }>;
}) {
  const { lobbyId } =
    use(params);

  const [data, setData] =
    useState<Data | null>(
      null
    );

  const [stage, setStage] =
    useState<Stage>(
      "team"
    );

  const [
    selectedTeamKey,
    setSelectedTeamKey,
  ] =
    useState<string | null>(
      null
    );

  const [
    selectedDriverKey,
    setSelectedDriverKey,
  ] =
    useState<string | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    difficultySaving,
    setDifficultySaving,
  ] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const initializedRef =
    useRef(false);

  async function load() {
    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/team-selection`,
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
            "Takım seçimi yüklenemedi."
        );

        return;
      }

      if (
        result.lobby
          ?.status ===
        "active"
      ) {
        window.location.replace(
          `/arcade/manager/lobbies/${lobbyId}/game`
        );

        return;
      }

      setData(result);

      if (
        !initializedRef.current
      ) {
        initializedRef.current =
          true;

        const me =
          result.members.find(
            (
              member: Member
            ) =>
              member.user_id ===
              result.currentUserId
          );

        if (
          me?.team_key &&
          me?.driver_key
        ) {
          setSelectedTeamKey(
            me.team_key
          );

          setSelectedDriverKey(
            me.driver_key
          );

          setStage(
            "confirm"
          );
        } else if (
          me?.team_key
        ) {
          setSelectedTeamKey(
            me.team_key
          );

          setStage(
            "driver"
          );
        }
      }
    } catch {
      setMessage(
        "Sunucuya bağlanılamadı."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const interval =
      window.setInterval(
        load,
        3000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [lobbyId]);

  const selectedTeam =
    useMemo(
      () =>
        data?.teams.find(
          (team) =>
            team.key ===
            selectedTeamKey
        ) ?? null,
      [
        data,
        selectedTeamKey,
      ]
    );

  const selectedDriver =
    useMemo(
      () =>
        selectedTeam?.drivers.find(
          (driver) =>
            driver.key ===
            selectedDriverKey
        ) ?? null,
      [
        selectedTeam,
        selectedDriverKey,
      ]
    );

  const me =
    data?.members.find(
      (member) =>
        member.user_id ===
        data.currentUserId
    );

  const allReady =
    !!data &&
    data.members.length > 0 &&
    data.members.every(
      (member) =>
        !!member.team_key &&
        !!member.driver_key
    );

  const expectedBots =
    data
      ? Math.max(
          0,
          data.teams.length -
            new Set(
              data.members
                .map(
                  (member) =>
                    member.team_key
                )
                .filter(Boolean)
            ).size
        )
      : 0;

  function isTeamTaken(
    teamKey: string
  ) {
    if (!data) {
      return false;
    }

    return data.members.some(
      (member) =>
        member.user_id !==
          data.currentUserId &&
        member.team_key ===
          teamKey
    );
  }

  function isDriverTaken(
    driverKey: string
  ) {
    if (!data) {
      return false;
    }

    return data.members.some(
      (member) =>
        member.user_id !==
          data.currentUserId &&
        member.driver_key ===
          driverKey
    );
  }

  function selectTeam(
    teamKey: string
  ) {
    if (
      isTeamTaken(
        teamKey
      )
    ) {
      return;
    }

    setMessage("");

    setSelectedTeamKey(
      teamKey
    );

    setSelectedDriverKey(
      null
    );

    setStage(
      "driver"
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function selectDriver(
    driverKey: string
  ) {
    if (
      isDriverTaken(
        driverKey
      )
    ) {
      return;
    }

    setMessage("");

    setSelectedDriverKey(
      driverKey
    );
  }

  async function setDifficulty(
    difficulty: Difficulty
  ) {
    if (
      !data?.isOwner ||
      difficultySaving
    ) {
      return;
    }

    setDifficultySaving(
      true
    );

    setMessage("");

    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/team-selection`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "set_ai_difficulty",

                difficulty,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ||
            "AI zorluğu kaydedilemedi."
        );

        return;
      }

      setData(
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,

            lobby: {
              ...current.lobby,

              ai_difficulty:
                difficulty,
            },
          };
        }
      );
    } catch {
      setMessage(
        "AI zorluğu kaydedilirken bağlantı hatası oluştu."
      );
    } finally {
      setDifficultySaving(
        false
      );
    }
  }

  async function saveSelection() {
    if (
      !selectedTeamKey ||
      !selectedDriverKey
    ) {
      setMessage(
        "Önce takım ve pilot seçmelisin."
      );

      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/team-selection`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "select",

                teamKey:
                  selectedTeamKey,

                driverKey:
                  selectedDriverKey,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ||
            "Seçim kaydedilemedi."
        );

        await load();

        return;
      }

      setData(
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,

            members:
              current.members.map(
                (member) =>
                  member.user_id ===
                  current.currentUserId
                    ? {
                        ...member,

                        team_key:
                          selectedTeamKey,

                        driver_key:
                          selectedDriverKey,
                      }
                    : member
              ),
          };
        }
      );

      setStage(
        "confirm"
      );

      setMessage(
        "Takım ve pilot seçimin kaydedildi."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch {
      setMessage(
        "Seçim kaydedilirken bağlantı hatası oluştu."
      );
    } finally {
      setSaving(false);
    }
  }

  async function startSeason() {
    if (
      !data?.isOwner ||
      !allReady
    ) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/team-selection`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "start_season",
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ||
            "Sezon başlatılamadı."
        );

        return;
      }

      window.location.href =
        result.next;
    } catch {
      setMessage(
        "Sezon başlatılırken bağlantı hatası oluştu."
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
          style={
            loadingStyle
          }
        >
          2026 grid
          hazırlanıyor...
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
            "Takım seçimi yüklenemedi."}
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
            "radial-gradient(circle at 50% -10%, rgba(210,38,61,.17), transparent 32%), #050505",

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
          <div
            style={{
              marginBottom:
                "28px",
            }}
          >
            <div
              style={redLabel}
            >
              MANAGER · 2026
            </div>

            <h1
              style={{
                margin:
                  "7px 0 0",

                fontSize:
                  "clamp(38px,6vw,70px)",

                lineHeight: 1,

                letterSpacing:
                  "-3px",
              }}
            >
              {stage ===
              "team"
                ? "Takımını Seç"
                : stage ===
                  "driver"
                ? "Pilotunu Seç"
                : "Grid Hazır"}
            </h1>

            <p
              style={{
                maxWidth:
                  "720px",

                color:
                  "#78818b",

                lineHeight:
                  1.6,

                fontSize:
                  "13px",
              }}
            >
              Oyuncuların seçmediği
              takımlar sezon
              başlatıldığında AI
              menajerler tarafından
              doldurulacak.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom:
                "24px",
            }}
          >
            <Step
              number="01"
              text="TAKIM"
              active={
                stage ===
                "team"
              }
              complete={
                !!selectedTeamKey
              }
            />

            <Step
              number="02"
              text="PİLOT"
              active={
                stage ===
                "driver"
              }
              complete={
                !!selectedDriverKey
              }
            />

            <Step
              number="03"
              text="GRID"
              active={
                stage ===
                "confirm"
              }
              complete={
                !!me?.team_key &&
                !!me?.driver_key
              }
            />
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

          {stage ===
            "team" && (
            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit,minmax(300px,1fr))",

                gap: "14px",
              }}
            >
              {data.teams.map(
                (team) => {
                  const taken =
                    isTeamTaken(
                      team.key
                    );

                  const owner =
                    data.members.find(
                      (member) =>
                        member.user_id !==
                          data.currentUserId &&
                        member.team_key ===
                          team.key
                    );

                  return (
                    <button
                      key={
                        team.key
                      }

                      type="button"

                      disabled={
                        taken
                      }

                      onClick={() =>
                        selectTeam(
                          team.key
                        )
                      }

                      style={{
                        position:
                          "relative",

                        minHeight:
                          "270px",

                        padding: 0,

                        overflow:
                          "hidden",

                        textAlign:
                          "left",

                        cursor:
                          taken
                            ? "not-allowed"
                            : "pointer",

                        border:
                          "1px solid rgba(255,255,255,.075)",

                        borderRadius:
                          "18px",

                        background:
                          `linear-gradient(145deg, ${team.color}18, rgba(255,255,255,.012))`,

                        color:
                          "#fff",

                        opacity:
                          taken
                            ? 0.42
                            : 1,
                      }}
                    >
                      <div
                        style={{
                          position:
                            "absolute",

                          top: 0,
                          left: 0,

                          width:
                            "100%",

                          height:
                            "4px",

                          background:
                            team.color,
                        }}
                      />

                      <div
                        style={{
                          padding:
                            "20px 20px 0",
                        }}
                      >
                        <div
                          style={{
                            color:
                              team.color,

                            fontSize:
                              "9px",

                            fontWeight:
                              900,

                            letterSpacing:
                              "1.5px",
                          }}
                        >
                          2026 TEAM
                        </div>

                        <h2
                          style={{
                            margin:
                              "5px 0 0",

                            fontSize:
                              "25px",
                          }}
                        >
                          {
                            team.name
                          }
                        </h2>
                      </div>

                      <div
                        style={{
                          height:
                            "160px",

                          display:
                            "flex",

                          alignItems:
                            "center",

                          justifyContent:
                            "center",

                          padding:
                            "0 12px",
                        }}
                      >
                        <img
                          src={
                            team.carImage
                          }

                          alt={
                            team.name
                          }

                          style={{
                            width:
                              "100%",

                            height:
                              "100%",

                            objectFit:
                              "contain",

                            transform:
                              "scale(1.08)",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          padding:
                            "0 20px 18px",

                          fontSize:
                            "10px",

                          fontWeight:
                            900,
                        }}
                      >
                        {taken
                          ? `${getMemberName(
                              owner
                            )} SEÇTİ`
                          : "SEÇ →"}
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}

          {stage ===
            "driver" &&
            selectedTeam && (
              <>
                <button
                  type="button"

                  onClick={() => {
                    setStage(
                      "team"
                    );

                    setSelectedDriverKey(
                      null
                    );
                  }}

                  style={
                    backButtonStyle
                  }
                >
                  ← Takımlara Dön
                </button>

                <section
                  style={{
                    ...panelStyle,

                    marginTop:
                      "14px",

                    padding:
                      "22px",

                    border:
                      `1px solid ${selectedTeam.color}35`,

                    background:
                      `linear-gradient(120deg, ${selectedTeam.color}14, rgba(255,255,255,.015))`,
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",

                      justifyContent:
                        "space-between",

                      alignItems:
                        "center",

                      gap: "20px",

                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          ...redLabel,

                          color:
                            selectedTeam.color,
                        }}
                      >
                        SELECTED TEAM
                      </div>

                      <h2
                        style={{
                          margin:
                            "6px 0 0",

                          fontSize:
                            "32px",
                        }}
                      >
                        {
                          selectedTeam.name
                        }
                      </h2>
                    </div>

                    <img
                      src={
                        selectedTeam.carImage
                      }

                      alt={
                        selectedTeam.name
                      }

                      style={{
                        width:
                          "min(430px,100%)",

                        height:
                          "120px",

                        objectFit:
                          "contain",
                      }}
                    />
                  </div>
                </section>

                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(300px,1fr))",

                    gap: "16px",

                    marginTop:
                      "16px",
                  }}
                >
                  {selectedTeam.drivers.map(
                    (driver) => {
                      const selected =
                        driver.key ===
                        selectedDriverKey;

                      const taken =
                        isDriverTaken(
                          driver.key
                        );

                      return (
                        <button
                          key={
                            driver.key
                          }

                          type="button"

                          disabled={
                            taken
                          }

                          onClick={() =>
                            selectDriver(
                              driver.key
                            )
                          }

                          style={{
                            minHeight:
                              "530px",

                            padding: 0,

                            overflow:
                              "hidden",

                            textAlign:
                              "left",

                            border:
                              selected
                                ? `2px solid ${selectedTeam.color}`
                                : "1px solid rgba(255,255,255,.08)",

                            borderRadius:
                              "20px",

                            background:
                              `linear-gradient(180deg, ${selectedTeam.color}16, rgba(255,255,255,.015))`,

                            color:
                              "#fff",

                            cursor:
                              taken
                                ? "not-allowed"
                                : "pointer",

                            opacity:
                              taken
                                ? 0.4
                                : 1,
                          }}
                        >
                          <div
                            style={{
                              height:
                                "310px",

                              display:
                                "flex",

                              alignItems:
                                "flex-end",

                              justifyContent:
                                "center",
                            }}
                          >
                            <img
                              src={
                                driver.image
                              }

                              alt={
                                driver.name
                              }

                              style={{
                                width:
                                  "100%",

                                height:
                                  "100%",

                                objectFit:
                                  "contain",

                                objectPosition:
                                  "center bottom",
                              }}
                            />
                          </div>

                          <div
                            style={{
                              padding:
                                "18px",
                            }}
                          >
                            <div
                              style={{
                                ...redLabel,

                                color:
                                  selectedTeam.color,
                              }}
                            >
                              2026 DRIVER
                            </div>

                            <h2
                              style={{
                                margin:
                                  "5px 0 14px",

                                fontSize:
                                  "27px",
                              }}
                            >
                              {
                                driver.name
                              }
                            </h2>

                            <Stats
                              driver={
                                driver
                              }

                              color={
                                selectedTeam.color
                              }
                            />

                            <div
                              style={{
                                marginTop:
                                  "16px",

                                fontSize:
                                  "11px",

                                fontWeight:
                                  900,
                              }}
                            >
                              {selected
                                ? "✓ SEÇİLDİ"
                                : "PİLOTU SEÇ"}
                            </div>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>

                <div
                  style={{
                    display:
                      "flex",

                    justifyContent:
                      "flex-end",

                    marginTop:
                      "18px",
                  }}
                >
                  <button
                    type="button"

                    disabled={
                      !selectedDriverKey ||
                      saving
                    }

                    onClick={
                      saveSelection
                    }

                    style={
                      primaryButton
                    }
                  >
                    Takım + Pilotu
                    Onayla
                  </button>
                </div>
              </>
            )}

          {stage ===
            "confirm" &&
            selectedTeam &&
            selectedDriver && (
              <>
                <section
                  style={{
                    ...panelStyle,

                    position:
                      "relative",

                    minHeight:
                      "420px",

                    padding:
                      "35px",

                    overflow:
                      "hidden",

                    border:
                      `1px solid ${selectedTeam.color}35`,

                    background:
                      `radial-gradient(circle at 80% 70%, ${selectedTeam.color}25, transparent 40%), #080808`,
                  }}
                >
                  <img
                    src={
                      selectedDriver.image
                    }

                    alt={
                      selectedDriver.name
                    }

                    style={{
                      position:
                        "absolute",

                      right:
                        "4%",

                      bottom: 0,

                      height:
                        "92%",

                      maxWidth:
                        "44%",

                      objectFit:
                        "contain",
                    }}
                  />

                  <div
                    style={{
                      position:
                        "relative",

                      zIndex: 2,

                      width:
                        "55%",
                    }}
                  >
                    <div
                      style={{
                        ...redLabel,

                        color:
                          selectedTeam.color,
                      }}
                    >
                      YOUR ENTRY
                    </div>

                    <h1
                      style={{
                        margin:
                          "8px 0",

                        fontSize:
                          "clamp(40px,5vw,65px)",

                        lineHeight:
                          0.95,
                      }}
                    >
                      {
                        selectedTeam.name
                      }
                    </h1>

                    <div
                      style={{
                        color:
                          selectedTeam.color,

                        fontWeight:
                          900,
                      }}
                    >
                      ×{" "}
                      {
                        selectedDriver.name
                      }
                    </div>
                  </div>
                </section>

                {/* AI DIFFICULTY */}

                <section
                  style={{
                    ...panelStyle,

                    marginTop:
                      "16px",
                  }}
                >
                  <div
                    style={{
                      padding:
                        "20px",

                      borderBottom:
                        "1px solid rgba(255,255,255,.06)",
                    }}
                  >
                    <div
                      style={
                        redLabel
                      }
                    >
                      AI OPPONENTS
                    </div>

                    <h2
                      style={{
                        margin:
                          "6px 0 4px",
                      }}
                    >
                      Yapay Zeka
                      Zorluğu
                    </h2>

                    <div
                      style={{
                        color:
                          "#747d87",

                        fontSize:
                          "10px",
                      }}
                    >
                      {
                        expectedBots
                      }{" "}
                      boş takım AI
                      tarafından
                      doldurulacak.
                    </div>
                  </div>

                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "repeat(auto-fit,minmax(190px,1fr))",

                      gap: "10px",

                      padding:
                        "16px",
                    }}
                  >
                    {DIFFICULTIES.map(
                      (
                        difficulty
                      ) => {
                        const selected =
                          data.lobby
                            .ai_difficulty ===
                          difficulty.key;

                        return (
                          <button
                            key={
                              difficulty.key
                            }

                            type="button"

                            disabled={
                              !data.isOwner ||
                              difficultySaving
                            }

                            onClick={() =>
                              setDifficulty(
                                difficulty.key
                              )
                            }

                            style={{
                              minHeight:
                                "120px",

                              padding:
                                "15px",

                              textAlign:
                                "left",

                              border:
                                selected
                                  ? "1px solid #d2263d"
                                  : "1px solid rgba(255,255,255,.07)",

                              borderRadius:
                                "12px",

                              background:
                                selected
                                  ? "rgba(210,38,61,.10)"
                                  : "rgba(255,255,255,.02)",

                              color:
                                "#fff",

                              cursor:
                                data.isOwner
                                  ? "pointer"
                                  : "default",
                            }}
                          >
                            <strong>
                              {
                                difficulty.name
                              }
                            </strong>

                            <div
                              style={{
                                marginTop:
                                  "8px",

                                color:
                                  "#737c86",

                                fontSize:
                                  "9px",

                                lineHeight:
                                  1.5,
                              }}
                            >
                              {
                                difficulty.description
                              }
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </section>

                {/* PLAYERS */}

                <section
                  style={{
                    ...panelStyle,

                    marginTop:
                      "16px",
                  }}
                >
                  <div
                    style={{
                      padding:
                        "19px 20px",

                      borderBottom:
                        "1px solid rgba(255,255,255,.06)",
                    }}
                  >
                    <div
                      style={
                        redLabel
                      }
                    >
                      HUMAN GRID
                    </div>

                    <h2
                      style={{
                        margin:
                          "5px 0 0",
                      }}
                    >
                      Oyuncular
                    </h2>
                  </div>

                  {data.members.map(
                    (member) => {
                      const team =
                        data.teams.find(
                          (item) =>
                            item.key ===
                            member.team_key
                        );

                      const driver =
                        team?.drivers.find(
                          (item) =>
                            item.key ===
                            member.driver_key
                        );

                      return (
                        <div
                          key={
                            member.id
                          }

                          style={{
                            display:
                              "flex",

                            justifyContent:
                              "space-between",

                            padding:
                              "15px 20px",

                            borderBottom:
                              "1px solid rgba(255,255,255,.045)",
                          }}
                        >
                          <div>
                            <strong>
                              {getMemberName(
                                member
                              )}
                            </strong>

                            <div
                              style={{
                                marginTop:
                                  "4px",

                                color:
                                  "#747d87",

                                fontSize:
                                  "10px",
                              }}
                            >
                              {team &&
                              driver
                                ? `${team.name} · ${driver.name}`
                                : "Seçim yapıyor..."}
                            </div>
                          </div>

                          <strong
                            style={{
                              color:
                                team &&
                                driver
                                  ? "#70df99"
                                  : "#777",

                              fontSize:
                                "9px",
                            }}
                          >
                            {team &&
                            driver
                              ? "READY"
                              : "WAITING"}
                          </strong>
                        </div>
                      );
                    }
                  )}
                </section>

                {/* START */}

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

                    gap: "20px",

                    flexWrap:
                      "wrap",
                  }}
                >
                  <div>
                    <div
                      style={
                        redLabel
                      }
                    >
                      FULL GRID
                    </div>

                    <h2
                      style={{
                        margin:
                          "6px 0",
                      }}
                    >
                      11 Takımlık
                      Grid
                    </h2>

                    <div
                      style={{
                        color:
                          "#747d87",

                        fontSize:
                          "10px",
                      }}
                    >
                      {
                        data.members
                          .length
                      }{" "}
                      insan +{" "}
                      {
                        expectedBots
                      }{" "}
                      AI
                    </div>
                  </div>

                  {data.isOwner && (
                    <button
                      type="button"

                      disabled={
                        !allReady ||
                        saving
                      }

                      onClick={
                        startSeason
                      }

                      style={{
                        ...primaryButton,

                        minWidth:
                          "230px",

                        opacity:
                          !allReady
                            ? 0.45
                            : 1,
                      }}
                    >
                      {saving
                        ? "Grid oluşturuluyor..."
                        : "Sezonu Başlat"}
                    </button>
                  )}
                </section>
              </>
            )}
        </div>
      </main>
    </>
  );
}

function Stats({
  driver,
  color,
}: {
  driver: Driver;
  color: string;
}) {
  const stats = [
    ["PACE", driver.pace],
    [
      "CONSISTENCY",
      driver.consistency,
    ],
    ["WET", driver.wet],
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
        display: "grid",
        gap: "8px",
      }}
    >
      {stats.map(
        ([label, value]) => (
          <div
            key={label}
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
                  "#777f89",

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
                  color: "#fff",
                }}
              >
                {value}
              </span>
            </div>

            <div
              style={{
                height: "4px",

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

function Step({
  number,
  text,
  active,
  complete,
}: {
  number: string;
  text: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div
      style={{
        minWidth:
          "130px",

        padding:
          "10px 13px",

        border:
          active
            ? "1px solid rgba(210,38,61,.45)"
            : "1px solid rgba(255,255,255,.07)",

        borderRadius:
          "9px",

        background:
          active
            ? "rgba(210,38,61,.08)"
            : "rgba(255,255,255,.02)",
      }}
    >
      <div
        style={{
          color:
            complete
              ? "#70df99"
              : "#d2263d",

          fontSize:
            "8px",

          fontWeight:
            900,
        }}
      >
        {complete
          ? "✓"
          : number}
      </div>

      <strong
        style={{
          fontSize:
            "10px",
        }}
      >
        {text}
      </strong>
    </div>
  );
}

function getMemberName(
  member:
    | Member
    | undefined
) {
  if (!member) {
    return "Menajer";
  }

  return (
    member.profile
      ?.display_name ||
    member.profile
      ?.username ||
    "Menajer"
  );
}

const panelStyle: CSSProperties =
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

const redLabel: CSSProperties =
  {
    color: "#d2263d",

    fontSize: "9px",

    fontWeight: 900,

    letterSpacing:
      "1.4px",
  };

const backButtonStyle: CSSProperties =
  {
    border:
      "1px solid rgba(255,255,255,.08)",

    borderRadius:
      "9px",

    background:
      "rgba(255,255,255,.025)",

    color: "#fff",

    padding:
      "9px 13px",

    cursor: "pointer",

    fontSize:
      "10px",

    fontWeight: 900,
  };

const primaryButton: CSSProperties =
  {
    minHeight: "50px",

    padding:
      "0 22px",

    border: 0,

    borderRadius:
      "11px",

    background:
      "#d2263d",

    color: "#fff",

    fontWeight:
      900,

    cursor: "pointer",
  };

const loadingStyle: CSSProperties =
  {
    minHeight: "100vh",

    background: "#050505",

    color: "#fff",

    padding:
      "100px 24px",
  };