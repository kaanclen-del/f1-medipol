
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
  arcade: {
    key: "arcade",
    title: "OYUN MERKEZİNE GİRİLİYOR",
    caption: "CHOOSE YOUR GAME",
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
  paddock: {
    key: "paddock",
    title: "PADDOCK TOPLULUĞU AÇILIYOR",
    caption: "JOIN THE CONVERSATION",
  },
};

const INTRO: TransitionInfo = {
  key: "intro",
  title: "YARIŞ DÜNYANA HOŞ GELDİN",
  caption: "F1 SOCIAL · RACE · CONNECT · PLAY",
};

function getTransition(path: string): TransitionInfo | null {
  for (const [route, info] of Object.entries(ROUTES)) {
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

  // Giriş ekranı: load olayını beklemeden kesin olarak kapanır.
  useEffect(() => {
    setTransition(INTRO);
    setVisible(true);

    introTimer.current = setTimeout(() => {
      setVisible(false);
      introTimer.current = null;
    }, 1500);

    return () => {
      clearIntroTimer();
    };
  }, [clearIntroTimer]);

  // Yalnızca Arcade, Canlı, Tahmin ve Paddock geçişleri.
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
      setVisible(true);

      navigationTimer.current = setTimeout(() => {
        setVisible(false);
        pendingPath.current = null;
        navigationTimer.current = null;
      }, 5000);
    }

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [pathname, clearNavigationTimer, clearIntroTimer]);

  // Hedef sayfa açılınca geçişi kapat.
  useEffect(() => {
    if (previousPath.current === pathname) return;

    previousPath.current = pathname;

    if (pendingPath.current === pathname) {
      const info = getTransition(pathname);
      if (info) setTransition(info);

      closeNavigation(250);
      return;
    }

    pendingPath.current = null;
    clearNavigationTimer();
    setVisible(false);
  }, [pathname, closeNavigation, clearNavigationTimer]);

  // Overlay açıkken arka plan kaymasını engelle.
  useEffect(() => {
    if (!visible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

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
        <img
          className={styles.logo}
          src="/f1-social-transition-logo.png"
          alt="F1 SOCIAL"
        />

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
