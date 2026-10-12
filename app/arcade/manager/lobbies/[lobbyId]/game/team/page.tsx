"use client";

import {
  use,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import Header from "@/components/Header";

type DepartmentKey =
  | "aero"
  | "chassis"
  | "power"
  | "reliability";

type TeamState = {
  id: string;
  lobby_id: string;
  user_id: string;
  team_key: string;

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
};

type Upgrade = {
  level: number;
  maxLevel: number;
  cost: number | null;
};

type TeamData = {
  lobby: {
    id: string;
    name: string;
  };

  teamName: string;

  teamState: TeamState;

  upgrades: Record<
    DepartmentKey,
    Upgrade
  >;
};

const DEPARTMENTS: Array<{
  key: DepartmentKey;
  name: string;
  short: string;
  description: string;
}> = [
  {
    key: "aero",
    name: "Aerodinamik",
    short: "AERO",
    description:
      "Downforce ve yüksek hızlı viraj performansını geliştir.",
  },

  {
    key: "chassis",
    name: "Şasi",
    short: "CHASSIS",
    description:
      "Araç dengesi, mekanik tutuş ve genel yol tutuşunu geliştir.",
  },

  {
    key: "power",
    name: "Güç Ünitesi",
    short: "POWER",
    description:
      "Düzlük hızı ve motor performansını yükselt.",
  },

  {
    key: "reliability",
    name: "Dayanıklılık",
    short: "RELIABILITY",
    description:
      "Arıza riskini azaltacak dayanıklılık geliştirmeleri yap.",
  },
];

export default function TeamManagementPage({
  params,
}: {
  params: Promise<{
    lobbyId: string;
  }>;
}) {
  const { lobbyId } =
    use(params);

  const [data, setData] =
    useState<TeamData | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [
    upgrading,
    setUpgrading,
  ] =
    useState<DepartmentKey | null>(
      null
    );

  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  async function loadTeam() {
    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/team-management`,
          {
            cache: "no-store",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ||
            "Takım bilgileri yüklenemedi."
        );

        return;
      }

      setData(result);
      setMessage("");
    } catch {
      setMessage(
        "Takım bilgileri yüklenirken bağlantı hatası oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, [lobbyId]);

  async function upgrade(
    department: DepartmentKey
  ) {
    if (upgrading) {
      return;
    }

    setUpgrading(department);

    setMessage("");
    setSuccess(false);

    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/team-management`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              department,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ||
            "Geliştirme yapılamadı."
        );

        return;
      }

      setData((old) => {
        if (!old) {
          return old;
        }

        return {
          ...old,

          teamState:
            result.teamState,

          upgrades:
            result.upgrades,
        };
      });

      setSuccess(true);

      setMessage(
        result?.message ||
          "Geliştirme tamamlandı."
      );
    } catch {
      setMessage(
        "Geliştirme sırasında bağlantı hatası oluştu."
      );
    } finally {
      setUpgrading(null);
    }
  }

  if (loading) {
    return (
      <>
        <Header />

        <main
          style={{
            minHeight: "100vh",
            background: "#070707",
            color: "#fff",
            padding: "100px 24px",
          }}
        >
          Takım yönetimi
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
            minHeight: "100vh",
            background: "#070707",
            color: "#fff",
            padding: "100px 24px",
          }}
        >
          {message ||
            "Takım bilgileri bulunamadı."}
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <main
        style={{
          minHeight: "100vh",

          background:
            "radial-gradient(circle at 15% 0%, rgba(210,38,61,.18), transparent 30%), #070707",

          color: "#fff",

          padding:
            "52px 24px 110px",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
          }}
        >
          <Link
            href={`/arcade/manager/lobbies/${lobbyId}/game`}
            style={{
              color: "#7e8792",
              textDecoration: "none",
              fontSize: "12px",
            }}
          >
            ← Manager Dashboard
          </Link>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-end",
              gap: "20px",
              flexWrap: "wrap",
              marginTop: "24px",
              marginBottom:
                "30px",
            }}
          >
            <div>
              <div
                style={{
                  color:
                    "#d2263d",

                  fontSize:
                    "10px",

                  fontWeight:
                    900,

                  letterSpacing:
                    "1.7px",
                }}
              >
                TEAM MANAGEMENT
              </div>

              <h1
                style={{
                  margin:
                    "8px 0 0",

                  fontSize:
                    "clamp(40px, 6vw, 68px)",

                  lineHeight: 1,

                  letterSpacing:
                    "-3px",
                }}
              >
                {data.teamName}
              </h1>

              <div
                style={{
                  marginTop:
                    "12px",

                  color:
                    "#78818b",

                  fontSize:
                    "13px",
                }}
              >
                {data.lobby.name}
              </div>
            </div>

            <div
              style={{
                textAlign:
                  "right",
              }}
            >
              <div
                style={{
                  color:
                    "#717a84",

                  fontSize:
                    "9px",

                  fontWeight:
                    900,

                  letterSpacing:
                    "1.3px",
                }}
              >
                AVAILABLE BUDGET
              </div>

              <div
                style={{
                  marginTop:
                    "5px",

                  fontSize:
                    "30px",

                  fontWeight:
                    900,
                }}
              >
                {formatMoney(
                  data.teamState
                    .budget
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",

              gap: "14px",

              marginBottom:
                "20px",
            }}
          >
            <TopCard
              label="TAKIM GÜCÜ"
              value={`${data.teamState.team_rating}/100`}
              text="Genel performans"
            />

            <TopCard
              label="HARCANAN"
              value={formatMoney(
                data.teamState
                  .total_spent
              )}
              text="Toplam geliştirme harcaması"
            />

            <TopCard
              label="SEZON PUANI"
              value={String(
                data.teamState
                  .season_points
              )}
              text="Şampiyona puanı"
            />

            <TopCard
              label="BAŞARILAR"
              value={`${data.teamState.wins}W · ${data.teamState.podiums}P`}
              text="Galibiyet ve podyum"
            />
          </div>

          <section
            style={{
              border:
                "1px solid rgba(255,255,255,.075)",

              borderRadius:
                "20px",

              background:
                "rgba(255,255,255,.02)",

              overflow:
                "hidden",
            }}
          >
            <div
              style={{
                padding:
                  "22px 24px",

                borderBottom:
                  "1px solid rgba(255,255,255,.06)",
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
                    "1.6px",
                }}
              >
                R&D
              </div>

              <h2
                style={{
                  margin:
                    "7px 0 0",

                  fontSize:
                    "26px",
                }}
              >
                Araç Geliştirme
              </h2>

              <p
                style={{
                  margin:
                    "8px 0 0",

                  color:
                    "#747c86",

                  fontSize:
                    "12px",
                }}
              >
                Her geliştirme
                takım gücünü +1
                artırır.
              </p>
            </div>

            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(250px, 1fr))",

                gap: "14px",

                padding: "18px",
              }}
            >
              {DEPARTMENTS.map(
                (department) => {
                  const upgradeData =
                    data.upgrades[
                      department.key
                    ];

                  const maxed =
                    upgradeData.level >=
                    upgradeData.maxLevel;

                  const canAfford =
                    upgradeData.cost !==
                      null &&
                    data.teamState
                      .budget >=
                      upgradeData.cost;

                  const busy =
                    upgrading !== null;

                  return (
                    <section
                      key={
                        department.key
                      }
                      style={{
                        padding:
                          "21px",

                        minHeight:
                          "260px",

                        border:
                          "1px solid rgba(255,255,255,.07)",

                        borderRadius:
                          "17px",

                        background:
                          "linear-gradient(145deg, rgba(255,255,255,.03), rgba(255,255,255,.01))",
                      }}
                    >
                      <div
                        style={{
                          color:
                            "#d2263d",

                          fontSize:
                            "9px",

                          fontWeight:
                            900,

                          letterSpacing:
                            "1.5px",
                        }}
                      >
                        {department.short}
                      </div>

                      <h3
                        style={{
                          margin:
                            "10px 0 7px",

                          fontSize:
                            "20px",
                        }}
                      >
                        {department.name}
                      </h3>

                      <p
                        style={{
                          color:
                            "#717984",

                          fontSize:
                            "11px",

                          lineHeight:
                            1.55,

                          minHeight:
                            "52px",
                        }}
                      >
                        {department.description}
                      </p>

                      <div
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          marginTop:
                            "22px",

                          fontSize:
                            "11px",

                          fontWeight:
                            900,
                        }}
                      >
                        <span>
                          SEVİYE{" "}
                          {
                            upgradeData.level
                          }
                        </span>

                        <span
                          style={{
                            color:
                              "#707883",
                          }}
                        >
                          {
                            upgradeData.maxLevel
                          }
                        </span>
                      </div>

                      <div
                        style={{
                          height:
                            "6px",

                          marginTop:
                            "8px",

                          background:
                            "rgba(255,255,255,.06)",

                          borderRadius:
                            "999px",

                          overflow:
                            "hidden",
                        }}
                      >
                        <div
                          style={{
                            height:
                              "100%",

                            width:
                              `${(upgradeData.level / upgradeData.maxLevel) * 100}%`,

                            background:
                              "#d2263d",

                            borderRadius:
                              "999px",
                          }}
                        />
                      </div>

                      <button
                        type="button"

                        disabled={
                          maxed ||
                          !canAfford ||
                          busy
                        }

                        onClick={() =>
                          upgrade(
                            department.key
                          )
                        }

                        style={{
                          width:
                            "100%",

                          minHeight:
                            "44px",

                          marginTop:
                            "20px",

                          border: 0,

                          borderRadius:
                            "10px",

                          background:
                            maxed
                              ? "rgba(82,215,130,.08)"
                              : canAfford
                              ? "#d2263d"
                              : "rgba(255,255,255,.05)",

                          color:
                            maxed
                              ? "#7cdb9a"
                              : canAfford
                              ? "#fff"
                              : "#666",

                          fontWeight:
                            900,

                          cursor:
                            !maxed &&
                            canAfford &&
                            !busy
                              ? "pointer"
                              : "not-allowed",

                          opacity:
                            busy &&
                            upgrading !==
                              department.key
                              ? 0.5
                              : 1,
                        }}
                      >
                        {upgrading ===
                        department.key
                          ? "Geliştiriliyor..."
                          : maxed
                          ? "MAKSİMUM"
                          : upgradeData.cost !==
                            null
                          ? `Geliştir · ${formatMoney(
                              upgradeData.cost
                            )}`
                          : "Geliştir"}
                      </button>
                    </section>
                  );
                }
              )}
            </div>
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

function TopCard({
  label,
  value,
  text,
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <section
      style={{
        padding: "20px",

        border:
          "1px solid rgba(255,255,255,.07)",

        borderRadius:
          "17px",

        background:
          "rgba(255,255,255,.02)",
      }}
    >
      <div
        style={{
          color: "#d2263d",

          fontSize: "9px",

          fontWeight: 900,

          letterSpacing:
            "1.4px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            "17px",

          fontSize:
            "25px",

          fontWeight:
            900,
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop:
            "5px",

          color:
            "#6e7680",

          fontSize:
            "10px",
        }}
      >
        {text}
      </div>
    </section>
  );
}

function formatMoney(
  value: number
) {
  if (
    value >=
    1_000_000
  ) {
    const millions =
      value /
      1_000_000;

    return `€${millions.toFixed(
      millions % 1 === 0
        ? 0
        : 1
    )}M`;
  }

  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",

      currency: "EUR",

      maximumFractionDigits:
        0,
    }
  ).format(value);
}