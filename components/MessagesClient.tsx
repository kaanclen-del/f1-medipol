"use client";

import Link from "next/link";
import HeaderThemeMenu from "./HeaderThemeMenu";
import { useChatGalleryWallpaper } from "./useChatGalleryWallpaper";
import dynamic from "next/dynamic";
import { ChatExpressionPicker, ChatMessageBody, messagePreview } from "./ChatExpressionKit";
import { ChatReplyQuote, createChatReply, focusQuotedMessage, parseChatReply, type ChatReplyTarget } from "./ChatReplyKit";
import ChatMessageGesture from "./ChatMessageGesture";
import ChatPinnedNotice, { type PinnedMessage } from "./ChatPinnedNotice";
const GroupChatClient = dynamic(() => import("./GroupChatClient"), { ssr: false });
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/utils/supabase/client";
import styles from "./MessagesClient.module.css";
import { useChatKeyboardBottomAnchor } from "./useChatKeyboardBottomAnchor";

type Theme = "gray" | "red" | "light";
type View = "chats" | "find" | "requests" | "groups";
type ChatWallpaper = "white" | "gray" | "red" | "blue" | "violet" | "custom";
const WALLPAPERS: {key:ChatWallpaper;title:string}[] = [
  {key:"white",title:"Beyaz"}, {key:"gray",title:"Gri"}, {key:"red",title:"F1 Kırmızı"},
  {key:"blue",title:"Gece Mavisi"}, {key:"violet",title:"Mor Neon"},
];
function isWallpaper(value:string|null):value is ChatWallpaper {return value === "custom" || WALLPAPERS.some(item=>item.key===value);}
type Friend = { friendship_id: string; user_id: string; display_name: string; avatar_url: string | null; last_message: string | null; last_at: string | null; unread_count: number };
type Request = { friendship_id: string; user_id: string; display_name: string; avatar_url: string | null; direction: "incoming" | "outgoing"; created_at: string };
type Person = { user_id: string; display_name: string; avatar_url: string | null; relationship: string };
type Message = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null; media_url?: string | null; media_kind?: string | null; media_mime?: string | null; media_name?: string | null; pending?: boolean; failed?: boolean; optimistic?: boolean };
type MediaRecord = { message_id: string; media_path: string; media_kind: string; media_mime: string; media_name: string };
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime", "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg"]);

function readTheme(): Theme {
  if (typeof document === "undefined") return "gray";
  const html = document.documentElement;
  const v = (html.getAttribute("data-theme") || html.getAttribute("data-site-theme") || "").toLowerCase();
  if (["light", "white", "açık", "acik"].includes(v)) return "light";
  if (["red", "f1-red", "kırmızı", "kirmizi"].includes(v)) return "red";
  try {
    for (const key of ["f1-site-theme", "site-theme", "siteTheme", "theme"]) {
      const stored = (localStorage.getItem(key) || "").toLowerCase();
      if (["light", "white", "açık", "acik"].includes(stored)) return "light";
      if (["red", "f1-red", "kırmızı", "kirmizi"].includes(stored)) return "red";
    }
  } catch {}
  return "gray";
}

function Icon({ name, size = 19 }: { name: "chat" | "users" | "search" | "close" | "send" | "back" | "check" | "plus" | "more"; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "chat" && <><path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-3.6-.75L3 21l1.75-4.9A8.5 8.5 0 1 1 20 11.5Z"/><path d="M8 11.5h8m-8 3h5"/></>}
    {name === "users" && <><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5"/></>}
    {name === "search" && <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>}
    {name === "close" && <path d="M5 5 19 19M19 5 5 19"/>}
    {name === "send" && <><path d="m3 11 18-8-8 18-2.5-7.5L3 11Z"/><path d="M10.5 13.5 21 3"/></>}
    {name === "back" && <path d="m15 5-7 7 7 7"/>}
    {name === "check" && <path d="m5 12 4 4L19 6"/>}
    {name === "plus" && <path d="M12 5v14M5 12h14"/>}
    {name === "more" && <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>}
  </svg>;
}
function Avatar({ name, src, small = false }: { name: string; src?: string | null; small?: boolean }) {
  return <span className={`${styles.avatar} ${small ? styles.avatarSmall : ""}`}>{src ? <img src={src} alt="" referrerPolicy="no-referrer" /> : <span>{name.charAt(0).toLocaleUpperCase("tr-TR") || "F"}</span>}</span>;
}
function formatTime(value: string | null) {
  if (!value) return "";
  try { return new Date(value).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
}
function validUuid(value: string) { return /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value); }

// Short-lived in-memory history shared by the DM modal and page. Message text is
// never written to localStorage/sessionStorage or sent to a different service.
const recentDirectHistory = new Map<string, Message[]>();
function rememberDirectHistory(key: string, items: Message[]) {
  if (recentDirectHistory.has(key)) recentDirectHistory.delete(key);
  recentDirectHistory.set(key, items.slice(-70));
  while (recentDirectHistory.size > 12) {
    const oldest = recentDirectHistory.keys().next().value;
    if (oldest === undefined) break;
    recentDirectHistory.delete(oldest);
  }
}

export default function MessagesClient({ mode = "page", onClose, initialTarget }: { mode?: "page" | "popup"; onClose?: () => void; initialTarget?: string | null }) {
  const [supabase] = useState(() => createClient());
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [theme, setTheme] = useState<Theme>("gray");
  const [wallpaper, setWallpaper] = useState<ChatWallpaper>("gray");
  const open = true;
  const [profileActions, setProfileActions] = useState(false);
  const [view, setView] = useState<View>("chats");
  const [active, setActive] = useState<string | null>(null);
  const gallery = useChatGalleryWallpaper(userId, active);
  const galleryPickerRef = useRef<HTMLInputElement>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<Person[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadedFor, setHistoryLoadedFor] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const retryEmptyHistory = useRef<Set<string>>(new Set());
  const historyCache = useRef<Map<string, Message[]>>(new Map());
  const [draft, setDraft] = useState("");
  const [replyTarget, setReplyTarget] = useState<ChatReplyTarget | null>(null);
  const [pinned, setPinned] = useState<PinnedMessage | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const draftInputRef = useRef<HTMLInputElement>(null);
  const [expressionsOpen, setExpressionsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState<{ text: string; from: string; name: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const friendsRef = useRef<Friend[]>([]);
  const countsRef = useRef<string | null>(null);
  const activeRef = useRef<string | null>(null);
  const openRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Reuse signed URLs until shortly before they expire; avoid resigning media every poll.
  const signedMediaCache = useRef<Map<string, { url: string; until: number }>>(new Map());
  const messageLoadVersion = useRef(0);
  const lastHistoryKey = useRef<string>("");
  const lastHistoryMedia = useRef<Map<string, Partial<Message>>>(new Map());
  const lastMediaCacheAt = useRef(0);

  // Each user's background choice is private to their browser and this conversation.
  useEffect(() => {
    if (!userId || !active) { setWallpaper("gray"); return; }
    try {
      const stored = localStorage.getItem(`f1-dm-wallpaper:${userId}:${active}`);
      setWallpaper(isWallpaper(stored) ? stored : "gray");
    } catch { setWallpaper("gray"); }
  }, [userId, active]);
  function changeWallpaper(next: ChatWallpaper) {
    setWallpaper(next);
    if (userId && active) {
      try { localStorage.setItem(`f1-dm-wallpaper:${userId}:${active}`, next); } catch { /* Optional local preference. */ }
    }
    setProfileActions(false);
  }

  async function pickGalleryPhoto(file: File) {
    const selectedChat = active;
    const saved = await gallery.save(file);
    // Dosya islenirken baska sohbete gecilmisse onun secimini degistirme.
    if (saved && selectedChat && activeRef.current === selectedChat) changeWallpaper("custom");
  }

  useEffect(() => {
    activeRef.current = active;
    messageLoadVersion.current++; // Ignore responses for the previous conversation.
    setProfileActions(false);
    setExpressionsOpen(false);
    setReplyTarget(null);
    setHistoryError("");
    const cached = active ? (historyCache.current.get(active) ?? (userId ? recentDirectHistory.get(`${userId}:${active}`) : undefined)) : undefined;
    if (active && cached) historyCache.current.set(active, cached);
    setMessages(cached ?? []);
    setHistoryLoadedFor(active && cached ? active : null);
    setHistoryLoading(Boolean(active && !cached));
  }, [active]);
  function quoteMessage(message: Message) {
    const text = parseChatReply(message.body).text;
    setReplyTarget({id:message.id,author:message.sender_id === userId ? "Sen" : (friendsRef.current.find(f => f.user_id === message.sender_id)?.display_name || "Üye"),preview:messagePreview(text).slice(0,65)});
    draftInputRef.current?.focus();
  }
  useEffect(() => { openRef.current = open; }, [open]);

  // One shared pin per DM, synchronized across devices by Supabase.
  useEffect(() => {
    if (!userId || !active) { setPinned(null); return; }
    const target=active;
    let cancelled=false;
    setPinned(null);
    const readPin=async()=>{
      const {data,error}=await supabase.rpc("dm_pin_get_direct",{p_other:target});
      if(!cancelled && !error) setPinned(((data||[])[0] as PinnedMessage | undefined)||null);
    };
    void readPin();
    const onFocus=()=>{if(!document.hidden)void readPin();};
    window.addEventListener("focus",onFocus);
    return ()=>{cancelled=true;window.removeEventListener("focus",onFocus);};
  },[active,userId,supabase]);

  async function togglePin(message:Message|null) {
    const target=active;
    if(!target || pinBusy)return;
    const next=message && pinned?.message_id!==message.id ? message.id : null;
    if(next && !validUuid(next))return;
    setPinBusy(true);
    const {error}=await supabase.rpc("dm_pin_set_direct",{p_other:target,p_message:next});
    if(error){setStatus("Mesaj sabitlenemedi. Supabase DM_PIN_V13.sql kurulumu gerekli olabilir: "+error.message);}
    else if(activeRef.current===target){
      const {data}=await supabase.rpc("dm_pin_get_direct",{p_other:target});
      setPinned(((data||[])[0] as PinnedMessage | undefined)||null);
    }
    setPinBusy(false);
  }

  function copyMessage(body:string) {
    if(!navigator.clipboard?.writeText){setStatus("Kopyalama için güvenli bağlantı (HTTPS/localhost) gerekli.");return;}
    void navigator.clipboard.writeText(parseChatReply(body).text).catch(()=>setStatus("Mesaj kopyalanamadı."));
  }


  const refresh = useCallback(async () => {
    if (!userId) return;
    const [f, r] = await Promise.all([supabase.rpc("dm_list_friends"), supabase.rpc("dm_list_requests")]);
    if (f.error || r.error) {
      setStatus("Mesajlaşma verileri alınamadı. DM_FRIENDS_SETUP.sql kurulumunu kontrol et.");
      return;
    }
    friendsRef.current = (f.data || []) as Friend[];
    setFriends(friendsRef.current);
    const freshRequests = (r.data || []) as Request[];
    setRequests(freshRequests);
    const counts = `${friendsRef.current.reduce((n, item) => n + Number(item.unread_count || 0), 0)}:${freshRequests.filter(item => item.direction === "incoming").length}`;
    if (countsRef.current !== counts) {
      countsRef.current = counts;
      window.dispatchEvent(new Event("f1-notifications-updated"));
    }
    setStatus("");
  }, [supabase, userId]);

  const loadMessages = useCallback(async (otherId: string) => {
    if (!userId || !validUuid(otherId)) return;
    const version = ++messageLoadVersion.current;
    const { data, error } = await supabase.rpc("dm_get_messages", { p_other: otherId, p_limit: 70 });
    if (activeRef.current !== otherId || version !== messageLoadVersion.current) return;
    if (error) {
      setHistoryError(error.message);
      setHistoryLoading(false);
      setStatus(error.message);
      return;
    }
    const base = (data || []) as Message[];
    // A short-lived empty RPC response must not erase previously displayed
    // messages. Recheck once; if the conversation is truly empty, accept that.
    const previouslySeen = historyCache.current.get(otherId) || recentDirectHistory.get(`${userId}:${otherId}`) || [];
    if (base.length === 0 && previouslySeen.length > 0 && !retryEmptyHistory.current.has(otherId)) {
      retryEmptyHistory.current.add(otherId);
      window.setTimeout(() => {
        if (activeRef.current === otherId && !document.hidden) void loadMessages(otherId);
      }, 700);
      setHistoryLoading(false);
      setHistoryLoadedFor(otherId);
      return;
    }
    retryEmptyHistory.current.delete(otherId);
    const key = `${otherId}:${base.map(message => message.id).join(",")}`;
    const recent = lastHistoryKey.current === key && Date.now() - lastMediaCacheAt.current < 25 * 60 * 1000;
    const oldById = new Map((historyCache.current.get(otherId) || []).map(m => [m.id, m] as const));
    let byId = recent ? lastHistoryMedia.current : new Map<string, Partial<Message>>();

    // Render history immediately when the message RPC completes. Media
    // signatures must never block the text conversation or show a false empty state.
    const initial = base.map(m => {
      const old = oldById.get(m.id);
      return {
        ...m,
        ...(old?.media_url ? {
          media_url: old.media_url, media_kind: old.media_kind,
          media_mime: old.media_mime, media_name: old.media_name,
        } : {}),
        ...byId.get(m.id),
      };
    });
    historyCache.current.set(otherId, initial);
    rememberDirectHistory(`${userId}:${otherId}`, initial);
    setMessages(previous => {
      const serverIds = new Set(initial.map(m => m.id));
      const local = previous.filter(m =>
        (m.pending || m.failed || m.optimistic) && !serverIds.has(m.id) &&
        (m.sender_id === otherId || m.recipient_id === otherId));
      return [...initial, ...local];
    });
    setHistoryLoadedFor(otherId);
    setHistoryLoading(false);
    setHistoryError("");

    if (!recent) {
      // Hydrate image, video and voice messages without delaying conversation text.
      const { data: mediaData, error: mediaError } = await supabase.rpc("dm_get_media_metadata", { p_other: otherId });
      if (activeRef.current !== otherId || version !== messageLoadVersion.current) return;
      if (mediaError) console.warn("DM media metadata could not be refreshed:", mediaError.message);
      const ids = new Set(base.map(message => message.id));
      const media = ((mediaData || []) as MediaRecord[]).filter(item => ids.has(item.message_id));
      const signed = await Promise.all(media.map(async item => {
        const cached = signedMediaCache.current.get(item.media_path);
        let url = cached && cached.until > Date.now() ? cached.url : null;
        if (!url) {
          const { data: sign } = await supabase.storage.from("dm-media").createSignedUrl(item.media_path, 1800);
          url = sign?.signedUrl || null;
          if (url) signedMediaCache.current.set(item.media_path, {url, until:Date.now() + 25 * 60 * 1000});
        }
        return [item.message_id, {
          media_url:url, media_kind:item.media_kind,
          media_mime:item.media_mime, media_name:item.media_name,
        }] as const;
      }));
      if (activeRef.current !== otherId || version !== messageLoadVersion.current) return;
      byId = new Map<string, Partial<Message>>(signed);
      lastHistoryKey.current = key;
      lastHistoryMedia.current = byId;
      lastMediaCacheAt.current = Date.now();
      const hydrate = (m: Message) => byId.has(m.id) ? {...m, ...byId.get(m.id)} : m;
      const cachedList = historyCache.current.get(otherId) || [];
      const withMedia = cachedList.map(hydrate);
      historyCache.current.set(otherId, withMedia);
      rememberDirectHistory(`${userId}:${otherId}`, withMedia);
      setMessages(previous => previous.map(hydrate));
    }
    // Read state can be updated later; it does not block the visible messages.
    if (base.some(item => item.recipient_id === userId && !item.read_at)) {
      const {error: readError} = await supabase.rpc("dm_mark_read", {p_other:otherId});
      if (!readError) {
        window.dispatchEvent(new Event("f1-notifications-updated"));
        void refresh();
      }
    }
  }, [supabase, userId, refresh]);

  useEffect(() => {
    setMounted(true);
    const update = () => setTheme(readTheme());
    update();
    const watcher = new MutationObserver(update);
    watcher.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-site-theme", "class"] });
    window.addEventListener("theme-changed", update);
    window.addEventListener("site-theme-changed", update);
    return () => { watcher.disconnect(); window.removeEventListener("theme-changed", update); window.removeEventListener("site-theme-changed", update); };
  }, []);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(({ data }) => { if (alive) {setUserId(data.user?.id || null);setAuthReady(true);} });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
      setAuthReady(true);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    void refresh();
    const onFocus = () => { void refresh(); if (activeRef.current) void loadMessages(activeRef.current); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("f1-dm-refresh", onFocus);
    const timer = window.setInterval(() => { if (!document.hidden) onFocus(); }, 25000);
    const channel = supabase.channel(`dm-dock-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `recipient_id=eq.${userId}` }, (payload) => {
        const next = payload.new as { sender_id?: string; body?: string };
        void refresh();
        if (activeRef.current === next.sender_id && openRef.current) {
          void loadMessages(next.sender_id);
        } else if (next.sender_id) {
          const body = String(next.body || "Yeni mesaj").slice(0, 65);
          const senderName = friendsRef.current.find(f => f.user_id === next.sender_id)?.display_name || "Bir arkadaşın";
          setToast({ text: body, from: next.sender_id, name: senderName });
          if (toastTimer.current) clearTimeout(toastTimer.current);
          toastTimer.current = setTimeout(() => setToast(null), 6500);
          // Site kapaliyken cihaz bildirimi sunucunun web-push servisiyle gonderilir.
          // Tarayicida da ayri bir bildirim olusturup cift uyari vermiyoruz.
        }
        window.dispatchEvent(new Event("f1-notifications-updated"));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_friendships" }, () => void refresh())
      .subscribe();
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("f1-dm-refresh", onFocus);
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [supabase, userId, refresh, loadMessages]);

  useEffect(() => { if (active && userId && open) void loadMessages(active); }, [active, userId, open, loadMessages]);
  useEffect(() => {
    // Scroll messages only. scrollIntoView can scroll the whole mobile viewport.
    if (open && active) {
      const list = bottomRef.current?.parentElement;
      if (list) list.scrollTop = list.scrollHeight;
    }
  }, [messages.length, open, active]);

  // Keep the newest visible message aligned above the iOS keyboard as its viewport
  // resizes. Respect manual scrollback: only anchor when already near the bottom.
  useChatKeyboardBottomAnchor(bottomRef, draftInputRef, mode === "page" && Boolean(active) && view !== "groups");

  // Keep the composer aligned with the iOS visual viewport as its keyboard animates.
  // Coalesce resize/scroll events into one write per animation frame.
  useEffect(() => {
    if (mode !== "page" || (window.innerWidth > 1199 && !(window.matchMedia("(pointer: coarse)").matches && window.innerWidth <= 1500))) return;
    const style = document.documentElement.style;
    const visual = window.visualViewport;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let frame = 0;
    let lastHeight = -1;
    let lastTop = -1;
    let lastPad = "";
    let lastKeyboard = false;
    let restingHeight = Math.max(window.innerHeight, visual?.height || 0);
    const apply = () => {
      frame = 0;
      const height = Math.round(visual?.height || window.innerHeight);
      const top = Math.round(visual?.offsetTop || 0);
      if (height !== lastHeight) {style.setProperty("--f1-dm-height", `${height}px`);lastHeight = height;}
      if (top !== lastTop) {style.setProperty("--f1-dm-top", `${top}px`);lastTop = top;}
      const focused = document.activeElement === draftInputRef.current ||
        document.activeElement?.getAttribute("aria-label") === "Gruba mesaj yaz";
      if (!focused) restingHeight = Math.max(restingHeight, height);
      const nextKeyboard = Boolean(focused && (
        window.innerHeight - height - top > 130 || restingHeight - height > 135
      ));
      if (nextKeyboard !== lastKeyboard) {
        lastKeyboard = nextKeyboard;
        setKeyboardOpen(nextKeyboard);
      }
      const pad = nextKeyboard ? "4px" : "calc(11px + env(safe-area-inset-bottom,0px))";
      if (pad !== lastPad) {style.setProperty("--f1-dm-composer-pad", pad);lastPad = pad;}
    };
    const queue = () => {if (!frame) frame = window.requestAnimationFrame(apply);};
    apply();
    visual?.addEventListener("resize", queue);
    visual?.addEventListener("scroll", queue);
    window.addEventListener("orientationchange", queue);
    document.addEventListener("focusin", queue);
    document.addEventListener("focusout", queue);
    return () => {
      visual?.removeEventListener("resize", queue);
      visual?.removeEventListener("scroll", queue);
      window.removeEventListener("orientationchange", queue);
      document.removeEventListener("focusin", queue);
      document.removeEventListener("focusout", queue);
      if (frame) window.cancelAnimationFrame(frame);
      style.removeProperty("--f1-dm-height");
      style.removeProperty("--f1-dm-top");
      style.removeProperty("--f1-dm-composer-pad");
      document.body.style.overflow = previousOverflow;
    };
  }, [mode]);

  useEffect(() => {
    if (!userId) return;
    const params = new URLSearchParams(window.location.search);
    const requested = initialTarget || params.get("dm");
    if (requested === "groups") { setView("groups");setActive(null); }
    else if (requested === "requests") { setView("requests"); setActive(null); }
    else if (params.get("dmview") === "groups") { setView("groups"); setActive(null); }
    else if (requested && validUuid(requested)) { setView("chats"); setActive(requested); }
    const openExternal = (event: Event) => {
      const next = (event as CustomEvent<{ userId?: string }>).detail?.userId;
      if (next && validUuid(next)) { setActive(next); setView("chats"); }
      else { setActive(null); setView("chats"); }
    };
    window.addEventListener("f1-dm-open", openExternal);
    return () => window.removeEventListener("f1-dm-open", openExternal);
  }, [userId, initialTarget]);

  useEffect(() => {
    if (view !== "find" || search.trim().length < 2 || !userId) { setFound([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc("dm_find_users", { p_search: search.trim() });
      if (!cancelled) { if (error) setStatus(error.message); else { setFound((data || []) as Person[]); setStatus(""); } }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [view, search, userId, supabase]);

  async function act(fn: () => PromiseLike<{ error: { message: string } | null }>, success: string) {
    if (busy) return;
    setBusy(true); setStatus("");
    try {
      const { error } = await fn();
      if (error) throw new Error(error.message);
      setStatus(success);
      await refresh();
      if (search.trim().length >= 2 && view === "find") {
        const { data } = await supabase.rpc("dm_find_users", { p_search: search.trim() });
        setFound((data || []) as Person[]);
      }
      window.dispatchEvent(new Event("f1-notifications-updated"));
    } catch (e) { setStatus(e instanceof Error ? e.message : "İşlem başarısız oldu."); }
    finally { setBusy(false); }
  }

  // Optimistic send: show the message immediately. The database still decides
  // whether it was really sent; failures remain visible and retryable.
  async function sendBody(body: string, retryId?: string) {
    const recipient = active;
    if (!userId || !recipient || !body.trim() || busy) return;
    const outgoing = retryId ? body : createChatReply(body, replyTarget, 1000);
    if (outgoing === null) { setStatus("Yanıt alıntısı dahil mesaj 1000 karakteri geçemez. Mesajı biraz kısalt."); return; }
    const tempId = retryId || `local-${crypto.randomUUID()}`;
    setReplyTarget(null);
    setBusy(true);
    setStatus("");
    setExpressionsOpen(false);
    messageLoadVersion.current += 1; // invalidate older in-flight reads
    if (retryId) {
      setMessages(previous => previous.map(m => m.id === retryId ? {...m, pending:true, failed:false} : m));
    } else {
      setMessages(previous => [...previous, {
        id: tempId, sender_id: userId, recipient_id: recipient,
        body: outgoing, created_at: new Date().toISOString(), read_at: null, pending:true, optimistic:true,
      }]);
    }
    try {
      const { data: sentId, error } = await supabase.rpc("dm_send_message", { p_other: recipient, p_body: outgoing });
      if (error) throw new Error(error.message);
      setMessages(previous => previous.map(m => m.id === tempId ? {
        ...m, id: typeof sentId === "string" ? sentId : tempId,
        pending: false, failed: false,
      } : m));
      if (typeof sentId === "string") void notifyRecipient(sentId);
      // Do not wait for message/media/history reload to unlock the composer.
      setBusy(false);
      if (activeRef.current === recipient) void loadMessages(recipient);
      void refresh();
    } catch (error) {
      setMessages(previous => previous.map(m => m.id === tempId ? {...m, pending:false, failed:true} : m));
      setStatus(error instanceof Error ? `Mesaj gönderilemedi: ${error.message}` : "Mesaj gönderilemedi.");
      setBusy(false);
    }
  }

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    // Keep the keyboard open after sending, without forcing focus on outside taps.
    draftInputRef.current?.focus({ preventScroll: true });
    setDraft("");
    void sendBody(body);
  }

  async function notifyRecipient(messageId: string) {
    // Push is optional; failed device notification must not undo a sent message.
    try {
      await fetch("/api/dm/push", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({messageId}), keepalive: true,
      });
    } catch {}
  }

  async function uploadFile(file: File) {
    if (!userId || !active || busy) return;
    const mime = file.type.toLowerCase().split(";")[0];
    const kind = mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : "";
    if (!ALLOWED.has(mime) || !kind) {setStatus("Desteklenmeyen dosya türü."); return;}
    const maxSize = kind === "audio" ? 8 * 1024 * 1024 : kind === "video" ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {setStatus(`Dosya çok büyük. En fazla ${Math.round(maxSize/1024/1024)} MB yükleyebilirsin.`);return;}
    setBusy(true); setStatus("Dosya yükleniyor...");
    const recipient = active;
    const extension = mime.split("/")[1]?.replace("quicktime","mov").replace("jpeg","jpg") || "bin";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    try {
      const {error: uploadError} = await supabase.storage.from("dm-media")
        .upload(path, file, {contentType: mime, upsert:false});
      if (uploadError) throw uploadError;
      const {data: sentId,error: sendError} = await supabase.rpc("dm_send_media", {
        p_other:recipient,p_path:path,p_kind:kind,p_mime:mime,p_name:file.name,
      });
      if (sendError) throw sendError;
      if (typeof sentId === "string") void notifyRecipient(sentId);
      setStatus("");
      await loadMessages(recipient);
      await refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Dosya gönderilemedi. SQL yükseltmesini kontrol et.");
    } finally { setBusy(false); if (fileInputRef.current) fileInputRef.current.value=""; }
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("Tarayıcın mikrofonla ses kaydını desteklemiyor.");return;
    }
    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const supported=["audio/webm;codecs=opus","audio/mp4","audio/webm","audio/ogg"]
        .find(t=>MediaRecorder.isTypeSupported(t));
      if (!supported) {stream.getTracks().forEach(t=>t.stop());setStatus("Tarayıcı uygun ses formatı sunmuyor.");return;}
      const recorder=new MediaRecorder(stream,{mimeType:supported});
      const pieces:BlobPart[]=[];
      recorderRef.current=recorder; microphoneRef.current=stream;
      recorder.ondataavailable=e=>{if(e.data.size)pieces.push(e.data);};
      recorder.onstop=()=>{
        stream.getTracks().forEach(t=>t.stop());microphoneRef.current=null;recorderRef.current=null;
        if (!pieces.length) return;
        const mime=supported.split(";")[0];
        const file=new File(pieces,`ses-kaydi-${Date.now()}.${mime==="audio/mp4"?"m4a":"webm"}`,{type:mime});
        void uploadFile(file);
      };
      recorder.start();setRecording(true);setStatus("Kayıt sürüyor. Bitirmek için tekrar mikrofona bas.");
    } catch {setStatus("Mikrofon izni verilmedi veya cihaz kullanılamıyor.");}
  }

  useEffect(() => () => {
    const recorder=recorderRef.current;
    if(recorder){recorder.onstop=null;if(recorder.state!=="inactive")recorder.stop();}
    microphoneRef.current?.getTracks().forEach(t=>t.stop());
  }, []);

  function closePanel() {
    if (mode === "popup") {
      onClose?.();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.assign("/");
    }
  }

  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (mode !== "popup" || initialTarget || !userId || autoOpenedRef.current || friends.length !== 1 || active || view !== "chats") return;
    const requested = new URLSearchParams(window.location.search).get("dm");
    if (requested) return;
    autoOpenedRef.current = true;
    setActive(friends[0].user_id);
  }, [mode, initialTarget, userId, friends, active, view]);

  const unread = friends.reduce((acc, friend) => acc + Number(friend.unread_count || 0), 0);
  const waiting = requests.filter(r => r.direction === "incoming").length;
  const total = unread + waiting;
  const partner = friends.find(item => item.user_id === active);
  const canChat = Boolean(partner);
  const incoming = requests.filter(item => item.direction === "incoming");
  const outgoing = requests.filter(item => item.direction === "outgoing");
  if (!authReady) return <div className={`${styles.portal} ${mode === "popup" ? styles.popupMode : styles.pageMode} ${styles[theme] || ""}`}><div className={styles.signinMessage}>Mesajlar yükleniyor...</div></div>;
  if (!userId) return <div className={`${styles.portal} ${mode === "popup" ? styles.popupMode : styles.pageMode} ${styles[theme] || ""}`}><div className={styles.signinMessage}><h1>Mesajlaşmak için giriş yap</h1><Link href="/login">Giriş ekranına git →</Link></div></div>;

  const dialog = (
    <div className={`${styles.portal} ${mode === "popup" ? styles.popupMode : styles.pageMode} ${styles[theme] || ""} ${mode === "page" && keyboardOpen ? styles.keyboardOpen : ""}`}>
      <section className={styles.panel} role="region" aria-label="F1 Medipol mesajlar">

          <header className={styles.panelHead}>
            {active ? <button className={styles.iconBtn} onClick={() => { setActive(null); setMessages([]); }} aria-label="Konuşmalara dön"><Icon name="back"/></button> : <span className={styles.headIcon}><Icon name="chat" size={21}/></span>}
            <div className={styles.heading}>{active && partner ? <div className={styles.profileHeader}>
              <button type="button" className={styles.profileAvatarButton} onClick={()=>setProfileActions(v=>!v)} aria-expanded={profileActions} aria-label="Kişi işlemlerini aç"><Avatar small name={partner.display_name} src={partner.avatar_url}/></button>
              <Link className={styles.profileNameLink} href={`/members/${partner.user_id}`} title="Gerçek profili ziyaret et"><strong>{partner.display_name}</strong><small>Profilini ziyaret et ↗</small></Link>
            </div> : <><strong>Mesajlar</strong><small>{unread} okunmamış mesaj · {waiting} istek</small></>}</div>
            {mode === "page" && <HeaderThemeMenu compact />}
            {active && canChat && <button className={styles.iconBtn} title="Kişi işlemleri" aria-label="Kişi işlemleri" onClick={()=>setProfileActions(v=>!v)} aria-expanded={profileActions}><Icon name="more" size={19}/></button>}
            {!active && view === "chats" && <button className={styles.iconBtn} onClick={() => {setView("find");setSearch("");}} aria-label="Yeni sohbet başlat" title="Yeni sohbet"><Icon name="plus"/></button>}
            <button className={styles.iconBtn} onClick={closePanel} aria-label="Mesajlaşmayı kapat"><Icon name="close"/></button>
          </header>
          {active && partner && profileActions && <div className={styles.profileActionMenu} role="menu" aria-label="Arkadaş işlemleri">
            <div className={styles.profileActionCaption}><Avatar small name={partner.display_name} src={partner.avatar_url}/><span><strong>{partner.display_name}</strong><small>Kişi işlemleri</small></span></div>
            <div className={styles.wallpaperSelector}>
              <div className={styles.wallpaperLabel}>SOHBET ARKA PLANI</div>
              <div className={styles.wallpaperChoices} role="group" aria-label="Sohbet arka planını seç">
                {WALLPAPERS.map(option => <button
                  type="button" key={option.key} title={option.title}
                  className={`${styles.wallpaperChoice} ${wallpaper === option.key ? styles.wallpaperChosen : ""}`}
                  onClick={() => changeWallpaper(option.key)} aria-pressed={wallpaper === option.key}
                ><span className={styles.wallpaperPreview} data-wallpaper={option.key}/><span>{option.title}</span></button>)}
              </div>
              <input ref={galleryPickerRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className={styles.fileHidden}
                aria-label="Galeriden sohbet arka planı seç" onChange={event => {
                  const photo = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (photo) void pickGalleryPhoto(photo);
                }} />
              <button type="button" className={`${styles.galleryPickButton} ${wallpaper === "custom" ? styles.galleryPickActive : ""}`}
                disabled={gallery.saving} onClick={() => galleryPickerRef.current?.click()}>
                📷 {gallery.saving ? "Fotoğraf hazırlanıyor..." : "Galeriden fotoğraf seç"}{wallpaper === "custom" ? " ✓" : ""}
              </button>
              {gallery.error && <p className={styles.galleryError} role="status">{gallery.error}</p>}
              <small className={styles.galleryHint}>Bu sohbete özel, yalnızca bu cihazda saklanır. Diğer kullanıcı görmez.</small>
            </div>
            <Link role="menuitem" href={`/members/${partner.user_id}`} onClick={()=>setProfileActions(false)}>↗ &nbsp; Profili ziyaret et</Link>
            <button role="menuitem" disabled={busy} onClick={()=>{
              if(confirm(`${partner.display_name} ile arkadaşlığını kaldırmak istiyor musun? Konuşma geçmişi de silinecek.`)) {
                void act(()=>supabase.rpc("dm_remove_friend",{p_target:partner.user_id}),"Arkadaşlıktan çıkarıldı.").then(()=>{setActive(null);setProfileActions(false);});
              }
            }}>♧ &nbsp; Arkadaşlıktan çıkar</button>
            <button role="menuitem" className={styles.dangerAction} disabled={busy} onClick={()=>{
              if(confirm(`${partner.display_name} adlı kişiyi engellemek istiyor musun? Arkadaşlık ve konuşma geçmişi silinecek.`)) {
                void act(()=>supabase.rpc("dm_block_user",{p_target:partner.user_id,p_block:true}),"Kullanıcı engellendi.").then(()=>{setActive(null);setProfileActions(false);});
              }
            }}>⊘ &nbsp; Kullanıcıyı engelle</button>
            <button className={styles.dismissActions} onClick={()=>setProfileActions(false)}>Vazgeç</button>
          </div>}
          {view === "groups" && !active ? (
            <GroupChatClient userId={userId} onBack={() => setView("chats")} compact={keyboardOpen && mode === "page"} />
          ) : active ? (
            <>
              {canChat && <ChatPinnedNotice pin={pinned} busy={pinBusy} onJump={id=>{if(!focusQuotedMessage(id))setStatus("Sabitlenen mesaj son 70 mesaj arasında değil.");}} onRemove={()=>void togglePin(null)}/>}
              <div className={`${styles.chatMessages} ${wallpaper === "custom" ? styles.galleryWallpaper : styles[`wallpaper_${wallpaper}`]}`}
                style={wallpaper === "custom" && gallery.url ? {
                  backgroundImage: `linear-gradient(180deg,rgba(5,9,17,.25),rgba(5,9,17,.55)),url("${gallery.url}")`,
                  backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat",
                } : undefined}>
                {!canChat && <div className={styles.empty}>Bu kullanıcıyla konuşmak için arkadaş olmanız gerekiyor. Arkadaşlarını veya isteklerini kontrol et.</div>}
                {canChat && messages.length === 0 && historyError && <div className={styles.historyError} role="alert">Mesajlar alınamadı. Bağlantını kontrol edip sohbeti tekrar açabilirsin.</div>}
                {canChat && messages.length === 0 && !historyError && (historyLoading || historyLoadedFor !== active) &&
                  <div className={styles.historyGhost} role="status" aria-label="Mesajlar hazırlanıyor"><span/><span/><span/></div>}
                {canChat && messages.map(m => <div id={`f1-chat-message-${m.id}`} key={m.id} className={`${styles.bubbleRow} ${m.sender_id === userId ? styles.mine : ""}`}>
                  <ChatMessageGesture disabled={Boolean(m.pending || m.failed)} pinBusy={pinBusy} pinned={pinned?.message_id===m.id}
                    onReply={()=>quoteMessage(m)} onPin={()=>void togglePin(m)} onCopy={()=>copyMessage(m.body)}>
                    <div className={styles.bubble}>
                    {parseChatReply(m.body).quote && <ChatReplyQuote quote={parseChatReply(m.body).quote!} onJump={focusQuotedMessage}/>}
                    {m.media_url && m.media_kind === "image" ? <a href={m.media_url} target="_blank" rel="noopener noreferrer" aria-label="Fotoğrafı aç"><img className={styles.mediaImage} src={m.media_url} alt={m.media_name || "Gönderilen fotoğraf"}/></a>
                      : m.media_url && m.media_kind === "video" ? <video className={styles.mediaVideo} src={m.media_url} controls playsInline preload="metadata" />
                      : m.media_url && m.media_kind === "audio" ? <audio className={styles.mediaAudio} src={m.media_url} controls preload="metadata" />
                      : <ChatMessageBody body={parseChatReply(m.body).text}/>}
                    <small>{formatTime(m.created_at)} {m.pending ? "· Gönderiliyor…" : m.failed ? "· Gönderilemedi" : m.sender_id === userId ? (m.read_at ? "· Görüldü" : "· Gönderildi") : ""}</small>
                    {m.failed && <button type="button" className={styles.retrySend} disabled={busy} onClick={() => void sendBody(m.body, m.id)}>Tekrar dene ↻</button>}
                    </div>
                  </ChatMessageGesture>
                  {m.sender_id !== userId && <button title="Mesajı bildir" className={styles.report} onClick={() => {
                    if (confirm("Bu mesajı moderatörlere bildirilsin mi?")) void act(() => supabase.rpc("dm_report_message", { p_message: m.id, p_reason: "Uygunsuz mesaj" }), "Mesaj bildirildi.");
                  }}>Bildir</button>}
                </div>)}
                <div ref={bottomRef}/>
              </div>
              {canChat && replyTarget && <div className={styles.replyDraft}><ChatReplyQuote quote={replyTarget} composing onJump={focusQuotedMessage}/><button type="button" onClick={()=>setReplyTarget(null)} aria-label="Yanıtı iptal et">✕</button></div>}
              {canChat && <form onSubmit={send} className={styles.composer}>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" className={styles.fileHidden} aria-label="Fotoğraf veya video ekle" onChange={event=>{const f=event.target.files?.[0];if(f)void uploadFile(f);}}/>
                <button type="button" onClick={()=>fileInputRef.current?.click()} disabled={busy||recording} title="Fotoğraf veya video gönder" aria-label="Fotoğraf veya video ekle" className={styles.attachBtn}>＋</button>
                <div className={styles.expressionAnchor}>
                  <button type="button" className={styles.attachBtn} title="Emoji veya çıkartma" aria-label="Emoji ve çıkartmaları aç" aria-expanded={expressionsOpen}
                    onClick={() => setExpressionsOpen(value => !value)}>☺</button>
                  {expressionsOpen && <ChatExpressionPicker
                    onEmoji={emoji => { setDraft(previous => (previous + emoji).slice(0,1000)); setExpressionsOpen(false); }}
                    onSticker={value => { setExpressionsOpen(false); void sendBody(value); }}
                    onClose={() => setExpressionsOpen(false)} />}
                </div>
                <input ref={draftInputRef} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Escape") setReplyTarget(null); }} maxLength={1000} placeholder="Mesaj yaz..." aria-label="Yeni mesaj"/>
                <button type="button" disabled={busy} onClick={()=>void toggleRecording()} aria-label={recording?"Ses kaydını bitir":"Ses kaydet"} title={recording?"Kaydı bitir":"Ses kaydet"} className={`${styles.attachBtn} ${recording?styles.recording:""}`}>{recording ? <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" /></svg> : <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="12" rx="3" /><path d="M5.5 10.5a6.5 6.5 0 0 0 13 0M12 17v4M8.5 21h7" /></svg>}</button>
                <button type="submit"
                  onPointerDown={event => { if (document.activeElement === draftInputRef.current) event.preventDefault(); }}
                  onClick={() => draftInputRef.current?.focus({ preventScroll: true })}
                  disabled={!draft.trim() || busy || recording} aria-label="Mesaj gönder"><Icon name="send"/></button>
              </form>}
            </>
          ) : (
            <>
              <div className={styles.tabs}>
                <button className={view === "chats" ? styles.selected : ""} onClick={() => setView("chats")}><Icon name="chat" size={16}/> Sohbetler</button>
                <button className={view === "find" ? styles.selected : ""} onClick={() => setView("find")}><Icon name="search" size={16}/> Kişi bul</button>
                <button className={view === "requests" ? styles.selected : ""} onClick={() => setView("requests")}><Icon name="users" size={16}/> İstekler {waiting > 0 && <em>{waiting}</em>}</button>
                <button className={view === "groups" ? styles.selected : ""} onClick={() => {setActive(null);setView("groups");}}><Icon name="users" size={16}/> Gruplar</button>
              </div>
              <div className={styles.listBody}>
                {view === "chats" && <div className={styles.listSectionHeader}><strong>Son konuşmalar</strong><span>{friends.length} sohbet</span></div>}
                {view === "chats" && mode === "popup" && friends.length > 1 && <p className={styles.chooseHint}>Mesaj yazmak için bir arkadaşının üzerine dokun.</p>}
                {view === "chats" && <>
                  {friends.length === 0 && <div className={styles.empty}>Henüz arkadaşın yok. “Kişi bul” sekmesinden kullanıcı arayıp arkadaşlık isteği gönder.</div>}
                  {friends.map(friend => <button className={styles.friendItem} key={friend.user_id} onClick={() => { setActive(friend.user_id); setDraft(""); }}>
                    <Avatar name={friend.display_name} src={friend.avatar_url}/><span className={styles.friendCopy}><strong>{friend.display_name}</strong><small>{messagePreview(parseChatReply(friend.last_message || "").text)}</small></span>
                    <span className={styles.meta}>{friend.unread_count > 0 ? <b>{friend.unread_count}</b> : <small>{formatTime(friend.last_at)}</small>}</span>
                  </button>)}
                </>}
                {view === "find" && <>
                  <label className={styles.searchBox}><Icon name="search" size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kullanıcı adı veya görünen ad (en az 2 harf)" maxLength={40}/></label>
                  {search.trim().length < 2 && <div className={styles.empty}>Arkadaş eklemek için en az iki karakter yaz.</div>}
                  {search.trim().length >= 2 && found.length === 0 && <div className={styles.empty}>Bu aramayla eşleşen kullanıcı bulunamadı.</div>}
                  {found.map(person => <div className={styles.personItem} key={person.user_id}>
                    <Avatar small name={person.display_name} src={person.avatar_url}/><strong>{person.display_name}</strong>
                    {person.relationship === "accepted" ? <button disabled className={styles.secondary}>Arkadaşın</button>
                      : person.relationship === "pending" ? <button className={styles.secondary} onClick={() => setView("requests")}>İstek var</button>
                      : person.relationship === "declined" ? <span className={styles.muted}>İstek reddedildi</span>
                      : <button className={styles.action} disabled={busy} onClick={() => void act(() => supabase.rpc("dm_add_friend", { p_target: person.user_id }), "Arkadaşlık isteği gönderildi.")}><Icon name="plus" size={15}/> Ekle</button>}
                  </div>)}
                </>}
                {view === "requests" && <>
                  {requests.length === 0 && <div className={styles.empty}>Bekleyen arkadaşlık isteğin yok.</div>}
                  {incoming.map(r => <div className={styles.personItem} key={r.friendship_id}>
                    <Avatar small name={r.display_name} src={r.avatar_url}/><span className={styles.friendCopy}><strong>{r.display_name}</strong><small>Sana istek gönderdi</small></span>
                    <div className={styles.requestButtons}><button className={styles.action} disabled={busy} onClick={() => void act(() => supabase.rpc("dm_respond_friend", { p_friendship: r.friendship_id, p_accept: true }), "Arkadaşlık isteği kabul edildi.")}><Icon name="check" size={15}/></button><button className={styles.secondary} disabled={busy} onClick={() => void act(() => supabase.rpc("dm_respond_friend", { p_friendship: r.friendship_id, p_accept: false }), "İstek reddedildi.")}><Icon name="close" size={15}/></button></div>
                  </div>)}
                  {outgoing.map(r => <div className={styles.personItem} key={r.friendship_id}>
                    <Avatar small name={r.display_name} src={r.avatar_url}/><span className={styles.friendCopy}><strong>{r.display_name}</strong><small>Yanıt bekleniyor</small></span>
                    <button className={styles.secondary} disabled={busy} onClick={() => void act(() => supabase.rpc("dm_remove_friend", { p_target: r.user_id }), "İstek iptal edildi.")}>İptal</button>
                  </div>)}
                </>}
              </div>
            </>
          )}
          {status && <div className={styles.status} role="status">{status}</div>}
          {toast && <button className={styles.toastInPage} onClick={()=>{setActive(toast.from);setView("chats");setToast(null)}}><strong>{toast.name} · Yeni mesaj</strong><small>{toast.text}</small></button>}
          <footer className={styles.panelFoot}><span>F1 MEDİPOL · ÖZEL MESAJLAR</span><span>Arkadaşlar arasında</span></footer>
      </section>
    </div>
  );

  return mounted ? dialog : null;
}
