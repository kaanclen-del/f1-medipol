"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import styles from "./ProfileFriendManager.module.css";

type Person = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  relationship: string;
};
type FriendRequest = {
  friendship_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  direction: "incoming" | "outgoing";
  created_at: string;
};
type Tab = "find" | "requests";
type Trigger = "icon" | "footer" | "inline";

function Avatar({ name, src }: { name: string; src: string | null }) {
  return <span className={styles.avatar}>
    {src ? <img src={src} alt="" loading="lazy" /> : name.slice(0, 1).toLocaleUpperCase("tr-TR")}
  </span>;
}

export default function ProfileFriendManager({ variant = "icon" }: { variant?: Trigger }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("find");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Person[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const reloadRequests = useCallback(async () => {
    const { data, error } = await supabase.rpc("dm_list_requests");
    if (error) { setStatus("İstekler yüklenemedi: " + error.message); return; }
    setRequests((data || []) as FriendRequest[]);
  }, [supabase]);

  useEffect(() => {
    if (!open) return;
    void reloadRequests();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = old; };
  }, [open, reloadRequests]);

  useEffect(() => {
    if (!open || tab !== "find" || query.trim().length < 2) {
      setFound([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const wait = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("dm_find_users", { p_search: query.trim() });
      if (cancelled) return;
      setSearching(false);
      if (error) { setStatus("Arama başarısız: " + error.message); setFound([]); }
      else { setFound((data || []) as Person[]); setStatus(""); }
    }, 350);
    return () => { cancelled = true; window.clearTimeout(wait); };
  }, [open, tab, query, supabase]);

  async function updateFriend(id: string, action: () => PromiseLike<{ error: { message: string } | null }>, success: string) {
    setBusyId(id);
    const { error } = await action();
    setBusyId(null);
    if (error) { setStatus(error.message); return; }
    setStatus(success);
    window.dispatchEvent(new Event("f1-notifications-updated"));
    await reloadRequests();
    if (query.trim().length >= 2) {
      const { data } = await supabase.rpc("dm_find_users", { p_search: query.trim() });
      setFound((data || []) as Person[]);
    }
    router.refresh();
  }

  const incoming = requests.filter(request => request.direction === "incoming");
  const outgoing = requests.filter(request => request.direction === "outgoing");

  return <>
    {variant === "icon" ? (
      <button type="button" className="friends-add-button" onClick={() => { setTab("find"); setStatus(""); setOpen(true); }} aria-label="Arkadaş ekle ve istekleri yönet" title="Arkadaş ekle / İstekler">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9.5" cy="8" r="3"/><path d="M4 20v-1a5.5 5.5 0 0 1 11 0v1M19 8v8m-4-4h8" />
        </svg>
      </button>
    ) : variant === "footer" ? (
      <button type="button" className="friends-footer" style={{ background: "transparent", width: "100%", borderLeft: 0, borderRight: 0, borderBottom: 0, cursor: "pointer" }} onClick={() => { setOpen(true); setTab("requests"); }}>ARKADAŞLIK İSTEKLERİ VE ÜYE ARAMA <span aria-hidden="true">→</span></button>
    ) : (
      <button type="button" className={styles.inlineButton} onClick={() => { setTab("find"); setOpen(true); }}>Kişi bul ve arkadaş ekle →</button>
    )}

    {open && <div className={styles.backdrop} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-label="Arkadaş ekle ve arkadaşlık istekleri">
        <div className={styles.header}>
          <div><span className={styles.eyebrow}>F1 MEDİPOL · SOCIAL PADDOCK</span><h2>Arkadaşlar</h2><p>Kullanıcı adıyla ara, istek gönder veya gelenleri yanıtla.</p></div>
          <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Pencereyi kapat">×</button>
        </div>
        <div className={styles.tabs} role="tablist" aria-label="Arkadaşlar">
          <button type="button" role="tab" aria-selected={tab === "find"} className={tab === "find" ? styles.active : ""} onClick={() => setTab("find")}>Kişi bul</button>
          <button type="button" role="tab" aria-selected={tab === "requests"} className={tab === "requests" ? styles.active : ""} onClick={() => { setTab("requests"); void reloadRequests(); }}>İstekler {incoming.length > 0 && <span className={styles.counter}>{incoming.length}</span>}</button>
        </div>
        {status && <p className={styles.status} role="status">{status}</p>}
        <div className={styles.body}>
          {tab === "find" ? <>
            <label className={styles.searchLabel} htmlFor="profile-friend-search">Kullanıcı adı veya görünen ad</label>
            <input id="profile-friend-search" className={styles.search} autoFocus value={query} onChange={event => setQuery(event.target.value.slice(0, 40))} placeholder="En az iki harf yaz..." autoComplete="off" />
            {query.trim().length < 2 ? <p className={styles.empty}>Arkadaş eklemek için kullanıcı adı veya ismin en az iki karakterini yaz.</p> : searching ? <p className={styles.empty}>Kullanıcılar aranıyor…</p> : found.length === 0 ? <p className={styles.empty}>Bu aramayla eşleşen kullanıcı bulunamadı.</p> : found.map(person => <div className={styles.person} key={person.user_id}>
              <Link className={styles.identity} href={`/members/${person.user_id}`} onClick={() => setOpen(false)}><Avatar name={person.display_name} src={person.avatar_url}/><span><strong>{person.display_name}</strong><small>Profili ziyaret et ↗</small></span></Link>
              {person.relationship === "accepted" ? <span className={styles.neutral}>Arkadaşın</span> : person.relationship === "pending" ? <span className={styles.neutral}>İstek bekliyor</span> : person.relationship === "declined" ? <span className={styles.neutral}>Reddedilmiş</span> : <button className={styles.primary} type="button" disabled={busyId !== null} onClick={() => void updateFriend(person.user_id, () => supabase.rpc("dm_add_friend", { p_target: person.user_id }), "Arkadaşlık isteği gönderildi.")}>{busyId === person.user_id ? "..." : "+ Ekle"}</button>}
            </div>)}
          </> : <>
            <h3 className={styles.groupTitle}>Gelen istekler ({incoming.length})</h3>
            {incoming.length === 0 && <p className={styles.empty}>Bekleyen gelen istek yok.</p>}
            {incoming.map(request => <div className={styles.person} key={request.friendship_id}>
              <Link className={styles.identity} href={`/members/${request.user_id}`} onClick={() => setOpen(false)}><Avatar name={request.display_name} src={request.avatar_url}/><span><strong>{request.display_name}</strong><small>Sana arkadaşlık isteği gönderdi</small></span></Link>
              <div className={styles.actions}>
                <button className={styles.primary} type="button" disabled={busyId !== null} onClick={() => void updateFriend(request.friendship_id, () => supabase.rpc("dm_respond_friend", { p_friendship: request.friendship_id, p_accept: true }), "Arkadaşlık isteği kabul edildi.")}>Kabul et</button>
                <button className={styles.secondary} type="button" disabled={busyId !== null} onClick={() => void updateFriend(request.friendship_id, () => supabase.rpc("dm_respond_friend", { p_friendship: request.friendship_id, p_accept: false }), "İstek reddedildi.")}>Reddet</button>
              </div>
            </div>)}
            <h3 className={styles.groupTitle}>Gönderilen istekler ({outgoing.length})</h3>
            {outgoing.length === 0 && <p className={styles.empty}>Bekleyen gönderilmiş isteğin yok.</p>}
            {outgoing.map(request => <div className={styles.person} key={request.friendship_id}>
              <Link className={styles.identity} href={`/members/${request.user_id}`} onClick={() => setOpen(false)}><Avatar name={request.display_name} src={request.avatar_url}/><span><strong>{request.display_name}</strong><small>Yanıt bekleniyor</small></span></Link>
              <span className={styles.neutral}>Beklemede</span>
            </div>)}
          </>}
        </div>
      </section>
    </div>}
  </>;
}
