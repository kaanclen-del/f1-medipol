import Header from "@/components/Header";
import Link from "next/link";
import styles from "./arcade.module.css";

type Game = {
  id: "manager" | "whatif" | "rush" | "timing";
  num: string;
  category: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  tags: string[];
};

const games: Game[] = [
  {
    id: "manager", num: "01", category: "TAKIM YÖNETİMİ",
    title: "F1 Manager",
    description: "Takımını kur, pilotlarını yönet ve yarış hafta sonuna stratejinle yön ver.",
    href: "/arcade/manager", cta: "MANAGER'I AÇ",
    tags: ["LOBI", "STRATEJİ", "SEZON"],
  },
  {
    id: "whatif", num: "02", category: "ALTERNATİF EVREN",
    title: "What If?",
    description: "Sonuçları değiştir, pilot puanlarını yeniden hesapla ve alternatif şampiyonayı gör.",
    href: "/arcade/what-if", cta: "SENARYO OLUŞTUR",
    tags: ["SİMÜLASYON", "PUANLAR", "F1"],
  },
  {
    id: "rush", num: "03", category: "3D MULTIPLAYER",
    title: "Kart Rush 3D",
    description: "Formula aracını seç, arkadaşlarınla lobiye katıl ve özel güçlerle yarış.",
    href: "/arcade/kart-rush", cta: "YARIŞA GİR",
    tags: ["3D", "ONLINE", "GRAND PRIX"],
  },
  {
    id: "timing", num: "04", category: "GO-KART · ZAMANLAMA",
    title: "Go-Kart Timing",
    description: "Sürücüleri ekle, turları kronometreyle veya elle kaydet, ceza uygula ve sıralamayı çıkar.",
    href: "/arcade/gokart-zamanlama", cta: "ZAMAN MERKEZİNİ AÇ",
    tags: ["KRONOMETRE", "+3/+5 CEZA", "SONUÇLAR"],
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
            <div className={styles.heroDecor} aria-hidden="true"><i /><i /><i /></div>
            <div className={styles.heroCenter}>
              <span className={styles.heroEyebrow}>F1 MEDİPOL / OYUN MERKEZİ</span>
              <h1>OYUN <em>BAŞLASIN.</em></h1>
              <p>Yönetim, simülasyon, yarış ve gerçek pist zamanlaması.</p>
            </div>
          </section>

          <div className={styles.sectionHead}>
            <div>
              <span>OYUN KÜTÜPHANESİ</span>
              <h2>Yarış dünyasını seç</h2>
            </div>
            <small>04 DENEYİM</small>
          </div>

          <section className={styles.games} aria-label="Arcade oyun seçenekleri">
            {games.map(game => (
              <article className={`${styles.card} ${styles[game.id]}`} key={game.id}>
                <div className={styles.cardTop}>
                  <span>{game.num} / {game.category}</span>
                  <span className={styles.cardIcon} aria-hidden="true">
                    {game.id === "manager" ? "▦" : game.id === "whatif" ? "↗" : game.id === "rush" ? "⚑" : "◷"}
                  </span>
                </div>

                <div className={styles.visual} aria-hidden="true">
                  {game.id === "manager" && (
                    <div className={styles.managerGraphic}>
                      <div className={styles.telemetry}><span/><span/><span/><span/><span/></div>
                      <div className={styles.timingLines}><b/><b/><b/></div>
                    </div>
                  )}
                  {game.id === "whatif" && (
                    <div className={styles.whatifGraphic}>
                      <div className={styles.question}>?</div><div className={styles.orbit}/>
                      <span className={styles.sparkOne}/><span className={styles.sparkTwo}/>
                    </div>
                  )}
                  {game.id === "rush" && (
                    <div className={styles.rushGraphic}>
                      <div className={styles.speedRing}/>
                      <div className={styles.carShape}><span/><span/><i/></div>
                      <div className={styles.roadLine}/>
                    </div>
                  )}
                  {game.id === "timing" && (
                    <div className={styles.timingGraphic}>
                      <div className={styles.stopwatchCircle}><span>01:24</span><small>.638</small></div>
                      <div className={styles.timingList}><i/><i/><i/></div>
                    </div>
                  )}
                </div>

                <div className={styles.cardContent}>
                  <h3>{game.title}</h3>
                  <p>{game.description}</p>
                  <div className={styles.tags}>{game.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
                </div>
                <Link className={styles.cardLink} href={game.href}>
                  <span>{game.cta}</span><span aria-hidden="true">↗</span>
                </Link>
              </article>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
