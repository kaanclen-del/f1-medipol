import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import PushNotificationSettings from "@/components/PushNotificationSettings";
import NotificationInbox from "@/components/NotificationInbox";
import styles from "./notifications.module.css";

export const metadata: Metadata = {
  title: "Bildirimler | F1 SOCIAL",
  description: "F1 SOCIAL yarÄ±ÅŸ ve tahmin bildirimlerini etkinleÅŸtir.",
};

export default function NotificationsPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.breadcrumb}><Link href="/">ANA SAYFA</Link> / BÄ°LDÄ°RÄ°MLER</div>
          <section className={styles.hero}>
            <span className={styles.eyebrow}><span className={styles.pulse} /> F1 MEDÄ°POL â€¢ PWA</span>
            <h1>YarÄ±ÅŸÄ± <span>kaÃ§Ä±rma.</span></h1>
            <p>YarÄ±ÅŸ baÅŸlangÄ±Ã§larÄ±, tahmin sÃ¼releri ve kulÃ¼p duyurularÄ± iÃ§in telefonuna bildirim
              gÃ¶nderecek altyapÄ±yÄ± kuruyoruz. Ä°lk Ã¶nce kendi cihazÄ±nda test edelim.</p>
          </section>
          <div className={styles.grid}>
            <PushNotificationSettings />
            <aside className={styles.instructions}>
              <span className={styles.kicker}>TELEFONDA NASIL Ã‡ALIÅIR?</span>
              <h2>3 basit adÄ±m</h2>
              <div className={styles.step}>
                <span>01</span>
                <div><strong>Siteyi ana ekrana ekle</strong>
                  <p>iPhone: Safari â†’ PaylaÅŸ â†’ Ana Ekrana Ekle. Android: tarayÄ±cÄ± menÃ¼sÃ¼ â†’ YÃ¼kle / Ana ekrana ekle.</p>
                </div>
              </div>
              <div className={styles.step}>
                <span>02</span>
                <div><strong>F1 SOCIAL&apos;Ã¼ aÃ§</strong>
                  <p>Ana ekrandaki simgeden siteyi aÃ§, hesabÄ±nla giriÅŸ yap ve bildirimlere izin ver.</p>
                </div>
              </div>
              <div className={styles.step}>
                <span>03</span>
                <div><strong>Test bildirimini dene</strong>
                  <p>Test butonuna bas; bildirim kilit ekranÄ±nda veya bildirim merkezinde gÃ¶rÃ¼nebilir.</p>
                </div>
              </div>
              <div className={styles.tip}>iOS 16.4+ gerekir. Bildirimler HTTPS Ã¼zerinde Ã§alÄ±ÅŸÄ±r; Vercel Preview adresimiz bunun iÃ§in uygundur.</div>
            </aside>
          </div>
          <NotificationInbox />
          <div className={styles.bottom}><Link href="/arcade">ARCADE&apos;E DÃ–N â†’</Link></div>
        </div>
      </main>
    </>
  );
}
