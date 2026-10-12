import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import PushNotificationSettings from "@/components/PushNotificationSettings";
import NotificationInbox from "@/components/NotificationInbox";
import styles from "./notifications.module.css";

export const metadata: Metadata = {
  title: "Bildirimler | F1 Medipol",
  description: "F1 Medipol yarış ve tahmin bildirimlerini etkinleştir.",
};

export default function NotificationsPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.breadcrumb}><Link href="/">ANA SAYFA</Link> / BİLDİRİMLER</div>
          <section className={styles.hero}>
            <span className={styles.eyebrow}><span className={styles.pulse} /> F1 MEDİPOL • PWA</span>
            <h1>Yarışı <span>kaçırma.</span></h1>
            <p>Yarış başlangıçları, tahmin süreleri ve kulüp duyuruları için telefonuna bildirim
              gönderecek altyapıyı kuruyoruz. İlk önce kendi cihazında test edelim.</p>
          </section>
          <div className={styles.grid}>
            <PushNotificationSettings />
            <aside className={styles.instructions}>
              <span className={styles.kicker}>TELEFONDA NASIL ÇALIŞIR?</span>
              <h2>3 basit adım</h2>
              <div className={styles.step}>
                <span>01</span>
                <div><strong>Siteyi ana ekrana ekle</strong>
                  <p>iPhone: Safari → Paylaş → Ana Ekrana Ekle. Android: tarayıcı menüsü → Yükle / Ana ekrana ekle.</p>
                </div>
              </div>
              <div className={styles.step}>
                <span>02</span>
                <div><strong>F1 Medipol&apos;ü aç</strong>
                  <p>Ana ekrandaki simgeden siteyi aç, hesabınla giriş yap ve bildirimlere izin ver.</p>
                </div>
              </div>
              <div className={styles.step}>
                <span>03</span>
                <div><strong>Test bildirimini dene</strong>
                  <p>Test butonuna bas; bildirim kilit ekranında veya bildirim merkezinde görünebilir.</p>
                </div>
              </div>
              <div className={styles.tip}>iOS 16.4+ gerekir. Bildirimler HTTPS üzerinde çalışır; Vercel Preview adresimiz bunun için uygundur.</div>
            </aside>
          </div>
          <NotificationInbox />
          <div className={styles.bottom}><Link href="/arcade">ARCADE&apos;E DÖN →</Link></div>
        </div>
      </main>
    </>
  );
}
