import Header from "@/components/Header";
import Link from "next/link";
import styles from "./arcade.module.css";

type Game = {
  id: "manager" | "whatif" | "rush" | "timing";
  title: string;
  description: string;
  href: string;
  cta: string;
};

const games: Game[] = [
  {
    id: "manager",
    title: "Manager",
    description:
      "Takımını kur, pilotlarını yönet ve yarış hafta sonuna stratejinle yön ver.",
    href: "/arcade/manager",
    cta: "MANAGER'I AÇ",
  },
  {
    id: "whatif",
    title: "What If?",
    description:
      "Sonuçları değiştir, pilot puanlarını yeniden hesapla ve alternatif şampiyonayı gör.",
    href: "/arcade/what-if",
    cta: "SENARYO OLUŞTUR",
  },
  {
    id: "rush",
    title: "Kart Rush 3D",
    description:
      "Formula aracını seç, arkadaşlarınla lobiye katıl ve özel güçlerle yarış.",
    href: "/arcade/kart-rush",
    cta: "YARIŞA GİR",
  },
  {
    id: "timing",
    title: "Go-Kart Timing",
    description:
      "Sürücüleri ekle, turları kronometreyle veya elle kaydet, ceza uygula ve sıralamayı çıkar.",
    href: "/arcade/gokart-zamanlama",
    cta: "ZAMAN MERKEZİNİ AÇ",
  },
];

export default function ArcadePage() {
  return (
    <>
      <Header />

      <main className={styles.page}>
        <div className={styles.backdrop} aria-hidden="true" />

        <div className={styles.container}>
          <section className={styles.hero} aria-label="Arcade oyun merkezi">
            <div className={styles.heroDecor} aria-hidden="true">
              <i />
              <i />
              <i />
            </div>

            <div className={styles.heroCenter}>
              <span className={styles.heroEyebrow}>OYUN MERKEZİ</span>
              <h1>
                OYUN <em>BAŞLASIN.</em>
              </h1>
              <p>
                Yönetim, simülasyon, yarış ve gerçek pist zamanlaması.
              </p>
            </div>
          </section>

          <section
            className={styles.games}
            aria-label="Arcade oyun seçenekleri"
          >
            {games.map((game) => (
              <article
                className={`${styles.card} ${styles[game.id]}`}
                key={game.id}
              >
                <div className={styles.visual} aria-hidden="true">
                  {game.id === "manager" && (
                    <div className={styles.managerGraphic}>
                      <div className={styles.telemetry}>
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className={styles.timingLines}>
                        <b />
                        <b />
                        <b />
                      </div>
                      <div className={styles.managerScreen}>
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                  )}

                  {game.id === "whatif" && (
                    <div className={styles.whatifGraphic}>
                      <div className={styles.question}>?</div>
                      <div className={styles.orbit} />
                      <span className={styles.sparkOne} />
                      <span className={styles.sparkTwo} />
                    </div>
                  )}

                  {game.id === "rush" && (
                    <div className={styles.rushGraphic}>
                      <div className={styles.rushTrack} />
                      <div className={styles.speedRing} />
                      <div className={styles.rushGlow} />
                      <div className={styles.carShape}>
                        <span />
                        <span />
                        <i />
                      </div>
                      <div className={styles.roadLine} />
                      <div className={styles.rushSpeedLine} />
                    </div>
                  )}

                  {game.id === "timing" && (
                    <div className={styles.timingGraphic}>
                      <div className={styles.stopwatchCircle}>
                        <span>01:24</span>
                        <small>.638</small>
                      </div>
                      <div className={styles.timingList}>
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.cardContent}>
                  <h3>{game.title}</h3>
                  <p>{game.description}</p>
                </div>

                <Link className={styles.cardLink} href={game.href}>
                  <span>{game.cta}</span>
                  <span aria-hidden="true">↗</span>
                </Link>
              </article>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
