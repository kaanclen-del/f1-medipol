"use client";

import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./NotificationBell.module.css";

type InboxItem = {
  id: string;
  title: string;
  body: string;
  target_url: string;
  kind: string;
  created_at: string;
  read_at: string | null;
};

type InboxResponse = { notifications?: InboxItem[]; error?: string };

function safePath(path: string): string {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : "/bildirimler";
}

function shortDate(value: string) {
  try {
    return new Date(value).toLocaleString("tr-TR", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch { return ""; }
}

export default function NotificationBell({ isLight = false }: { isLight?: boolean }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const containerRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (response.status === 401) { setItems([]); setError("Bildirimlerini görmek için giriş yap."); return; }
      if (!response.ok) throw new Error("Bildirim listesi alınamadı.");
      const data = (await response.json()) as InboxResponse;
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setError("");
    } catch {
      setError("Bildirimler yüklenemedi. Gelen kutusu tablosunu kontrol et.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setPermission("Notification" in window ? Notification.permission : "unsupported");
    sync();
    const refresh = () => { sync(); void reload(); };
    void reload();
    window.addEventListener("focus", refresh);
    window.addEventListener("f1-notifications-updated", refresh);
    const timer = window.setInterval(() => {
      if (!document.hidden) void reload();
    }, 30000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("f1-notifications-updated", refresh);
      window.clearInterval(timer);
    };
  }, [reload]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // dm-v2-notification-channel: realtime + hafif polling yedegi
  useEffect(() => {
    const supabase=createClient();
    let active=true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth.getUser().then(({data})=>{
      if(!active||!data.user)return;
      channel=supabase.channel('bell-dm-v2-'+data.user.id)
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'site_notifications',filter:'user_id=eq.'+data.user.id},()=>void reload())
        .subscribe();
    });
    return ()=>{active=false;if(channel)void supabase.removeChannel(channel);};
  },[reload]);

  const unread = items.filter(item => item.read_at === null).length;
  async function markRead(id?: string) {
    const affected = id ? items.filter(item => item.id === id) : items;
    if (!affected.some(item => item.read_at === null)) return;
    const now = new Date().toISOString();
    setItems(previous => previous.map(item => (!id || item.id === id) ? { ...item, read_at: item.read_at ?? now } : item));
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : { all: true }),
      });
      if (!response.ok) throw new Error("Okundu kaydedilemedi.");
    } catch { void reload(); }
  }

  return (
    <div className={styles.root} ref={containerRef}>
      <button
        type="button"
        className={styles.bell}
        style={{
          color: isLight ? "#1b2028" : "#f7f8fb",
          background: isLight ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.065)",
          borderColor: isLight ? "rgba(0,0,0,.12)" : "rgba(255,255,255,.16)",
        }}
        onClick={() => { setOpen(value => !value); if (!open) { setLoading(true); void reload(); } }}
        aria-label={unread ? `Bildirimler, ${unread} okunmamış` : "Bildirimler"}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Bildirimler"
      >
        <svg width="21" height="21" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {unread > 0 && <span className={styles.count}>{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className={styles.popover} role="dialog" aria-label="Bildirim merkezi">
          <div className={styles.top}>
            <div>
              <strong>Bildirim Merkezi</strong>
              <small>{unread ? `${unread} okunmamış bildirim` : "Gelen Kutusu"}</small>
            </div>
            <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Kapat">×</button>
          </div>
          <div className={styles.permission}>
            <span className={styles.dot} data-on={permission === "granted"} />
            <span>{permission === "granted" ? "Cihaz izni açık" : "Cihaz bildirimi kapalı"}</span>
            <Link href="/bildirimler" onClick={() => setOpen(false)}>{permission === "granted" ? "Ayarlar →" : "İzin ver →"}</Link>
          </div>
          <div className={styles.list}>
            {loading && items.length === 0 && <p className={styles.empty}>Bildirimler yükleniyor...</p>}
            {!loading && error && <p className={styles.empty}>{error}</p>}
            {!loading && !error && items.length === 0 && <p className={styles.empty}>Henüz bildirimin yok. Bildirimleri etkinleştirip test bildirimi gönderebilirsin.</p>}
            {items.map(item => (
              <Link
                key={item.id}
                href={safePath(item.target_url)}
                className={`${styles.item} ${!item.read_at ? styles.unread : ""}`}
                onClick={() => { void markRead(item.id); setOpen(false); }}
              >
                <span className={styles.itemHead}><strong>{item.title}</strong>{!item.read_at && <i />}</span>
                <span className={styles.body}>{item.body}</span>
                <span className={styles.date}>{shortDate(item.created_at)}</span>
              </Link>
            ))}
          </div>
          <div className={styles.bottom}>
            <Link href="/bildirimler" onClick={() => setOpen(false)}>Tüm bildirimler ve izinler →</Link>
            {unread > 0 && <button type="button" onClick={() => void markRead()}>Tümünü okundu işaretle</button>}
          </div>
        </div>
      )}
    </div>
  );
}
