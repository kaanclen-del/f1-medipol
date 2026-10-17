"use client";

import { useState } from "react";

type Props = { initialText: string };
export default function AdminRaceTicker({ initialText }: Props) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function save(value: string) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/race-ticker", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Kaydedilemedi.");
      setText(value);
      setMessage(value ? "Duyuru yayınlandı." : "Otomatik yarış bilgisi etkin.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section style={{ margin: "22px 0", padding: "22px", border: "1px solid rgba(255,255,255,.15)", borderRadius: 16, background: "#141a23" }}>
      <span style={{ color: "#fa7c83", fontWeight: 800, fontSize: 11, letterSpacing: ".1em" }}>SİTE DUYURULARI</span>
      <h2 style={{ margin: "7px 0", fontSize: 21 }}>Kayan yarış şeridi</h2>
      <p style={{ color: "#acbbc9", fontSize: 13, lineHeight: 1.6 }}>Özel duyuru yazarsan ana sayfadaki şeritte o görünür. Alanı boş bırakıp kaydedersen şerit otomatik yaklaşan yarış bilgisini gösterir.</p>
      <label htmlFor="race-ticker-text" style={{ display: "block", fontWeight: 700, fontSize: 12, marginBottom: 7 }}>Şerit metni (isteğe bağlı)</label>
      <textarea id="race-ticker-text" value={text} onChange={(event) => setText(event.target.value)} maxLength={240} rows={3} placeholder="Örn. Go-Kart etkinliğimiz için kayıtlar açıldı!" style={{ display: "block", boxSizing: "border-box", width: "100%", maxWidth: 800, padding: 12, borderRadius: 10, border: "1px solid #475366", background: "#0d131c", color: "white", font: "inherit", resize: "vertical" }} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <button type="button" disabled={saving || text.trim().length > 240} onClick={() => void save(text.trim())} style={{ padding: "11px 16px", border: 0, borderRadius: 9, background: "#be243e", color: "white", fontWeight: 800, cursor: "pointer" }}>{saving ? "Kaydediliyor…" : "Duyuruyu Kaydet"}</button>
        <button type="button" disabled={saving} onClick={() => void save("")} style={{ padding: "11px 16px", border: "1px solid #556071", borderRadius: 9, background: "#27313e", color: "white", fontWeight: 700, cursor: "pointer" }}>Otomatik Yarış Bilgisine Dön</button>
      </div>
      {message && <p role="status" style={{ color: "#d5e8f1", marginBottom: 0 }}>{message}</p>}
    </section>
  );
}
