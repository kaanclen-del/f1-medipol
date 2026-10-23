"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./NotificationInbox.module.css";

type Notice = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  target_url: string;
  read_at: string | null;
};

export default function NotificationInbox() {
  const [items, setItems] = useState<Notice[]>([]);
  const [state, setState] = useState("Yükleniyor...");

  async function reload() {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.status === 401) { setState("Bildirim geçmişi için giriş yapmalısın."); return; }
      if (!res.ok) { setState("Bildirim geçmişi henüz hazır değil. Supabase SQL kurulumunu kontrol et."); return; }
      const result = await res.json();
      setItems(Array.isArray(result.notifications) ? result.notifications : []);
      setState("");
    } catch { setState("Bildirim geçmişi yüklenemedi."); }
  }
  useEffect(() => {
    void reload();
    window.addEventListener("focus", reload);
    window.addEventListener("f1-notifications-updated", reload);
    return () => { window.removeEventListener("focus", reload); window.removeEventListener("f1-notifications-updated", reload); };
  }, []);

  async function allRead() {
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
      if (response.ok) { await reload(); window.dispatchEvent(new Event("f1-notifications-updated")); }
    } catch { /* connection error; show existing list */ }
  }

  return (
    <section className={styles.panel} aria-label="Gelen bildirimler">
      <div className={styles.head}>
        <div><span>F1 MEDİPOL</span><h2>Gelen Bildirimler</h2></div>
        <button type="button" onClick={allRead} disabled={!items.some(item => !item.read_at)}>Tümünü okundu işaretle</button>
      </div>
      {state ? <p className={styles.empty}>{state}</p> : items.length === 0 ?
        <p className={styles.empty}>Henüz kayıtlı bir bildirimin yok. Yukarıdaki butondan test bildirimi gönderdiğinde burada görünecek. Önceki bildirimler geriye dönük yüklenmez.</p> :
        <div className={styles.list}>{items.map(item => (
          <Link key={item.id} href={item.target_url.startsWith("/") && !item.target_url.startsWith("//") ? item.target_url : "/bildirimler"} className={`${styles.item} ${!item.read_at ? styles.new : ""}`} onClick={() => { if (!item.read_at) void fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) }); }}>
            <div><strong>{item.title}</strong>{!item.read_at && <span>YENİ</span>}</div>
            <p>{item.body}</p><small>{new Date(item.created_at).toLocaleString("tr-TR")}</small>
          </Link>
        ))}</div>}
    </section>
  );
}
