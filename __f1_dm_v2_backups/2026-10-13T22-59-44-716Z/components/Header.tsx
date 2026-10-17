"use client";
import DmDock from "@/components/DmDock";

import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createClient,
} from "@/utils/supabase/client";

type HeaderTheme =
  | "gray"
  | "red"
  | "light";

/* =========================================================
   THEME
   ========================================================= */

function normalizeTheme(
  value:
    | string
    | null
    | undefined
): HeaderTheme {
  const theme =
    (value || "")
      .trim()
      .toLowerCase();

  if (
    theme === "light" ||
    theme === "white" ||
    theme === "acik" ||
    theme === "açık"
  ) {
    return "light";
  }

  if (
    theme === "red" ||
    theme === "f1-red" ||
    theme === "f1red" ||
    theme === "f1" ||
    theme === "kirmizi" ||
    theme === "kırmızı"
  ) {
    return "red";
  }

  return "gray";
}

function detectTheme(): HeaderTheme {
  if (
    typeof window ===
    "undefined"
  ) {
    return "gray";
  }

  const html =
    document.documentElement;

  const dataTheme =
    html.getAttribute(
      "data-theme"
    );

  if (dataTheme) {
    return normalizeTheme(
      dataTheme
    );
  }

  const dataSiteTheme =
    html.getAttribute(
      "data-site-theme"
    );

  if (dataSiteTheme) {
    return normalizeTheme(
      dataSiteTheme
    );
  }

  const keys = [
    "theme",
    "site-theme",
    "siteTheme",
  ];

  for (
    const key of keys
  ) {
    const stored =
      window.localStorage.getItem(
        key
      );

    if (stored) {
      return normalizeTheme(
        stored
      );
    }
  }

  return "gray";
}

/* =========================================================
   HEADER
   ========================================================= */

export default function Header() {
  const [supabase] =
    useState(() =>
      createClient()
    );

  const [
    theme,
    setTheme,
  ] =
    useState<HeaderTheme>(
      "gray"
    );

  const [
    displayName,
    setDisplayName,
  ] =
    useState<
      string | null
    >(null);

  const [
    avatarUrl,
    setAvatarUrl,
  ] =
    useState<
      string | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    menuOpen,
    setMenuOpen,
  ] =
    useState(false);

  /* =======================================================
     PROFILE
     ======================================================= */

  const loadProfile =
    useCallback(
      async () => {
        try {
          const {
            data: {
              user,
            },
          } =
            await supabase.auth
              .getUser();

          if (!user) {
            setDisplayName(
              null
            );

            setAvatarUrl(
              null
            );

            setLoading(
              false
            );

            return;
          }

          const fallbackName =
            user.user_metadata
              ?.display_name ||
            user.email?.split(
              "@"
            )[0] ||
            "F1 Medipol Üyesi";

          const {
            data:
              profile,
          } =
            await supabase
              .from(
                "profiles"
              )
              .select(`
                display_name,
                avatar_url
              `)
              .eq(
                "id",
                user.id
              )
              .maybeSingle();

          setDisplayName(
            profile?.display_name ||
              fallbackName
          );

          setAvatarUrl(
            profile?.avatar_url ||
              null
          );
        } catch (
          error
        ) {
          console.error(
            "HEADER PROFILE ERROR:",
            error
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [supabase]
    );

  useEffect(
    () => {
      void loadProfile();
    },
    [loadProfile]
  );

  /* =======================================================
     AUTH WATCH
     ======================================================= */

  useEffect(
    () => {
      const {
        data: {
          subscription,
        },
      } =
        supabase.auth
          .onAuthStateChange(
            () => {
              void loadProfile();
            }
          );

      return () => {
        subscription.unsubscribe();
      };
    },
    [
      supabase,
      loadProfile,
    ]
  );

  /* =======================================================
     PROFILE EVENTS
     ======================================================= */

  useEffect(
    () => {
      const refresh =
        () => {
          void loadProfile();
        };

      window.addEventListener(
        "profile-avatar-updated",
        refresh
      );

      window.addEventListener(
        "profile-updated",
        refresh
      );

      return () => {
        window.removeEventListener(
          "profile-avatar-updated",
          refresh
        );

        window.removeEventListener(
          "profile-updated",
          refresh
        );
      };
    },
    [loadProfile]
  );

  /* =======================================================
     THEME WATCH
     ======================================================= */

  useEffect(
    () => {
      const refreshTheme =
        () => {
          setTheme(
            detectTheme()
          );
        };

      refreshTheme();

      const observer =
        new MutationObserver(
          refreshTheme
        );

      observer.observe(
        document.documentElement,
        {
          attributes: true,

          attributeFilter: [
            "data-theme",
            "data-site-theme",
            "class",
          ],
        }
      );

      window.addEventListener(
        "storage",
        refreshTheme
      );

      window.addEventListener(
        "theme-changed",
        refreshTheme
      );

      window.addEventListener(
        "site-theme-changed",
        refreshTheme
      );

      return () => {
        observer.disconnect();

        window.removeEventListener(
          "storage",
          refreshTheme
        );

        window.removeEventListener(
          "theme-changed",
          refreshTheme
        );

        window.removeEventListener(
          "site-theme-changed",
          refreshTheme
        );
      };
    },
    []
  );

  /* =======================================================
     MOBILE MENU EVENTS
     ======================================================= */

  useEffect(
    () => {
      const onKeyDown =
        (
          event: KeyboardEvent
        ) => {
          if (
            event.key ===
            "Escape"
          ) {
            setMenuOpen(
              false
            );
          }
        };

      const onResize =
        () => {
          if (
            window.innerWidth >
            700
          ) {
            setMenuOpen(
              false
            );
          }
        };

      window.addEventListener(
        "keydown",
        onKeyDown
      );

      window.addEventListener(
        "resize",
        onResize
      );

      return () => {
        window.removeEventListener(
          "keydown",
          onKeyDown
        );

        window.removeEventListener(
          "resize",
          onResize
        );
      };
    },
    []
  );

  /* =======================================================
     LOGO
     ======================================================= */

  const logoSrc =
    theme === "light"
      ? "/f1-medipol-logo-light.png"
      : "/f1-medipol-logo-dark.png";

  /* =======================================================
     COLORS
     ======================================================= */

  const isLight =
    theme === "light";

  const isRed =
    theme === "red";

  const headerBackground =
    isRed
      ? "linear-gradient(90deg,#b80000 0%,#ed0900 50%,#bd0000 100%)"
      : isLight
      ? "rgba(250,250,252,.97)"
      : "rgba(13,17,23,.97)";

  const headerBorder =
    isLight
      ? "rgba(0,0,0,.08)"
      : "rgba(255,255,255,.08)";

  const textColor =
    isLight
      ? "#191d24"
      : "#ffffff";

  const mutedColor =
    isLight
      ? "#68717c"
      : "#8d98a5";

  const hoverBackground =
    isLight
      ? "rgba(0,0,0,.055)"
      : "rgba(255,255,255,.08)";

  const profileBackground =
    isLight
      ? "rgba(0,0,0,.035)"
      : "rgba(255,255,255,.055)";

  const profileBorder =
    isLight
      ? "rgba(0,0,0,.10)"
      : "rgba(255,255,255,.11)";

  const mobileMenuBackground =
    isRed
      ? "rgba(78,0,0,.98)"
      : isLight
      ? "rgba(250,250,252,.99)"
      : "rgba(13,17,23,.99)";

  /* =======================================================
     NAVIGATION
     ======================================================= */

  const navItems = [
    {
      label: "Ana Sayfa",
      href: "/",
    },
    {
      label: "Canlı",
      href: "/live",
    },
    {
      label: "Tahmin",
      href: "/predict",
    },
    {
      label: "Liderlik",
      href: "/leaderboard",
    },
    {
      label: "Etkinlikler",
      href: "/events",
    },
    {
      label: "Galeri",
      href: "/gallery",
    },
    {
      label:
        "Yönetim Kurulu",
      href: "/board",
    },
    {
      label: "Paddock",
      href: "/paddock",
    },
    {
      label: "Arcade",
      href: "/arcade",
    },
    {
      label: "Bildirimler",
      href: "/bildirimler",
    },
  ];

  return (
    <header className="medipol-header">
      <style>
        {`
          /* ===============================================
             HEADER
             =============================================== */

          .medipol-header {
            position:
              sticky;

            top:
              0;

            z-index:
              1000;

            width:
              100%;

            height:
              76px;

            display:
              flex;

            align-items:
              center;

            background:
              ${headerBackground};

            border-bottom:
              1px solid
              ${headerBorder};

            backdrop-filter:
              blur(18px);

            -webkit-backdrop-filter:
              blur(18px);
          }

          .medipol-header-inner {
            width:
              min(
                1380px,
                calc(100% - 40px)
              );

            height:
              100%;

            margin:
              0 auto;

            display:
              flex;

            align-items:
              center;

            gap:
              28px;
          }

          /* ===============================================
             LOGO
             =============================================== */

          .medipol-header-logo {
            width:
              190px !important;

            min-width:
              190px !important;

            max-width:
              190px !important;

            height:
              64px !important;

            flex:
              0 0 190px !important;

            margin:
              0 !important;

            padding:
              0 !important;

            display:
              flex !important;

            align-items:
              center !important;

            justify-content:
              flex-start !important;

            background:
              transparent !important;

            border:
              none !important;

            border-radius:
              0 !important;

            box-shadow:
              none !important;

            outline:
              none !important;

            transform:
              none !important;

            scale:
              1 !important;

            transition:
              none !important;

            animation:
              none !important;

            overflow:
              visible !important;

            text-decoration:
              none !important;
          }

          .medipol-header-logo:hover,
          .medipol-header-logo:focus,
          .medipol-header-logo:active {
            transform:
              none !important;

            scale:
              1 !important;

            transition:
              none !important;

            background:
              transparent !important;
          }

          .medipol-header-logo-art {
            width:
              170px !important;

            min-width:
              170px !important;

            max-width:
              170px !important;

            height:
              44px !important;

            min-height:
              44px !important;

            max-height:
              44px !important;

            display:
              block !important;

            background-repeat:
              no-repeat !important;

            background-position:
              left center !important;

            background-size:
              contain !important;

            transform:
              none !important;

            scale:
              1 !important;

            transition:
              none !important;

            pointer-events:
              none !important;
          }

          /* ===============================================
             DESKTOP NAV
             =============================================== */

          .medipol-header-nav {
            min-width:
              0;

            flex:
              1;

            display:
              flex;

            align-items:
              center;

            justify-content:
              center;

            gap:
              3px;
          }

          .medipol-header-nav-link {
            padding:
              10px 10px;

            border-radius:
              8px;

            color:
              ${textColor} !important;

            font-size:
              11px;

            font-weight:
              850;

            line-height:
              1;

            white-space:
              nowrap;

            text-decoration:
              none;

            transition:
              background .15s ease;
          }

          .medipol-header-nav-link:hover {
            background:
              ${hoverBackground};
          }

          /* ===============================================
             RIGHT AREA
             =============================================== */

          .medipol-header-right {
            flex:
              0 0 auto;

            display:
              flex;

            align-items:
              center;

            gap:
              8px;
          }

          /* ===============================================
             PROFILE
             =============================================== */

          .medipol-header-profile {
            min-height:
              44px;

            padding:
              5px 11px 5px 6px;

            display:
              flex;

            align-items:
              center;

            gap:
              9px;

            border:
              1px solid
              ${profileBorder};

            border-radius:
              10px;

            background:
              ${profileBackground};

            color:
              ${textColor} !important;

            text-decoration:
              none;

            transition:
              background .15s ease;
          }

          .medipol-header-profile:hover {
            background:
              ${hoverBackground};
          }

          .medipol-header-avatar {
            width:
              34px;

            height:
              34px;

            min-width:
              34px;

            overflow:
              hidden;

            display:
              grid;

            place-items:
              center;

            border:
              1px solid
              ${
                isLight
                  ? "rgba(0,0,0,.10)"
                  : "rgba(255,255,255,.13)"
              };

            border-radius:
              8px;

            color:
              #fff;

            font-size:
              12px;

            font-weight:
              1000;
          }

          .medipol-header-avatar img {
            display:
              block !important;

            width:
              100% !important;

            height:
              100% !important;

            object-fit:
              contain !important;

            object-position:
              center !important;

            background:
              #fff;

            transform:
              none !important;
          }

          .medipol-header-profile-name {
            max-width:
              120px;

            overflow:
              hidden;

            text-overflow:
              ellipsis;

            white-space:
              nowrap;

            color:
              ${textColor} !important;

            font-size:
              11px;

            font-weight:
              900;
          }

          /* ===============================================
             MOBILE MENU BUTTON
             =============================================== */

          .medipol-mobile-menu-button {
            display:
              none;

            width:
              44px;

            height:
              44px;

            flex:
              0 0 44px;

            padding:
              0;

            align-items:
              center;

            justify-content:
              center;

            border:
              1px solid
              ${profileBorder};

            border-radius:
              10px;

            color:
              ${textColor};

            background:
              ${profileBackground};

            cursor:
              pointer;
          }

          .medipol-hamburger {
            width:
              20px;

            height:
              16px;

            position:
              relative;

            display:
              block;
          }

          .medipol-hamburger span {
            position:
              absolute;

            left:
              0;

            width:
              20px;

            height:
              2px;

            border-radius:
              999px;

            background:
              ${textColor};

            transition:
              top .18s ease,
              transform .18s ease,
              opacity .18s ease;
          }

          .medipol-hamburger span:nth-child(1) {
            top:
              0;
          }

          .medipol-hamburger span:nth-child(2) {
            top:
              7px;
          }

          .medipol-hamburger span:nth-child(3) {
            top:
              14px;
          }

          .medipol-mobile-menu-button.open
          .medipol-hamburger
          span:nth-child(1) {
            top:
              7px;

            transform:
              rotate(45deg);
          }

          .medipol-mobile-menu-button.open
          .medipol-hamburger
          span:nth-child(2) {
            opacity:
              0;
          }

          .medipol-mobile-menu-button.open
          .medipol-hamburger
          span:nth-child(3) {
            top:
              7px;

            transform:
              rotate(-45deg);
          }

          /* ===============================================
             MOBILE DRAWER
             =============================================== */

          .medipol-mobile-drawer {
            display:
              none;

            position:
              absolute;

            left:
              0;

            right:
              0;

            top:
              68px;

            padding:
              10px;

            border-bottom:
              1px solid
              ${headerBorder};

            background:
              ${mobileMenuBackground};

            backdrop-filter:
              blur(22px);

            -webkit-backdrop-filter:
              blur(22px);

            box-shadow:
              0 24px 45px
              rgba(0,0,0,.28);
          }

          .medipol-mobile-drawer.open {
            display:
              block;
          }

          .medipol-mobile-nav {
            width:
              min(
                100%,
                520px
              );

            margin:
              0 auto;

            padding:
              5px;

            display:
              grid;

            grid-template-columns:
              1fr 1fr;

            gap:
              6px;
          }

          .medipol-mobile-nav-link {
            min-height:
              48px;

            padding:
              0 14px;

            display:
              flex;

            align-items:
              center;

            justify-content:
              space-between;

            gap:
              12px;

            border:
              1px solid
              ${profileBorder};

            border-radius:
              10px;

            background:
              ${profileBackground};

            color:
              ${textColor} !important;

            font-size:
              13px;

            font-weight:
              850;

            text-decoration:
              none;
          }

          .medipol-mobile-nav-link span:last-child {
            color:
              ${mutedColor};

            font-size:
              15px;
          }

          .medipol-mobile-profile-link {
            grid-column:
              1 / -1;

            min-height:
              54px;

            padding:
              7px 12px;

            display:
              flex;

            align-items:
              center;

            gap:
              10px;

            border:
              1px solid
              ${profileBorder};

            border-radius:
              11px;

            background:
              ${profileBackground};

            color:
              ${textColor} !important;

            text-decoration:
              none;
          }

          .medipol-mobile-profile-copy {
            min-width:
              0;

            flex:
              1;
          }

          .medipol-mobile-profile-copy strong {
            display:
              block;

            overflow:
              hidden;

            text-overflow:
              ellipsis;

            white-space:
              nowrap;

            color:
              ${textColor} !important;

            font-size:
              12px;
          }

          .medipol-mobile-profile-copy span {
            display:
              block;

            margin-top:
              2px;

            color:
              ${mutedColor};

            font-size:
              9px;
          }

          /* ===============================================
             TABLET
             =============================================== */

          @media(max-width:1150px) {
            .medipol-header-inner {
              gap:
                17px;
            }

            .medipol-header-logo {
              width:
                155px !important;

              min-width:
                155px !important;

              max-width:
                155px !important;

              flex-basis:
                155px !important;
            }

            .medipol-header-logo-art {
              width:
                145px !important;

              min-width:
                145px !important;

              max-width:
                145px !important;

              height:
                37px !important;

              min-height:
                37px !important;

              max-height:
                37px !important;
            }

            .medipol-header-nav-link {
              padding:
                9px 7px;

              font-size:
                10px;
            }
          }

          /* ===============================================
             MOBILE
             =============================================== */

          @media(max-width:700px) {
            .medipol-header {
              height:
                68px;
            }

            .medipol-header-inner {
              width:
                calc(100% - 18px);

              gap:
                8px;
            }

            .medipol-header-nav {
              display:
                none;
            }

            .medipol-header-logo {
              width:
                130px !important;

              min-width:
                130px !important;

              max-width:
                130px !important;

              height:
                56px !important;

              flex-basis:
                130px !important;
            }

            .medipol-header-logo-art {
              width:
                120px !important;

              min-width:
                120px !important;

              max-width:
                120px !important;

              height:
                32px !important;

              min-height:
                32px !important;

              max-height:
                32px !important;
            }

            .medipol-header-right {
              margin-left:
                auto;
            }

            .medipol-header-profile {
              width:
                44px;

              min-width:
                44px;

              height:
                44px;

              min-height:
                44px;

              padding:
                4px;

              justify-content:
                center;
            }

            .medipol-header-profile-name,
            .medipol-profile-arrow {
              display:
                none;
            }

            .medipol-header-avatar {
              width:
                34px;

              min-width:
                34px;

              height:
                34px;
            }

            .medipol-mobile-menu-button {
              display:
                flex;
            }
          }

          /* ===============================================
             VERY SMALL PHONE
             =============================================== */

          @media(max-width:390px) {
            .medipol-header-logo {
              width:
                112px !important;

              min-width:
                112px !important;

              max-width:
                112px !important;

              flex-basis:
                112px !important;
            }

            .medipol-header-logo-art {
              width:
                104px !important;

              min-width:
                104px !important;

              max-width:
                104px !important;

              height:
                29px !important;

              min-height:
                29px !important;

              max-height:
                29px !important;
            }

            .medipol-mobile-nav {
              grid-template-columns:
                1fr;
            }

            .medipol-mobile-profile-link {
              grid-column:
                auto;
            }
          }
        `}
      </style>

      <div className="medipol-header-inner">

        {/* =================================================
            LOGO
            ================================================= */}

        <Link
          href="/"
          className="medipol-header-logo"
          aria-label="F1 Medipol Ana Sayfa"
          onClick={() =>
            setMenuOpen(false)
          }
        >
          <span
            className="medipol-header-logo-art"
            style={{
              backgroundImage:
                `url("${logoSrc}")`,
            }}
          />
        </Link>

        {/* =================================================
            DESKTOP NAVIGATION
            ================================================= */}

        <nav className="medipol-header-nav">
          {navItems.map(
            (
              item
            ) => (
              <Link
                key={
                  item.href
                }
                href={
                  item.href
                }
                className="medipol-header-nav-link"
              >
                {
                  item.label
                }
              </Link>
            )
          )}
        </nav>

        {/* =================================================
            RIGHT
            ================================================= */}

        <div className="medipol-header-right">

          {/* NOTIFICATIONS */}
          <NotificationBell isLight={isLight} />
          <DmDock isLight={isLight} />

          {/* PROFILE */}

          {loading ? (
            <div
              style={{
                width:
                  44,

                height:
                  44,
              }}
            />
          ) : displayName ? (
            <Link
              href="/profile"
              className="medipol-header-profile"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              <div
                className="medipol-header-avatar"
                style={{
                  background:
                    avatarUrl
                      ? "#ffffff"
                      : "linear-gradient(135deg,#e10600,#ff5149)",
                }}
              >
                {avatarUrl ? (
                  <img
                    src={
                      avatarUrl
                    }
                    alt={
                      displayName
                    }
                  />
                ) : (
                  displayName
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>

              <span className="medipol-header-profile-name">
                {
                  displayName
                }
              </span>

              <span className="medipol-profile-arrow">
                ›
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="medipol-header-profile"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              Giriş
            </Link>
          )}

          {/* MOBILE MENU BUTTON */}

          <button
            type="button"
            className={[
              "medipol-mobile-menu-button",

              menuOpen
                ? "open"
                : "",
            ].join(
              " "
            )}
            aria-label={
              menuOpen
                ? "Menüyü kapat"
                : "Menüyü aç"
            }
            aria-expanded={
              menuOpen
            }
            onClick={() =>
              setMenuOpen(
                (
                  current
                ) =>
                  !current
              )
            }
          >
            <span className="medipol-hamburger">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {/* =================================================
          MOBILE MENU
          ================================================= */}

      <div
        className={[
          "medipol-mobile-drawer",

          menuOpen
            ? "open"
            : "",
        ].join(
          " "
        )}
      >
        <nav className="medipol-mobile-nav">

          {/* MOBILE PROFILE */}

          {displayName && (
            <Link
              href="/profile"
              className="medipol-mobile-profile-link"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              <div
                className="medipol-header-avatar"
                style={{
                  background:
                    avatarUrl
                      ? "#ffffff"
                      : "linear-gradient(135deg,#e10600,#ff5149)",
                }}
              >
                {avatarUrl ? (
                  <img
                    src={
                      avatarUrl
                    }
                    alt={
                      displayName
                    }
                  />
                ) : (
                  displayName
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>

              <div className="medipol-mobile-profile-copy">
                <strong>
                  {
                    displayName
                  }
                </strong>

                <span>
                  PROFİLİ GÖR
                </span>
              </div>

              <span>
                →
              </span>
            </Link>
          )}

          {/* MENU ITEMS */}

          {navItems.map(
            (
              item
            ) => (
              <Link
                key={
                  item.href
                }
                href={
                  item.href
                }
                className="medipol-mobile-nav-link"
                onClick={() =>
                  setMenuOpen(
                    false
                  )
                }
              >
                <span>
                  {
                    item.label
                  }
                </span>

                <span>
                  →
                </span>
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}