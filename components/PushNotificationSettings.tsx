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
        // Kayıt kullanıcı hareketinden önce hazırlanır. SW sayfa içeriğini cache'lemez.
        const registration = await navigator.serviceWorker.register("/push-sw.js", {
          updateViaCache: "none",
        });
        const response = await fetch("/api/push/public-key", { cache: "no-store" });
        const json = await readJson(response);
        if (!response.ok || typeof json.publicKey !== "string") {
          throw new Error(typeof json.error === "string" ? json.error : "Bildirim anahtarı bulunamadı.");
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
          setMessage(error instanceof Error ? error.message : "Bildirimler hazırlanamadı.");
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
      // iOS bildirim izni tıklama olayından doğrudan istenir.
      const granted = await Notification.requestPermission();
      setPermission(granted);
      if (granted !== "granted") {
        setMessage("Bildirim izni verilmedi. İzinleri cihaz ayarlarından değiştirebilirsin.");
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
      setMessage("Bildirimler etkin! Şimdi test bildirimi gönderebilirsin.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bildirim izni oluşturulamadı.");
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
        if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Abonelik kaldırılamadı.");
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage("Bu cihaz için bildirimler kapatıldı.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bildirimler kapatılamadı.");
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
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Test gönderilemedi.");
      setMessage(`Test bildirimi gönderildi (${Number(data.sent) || 1} cihaz). Bildirimi cihazında kontrol et.`);
      window.dispatchEvent(new Event("f1-notifications-updated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test bildirimi başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel} aria-label="Bildirim izinleri">
      <div className={styles.panelTop}>
        <div>
          <span className={styles.kicker}>CİHAZ AYARLARI</span>
          <h2 className={styles.panelTitle}>Push bildirimleri</h2>
        </div>
        <span className={`${styles.state} ${subscribed ? styles.stateOn : ""}`}>
          {status === "loading" ? "KONTROL EDİLİYOR" : subscribed ? "ETKİN" : "KAPALI"}
        </span>
      </div>
      <p className={styles.description}>
        Yarış ve tahmin hatırlatmaları için cihazını F1 Medipol hesabına bağla.
        İlk aşamada gerçek bir test bildirimi göndereceğiz.
      </p>
      {status === "unsupported" && (
        <div className={styles.notice}>
          <strong>Bu tarayıcıda bildirim özelliği bulunamadı.</strong>
          <p>iPhone kullanıyorsan Safari&apos;den Paylaş → Ana Ekrana Ekle seçeneğiyle siteyi yükle.
            Sonra ana ekrandaki F1 Medipol simgesinden bu sayfayı aç. iOS 16.4 veya üzeri gerekir.</p>
        </div>
      )}
      {status === "ready" && !isInstalled && (
        <div className={styles.note}>
          iPhone&apos;da bildirim almak için siteyi ana ekrana ekleyip oradan açmalısın.
          Android ve masaüstünde desteklenen tarayıcıdan devam edebilirsin.
        </div>
      )}
      {status === "ready" && permission === "denied" && (
        <div className={styles.notice}>Bildirim izni engellenmiş. Cihazının tarayıcı veya uygulama bildirim ayarlarından izin ver.</div>
      )}
      <div className={styles.buttons}>
        {!subscribed ? (
          <button type="button" className={styles.primary} onClick={enable}
            disabled={status !== "ready" || busy || permission === "denied"}>
            {busy ? "İşleniyor..." : "Bildirimleri etkinleştir"}
          </button>
        ) : (
          <>
            <button type="button" className={styles.primary} onClick={sendTest} disabled={busy}>
              {busy ? "Gönderiliyor..." : "Test bildirimi gönder"}
            </button>
            <button type="button" className={styles.secondary} onClick={disable} disabled={busy}>
              Bildirimleri kapat
            </button>
          </>
        )}
      </div>
      {status === "loading" && <p className={styles.feedback}>Cihaz desteği kontrol ediliyor...</p>}
      {message && <p className={styles.feedback} role="status">{message}</p>}
      <div className={styles.footnote}>
        Test bildirimi hesabına kayıtlı cihazlara gönderilir. Kendi iznin dışında
        hiçbir cihaz eklenmez. Otomatik yarış hatırlatmaları sonraki aşamada açılacak.
      </div>
    </section>
  );
}
