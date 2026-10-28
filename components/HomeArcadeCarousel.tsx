"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./HomeArcadeCarousel.module.css";

const games = [
  {
    title: "F1 Manager",
    href: "/arcade/manager",
    theme: "manager",
  },
  {
    title: "What If",
    href: "/arcade/what-if",
    theme: "whatif",
  },
  {
    title: "Kart Rush 3D",
    href: "/arcade/kart-rush",
    theme: "rush",
  },
  {
    title: "Go-Kart Zamanlama",
    href: "/arcade/gokart-zamanlama",
    theme: "timing",
  },
  {
    title: "MCOLD Grand Prix",
    href: "/arcade/mcold-grand-prix",
    theme: "mcold",
  },
] as const;

export default function HomeArcadeCarousel() {
  const [active, setActive] = useState(0);
  const [backgrounds, setBackgrounds] = useState<Record<string, string>>({});
  const game = games[active];

  useEffect(() => {
    let cancelled = false;

    fetch("/api/arcade-game-backgrounds", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((result) => {
        if (cancelled || !result?.ok) return;

        const next: Record<string, string> = {};

        for (const item of result.backgrounds ?? []) {
          if (
            typeof item.game_id === "string" &&
            typeof item.image_url === "string"
          ) {
            next[item.game_id] = item.image_url;
          }
        }

        setBackgrounds(next);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  function move(step: number) {
    setActive((current) => (current + step + games.length) % games.length);
  }

  const backgroundImage = backgrounds[game.theme];

  return (
    <section
      className={styles.carousel}
      aria-label="F1 Social oyun seçici"
    >
      <div className={styles.stage}>
        <div
          key={game.href}
          className={`${styles.gameCard} ${styles[game.theme]}`}
          style={
            backgroundImage
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(5,8,13,.52) 0%, rgba(5,8,13,.18) 42%, rgba(5,8,13,.4) 100%), url("${backgroundImage}")`,
                }
              : undefined
          }
          aria-live="polite"
        >
          <h2 className={styles.title}>{game.title}</h2>

          <div className={styles.centerContent}>
            <Link href={game.href} className={styles.action}>
              OYUNU OYNA
              <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowLeft}`}
            onClick={() => move(-1)}
            aria-label="Önceki oyun"
          >
            ‹
          </button>

          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowRight}`}
            onClick={() => move(1)}
            aria-label="Sonraki oyun"
          >
            ›
          </button>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.dots} aria-label="Oyunu seç">
          {games.map((item, index) => (
            <button
              key={item.href}
              type="button"
              onClick={() => setActive(index)}
              className={
                index === active ? styles.activeDot : styles.dot
              }
              aria-label={`${index + 1}. oyun: ${item.title}`}
              aria-current={index === active ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
