"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/client";

const F1_TEAMS = [
  "McLaren",
  "Ferrari",
  "Mercedes",
  "Red Bull Racing",
  "Aston Martin",
  "Williams",
  "Racing Bulls",
  "Haas",
  "Alpine",
  "Audi",
  "Cadillac",
];

export default function EditProfilePage() {
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");

  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          `
          display_name,
          username,
          bio,
          favorite_team
          `
        )
        .eq("id", user.id)
        .maybeSingle();

      setDisplayName(
        profile?.display_name ||
          user.user_metadata?.display_name ||
          ""
      );

      setUsername(profile?.username || "");
      setBio(profile?.bio || "");
      setFavoriteTeam(profile?.favorite_team || "");

      setLoading(false);
    }

    loadProfile();
  }, [supabase]);

  async function saveProfile() {
    setMessage("");

    if (!displayName.trim()) {
      setMessage("Görünen ad boş bırakılamaz.");
      return;
    }

    if (username && username.length < 3) {
      setMessage(
        "Kullanıcı adı en az 3 karakter olmalı."
      );
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    /*
      PROFİLES TABLOSUNU GÜNCELLE
    */

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),

        username: username.trim()
          ? username
              .trim()
              .toLowerCase()
              .replace(/\s+/g, "")
          : null,

        bio: bio.trim() || null,

        favorite_team:
          favoriteTeam || null,
      })
      .eq("id", user.id);

    if (profileError) {
      setSaving(false);

      if (
        profileError.message
          .toLowerCase()
          .includes("duplicate")
      ) {
        setMessage(
          "Bu kullanıcı adı başka biri tarafından kullanılıyor."
        );
      } else {
        setMessage(
          `Profil kaydedilemedi: ${profileError.message}`
        );
      }

      return;
    }

    /*
      HEADER'DA KULLANDIĞIMIZ
      DISPLAY NAME BİLGİSİNİ DE
      AUTH METADATA İÇİNDE GÜNCELLE
    */

    const { error: authError } =
      await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
        },
      });

    if (authError) {
      setSaving(false);

      setMessage(
        `Profil kaydedildi fakat hesap adı güncellenemedi: ${authError.message}`
      );

      return;
    }

    setMessage("✅ Profil başarıyla güncellendi.");

    setTimeout(() => {
      window.location.href = "/profile";
    }, 700);
  }

  if (loading) {
    return (
      <>
        <Header />

        <main>
          <div
            className="site-container"
            style={{
              paddingTop: "80px",
              textAlign: "center",
              color: "#929dab",
            }}
          >
            Profil yükleniyor...
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <main>
        <div
          className="site-container"
          style={{
            paddingTop: "32px",
            paddingBottom: "80px",
          }}
        >
          {/* BAŞLIK */}

          <div className="eyebrow">
            F1 MEDİPOL · DRIVER PROFILE
          </div>

          <h1
            style={{
              margin: "8px 0 6px",
              fontSize: "46px",
              letterSpacing: "-.04em",
            }}
          >
            Profili Düzenle
          </h1>

          <p
            style={{
              margin: 0,
              color: "#929dab",
              fontSize: "13px",
            }}
          >
            Topluluk profilinde görünecek bilgilerini
            düzenle.
          </p>

          {/* ANA KART */}

          <section
            className="card"
            style={{
              maxWidth: "800px",
              marginTop: "25px",
              padding: "30px",
            }}
          >
            <div
              style={{
                display: "grid",
                gap: "22px",
              }}
            >
              {/* GÖRÜNEN AD */}

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#aeb7c2",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: ".08em",
                  }}
                >
                  GÖRÜNEN AD
                </label>

                <input
                  type="text"
                  value={displayName}
                  maxLength={50}
                  onChange={(event) =>
                    setDisplayName(event.target.value)
                  }
                  placeholder="Ad Soyad"
                  style={{
                    width: "100%",
                    minHeight: "48px",
                    padding: "0 14px",
                    borderRadius: "10px",
                    border:
                      "1px solid rgba(255,255,255,.10)",
                    background: "#151b23",
                    color: "white",
                    outline: "none",
                  }}
                />
              </div>

              {/* USERNAME */}

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#aeb7c2",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: ".08em",
                  }}
                >
                  KULLANICI ADI
                </label>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border:
                      "1px solid rgba(255,255,255,.10)",
                    borderRadius: "10px",
                    background: "#151b23",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      paddingLeft: "14px",
                      color: "#687483",
                      fontWeight: 900,
                    }}
                  >
                    @
                  </span>

                  <input
                    type="text"
                    value={username}
                    maxLength={30}
                    onChange={(event) =>
                      setUsername(
                        event.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "")
                      )
                    }
                    placeholder="kullaniciadi"
                    style={{
                      width: "100%",
                      minHeight: "48px",
                      padding: "0 14px 0 5px",
                      border: 0,
                      background: "transparent",
                      color: "white",
                      outline: "none",
                    }}
                  />
                </div>

                <small
                  style={{
                    display: "block",
                    color: "#707c8a",
                    marginTop: "7px",
                  }}
                >
                  Kullanıcı adı benzersiz olmalıdır.
                </small>
              </div>

              {/* BİYOGRAFİ */}

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#aeb7c2",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: ".08em",
                  }}
                >
                  BİYOGRAFİ
                </label>

                <textarea
                  value={bio}
                  maxLength={220}
                  onChange={(event) =>
                    setBio(event.target.value)
                  }
                  placeholder="F1 ilgin veya kulüple ilgili kısa bir şey yazabilirsin."
                  style={{
                    width: "100%",
                    minHeight: "120px",
                    padding: "14px",
                    resize: "vertical",
                    borderRadius: "10px",
                    border:
                      "1px solid rgba(255,255,255,.10)",
                    background: "#151b23",
                    color: "white",
                    outline: "none",
                  }}
                />

                <div
                  style={{
                    textAlign: "right",
                    marginTop: "5px",
                    color: "#687483",
                    fontSize: "10px",
                  }}
                >
                  {bio.length}/220
                </div>
              </div>

              {/* FAVORİ TAKIM */}

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#aeb7c2",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: ".08em",
                  }}
                >
                  FAVORİ F1 TAKIMI
                </label>

                <select
                  value={favoriteTeam}
                  onChange={(event) =>
                    setFavoriteTeam(event.target.value)
                  }
                  style={{
                    width: "100%",
                    minHeight: "48px",
                    padding: "0 14px",
                    borderRadius: "10px",
                    border:
                      "1px solid rgba(255,255,255,.10)",
                    background: "#151b23",
                    color: "white",
                    outline: "none",
                  }}
                >
                  <option value="">
                    Takım seç
                  </option>

                  {F1_TEAMS.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* MESAJ */}

            {message && (
              <div
                style={{
                  marginTop: "22px",
                  padding: "13px 15px",
                  borderRadius: "10px",
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  background:
                    "rgba(255,255,255,.035)",
                  color: "#cbd2da",
                  fontSize: "12px",
                }}
              >
                {message}
              </div>
            )}

            {/* BUTONLAR */}

            <div
              style={{
                marginTop: "26px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <Link
                href="/profile"
                className="btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                İptal
              </Link>

              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="btn btn-red"
                style={{
                  minWidth: "155px",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving
                  ? "Kaydediliyor..."
                  : "Profili Kaydet"}
              </button>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}