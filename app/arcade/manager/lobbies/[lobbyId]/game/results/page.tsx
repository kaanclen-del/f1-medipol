"use client";

import {
  use,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  useSearchParams,
} from "next/navigation";

import Header from "@/components/Header";

type RaceResult = {
  id: string;
  user_id: string;
  team_key: string;
  team_name: string;

  position: number;
  points: number;

  finish_status:
    | "finished"
    | "dnf";

  performance_score: number;

  starting_tire: string;
  second_tire: string;

  pit_lap: number;
  aggression: number;

  incident_type:
    | "mechanical"
    | "driver_error"
    | "collision"
    | "easter_egg"
    | null;

  incident_key:
    string | null;

  incident_message:
    string | null;

  incident_lap:
    number | null;

  isMe: boolean;

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

type ResultData = {
  race: {
    id: string;
    round: number;
    name: string;
    country: string;
    status: string;
  };

  season: {
    season_number: number;
    current_round: number;
    status: string;
  } | null;

  results:
    RaceResult[];
};

export default function ResultsPage({
  params,
}: {
  params: Promise<{
    lobbyId: string;
  }>;
}) {
  const { lobbyId } =
    use(params);

  const searchParams =
    useSearchParams();

  const round =
    searchParams.get(
      "round"
    );

  const [data, setData] =
    useState<ResultData | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    async function load() {
      try {
        const suffix =
          round
            ? `?round=${encodeURIComponent(
                round
              )}`
            : "";

        const response =
          await fetch(
            `/api/arcade/manager/lobbies/${lobbyId}/race-results${suffix}`,
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
              "Sonuçlar yüklenemedi."
          );

          return;
        }

        setData(result);
      } catch {
        setMessage(
          "Yarış sonuçları yüklenirken bağlantı hatası oluştu."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [
    lobbyId,
    round,
  ]);

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
          Yarış sonuçları
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
          {message}
        </main>
      </>
    );
  }

  const winner =
    data.results.find(
      (result) =>
        result.finish_status ===
        "finished"
    ) ?? null;

  const dnfCount =
    data.results.filter(
      (result) =>
        result.finish_status ===
        "dnf"
    ).length;

  return (
    <>
      <Header />

      <main
        style={{
          minHeight:
            "100vh",

          background:
            "radial-gradient(circle at 50% 0%, rgba(210,38,61,.20), transparent 32%), #070707",

          color: "#fff",

          padding:
            "52px 24px 110px",
        }}
      >
        <div
          style={{
            maxWidth:
              "1100px",

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
              textAlign:
                "center",

              marginTop:
                "45px",
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
                  "2px",
              }}
            >
              RACE RESULT · ROUND{" "}
              {data.race.round}
            </div>

            <h1
              style={{
                margin:
                  "10px 0 0",

                fontSize:
                  "clamp(42px, 7vw, 76px)",

                letterSpacing:
                  "-3px",
              }}
            >
              {data.race.name}
            </h1>

            <div
              style={{
                marginTop:
                  "8px",

                color:
                  "#747d87",
              }}
            >
              {data.race.country}
            </div>
          </div>

          {winner ? (
            <section
              style={{
                marginTop:
                  "40px",

                padding:
                  "30px",

                textAlign:
                  "center",

                border:
                  "1px solid rgba(210,38,61,.30)",

                borderRadius:
                  "22px",

                background:
                  "linear-gradient(145deg, rgba(210,38,61,.14), rgba(210,38,61,.025))",
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
                    "2px",
                }}
              >
                RACE WINNER
              </div>

              <div
                style={{
                  marginTop:
                    "15px",

                  fontSize:
                    "35px",

                  fontWeight:
                    900,
                }}
              >
                {getName(
                  winner
                )}
              </div>

              <div
                style={{
                  marginTop:
                    "7px",

                  color:
                    "#9aa2ac",
                }}
              >
                {
                  winner.team_name
                }
              </div>

              <div
                style={{
                  marginTop:
                    "18px",

                  fontSize:
                    "22px",

                  fontWeight:
                    900,
                }}
              >
                +{winner.points} PTS
              </div>
            </section>
          ) : (
            <section
              style={{
                marginTop:
                  "40px",

                padding:
                  "30px",

                textAlign:
                  "center",

                border:
                  "1px solid rgba(210,38,61,.25)",

                borderRadius:
                  "22px",

                background:
                  "rgba(210,38,61,.06)",
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
                    "2px",
                }}
              >
                CHAOS RACE
              </div>

              <h2
                style={{
                  margin:
                    "10px 0 0",
                }}
              >
                Yarışı tamamlayan olmadı
              </h2>

              <p
                style={{
                  color:
                    "#858e98",

                  fontSize:
                    "12px",
                }}
              >
                Race Control da
                tam olarak ne
                yaşandığını anlamaya
                çalışıyor.
              </p>
            </section>
          )}

          {dnfCount > 0 && (
            <div
              style={{
                marginTop:
                  "18px",

                padding:
                  "13px 16px",

                borderRadius:
                  "12px",

                border:
                  "1px solid rgba(255,255,255,.07)",

                background:
                  "rgba(255,255,255,.02)",

                color:
                  "#858e98",

                fontSize:
                  "11px",
              }}
            >
              Yarışta {dnfCount} araç
              finiş göremedi.
            </div>
          )}

          <section
            style={{
              marginTop:
                "18px",

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
                  "20px 24px",

                borderBottom:
                  "1px solid rgba(255,255,255,.06)",
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
                CLASSIFICATION
              </div>

              <h2
                style={{
                  margin:
                    "6px 0 0",
                }}
              >
                Yarış Sonucu
              </h2>
            </div>

            {data.results.map(
              (result) => {
                const dnf =
                  result.finish_status ===
                  "dnf";

                return (
                  <div
                    key={
                      result.id
                    }
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "65px minmax(150px, 1fr) minmax(150px, .9fr) 90px",

                      gap:
                        "12px",

                      alignItems:
                        "center",

                      padding:
                        "17px 22px",

                      borderBottom:
                        "1px solid rgba(255,255,255,.045)",

                      opacity:
                        dnf
                          ? 0.68
                          : 1,

                      background:
                        result.isMe
                          ? "rgba(210,38,61,.06)"
                          : "transparent",
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          dnf
                            ? "16px"
                            : "24px",

                        fontWeight:
                          900,

                        color:
                          dnf
                            ? "#ff7183"
                            : "#fff",
                      }}
                    >
                      {dnf
                        ? "DNF"
                        : `P${result.position}`}
                    </div>

                    <div>
                      <div
                        style={{
                          fontWeight:
                            900,
                        }}
                      >
                        {getName(
                          result
                        )}

                        {result.isMe && (
                          <span
                            style={{
                              marginLeft:
                                "8px",

                              color:
                                "#d2263d",

                              fontSize:
                                "8px",
                            }}
                          >
                            SEN
                          </span>
                        )}
                      </div>

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
                        {
                          result.team_name
                        }
                      </div>
                    </div>

                    <div
                      style={{
                        color:
                          "#7d858f",

                        fontSize:
                          "10px",

                        lineHeight:
                          1.45,
                      }}
                    >
                      {dnf ? (
                        <>
                          <strong
                            style={{
                              color:
                                result.incident_type ===
                                "easter_egg"
                                  ? "#ff9aaa"
                                  : "#bbb",
                            }}
                          >
                            {result.incident_type ===
                            "easter_egg"
                              ? "EASTER EGG"
                              : "YARIŞ DIŞI"}
                          </strong>

                          <br />

                          Tur{" "}
                          {result.incident_lap ??
                            "?"}
                        </>
                      ) : (
                        <>
                          {tireLabel(
                            result.starting_tire
                          )}{" "}
                          →{" "}
                          {tireLabel(
                            result.second_tire
                          )}
                          <br />
                          Pit T
                          {
                            result.pit_lap
                          }{" "}
                          ·{" "}
                          {
                            result.aggression
                          }
                          %
                        </>
                      )}
                    </div>

                    <div
                      style={{
                        textAlign:
                          "right",

                        fontSize:
                          "17px",

                        fontWeight:
                          900,
                      }}
                    >
                      +{result.points}

                      <div
                        style={{
                          color:
                            "#6d7580",

                          fontSize:
                            "8px",
                        }}
                      >
                        PTS
                      </div>
                    </div>

                    {dnf &&
                      result.incident_message && (
                        <div
                          style={{
                            gridColumn:
                              "2 / -1",

                            marginTop:
                              "-5px",

                            padding:
                              "10px 12px",

                            borderRadius:
                              "9px",

                            background:
                              "rgba(255,255,255,.025)",

                            color:
                              "#858e98",

                            fontSize:
                              "10px",

                            lineHeight:
                              1.5,
                          }}
                        >
                          {
                            result.incident_message
                          }
                        </div>
                      )}
                  </div>
                );
              }
            )}
          </section>

          <section
            style={{
              marginTop:
                "18px",

              padding:
                "22px",

              border:
                "1px solid rgba(255,255,255,.075)",

              borderRadius:
                "18px",

              background:
                "rgba(255,255,255,.02)",

              textAlign:
                "center",
            }}
          >
            {data.season
              ?.status ===
            "finished" ? (
              <>
                <div
                  style={{
                    color:
                      "#d2263d",

                    fontSize:
                      "10px",

                    fontWeight:
                      900,
                  }}
                >
                  SEASON COMPLETE
                </div>

                <h2>
                  Sezon Tamamlandı
                </h2>
              </>
            ) : (
              <>
                <div
                  style={{
                    color:
                      "#d2263d",

                    fontSize:
                      "10px",

                    fontWeight:
                      900,
                  }}
                >
                  NEXT ROUND
                </div>

                <h2>
                  Round{" "}
                  {
                    data.season
                      ?.current_round
                  }{" "}
                  açıldı
                </h2>

                <p
                  style={{
                    color:
                      "#747d87",

                    fontSize:
                      "12px",
                  }}
                >
                  Yeni yarış için
                  stratejini
                  hazırlayabilirsin.
                </p>
              </>
            )}

            <Link
              href={`/arcade/manager/lobbies/${lobbyId}/game`}
              style={{
                display:
                  "inline-flex",

                marginTop:
                  "10px",

                minWidth:
                  "220px",

                minHeight:
                  "48px",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                borderRadius:
                  "11px",

                background:
                  "#d2263d",

                color:
                  "#fff",

                textDecoration:
                  "none",

                fontWeight:
                  900,
              }}
            >
              Dashboard'a Dön
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}

function getName(
  result: RaceResult
) {
  return (
    result.profile
      ?.display_name ||
    result.profile
      ?.username ||
    "Menajer"
  );
}

function tireLabel(
  tire: string
) {
  if (
    tire === "soft"
  ) {
    return "Soft";
  }

  if (
    tire === "hard"
  ) {
    return "Hard";
  }

  return "Medium";
}