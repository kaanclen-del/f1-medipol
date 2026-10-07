"use client";

import { FormEvent, useEffect, useState } from "react";

import Header from "@/components/Header";

type Lobby = {
  id: string;
  created_by: string;
  name: string;
  visibility: "public" | "private";
  mode: "casual" | "ranked";
  status: string;
  max_players: number;
  member_count: number;
  created_at: string;

  creator: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export default function ManagerPage() {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const [name, setName] = useState("");

  const [visibility, setVisibility] =
    useState<"public" | "private">("public");

  const [mode, setMode] =
    useState<"casual" | "ranked">("casual");

  const [maxPlayers, setMaxPlayers] = useState(8);

  const [joinCode, setJoinCode] = useState("");
  const [createdCode, setCreatedCode] = useState("");

  const [message, setMessage] = useState("");

  async function loadLobbies() {
    try {
      const response = await fetch(
        "/api/arcade/manager/lobbies",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data?.error || "Lobiler yüklenemedi."
        );
        return;
      }

      setLobbies(data.lobbies ?? []);
    } catch {
      setMessage(
        "Lobiler yüklenirken hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLobbies();
  }, []);

  async function createLobby(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setCreatedCode("");

    if (name.trim().length < 3) {
      setMessage(
        "Lobi adı en az 3 karakter olmalı."
      );
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(
        "/api/arcade/manager/lobbies",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name,
            visibility,
            mode,
            maxPlayers,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data?.error || "Lobi oluşturulamadı."
        );
        return;
      }

      setCreatedCode(data.joinCode);

      setMessage(
        "✅ Lobi başarıyla oluşturuldu."
      );

      setName("");
      setVisibility("public");
      setMode("casual");
      setMaxPlayers(8);

      await loadLobbies();
    } catch {
      setMessage(
        "Lobi oluşturulurken hata oluştu."
      );
    } finally {
      setCreating(false);
    }
  }

  async function joinLobby(options: {
    lobbyId?: string;
    joinCode?: string;
  }) {
    setMessage("");
    setJoining(true);

    try {
      const response = await fetch(
        "/api/arcade/manager/lobbies/join",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(options),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data?.error || "Lobiye katılınamadı."
        );
        return;
      }

      if (data?.alreadyJoined) {
        setMessage(
          "✅ Zaten bu lobinin içerisindesin."
        );
      } else {
        setMessage(
          `✅ ${data?.lobbyName || "Lobi"} lobisine katıldın.`
        );
      }

      setJoinCode("");

      await loadLobbies();
    } catch {
      setMessage(
        "Lobiye katılırken hata oluştu."
      );
    } finally {
      setJoining(false);
    }
  }

  return (
    <>
      <Header />

      <main
        style={{
          minHeight: "100vh",

          background:
            "radial-gradient(circle at top, #181010 0%, #080808 42%, #050505 100%)",

          color: "#fff",

          padding: "52px 24px 100px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1280px",
            margin: "0 auto",
          }}
        >
          {/* BAŞLIK */}

          <div
            style={{
              marginBottom: "38px",
            }}
          >
            <div
              style={{
                color: "#d2263d",

                fontSize: "12px",

                fontWeight: 900,

                letterSpacing: "2px",

                marginBottom: "12px",
              }}
            >
              F1 MEDİPOL · ARCADE
            </div>

            <h1
              style={{
                margin: 0,

                fontSize:
                  "clamp(42px, 7vw, 76px)",

                letterSpacing: "-3px",

                lineHeight: 0.95,
              }}
            >
              Manager
            </h1>

            <p
              style={{
                color: "#9299a3",

                maxWidth: "680px",

                lineHeight: 1.7,

                marginTop: "18px",
              }}
            >
              Kendi lobini oluştur, diğer
              menajerlerle eşleş ve sezon boyunca
              şampiyonluk için mücadele et.
            </p>
          </div>

          {/* ÜST KARTLAR */}

          <div
            style={{
              display: "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(320px, 1fr))",

              gap: "22px",

              alignItems: "start",
            }}
          >
            {/* LOBİ OLUŞTUR */}

            <section
              style={{
                border:
                  "1px solid rgba(210,38,61,.28)",

                borderRadius: "22px",

                background:
                  "linear-gradient(145deg, rgba(210,38,61,.10), rgba(255,255,255,.025))",

                padding: "26px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",

                  color: "#d2263d",

                  fontWeight: 900,

                  letterSpacing: "1.5px",
                }}
              >
                HOST
              </div>

              <h2
                style={{
                  margin: "10px 0 22px",

                  fontSize: "26px",
                }}
              >
                Lobi Oluştur
              </h2>

              <form
                onSubmit={createLobby}
                style={{
                  display: "grid",

                  gap: "17px",
                }}
              >
                {/* LOBİ ADI */}

                <div>
                  <label style={labelStyle}>
                    LOBİ ADI
                  </label>

                  <input
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    maxLength={50}
                    placeholder="Örn. Pazar Gecesi Ligi"
                    style={inputStyle}
                  />
                </div>

                {/* OYUNCU SAYISI */}

                <div>
                  <label style={labelStyle}>
                    OYUNCU SAYISI
                  </label>

                  <select
                    value={maxPlayers}
                    onChange={(event) =>
                      setMaxPlayers(
                        Number(event.target.value)
                      )
                    }
                    style={inputStyle}
                  >
                    {[
                      2,
                      4,
                      6,
                      8,
                      10,
                      12,
                      16,
                      20,
                    ].map((count) => (
                      <option
                        key={count}
                        value={count}
                      >
                        {count} Oyuncu
                      </option>
                    ))}
                  </select>
                </div>

                {/* LOBİ TÜRÜ */}

                <div>
                  <label style={labelStyle}>
                    LOBİ TÜRÜ
                  </label>

                  <div
                    style={{
                      display: "grid",

                      gridTemplateColumns:
                        "1fr 1fr",

                      gap: "8px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setVisibility("public")
                      }
                      style={choiceButton(
                        visibility === "public"
                      )}
                    >
                      Açık
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setVisibility("private")
                      }
                      style={choiceButton(
                        visibility === "private"
                      )}
                    >
                      Özel
                    </button>
                  </div>
                </div>

                {/* MOD */}

                <div>
                  <label style={labelStyle}>
                    MOD
                  </label>

                  <div
                    style={{
                      display: "grid",

                      gridTemplateColumns:
                        "1fr 1fr",

                      gap: "8px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setMode("casual")
                      }
                      style={choiceButton(
                        mode === "casual"
                      )}
                    >
                      Casual
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setMode("ranked")
                      }
                      style={choiceButton(
                        mode === "ranked"
                      )}
                    >
                      Ranked
                    </button>
                  </div>
                </div>

                {/* OLUŞTUR */}

                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    minHeight: "48px",

                    border: 0,

                    borderRadius: "11px",

                    background: "#d2263d",

                    color: "#fff",

                    fontWeight: 900,

                    cursor: creating
                      ? "wait"
                      : "pointer",

                    opacity: creating
                      ? 0.6
                      : 1,

                    marginTop: "5px",
                  }}
                >
                  {creating
                    ? "Oluşturuluyor..."
                    : "Lobiyi Oluştur"}
                </button>
              </form>

              {/* DAVET KODU */}

              {createdCode && (
                <div
                  style={{
                    marginTop: "18px",

                    padding: "17px",

                    borderRadius: "12px",

                    border:
                      "1px solid rgba(80,200,120,.25)",

                    background:
                      "rgba(80,200,120,.07)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",

                      color: "#8de3a5",

                      marginBottom: "7px",
                    }}
                  >
                    DAVET KODUN
                  </div>

                  <div
                    style={{
                      fontSize: "26px",

                      fontWeight: 900,

                      letterSpacing: "5px",
                    }}
                  >
                    {createdCode}
                  </div>
                </div>
              )}
            </section>

            {/* KODA KATIL */}

            <section
              style={{
                border:
                  "1px solid rgba(255,255,255,.08)",

                borderRadius: "22px",

                background:
                  "rgba(255,255,255,.025)",

                padding: "26px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",

                  color: "#9299a3",

                  fontWeight: 900,

                  letterSpacing: "1.5px",
                }}
              >
                INVITE
              </div>

              <h2
                style={{
                  margin: "10px 0 12px",

                  fontSize: "26px",
                }}
              >
                Koda Katıl
              </h2>

              <p
                style={{
                  color: "#7e8792",

                  fontSize: "13px",

                  lineHeight: 1.6,

                  marginBottom: "20px",
                }}
              >
                Arkadaşının gönderdiği 6
                haneli lobi kodunu gir.
              </p>

              <input
                value={joinCode}
                onChange={(event) =>
                  setJoinCode(
                    event.target.value
                      .toUpperCase()
                      .replace(
                        /[^A-Z0-9]/g,
                        ""
                      )
                      .slice(0, 6)
                  )
                }
                placeholder="XXXXXX"
                maxLength={6}
                style={{
                  ...inputStyle,

                  fontSize: "22px",

                  letterSpacing: "5px",

                  textAlign: "center",

                  fontWeight: 900,
                }}
              />

              <button
                type="button"
                disabled={
                  joining ||
                  joinCode.length !== 6
                }
                onClick={() =>
                  joinLobby({
                    joinCode,
                  })
                }
                style={{
                  width: "100%",

                  minHeight: "48px",

                  marginTop: "12px",

                  borderRadius: "11px",

                  border:
                    "1px solid rgba(210,38,61,.35)",

                  background:
                    joinCode.length === 6
                      ? "#d2263d"
                      : "rgba(255,255,255,.04)",

                  color:
                    joinCode.length === 6
                      ? "#fff"
                      : "#777",

                  fontWeight: 800,

                  cursor:
                    joining ||
                    joinCode.length !== 6
                      ? "not-allowed"
                      : "pointer",

                  opacity: joining
                    ? 0.6
                    : 1,
                }}
              >
                {joining
                  ? "Katılınıyor..."
                  : "Koda Katıl"}
              </button>
            </section>
          </div>

          {/* AÇIK LOBİLER */}

          <section
            style={{
              marginTop: "44px",
            }}
          >
            <div
              style={{
                display: "flex",

                justifyContent:
                  "space-between",

                alignItems: "center",

                gap: "20px",

                marginBottom: "18px",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#d2263d",

                    fontSize: "11px",

                    fontWeight: 900,

                    letterSpacing: "1.5px",
                  }}
                >
                  MATCHMAKING
                </div>

                <h2
                  style={{
                    fontSize: "28px",

                    margin: "7px 0 0",
                  }}
                >
                  Açık Lobiler
                </h2>
              </div>

              <button
                onClick={loadLobbies}
                type="button"
                style={{
                  border:
                    "1px solid rgba(255,255,255,.1)",

                  background:
                    "rgba(255,255,255,.03)",

                  color: "#fff",

                  padding: "10px 14px",

                  borderRadius: "10px",

                  cursor: "pointer",
                }}
              >
                Yenile
              </button>
            </div>

            {/* LOADING */}

            {loading ? (
              <div style={emptyStyle}>
                Lobiler yükleniyor...
              </div>
            ) : lobbies.length === 0 ? (
              <div style={emptyStyle}>
                Şu anda açık bir lobi yok.
                İlk lobiyi sen
                oluşturabilirsin.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(270px, 1fr))",

                  gap: "14px",
                }}
              >
                {lobbies.map((lobby) => {
                  const isFull =
                    lobby.member_count >=
                    lobby.max_players;

                  return (
                    <div
                      key={lobby.id}
                      style={{
                        border:
                          "1px solid rgba(255,255,255,.08)",

                        borderRadius:
                          "17px",

                        padding: "20px",

                        background:
                          "rgba(255,255,255,.025)",
                      }}
                    >
                      {/* LOBİ ÜST */}

                      <div
                        style={{
                          display: "flex",

                          justifyContent:
                            "space-between",

                          gap: "12px",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize:
                                "18px",

                              fontWeight:
                                900,
                            }}
                          >
                            {lobby.name}
                          </div>

                          <div
                            style={{
                              color:
                                "#747d89",

                              fontSize:
                                "12px",

                              marginTop:
                                "5px",
                            }}
                          >
                            {lobby.creator
                              ?.display_name ||
                              lobby.creator
                                ?.username ||
                              "Menajer"}
                          </div>
                        </div>

                        {/* MOD */}

                        <div
                          style={{
                            color:
                              lobby.mode ===
                              "ranked"
                                ? "#d2263d"
                                : "#9299a3",

                            fontSize:
                              "10px",

                            fontWeight:
                              900,

                            letterSpacing:
                              "1px",
                          }}
                        >
                          {lobby.mode.toUpperCase()}
                        </div>
                      </div>

                      {/* LOBİ ALT */}

                      <div
                        style={{
                          marginTop:
                            "20px",

                          display: "flex",

                          justifyContent:
                            "space-between",

                          alignItems:
                            "center",

                          gap: "12px",
                        }}
                      >
                        <span
                          style={{
                            color:
                              isFull
                                ? "#d86a79"
                                : "#aab1ba",

                            fontSize:
                              "13px",
                          }}
                        >
                          {lobby.member_count}/
                          {lobby.max_players}{" "}
                          oyuncu
                        </span>

                        <button
                          type="button"
                          disabled={
                            joining ||
                            isFull
                          }
                          onClick={() =>
                            joinLobby({
                              lobbyId:
                                lobby.id,
                            })
                          }
                          style={{
                            border: 0,

                            borderRadius:
                              "9px",

                            padding:
                              "9px 13px",

                            background:
                              isFull
                                ? "rgba(255,255,255,.04)"
                                : "#d2263d",

                            color:
                              isFull
                                ? "#666"
                                : "#fff",

                            fontWeight:
                              800,

                            cursor:
                              joining ||
                              isFull
                                ? "not-allowed"
                                : "pointer",

                            opacity:
                              joining
                                ? 0.6
                                : 1,
                          }}
                        >
                          {isFull
                            ? "Dolu"
                            : joining
                            ? "..."
                            : "Katıl"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* MESAJ */}

          {message && (
            <div
              style={{
                marginTop: "22px",

                padding: "14px 16px",

                borderRadius: "11px",

                border:
                  message.startsWith("✅")
                    ? "1px solid rgba(80,200,120,.22)"
                    : "1px solid rgba(210,38,61,.28)",

                background:
                  message.startsWith("✅")
                    ? "rgba(80,200,120,.07)"
                    : "rgba(210,38,61,.08)",

                color:
                  message.startsWith("✅")
                    ? "#8de3a5"
                    : "#ff9ca9",

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

const labelStyle = {
  display: "block",

  fontSize: "11px",

  fontWeight: 900,

  color: "#949da9",

  letterSpacing: "1px",

  marginBottom: "7px",
};

const inputStyle = {
  width: "100%",

  minHeight: "46px",

  borderRadius: "10px",

  border:
    "1px solid rgba(255,255,255,.10)",

  background: "#11151a",

  color: "#fff",

  padding: "0 13px",

  outline: "none",
};

const emptyStyle = {
  padding: "30px",

  borderRadius: "16px",

  border:
    "1px solid rgba(255,255,255,.07)",

  background:
    "rgba(255,255,255,.02)",

  color: "#727b86",

  fontSize: "13px",

  textAlign: "center" as const,
};

function choiceButton(active: boolean) {
  return {
    minHeight: "43px",

    borderRadius: "9px",

    border: active
      ? "1px solid rgba(210,38,61,.65)"
      : "1px solid rgba(255,255,255,.08)",

    background: active
      ? "rgba(210,38,61,.15)"
      : "rgba(255,255,255,.025)",

    color: active
      ? "#fff"
      : "#858d98",

    fontWeight: 800,

    cursor: "pointer",
  };
}