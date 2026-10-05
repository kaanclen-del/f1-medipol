"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [mode, setMode] =
    useState<"login" | "register">("login");

  const [displayName, setDisplayName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    if (mode === "login") {
      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      window.location.href = "/predict";
      return;
    }

    const { error } =
      await supabase.auth.signUp({
        email,
        password,

        options: {
          data: {
            display_name: displayName,
          },
        },
      });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Hesap oluşturuldu. E-posta doğrulaması gerekiyorsa gelen kutunu kontrol et."
    );

    setLoading(false);
  }

  return (
    <>
      <Header />

      <main>
        <div
          className="site-container"
          style={{
            minHeight: "calc(100vh - 78px)",
            display: "grid",
            placeItems: "center",
            paddingTop: "50px",
            paddingBottom: "70px",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "460px",
              padding: "32px",
            }}
          >
            <div className="eyebrow">
              F1 MEDİPOL · ACCOUNT
            </div>

            <h1
              style={{
                fontSize: "36px",
                margin: "8px 0 8px",
              }}
            >
              {mode === "login"
                ? "Oturum Aç"
                : "Hesap Oluştur"}
            </h1>

            <p
              style={{
                color: "#909ba8",
                fontSize: "13px",
                lineHeight: 1.6,
                marginTop: 0,
                marginBottom: "25px",
              }}
            >
              {mode === "login"
                ? "Tahminlerini kaydetmek ve F1 Medipol hesabına erişmek için giriş yap."
                : "Tahminlere ve topluluk özelliklerine katılmak için hesabını oluştur."}
            </p>

            {/* MOD SEÇİMİ */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                padding: "5px",
                borderRadius: "12px",
                background:
                  "rgba(255,255,255,.035)",
                marginBottom: "24px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setMode("login")
                }
                className="btn"
                style={{
                  border: 0,
                  background:
                    mode === "login"
                      ? "rgba(255,255,255,.09)"
                      : "transparent",
                }}
              >
                Giriş Yap
              </button>

              <button
                type="button"
                onClick={() =>
                  setMode("register")
                }
                className="btn"
                style={{
                  border: 0,
                  background:
                    mode === "register"
                      ? "rgba(255,255,255,.09)"
                      : "transparent",
                }}
              >
                Kayıt Ol
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{
                display: "grid",
                gap: "15px",
              }}
            >
              {mode === "register" && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: 900,
                      color: "#8995a4",
                      marginBottom: "7px",
                    }}
                  >
                    GÖRÜNEN AD
                  </label>

                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(event) =>
                      setDisplayName(
                        event.target.value
                      )
                    }
                    placeholder="Adın"
                    style={{
                      width: "100%",
                      height: "48px",
                      borderRadius: "10px",
                      border:
                        "1px solid rgba(255,255,255,.10)",
                      background:
                        "rgba(255,255,255,.035)",
                      color: "white",
                      padding: "0 14px",
                      outline: "none",
                    }}
                  />
                </div>
              )}

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 900,
                    color: "#8995a4",
                    marginBottom: "7px",
                  }}
                >
                  E-POSTA
                </label>

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="ornek@mail.com"
                  style={{
                    width: "100%",
                    height: "48px",
                    borderRadius: "10px",
                    border:
                      "1px solid rgba(255,255,255,.10)",
                    background:
                      "rgba(255,255,255,.035)",
                    color: "white",
                    padding: "0 14px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 900,
                    color: "#8995a4",
                    marginBottom: "7px",
                  }}
                >
                  ŞİFRE
                </label>

                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    height: "48px",
                    borderRadius: "10px",
                    border:
                      "1px solid rgba(255,255,255,.10)",
                    background:
                      "rgba(255,255,255,.035)",
                    color: "white",
                    padding: "0 14px",
                    outline: "none",
                  }}
                />
              </div>

              {message && (
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    background:
                      "rgba(255,255,255,.04)",
                    color: "#c5ccd5",
                    fontSize: "12px",
                    lineHeight: 1.6,
                  }}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-red"
                disabled={loading}
                style={{
                  marginTop: "6px",
                  minHeight: "48px",
                  opacity: loading
                    ? 0.6
                    : 1,
                }}
              >
                {loading
                  ? "İşleniyor..."
                  : mode === "login"
                  ? "Oturum Aç →"
                  : "Hesap Oluştur →"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}