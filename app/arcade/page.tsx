
import Header from "@/components/Header";
import Link from "next/link";
import styles from "./arcade.module.css";

type Game = {
  id: "manager" | "whatif" | "rush" | "timing" | "mcold";
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
  {
    id: "mcold",
    title: "MCOLD Grand Prix",
    description:
      "Motorları çalıştır, piste çık ve Grand Prix mücadelesine katıl.",
    href: "/arcade/mcold-grand-prix",
    cta: "YARIŞA BAŞLA",
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
                className={`${styles.card} ${
                  game.id === "mcold" ? "" : styles[game.id]
                }`}
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

                  {game.id === "mcold" && (
                    <div
                      style={{
                        position: "relative",
                        minHeight: 190,
                        height: "100%",
                        width: "100%",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        background:
                          "radial-gradient(ellipse at 80% 100%, #700800 0%, transparent 55%), linear-gradient(135deg, #242424, #080808 72%)",
                        color: "#fff",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          width: 230,
                          height: 100,
                          right: -45,
                          top: 25,
                          border: "10px solid rgba(255,255,255,.08)",
                          borderRadius: "50%",
                          transform: "rotate(-30deg)",
                        }}
                      />

                      <div
                        style={{
                          position: "absolute",
                          inset: "auto 0 24px",
                          height: 2,
                          background:
                            "linear-gradient(90deg, transparent, #e10600, transparent)",
                        }}
                      />

                      <div
                        style={{
                          position: "relative",
                          zIndex: 1,
                          padding: "22px",
                        }}
                      >
                        <div
                          style={{
                            color: "#ff3028",
                            fontSize: 11,
                            fontWeight: 900,
                            letterSpacing: 4,
                            marginBottom: 8,
                          }}
                        >
                          MCOLD
                        </div>

                        <div
                          style={{
                            fontSize: "clamp(21px, 3vw, 32px)",
                            fontWeight: 950,
                            fontStyle: "italic",
                            lineHeight: 1,
                            letterSpacing: -1,
                          }}
                        >
                          GRAND PRIX
                        </div>

                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 9,
                            color: "#c7c7c7",
                            fontWeight: 700,
                            letterSpacing: 3,
                          }}
                        >
                          READY TO RACE
                        </div>
                      </div>

                      <div
                        style={{
                          position: "absolute",
                          right: 25,
                          bottom: 35,
                          width: 100,
                          height: 24,
                          background:
                            "linear-gradient(180deg, #ff3932, #a00000)",
                          clipPath:
                            "polygon(0 50%, 20% 35%, 35% 0, 67% 0, 82% 35%, 100% 50%, 90% 75%, 10% 75%)",
                          transform: "rotate(-12deg)",
                          filter:
                            "drop-shadow(0 0 12px rgba(225,6,0,.6))",
                        }}
                      />
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
