import Link from "next/link";

import Header from "@/components/Header";
import ProfileActions from "@/components/ProfileActions";

import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type Prediction = {
  id: string;
  season: number;
  round: number;
  race_name: string;
  prediction_type: "race" | "sprint";
  p1_driver_number: number;
  p2_driver_number: number;
  p3_driver_number: number;
  points: number;
  created_at: string;
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /*
    GİRİŞ YAPILMAMIŞSA
  */

  if (!user) {
    return (
      <>
        <Header />

        <main>
          <div
            className="site-container"
            style={{
              paddingTop: "70px",
              paddingBottom: "80px",
            }}
          >
            <div
              className="card"
              style={{
                maxWidth: "600px",
                margin: "0 auto",
                padding: "45px",
                textAlign: "center",
              }}
            >
              <div className="eyebrow">
                F1 MEDİPOL · PROFILE
              </div>

              <h1
                style={{
                  fontSize: "38px",
                  margin: "10px 0 12px",
                }}
              >
                Profiline giriş yap
              </h1>

              <p
                style={{
                  color: "#929dab",
                  lineHeight: 1.7,
                  fontSize: "13px",
                }}
              >
                Tahminlerini, puanlarını ve profil
                bilgilerini görmek için hesabına giriş
                yapmalısın.
              </p>

              <Link
                href="/login"
                className="btn btn-red"
                style={{
                  marginTop: "15px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                Giriş Yap →
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  /*
    PROFİL BİLGİLERİ
  */

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `
      display_name,
      username,
      avatar_url,
      bio,
      favorite_team
      `
    )
    .eq("id", user.id)
    .maybeSingle();

  /*
    KULLANICININ TÜM TAHMİNLERİ
  */

  const { data: predictionData } = await supabase
    .from("predictions")
    .select(
      `
      id,
      season,
      round,
      race_name,
      prediction_type,
      p1_driver_number,
      p2_driver_number,
      p3_driver_number,
      points,
      created_at
      `
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  const predictions =
    (predictionData ?? []) as Prediction[];

  /*
    İSTATİSTİKLER
  */

  const totalPoints = predictions.reduce(
    (total, prediction) =>
      total + (prediction.points ?? 0),
    0
  );

  const predictionCount = predictions.length;

  const bestScore =
    predictionCount > 0
      ? Math.max(
          ...predictions.map(
            (prediction) => prediction.points ?? 0
          )
        )
      : 0;

  const recentPredictions =
    predictions.slice(0, 5);

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "F1 Medipol Üyesi";

  const initial =
    displayName.charAt(0).toUpperCase();

  return (
    <>
      <Header />

      <main>
        <div
          className="site-container"
          style={{
            paddingTop: "30px",
            paddingBottom: "80px",
          }}
        >
          {/* PROFİL HERO */}

          <section
            className="card"
            style={{
              minHeight: "270px",
              padding: "35px",
              position: "relative",
              overflow: "hidden",
              background:
                "radial-gradient(circle at 85% 20%,rgba(225,6,0,.18),transparent 32%),linear-gradient(145deg,#262e39,#171d26)",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: "-20px",
                top: "-70px",
                fontSize: "250px",
                fontWeight: 1000,
                color: "rgba(255,255,255,.025)",
                fontStyle: "italic",
                pointerEvents: "none",
              }}
            >
              F1
            </div>

            <div
              style={{
                position: "relative",
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                gap: "24px",
              }}
            >
              {/* AVATAR */}

              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  style={{
                    width: "105px",
                    height: "105px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border:
                      "3px solid rgba(255,255,255,.12)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "105px",
                    height: "105px",
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    background:
                      "linear-gradient(135deg,#e10600,#ff5149)",
                    fontSize: "42px",
                    fontWeight: 1000,
                    boxShadow:
                      "0 15px 45px rgba(225,6,0,.22)",
                  }}
                >
                  {initial}
                </div>
              )}

              <div>
                <div className="eyebrow">
                  F1 MEDİPOL · DRIVER PROFILE
                </div>

                <h1
                  style={{
                    margin: "7px 0 5px",
                    fontSize: "42px",
                    letterSpacing: "-.04em",
                  }}
                >
                  {displayName}
                </h1>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    color: "#9da8b5",
                    fontSize: "12px",
                  }}
                >
                  {profile?.username && (
                    <span>
                      @{profile.username}
                    </span>
                  )}

                  {user.email && (
                    <span>
                      {user.email}
                    </span>
                  )}
                </div>

                {profile?.bio && (
                  <p
                    style={{
                      margin: "13px 0 0",
                      color: "#b7c0ca",
                      fontSize: "13px",
                      maxWidth: "650px",
                      lineHeight: 1.6,
                    }}
                  >
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* İSTATİSTİKLER */}

          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3,minmax(0,1fr))",
              gap: "14px",
              marginTop: "14px",
            }}
          >
            <div
              className="card"
              style={{
                padding: "24px",
              }}
            >
              <div className="eyebrow">
                TOPLAM PUAN
              </div>

              <div
                style={{
                  fontSize: "46px",
                  fontWeight: 1000,
                  marginTop: "8px",
                  letterSpacing: "-.05em",
                }}
              >
                {totalPoints}
              </div>

              <div
                style={{
                  color: "#8894a2",
                  fontSize: "11px",
                  marginTop: "4px",
                }}
              >
                Prediction Championship
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: "24px",
              }}
            >
              <div className="eyebrow">
                TAHMİN SAYISI
              </div>

              <div
                style={{
                  fontSize: "46px",
                  fontWeight: 1000,
                  marginTop: "8px",
                  letterSpacing: "-.05em",
                }}
              >
                {predictionCount}
              </div>

              <div
                style={{
                  color: "#8894a2",
                  fontSize: "11px",
                  marginTop: "4px",
                }}
              >
                Kaydedilmiş yarış tahmini
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: "24px",
              }}
            >
              <div className="eyebrow">
                EN İYİ YARIŞ
              </div>

              <div
                style={{
                  fontSize: "46px",
                  fontWeight: 1000,
                  marginTop: "8px",
                  letterSpacing: "-.05em",
                }}
              >
                {bestScore}
              </div>

              <div
                style={{
                  color: "#8894a2",
                  fontSize: "11px",
                  marginTop: "4px",
                }}
              >
                Tek yarışta kazanılan en yüksek puan
              </div>
            </div>
          </section>

          {/* ALT ALAN */}

          <section
            style={{
              marginTop: "14px",
              display: "grid",
              gridTemplateColumns:
                "minmax(0,1.35fr) minmax(280px,.65fr)",
              gap: "14px",
            }}
          >
            {/* SON TAHMİNLER */}

            <div
              className="card"
              style={{
                padding: "28px",
              }}
            >
              <div className="eyebrow">
                PREDICTION HISTORY
              </div>

              <h2
                style={{
                  margin: "7px 0 22px",
                  fontSize: "27px",
                }}
              >
                Son Tahminler
              </h2>

              {recentPredictions.length === 0 ? (
                <div
                  style={{
                    minHeight: "180px",
                    display: "grid",
                    placeItems: "center",
                    textAlign: "center",
                    color: "#8994a2",
                    fontSize: "13px",
                  }}
                >
                  Henüz kayıtlı tahminin yok.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "9px",
                  }}
                >
                  {recentPredictions.map(
                    (prediction) => (
                      <div
                        key={prediction.id}
                        style={{
                          padding: "16px",
                          borderRadius: "12px",
                          border:
                            "1px solid rgba(255,255,255,.07)",
                          background:
                            "rgba(255,255,255,.025)",
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "center",
                          gap: "20px",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 900,
                              fontSize: "14px",
                            }}
                          >
                            {prediction.race_name}
                          </div>

                          <div
                            style={{
                              color: "#7f8b99",
                              fontSize: "10px",
                              marginTop: "5px",
                            }}
                          >
                            {prediction.season}
                            {" · "}
                            Round {prediction.round}
                            {" · "}
                            {prediction.prediction_type ===
                            "sprint"
                              ? "Sprint"
                              : "Race"}
                          </div>

                          <div
                            style={{
                              color: "#aeb8c4",
                              fontSize: "11px",
                              marginTop: "8px",
                            }}
                          >
                            P1 #
                            {
                              prediction.p1_driver_number
                            }
                            {" · "}
                            P2 #
                            {
                              prediction.p2_driver_number
                            }
                            {" · "}
                            P3 #
                            {
                              prediction.p3_driver_number
                            }
                          </div>
                        </div>

                        <div
                          style={{
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >
                          <strong
                            style={{
                              fontSize: "28px",
                              color:
                                prediction.points > 0
                                  ? "#35d477"
                                  : "#f5f7fa",
                            }}
                          >
                            {prediction.points}
                          </strong>

                          <div
                            style={{
                              color: "#7e8997",
                              fontSize: "9px",
                              fontWeight: 900,
                            }}
                          >
                            PUAN
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* PROFİL BİLGİLERİ */}

            <aside
              className="card"
              style={{
                padding: "28px",
              }}
            >
              <div className="eyebrow">
                DRIVER INFO
              </div>

              <h2
                style={{
                  margin: "7px 0 20px",
                  fontSize: "25px",
                }}
              >
                Profil Bilgileri
              </h2>

              <div
                style={{
                  display: "grid",
                  gap: "15px",
                }}
              >
                <div>
                  <small
                    style={{
                      color: "#7e8997",
                      fontWeight: 900,
                    }}
                  >
                    GÖRÜNEN AD
                  </small>

                  <div
                    style={{
                      fontWeight: 900,
                      marginTop: "4px",
                    }}
                  >
                    {displayName}
                  </div>
                </div>

                <div>
                  <small
                    style={{
                      color: "#7e8997",
                      fontWeight: 900,
                    }}
                  >
                    FAVORİ TAKIM
                  </small>

                  <div
                    style={{
                      fontWeight: 900,
                      marginTop: "4px",
                    }}
                  >
                    {profile?.favorite_team ||
                      "Henüz seçilmedi"}
                  </div>
                </div>

                <div>
                  <small
                    style={{
                      color: "#7e8997",
                      fontWeight: 900,
                    }}
                  >
                    ÜYELİK
                  </small>

                  <div
                    style={{
                      fontWeight: 900,
                      marginTop: "4px",
                      color: "#35d477",
                    }}
                  >
                    AKTİF
                  </div>
                </div>
              </div>

              {/* TAHMİN BUTONU */}

              <Link
                href="/predict"
                className="btn btn-red"
                style={{
                  marginTop: "25px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                Tahmin Merkezine Git →
              </Link>

              {/* ÇIKIŞ BUTONU */}

              <ProfileActions />
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}