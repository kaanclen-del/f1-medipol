"use client";

import { useEffect, useState } from "react";
import styles from "@/app/bildirimler/notifications.module.css";

type Status = "loading" | "ready" | "unsupported" | "error";

function decodeVapidPublicKey(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isStandalone() {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const data: unknown = await response.json().catch(() => ({}));
  return data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
}

export default function PushNotificationSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState("default");
  const [publicKey, setPublicKey] = useState("");
  const [isInstalled, setIsInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function initialize() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (active) setStatus("unsupported");
        return;
      }
      try {
        // KayÄ±t kullanÄ±cÄ± hareketinden Ã¶nce hazÄ±rlanÄ±r. SW sayfa iÃ§eriÄŸini cache'lemez.
        const registration = await navigator.serviceWorker.register("/push-sw.js", {
          updateViaCache: "none",
        });
        const response = await fetch("/api/push/public-key", { cache: "no-store" });
        const json = await readJson(response);
        if (!response.ok || typeof json.publicKey !== "string") {
          throw new Error(typeof json.error === "string" ? json.error : "Bildirim anahtarÄ± bulunamadÄ±.");
        }
        const existing = await registration.pushManager.getSubscription();
        if (active) {
          setPublicKey(json.publicKey);
          setSubscribed(Boolean(existing));
          setPermission(Notification.permission);
          setIsInstalled(isStandalone());
          setStatus("ready");
        }
      } catch (error) {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Bildirimler hazÄ±rlanamadÄ±.");
          setStatus("error");
        }
      }
    }
    void initialize();
    return () => { active = false; };
  }, []);

  async function enable() {
    if (busy || !publicKey) return;
    setBusy(true);
    setMessage("");
    try {
      // iOS bildirim izni tÄ±klama olayÄ±ndan doÄŸrudan istenir.
      const granted = await Notification.requestPermission();
      setPermission(granted);
      if (granted !== "granted") {
        setMessage("Bildirim izni verilmedi. Ä°zinleri cihaz ayarlarÄ±ndan deÄŸiÅŸtirebilirsin.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidPublicKey(publicKey),
        }));
      const payload = subscription.toJSON();
      const response = await fetch("/api/push/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Abonelik sunucuya kaydedilemedi.");
      setSubscribed(true);
      setMessage("Bildirimler etkin! Åimdi test bildirimi gÃ¶nderebilirsin.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bildirim izni oluÅŸturulamadÄ±.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/push/subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        const data = await readJson(response);
        if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Abonelik kaldÄ±rÄ±lamadÄ±.");
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage("Bu cihaz iÃ§in bildirimler kapatÄ±ldÄ±.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bildirimler kapatÄ±lamadÄ±.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const data = await readJson(response);
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Test gÃ¶nderilemedi.");
      setMessage(`Test bildirimi gÃ¶nderildi (${Number(data.sent) || 1} cihaz). Bildirimi cihazÄ±nda kontrol et.`);
      window.dispatchEvent(new Event("f1-notifications-updated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test bildirimi baÅŸarÄ±sÄ±z.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel} aria-label="Bildirim izinleri">
      <div className={styles.panelTop}>
        <div>
          <span className={styles.kicker}>CÄ°HAZ AYARLARI</span>
          <h2 className={styles.panelTitle}>Push bildirimleri</h2>
        </div>
        <span className={`${styles.state} ${subscribed ? styles.stateOn : ""}`}>
          {status === "loading" ? "KONTROL EDÄ°LÄ°YOR" : subscribed ? "ETKÄ°N" : "KAPALI"}
        </span>
      </div>
      <p className={styles.description}>
        YarÄ±ÅŸ ve tahmin hatÄ±rlatmalarÄ± iÃ§in cihazÄ±nÄ± F1 SOCIAL hesabÄ±na baÄŸla.
        Ä°lk aÅŸamada gerÃ§ek bir test bildirimi gÃ¶ndereceÄŸiz.
      </p>
      {status === "unsupported" && (
        <div className={styles.notice}>
          <strong>Bu tarayÄ±cÄ±da bildirim Ã¶zelliÄŸi bulunamadÄ±.</strong>
          <p>iPhone kullanÄ±yorsan Safari&apos;den PaylaÅŸ â†’ Ana Ekrana Ekle seÃ§eneÄŸiyle siteyi yÃ¼kle.
            Sonra ana ekrandaki F1 SOCIAL simgesinden bu sayfayÄ± aÃ§. iOS 16.4 veya Ã¼zeri gerekir.</p>
        </div>
      )}
      {status === "ready" && !isInstalled && (
        <div className={styles.note}>
          iPhone&apos;da bildirim almak iÃ§in siteyi ana ekrana ekleyip oradan aÃ§malÄ±sÄ±n.
          Android ve masaÃ¼stÃ¼nde desteklenen tarayÄ±cÄ±dan devam edebilirsin.
        </div>
      )}
      {status === "ready" && permission === "denied" && (
        <div className={styles.notice}>Bildirim izni engellenmiÅŸ. CihazÄ±nÄ±n tarayÄ±cÄ± veya uygulama bildirim ayarlarÄ±ndan izin ver.</div>
      )}
      <div className={styles.buttons}>
        {!subscribed ? (
          <button type="button" className={styles.primary} onClick={enable}
            disabled={status !== "ready" || busy || permission === "denied"}>
            {busy ? "Ä°ÅŸleniyor..." : "Bildirimleri etkinleÅŸtir"}
          </button>
        ) : (
          <>
            <button type="button" className={styles.primary} onClick={sendTest} disabled={busy}>
              {busy ? "GÃ¶nderiliyor..." : "Test bildirimi gÃ¶nder"}
            </button>
            <button type="button" className={styles.secondary} onClick={disable} disabled={busy}>
              Bildirimleri kapat
            </button>
          </>
        )}
      </div>
      {status === "loading" && <p className={styles.feedback}>Cihaz desteÄŸi kontrol ediliyor...</p>}
      {message && <p className={styles.feedback} role="status">{message}</p>}
      <div className={styles.footnote}>
        Test bildirimi hesabÄ±na kayÄ±tlÄ± cihazlara gÃ¶nderilir. Kendi iznin dÄ±ÅŸÄ±nda
        hiÃ§bir cihaz eklenmez. Otomatik yarÄ±ÅŸ hatÄ±rlatmalarÄ± sonraki aÅŸamada aÃ§Ä±lacak.
      </div>
    </section>
  );
}
