import Header from "@/components/Header";
import Link from "next/link";
import type { CSSProperties } from "react";
import styles from "./arcade.module.css";

type ArcadeGame = {
  id: "manager" | "what-if" | "kart-rush";
  index: string;
  label: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: string;
  accent: string;
  accentSoft: string;
  tags: string[];
  bullets: string[];
};

const games: ArcadeGame[] = [
  {
    id: "manager",
    index: "01",
    label: "MANAGER CAREER",
    title: "F1 Manager",
    description: "TakÄ±mÄ±nÄ± kur, yarÄ±ÅŸ hafta sonunu yÃ¶net, strateji kararlarÄ± al ve arkadaÅŸlarÄ±nla rekabet et.",
    href: "/arcade/manager",
    cta: "MANAGER'I AÃ‡",
    icon: "ğŸ",
    accent: "#ff4d67",
    accentSoft: "rgba(255, 77, 103, 0.24)",
    tags: ["Lobi", "TakÄ±m YÃ¶netimi", "Sezon"],
    bullets: ["TakÄ±m kur ve pilot dizilimini yÃ¶net", "Lobi mantÄ±ÄŸÄ± ile Ã§ok oyunculu deneyim", "YarÄ±ÅŸ stratejisi ve sezon akÄ±ÅŸÄ±"],
  },
  {
    id: "what-if",
    index: "02",
    label: "ALTERNATÄ°F EVREN",
    title: "What If?",
    description: "Ya bu Grand Prixâ€™yi baÅŸka bir pilot kazansaydÄ±? SÄ±ralamayÄ± deÄŸiÅŸtir ve ÅŸampiyonayÄ± simÃ¼le et.",
    href: "/arcade/what-if",
    cta: "WHAT IF OYNA",
    icon: "âš¡",
    accent: "#ffb34d",
    accentSoft: "rgba(255, 179, 77, 0.22)",
    tags: ["FiniÅŸ SÄ±rasÄ±", "Pilot PuanlarÄ±", "TakÄ±mlar"],
    bullets: ["Alternatif sonuÃ§lar oluÅŸtur", "Puan tablosunu yeniden hesapla", "FarklÄ± senaryolarÄ± karÅŸÄ±laÅŸtÄ±r"],
  },
  {
    id: "kart-rush",
    index: "03",
    label: "3D MULTIPLAYER",
    title: "Kart Rush 3D",
    description: "ArkadaÅŸlarÄ±nla lobi kur, 3D pistte kapÄ±ÅŸ. Turbo, kalkan ve Ã¶zel gÃ¼Ã§lerle rekabeti artÄ±r.",
    href: "/arcade/kart-rush",
    cta: "KART RUSH OYNA",
    icon: "ğŸï¸",
    accent: "#75baff",
    accentSoft: "rgba(108, 183, 255, 0.24)",
    tags: ["3D YarÄ±ÅŸ", "Lobi", "Ã–zel GÃ¼Ã§ler"],
    bullets: ["Manuel gaz, fren ve direksiyon", "ArkadaÅŸlarla Ã§evrim iÃ§i lobi", "AltÄ± Ã¶zel gÃ¼Ã§, 22 araÃ§lÄ±k grid"],
  },
];

export default function ArcadePage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
      <div className={styles.ambientOne} aria-hidden="true" />
      <div className={styles.ambientTwo} aria-hidden="true" />
      <div className={styles.gridOverlay} aria-hidden="true" />

      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>F1 MEDÄ°POL Â· OYUN MERKEZÄ°</p>
            <div className={styles.titleWrap}>
              <h1 className={styles.title}>F1 <em>Arcade</em></h1>
              <div className={styles.titleGlow} aria-hidden="true" />
            </div>
            <p className={styles.lead}>
              Stratejini konuÅŸtur, sonuÃ§larÄ± yeniden yaz veya arkadaÅŸlarÄ±nla pistte kapÄ±ÅŸ.
              F1 SOCIAL'Ã¼n Ã¼Ã§ farklÄ± oyun deneyimi tek merkezde.
            </p>
            <div className={styles.heroStats}>
              <div className={styles.statBox}><strong>03</strong><span>OYUN DENEYÄ°MÄ°</span></div>
              <div className={styles.statBox}><strong>3D</strong><span>YARIÅ DENEYÄ°MÄ°</span></div>
              <div className={styles.statBox}><strong>F1</strong><span>MEDÄ°POL ARCADE</span></div>
            </div>
          </div>
          <div className={styles.heroSide}>
            <div className={styles.heroPanel}>
              <div className={styles.heroPanelTop}><span className={styles.heroPanelKicker}>RACE WEEKEND</span><span className={styles.heroSpark}>âœ¦</span></div>
              <div className={styles.raceLines} aria-hidden="true"><span /><span /><span /><span /><span /></div>
              <div className={styles.heroPanelBottom}>
                <span>YOUR GRID. YOUR RULES.</span>
                <h2>OYUN<br /><b>BAÅLASIN.</b></h2>
                <p>YÃ¶netim, simÃ¼lasyon ve yarÄ±ÅŸ. SeÃ§im senin.</p>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.sectionHeading}><div><small>OYUN KÃœTÃœPHANESÄ°</small><h2>YarÄ±ÅŸ dÃ¼nyasÄ±nÄ± seÃ§</h2></div><span>03 OYUN</span></div>
        <section className={styles.cardGrid} aria-label="Arcade oyunlarÄ±">
          {games.map((game) => (
            <article
              key={game.id}
              className={`${styles.card} ${styles[game.id === "what-if" ? "whatIfCard" : game.id === "kart-rush" ? "kartCard" : "managerCard"]}`}
              style={{ "--accent": game.accent, "--accent-soft": game.accentSoft } as CSSProperties}
            >
              <div className={styles.cardGlow} aria-hidden="true" />
              <div className={styles.cardNoise} aria-hidden="true" />
              <div className={styles.cardTop}><p className={styles.cardLabel}>{game.index} / {game.label}</p><span className={styles.cardIcon} aria-hidden="true">{game.icon}</span></div>
              <div className={styles.gameVisual} aria-hidden="true">
                {game.id === "manager" && <div className={styles.managerVisual}><span className={styles.mgrLine} /><span className={styles.mgrLine} /><span className={styles.mgrLine} /><span className={styles.mgrDot} /><div className={styles.mgrTower}><i /><i /><i /><i /></div></div>}
                {game.id === "what-if" && <div className={styles.whatIfVisual}><span>?</span><div className={styles.whatIfOrbit}><i /><i /><i /></div></div>}
                {game.id === "kart-rush" && <div className={styles.kartVisual}><div className={styles.kartRoad} /><div className={styles.kartCar}><span /><span /><i /></div><div className={styles.kartSpeed} /></div>}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{game.title}</h3>
                <p className={styles.cardDescription}>{game.description}</p>
                <div className={styles.tagRow}>{game.tags.map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}</div>
                <ul className={styles.bulletList}>{game.bullets.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div className={styles.cardBottom}><Link href={game.href} className={styles.cardCta}><span>{game.cta}</span><i aria-hidden="true">â†—</i></Link></div>
            </article>
          ))}
        </section>
        <div className={styles.footerNote}><span>F1 MEDÄ°POL / ARCADE</span><span>TAKIMINI KUR Â· SENARYONU YAZ Â· PÄ°STE Ã‡IK</span></div>
      </div>
    </main>
    </>
  );
}

