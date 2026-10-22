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
  const [title, setTitle] = useState("F1 SOCIAL'den test bildirimi ğŸ");
  const [body, setBody] = useState("Bildirimler Ã§alÄ±ÅŸÄ±yor! YarÄ±ÅŸ heyecanÄ±nÄ± artÄ±k telefonundan takip edebilirsin.");
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
      "Bildirim izni vermiÅŸ TÃœM Ã¼yelere gerÃ§ek push bildirimi gÃ¶nderilsin mi?"
    )) return;
    setBusy(true); setFeedback(""); setError(false);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, url, target }),
      });
      const data = (await res.json()) as Result;
      if (!res.ok || !data.ok) throw new Error(data.error || "Bildirim gÃ¶nderilemedi.");
      setFeedback(`GÃ¶nderim tamamlandÄ±: ${data.recipients ?? 0} Ã¼yenin gelen kutusuna kaydedildi, ${data.pushed ?? 0} cihaza push servisi Ã¼zerinden iletildi.${data.failed ? ` ${data.failed} cihazda hata oluÅŸtu.` : ""}${data.note ? ` ${data.note}` : ""}`);
      window.dispatchEvent(new Event("f1-notifications-updated"));
    } catch (err) {
      setError(true);
      setFeedback(err instanceof Error ? err.message : "Bilinmeyen bir hata oluÅŸtu.");
    } finally { setBusy(false); }
  }

  return <section className={styles.layout} aria-label="YÃ¶netici bildirim gÃ¶nderimi">
    <form className={styles.card} onSubmit={send}>
      <div className={styles.kicker}>YENÄ° BÄ°LDÄ°RÄ°M</div>
      <h2>Mesaj oluÅŸtur</h2>
      <label className={styles.label} htmlFor="pushTitle">Bildirim baÅŸlÄ±ÄŸÄ± <small>{title.length}/90</small></label>
      <input id="pushTitle" className={styles.control} value={title} onChange={e => setTitle(e.target.value)} maxLength={90} minLength={3} required />
      <label className={styles.label} htmlFor="pushBody">Bildirim metni <small>{body.length}/260</small></label>
      <textarea id="pushBody" className={`${styles.control} ${styles.textarea}`} value={body} onChange={e => setBody(e.target.value)} maxLength={260} minLength={5} required rows={4} />
      <label className={styles.label} htmlFor="pushUrl">Bildirime basÄ±nca aÃ§Ä±lacak sayfa</label>
      <select id="pushUrl" className={styles.control} value={url} onChange={e => setUrl(e.target.value)}>
        <option value="/bildirimler">Bildirim Merkezi</option>
        <option value="/">Ana Sayfa</option>
        <option value="/predict">Tahminler</option>
        <option value="/events">Etkinlikler</option>
        <option value="/paddock">Paddock</option>
      </select>
      <label className={styles.label} htmlFor="pushTarget">AlÄ±cÄ±lar</label>
      <select id="pushTarget" className={styles.control} value={target} onChange={e => setTarget(e.target.value as Target)}>
        <option value="self">YalnÄ±zca benim kayÄ±tlÄ± cihazlarÄ±m â€” test</option>
        <option value="subscribers">Bildirim izni vermiÅŸ tÃ¼m Ã¼yeler â€” duyuru</option>
      </select>
      <p className={styles.helper}>{target === "self" ? "Bilgisayardan gÃ¶nder, iPhone'unda al. AynÄ± F1 SOCIAL hesabÄ±yla giriÅŸ yaptÄ±ÄŸÄ±ndan emin ol." : "GerÃ§ek Ã¼yelerin cihazlarÄ±na gÃ¶nderilir. Onay ekranÄ± aÃ§Ä±lacaktÄ±r. Ä°lk aÅŸamada en fazla 100 cihaza aynÄ± anda gÃ¶nderim desteklenir."}</p>
      <button className={styles.submit} type="submit" disabled={busy || title.trim().length < 3 || body.trim().length < 5}>
        {busy ? "GÃ¶nderiliyor..." : target === "self" ? "Kendi cihazlarÄ±ma gÃ¶nder â†’" : "Ãœyelere bildirim gÃ¶nder â†’"}
      </button>
      {feedback && <div role="status" className={error ? styles.error : styles.success}>{feedback}</div>}
    </form>
    <aside className={styles.info}>
      <div className={styles.kicker}>BÄ°LDÄ°RÄ°M Ã–N Ä°ZLEMESÄ°</div>
      <div className={styles.preview}>
        <div className={styles.previewTop}><span className={styles.appIcon}>F1</span> F1 MEDÄ°POL <small>ÅŸimdi</small></div>
        <strong>{title || "Bildirim baÅŸlÄ±ÄŸÄ±"}</strong>
        <p>{body || "Bildirim mesajÄ±"}</p>
      </div>
      <div className={styles.metrics}>
        <span>Bildirim aboneliÄŸi bulunan cihaz</span>
        <strong>{deviceCount === null ? "â€”" : deviceCount}</strong>
      </div>
      <p className={styles.explain}>GÃ¶nderilen bildirim ayrÄ±ca her alÄ±cÄ±nÄ±n sitedeki zil ikonunda gÃ¶rÃ¼nÃ¼r. Push servisine kabul edilmesi, telefonun bildirimi kesin gÃ¶sterdiÄŸi anlamÄ±na gelmez.</p>
      <a className={styles.link} href="/bildirimler">Bildirim izinleri ve gelen kutusu â†’</a>
    </aside>
  </section>;
}
