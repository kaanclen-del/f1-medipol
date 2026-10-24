"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./RouteTransition.module.css";

type TransitionInfo = {
  key: string;
  title: string;
  caption: string;
};

const ROUTES: Record<string, TransitionInfo> = {
  home: {
    key: "home",
    title: "PİST SENİ BEKLİYOR",
    caption: "F1 SOCIAL · RACE · CONNECT · PLAY",
  },
  profile: {
    key: "profile",
    title: "PİST ÜSTÜ KİMLİĞİN HAZIRLANIYOR",
    caption: "YOUR PROFILE · YOUR STORY",
  },
  live: {
    key: "live",
    title: "CANLI YAYIN MERKEZİ",
    caption: "LIVE TIMING · LIVE ACTION",
  },
  predict: {
    key: "predict",
    title: "TAHMİN GRİDİ HAZIRLANIYOR",
    caption: "MAKE YOUR CALL",
  },
  member: {
    key: "member",
    title: "ÜYE PROFİLİ HAZIRLANIYOR",
    caption: "F1 SOCIAL · YOUR PROFILE · YOUR STORY",
  },
  paddock: {
    key: "paddock",
    title: "PADDOCK HAZIRLANIYOR",
    caption: "F1 SOCIAL · COMMUNITY · CONNECT",
  },
};

const INTRO: TransitionInfo = {
  key: "intro",
  title: "YARIŞ DÜNYANA HOŞ GELDİN",
  caption: "F1 SOCIAL · RACE · CONNECT · PLAY",
};

function getTransition(path: string): TransitionInfo | null {
  if (path === "/") return ROUTES.home;

  if (path === "/members" || path.startsWith("/members/")) {
    return ROUTES.member;
  }

  for (const [route, info] of Object.entries(ROUTES)) {
    if (route === "home" || route === "member") continue;

    if (path === `/${route}` || path.startsWith(`/${route}/`)) {
      return info;
    }
  }

  return null;
}

function getDestination(url: string): string | null {
  try {
    const parsed = new URL(url, window.location.origin);

    if (parsed.origin !== window.location.origin) return null;
    if (!getTransition(parsed.pathname)) return null;

    return parsed.pathname;
  } catch {
    return null;
  }
}

export default function RouteTransition() {
  const pathname = usePathname();

  const previousPath = useRef(pathname);
  const pendingPath = useRef<string | null>(null);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [visible, setVisible] = useState(true);
  const [transition, setTransition] = useState<TransitionInfo>(INTRO);
  const [logoFailed, setLogoFailed] = useState(false);

  const clearNavigationTimer = useCallback(() => {
    if (navigationTimer.current !== null) {
      clearTimeout(navigationTimer.current);
      navigationTimer.current = null;
    }
  }, []);

  const clearIntroTimer = useCallback(() => {
    if (introTimer.current !== null) {
      clearTimeout(introTimer.current);
      introTimer.current = null;
    }
  }, []);

  const closeNavigation = useCallback(
    (delay = 0) => {
      clearNavigationTimer();

      navigationTimer.current = setTimeout(() => {
        setVisible(false);
        pendingPath.current = null;
        navigationTimer.current = null;
      }, delay);
    },
    [clearNavigationTimer],
  );

  // İlk açılış animasyonu.
  useEffect(() => {
    setTransition(INTRO);
    setLogoFailed(false);
    setVisible(true);

    introTimer.current = setTimeout(() => {
      setVisible(false);
      introTimer.current = null;
    }, 1500);

    return () => clearIntroTimer();
  }, [clearIntroTimer]);

  // Site içi bağlantılarda geçiş ekranını aç.
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("aria-disabled") === "true"
      ) {
        return;
      }

      const destination = getDestination(anchor.href);
      if (!destination || destination === pathname) return;

      const info = getTransition(destination);
      if (!info) return;

      clearNavigationTimer();
      clearIntroTimer();

      pendingPath.current = destination;
      setTransition(info);
      setLogoFailed(false);
      setVisible(true);

      // Paddock'ta geçiş ekranı kısa sürede kapanır.
      // Canlı yayın için mevcut 45 saniyelik süre korunur.
      const timeout =
        info.key === "live"
          ? 45000
          : info.key === "paddock"
            ? 1500
            : 12000;

      navigationTimer.current = setTimeout(() => {
        setVisible(false);
        pendingPath.current = null;
        navigationTimer.current = null;
      }, timeout);
    }

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [pathname, clearNavigationTimer, clearIntroTimer]);

  // URL değiştiğinde hedef sayfanın geçişini tamamla.
  useEffect(() => {
    if (previousPath.current === pathname) return;

    previousPath.current = pathname;

    if (pendingPath.current === pathname) {
      const info = getTransition(pathname);

      if (info) setTransition(info);

      // Canlı yayın hazır sinyalini beklemeye devam eder.
      if (info?.key === "live") return;

      // Paddock dahil normal sayfalarda geçiş ekranını kapat.
      closeNavigation(info?.key === "paddock" ? 100 : 250);
      return;
    }

    pendingPath.current = null;
    clearNavigationTimer();
    setVisible(false);
  }, [pathname, closeNavigation, clearNavigationTimer]);

  // Canlı yayın hazır olduğunda geçiş ekranını kapat.
  useEffect(() => {
    function handleLiveReady() {
      if (pendingPath.current !== "/live") return;
      closeNavigation(250);
    }

    window.addEventListener("f1-live-content-ready", handleLiveReady);

    return () => {
      window.removeEventListener("f1-live-content-ready", handleLiveReady);
    };
  }, [closeNavigation]);

  // Geçiş sırasında arka plan kaymasını engelle.
  useEffect(() => {
    if (!visible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  // Zamanlayıcı temizliği.
  useEffect(() => {
    return () => {
      clearNavigationTimer();
      clearIntroTimer();
    };
  }, [clearNavigationTimer, clearIntroTimer]);

  if (!visible) return null;

  return (
    <div
      className={`${styles.overlay} ${styles[transition.key] ?? ""}`}
      role="status"
      aria-label={transition.title}
      aria-live="polite"
    >
      <div className={styles.track} aria-hidden="true">
        <span className={styles.trackLine} />
        <span className={styles.trackLineSecondary} />
        <span className={styles.trackRunner} />
        <span className={styles.startLights}>● ● ● ● ●</span>
      </div>

      <div className={styles.center}>
        {!logoFailed ? (
          <img
            className={styles.logo}
            src="/f1-social-transition-logo.png"
            alt="F1 SOCIAL"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <div className={styles.logoFallback} aria-label="F1 SOCIAL">
            <span>F1</span> SOCIAL
          </div>
        )}

        <div className={styles.loadingLine} aria-hidden="true">
          <span />
        </div>

        <h2 className={styles.title}>{transition.title}</h2>
        <p className={styles.caption}>{transition.caption}</p>
      </div>

      <div className={styles.footer} aria-hidden="true">
        <span>F1 SOCIAL</span>
        <span>RACE · CONNECT · PLAY</span>
      </div>
    </div>
  );
}