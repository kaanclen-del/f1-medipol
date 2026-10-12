"use client";

import { useEffect, useState, type FormEvent } from "react";
import styles from "./AdminPushComposer.module.css";

type Target = "self" | "subscribers";
type Result = {
  ok?: boolean;
  error?: string;
  pushed?: number;
  failed?: number;
  recipients?: number;
  inboxSaved?: number;
  note?: string;
};

export default function AdminPushComposer() {
  const [title, setTitle] = useState("F1 Medipol'den test bildirimi 🏁");
  const [body, setBody] = useState("Bildirimler çalışıyor! Yarış heyecanını artık telefonundan takip edebilirsin.");
  const [url, setUrl] = useState("/bildirimler");
  const [target, setTarget] = useState<Target>("self");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(false);
  const [deviceCount, setDeviceCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void fetch("/api/admin/notifications", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (alive && typeof data?.devices === "number") setDeviceCount(data.devices); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (target === "subscribers" && !window.confirm(
      "Bildirim izni vermiş TÜM üyelere gerçek push bildirimi gönderilsin mi?"
    )) return;
    setBusy(true); setFeedback(""); setError(false);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, url, target }),
      });
      const data = (await res.json()) as Result;
      if (!res.ok || !data.ok) throw new Error(data.error || "Bildirim gönderilemedi.");
      setFeedback(`Gönderim tamamlandı: ${data.recipients ?? 0} üyenin gelen kutusuna kaydedildi, ${data.pushed ?? 0} cihaza push servisi üzerinden iletildi.${data.failed ? ` ${data.failed} cihazda hata oluştu.` : ""}${data.note ? ` ${data.note}` : ""}`);
      window.dispatchEvent(new Event("f1-notifications-updated"));
    } catch (err) {
      setError(true);
      setFeedback(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.");
    } finally { setBusy(false); }
  }

  return <section className={styles.layout} aria-label="Yönetici bildirim gönderimi">
    <form className={styles.card} onSubmit={send}>
      <div className={styles.kicker}>YENİ BİLDİRİM</div>
      <h2>Mesaj oluştur</h2>
      <label className={styles.label} htmlFor="pushTitle">Bildirim başlığı <small>{title.length}/90</small></label>
      <input id="pushTitle" className={styles.control} value={title} onChange={e => setTitle(e.target.value)} maxLength={90} minLength={3} required />
      <label className={styles.label} htmlFor="pushBody">Bildirim metni <small>{body.length}/260</small></label>
      <textarea id="pushBody" className={`${styles.control} ${styles.textarea}`} value={body} onChange={e => setBody(e.target.value)} maxLength={260} minLength={5} required rows={4} />
      <label className={styles.label} htmlFor="pushUrl">Bildirime basınca açılacak sayfa</label>
      <select id="pushUrl" className={styles.control} value={url} onChange={e => setUrl(e.target.value)}>
        <option value="/bildirimler">Bildirim Merkezi</option>
        <option value="/">Ana Sayfa</option>
        <option value="/predict">Tahminler</option>
        <option value="/events">Etkinlikler</option>
        <option value="/paddock">Paddock</option>
      </select>
      <label className={styles.label} htmlFor="pushTarget">Alıcılar</label>
      <select id="pushTarget" className={styles.control} value={target} onChange={e => setTarget(e.target.value as Target)}>
        <option value="self">Yalnızca benim kayıtlı cihazlarım — test</option>
        <option value="subscribers">Bildirim izni vermiş tüm üyeler — duyuru</option>
      </select>
      <p className={styles.helper}>{target === "self" ? "Bilgisayardan gönder, iPhone'unda al. Aynı F1 Medipol hesabıyla giriş yaptığından emin ol." : "Gerçek üyelerin cihazlarına gönderilir. Onay ekranı açılacaktır. İlk aşamada en fazla 100 cihaza aynı anda gönderim desteklenir."}</p>
      <button className={styles.submit} type="submit" disabled={busy || title.trim().length < 3 || body.trim().length < 5}>
        {busy ? "Gönderiliyor..." : target === "self" ? "Kendi cihazlarıma gönder →" : "Üyelere bildirim gönder →"}
      </button>
      {feedback && <div role="status" className={error ? styles.error : styles.success}>{feedback}</div>}
    </form>
    <aside className={styles.info}>
      <div className={styles.kicker}>BİLDİRİM ÖN İZLEMESİ</div>
      <div className={styles.preview}>
        <div className={styles.previewTop}><span className={styles.appIcon}>F1</span> F1 MEDİPOL <small>şimdi</small></div>
        <strong>{title || "Bildirim başlığı"}</strong>
        <p>{body || "Bildirim mesajı"}</p>
      </div>
      <div className={styles.metrics}>
        <span>Bildirim aboneliği bulunan cihaz</span>
        <strong>{deviceCount === null ? "—" : deviceCount}</strong>
      </div>
      <p className={styles.explain}>Gönderilen bildirim ayrıca her alıcının sitedeki zil ikonunda görünür. Push servisine kabul edilmesi, telefonun bildirimi kesin gösterdiği anlamına gelmez.</p>
      <a className={styles.link} href="/bildirimler">Bildirim izinleri ve gelen kutusu →</a>
    </aside>
  </section>;
}
