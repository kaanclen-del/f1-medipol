"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./HomeArcadeCarousel.module.css";

const games = [
  {
    title: "F1 Manager",
    description: "Takımını yönet, pilot transferlerini planla ve pit wall kararlarını sen ver.",
    href: "/arcade/manager",
    theme: "manager",
    action: "MANAGER'I AÇ",
  },
  {
    title: "What If",
    description: "Alternatif finiş sıraları kur ve şampiyona senaryolarını karşılaştır.",
    href: "/arcade/what-if",
    theme: "whatif",
    action: "SENARYO OLUŞTUR",
  },
  {
    title: "Kart Rush 3D",
    description: "3D pistte sür, rakiplerine karşı yarış ve hızlı aksiyona katıl.",
    href: "/arcade/kart-rush",
    theme: "rush",
    action: "YARIŞA GİR",
  },
  {
    title: "Go-Kart Zamanlama",
    description: "Karting turlarını kaydet, sürücüleri karşılaştır ve sıralamayı takip et.",
    href: "/arcade/gokart-zamanlama",
    theme: "timing",
    action: "ZAMAN MERKEZİNİ AÇ",
  },
  {
    title: "MCOLD Grand Prix",
    description: "Piste çık, motorları çalıştır ve Grand Prix mücadelesine katıl.",
    href: "/arcade/mcold-grand-prix",
    theme: "mcold",
    action: "OYUNU OYNA",
  },
];

export default function HomeArcadeCarousel() {
  const [active, setActive] = useState(0);
  const game = games[active];

  function move(step: number) {
    setActive((current) => (current + step + games.length) % games.length);
  }

  return (
    <section className={styles.carousel} aria-label="F1 Arcade oyun seçici">
      <div className={styles.header}>
        <span className={styles.eyebrow}>F1 SOCIAL · ARCADE</span>
        <span className={styles.count}>
          <strong>{String(active + 1).padStart(2, "0")}</strong>
          {" / "}{String(games.length).padStart(2, "0")}
        </span>
      </div>

      <div className={styles.stage}>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => move(-1)}
          aria-label="Önceki oyun"
        >
          ‹
        </button>

        <Link
          key={game.href}
          href={game.href}
          className={`${styles.gameCard} ${styles[game.theme]}`}
          aria-live="polite"
        >
          <span className={styles.number}>
            OYUN {String(active + 1).padStart(2, "0")}
          </span>
          <span className={styles.content}>
            <span className={styles.title}>{game.title}</span>
            <span className={styles.description}>{game.description}</span>
            <span className={styles.action}>
              {game.action} <span aria-hidden="true">↗</span>
            </span>
          </span>
          <span className={styles.watermark} aria-hidden="true">
            {String(active + 1).padStart(2, "0")}
          </span>
        </Link>

        <button
          type="button"
          className={styles.arrow}
          onClick={() => move(1)}
          aria-label="Sonraki oyun"
        >
          ›
        </button>
      </div>

      <div className={styles.footer}>
        <div className={styles.dots} aria-label="Oyunu seç">
          {games.map((item, index) => (
            <button
              key={item.href}
              type="button"
              onClick={() => setActive(index)}
              className={index === active ? styles.activeDot : styles.dot}
              aria-label={`${index + 1}. oyun: ${item.title}`}
              aria-current={index === active ? "true" : undefined}
            />
          ))}
        </div>
        <span className={styles.hint}>OKLARLA OYUNLAR ARASINDA GEÇİŞ YAP</span>
      </div>
    </section>
  );
}
