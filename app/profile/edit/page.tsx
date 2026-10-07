"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Header from "@/components/Header";
import ProfileAvatarUploader from "@/components/ProfileAvatarUploader";
import { createClient } from "@/utils/supabase/client";

const favoriteTeams = [
  "McLaren",
  "Ferrari",
  "Red Bull Racing",
  "Mercedes",
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
        .select(`
          display_name,
          username,
          bio,
          favorite_team
        `)
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
      setSaving(false);
      window.location.href = "/login";
      return;
    }

    const cleanUsername = username.trim()
      ? username
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "")
      : null;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        username: cleanUsername,
        bio: bio.trim() || null,
        favorite_team: favoriteTeam || null,
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

    setSaving(false);
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

          <section
            className="card"
            style={{
              maxWidth: "800px",
              marginTop: "25px",
              padding: "30px",
            }}
          >
            <ProfileAvatarUploader />

            <div
              style={{
                display: "grid",
                gap: "22px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#c7ced8",
                    letterSpacing: ".04em",
                  }}
                >
                  GÖRÜNEN AD
                </label>

                <input
                  type="text"
                  value={displayName}
                  onChange={(event) =>
                    setDisplayName(event.target.value)
                  }
                  maxLength={60}
                  placeholder="Görünen ad"
                  style={{
                    width: "100%",
                    minHeight: "46px",
                    borderRadius: "10px",
                    border:
                      "1px solid rgba(255,255,255,.10)",
                    background: "rgba(255,255,255,.04)",
                    color: "#fff",
                    padding: "0 14px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#c7ced8",
                    letterSpacing: ".04em",
                  }}
                >
                  KULLANICI ADI
                </label>

                <input
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  maxLength={30}
                  placeholder="kullaniciadi"
                  style={{
                    width: "100%",
                    minHeight: "46px",
                    borderRadius: "10px",
                    border:
                      "1px solid rgba(255,255,255,.10)",
                    background: "rgba(255,255,255,.04)",
                    color: "#fff",
                    padding: "0 14px",
                    outline: "none",
                  }}
                />

                <div
                  style={{
                    marginTop: "7px",
                    color: "#707985",
                    fontSize: "11px",
                  }}
                >
                  En az 3 karakter.
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#c7ced8",
                    letterSpacing: ".04em",
                  }}
                >
                  BİYOGRAFİ
                </label>

                <textarea
                  value={bio}
                  onChange={(event) =>
                    setBio(event.target.value)
                  }
                  maxLength={300}
                  rows={5}
                  placeholder="Kendinden biraz bahset..."
                  style={{
                    width: "100%",
                    resize: "vertical",
                    borderRadius: "10px",
                    border:
                      "1px solid rgba(255,255,255,.10)",
                    background: "rgba(255,255,255,.04)",
                    color: "#fff",
                    padding: "14px",
                    outline: "none",
                    fontFamily: "inherit",
                    lineHeight: 1.6,
                  }}
                />

                <div
                  style={{
                    marginTop: "7px",
                    color: "#707985",
                    fontSize: "11px",
                    textAlign: "right",
                  }}
                >
                  {bio.length}/300
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#c7ced8",
                    letterSpacing: ".04em",
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
                    minHeight: "46px",
                    borderRadius: "10px",
                    border:
                      "1px solid rgba(255,255,255,.10)",
                    background: "#11151b",
                    color: "#fff",
                    padding: "0 14px",
                    outline: "none",
                  }}
                >
                  <option value="">
                    Takım seçilmedi
                  </option>

                  {favoriteTeams.map((team) => (
                    <option
                      key={team}
                      value={team}
                    >
                      {team}
                    </option>
                  ))}
                </select>
              </div>

              {message && (
                <div
                  style={{
                    padding: "13px 15px",
                    borderRadius: "10px",
                    background: message.startsWith("✅")
                      ? "rgba(47, 160, 84, .10)"
                      : "rgba(210, 38, 61, .10)",
                    border: message.startsWith("✅")
                      ? "1px solid rgba(80, 200, 120, .22)"
                      : "1px solid rgba(210, 38, 61, .25)",
                    color: message.startsWith("✅")
                      ? "#8de3a5"
                      : "#ff9ca9",
                    fontSize: "12px",
                    lineHeight: 1.5,
                  }}
                >
                  {message}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  flexWrap: "wrap",
                  paddingTop: "6px",
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
                    cursor: saving
                      ? "wait"
                      : "pointer",
                  }}
                >
                  {saving
                    ? "Kaydediliyor..."
                    : "Profili Kaydet"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}