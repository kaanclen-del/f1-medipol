"use client";

// F1 Medipol DM button repair: responsive Header icon + resilient desktop popup.
// Message data, database operations and visual chat implementation stay unchanged.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/utils/supabase/client";
import styles from "./DmDock.module.css";

type ChatComponent = typeof import("./MessagesClient").default;

type PopupBoundaryProps = { children: ReactNode; onClose: () => void };
type PopupBoundaryState = { error: boolean };

function isSmallDevice(): boolean {
  return window.innerWidth <= 1199 ||
    (window.matchMedia("(pointer: coarse)").matches && window.innerWidth <= 1500);
}

function currentPage(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete("f1dm");
  url.searchParams.delete("dmview");
  url.searchParams.delete("dm");
  return url.pathname + url.search + url.hash;
}

function ChatStatus({ title, description, onClose }: { title: string; description: string; onClose: () => void }) {
  return (
    <section role="status" aria-live="polite" style={{
      position: "fixed", zIndex: 90000, right: 20, bottom: 20,
      width: "min(440px, calc(100vw - 32px))", padding: 24, borderRadius: 18,
      border: "1px solid rgba(255,255,255,.18)", background: "#171b24",
      color: "#fff", boxShadow: "0 20px 90px #0009", pointerEvents: "auto",
      fontFamily: "inherit", display: "grid", gap: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <strong style={{ fontSize: 16 }}>{title}</strong>
        <button type="button" onClick={onClose} aria-label="Sohbet penceresini kapat" style={{
          background: "#303747", color: "#fff", border: 0, borderRadius: 8,
          cursor: "pointer", width: 32, height: 32, fontSize: 18,
        }}>×</button>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: "#c4cbd7" }}>{description}</p>
      <Link href="/messages?full=1" onClick={onClose} style={{
        display: "inline-flex", justifyContent: "center", alignItems: "center",
        background: "#e52d40", color: "#fff", fontWeight: 700, fontSize: 13,
        borderRadius: 10, minHeight: 42, textDecoration: "none",
      }}>Mesajları tam sayfada aç →</Link>
    </section>
  );
}

class ChatErrorBoundary extends Component<PopupBoundaryProps, PopupBoundaryState> {
  state: PopupBoundaryState = { error: false };
  static getDerivedStateFromError(): PopupBoundaryState { return { error: true }; }
  componentDidCatch(error: Error) {
    console.error("[F1 Medipol] DM popup render error:", error);
  }
  render() {
    if (this.state.error) {
      return <ChatStatus title="Sohbet açılamadı" description="Sohbet penceresi yüklenirken bir sorun oluştu. Tam sayfa görünümünü deneyebilirsin." onClose={this.props.onClose} />;
    }
    return this.props.children;
  }
}

export default function DmDock({ isLight = false }: { isLight?: boolean }) {
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [uid, setUid] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [requests, setRequests] = useState(0);
  const [groupUnread, setGroupUnread] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [chatComponent, setChatComponent] = useState<ChatComponent | null>(null);
  const [loadError, setLoadError] = useState(false);
  const loadPending = useRef(false);

  const closePopup = useCallback(() => {
    setPopupOpen(false);
    setTargetId(null);
    setLoadError(false);
  }, []);

  // Load the chat code ONLY when a desktop chat actually opens.
  // The button itself remains responsive even if the chat chunk is unavailable.
  useEffect(() => {
    if (!popupOpen || chatComponent || loadPending.current || loadError) return;
    loadPending.current = true;
    void import("./MessagesClient").then(module => {
      setChatComponent(() => module.default);
    }).catch(error => {
      console.error("[F1 Medipol] DM popup download error:", error);
      setLoadError(true);
    }).finally(() => { loadPending.current = false; });
  }, [popupOpen, chatComponent, loadError]);

  useEffect(() => {
    if (!popupOpen || chatComponent || loadError) return;
    const timer = window.setTimeout(() => {
      console.warn("[F1 Medipol] DM component loading timed out");
      setLoadError(true);
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [popupOpen, chatComponent, loadError]);

  // Read the stored session immediately instead of blocking the icon on a network getUser() call.
  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUid(data.session?.user?.id || null);
    }).catch(error => console.warn("[F1 Medipol] DM session:", error));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUid(session?.user?.id || null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [supabase]);

  const update = useCallback(async () => {
    if (!uid) return;
    try {
      const [friends, friendRequests, groups] = await Promise.all([
        supabase.rpc("dm_list_friends"),
        supabase.rpc("dm_list_requests"),
        supabase.rpc("dm_group_list"),
      ]);
      if (!friends.error) setUnread(((friends.data || []) as Array<{ unread_count: number }>).reduce((n, item) => n + Number(item.unread_count || 0), 0));
      if (!friendRequests.error) setRequests(((friendRequests.data || []) as Array<{ direction: string }>).filter(item => item.direction === "incoming").length);
      if (!groups.error) setGroupUnread(((groups.data || []) as Array<{ unread_count: number }>).reduce((n, item) => n + Number(item.unread_count || 0), 0));
    } catch (error) {
      // Badge refresh failures must NEVER break the button.
      console.warn("[F1 Medipol] DM badge refresh:", error);
    }
  }, [supabase, uid]);

  useEffect(() => {
    if (!uid) { setUnread(0); setRequests(0); setGroupUnread(0); return; }
    void update();
    const timer = window.setInterval(() => { if (!document.hidden) void update(); }, 30000);
    const channel = supabase.channel(`dm-header-${uid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `recipient_id=eq.${uid}` }, () => void update())
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_friendships" }, () => void update())
      .subscribe();
    const refresh = () => { if (!document.hidden) void update(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("f1-dm-refresh", refresh);
    window.addEventListener("f1-dm-groups-updated", refresh);
    window.addEventListener("f1-notifications-updated", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("f1-dm-refresh", refresh);
      window.removeEventListener("f1-dm-groups-updated", refresh);
      window.removeEventListener("f1-notifications-updated", refresh);
      void supabase.removeChannel(channel);
    };
  }, [supabase, uid, update]);

  useEffect(() => {
    try {
      if (window.location.pathname !== "/messages") {
        window.sessionStorage.setItem("f1-dm-last-page", currentPage());
      }
    } catch (error) { console.warn("[F1 Medipol] DM page history:", error); }

    const handleOpen = (event: Event) => {
      const payload = (event as CustomEvent<{ userId?: string; view?: string }>).detail;
      if (isSmallDevice()) {
        const target = payload?.userId ? `?dm=${encodeURIComponent(payload.userId)}` : payload?.view === "groups" ? "?view=groups" : "";
        window.location.assign(`/messages${target}`);
      } else {
        setTargetId(payload?.userId || (payload?.view === "groups" ? "groups" : null));
        setLoadError(false);
        setPopupOpen(true);
      }
    };
    window.addEventListener("f1-dm-open", handleOpen);
    const handleResize = () => { if (isSmallDevice()) closePopup(); };
    window.addEventListener("resize", handleResize);

    // Preserve deep-link compatibility from prior DM versions.
    const params = new URLSearchParams(window.location.search);
    const deepLink = params.get("dm");
    const popupRequested = params.get("f1dm") === "open";
    const groupsRequested = params.get("dmview") === "groups";
    if (uid && window.location.pathname !== "/messages" && (popupRequested || deepLink || groupsRequested)) {
      if (isSmallDevice()) {
        window.location.replace(deepLink ? `/messages?dm=${encodeURIComponent(deepLink)}` : `/messages${groupsRequested ? "?view=groups" : ""}`);
      } else {
        setTargetId(deepLink || (groupsRequested ? "groups" : null));
        setLoadError(false);
        setPopupOpen(true);
        params.delete("f1dm");
        params.delete("dmview");
        params.delete("dm");
        const clean = window.location.pathname + (params.toString() ? `?${params.toString()}` : "") + window.location.hash;
        window.history.replaceState(window.history.state, "", clean);
      }
    }
    return () => {
      window.removeEventListener("f1-dm-open", handleOpen);
      window.removeEventListener("resize", handleResize);
    };
  }, [uid, pathname, closePopup]);

  const handleClick = () => {
    // No Next Link transition: the desktop click only toggles this portal.
    // A normal route transition had occasionally produced a blank background.
    if (isSmallDevice()) {
      window.location.assign("/messages?full=1");
      return;
    }
    setTargetId(null);
    setLoadError(false);
    setPopupOpen(previous => !previous);
  };

  // Keep the icon interactive while Supabase refreshes the cached session.
  // MessageClient enforces its own signed-in check when opened.
  const badgeCount = unread + requests + groupUnread;
  return <>
    <button type="button" onClick={handleClick} className={`${styles.headerButton} ${isLight ? styles.headerLight : ""}`}
      title="Mesajlar" aria-haspopup="dialog" aria-expanded={popupOpen}
      aria-label={`Mesajlar, ${unread + groupUnread} okunmamış, ${requests} arkadaşlık isteği`}
      style={{ textDecoration: "none", pointerEvents: "auto", position: "relative", zIndex: 3, touchAction: "manipulation", flexShrink: 0 }}>
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-3.6-.75L3 21l1.75-4.9A8.5 8.5 0 1 1 20 11.5Z" />
        <path d="M8 11.5h8m-8 3h5" />
      </svg>
      {badgeCount > 0 && <span className={styles.headerBadge}>{badgeCount > 99 ? "99+" : badgeCount}</span>}
    </button>
    {popupOpen && typeof document !== "undefined" && createPortal(
      <ChatErrorBoundary onClose={closePopup}>
        {loadError
          ? <ChatStatus title="Mesajlaşma yüklenemedi" description="Sohbet dosyası açılamadı. Sayfayı yenilemeyi veya tam ekran mesajları kullanmayı deneyebilirsin." onClose={closePopup} />
          : chatComponent
            ? <ChatRender Component={chatComponent} targetId={targetId} onClose={closePopup} />
            : <ChatStatus title="Mesajlar yükleniyor…" description="Sohbet hazırlanıyor. İlk açılışta kısa sürebilir." onClose={closePopup} />}
      </ChatErrorBoundary>,
      document.body,
    )}
  </>;
}

function ChatRender({ Component: MessagesClient, targetId, onClose }: {
  Component: ChatComponent; targetId: string | null; onClose: () => void;
}) {
  return <MessagesClient mode="popup" initialTarget={targetId} onClose={onClose} />;
}
