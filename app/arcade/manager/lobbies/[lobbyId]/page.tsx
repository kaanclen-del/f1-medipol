"use client";

import {
  ReactNode,
  use,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import Header from "@/components/Header";

type LobbyData = {
  lobby: {
    id: string;
    created_by: string;
    name: string;
    join_code: string;
    visibility: "public" | "private";
    mode: "casual" | "ranked";
    status: string;
    max_players: number;
    created_at: string;
    started_at: string | null;
  };

  members: Array<{
    id: string;
    lobby_id: string;
    user_id: string;
    role: "owner" | "member";
    status: string;
    is_ready: boolean;
    joined_at: string;

    profile: {
      id: string;
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
    } | null;
  }>;

  memberCount: number;

  currentUserId: string | null;

  currentMember: {
    id: string;
    user_id: string;
    role: "owner" | "member";
    status: string;
    is_ready: boolean;
  } | null;

  isOwner: boolean;
};

export default function LobbyRoomPage({
  params,
}: {
  params: Promise<{
    lobbyId: string;
  }>;
}) {
  const { lobbyId } = use(params);

  const [data, setData] =
    useState<LobbyData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [updatingReady, setUpdatingReady] =
    useState(false);

  const [leaving, setLeaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function loadLobby(
    silent = false
  ) {
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await fetch(
        `/api/arcade/manager/lobbies/${lobbyId}`,
        {
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setData(null);
        }

        setMessage(
          result?.error ||
            "Lobi yüklenemedi."
        );

        return;
      }

      setData(result);
    } catch {
      setMessage(
        "Lobi yüklenirken hata oluştu."
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  /*
    LOBİ BİLGİLERİNİ 3 SANİYEDE BİR YENİLE
  */

  useEffect(() => {
    loadLobby();

    const interval =
      window.setInterval(() => {
        loadLobby(true);
      }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [lobbyId]);

  /*
    HEARTBEAT

    Kullanıcı bu sayfadayken her 10 saniyede
    bir sunucuya "hala lobideyim" bilgisi gider.
  */

  useEffect(() => {
    async function sendHeartbeat() {
      try {
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/heartbeat`,
          {
            method: "POST",
          }
        );
      } catch {
        /*
          Bağlantı geçici olarak kesilirse
          sonraki heartbeat tekrar deneyecek.
        */
      }
    }

    sendHeartbeat();

    const heartbeatInterval =
      window.setInterval(() => {
        sendHeartbeat();
      }, 10000);

    return () => {
      window.clearInterval(
        heartbeatInterval
      );
    };
  }, [lobbyId]);

  /*
    HAZIR / HAZIR DEĞİL
  */

  async function toggleReady() {
    if (!data?.currentMember) {
      return;
    }

    setMessage("");
    setUpdatingReady(true);

    try {
      const response = await fetch(
        `/api/arcade/manager/lobbies/${lobbyId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            isReady:
              !data.currentMember
                .is_ready,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ||
            "Hazır durumu güncellenemedi."
        );

        return;
      }

      await loadLobby(true);
    } catch {
      setMessage(
        "Hazır durumu güncellenirken hata oluştu."
      );
    } finally {
      setUpdatingReady(false);
    }
  }

  /*
    LOBİDEN AYRIL
  */

  async function leaveLobby() {
    if (!data?.currentMember) {
      return;
    }

    const confirmed =
      window.confirm(
        data.memberCount === 1
          ? "Lobiden ayrılırsan bu lobi tamamen silinecek. Ayrılmak istiyor musun?"
          : data.isOwner
          ? "Lobi sahibisin. Ayrılırsan sahiplik başka bir oyuncuya aktarılacak. Devam etmek istiyor musun?"
          : "Lobiden ayrılmak istiyor musun?"
      );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setLeaving(true);

    try {
      const response = await fetch(
        `/api/arcade/manager/lobbies/${lobbyId}`,
        {
          method: "DELETE",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ||
            "Lobiden ayrılamadın."
        );

        setLeaving(false);

        return;
      }

      window.location.href =
        "/arcade/manager";
    } catch {
      setMessage(
        "Lobiden ayrılırken hata oluştu."
      );

      setLeaving(false);
    }
  }

  /*
    LOADING
  */

  if (loading) {
    return (
      <>
        <Header />

        <main
          style={{
            minHeight: "100vh",

            background:
              "radial-gradient(circle at top, #181010 0%, #080808 42%, #050505 100%)",

            color: "#fff",

            padding: "80px 24px",
          }}
        >
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              color: "#9299a3",
            }}
          >
            Lobi yükleniyor...
          </div>
        </main>
      </>
    );
  }

  /*
    LOBİ BULUNAMADI
  */

  if (!data) {
    return (
      <>
        <Header />

        <main
          style={{
            minHeight: "100vh",
            background: "#070707",
            color: "#fff",
            padding: "80px 24px",
          }}
        >
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
            }}
          >
            <h1>
              Lobi bulunamadı
            </h1>

            <p
              style={{
                color: "#9299a3",
              }}
            >
              {message ||
                "Bu lobi artık mevcut olmayabilir."}
            </p>

            <Link
              href="/arcade/manager"
              style={{
                color: "#fff",
              }}
            >
              ← Manager&apos;a dön
            </Link>
          </div>
        </main>
      </>
    );
  }

  const currentMember =
    data.currentMember;

  const readyCount =
    data.members.filter(
      (member) =>
        member.is_ready
    ).length;

  return (
    <>
      <Header />

      <main
        style={{
          minHeight: "100vh",

          background:
            "radial-gradient(circle at top, #181010 0%, #080808 42%, #050505 100%)",

          color: "#fff",

          padding:
            "52px 24px 100px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1280px",
            margin: "0 auto",
          }}
        >
          <Link
            href="/arcade/manager"
            style={{
              color: "#7f8791",
              textDecoration: "none",
              fontSize: "13px",
            }}
          >
            ← Manager
          </Link>

          {/* LOBİ BAŞLIĞI */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
              gap: "20px",
              flexWrap: "wrap",
              marginTop: "22px",
              marginBottom: "34px",
            }}
          >
            <div>
              <div
                style={{
                  color: "#d2263d",
                  fontSize: "11px",
                  fontWeight: 900,
                  letterSpacing:
                    "1.6px",
                  marginBottom: "10px",
                }}
              >
                MANAGER LOBBY
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize:
                    "clamp(38px, 6vw, 64px)",
                  letterSpacing:
                    "-2px",
                  lineHeight: 1,
                }}
              >
                {data.lobby.name}
              </h1>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "15px",
                }}
              >
                <Badge>
                  {data.lobby.mode ===
                  "ranked"
                    ? "RANKED"
                    : "CASUAL"}
                </Badge>

                <Badge>
                  {data.lobby.visibility ===
                  "private"
                    ? "ÖZEL"
                    : "AÇIK"}
                </Badge>

                <Badge>
                  {data.memberCount}/
                  {data.lobby.max_players}{" "}
                  OYUNCU
                </Badge>
              </div>
            </div>

            {/* DAVET KODU */}

            <div
              style={{
                minWidth: "220px",
                border:
                  "1px solid rgba(210,38,61,.28)",
                borderRadius: "16px",
                padding: "17px 20px",
                background:
                  "rgba(210,38,61,.08)",
              }}
            >
              <div
                style={{
                  color: "#9a9fa7",
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing:
                    "1.4px",
                  marginBottom: "6px",
                }}
              >
                DAVET KODU
              </div>

              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 900,
                  letterSpacing: "5px",
                }}
              >
                {data.lobby.join_code}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0, 1fr) 320px",
              gap: "22px",
              alignItems: "start",
            }}
          >
            {/* OYUNCULAR */}

            <section
              style={{
                border:
                  "1px solid rgba(255,255,255,.08)",
                borderRadius: "22px",
                background:
                  "rgba(255,255,255,.025)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding:
                    "22px 24px",
                  borderBottom:
                    "1px solid rgba(255,255,255,.07)",
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: "15px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#d2263d",
                      fontWeight: 900,
                      letterSpacing:
                        "1.4px",
                    }}
                  >
                    GRID
                  </div>

                  <h2
                    style={{
                      margin: "5px 0 0",
                      fontSize: "24px",
                    }}
                  >
                    Oyuncular
                  </h2>
                </div>

                <div
                  style={{
                    color: "#9299a3",
                    fontSize: "12px",
                  }}
                >
                  {readyCount} hazır
                </div>
              </div>

              <div>
                {data.members.map(
                  (
                    member,
                    index
                  ) => {
                    const name =
                      member.profile
                        ?.display_name ||
                      member.profile
                        ?.username ||
                      "Menajer";

                    return (
                      <div
                        key={member.id}
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          gap: "14px",
                          padding:
                            "17px 22px",
                          borderBottom:
                            index ===
                            data.members
                              .length -
                              1
                              ? "none"
                              : "1px solid rgba(255,255,255,.055)",
                        }}
                      >
                        {/* AVATAR */}

                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius:
                              "50%",
                            overflow:
                              "hidden",
                            background:
                              "#181b20",
                            display: "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            flexShrink: 0,
                            border:
                              member.role ===
                              "owner"
                                ? "2px solid #d2263d"
                                : "1px solid rgba(255,255,255,.08)",
                          }}
                        >
                          {member.profile
                            ?.avatar_url ? (
                            <img
                              src={
                                member
                                  .profile
                                  .avatar_url
                              }
                              alt={name}
                              style={{
                                width:
                                  "100%",
                                height:
                                  "100%",
                                objectFit:
                                  "cover",
                              }}
                            />
                          ) : (
                            <span>
                              👤
                            </span>
                          )}
                        </div>

                        {/* KULLANICI */}

                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: "8px",
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <strong
                              style={{
                                fontSize:
                                  "14px",
                              }}
                            >
                              {name}
                            </strong>

                            {member.role ===
                              "owner" && (
                              <span
                                style={{
                                  color:
                                    "#d2263d",
                                  fontSize:
                                    "10px",
                                  fontWeight:
                                    900,
                                }}
                              >
                                👑 SAHİP
                              </span>
                            )}

                            {member.user_id ===
                              data.currentUserId && (
                              <span
                                style={{
                                  color:
                                    "#777f8a",
                                  fontSize:
                                    "10px",
                                }}
                              >
                                SEN
                              </span>
                            )}
                          </div>

                          {member.profile
                            ?.username && (
                            <div
                              style={{
                                color:
                                  "#747d89",
                                fontSize:
                                  "11px",
                                marginTop:
                                  "3px",
                              }}
                            >
                              @
                              {
                                member
                                  .profile
                                  .username
                              }
                            </div>
                          )}
                        </div>

                        {/* HAZIR DURUMU */}

                        <div
                          style={{
                            padding:
                              "7px 11px",
                            borderRadius:
                              "999px",
                            fontSize:
                              "10px",
                            fontWeight:
                              900,
                            background:
                              member.is_ready
                                ? "rgba(80,200,120,.10)"
                                : "rgba(255,255,255,.04)",
                            color:
                              member.is_ready
                                ? "#8de3a5"
                                : "#777f88",
                            border:
                              member.is_ready
                                ? "1px solid rgba(80,200,120,.2)"
                                : "1px solid rgba(255,255,255,.06)",
                          }}
                        >
                          {member.is_ready
                            ? "HAZIR"
                            : "BEKLİYOR"}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>

            {/* SAĞ PANEL */}

            <aside
              style={{
                display: "grid",
                gap: "16px",
              }}
            >
              {/* HAZIR DURUMU */}

              <section
                style={{
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  borderRadius: "20px",
                  background:
                    "rgba(255,255,255,.025)",
                  padding: "22px",
                }}
              >
                <div
                  style={{
                    color: "#d2263d",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing:
                      "1.4px",
                  }}
                >
                  DURUM
                </div>

                <h3
                  style={{
                    margin: "8px 0 8px",
                    fontSize: "21px",
                  }}
                >
                  Hazır mısın?
                </h3>

                <p
                  style={{
                    margin: "0 0 18px",
                    color: "#7d8590",
                    fontSize: "12px",
                    lineHeight: 1.6,
                  }}
                >
                  Oyuna başlamadan önce
                  hazır durumunu işaretle.
                </p>

                {currentMember ? (
                  <button
                    type="button"
                    onClick={toggleReady}
                    disabled={
                      updatingReady ||
                      data.lobby.status !==
                        "waiting"
                    }
                    style={{
                      width: "100%",
                      minHeight: "48px",
                      border: 0,
                      borderRadius: "11px",
                      background:
                        currentMember.is_ready
                          ? "rgba(255,255,255,.08)"
                          : "#d2263d",
                      color: "#fff",
                      fontWeight: 900,
                      cursor:
                        updatingReady
                          ? "wait"
                          : "pointer",
                      opacity:
                        updatingReady
                          ? 0.6
                          : 1,
                    }}
                  >
                    {updatingReady
                      ? "Güncelleniyor..."
                      : currentMember.is_ready
                      ? "Hazır Değilim"
                      : "Hazırım"}
                  </button>
                ) : (
                  <div
                    style={{
                      color: "#ff9ca9",
                      fontSize: "12px",
                      lineHeight: 1.5,
                    }}
                  >
                    Bu lobinin üyesi değilsin.
                  </div>
                )}
              </section>

              {/* HOST CONTROL */}

              {data.isOwner && (
                <section
                  style={{
                    border:
                      "1px solid rgba(210,38,61,.22)",
                    borderRadius: "20px",
                    background:
                      "rgba(210,38,61,.06)",
                    padding: "22px",
                  }}
                >
                  <div
                    style={{
                      color: "#d2263d",
                      fontSize: "11px",
                      fontWeight: 900,
                      letterSpacing:
                        "1.4px",
                    }}
                  >
                    HOST CONTROL
                  </div>

                  <h3
                    style={{
                      margin: "8px 0 8px",
                      fontSize: "21px",
                    }}
                  >
                    Oyunu Başlat
                  </h3>

                  <p
                    style={{
                      margin: "0 0 18px",
                      color: "#858d98",
                      fontSize: "12px",
                      lineHeight: 1.6,
                    }}
                  >
                    Takım seçimi sistemi
                    bir sonraki adımda
                    buraya bağlanacak.
                  </p>

                  <button
                    type="button"
                    disabled
                    style={{
                      width: "100%",
                      minHeight: "48px",
                      border:
                        "1px solid rgba(255,255,255,.08)",
                      borderRadius: "11px",
                      background:
                        "rgba(255,255,255,.04)",
                      color: "#626a74",
                      fontWeight: 900,
                      cursor:
                        "not-allowed",
                    }}
                  >
                    Oyunu Başlat
                  </button>
                </section>
              )}

              {/* LOBİDEN AYRIL */}

              {currentMember && (
                <section
                  style={{
                    border:
                      "1px solid rgba(210,38,61,.18)",
                    borderRadius: "20px",
                    background:
                      "rgba(210,38,61,.035)",
                    padding: "22px",
                  }}
                >
                  <div
                    style={{
                      color: "#8e5f66",
                      fontSize: "10px",
                      fontWeight: 900,
                      letterSpacing:
                        "1.4px",
                    }}
                  >
                    LOBİ
                  </div>

                  <h3
                    style={{
                      margin: "8px 0 8px",
                      fontSize: "18px",
                    }}
                  >
                    Lobiden Ayrıl
                  </h3>

                  <p
                    style={{
                      margin: "0 0 16px",
                      color: "#747d87",
                      fontSize: "11px",
                      lineHeight: 1.6,
                    }}
                  >
                    {data.memberCount === 1
                      ? "Lobide yalnızca sen varsın. Ayrıldığında lobi tamamen silinir."
                      : data.isOwner
                      ? "Ayrıldığında lobi sahipliği sıradaki oyuncuya aktarılır."
                      : "Lobiden ayrıldıktan sonra tekrar katılabilirsin."}
                  </p>

                  <button
                    type="button"
                    onClick={leaveLobby}
                    disabled={leaving}
                    style={{
                      width: "100%",
                      minHeight: "44px",
                      border:
                        "1px solid rgba(210,38,61,.32)",
                      borderRadius: "10px",
                      background:
                        "rgba(210,38,61,.08)",
                      color: "#ff8c9b",
                      fontWeight: 900,
                      cursor: leaving
                        ? "wait"
                        : "pointer",
                      opacity: leaving
                        ? 0.6
                        : 1,
                    }}
                  >
                    {leaving
                      ? "Ayrılınıyor..."
                      : "Lobiden Ayrıl"}
                  </button>
                </section>
              )}
            </aside>
          </div>

          {/* HATA MESAJI */}

          {message && (
            <div
              style={{
                marginTop: "20px",
                padding: "14px 16px",
                borderRadius: "11px",
                border:
                  "1px solid rgba(210,38,61,.25)",
                background:
                  "rgba(210,38,61,.08)",
                color: "#ff9ca9",
                fontSize: "13px",
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

function Badge({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span
      style={{
        padding: "7px 10px",
        borderRadius: "999px",
        border:
          "1px solid rgba(255,255,255,.08)",
        background:
          "rgba(255,255,255,.03)",
        color: "#9aa2ad",
        fontSize: "10px",
        fontWeight: 900,
        letterSpacing: ".8px",
      }}
    >
      {children}
    </span>
  );
}