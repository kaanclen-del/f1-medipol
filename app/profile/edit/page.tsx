"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Header from "@/components/Header";
import ProfileAvatarUploader from "@/components/ProfileAvatarUploader";

import {
  createClient,
} from "@/utils/supabase/client";

import {
  DEFAULT_PROFILE_WALLPAPER,
  PROFILE_WALLPAPERS,
  getProfileWallpaper,
  getWallpaperBackground,
} from "@/lib/profile-wallpapers";

import { managedToWallpaper, type ManagedWallpaper } from "@/lib/profile-wallpaper-catalog";

import {
  DEFAULT_PROFILE_ACCENT,
  PROFILE_ACCENTS,
  getProfileAccent,
} from "@/lib/profile-accents";

const TEAMS = [
  "McLaren",
  "Ferrari",
  "Mercedes",
  "Red Bull Racing",
  "Aston Martin",
  "Racing Bulls",
  "Williams",
  "Haas",
  "Alpine",
  "Audi",
  "Cadillac",
];

const DRIVER_SUGGESTIONS = [
  "Max Verstappen",
  "Lando Norris",
  "Oscar Piastri",
  "Charles Leclerc",
  "Lewis Hamilton",
  "George Russell",
  "Kimi Antonelli",
  "Fernando Alonso",
  "Lance Stroll",
  "Carlos Sainz",
  "Alex Albon",
  "Pierre Gasly",
  "Esteban Ocon",
  "Oliver Bearman",
  "Nico HÃ¼lkenberg",
  "Gabriel Bortoleto",
  "Liam Lawson",
  "Isack Hadjar",
  "Sergio PÃ©rez",
  "Valtteri Bottas",
];

export default function EditProfilePage() {
  const [supabase] =
    useState(() =>
      createClient()
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    displayName,
    setDisplayName,
  ] =
    useState("");

  const [
    username,
    setUsername,
  ] =
    useState("");

  const [
    bio,
    setBio,
  ] =
    useState("");

  const [
    favoriteTeam,
    setFavoriteTeam,
  ] =
    useState("");

  const [
    favoriteDriver,
    setFavoriteDriver,
  ] =
    useState("");

  const [
    wallpaperId,
    setWallpaperId,
  ] =
    useState(
      DEFAULT_PROFILE_WALLPAPER
    );

  const [lightWallpaperId, setLightWallpaperId] = useState(DEFAULT_PROFILE_WALLPAPER);
  const [redWallpaperId, setRedWallpaperId] = useState(DEFAULT_PROFILE_WALLPAPER);
  const [wallpaperTheme, setWallpaperTheme] = useState<"dark" | "red" | "light">("dark");
  const [managedWallpapers, setManagedWallpapers] = useState<ReturnType<typeof managedToWallpaper>[]>([]);

  const allWallpapers = useMemo(() => [...PROFILE_WALLPAPERS, ...managedWallpapers], [managedWallpapers]);
  const currentThemeWallpaperId = wallpaperTheme === "light" ? lightWallpaperId : wallpaperTheme === "red" ? redWallpaperId : wallpaperId;
  const changeThemeWallpaper = (id: string) => {
    if (wallpaperTheme === "light") setLightWallpaperId(id);
    else if (wallpaperTheme === "red") setRedWallpaperId(id);
    else setWallpaperId(id);
  };
  const useWallpaperForEveryTheme = () => {
    setWallpaperId(currentThemeWallpaperId);
    setLightWallpaperId(currentThemeWallpaperId);
    setRedWallpaperId(currentThemeWallpaperId);
  };

  const [
    accentId,
    setAccentId,
  ] =
    useState(
      DEFAULT_PROFILE_ACCENT
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  /* =====================================================
     LOAD PROFILE
     ===================================================== */

  useEffect(
    () => {
      async function loadProfile() {
        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (!user) {
          window.location.href =
            "/login";

          return;
        }

        const {
          data: profile,
        } =
          await supabase
            .from("profiles")
            .select(`
              display_name,
              username,
              bio,
              favorite_team,
              favorite_driver,
              profile_wallpaper,
              profile_wallpaper_light,
              profile_wallpaper_red,
              profile_accent
            `)
            .eq(
              "id",
              user.id
            )
            .maybeSingle();

        setDisplayName(
          profile?.display_name ||
            user.user_metadata
              ?.display_name ||
            ""
        );

        setUsername(
          profile?.username ||
            ""
        );

        setBio(
          profile?.bio ||
            ""
        );

        setFavoriteTeam(
          profile?.favorite_team ||
            ""
        );

        setFavoriteDriver(
          profile?.favorite_driver ||
            ""
        );

        const originalWallpaper = profile?.profile_wallpaper || DEFAULT_PROFILE_WALLPAPER;
        setWallpaperId(originalWallpaper);
        setLightWallpaperId(profile?.profile_wallpaper_light || originalWallpaper);
        setRedWallpaperId(profile?.profile_wallpaper_red || originalWallpaper);
        const siteTheme = document.documentElement.getAttribute("data-site-theme");
        if (siteTheme === "light" || siteTheme === "red") setWallpaperTheme(siteTheme);
        try {
          const result = await fetch("/api/profile/wallpapers", { cache: "no-store" });
          if (result.ok) {
            const payload = await result.json() as { wallpapers?: ManagedWallpaper[] };
            setManagedWallpapers((payload.wallpapers ?? []).map(managedToWallpaper));
          }
        } catch { /* Custom wallpapers are optional. */ }

        setAccentId(
          profile?.profile_accent ||
            DEFAULT_PROFILE_ACCENT
        );

        setLoading(false);
      }

      void loadProfile();
    },
    [supabase]
  );

  /* =====================================================
     SELECTED STYLE
     ===================================================== */

  const selectedWallpaper =
    useMemo(
      () =>
        allWallpapers.find((wallpaper) => wallpaper.id === currentThemeWallpaperId)
          ?? getProfileWallpaper(currentThemeWallpaperId),
      [allWallpapers, currentThemeWallpaperId]
    );

  const selectedAccent =
    useMemo(
      () =>
        getProfileAccent(
          accentId
        ),
      [accentId]
    );

  const background =
    getWallpaperBackground(
      selectedWallpaper
    );

  /* =====================================================
     SAVE
     ===================================================== */

  async function saveProfile() {
    setMessage("");

    if (
      !displayName.trim()
    ) {
      setMessage(
        "GÃ¶rÃ¼nen ad boÅŸ bÄ±rakÄ±lamaz."
      );

      return;
    }

    if (
      username &&
      username.length < 3
    ) {
      setMessage(
        "KullanÄ±cÄ± adÄ± en az 3 karakter olmalÄ±."
      );

      return;
    }

    setSaving(true);

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    if (!user) {
      window.location.href =
        "/login";

      return;
    }

    const cleanUsername =
      username.trim()
        ? username
            .trim()
            .toLowerCase()
            .replace(
              /\s+/g,
              ""
            )
        : null;

    const {
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .update({
          display_name:
            displayName.trim(),

          username:
            cleanUsername,

          bio:
            bio.trim() ||
            null,

          favorite_team:
            favoriteTeam ||
            null,

          favorite_driver:
            favoriteDriver.trim() ||
            null,

          profile_wallpaper: wallpaperId,
          profile_wallpaper_light: lightWallpaperId,
          profile_wallpaper_red: redWallpaperId,

          profile_accent:
            accentId,
        })
        .eq(
          "id",
          user.id
        );

    if (profileError) {
      setSaving(false);

      if (
        profileError.message
          .toLowerCase()
          .includes(
            "duplicate"
          )
      ) {
        setMessage(
          "Bu kullanÄ±cÄ± adÄ± baÅŸka biri tarafÄ±ndan kullanÄ±lÄ±yor."
        );
      } else {
        setMessage(
          `Profil kaydedilemedi: ${profileError.message}`
        );
      }

      return;
    }

    const {
      error: authError,
    } =
      await supabase.auth.updateUser({
        data: {
          display_name:
            displayName.trim(),
        },
      });

    if (authError) {
      setSaving(false);

      setMessage(
        `Profil kaydedildi fakat hesap adÄ± gÃ¼ncellenemedi: ${authError.message}`
      );

      return;
    }

    setMessage(
      "âœ“ Profil baÅŸarÄ±yla gÃ¼ncellendi."
    );

    window.setTimeout(
      () => {
        window.location.href =
          "/profile";
      },
      650
    );
  }

  if (loading) {
    return (
      <>
        <Header />

        <main className="edit-loading">
          Profil yÃ¼kleniyor...
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <main
        className="edit-profile"
        style={{
          backgroundImage:
            background,

          ["--profile-accent" as string]:
            selectedAccent.primary,

          ["--profile-accent-2" as string]:
            selectedAccent.secondary,

          ["--profile-accent-soft" as string]:
            selectedAccent.soft,

          ["--profile-accent-glow" as string]:
            selectedAccent.glow,
        }}
      >
        <style>
          {styles}
        </style>

        <div className="edit-overlay" />

        <div className="edit-wrap">

          {/* ===============================================
              HEADING
              =============================================== */}

          <header className="edit-heading">
            <div>
              <span>
                F1 MEDÄ°POL Â· DRIVER PROFILE
              </span>

              <h1>
                Profili DÃ¼zenle
              </h1>

              <p>
                Profil bilgilerini,
                favorilerini, accent rengini
                ve profil arka planÄ±nÄ± dÃ¼zenle.
              </p>
            </div>

            <Link
              href="/profile"
              className="preview-button"
            >
              PROFÄ°LÄ° GÃ–R â†’
            </Link>
          </header>

          {/* ===============================================
              PREVIEW
              =============================================== */}

          <section
            className="profile-preview"
            style={{
              backgroundImage:
                background,
            }}
          >
            <div className="preview-shade" />

            <div className="preview-accent-line" />

            <div className="preview-content">
              <span>
                LIVE PREVIEW
              </span>

              <h2>
                {displayName ||
                  "F1 SOCIAL Ãœyesi"}
              </h2>

              <p>
                {username
                  ? `@${username}`
                  : "@username"}
              </p>

              <div className="preview-favorites">
                <b>
                  {favoriteTeam ||
                    "TakÄ±m seÃ§ilmedi"}
                </b>

                <i />

                <b>
                  {favoriteDriver ||
                    "Pilot seÃ§ilmedi"}
                </b>
              </div>

              <strong>
                {selectedWallpaper.name}
                {" Â· "}
                {selectedAccent.name}
              </strong>
            </div>
          </section>

          {/* ===============================================
              EDIT GRID
              =============================================== */}

          <div className="edit-grid">

            {/* =============================================
                PROFILE DETAILS
                ============================================= */}

            <section className="edit-card">
              <div className="section-heading">
                <span>
                  PROFILE DETAILS
                </span>

                <h2>
                  Profil Bilgileri
                </h2>
              </div>

              <ProfileAvatarUploader />

              <label className="field-label">
                GÃ¶rÃ¼nen Ad

                <input
                  value={displayName}
                  onChange={(
                    event
                  ) =>
                    setDisplayName(
                      event.target.value
                    )
                  }
                  maxLength={50}
                />
              </label>

              <label className="field-label">
                KullanÄ±cÄ± AdÄ±

                <div className="username-field">
                  <span>
                    @
                  </span>

                  <input
                    value={username}
                    onChange={(
                      event
                    ) =>
                      setUsername(
                        event.target.value
                      )
                    }
                    maxLength={30}
                  />
                </div>
              </label>

              <label className="field-label">
                HakkÄ±mda

                <textarea
                  value={bio}
                  onChange={(
                    event
                  ) =>
                    setBio(
                      event.target.value
                    )
                  }
                  maxLength={280}
                  rows={5}
                />

                <small>
                  {bio.length}/280
                </small>
              </label>

              <div className="preference-grid">
                <label className="field-label">
                  Favori TakÄ±m

                  <select
                    value={favoriteTeam}
                    onChange={(
                      event
                    ) =>
                      setFavoriteTeam(
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      TakÄ±m seÃ§ilmedi
                    </option>

                    {TEAMS.map(
                      (team) => (
                        <option
                          value={team}
                          key={team}
                        >
                          {team}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="field-label">
                  Favori Pilot

                  <input
                    list="driver-options"
                    value={favoriteDriver}
                    onChange={(
                      event
                    ) =>
                      setFavoriteDriver(
                        event.target.value
                      )
                    }
                    placeholder="Pilot seÃ§ veya yaz"
                    maxLength={60}
                  />

                  <datalist id="driver-options">
                    {DRIVER_SUGGESTIONS.map(
                      (driver) => (
                        <option
                          key={driver}
                          value={driver}
                        />
                      )
                    )}
                  </datalist>
                </label>
              </div>
            </section>

            {/* =============================================
                STYLE
                ============================================= */}

            <section className="edit-card">
              <div className="section-heading">
                <span>
                  PROFILE STYLE
                </span>

                <h2>
                  Profil Accent Rengi
                </h2>

                <p>
                  Profil baÅŸlÄ±klarÄ±,
                  avatar Ã§erÃ§evesi,
                  butonlar ve Ã¶zel detaylarda
                  kullanÄ±lacak rengi seÃ§.
                </p>
              </div>

              <div className="accent-grid">
                {PROFILE_ACCENTS.map(
                  (accent) => {
                    const active =
                      accent.id ===
                      accentId;

                    return (
                      <button
                        key={accent.id}
                        type="button"
                        className={[
                          "accent-option",

                          active
                            ? "active"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() =>
                          setAccentId(
                            accent.id
                          )
                        }
                        style={{
                          ["--option-accent" as string]:
                            accent.primary,

                          ["--option-accent-2" as string]:
                            accent.secondary,

                          ["--option-glow" as string]:
                            accent.glow,
                        }}
                      >
                        <div className="accent-circle">
                          {active && (
                            <span>
                              âœ“
                            </span>
                          )}
                        </div>

                        <div>
                          <strong>
                            {accent.name}
                          </strong>

                          <small>
                            {active
                              ? "SeÃ§ili"
                              : "SeÃ§"}
                          </small>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              <div className="accent-demo">
                <span>
                  ACCENT PREVIEW
                </span>

                <strong>
                  {selectedAccent.name}
                </strong>

                <div className="accent-demo-line" />
              </div>

              {/* ===========================================
                  WALLPAPER
                  =========================================== */}

              <div
                className="section-heading wallpaper-heading"
                id="wallpaper"
              >
                <span>
                  PROFILE BACKGROUND
                </span>

                <h2>
                  Profil Arka PlanÄ±
                </h2>

                <p>Her tema iÃ§in farklÄ± bir arka plan seÃ§ebilir veya aynÄ± gÃ¶rseli Ã¼Ã§Ã¼ne de uygulayabilirsin.</p>
              </div>

              <div className="wallpaper-theme-toolbar" aria-label="Arka planÄ±n uygulanacaÄŸÄ± tema">
                <div className="wallpaper-theme-tabs" role="group" aria-label="Tema seÃ§imi">
                  {(["dark", "red", "light"] as const).map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      className={`wallpaper-theme-tab ${wallpaperTheme === theme ? "selected" : ""}`}
                      aria-pressed={wallpaperTheme === theme}
                      onClick={() => setWallpaperTheme(theme)}
                    >
                      <span className={`wallpaper-theme-dot ${theme}`} />
                      {theme === "dark" ? "Koyu" : theme === "red" ? "KÄ±rmÄ±zÄ±" : "AÃ§Ä±k"}
                    </button>
                  ))}
                </div>
                <button type="button" className="wallpaper-apply-all" onClick={useWallpaperForEveryTheme}>
                  Bu gÃ¶rseli tÃ¼m temalarda kullan â†—
                </button>
              </div>
              <div className="wallpaper-theme-help">
                Åu an <strong>{wallpaperTheme === "dark" ? "koyu" : wallpaperTheme === "red" ? "kÄ±rmÄ±zÄ±" : "aÃ§Ä±k"}</strong> tema iÃ§in seÃ§im yapÄ±yorsun.
                Kaydedince profilin ziyaretÃ§inin seÃ§tiÄŸi temaya uygun gÃ¶rselle aÃ§Ä±lÄ±r.
              </div>

              <div className="wallpaper-grid">
                {allWallpapers.map(
                  (wallpaper) => {
                    const active =
                      wallpaper.id ===
                      currentThemeWallpaperId;

                    return (
                      <button
                        key={wallpaper.id}
                        type="button"
                        className={[
                          "wallpaper-option",

                          active
                            ? "active"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() =>
                          changeThemeWallpaper(wallpaper.id)
                        }
                        style={{
                          ["--wallpaper-accent" as string]:
                            wallpaper.accent,
                        }}
                      >
                        <div
                          className="wallpaper-image"
                          style={{
                            backgroundImage:
                              getWallpaperBackground(
                                wallpaper
                              ),
                          }}
                        >
                          {active && (
                            <div className="selected-badge">
                              âœ“ SEÃ‡Ä°LÄ°
                            </div>
                          )}
                        </div>

                        <div className="wallpaper-copy">
                          <strong>
                            {wallpaper.name}
                          </strong>

                          <span>
                            {wallpaper.description}
                          </span>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </section>
          </div>

          {/* ===============================================
              SAVE BAR
              =============================================== */}

          <div className="save-bar">
            <div>
              {message && (
                <span
                  className={
                    message.startsWith("âœ“")
                      ? "success"
                      : "error"
                  }
                >
                  {message}
                </span>
              )}
            </div>

            <div className="save-actions">
              <Link
                href="/profile"
                className="cancel-button"
              >
                Ä°ptal
              </Link>

              <button
                type="button"
                className="save-button"
                disabled={saving}
                onClick={saveProfile}
              >
                {saving
                  ? "Kaydediliyor..."
                  : "Profili Kaydet"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

/* =========================================================
   CSS
   ========================================================= */

const styles = `
  .edit-loading {
    min-height: calc(100vh - 60px);

    display: grid;
    place-items: center;

    background: #080b10;
    color: #8994a1;
  }

  .edit-profile {
    position: relative;

    min-height:
      calc(100vh - 60px);

    background-size:
      cover,
      cover,
      cover;

    background-position:
      center;

    background-attachment:
      fixed;

    color:
      #f4f7fa;
  }

  .edit-profile h1,
  .edit-profile h2,
  .edit-profile h3,
  .edit-profile strong,
  .edit-profile b {
    color:
      #f4f7fa !important;
  }

  .edit-overlay {
    position:
      absolute;

    inset: 0;

    background:
      rgba(4,7,11,.76);

    backdrop-filter:
      blur(5px);
  }

  .edit-wrap {
    position:
      relative;

    z-index:
      2;

    width:
      min(
        1360px,
        calc(100% - 32px)
      );

    margin:
      auto;

    padding:
      35px 0 95px;
  }

  /* =====================================================
     HEADING
     ===================================================== */

  .edit-heading {
    display:
      flex;

    align-items:
      flex-end;

    justify-content:
      space-between;

    gap:
      20px;
  }

  .edit-heading > div > span,
  .section-heading > span {
    color:
      var(--profile-accent);

    font-size:
      8px;

    font-weight:
      1000;

    letter-spacing:
      .12em;
  }

  .edit-heading h1 {
    margin:
      6px 0 5px;

    font-size:
      44px;

    letter-spacing:
      -.045em;
  }

  .edit-heading p {
    margin:
      0;

    color:
      #9aa5b0;

    font-size:
      11px;
  }

  .preview-button {
    min-height:
      40px;

    padding:
      0 14px;

    display:
      flex;

    align-items:
      center;

    border:
      1px solid
      rgba(255,255,255,.10);

    border-radius:
      7px;

    background:
      rgba(10,14,20,.65);

    color:
      #fff;

    font-size:
      8px;

    font-weight:
      900;
  }

  /* =====================================================
     PREVIEW
     ===================================================== */

  .profile-preview {
    position:
      relative;

    min-height:
      225px;

    margin-top:
      20px;

    overflow:
      hidden;

    border:
      1px solid
      color-mix(
        in srgb,
        var(--profile-accent),
        transparent 60%
      );

    border-radius:
      14px;

    background-size:
      cover,
      cover,
      cover;

    background-position:
      center;

    box-shadow:
      0 18px 50px
      var(--profile-accent-glow);
  }

  .preview-shade {
    position:
      absolute;

    inset:
      0;

    background:
      linear-gradient(
        90deg,
        rgba(4,7,11,.93),
        rgba(4,7,11,.38) 60%,
        rgba(4,7,11,.22)
      );
  }

  .preview-accent-line {
    position:
      absolute;

    left:
      0;

    right:
      0;

    bottom:
      0;

    height:
      4px;

    background:
      linear-gradient(
        90deg,
        var(--profile-accent),
        var(--profile-accent-2),
        transparent
      );
  }

  .preview-content {
    position:
      relative;

    z-index:
      2;

    padding:
      34px;
  }

  .preview-content > span {
    color:
      var(--profile-accent);

    font-size:
      7px;

    font-weight:
      1000;
  }

  .preview-content h2 {
    margin:
      11px 0 4px;

    font-size:
      37px;

    letter-spacing:
      -.04em;
  }

  .preview-content p {
    margin:
      0;

    color:
      #a2acb6;

    font-size:
      11px;
  }

  .preview-favorites {
    margin-top:
      17px;

    display:
      flex;

    align-items:
      center;

    gap:
      10px;

    color:
      #d8dee5;

    font-size:
      10px;
  }

  .preview-favorites i {
    width:
      4px;

    height:
      4px;

    border-radius:
      50%;

    background:
      var(--profile-accent);
  }

  .preview-content > strong {
    display:
      block;

    margin-top:
      28px;

    color:
      #8b96a1 !important;

    font-size:
      8px;
  }

  /* =====================================================
     LAYOUT
     ===================================================== */

  .edit-grid {
    margin-top:
      9px;

    display:
      grid;

    grid-template-columns:
      minmax(360px,.72fr)
      minmax(0,1.28fr);

    gap:
      9px;

    align-items:
      start;
  }

  .edit-card {
    padding:
      26px;

    border:
      1px solid
      rgba(255,255,255,.09);

    border-radius:
      12px;

    background:
      rgba(9,13,19,.84);

    backdrop-filter:
      blur(18px);
  }

  .section-heading h2 {
    margin:
      5px 0 4px;

    font-size:
      24px;
  }

  .section-heading p {
    margin:
      6px 0 0;

    color:
      #87929d;

    font-size:
      9px;

    line-height:
      1.55;
  }

  /* =====================================================
     INPUTS
     ===================================================== */

  .field-label {
    position:
      relative;

    display:
      block;

    margin-top:
      18px;

    color:
      #98a3ae;

    font-size:
      9px;

    font-weight:
      900;
  }

  .field-label input,
  .field-label textarea,
  .field-label select {
    width:
      100%;

    margin-top:
      7px;

    padding:
      0 12px;

    border:
      1px solid
      rgba(255,255,255,.10);

    border-radius:
      7px;

    outline:
      none;

    color:
      #fff;

    background:
      rgba(255,255,255,.045);

    font:
      inherit;

    font-size:
      11px;
  }

  .field-label input:focus,
  .field-label textarea:focus,
  .field-label select:focus {
    border-color:
      var(--profile-accent);

    box-shadow:
      0 0 0 2px
      var(--profile-accent-soft);
  }

  .field-label input,
  .field-label select {
    height:
      44px;
  }

  .field-label textarea {
    padding-top:
      12px;

    resize:
      vertical;

    min-height:
      115px;
  }

  .field-label select option {
    color:
      #111;
  }

  .field-label > small {
    position:
      absolute;

    right:
      5px;

    bottom:
      -14px;

    color:
      #69737d;

    font-size:
      7px;
  }

  .username-field {
    position:
      relative;
  }

  .username-field > span {
    position:
      absolute;

    z-index:
      2;

    left:
      12px;

    top:
      21px;

    color:
      #727d88;
  }

  .username-field input {
    padding-left:
      28px;
  }

  .preference-grid {
    display:
      grid;

    grid-template-columns:
      1fr 1fr;

    gap:
      10px;
  }

  /* =====================================================
     ACCENTS
     ===================================================== */

  .accent-grid {
    margin-top:
      18px;

    display:
      grid;

    grid-template-columns:
      repeat(
        2,
        minmax(0,1fr)
      );

    gap:
      9px;
  }

  .accent-option {
    min-height:
      72px;

    padding:
      10px 12px;

    display:
      flex;

    align-items:
      center;

    gap:
      11px;

    text-align:
      left;

    border:
      1px solid
      rgba(255,255,255,.08);

    border-radius:
      9px;

    background:
      rgba(255,255,255,.025);

    cursor:
      pointer;

    transition:
      .18s ease;
  }

  .accent-option:hover {
    transform:
      translateY(-2px);

    border-color:
      rgba(255,255,255,.16);
  }

  .accent-option.active {
    border-color:
      var(--option-accent);

    background:
      linear-gradient(
        135deg,
        color-mix(
          in srgb,
          var(--option-accent),
          transparent 88%
        ),
        rgba(255,255,255,.02)
      );

    box-shadow:
      0 0 22px
      var(--option-glow);
  }

  .accent-circle {
    width:
      42px;

    height:
      42px;

    flex:
      0 0 42px;

    display:
      grid;

    place-items:
      center;

    border-radius:
      50%;

    background:
      linear-gradient(
        135deg,
        var(--option-accent),
        var(--option-accent-2)
      );

    box-shadow:
      0 6px 18px
      var(--option-glow);

    color:
      #fff;

    font-weight:
      1000;
  }

  .accent-option strong {
    display:
      block;

    font-size:
      10px;
  }

  .accent-option small {
    display:
      block;

    margin-top:
      4px;

    color:
      #79848f;

    font-size:
      7px;
  }

  .accent-demo {
    position:
      relative;

    margin-top:
      12px;

    padding:
      16px;

    overflow:
      hidden;

    border:
      1px solid
      rgba(255,255,255,.07);

    border-radius:
      9px;

    background:
      rgba(255,255,255,.025);
  }

  .accent-demo span {
    display:
      block;

    color:
      #7f8a95;

    font-size:
      7px;

    font-weight:
      1000;
  }

  .accent-demo strong {
    display:
      block;

    margin-top:
      5px;

    font-size:
      15px;
  }

  .accent-demo-line {
    width:
      75%;

    height:
      4px;

    margin-top:
      14px;

    border-radius:
      999px;

    background:
      linear-gradient(
        90deg,
        var(--profile-accent),
        var(--profile-accent-2),
        transparent
      );
  }

  /* =====================================================
     WALLPAPERS
     ===================================================== */

  .wallpaper-heading {
    margin-top:
      32px;

    padding-top:
      25px;

    border-top:
      1px solid
      rgba(255,255,255,.08);
  }

  .wallpaper-grid {
    margin-top:
      17px;

    display:
      grid;

    grid-template-columns:
      repeat(
        2,
        minmax(0,1fr)
      );

    gap:
      9px;
  }

  .wallpaper-option {
    padding:
      0;

    overflow:
      hidden;

    text-align:
      left;

    border:
      1px solid
      rgba(255,255,255,.085);

    border-radius:
      9px;

    color:
      #fff;

    background:
      rgba(255,255,255,.02);

    cursor:
      pointer;

    transition:
      .18s ease;
  }

  .wallpaper-option:hover {
    transform:
      translateY(-2px);

    border-color:
      rgba(255,255,255,.20);
  }

  .wallpaper-option.active {
    border-color:
      var(--wallpaper-accent);

    box-shadow:
      0 0 0 1px
      var(--wallpaper-accent),
      0 12px 30px
      rgba(0,0,0,.20);
  }

  .wallpaper-image {
    position:
      relative;

    height:
      125px;

    background-size:
      cover,
      cover,
      cover;

    background-position:
      center;
  }

  .selected-badge {
    position:
      absolute;

    right:
      7px;

    top:
      7px;

    padding:
      5px 7px;

    border-radius:
      999px;

    background:
      rgba(5,8,12,.82);

    color:
      #fff;

    font-size:
      7px;

    font-weight:
      1000;
  }

  .wallpaper-copy {
    padding:
      11px;
  }

  .wallpaper-copy strong {
    display:
      block;

    font-size:
      10px;
  }

  .wallpaper-copy span {
    display:
      block;

    margin-top:
      4px;

    color:
      #7d8893;

    font-size:
      8px;
  }

  /* =====================================================
     SAVE
     ===================================================== */

  .save-bar {
    position:
      sticky;

    bottom:
      10px;

    z-index:
      5;

    min-height:
      68px;

    margin-top:
      9px;

    padding:
      10px 12px;

    display:
      flex;

    align-items:
      center;

    justify-content:
      space-between;

    gap:
      15px;

    border:
      1px solid
      rgba(255,255,255,.10);

    border-radius:
      10px;

    background:
      rgba(7,10,15,.90);

    backdrop-filter:
      blur(20px);

    box-shadow:
      0 15px 45px
      rgba(0,0,0,.25);
  }

  .save-actions {
    display:
      flex;

    gap:
      7px;
  }

  .cancel-button,
  .save-button {
    min-height:
      40px;

    padding:
      0 16px;

    display:
      flex;

    align-items:
      center;

    justify-content:
      center;

    border-radius:
      7px;

    font-size:
      9px;

    font-weight:
      900;
  }

  .cancel-button {
    border:
      1px solid
      rgba(255,255,255,.10);

    color:
      #fff;

    background:
      rgba(255,255,255,.035);
  }

  .save-button {
    border:
      0;

    color:
      #fff;

    background:
      linear-gradient(
        135deg,
        var(--profile-accent-2),
        var(--profile-accent)
      );

    cursor:
      pointer;

    box-shadow:
      0 8px 24px
      var(--profile-accent-glow);
  }

  .save-button:disabled {
    opacity:
      .5;

    cursor:
      not-allowed;
  }

  .success {
    color:
      #55df94;

    font-size:
      9px;
  }

  .error {
    color:
      #ff7770;

    font-size:
      9px;
  }

  /* =====================================================
     RESPONSIVE
     ===================================================== */

  @media(max-width:900px) {
    .edit-grid {
      grid-template-columns:
        1fr;
    }
  }

  @media(max-width:620px) {
    .edit-wrap {
      width:
        calc(100% - 18px);
    }

    .edit-heading {
      align-items:
        flex-start;

      flex-direction:
        column;
    }

    .preference-grid,
    .wallpaper-grid,
    .accent-grid {
      grid-template-columns:
        1fr;
    }

    .save-bar {
      align-items:
        stretch;

      flex-direction:
        column;
    }

    .save-actions {
      width:
        100%;
    }

    .cancel-button,
    .save-button {
      flex:
        1;
    }
  }
/* G6.17.4 â€“ Independent wallpapers for dark / red / light themes */
.wallpaper-theme-toolbar {display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin:0 0 12px;}
.wallpaper-theme-tabs {display:flex; flex-wrap:wrap; align-items:center; gap:7px;}
.wallpaper-theme-tab {cursor:pointer; display:inline-flex; gap:8px; align-items:center; padding:11px 14px; border:1px solid rgba(255,255,255,.17); border-radius:10px; background:#141c28; color:#d8e1ed; font-weight:800; font-size:12px;}
.wallpaper-theme-tab.selected {background:#fff0f2; border-color:#fa586b; color:#a31f36; box-shadow:0 0 0 1px rgba(250,88,107,.22);}
.wallpaper-theme-dot {display:inline-block; width:12px; height:12px; flex:0 0 12px; border:1px solid rgba(0,0,0,.22); border-radius:50%;}
.wallpaper-theme-dot.dark {background:#101721;border-color:#7e8897;}
.wallpaper-theme-dot.red {background:#e10600;}
.wallpaper-theme-dot.light {background:#fff;}
.wallpaper-apply-all {cursor:pointer; padding:10px 12px; border:1px solid rgba(255,102,116,.35); color:#ffacb8; border-radius:10px; background:rgba(255,71,91,.09); font-size:11px; font-weight:850;}
.wallpaper-apply-all:hover {background:rgba(255,71,91,.17);}
.wallpaper-theme-help {margin:0 0 17px; padding:12px 14px; border:1px solid rgba(255,255,255,.10); border-radius:11px; color:#c5cfda; background:rgba(255,255,255,.04); font-size:11px; line-height:1.65;}
.wallpaper-theme-help strong {color:#f35b72;}
@media(max-width:660px){.wallpaper-theme-tabs {width:100%;}.wallpaper-theme-tab{flex:1;justify-content:center;}.wallpaper-apply-all{width:100%;}}

`;
