import Header from "@/components/Header";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

import { getTeamBranding } from "@/lib/team-branding";

export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  favorite_team: string | null;
};

type Prediction = {
  user_id: string;
  prediction_type: "race" | "sprint";
  points: number;
};

type LeaderboardUser = {
  userId: string;

  displayName: string;
  username: string | null;

  favoriteTeam: string | null;

  totalPoints: number;
  racePoints: number;
  sprintPoints: number;

  predictionCount: number;
  bestScore: number;
};

export default async function LeaderboardPage() {
  /*
    NORMAL SUPABASE:
    SADECE MEVCUT KULLANICIYI
    TANIMAK İÇİN
  */

  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /*
    ADMIN CLIENT:

    Liderlik tablosu için tüm
    kullanıcıların tahminlerini
    sunucu tarafında okuyoruz.

    Secret key hiçbir zaman
    tarayıcıya gönderilmez.
  */

  const admin =
    createAdminClient();

  const [
    profilesResponse,
    predictionsResponse,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select(
        `
        id,
        display_name,
        username,
        favorite_team
        `
      ),

    admin
      .from("predictions")
      .select(
        `
        user_id,
        prediction_type,
        points
        `
      ),
  ]);

  const profiles =
    (profilesResponse.data ??
      []) as Profile[];

  const predictions =
    (predictionsResponse.data ??
      []) as Prediction[];

  /*
    USER ID -> PROFİL
  */

  const profileMap =
    new Map<
      string,
      Profile
    >();

  profiles.forEach(
    (profile) => {
      profileMap.set(
        profile.id,
        profile
      );
    }
  );

  /*
    PUANLARI KULLANICIYA
    GÖRE TOPLA
  */

  const rankingMap =
    new Map<
      string,
      LeaderboardUser
    >();

  predictions.forEach(
    (prediction) => {
      const profile =
        profileMap.get(
          prediction.user_id
        );

      const existing =
        rankingMap.get(
          prediction.user_id
        );

      const points =
        Number(
          prediction.points ??
            0
        );

      if (!existing) {
        rankingMap.set(
          prediction.user_id,
          {
            userId:
              prediction.user_id,

            displayName:
              profile?.display_name ||
              profile?.username ||
              "F1 Medipol Üyesi",

            username:
              profile?.username ??
              null,

            favoriteTeam:
              profile?.favorite_team ??
              null,

            totalPoints:
              points,

            racePoints:
              prediction.prediction_type ===
              "race"
                ? points
                : 0,

            sprintPoints:
              prediction.prediction_type ===
              "sprint"
                ? points
                : 0,

            predictionCount:
              1,

            bestScore:
              points,
          }
        );

        return;
      }

      existing.totalPoints +=
        points;

      existing.predictionCount +=
        1;

      existing.bestScore =
        Math.max(
          existing.bestScore,
          points
        );

      if (
        prediction.prediction_type ===
        "race"
      ) {
        existing.racePoints +=
          points;
      } else {
        existing.sprintPoints +=
          points;
      }
    }
  );

  /*
    HENÜZ TAHMİN YAPMAMIŞ
    PROFİLLERİ DE EKLE
  */

  profiles.forEach(
    (profile) => {
      if (
        rankingMap.has(
          profile.id
        )
      ) {
        return;
      }

      rankingMap.set(
        profile.id,
        {
          userId: profile.id,

          displayName:
            profile.display_name ||
            profile.username ||
            "F1 Medipol Üyesi",

          username:
            profile.username,

          favoriteTeam:
            profile.favorite_team,

          totalPoints: 0,
          racePoints: 0,
          sprintPoints: 0,

          predictionCount: 0,
          bestScore: 0,
        }
      );
    }
  );

  /*
    SIRALAMA

    1. Toplam puan
    2. En yüksek tek yarış puanı
    3. Tahmin sayısı
  */

  const leaderboard =
    Array.from(
      rankingMap.values()
    ).sort((a, b) => {
      if (
        b.totalPoints !==
        a.totalPoints
      ) {
        return (
          b.totalPoints -
          a.totalPoints
        );
      }

      if (
        b.bestScore !==
        a.bestScore
      ) {
        return (
          b.bestScore -
          a.bestScore
        );
      }

      return (
        b.predictionCount -
        a.predictionCount
      );
    });

  const podium =
    leaderboard.slice(
      0,
      3
    );

  const currentUserRank =
    user
      ? leaderboard.findIndex(
          (entry) =>
            entry.userId ===
            user.id
        ) + 1
      : 0;

  /*
    TOPLAM İSTATİSTİKLER
  */

  const totalPlayers =
    leaderboard.length;

  const totalPredictions =
    predictions.length;

  const totalPointsAwarded =
    predictions.reduce(
      (total, prediction) =>
        total +
        Number(
          prediction.points ??
            0
        ),
      0
    );

  return (
    <>
      <Header />

      <main>
        <div
          className="site-container"
          style={{
            paddingTop:
              "30px",

            paddingBottom:
              "80px",
          }}
        >
          {/* BAŞLIK */}

          <div className="eyebrow">
            F1 MEDİPOL ·
            PREDICTION CHAMPIONSHIP
          </div>

          <h1
            style={{
              margin:
                "8px 0 5px",

              fontSize:
                "52px",

              letterSpacing:
                "-.05em",
            }}
          >
            LİDERLİK TABLOSU
          </h1>

          <p
            style={{
              margin: 0,

              color:
                "#929dab",

              fontSize:
                "13px",

              maxWidth:
                "650px",

              lineHeight:
                1.6,
            }}
          >
            Yarış ve Sprint
            tahminlerinden
            kazandığın puanlarla
            F1 Medipol Prediction
            Championship&apos;te
            yüksel.
          </p>

          {/* GENEL İSTATİSTİKLER */}

          <section
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(3,minmax(0,1fr))",

              gap: "14px",

              marginTop:
                "24px",
            }}
          >
            <div
              className="card"
              style={{
                padding:
                  "22px",
              }}
            >
              <div className="eyebrow">
                KATILIMCI
              </div>

              <div
                style={{
                  marginTop:
                    "7px",

                  fontSize:
                    "38px",

                  fontWeight:
                    1000,
                }}
              >
                {totalPlayers}
              </div>

              <div
                style={{
                  color:
                    "#7e8997",

                  fontSize:
                    "10px",
                }}
              >
                Şampiyonadaki
                kullanıcı
              </div>
            </div>

            <div
              className="card"
              style={{
                padding:
                  "22px",
              }}
            >
              <div className="eyebrow">
                TAHMİN
              </div>

              <div
                style={{
                  marginTop:
                    "7px",

                  fontSize:
                    "38px",

                  fontWeight:
                    1000,
                }}
              >
                {
                  totalPredictions
                }
              </div>

              <div
                style={{
                  color:
                    "#7e8997",

                  fontSize:
                    "10px",
                }}
              >
                Race + Sprint
                tahmini
              </div>
            </div>

            <div
              className="card"
              style={{
                padding:
                  "22px",
              }}
            >
              <div className="eyebrow">
                DAĞITILAN PUAN
              </div>

              <div
                style={{
                  marginTop:
                    "7px",

                  fontSize:
                    "38px",

                  fontWeight:
                    1000,
                }}
              >
                {
                  totalPointsAwarded
                }
              </div>

              <div
                style={{
                  color:
                    "#7e8997",

                  fontSize:
                    "10px",
                }}
              >
                Toplam
                championship
                puanı
              </div>
            </div>
          </section>

          {/* İLK 3 */}

          {podium.length >
            0 && (
            <section
              style={{
                marginTop:
                  "14px",

                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(3,minmax(0,1fr))",

                gap: "14px",
              }}
            >
              {podium.map(
                (
                  entry,
                  index
                ) => {
                  const rank =
                    index + 1;

                  const team =
                    getTeamBranding(
                      entry.favoriteTeam
                    );

                  const isMe =
                    user?.id ===
                    entry.userId;

                  return (
                    <div
                      key={
                        entry.userId
                      }
                      className="card"
                      style={{
                        minHeight:
                          rank ===
                          1
                            ? "245px"
                            : "220px",

                        padding:
                          "25px",

                        position:
                          "relative",

                        overflow:
                          "hidden",

                        border:
                          isMe
                            ? "1px solid rgba(255,80,72,.55)"
                            : "1px solid rgba(255,255,255,.08)",

                        background:
                          rank ===
                          1
                            ? "radial-gradient(circle at 80% 10%,rgba(255,198,40,.13),transparent 35%),linear-gradient(145deg,#28303b,#171d26)"
                            : "linear-gradient(145deg,#242c37,#171d26)",
                      }}
                    >
                      {/* RANK */}

                      <div
                        style={{
                          position:
                            "absolute",

                          right:
                            "12px",

                          top:
                            "-25px",

                          fontSize:
                            "130px",

                          fontWeight:
                            1000,

                          fontStyle:
                            "italic",

                          color:
                            "rgba(255,255,255,.035)",
                        }}
                      >
                        {rank}
                      </div>

                      <div
                        style={{
                          position:
                            "relative",

                          zIndex: 2,
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
                          }}
                        >
                          <span
                            style={{
                              minWidth:
                                "42px",

                              height:
                                "28px",

                              padding:
                                "0 9px",

                              borderRadius:
                                "999px",

                              display:
                                "grid",

                              placeItems:
                                "center",

                              background:
                                rank ===
                                1
                                  ? "rgba(255,196,40,.13)"
                                  : "rgba(255,255,255,.05)",

                              color:
                                rank ===
                                1
                                  ? "#ffd35a"
                                  : "#b3bdc8",

                              fontWeight:
                                1000,

                              fontSize:
                                "11px",
                            }}
                          >
                            P{rank}
                          </span>

                          {isMe && (
                            <span
                              style={{
                                color:
                                  "#ff625b",

                                fontSize:
                                  "9px",

                                fontWeight:
                                  1000,
                              }}
                            >
                              SEN
                            </span>
                          )}
                        </div>

                        {/* TAKIM */}

                        {team && (
                          <div
                            style={{
                              width:
                                "60px",

                              height:
                                "50px",

                              marginTop:
                                "20px",

                              borderRadius:
                                "10px",

                              background:
                                "white",

                              display:
                                "grid",

                              placeItems:
                                "center",

                              overflow:
                                "hidden",
                            }}
                          >
                            <img
                              src={
                                team.logoUrl
                              }
                              alt={
                                team.name
                              }
                              style={{
                                width:
                                  "48px",

                                height:
                                  "38px",

                                objectFit:
                                  "contain",
                              }}
                            />
                          </div>
                        )}

                        <h2
                          style={{
                            margin:
                              "15px 0 3px",

                            fontSize:
                              "24px",
                          }}
                        >
                          {
                            entry.displayName
                          }
                        </h2>

                        {entry.username && (
                          <div
                            style={{
                              color:
                                "#788493",

                              fontSize:
                                "10px",
                            }}
                          >
                            @
                            {
                              entry.username
                            }
                          </div>
                        )}

                        <div
                          style={{
                            marginTop:
                              "18px",

                            display:
                              "flex",

                            alignItems:
                              "flex-end",

                            gap: "7px",
                          }}
                        >
                          <strong
                            style={{
                              fontSize:
                                "42px",

                              lineHeight:
                                1,

                              letterSpacing:
                                "-.05em",
                            }}
                          >
                            {
                              entry.totalPoints
                            }
                          </strong>

                          <span
                            style={{
                              color:
                                "#7e8997",

                              fontSize:
                                "10px",

                              fontWeight:
                                900,

                              marginBottom:
                                "5px",
                            }}
                          >
                            PUAN
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </section>
          )}

          {/* TABLO */}

          <section
            className="card"
            style={{
              marginTop:
                "14px",

              padding:
                "28px",
            }}
          >
            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                gap: "20px",

                marginBottom:
                  "22px",
              }}
            >
              <div>
                <div className="eyebrow">
                  CHAMPIONSHIP
                  STANDINGS
                </div>

                <h2
                  style={{
                    margin:
                      "6px 0 0",

                    fontSize:
                      "28px",
                  }}
                >
                  Genel Sıralama
                </h2>
              </div>

              {currentUserRank >
                0 && (
                <div
                  style={{
                    padding:
                      "9px 13px",

                    borderRadius:
                      "10px",

                    border:
                      "1px solid rgba(225,6,0,.22)",

                    background:
                      "rgba(225,6,0,.07)",

                    fontSize:
                      "11px",

                    fontWeight:
                      900,
                  }}
                >
                  Sıralaman: P
                  {
                    currentUserRank
                  }
                </div>
              )}
            </div>

            {leaderboard.length ===
            0 ? (
              <div
                style={{
                  minHeight:
                    "220px",

                  display:
                    "grid",

                  placeItems:
                    "center",

                  color:
                    "#8994a2",
                }}
              >
                Henüz sıralama
                verisi yok.
              </div>
            ) : (
              <div
                style={{
                  display:
                    "grid",

                  gap: "8px",
                }}
              >
                {leaderboard.map(
                  (
                    entry,
                    index
                  ) => {
                    const rank =
                      index +
                      1;

                    const isMe =
                      user?.id ===
                      entry.userId;

                    const team =
                      getTeamBranding(
                        entry.favoriteTeam
                      );

                    return (
                      <div
                        key={
                          entry.userId
                        }
                        style={{
                          minHeight:
                            "72px",

                          padding:
                            "10px 15px",

                          borderRadius:
                            "12px",

                          border:
                            isMe
                              ? "1px solid rgba(255,80,72,.55)"
                              : "1px solid rgba(255,255,255,.07)",

                          background:
                            isMe
                              ? "linear-gradient(90deg,rgba(225,6,0,.10),rgba(255,255,255,.025))"
                              : "rgba(255,255,255,.025)",

                          display:
                            "grid",

                          gridTemplateColumns:
                            "55px minmax(190px,1fr) 100px 100px 110px 90px",

                          alignItems:
                            "center",

                          gap:
                            "12px",
                        }}
                      >
                        {/* RANK */}

                        <div
                          style={{
                            fontSize:
                              "19px",

                            fontWeight:
                              1000,

                            color:
                              rank <=
                              3
                                ? "#ff625b"
                                : "#8b96a4",
                          }}
                        >
                          P{rank}
                        </div>

                        {/* KULLANICI */}

                        <div
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "center",

                            gap:
                              "11px",

                            minWidth:
                              0,
                          }}
                        >
                          {team ? (
                            <div
                              style={{
                                width:
                                  "40px",

                                height:
                                  "40px",

                                borderRadius:
                                  "9px",

                                background:
                                  "white",

                                display:
                                  "grid",

                                placeItems:
                                  "center",

                                overflow:
                                  "hidden",

                                flexShrink:
                                  0,
                              }}
                            >
                              <img
                                src={
                                  team.logoUrl
                                }
                                alt={
                                  team.name
                                }
                                style={{
                                  width:
                                    "31px",

                                  height:
                                    "31px",

                                  objectFit:
                                    "contain",
                                }}
                              />
                            </div>
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
                                  "linear-gradient(135deg,#e10600,#ff5149)",

                                display:
                                  "grid",

                                placeItems:
                                  "center",

                                fontWeight:
                                  1000,

                                flexShrink:
                                  0,
                              }}
                            >
                              {entry.displayName
                                .charAt(
                                  0
                                )
                                .toUpperCase()}
                            </div>
                          )}

                          <div
                            style={{
                              minWidth:
                                0,
                            }}
                          >
                            <div
                              style={{
                                fontWeight:
                                  1000,

                                whiteSpace:
                                  "nowrap",

                                overflow:
                                  "hidden",

                                textOverflow:
                                  "ellipsis",
                              }}
                            >
                              {
                                entry.displayName
                              }

                              {isMe &&
                                " · SEN"}
                            </div>

                            <div
                              style={{
                                marginTop:
                                  "3px",

                                color:
                                  "#747f8d",

                                fontSize:
                                  "9px",
                              }}
                            >
                              {entry.username
                                ? `@${entry.username}`
                                : entry.favoriteTeam ||
                                  "F1 Medipol"}
                            </div>
                          </div>
                        </div>

                        {/* RACE */}

                        <div>
                          <div
                            style={{
                              color:
                                "#747f8d",

                              fontSize:
                                "8px",

                              fontWeight:
                                900,
                            }}
                          >
                            RACE
                          </div>

                          <b>
                            {
                              entry.racePoints
                            }
                          </b>
                        </div>

                        {/* SPRINT */}

                        <div>
                          <div
                            style={{
                              color:
                                "#747f8d",

                              fontSize:
                                "8px",

                              fontWeight:
                                900,
                            }}
                          >
                            SPRINT
                          </div>

                          <b>
                            {
                              entry.sprintPoints
                            }
                          </b>
                        </div>

                        {/* TAHMİN */}

                        <div>
                          <div
                            style={{
                              color:
                                "#747f8d",

                              fontSize:
                                "8px",

                              fontWeight:
                                900,
                            }}
                          >
                            TAHMİN
                          </div>

                          <b>
                            {
                              entry.predictionCount
                            }
                          </b>
                        </div>

                        {/* TOPLAM */}

                        <div
                          style={{
                            textAlign:
                              "right",
                          }}
                        >
                          <strong
                            style={{
                              fontSize:
                                "25px",
                            }}
                          >
                            {
                              entry.totalPoints
                            }
                          </strong>

                          <div
                            style={{
                              color:
                                "#747f8d",

                              fontSize:
                                "8px",

                              fontWeight:
                                900,
                            }}
                          >
                            PUAN
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}