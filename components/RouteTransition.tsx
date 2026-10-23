"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import styles from "./RouteTransition.module.css";

const TRANSITION_ROUTES = ["/arcade", "/live", "/predict", "/paddock"];

function isTransitionRoute(pathname: string) {
  return TRANSITION_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default function RouteTransition() {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [kind, setKind] = useState<"intro" | "route">("intro");

  useEffect(() => {
    const storageKey = "f1-social-intro-seen";
    const hasSeenIntro = window.sessionStorage.getItem(storageKey) === "1";

    if (previousPath.current === null) {
      previousPath.current = pathname;

      if (hasSeenIntro) {
        setVisible(false);
        return;
      }

      window.sessionStorage.setItem(storageKey, "1");
      setKind("intro");
      setVisible(true);

      const finishIntro = () => setVisible(false);

      if (document.readyState === "complete") {
        finishIntro();
      } else {
        window.addEventListener("load", finishIntro, { once: true });
      }

      return () => {
        window.removeEventListener("load", finishIntro);
      };
    }

    if (previousPath.current === pathname) return;

    const previousPathname = previousPath.current;
    previousPath.current = pathname;

    const enteringTarget = isTransitionRoute(pathname);
    const leavingTarget = isTransitionRoute(previousPathname);

    if (!enteringTarget || leavingTarget) return;

    setKind("route");
    setVisible(true);

    let secondFrame = 0;

    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setVisible(false);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [pathname]);

  useEffect(() => {
    if (!visible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`${styles.overlay} ${
        kind === "intro" ? styles.intro : styles.route
      }`}
      role="status"
      aria-label="F1 SOCIAL yükleniyor"
      aria-live="polite"
    >
      <div className={styles.track} aria-hidden="true">
        <div className={styles.trackLine} />
        <div className={styles.trackLineSecondary} />
        <div className={styles.trackRunner} />
      </div>

      <div className={styles.center}>
        <img
          className={styles.logo}
          src="/f1-social-logo.png"
          alt="F1 SOCIAL"
        />

        <div className={styles.loadingLine} aria-hidden="true">
          <span />
        </div>

        <p className={styles.caption}>
          {kind === "intro" ? "PADDOCK'A HAZIRLAN" : "GRID'E GİRİLİYOR"}
        </p>
      </div>

      <div className={styles.footer} aria-hidden="true">
        <span>F1 SOCIAL</span>
        <span>RACE · CONNECT · PLAY</span>
      </div>
    </div>
  );
}
