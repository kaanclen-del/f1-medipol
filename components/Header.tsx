"use client";

import HeaderThemeMenu from "@/components/HeaderThemeMenu";
import WelcomeTour from "@/components/WelcomeTour";
import DmDock from "@/components/DmDock";
import NotificationBell from "@/components/NotificationBell";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type HeaderTheme = "gray" | "red" | "light";

let cachedHeaderProfile: {
  displayName: string;
  avatarUrl: string | null;
} | null = null;

function normalizeTheme(value: string | null | undefined): HeaderTheme {
  const theme = (value || "").trim().toLowerCase();

  if (["light", "white", "acik", "açık"].includes(theme)) return "light";

  if (
    ["red", "f1-red", "f1red", "f1", "kirmizi", "kırmızı"].includes(theme)
  ) {
    return "red";
  }

  return "gray";
}

function detectTheme(): HeaderTheme {
  if (typeof window === "undefined") return "gray";

  const html = document.documentElement;
  const dataTheme = html.getAttribute("data-theme");
  if (dataTheme) return normalizeTheme(dataTheme);

  const siteTheme = html.getAttribute("data-site-theme");
  if (siteTheme) return normalizeTheme(siteTheme);

  for (const key of ["theme", "site-theme", "siteTheme"]) {
    const value = window.localStorage.getItem(key);
    if (value) return normalizeTheme(value);
  }

  return "gray";
}

const navItems = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Canlı", href: "/live" },
  { label: "Tahmin", href: "/predict" },
  { label: "Liderlik", href: "/leaderboard" },
  { label: "Etkinlikler", href: "/events" },
  { label: "Galeri", href: "/gallery" },
  { label: "Yönetim Kurulu", href: "/board" },
  { label: "Paddock", href: "/paddock" },
  { label: "Arcade", href: "/arcade" },
  { label: "Bildirimler", href: "/bildirimler" },
];

export default function Header() {
  const [supabase] = useState(() => createClient());

  const [theme, setTheme] = useState<HeaderTheme>("gray");
  const [displayName, setDisplayName] = useState<string | null>(
    cachedHeaderProfile?.displayName ?? null
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    cachedHeaderProfile?.avatarUrl ?? null
  );
  const [loading, setLoading] = useState(() => cachedHeaderProfile === null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [compactHeader, setCompactHeader] = useState(false);
  const [mobileHeaderHidden, setMobileHeaderHidden] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(
      "(max-width: 700px), (pointer: coarse) and (max-width: 1100px)"
    );

    const update = () => setCompactHeader(media.matches);
    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let previousY = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const nextY = window.scrollY;
        const difference = nextY - previousY;

        if (nextY < 80 || menuOpen) {
          setMobileHeaderHidden(false);
        } else if (difference > 7) {
          setMobileHeaderHidden(true);
        } else if (difference < -5) {
          setMobileHeaderHidden(false);
        }

        previousY = nextY;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [menuOpen]);

  const loadProfile = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        cachedHeaderProfile = null;
        setDisplayName(null);
        setAvatarUrl(null);
        setLoading(false);
        return;
      }

      const fallbackName =
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        "F1 SOCIAL Üyesi";

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      const nextName = profile?.display_name || fallbackName;
      const nextAvatar = profile?.avatar_url || null;

      cachedHeaderProfile = {
        displayName: nextName,
        avatarUrl: nextAvatar,
      };

      setDisplayName(nextName);
      setAvatarUrl(nextAvatar);
    } catch (error) {
      console.error("HEADER PROFILE ERROR:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void loadProfile(), 0);
    });

    return () => subscription.unsubscribe();
  }, [supabase, loadProfile]);

  useEffect(() => {
    const refresh = () => void loadProfile();

    window.addEventListener("profile-avatar-updated", refresh);
    window.addEventListener("profile-updated", refresh);

    return () => {
      window.removeEventListener("profile-avatar-updated", refresh);
      window.removeEventListener("profile-updated", refresh);
    };
  }, [loadProfile]);

  useEffect(() => {
    const refreshTheme = () => setTheme(detectTheme());
    refreshTheme();

    const observer = new MutationObserver(refreshTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-site-theme", "class"],
    });

    window.addEventListener("storage", refreshTheme);
    window.addEventListener("theme-changed", refreshTheme);
    window.addEventListener("site-theme-changed", refreshTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", refreshTheme);
      window.removeEventListener("theme-changed", refreshTheme);
      window.removeEventListener("site-theme-changed", refreshTheme);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    const onResize = () => {
      if (
        !window.matchMedia(
          "(max-width: 700px), (pointer: coarse) and (max-width: 1100px)"
        ).matches
      ) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const isLight = theme === "light";
  const isRed = theme === "red";

  const logoSrc = isLight
    ? "/f1-social-logo-beyaztema.png"
    : "/logo-beyaz.png";

  const headerBackground = isRed
    ? "linear-gradient(90deg,#b80000 0%,#ed0900 50%,#bd0000 100%)"
    : isLight
      ? "rgba(250,250,252,.97)"
      : "rgba(13,17,23,.97)";

  const textColor = isLight ? "#191d24" : "#ffffff";
  const mutedColor = isLight ? "#68717c" : "#8d98a5";
  const borderColor = isLight
    ? "rgba(0,0,0,.10)"
    : "rgba(255,255,255,.12)";
  const controlBackground = isLight
    ? "rgba(0,0,0,.035)"
    : "rgba(255,255,255,.055)";
  const hoverBackground = isLight
    ? "rgba(0,0,0,.07)"
    : "rgba(255,255,255,.10)";
  const drawerBackground = isRed
    ? "rgba(78,0,0,.98)"
    : isLight
      ? "rgba(250,250,252,.99)"
      : "rgba(13,17,23,.99)";

  return (
    <>
      <style>{`
        .medipol-header,
        .medipol-header * {
          box-sizing: border-box;
        }

        .medipol-header {
          position: sticky;
          top: 0;
          z-index: 1900;
          width: 100%;
          height: 86px;
          display: flex;
          align-items: center;
          color: ${textColor};
          background: ${headerBackground};
          border-bottom: 1px solid ${borderColor};
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .medipol-header-inner {
          width: min(1380px, calc(100% - 32px));
          height: 100%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .medipol-header-logo {
          width: 155px;
          min-width: 120px;
          max-width: 155px;
          flex: 0 1 155px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          text-decoration: none;
        }

        .medipol-header-logo-art {
          display: block;
          width: 100%;
          height: 38px;
          background-repeat: no-repeat;
          background-position: left center;
          background-size: contain;
          pointer-events: none;
        }

        .medipol-header-nav {
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
        }

        .medipol-header-nav-link {
          padding: 11px 7px;
          border-radius: 8px;
          color: ${textColor} !important;
          font-size: 11px;
          font-weight: 650;
          line-height: 1;
          white-space: nowrap;
          text-decoration: none;
          transition: background .15s ease;
        }

        .medipol-header-nav-link:hover {
          background: ${hoverBackground};
        }

        .medipol-header-right {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          min-width: 0;
        }

        .medipol-header-profile {
          min-width: 0;
          width: 155px;
          height: 48px;
          min-height: 48px;
          padding: 5px 10px 5px 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid ${borderColor};
          border-radius: 11px;
          background: ${controlBackground};
          color: ${textColor} !important;
          text-decoration: none;
          transition: background .15s ease;
        }

        .medipol-header-profile:hover {
          background: ${hoverBackground};
        }

        .medipol-header-avatar {
          width: 36px;
          height: 36px;
          min-width: 36px;
          min-height: 36px;
          flex: 0 0 36px;
          overflow: hidden;
          display: grid;
          place-items: center;
          border: 1px solid ${borderColor};
          border-radius: 9px;
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          background: linear-gradient(135deg,#e10600,#ff5149);
        }

        .medipol-header-avatar img {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  object-fit: contain !important;
  object-position: center !important;
  padding: 0 !important;
  margin: 0 !important;
  transform: none !important;
  scale: 1 !important;
  clip-path: none !important;
  border-radius: 0 !important;
  background: #fff;
}

        .medipol-header-profile-name {
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: ${textColor};
          font-size: 11px;
          font-weight: 700;
        }

        .medipol-profile-arrow {
          color: ${mutedColor};
        }

        .medipol-header-profile-loading {
          opacity: .6;
          pointer-events: none;
        }

        .medipol-header-profile-guest {
          width: auto;
          min-width: 96px;
          justify-content: center;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 800;
        }

        .medipol-header-login-icon {
          display: none;
        }

        .medipol-mobile-menu-button {
          display: none;
          width: 40px;
          height: 40px;
          min-width: 40px;
          min-height: 40px;
          flex: 0 0 40px;
          padding: 0;
          align-items: center;
          justify-content: center;
          border: 1px solid ${borderColor};
          border-radius: 10px;
          color: ${textColor};
          background: ${controlBackground};
          cursor: pointer;
        }

        .medipol-hamburger {
          position: relative;
          width: 20px;
          height: 16px;
          display: block;
        }

        .medipol-hamburger span {
          position: absolute;
          left: 0;
          width: 20px;
          height: 2px;
          border-radius: 999px;
          background: ${textColor};
          transition: top .18s ease, transform .18s ease, opacity .18s ease;
        }

        .medipol-hamburger span:nth-child(1) { top: 0; }
        .medipol-hamburger span:nth-child(2) { top: 7px; }
        .medipol-hamburger span:nth-child(3) { top: 14px; }

        .medipol-mobile-menu-button.open .medipol-hamburger span:nth-child(1) {
          top: 7px;
          transform: rotate(45deg);
        }

        .medipol-mobile-menu-button.open .medipol-hamburger span:nth-child(2) {
          opacity: 0;
        }

        .medipol-mobile-menu-button.open .medipol-hamburger span:nth-child(3) {
          top: 7px;
          transform: rotate(-45deg);
        }

        .medipol-landscape-quick {
          display: none;
          align-items: center;
          gap: 7px;
          flex: 0 0 auto;
          min-width: 0;
        }

            .medipol-quick-control {
          position: relative !important;
          isolation: isolate;
          width: 40px !important;
          height: 40px !important;
          min-width: 40px !important;
          min-height: 40px !important;
          max-width: 40px !important;
          max-height: 40px !important;
          flex: 0 0 40px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible;
          border-radius: 10px;
          color: ${textColor};
          background: ${controlBackground};
          box-shadow: inset 0 0 0 1px ${borderColor};
          transition: background .15s ease;
        }

        .medipol-quick-control:hover {
          background: ${hoverBackground};
        }

        .medipol-quick-control > * {
          box-sizing: border-box !important;
          margin: 0 !important;
        }

        .medipol-quick-control > div {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .medipol-quick-control > button,
        .medipol-quick-control > a,
        .medipol-quick-control > div > button:first-child,
        .medipol-quick-control > div > a:first-child {
          position: relative !important;
          inset: auto !important;
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          max-width: none !important;
          max-height: none !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 10px !important;
          color: ${textColor} !important;
          background: transparent !important;
          box-shadow: none !important;
          transform: none !important;
        }

        .medipol-quick-control > button > svg,
        .medipol-quick-control > a > svg,
        .medipol-quick-control > div > button:first-child > svg,
        .medipol-quick-control > div > a:first-child > svg {
          position: static !important;
          display: block !important;
          width: 19px !important;
          height: 19px !important;
          min-width: 19px !important;
          min-height: 19px !important;
          flex: 0 0 19px !important;
          margin: 0 !important;
        }

        .medipol-mobile-drawer {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          padding: 10px;
          border-bottom: 1px solid ${borderColor};
          background: ${drawerBackground};
          box-shadow: 0 18px 35px rgba(0,0,0,.22);
        }

        .medipol-mobile-drawer.open {
          display: block;
        }

        .medipol-mobile-nav {
          width: min(100%, 520px);
          margin: 0 auto;
          padding: 4px;
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 6px;
        }

        .medipol-mobile-nav-link {
          min-width: 0;
          min-height: 46px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid ${borderColor};
          border-radius: 10px;
          background: ${controlBackground};
          color: ${textColor} !important;
          font-size: 12px;
          font-weight: 650;
          text-decoration: none;
        }

        .medipol-mobile-nav-link span:last-child {
          color: ${mutedColor};
        }

        .medipol-mobile-profile-link {
          grid-column: 1 / -1;
          min-height: 54px;
          padding: 7px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid ${borderColor};
          border-radius: 11px;
          background: ${controlBackground};
          color: ${textColor} !important;
          text-decoration: none;
        }

        .medipol-mobile-profile-copy {
          min-width: 0;
          flex: 1;
        }

        .medipol-mobile-profile-copy strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .medipol-mobile-profile-copy span {
          display: block;
          margin-top: 2px;
          color: ${mutedColor};
          font-size: 10px;
        }

        .medipol-mobile-header-spacer {
          display: none;
        }

        @media (max-width: 1250px) and (min-width: 701px) {
          .medipol-header-inner { gap: 8px; }
          .medipol-header-logo {
            width: 125px;
            min-width: 110px;
            flex-basis: 125px;
          }
          .medipol-header-nav-link {
            padding: 9px 5px;
            font-size: 10px;
          }
          .medipol-header-right { gap: 5px; }
          .medipol-header-profile { width: 135px; }
          .medipol-quick-control {
            width: 36px !important;
            height: 36px !important;
            min-width: 36px !important;
            min-height: 36px !important;
            max-width: 36px !important;
            max-height: 36px !important;
            flex-basis: 36px !important;
          }
          .medipol-quick-control:not(.medipol-quick-dm) > button,
          .medipol-quick-control:not(.medipol-quick-dm) > a,
          .medipol-quick-control.medipol-quick-dm > button {
            width: 36px !important;
            height: 36px !important;
            min-width: 36px !important;
            min-height: 36px !important;
            max-width: 36px !important;
            max-height: 36px !important;
            flex-basis: 36px !important;
          }
        }

        @media (max-width: 700px), (pointer: coarse) and (max-width: 1100px) {
          .medipol-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 70px;
            min-height: 70px;
            max-height: 70px;
            transition: transform .22s ease-out;
            will-change: transform;
          }

          .medipol-header[data-scroll-hidden="true"] {
            transform: translate3d(0,-105%,0);
            pointer-events: none;
          }

          .medipol-header-inner {
            width: calc(100% - 16px);
            gap: 6px;
            justify-content: space-between;
          }

          .medipol-header-logo {
            width: clamp(76px,25vw,120px);
            min-width: 76px;
            max-width: 120px;
            flex: 0 1 clamp(76px,25vw,120px);
            height: 56px;
          }

          .medipol-header-logo-art {
            height: 34px;
            max-height: 34px;
          }

          .medipol-header-nav {
            display: none;
          }

          .medipol-header-right {
            flex: 0 0 auto;
            gap: 6px;
            margin-left: auto;
          }

          .medipol-header-right > .medipol-header-profile {
            display: none;
          }

          .medipol-header-right > .medipol-quick-control {
            display: none;
          }

          .medipol-landscape-quick {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            flex: 0 0 auto;
            min-width: 0;
          }

          .medipol-quick-control,
          .medipol-quick-control.medipol-quick-dm {
            width: 38px !important;
            height: 38px !important;
            min-width: 38px !important;
            min-height: 38px !important;
            max-width: 38px !important;
            max-height: 38px !important;
            flex: 0 0 38px !important;
          }

          .medipol-quick-control:not(.medipol-quick-dm) > button,
          .medipol-quick-control:not(.medipol-quick-dm) > a,
          .medipol-quick-control.medipol-quick-dm > button {
            width: 38px !important;
            height: 38px !important;
            min-width: 38px !important;
            min-height: 38px !important;
            max-width: 38px !important;
            max-height: 38px !important;
            flex-basis: 38px !important;
          }

          .medipol-quick-control.medipol-quick-dm > button > svg {
            width: 18px !important;
            height: 18px !important;
            min-width: 18px !important;
            min-height: 18px !important;
            flex-basis: 18px !important;
          }

          .medipol-header-right > .medipol-mobile-menu-button {
            display: flex;
            width: 38px;
            height: 38px;
            min-width: 38px;
            min-height: 38px;
            flex: 0 0 38px;
          }

          .medipol-mobile-drawer {
            position: fixed;
            top: 70px;
            left: 0;
            right: 0;
            max-height: calc(100dvh - 70px - env(safe-area-inset-bottom,0px));
            overflow-y: auto;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
            z-index: 2005;
          }

          .medipol-mobile-header-spacer {
            display: block;
            height: 70px;
            min-height: 70px;
          }
        }

        @media (max-width: 460px) {
          .medipol-mobile-nav { grid-template-columns: 1fr; }
          .medipol-mobile-profile-link { grid-column: auto; }

          .medipol-header-inner {
            width: calc(100% - 12px);
            gap: 4px;
          }

          .medipol-header-logo {
            width: 76px;
            min-width: 76px;
            flex-basis: 76px;
          }

          .medipol-header-right { gap: 5px; }
          .medipol-landscape-quick { gap: 5px; }

          .medipol-quick-control,
          .medipol-quick-control.medipol-quick-dm {
            width: 35px !important;
            height: 35px !important;
            min-width: 35px !important;
            min-height: 35px !important;
            max-width: 35px !important;
            max-height: 35px !important;
            flex-basis: 35px !important;
          }

          .medipol-quick-control:not(.medipol-quick-dm) > button,
          .medipol-quick-control:not(.medipol-quick-dm) > a,
          .medipol-quick-control.medipol-quick-dm > button {
            width: 35px !important;
            height: 35px !important;
            min-width: 35px !important;
            min-height: 35px !important;
            max-width: 35px !important;
            max-height: 35px !important;
            flex-basis: 35px !important;
          }
        }

        @media (max-width: 355px) {
          .medipol-header-inner {
            width: calc(100% - 10px);
            gap: 3px;
          }

          .medipol-header-logo {
            width: 65px;
            min-width: 65px;
            flex-basis: 65px;
          }

          .medipol-header-right { gap: 4px; }
          .medipol-landscape-quick { gap: 4px; }

          .medipol-quick-control,
          .medipol-quick-control.medipol-quick-dm {
            width: 32px !important;
            height: 32px !important;
            min-width: 32px !important;
            min-height: 32px !important;
            max-width: 32px !important;
            max-height: 32px !important;
            flex-basis: 32px !important;
          }

          .medipol-quick-control:not(.medipol-quick-dm) > button,
          .medipol-quick-control:not(.medipol-quick-dm) > a,
          .medipol-quick-control.medipol-quick-dm > button,
          .medipol-header-right > .medipol-mobile-menu-button {
            width: 32px !important;
            height: 32px !important;
            min-width: 32px !important;
            min-height: 32px !important;
            max-width: 32px !important;
            max-height: 32px !important;
            flex-basis: 32px !important;
          }
        }

        @media (pointer: coarse) and (orientation: landscape) and (min-width: 600px) and (max-width: 1100px) {
          .medipol-header-profile {
            display: flex !important;
            width: auto !important;
            max-width: 110px !important;
            min-height: 38px !important;
            height: 38px !important;
            padding: 3px 6px !important;
          }

          .medipol-header-profile-name {
            display: block !important;
            max-width: 66px;
            font-size: 9px;
          }

          .medipol-header-avatar {
            width: 28px;
            height: 28px;
            min-width: 28px;
            min-height: 28px;
            flex-basis: 28px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .medipol-header { transition: none; }
        }
      `
      }</style>

      <header
        className="medipol-header"
        data-scroll-hidden={
          mobileHeaderHidden && !menuOpen ? "true" : "false"
        }
      >
        <div className="medipol-header-inner">
          <Link
            href="/"
            className="medipol-header-logo"
            aria-label="F1 SOCIAL Ana Sayfa"
            onClick={() => setMenuOpen(false)}
          >
            <span
              className="medipol-header-logo-art"
              style={{ backgroundImage: `url("${logoSrc}")` }}
            />
          </Link>

          <nav className="medipol-header-nav" aria-label="Ana navigasyon">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="medipol-header-nav-link"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="medipol-header-right">
            {!compactHeader && (
              <>
                <div className="medipol-quick-control">
                  <HeaderThemeMenu />
                </div>

                <div className="medipol-quick-control">
                  <NotificationBell isLight={isLight} />
                </div>

                <div className="medipol-quick-control medipol-quick-dm">
                  <DmDock isLight={isLight} />
                </div>
              </>
            )}

            {!compactHeader && (
              <div className="medipol-welcome-tour">
                <WelcomeTour />
              </div>
            )}

            {loading ? (
              <span
                className="medipol-header-profile medipol-header-profile-loading"
                aria-label="Profil yükleniyor"
              >
                <span className="medipol-header-avatar" />
                <span className="medipol-header-profile-name">Profil</span>
              </span>
            ) : displayName ? (
              <Link
                href="/profile"
                className="medipol-header-profile"
                onClick={() => setMenuOpen(false)}
                aria-label="Profilim"
              >
                <span
                  className="medipol-header-avatar"
                  style={{
                    background: avatarUrl
                      ? "#ffffff"
                      : "linear-gradient(135deg,#e10600,#ff5149)",
                  }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </span>

                <span className="medipol-header-profile-name">
                  {displayName}
                </span>

                <span className="medipol-profile-arrow" aria-hidden="true">
                  ›
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="medipol-header-profile medipol-header-profile-guest"
                onClick={() => setMenuOpen(false)}
                aria-label="Giriş yap"
              >
                <span className="medipol-header-login-label">Giriş Yap</span>
                <svg
                  className="medipol-header-login-icon"
                  viewBox="0 0 24 24"
                  width="21"
                  height="21"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
              </Link>
            )}

            {compactHeader && (
              <div
                className="medipol-landscape-quick"
                aria-label="Hızlı işlemler"
              >
                <div className="medipol-quick-control">
                  <HeaderThemeMenu />
                </div>

                <div className="medipol-quick-control">
                  <NotificationBell isLight={isLight} />
                </div>

                <div className="medipol-quick-control medipol-quick-dm">
                  <DmDock isLight={isLight} />
                </div>
              </div>
            )}

            <button
              type="button"
              className={[
                "medipol-mobile-menu-button",
                menuOpen ? "open" : "",
              ].join(" ")}
              aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
            >
              <span className="medipol-hamburger" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>

        <div className={`medipol-mobile-drawer ${menuOpen ? "open" : ""}`}>
          <nav className="medipol-mobile-nav" aria-label="Mobil navigasyon">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="medipol-mobile-nav-link"
                onClick={() => setMenuOpen(false)}
              >
                <span>{item.label}</span>
                <span aria-hidden="true">→</span>
              </Link>
            ))}

            {!loading && displayName && (
              <Link
                href="/profile"
                className="medipol-mobile-profile-link"
                onClick={() => setMenuOpen(false)}
              >
                <span
                  className="medipol-header-avatar"
                  style={{
                    background: avatarUrl
                      ? "#ffffff"
                      : "linear-gradient(135deg,#e10600,#ff5149)",
                  }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </span>

                <span className="medipol-mobile-profile-copy">
                  <strong>{displayName}</strong>
                  <span>Profilini görüntüle</span>
                </span>
              </Link>
            )}

            {!loading && !displayName && (
              <Link
                href="/login"
                className="medipol-mobile-profile-link"
                onClick={() => setMenuOpen(false)}
              >
                <span className="medipol-mobile-profile-copy">
                  <strong>Giriş Yap</strong>
                  <span>Hesabına giriş yap</span>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="medipol-mobile-header-spacer" aria-hidden="true" />
    </>
  );
}