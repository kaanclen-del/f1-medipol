"use client";

// Header ikonudur. Sohbet penceresi burada degil, /messages sayfasindadir.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import styles from "./DmDock.module.css";

export default function DmDock({ isLight = false }: { isLight?: boolean }) {
  const [supabase] = useState(() => createClient());
  const [uid, setUid] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [requests, setRequests] = useState(0);

  const update = useCallback(async () => {
    if (!uid) return;
    const [f, r] = await Promise.all([
      supabase.rpc("dm_list_friends"),
      supabase.rpc("dm_list_requests"),
    ]);
    if (!f.error) setUnread(((f.data || []) as Array<{ unread_count: number }>).reduce((n, row) => n + Number(row.unread_count || 0), 0));
    if (!r.error) setRequests(((r.data || []) as Array<{ direction: string }>).filter(row => row.direction === "incoming").length);
  }, [supabase, uid]);

  useEffect(() => {
    let live = true;
    void supabase.auth.getUser().then(({ data }) => { if (live) setUid(data.user?.id || null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUid(session?.user?.id || null));
    return () => { live = false; subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (!uid) { setUnread(0); setRequests(0); return; }
    void update();
    const tick = window.setInterval(() => { if (!document.hidden) void update(); }, 10000);
    const channel = supabase.channel(`dm-header-${uid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `recipient_id=eq.${uid}` }, () => void update())
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_friendships" }, () => void update())
      .subscribe();
    window.addEventListener("focus", update);
    window.addEventListener("f1-dm-refresh", update);
    window.addEventListener("f1-notifications-updated", update);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("focus", update);
      window.removeEventListener("f1-dm-refresh", update);
      window.removeEventListener("f1-notifications-updated", update);
      void supabase.removeChannel(channel);
    };
  }, [supabase, uid, update]);

  useEffect(() => {
    // Eski /?dm=... bildirim baglantilarini yeni sayfaya aktar.
    const url = new URL(window.location.href);
    const deepLink = url.searchParams.get("dm");
    if (deepLink && url.pathname !== "/messages") {
      window.location.replace(`/messages?dm=${encodeURIComponent(deepLink)}`);
    }
    const open = (event: Event) => {
      const id = (event as CustomEvent<{userId?: string}>).detail?.userId;
      window.location.assign(id ? `/messages?dm=${encodeURIComponent(id)}` : "/messages");
    };
    window.addEventListener("f1-dm-open", open);
    return () => window.removeEventListener("f1-dm-open", open);
  }, []);

  if (!uid) return null;
  const count = unread + requests;
  return <Link href="/messages" className={`${styles.headerButton} ${isLight ? styles.headerLight : ""}`} title="Mesajlar" aria-label={`Mesajlar, ${unread} okunmamış, ${requests} arkadaşlık isteği`} style={{ textDecoration: "none" }}>
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-3.6-.75L3 21l1.75-4.9A8.5 8.5 0 1 1 20 11.5Z"/><path d="M8 11.5h8m-8 3h5"/></svg>
    {count > 0 && <span className={styles.headerBadge}>{count > 99 ? "99+" : count}</span>}
  </Link>;
}
