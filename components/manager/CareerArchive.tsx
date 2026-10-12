"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Standing = {
  position: number;

  team_key: string;
  team_name: string;
  team_color: string;

  driver_key:
    | string
    | null;

  driver_name: string;
  manager_name: string;

  is_bot: boolean;

  points: number;
  wins: number;
  podiums: number;
  team_rating: number;
};

type RaceResult = {
  position: number;

  team_key: string;
  team_name: string;
  team_color: string;

  driver_name: string;
  manager_name: string;

  points: number;

  finish_status:
    | "finished"
    | "dnf";

  incident_message:
    | string
    | null;
};

type Race = {
  round: number;
  name: string;
  country: string;

  winner:
    | RaceResult
    | null;

  results: RaceResult[];
};

type Transfer = {
  id: string;

  driver_name: string;

  from_team_name:
    | string
    | null;

  to_team_name:
    | string
    | null;

  annual_salary: number;

  contract_until_season:
    | number
    | null;

  transfer_type:
    | string;
};

type Season = {
  id: string;

  season_number: number;

  champion:
    | Standing
    | null;

  podium: Standing[];

  standings: Standing[];

  races: Race[];

  transfers: Transfer[];
};

type Data = {
  currentSeason:
    | {
        season_number: number;
        current_round: number;
        status: string;
      }
    | null;

  archiveCount: number;

  summary: {
    teamTitles: Record<
      string,
      number
    >;

    driverTitles: Record<
      string,
      number
    >;
  };

  seasons: Season[];
};

type Tab =
  | "overview"
  | "standings"
  | "races"
  | "transfers";

export default function CareerArchive({
  lobbyId,
}: {
  lobbyId: string;
}) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    data,
    setData,
  ] =
    useState<Data | null>(
      null
    );

  const [
    selectedSeason,
    setSelectedSeason,
  ] =
    useState<number | null>(
      null
    );

  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      "overview"
    );

  const [
    message,
    setMessage,
  ] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/career-history`,
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
            "Kariyer arşivi yüklenemedi."
        );

        return;
      }

      setData(result);

      if (
        result.seasons
          ?.length > 0
      ) {
        setSelectedSeason(
          (
            current
          ) =>
            current ??
            result.seasons[0]
              .season_number
        );
      }
    } catch {
      setMessage(
        "Kariyer arşivine ulaşılamadı."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open]);

  const season =
    useMemo(() => {
      if (
        !data ||
        selectedSeason ===
          null
      ) {
        return null;
      }

      return (
        data.seasons.find(
          (item) =>
            item.season_number ===
            selectedSeason
        ) ?? null
      );
    }, [
      data,
      selectedSeason,
    ]);

  const topTeamTitles =
    useMemo(() => {
      if (!data) {
        return [];
      }

      return Object.entries(
        data.summary
          .teamTitles
      )
        .sort(
          (a, b) =>
            b[1] - a[1]
        )
        .slice(0, 5);
    }, [data]);

  const topDriverTitles =
    useMemo(() => {
      if (!data) {
        return [];
      }

      return Object.entries(
        data.summary
          .driverTitles
      )
        .sort(
          (a, b) =>
            b[1] - a[1]
        )
        .slice(0, 5);
    }, [data]);

  return (
    <>
      <button
        type="button"

        onClick={() =>
          setOpen(true)
        }

        style={{
          width: "100%",

          marginBottom:
            "16px",

          minHeight:
            "135px",

          padding:
            "21px",

          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          gap: "20px",

          border:
            "1px solid rgba(255,255,255,.075)",

          borderRadius:
            "18px",

          background:
            "linear-gradient(120deg,rgba(62,94,170,.075),rgba(255,255,255,.018))",

          color: "#fff",

          textAlign:
            "left",

          cursor:
            "pointer",
        }}
      >
        <div>
          <div
            style={
              blueLabel
            }
          >
            CAREER HISTORY
          </div>

          <h2
            style={{
              margin:
                "7px 0 6px",

              fontSize:
                "22px",
            }}
          >
            Kariyer Arşivi
          </h2>

          <div
            style={{
              color:
                "#747d86",

              fontSize:
                "10px",

              lineHeight:
                1.5,
            }}
          >
            Geçmiş sezonların
            şampiyonlarını,
            yarışlarını,
            sıralamalarını ve
            transferlerini incele.
          </div>
        </div>

        <div
          style={{
            minWidth:
              "120px",

            padding:
              "12px",

            border:
              "1px solid rgba(117,151,230,.15)",

            borderRadius:
              "10px",

            background:
              "rgba(65,94,160,.06)",

            textAlign:
              "center",
          }}
        >
          <div
            style={{
              color:
                "#687385",

              fontSize:
                "7px",

              fontWeight:
                900,
            }}
          >
            HISTORY
          </div>

          <strong
            style={{
              display:
                "block",

              marginTop:
                "4px",

              fontSize:
                "12px",
            }}
          >
            ARŞİVİ AÇ →
          </strong>
        </div>
      </button>

      {open && (
        <>
          <button
            type="button"

            aria-label="Kariyer arşivini kapat"

            onClick={() =>
              setOpen(false)
            }

            style={{
              position:
                "fixed",

              inset: 0,

              zIndex: 130,

              border: 0,

              background:
                "rgba(0,0,0,.79)",

              backdropFilter:
                "blur(6px)",
            }}
          />

          <aside
            style={{
              position:
                "fixed",

              zIndex: 140,

              top: 0,
              right: 0,
              bottom: 0,

              width:
                "min(900px,100vw)",

              overflowY:
                "auto",

              background:
                "#070707",

              borderLeft:
                "1px solid rgba(255,255,255,.09)",

              boxShadow:
                "-35px 0 120px rgba(0,0,0,.68)",
            }}
          >
            {/* HEADER */}

            <div
              style={{
                position:
                  "sticky",

                top: 0,

                zIndex: 20,

                padding:
                  "20px",

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
                  "rgba(7,7,7,.96)",

                backdropFilter:
                  "blur(15px)",
              }}
            >
              <div>
                <div
                  style={
                    blueLabel
                  }
                >
                  MANAGER CAREER
                </div>

                <h2
                  style={{
                    margin:
                      "5px 0 0",

                    fontSize:
                      "26px",
                  }}
                >
                  Kariyer Arşivi
                </h2>
              </div>

              <button
                type="button"

                onClick={() =>
                  setOpen(false)
                }

                style={
                  closeButton
                }
              >
                ×
              </button>
            </div>

            {loading ? (
              <div
                style={{
                  padding:
                    "35px 20px",

                  color:
                    "#747d86",
                }}
              >
                Kariyer geçmişi
                hazırlanıyor...
              </div>
            ) : !data ? (
              <div
                style={{
                  padding:
                    "25px 20px",

                  color:
                    "#ff7183",
                }}
              >
                {message ||
                  "Arşiv yüklenemedi."}
              </div>
            ) : data.seasons
                .length === 0 ? (
              <div
                style={{
                  padding:
                    "35px 22px",
                }}
              >
                <div
                  style={{
                    fontSize:
                      "32px",
                  }}
                >
                  🗃️
                </div>

                <h3
                  style={{
                    margin:
                      "12px 0 5px",
                  }}
                >
                  Henüz Arşivlenmiş
                  Sezon Yok
                </h3>

                <div
                  style={{
                    maxWidth:
                      "470px",

                    color:
                      "#6e7780",

                    fontSize:
                      "10px",

                    lineHeight:
                      1.6,
                  }}
                >
                  İlk gerçek sezon
                  tamamlanıp yeni
                  sezona geçildiğinde
                  Sezon 1 otomatik
                  olarak burada
                  görünecek. Test modu
                  kariyer verisini
                  değiştirmediği için
                  arşiv oluşturmaz.
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding:
                    "18px",

                  display:
                    "grid",

                  gap: "14px",
                }}
              >
                {/* CAREER SUMMARY */}

                <section
                  style={
                    panel
                  }
                >
                  <div
                    style={
                      sectionHeader
                    }
                  >
                    <div
                      style={
                        blueLabel
                      }
                    >
                      CAREER SUMMARY
                    </div>

                    <h3
                      style={{
                        margin:
                          "5px 0 0",
                      }}
                    >
                      Kariyer Özeti
                    </h3>
                  </div>

                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "repeat(3,1fr)",
                    }}
                  >
                    <SummaryStat
                      label="ARŞİVLENEN SEZON"
                      value={`${data.archiveCount}`}
                    />

                    <SummaryStat
                      label="MEVCUT SEZON"
                      value={`S${data.currentSeason?.season_number ?? "—"}`}
                    />

                    <SummaryStat
                      label="MEVCUT ROUND"
                      value={`${data.currentSeason?.current_round ?? "—"}`}
                    />
                  </div>
                </section>

                {/* SEASON SELECT */}

                <div
                  style={{
                    display:
                      "flex",

                    gap: "7px",

                    overflowX:
                      "auto",

                    paddingBottom:
                      "2px",
                  }}
                >
                  {data.seasons.map(
                    (item) => (
                      <button
                        key={
                          item.id
                        }

                        type="button"

                        onClick={() => {
                          setSelectedSeason(
                            item.season_number
                          );

                          setTab(
                            "overview"
                          );
                        }}

                        style={{
                          minWidth:
                            "110px",

                          minHeight:
                            "42px",

                          border:
                            selectedSeason ===
                            item.season_number
                              ? "1px solid #5579cf"
                              : "1px solid rgba(255,255,255,.07)",

                          borderRadius:
                            "9px",

                          background:
                            selectedSeason ===
                            item.season_number
                              ? "rgba(73,107,188,.12)"
                              : "rgba(255,255,255,.018)",

                          color:
                            "#fff",

                          cursor:
                            "pointer",

                          fontSize:
                            "9px",

                          fontWeight:
                            1000,
                        }}
                      >
                        SEZON{" "}
                        {
                          item.season_number
                        }
                      </button>
                    )
                  )}
                </div>

                {season && (
                  <>
                    {/* CHAMPION */}

                    {season.champion && (
                      <section
                        style={{
                          ...panel,

                          padding:
                            "22px",

                          textAlign:
                            "center",

                          background:
                            "radial-gradient(circle at 50% 0%,rgba(222,190,76,.11),transparent 55%),rgba(255,255,255,.018)",
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              "33px",
                          }}
                        >
                          🏆
                        </div>

                        <div
                          style={{
                            marginTop:
                              "7px",

                            color:
                              "#d9ba51",

                            fontSize:
                              "8px",

                            fontWeight:
                              1000,

                            letterSpacing:
                              "1.3px",
                          }}
                        >
                          SEASON{" "}
                          {
                            season.season_number
                          }{" "}
                          CHAMPION
                        </div>

                        <h2
                          style={{
                            margin:
                              "6px 0 0",

                            fontSize:
                              "29px",
                          }}
                        >
                          {
                            season.champion
                              .team_name
                          }
                        </h2>

                        <div
                          style={{
                            marginTop:
                              "4px",

                            color:
                              "#979ea6",

                            fontSize:
                              "10px",
                          }}
                        >
                          {
                            season.champion
                              .driver_name
                          }{" "}
                          ·{" "}
                          {
                            season.champion
                              .points
                          }{" "}
                          PTS ·{" "}
                          {
                            season.champion
                              .wins
                          }{" "}
                          galibiyet
                        </div>
                      </section>
                    )}

                    {/* TABS */}

                    <div
                      style={{
                        display:
                          "grid",

                        gridTemplateColumns:
                          "repeat(4,1fr)",

                        border:
                          "1px solid rgba(255,255,255,.065)",

                        borderRadius:
                          "10px",

                        overflow:
                          "hidden",
                      }}
                    >
                      <TabButton
                        active={
                          tab ===
                          "overview"
                        }

                        onClick={() =>
                          setTab(
                            "overview"
                          )
                        }

                        text="ÖZET"
                      />

                      <TabButton
                        active={
                          tab ===
                          "standings"
                        }

                        onClick={() =>
                          setTab(
                            "standings"
                          )
                        }

                        text="PUAN DURUMU"
                      />

                      <TabButton
                        active={
                          tab ===
                          "races"
                        }

                        onClick={() =>
                          setTab(
                            "races"
                          )
                        }

                        text="YARIŞLAR"
                      />

                      <TabButton
                        active={
                          tab ===
                          "transfers"
                        }

                        onClick={() =>
                          setTab(
                            "transfers"
                          )
                        }

                        text="TRANSFERLER"
                      />
                    </div>

                    {tab ===
                      "overview" && (
                      <Overview
                        season={
                          season
                        }

                        topTeamTitles={
                          topTeamTitles
                        }

                        topDriverTitles={
                          topDriverTitles
                        }
                      />
                    )}

                    {tab ===
                      "standings" && (
                      <Standings
                        standings={
                          season.standings
                        }
                      />
                    )}

                    {tab ===
                      "races" && (
                      <Races
                        races={
                          season.races
                        }
                      />
                    )}

                    {tab ===
                      "transfers" && (
                      <Transfers
                        transfers={
                          season.transfers
                        }
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
}

function Overview({
  season,
  topTeamTitles,
  topDriverTitles,
}: {
  season: Season;

  topTeamTitles: [
    string,
    number
  ][];

  topDriverTitles: [
    string,
    number
  ][];
}) {
  return (
    <div
      style={{
        display:
          "grid",

        gap: "12px",
      }}
    >
      <section
        style={
          panel
        }
      >
        <div
          style={
            sectionHeader
          }
        >
          <div
            style={
              blueLabel
            }
          >
            PODIUM
          </div>

          <h3
            style={{
              margin:
                "5px 0 0",
            }}
          >
            Sezon İlk 3
          </h3>
        </div>

        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(3,1fr)",
          }}
        >
          {season.podium.map(
            (item) => (
              <div
                key={
                  item.team_key
                }

                style={{
                  padding:
                    "15px",

                  borderRight:
                    "1px solid rgba(255,255,255,.045)",
                }}
              >
                <div
                  style={{
                    color:
                      item.position ===
                      1
                        ? "#d9ba51"
                        : "#646d76",

                    fontSize:
                      "8px",

                    fontWeight:
                      1000,
                  }}
                >
                  P
                  {
                    item.position
                  }
                </div>

                <div
                  style={{
                    width:
                      "31px",

                    height:
                      "4px",

                    marginTop:
                      "8px",

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
                      "8px",

                    fontSize:
                      "12px",
                  }}
                >
                  {
                    item.team_name
                  }
                </strong>

                <div
                  style={{
                    marginTop:
                      "3px",

                    color:
                      "#717a83",

                    fontSize:
                      "8px",
                  }}
                >
                  {
                    item.driver_name
                  }
                </div>

                <strong
                  style={{
                    display:
                      "block",

                    marginTop:
                      "9px",

                    fontSize:
                      "17px",
                  }}
                >
                  {
                    item.points
                  }
                </strong>
              </div>
            )
          )}
        </div>
      </section>

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(auto-fit,minmax(250px,1fr))",

          gap: "10px",
        }}
      >
        <TitleList
          title="Takım Şampiyonlukları"
          items={
            topTeamTitles
          }
        />

        <TitleList
          title="Pilot Şampiyonlukları"
          items={
            topDriverTitles
          }
        />
      </div>
    </div>
  );
}

function Standings({
  standings,
}: {
  standings: Standing[];
}) {
  return (
    <section
      style={
        panel
      }
    >
      <div
        style={
          sectionHeader
        }
      >
        <div
          style={
            blueLabel
          }
        >
          FINAL STANDINGS
        </div>

        <h3
          style={{
            margin:
              "5px 0 0",
          }}
        >
          Final Puan Durumu
        </h3>
      </div>

      {standings.map(
        (item) => (
          <div
            key={
              `${item.position}-${item.team_key}`
            }

            style={{
              display:
                "grid",

              gridTemplateColumns:
                "45px 5px minmax(120px,1fr) minmax(120px,.8fr) 65px",

              gap: "10px",

              alignItems:
                "center",

              padding:
                "12px 14px",

              borderBottom:
                "1px solid rgba(255,255,255,.04)",
            }}
          >
            <strong>
              P
              {
                item.position
              }
            </strong>

            <div
              style={{
                height:
                  "28px",

                borderRadius:
                  "999px",

                background:
                  item.team_color,
              }}
            />

            <div>
              <strong
                style={{
                  fontSize:
                    "10px",
                }}
              >
                {
                  item.team_name
                }
              </strong>

              <div
                style={{
                  marginTop:
                    "2px",

                  color:
                    "#646d76",

                  fontSize:
                    "7px",
                }}
              >
                {
                  item.manager_name
                }
              </div>
            </div>

            <div>
              <strong
                style={{
                  fontSize:
                    "10px",
                }}
              >
                {
                  item.driver_name
                }
              </strong>

              <div
                style={{
                  marginTop:
                    "2px",

                  color:
                    "#646d76",

                  fontSize:
                    "7px",
                }}
              >
                {
                  item.wins
                }{" "}
                W ·{" "}
                {
                  item.podiums
                }{" "}
                POD
              </div>
            </div>

            <div
              style={{
                textAlign:
                  "right",
              }}
            >
              <strong
                style={{
                  fontSize:
                    "16px",
                }}
              >
                {
                  item.points
                }
              </strong>

              <div
                style={
                  tiny
                }
              >
                PTS
              </div>
            </div>
          </div>
        )
      )}
    </section>
  );
}

function Races({
  races,
}: {
  races: Race[];
}) {
  return (
    <div
      style={{
        display:
          "grid",

        gap: "8px",
      }}
    >
      {races.map(
        (race) => (
          <section
            key={
              race.round
            }

            style={
              panel
            }
          >
            <div
              style={{
                padding:
                  "13px 14px",

                display:
                  "flex",

                justifyContent:
                  "space-between",

                gap: "15px",

                alignItems:
                  "center",
              }}
            >
              <div>
                <div
                  style={
                    blueLabel
                  }
                >
                  ROUND{" "}
                  {
                    race.round
                  }
                </div>

                <strong
                  style={{
                    display:
                      "block",

                    marginTop:
                      "4px",

                    fontSize:
                      "13px",
                  }}
                >
                  {
                    race.name
                  }
                </strong>

                <div
                  style={{
                    marginTop:
                      "2px",

                    color:
                      "#646d76",

                    fontSize:
                      "7px",
                  }}
                >
                  {
                    race.country
                  }
                </div>
              </div>

              {race.winner ? (
                <div
                  style={{
                    textAlign:
                      "right",
                  }}
                >
                  <div
                    style={
                      tiny
                    }
                  >
                    WINNER
                  </div>

                  <strong
                    style={{
                      display:
                        "block",

                      marginTop:
                        "4px",

                      fontSize:
                        "11px",
                    }}
                  >
                    {
                      race.winner
                        .driver_name
                    }
                  </strong>

                  <div
                    style={{
                      marginTop:
                        "2px",

                      color:
                        race.winner
                          .team_color,

                      fontSize:
                        "7px",

                      fontWeight:
                        900,
                    }}
                  >
                    {
                      race.winner
                        .team_name
                    }
                  </div>
                </div>
              ) : (
                <span
                  style={
                    tiny
                  }
                >
                  SONUÇ YOK
                </span>
              )}
            </div>
          </section>
        )
      )}
    </div>
  );
}

function Transfers({
  transfers,
}: {
  transfers: Transfer[];
}) {
  if (
    transfers.length === 0
  ) {
    return (
      <section
        style={{
          ...panel,

          padding:
            "20px",

          color:
            "#69727b",

          fontSize:
            "9px",
        }}
      >
        Bu sezon için kayıtlı
        bir transfer veya kontrat
        hareketi bulunmuyor.
      </section>
    );
  }

  return (
    <section
      style={
        panel
      }
    >
      <div
        style={
          sectionHeader
        }
      >
        <div
          style={
            blueLabel
          }
        >
          TRANSFER HISTORY
        </div>

        <h3
          style={{
            margin:
              "5px 0 0",
          }}
        >
          Transfer & Kontrat Geçmişi
        </h3>
      </div>

      {transfers.map(
        (item) => (
          <div
            key={
              item.id
            }

            style={{
              padding:
                "13px 15px",

              display:
                "grid",

              gridTemplateColumns:
                "minmax(140px,1fr) minmax(150px,1fr) auto",

              gap: "12px",

              alignItems:
                "center",

              borderBottom:
                "1px solid rgba(255,255,255,.04)",
            }}
          >
            <div>
              <strong
                style={{
                  fontSize:
                    "11px",
                }}
              >
                {
                  item.driver_name
                }
              </strong>

              <div
                style={{
                  marginTop:
                    "3px",

                  color:
                    "#606973",

                  fontSize:
                    "7px",
                }}
              >
                {transferLabel(
                  item.transfer_type
                )}
              </div>
            </div>

            <div
              style={{
                color:
                  "#89919a",

                fontSize:
                  "8px",
              }}
            >
              {item.from_team_name ??
                "Serbest"}

              {" → "}

              {item.to_team_name ??
                "Serbest"}
            </div>

            <div
              style={{
                textAlign:
                  "right",
              }}
            >
              <strong
                style={{
                  fontSize:
                    "9px",
                }}
              >
                {formatMoney(
                  item.annual_salary
                )}
              </strong>

              <div
                style={{
                  marginTop:
                    "3px",

                  color:
                    "#59616a",

                  fontSize:
                    "7px",
                }}
              >
                {item.contract_until_season
                  ? `S${item.contract_until_season}`
                  : "—"}
              </div>
            </div>
          </div>
        )
      )}
    </section>
  );
}

function TitleList({
  title,
  items,
}: {
  title: string;

  items: [
    string,
    number
  ][];
}) {
  return (
    <section
      style={
        panel
      }
    >
      <div
        style={
          sectionHeader
        }
      >
        <div
          style={
            blueLabel
          }
        >
          CAREER RECORDS
        </div>

        <h3
          style={{
            margin:
              "5px 0 0",
          }}
        >
          {title}
        </h3>
      </div>

      {items.length ===
      0 ? (
        <div
          style={{
            padding:
              "15px",

            color:
              "#626b74",

            fontSize:
              "8px",
          }}
        >
          Henüz veri yok.
        </div>
      ) : (
        items.map(
          (
            [
              name,
              titles,
            ],
            index
          ) => (
            <div
              key={
                name
              }

              style={{
                display:
                  "flex",

                justifyContent:
                  "space-between",

                padding:
                  "11px 14px",

                borderBottom:
                  "1px solid rgba(255,255,255,.04)",
              }}
            >
              <span
                style={{
                  fontSize:
                    "9px",
                }}
              >
                {index + 1}.{" "}
                {name}
              </span>

              <strong
                style={{
                  color:
                    "#d9ba51",

                  fontSize:
                    "9px",
                }}
              >
                {titles} 🏆
              </strong>
            </div>
          )
        )
      )}
    </section>
  );
}

function SummaryStat({
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
          "15px",

        borderRight:
          "1px solid rgba(255,255,255,.04)",
      }}
    >
      <div
        style={
          tiny
        }
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
            "18px",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  text,
}: {
  active: boolean;
  onClick: () => void;
  text: string;
}) {
  return (
    <button
      type="button"

      onClick={
        onClick
      }

      style={{
        minHeight:
          "42px",

        border: 0,

        borderRight:
          "1px solid rgba(255,255,255,.05)",

        background:
          active
            ? "rgba(76,108,184,.13)"
            : "rgba(255,255,255,.015)",

        color:
          active
            ? "#8eabef"
            : "#646d76",

        cursor:
          "pointer",

        fontSize:
          "7px",

        fontWeight:
          1000,
      }}
    >
      {text}
    </button>
  );
}

function transferLabel(
  type: string
) {
  if (
    type === "renewal"
  ) {
    return "KONTRAT YENİLEME";
  }

  if (
    type === "signing"
  ) {
    return "TRANSFER";
  }

  if (
    type === "ai_signing"
  ) {
    return "AI TRANSFERİ";
  }

  if (
    type === "release"
  ) {
    return "SERBEST BIRAKILDI";
  }

  if (
    type === "initial"
  ) {
    return "İLK KONTRAT";
  }

  return type.toUpperCase();
}

function formatMoney(
  amount: number
) {
  if (
    Number(amount) >=
    1_000_000
  ) {
    return `€${(
      Number(amount) /
      1_000_000
    ).toFixed(0)}M`;
  }

  return `€${Number(
    amount
  ).toLocaleString(
    "tr-TR"
  )}`;
}

const panel = {
  border:
    "1px solid rgba(255,255,255,.065)",

  borderRadius:
    "12px",

  background:
    "rgba(255,255,255,.017)",

  overflow:
    "hidden",
};

const sectionHeader = {
  padding:
    "14px",

  borderBottom:
    "1px solid rgba(255,255,255,.05)",
};

const blueLabel = {
  color:
    "#6487db",

  fontSize:
    "8px",

  fontWeight:
    1000,

  letterSpacing:
    "1.2px",
};

const tiny = {
  color:
    "#59616a",

  fontSize:
    "7px",

  fontWeight:
    900,

  letterSpacing:
    ".6px",
};

const closeButton = {
  width: "38px",

  height: "38px",

  borderRadius:
    "50%",

  border:
    "1px solid rgba(255,255,255,.10)",

  background:
    "rgba(255,255,255,.03)",

  color: "#fff",

  cursor:
    "pointer",

  fontSize:
    "18px",
};