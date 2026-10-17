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
    description: "Takımını kur, yarış hafta sonunu yönet, strateji kararları al ve arkadaşlarınla rekabet et.",
    href: "/arcade/manager",
    cta: "MANAGER'I AÇ",
    icon: "🏁",
    accent: "#ff4d67",
    accentSoft: "rgba(255, 77, 103, 0.24)",
    tags: ["Lobi", "Takım Yönetimi", "Sezon"],
    bullets: ["Takım kur ve pilot dizilimini yönet", "Lobi mantığı ile çok oyunculu deneyim", "Yarış stratejisi ve sezon akışı"],
  },
  {
    id: "what-if",
    index: "02",
    label: "ALTERNATİF EVREN",
    title: "What If?",
    description: "Ya bu Grand Prix’yi başka bir pilot kazansaydı? Sıralamayı değiştir ve şampiyonayı simüle et.",
    href: "/arcade/what-if",
    cta: "WHAT IF OYNA",
    icon: "⚡",
    accent: "#ffb34d",
    accentSoft: "rgba(255, 179, 77, 0.22)",
    tags: ["Finiş Sırası", "Pilot Puanları", "Takımlar"],
    bullets: ["Alternatif sonuçlar oluştur", "Puan tablosunu yeniden hesapla", "Farklı senaryoları karşılaştır"],
  },
  {
    id: "kart-rush",
    index: "03",
    label: "3D MULTIPLAYER",
    title: "Kart Rush 3D",
    description: "Arkadaşlarınla lobi kur, 3D pistte kapış. Turbo, kalkan ve özel güçlerle rekabeti artır.",
    href: "/arcade/kart-rush",
    cta: "KART RUSH OYNA",
    icon: "🏎️",
    accent: "#75baff",
    accentSoft: "rgba(108, 183, 255, 0.24)",
    tags: ["3D Yarış", "Lobi", "Özel Güçler"],
    bullets: ["Manuel gaz, fren ve direksiyon", "Arkadaşlarla çevrim içi lobi", "Altı özel güç, 22 araçlık grid"],
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
              <p className={styles.eyebrow}>F1 MEDİPOL · OYUN MERKEZİ</p>
              <div className={styles.titleWrap}>
                <h1 className={styles.title}>F1 <em>Arcade</em></h1>
                <div className={styles.titleGlow} aria-hidden="true" />
              </div>
              <p className={styles.lead}>
                Stratejini konuştur, sonuçları yeniden yaz veya arkadaşlarınla pistte kapış.
                F1 Medipol'ün üç farklı oyun deneyimi tek merkezde.
              </p>

              <div className={styles.heroWideBanner}>
                <div className={styles.raceLines} aria-hidden="true"><span /><span /><span /><span /><span /></div>
                <div className={styles.bannerMain}>
                  <span>YOUR GRID. YOUR RULES.</span>
                  <h2>
                    OYUN <b>BAŞLASIN.</b>
                  </h2>
                  <p>Yönetim, simülasyon ve yarış. Seçim senin.</p>
                </div>
              </div>
            </div>
          </section>

          <div className={styles.sectionHeading}>
            <div>
              <small>OYUN KÜTÜPHANESİ</small>
              <h2>Yarış dünyasını seç</h2>
            </div>
            <span>03 OYUN</span>
          </div>

          <section className={styles.cardGrid} aria-label="Arcade oyunları">
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
                <div className={styles.cardBottom}><Link href={game.href} className={styles.cardCta}><span>{game.cta}</span><i aria-hidden="true">↗</i></Link></div>
              </article>
            ))}
          </section>

          <div className={styles.footerNote}><span>F1 MEDİPOL / ARCADE</span><span>TAKIMINI KUR · SENARYONU YAZ · PİSTE ÇIK</span></div>
        </div>
      </main>
    </>
  );
}
