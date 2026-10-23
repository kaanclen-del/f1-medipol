"use client";
import HeaderThemeMenu from "@/components/HeaderThemeMenu";
import WelcomeTour from "@/components/WelcomeTour";
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

// Preserve the last confirmed profile between App Router page remounts.
// Never store profile information in persistent browser storage.
let cachedHeaderProfile: { displayName: string; avatarUrl: string | null } | null = null;

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
    >(cachedHeaderProfile?.displayName ?? null);

  const [
    avatarUrl,
    setAvatarUrl,
  ] =
    useState<
      string | null
    >(cachedHeaderProfile?.avatarUrl ?? null);

  const [
    loading,
    setLoading,
  ] =
    useState(() => cachedHeaderProfile === null);

  const [
    menuOpen,
    setMenuOpen,
  ] =
    useState(false);

  // Compact header is also used on iPhone landscape (CSS viewport > 700px).
  const [compactHeader, setCompactHeader] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px), (pointer: coarse) and (max-width: 1100px)');
    const update = () => setCompactHeader(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const [mobileHeaderHidden, setMobileHeaderHidden] = useState(false);
  useEffect(() => {
    let previousY = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const nextY = window.scrollY;
        const difference = nextY - previousY;
        if (nextY < 80 || menuOpen) setMobileHeaderHidden(false);
        else if (difference > 7) setMobileHeaderHidden(true);
        else if (difference < -5) setMobileHeaderHidden(false);
        previousY = nextY;
      });
    };
    window.addEventListener("scroll", onScroll, {passive:true});
    return () => {window.removeEventListener("scroll",onScroll); if(frame)window.cancelAnimationFrame(frame);};
  }, [menuOpen]);

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
            cachedHeaderProfile = null;
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

          const nextName = profile?.display_name || fallbackName;
          const nextAvatar = profile?.avatar_url || null;
          cachedHeaderProfile = { displayName: nextName, avatarUrl: nextAvatar };
          setDisplayName(nextName);
          setAvatarUrl(nextAvatar);
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
            !window.matchMedia('(max-width: 700px), (pointer: coarse) and (max-width: 1100px)').matches
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
    <>
    <header className="medipol-header" data-scroll-hidden={mobileHeaderHidden && !menuOpen ? "true" : "false"}>
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
              650;

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
              700;
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
              none;

            -webkit-backdrop-filter:
              none;

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
              12px;

            font-weight:
              650;

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
          /* V12 scroll-up header — pinned to viewport only on mobile */
          .medipol-mobile-header-spacer { display:none; }
          @media (max-width:700px) {
            .medipol-header {position:fixed!important;top:0!important;left:0!important;right:0!important;width:100%!important;z-index:1900!important;transition:transform .22s ease-out!important;will-change:transform;}
            .medipol-header[data-scroll-hidden="true"] {transform:translate3d(0,-105%,0)!important;pointer-events:none!important;}
            .medipol-mobile-header-spacer {display:block;height:68px;min-height:68px;flex:none;}
          }
          /* G6.2.6: iPhone portrait AND landscape use hamburger-only header.
             Do not keep desktop DM / notification / profile in the top bar. */
          @media (max-width:700px), (pointer:coarse) and (max-width:1100px) {
            .medipol-header {
              position:fixed!important;top:0!important;left:0!important;right:0!important;
              z-index:1900!important;
              height:64px!important;
              max-width:100vw!important;
              overflow:visible!important;
            }
            .medipol-header-inner {
              width:calc(100% - 20px)!important;
              max-width:100%!important;
              justify-content:space-between!important;
              gap:8px!important;
              min-width:0!important;
            }
            .medipol-header[data-scroll-hidden="true"] {transform:translate3d(0,-105%,0)!important;pointer-events:none!important;}
            .medipol-header-nav { display:none!important; }
            .medipol-header-logo {
              width:124px!important;min-width:100px!important;max-width:124px!important;
              flex-basis:124px!important;flex-shrink:1!important;
            }
            .medipol-header-logo-art {width:118px!important;min-width:0!important;max-width:118px!important;height:31px!important;}
            .medipol-header-right {margin-left:auto!important;min-width:44px!important;width:44px!important;flex:none!important;gap:0!important;}
            .medipol-header-right > .medipol-header-profile { display:none!important; }
            .medipol-mobile-menu-button {display:flex!important;min-width:44px!important;min-height:44px!important;}
            .medipol-mobile-drawer {
              position:fixed!important;top:64px!important;left:0!important;right:0!important;
              max-height:calc(100dvh - 64px - env(safe-area-inset-bottom,0px))!important;
              overflow-y:auto!important;overscroll-behavior:contain!important;
              -webkit-overflow-scrolling:touch!important;
              z-index:2005!important;
            }
            .medipol-mobile-drawer:not(.open){display:none!important;}
            .medipol-mobile-drawer.open{display:block!important;}
            .medipol-mobile-nav {grid-template-columns:repeat(2,minmax(0,1fr))!important;}
            .medipol-mobile-header-spacer {height:64px!important;min-height:64px!important;}
          }
          @media (max-width:460px) {
            .medipol-mobile-nav{grid-template-columns:1fr!important;}
          }
          /* G6.4: landscape touch header: account, DM and notifications stay outside menu. */
          @media (pointer:coarse) and (orientation:landscape) and (min-width:600px) and (max-width:1100px){
           .medipol-header-right{width:auto!important;min-width:0!important;gap:5px!important;flex:0 1 auto!important}
           .medipol-header-right>.medipol-header-profile{display:flex!important;width:auto!important;min-width:0!important;height:38px!important;min-height:38px!important;padding:3px 7px!important;gap:5px!important}
           .medipol-header-profile-name{display:block!important;max-width:94px!important;font-size:10px!important}
           .medipol-profile-arrow{display:none!important}
           .medipol-header-avatar{width:28px!important;height:28px!important;min-width:28px!important}
           .medipol-mobile-menu-button{min-width:38px!important;width:38px!important;height:38px!important;min-height:38px!important;flex:0 0 38px!important}
           .medipol-landscape-quick{display:flex!important;align-items:center;gap:3px;flex:0 0 auto}
           .medipol-landscape-quick>*{flex:0 0 auto}
           .medipol-header-logo{width:110px!important;min-width:96px!important;max-width:110px!important;flex-basis:110px!important}
           .medipol-header-logo-art{width:106px!important;max-width:106px!important}
          }
          .medipol-landscape-quick{display:none}
          /* G6.7 — profile, messaging and notifications always visible on mobile */
          @media (max-width:700px), (pointer:coarse) and (max-width:1100px){
            .medipol-header-right{display:flex!important;width:auto!important;min-width:0!important;flex:0 1 auto!important;gap:4px!important}
            .medipol-header-right>.medipol-header-profile{display:flex!important;width:auto!important;min-width:0!important;max-width:110px!important;min-height:36px!important;height:36px!important;padding:3px 5px!important;gap:5px!important}
            .medipol-header-profile-name{display:block!important;max-width:66px!important;font-size:9px!important}
            .medipol-profile-arrow{display:none!important}
            .medipol-header-avatar{width:27px!important;height:27px!important;min-width:27px!important}
            .medipol-landscape-quick{display:flex!important;align-items:center!important;gap:2px!important;flex:0 0 auto!important}
            .medipol-landscape-quick>*{flex:0 0 auto!important}
            .medipol-mobile-menu-button{width:36px!important;min-width:36px!important;flex:0 0 36px!important;min-height:36px!important;height:36px!important}
            .medipol-header-logo{width:105px!important;min-width:76px!important;max-width:105px!important;flex-basis:105px!important}
            .medipol-header-logo-art{width:98px!important;max-width:98px!important;min-width:0!important}
            .medipol-header-inner{gap:4px!important}
          }
          @media (max-width:390px){
            .medipol-header-logo{width:84px!important;min-width:72px!important;max-width:84px!important;flex-basis:84px!important}
            .medipol-header-logo-art{width:80px!important;max-width:80px!important}
            .medipol-header-profile-name{max-width:40px!important}
            .medipol-header-right{gap:2px!important}
          }

          /* G6.9 — symmetric touch header, consistent on portrait and landscape.
             Theme is a top-bar control; mobile drawer holds only navigation and tour. */
          .medipol-header-login-icon { display:none; }
          @media (max-width:700px), (pointer:coarse) and (max-width:1100px) {
            .medipol-header-inner {
              width:calc(100% - 16px)!important;
              min-width:0!important;
              gap:5px!important;
              justify-content:space-between!important;
            }
            .medipol-header-logo {
              width:clamp(72px,25vw,110px)!important;
              min-width:0!important;
              max-width:110px!important;
              flex:0 1 clamp(72px,25vw,110px)!important;
            }
            .medipol-header-logo-art {
              width:100%!important;
              max-width:100%!important;
              min-width:0!important;
              height:auto!important;
              max-height:32px!important;
              object-fit:contain!important;
            }
            .medipol-header-right {
              width:auto!important;
              min-width:0!important;
              flex:0 0 auto!important;
              gap:4px!important;
              margin-left:auto!important;
              display:flex!important;
              align-items:center!important;
            }
            .medipol-header-right > .medipol-header-profile,
            .medipol-header-right > .medipol-mobile-menu-button {
              box-sizing:border-box!important;
              display:flex!important;
              width:40px!important;
              min-width:40px!important;
              max-width:40px!important;
              height:40px!important;
              min-height:40px!important;
              max-height:40px!important;
              flex:0 0 40px!important;
              align-items:center!important;
              justify-content:center!important;
              padding:3px!important;
              border-radius:11px!important;
              line-height:1!important;
            }
            .medipol-header-profile-name,.medipol-profile-arrow {display:none!important;}
            .medipol-header-avatar {
              box-sizing:border-box!important;
              width:31px!important;
              height:31px!important;
              min-width:31px!important;
              min-height:31px!important;
              max-height:31px!important;
              border-radius:9px!important;
            }
            .medipol-landscape-quick {
              display:flex!important;
              gap:4px!important;
              align-items:center!important;
              flex:0 0 auto!important;
            }
            .medipol-quick-control {
              box-sizing:border-box;
              width:40px;
              height:40px;
              min-width:40px;
              max-width:40px;
              flex:0 0 40px;
              display:flex;
              align-items:center;
              justify-content:center;
              position:relative;
            }
            /* Only the trigger, never the DM / notification popup content. */
            .medipol-quick-control > button,
            .medipol-quick-control > a,
            .medipol-quick-control > div > button:first-child,
            .medipol-quick-control > div > a:first-child {
              box-sizing:border-box!important;
              width:40px!important;
              height:40px!important;
              min-width:40px!important;
              min-height:40px!important;
              max-width:40px!important;
              max-height:40px!important;
              padding:0!important;
              border-radius:11px!important;
              display:flex!important;
              justify-content:center!important;
              align-items:center!important;
            }
            .medipol-quick-control > div:first-child { min-width:0!important; }
            .medipol-header-login-icon {display:block!important;}
            .medipol-header-login-label {display:none!important;}
          }
          @media (max-width:355px) {
            .medipol-header-inner {gap:2px!important;}
            .medipol-header-right,.medipol-landscape-quick {gap:2px!important;}
            .medipol-header-logo {width:70px!important;flex-basis:70px!important;}
            .medipol-header-right > .medipol-header-profile,
            .medipol-header-right > .medipol-mobile-menu-button,
            .medipol-quick-control {width:36px!important;min-width:36px!important;max-width:36px!important;height:36px!important;min-height:36px!important;max-height:36px!important;flex-basis:36px!important;}
            .medipol-quick-control > button,
            .medipol-quick-control > a,
            .medipol-quick-control > div > button:first-child,
            .medipol-quick-control > div > a:first-child {width:36px!important;min-width:36px!important;max-width:36px!important;height:36px!important;min-height:36px!important;max-height:36px!important;}
          }

          /* G6.9.5: stable profile slot throughout loading / navigation. */
          .medipol-header-profile-loading {visibility:visible!important;opacity:.60;pointer-events:none!important;}
          @media (min-width:1101px) {
            .medipol-header-right > .medipol-header-profile {
              width:155px!important;min-width:155px!important;max-width:155px!important;
              flex:0 0 155px!important;box-sizing:border-box!important;
            }
            .medipol-header-profile-name {
              flex:1 1 0!important;min-width:0!important;max-width:none!important;
              overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;
            }
            .medipol-header-avatar {
              flex:0 0 37px!important;min-width:37px!important;max-width:37px!important;height:37px!important;
            }
          }
          /* G6.13.1: unauthenticated visitors get a compact login control.
             Signed-in profile keeps its reserved geometry to avoid layout shifts. */
          @media (min-width:1101px) {
            .medipol-header-right > .medipol-header-profile-guest {
              width:auto!important;min-width:96px!important;max-width:124px!important;
              flex:0 0 auto!important;box-sizing:border-box!important;
              justify-content:center!important;gap:6px!important;
              padding:5px 10px!important;
            }
            .medipol-header-profile-guest .medipol-header-login-label {
              display:inline!important;font-size:12.5px!important;font-weight:800!important;letter-spacing:.01em!important;
            }
          }
          /* G6.9.4 — desktop readability only; mobile dimensions unchanged. */
          @media (min-width:1101px) {
            .medipol-header {height:86px!important;min-height:86px!important;max-height:86px!important;}
            .medipol-header-inner {gap:18px!important;}
            .medipol-header-logo {width:205px!important;min-width:205px!important;max-width:205px!important;flex:0 0 205px!important;height:68px!important;}
            .medipol-header-logo-art {width:190px!important;min-width:190px!important;max-width:190px!important;height:48px!important;min-height:48px!important;max-height:48px!important;}
            .medipol-header-nav {gap:2px!important;}
            .medipol-header-nav-link {font-size:12.6px!important;font-weight:650!important;padding:11px 8px!important;}
            .medipol-header-right {gap:9px!important;}
            .medipol-header-profile {min-height:48px!important;padding:5px 12px 5px 6px!important;}
            .medipol-header-avatar {width:37px!important;height:37px!important;min-width:37px!important;}
            .medipol-header-profile-name {font-size:12px!important;}
            .medipol-quick-control {min-width:44px!important;min-height:44px!important;}
          }
          /* G6.9.3 — stable dimensions through route changes and authentication. */
          .medipol-header-profile-loading {pointer-events:none!important;visibility:hidden!important;}
          @media (min-width:1101px) {
            .medipol-header {height:86px!important;min-height:86px!important;max-height:86px!important;}
          }
          @media (max-width:700px), (pointer:coarse) and (max-width:1100px) {
            .medipol-header {height:70px!important;min-height:70px!important;max-height:70px!important;}
            .medipol-mobile-header-spacer {height:70px!important;min-height:70px!important;}
            .medipol-header-inner {height:70px!important;min-height:70px!important;}
            .medipol-header-right {min-width:220px!important;min-height:42px!important;justify-content:flex-end!important;}
            .medipol-header-right > .medipol-header-profile,
            .medipol-header-right > .medipol-mobile-menu-button,
            .medipol-quick-control {width:42px!important;min-width:42px!important;max-width:42px!important;height:42px!important;min-height:42px!important;max-height:42px!important;flex-basis:42px!important;}
            .medipol-quick-control > button,
            .medipol-quick-control > a,
            .medipol-quick-control > div > button:first-child,
            .medipol-quick-control > div > a:first-child {width:42px!important;min-width:42px!important;max-width:42px!important;height:42px!important;min-height:42px!important;max-height:42px!important;}
            .medipol-header-avatar {width:32px!important;height:32px!important;min-width:32px!important;min-height:32px!important;max-width:32px!important;max-height:32px!important;}
          }
          @media (max-width:355px) {
            .medipol-header-right {min-width:190px!important;}
            .medipol-header-right > .medipol-header-profile,
            .medipol-header-right > .medipol-mobile-menu-button,
            .medipol-quick-control {width:36px!important;min-width:36px!important;max-width:36px!important;height:36px!important;min-height:36px!important;max-height:36px!important;flex-basis:36px!important;}
            .medipol-quick-control > button,
            .medipol-quick-control > a,
            .medipol-quick-control > div > button:first-child,
            .medipol-quick-control > div > a:first-child {width:36px!important;min-width:36px!important;max-width:36px!important;height:36px!important;min-height:36px!important;max-height:36px!important;}
          }
          /* G6.9.2 — softer, faster mobile navigation (preserve quick actions) */
          @media (max-width:700px), (pointer:coarse) and (max-width:1100px) {
            .medipol-mobile-drawer { backdrop-filter:none!important; -webkit-backdrop-filter:none!important; box-shadow:0 12px 24px rgba(0,0,0,.20)!important; }
            .medipol-mobile-nav { gap:5px!important; padding:4px!important; }
            .medipol-mobile-nav-link { min-height:45px!important; padding:0 12px!important; font-size:12px!important; font-weight:600!important; letter-spacing:0!important; }
            .medipol-mobile-nav-link span:last-child { font-size:14px!important; font-weight:400!important; }
            .medipol-header-profile-name { font-weight:650!important; }
          }
          /* G6.9.6: a visible reserved profile slot during first auth check. */
          .medipol-header-profile-loading {visibility:visible!important;opacity:.65!important;pointer-events:none!important;}
          @media (prefers-reduced-motion:reduce){.medipol-header{transition:none!important;}}
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
          {!compactHeader && <>
            <HeaderThemeMenu />
            <NotificationBell isLight={isLight} />
            <DmDock isLight={isLight} />
          </>}
          {!compactHeader && <WelcomeTour />}

          {/* PROFILE */}

          {loading ? (
            <span className="medipol-header-profile medipol-header-profile-loading" aria-label="Profil yükleniyor">
              <span className="medipol-header-avatar" aria-hidden="true" />
              <span className="medipol-header-profile-name" aria-hidden="true">Profil</span>
              <span className="medipol-profile-arrow" aria-hidden="true">›</span>
            </span>
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
              className="medipol-header-profile medipol-header-profile-guest"
              onClick={() =>
                setMenuOpen(false)
              }
              aria-label="Giriş yap"
            >
              <span className="medipol-header-login-label">Giriş Yap</span>
              <svg className="medipol-header-login-icon" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
            </Link>
          )}

          {compactHeader && (
            <div className="medipol-landscape-quick" aria-label="Hızlı işlemler">
              <div className="medipol-quick-control medipol-quick-dm" aria-label="Mesajlar">
                <DmDock isLight={isLight} />
              </div>
              <div className="medipol-quick-control medipol-quick-notifications" aria-label="Bildirimler">
                <NotificationBell isLight={isLight} />
              </div>
              <div className="medipol-quick-control medipol-quick-theme" aria-label="Tema seçimi">
                <HeaderThemeMenu />
              </div>
            </div>
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
    <div className="medipol-mobile-header-spacer" aria-hidden="true" />
    </>
  );
}