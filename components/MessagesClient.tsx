"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type TouchEvent,
} from "react";
import { createClient } from "@/utils/supabase/client";
import styles from "./DmDock.module.css";

type Theme = "gray" | "red" | "light";
type View = "chats" | "find" | "requests";
type MediaKind = "image" | "video" | "audio";

type Friend = {
  friendship_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  last_message: string | null;
  last_at: string | null;
  unread_count: number;
};

type FriendRequest = {
  friendship_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  direction: "incoming" | "outgoing";
  created_at: string;
};

type Person = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  relationship: string | null;
};

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  reply_to_id?: string | null;
  reply_to_body?: string | null;
  reply_to_sender_id?: string | null;
  media_url?: string | null;
  media_kind?: MediaKind | null;
  media_mime?: string | null;
  media_name?: string | null;
  optimistic?: boolean;
};

type MediaRecord = {
  message_id: string;
  media_path: string;
  media_kind: MediaKind;
  media_mime: string | null;
  media_name: string | null;
};

type FriendProfile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio?: string | null;
  favorite_team?: string | null;
  favorite_driver?: string | null;
};

type DmDockProps = {
  isLight?: boolean;
  mode?: "dock" | "page";
};

const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 25 * 1024 * 1024;
const MAX_AUDIO = 8 * 1024 * 1024;
const LONG_PRESS_MS = 500;
const SWIPE_REPLY_THRESHOLD = 65;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
]);

function getMediaKind(file: File): MediaKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return null;
}

function getExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();

  if (fromName && /^[a-z0-9]{2,6}$/.test(fromName)) {
    return fromName;
  }

  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
  };

  return extensions[file.type] || "bin";
}

function formatTime(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toLocaleUpperCase("tr-TR");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "İşlem sırasında bir hata oluştu.";
}

function messagePreview(message: Message) {
  if (
    message.body &&
    !["[Fotoğraf]", "[Video]", "[Ses kaydı]"].includes(message.body)
  ) {
    return message.body;
  }

  if (message.media_kind === "image" || message.body === "[Fotoğraf]") {
    return "📷 Fotoğraf";
  }

  if (message.media_kind === "video" || message.body === "[Video]") {
    return "🎥 Video";
  }

  if (message.media_kind === "audio" || message.body === "[Ses kaydı]") {
    return "🎙️ Ses kaydı";
  }

  return "Medya mesajı";
}

function Avatar({
  name,
  src,
  size = 44,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const style: CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    borderRadius: "50%",
    overflow: "hidden",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg,#e10600,#7c0804)",
    color: "#fff",
    fontWeight: 800,
    fontSize: Math.max(12, size * 0.32),
    flexShrink: 0,
  };

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setFailed(true)}
        style={{ ...style, objectFit: "cover" }}
      />
    );
  }

  return <span style={style}>{initials(name) || "?"}</span>;
}

function Icon({
  name,
  size = 19,
}: {
  name: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  const paths: Record<string, React.ReactNode> = {
    chat: (
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4-.9L3 21l1.5-4.5A8.4 8.4 0 1 1 21 11.5Z" />
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    close: <path d="m18 6-12 12M6 6l12 12" />,
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),
    attach: (
      <path d="m21.4 11.1-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
    ),
    mic: (
      <>
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8" />
      </>
    ),
    stop: <rect x="5" y="5" width="14" height="14" rx="2" />,
    back: <path d="m15 18-6-6 6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </>
    ),
    palette: (
      <>
        <path d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.4-3.4 2 2 0 0 1 1.4-3.4H18a3 3 0 0 0 3-3C21 6.6 17 3 12 3Z" />
        <circle cx="7.5" cy="10" r=".8" />
        <circle cx="10" cy="6.8" r=".8" />
        <circle cx="15" cy="7.5" r=".8" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    block: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m5.6 5.6 12.8 12.8" />
      </>
    ),
    external: (
      <>
        <path d="M14 3h7v7M10 14 21 3" />
        <path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
      </>
    ),
    trash: (
      <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
    ),
    wallpaper: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8" cy="8" r="1.4" />
        <path d="m21 15-5-5L5 21" />
      </>
    ),
    reply: (
      <>
        <path d="m9 17-5-5 5-5" />
        <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.chat}</svg>;
}

export default function DmDock({
  isLight = false,
  mode = "dock",
}: DmDockProps) {
  const supabase = useRef(createClient()).current;

  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState("");
  const [theme, setTheme] = useState<Theme>(isLight ? "light" : "gray");
  const [open, setOpen] = useState(mode === "page");
  const [view, setView] = useState<View>("chats");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<Person[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState("");
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [wallpaper, setWallpaper] = useState("");
  const [wallpaperBusy, setWallpaperBusy] = useState(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [messageAction, setMessageAction] = useState<{
    message: Message;
    x: number;
    y: number;
  } | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wallpaperInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const recordingPartsRef = useRef<Blob[]>([]);
  const activeRef = useRef("");
  const openRef = useRef(open);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef(false);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);

  const [active, setActive] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    setTheme(isLight ? "light" : "gray");
  }, [isLight]);

  const notify = useCallback((message: string) => {
    setToast(message);

    if (toastTimer.current) clearTimeout(toastTimer.current);

    toastTimer.current = setTimeout(() => setToast(""), 3200);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const startReply = useCallback((message: Message) => {
    if (message.optimistic || !isUuid(message.id)) return;

    setReplyingTo(message);
    setMessageAction(null);

    window.setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(
        '[aria-label="Mesaj"]',
      );
      input?.focus();
    }, 50);
  }, []);

  // Menü seçilen mesajın yakınında açılır.
  // Üstte yer yoksa aşağıda açılır ve ekran dışına taşmaz.
  const showMessageActions = useCallback(
    (message: Message, _x: number, _y: number) => {
      if (message.optimistic || !isUuid(message.id)) return;

      const target = document.getElementById(`dm-message-${message.id}`);
      if (!target) return;

      const rect = target.getBoundingClientRect();

      const menuWidth = 180;
      const menuHeight = 54;
      const gap = 8;
      const margin = 8;

      const openAbove = rect.top >= menuHeight + gap + margin;

      const y = openAbove
        ? rect.top - menuHeight - gap
        : Math.min(
            rect.bottom + gap,
            window.innerHeight - menuHeight - margin,
          );

      const x = Math.max(
        margin,
        Math.min(
          rect.left + rect.width / 2 - menuWidth / 2,
          window.innerWidth - menuWidth - margin,
        ),
      );

      setMessageAction({ message, x, y });
    },
    [],
  );

  const goToMessage = useCallback(
    (messageId: string) => {
      if (!messageId || messageId.startsWith("optimistic-")) return;

      const target = document.getElementById(`dm-message-${messageId}`);

      if (!target) {
        notify("Yanıtlanan mesaj bu sohbetin yüklenen geçmişinde bulunamadı.");
        return;
      }

      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add(
        styles.messageHighlighted || "dm-message-highlighted",
      );

      window.setTimeout(() => {
        target.classList.remove(
          styles.messageHighlighted || "dm-message-highlighted",
        );
      }, 1600);
    },
    [notify],
  );

  const refresh = useCallback(async () => {
    if (!userId) return;

    const [friendResult, requestResult] = await Promise.all([
      supabase.rpc("dm_list_friends"),
      supabase.rpc("dm_list_requests"),
    ]);

    if (!friendResult.error && Array.isArray(friendResult.data)) {
      setFriends(friendResult.data as Friend[]);
    }

    if (!requestResult.error && Array.isArray(requestResult.data)) {
      setRequests(requestResult.data as FriendRequest[]);
    }

    window.dispatchEvent(new CustomEvent("f1-notifications-updated"));
  }, [supabase, userId]);

  const loadMessages = useCallback(
    async (otherId: string, quiet = false) => {
      if (!userId || !otherId || !isUuid(otherId)) return;

      const { data, error } = await supabase.rpc("dm_get_messages", {
        p_other: otherId,
        p_limit: 70,
      });

      if (error) {
        if (!quiet) setStatus(error.message);
        return;
      }

      const rawMessages = (Array.isArray(data) ? data : []) as Message[];

      let mediaRows: MediaRecord[] = [];

      const mediaResult = await supabase.rpc("dm_get_media_metadata", {
        p_other: otherId,
      });

      if (!mediaResult.error && Array.isArray(mediaResult.data)) {
        mediaRows = mediaResult.data as MediaRecord[];
      }

      const mediaByMessage = new Map(
        mediaRows.map((item) => [item.message_id, item]),
      );

      const merged = await Promise.all(
        rawMessages.map(async (message) => {
          const media = mediaByMessage.get(message.id);

          if (!media) return message;

          const { data: signed, error: signedError } = await supabase.storage
            .from("dm-media")
            .createSignedUrl(media.media_path, 60 * 60);

          return {
            ...message,
            media_kind: media.media_kind,
            media_mime: media.media_mime,
            media_name: media.media_name,
            media_url: signedError ? null : signed?.signedUrl || null,
          };
        }),
      );

      setMessages((previous) => {
        const optimistic = previous.filter(
          (message) =>
            message.optimistic &&
            message.recipient_id === otherId &&
            !merged.some((item) => item.id === message.id),
        );

        return [...merged, ...optimistic].sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime(),
        );
      });

      await supabase.rpc("dm_mark_read", { p_other: otherId });

      window.dispatchEvent(new CustomEvent("f1-notifications-updated"));
      void refresh();
    },
    [supabase, userId, refresh],
  );

  useEffect(() => {
    let alive = true;

    async function init() {
      const { data, error } = await supabase.auth.getUser();

      if (!alive || error || !data.user) return;

      setUserId(data.user.id);
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setUserId(session?.user?.id || "");
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId) {
      setFriends([]);
      setRequests([]);
      setMessages([]);
      setActive("");
      setReplyingTo(null);
      return;
    }

    void refresh();

    const interval = setInterval(() => {
      void refresh();

      if (openRef.current && activeRef.current) {
        void loadMessages(activeRef.current, true);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [userId, refresh, loadMessages]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`dm-ui-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const message = payload.new as Message;

          if (openRef.current && activeRef.current === message.sender_id) {
            void loadMessages(message.sender_id, true);
          } else {
            notify("Yeni bir mesajın var.");
            void refresh();

            if (
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              try {
                new Notification("Yeni mesaj", {
                  body: message.body || "Sana bir medya gönderildi.",
                });
              } catch {
                // Tarayıcı bildirimi kullanılamazsa uygulama içi bildirim devam eder.
              }
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `sender_id=eq.${userId}`,
        },
        (payload) => {
          const message = payload.new as Message;

          if (openRef.current && activeRef.current === message.recipient_id) {
            void loadMessages(message.recipient_id, true);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_friendships",
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId, loadMessages, refresh, notify]);

  const loadWallpaper = useCallback(
    async (otherId: string) => {
      if (!userId || !otherId) return;

      const { data, error } = await supabase.rpc("dm_get_chat_wallpaper", {
        p_other: otherId,
      });

      if (error || !data) {
        setWallpaper("");
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      const path =
        typeof row === "string"
          ? row
          : row?.wallpaper_path || row?.media_path || null;

      if (!path) {
        setWallpaper("");
        return;
      }

      const { data: signed } = await supabase.storage
        .from("dm-wallpapers")
        .createSignedUrl(path, 60 * 60);

      setWallpaper(signed?.signedUrl || "");
    },
    [supabase, userId],
  );

  useEffect(() => {
    if (open && active && userId) {
      setStatus("");
      void loadMessages(active);
      void loadWallpaper(active);
    } else {
      setMessages([]);
      setWallpaper("");
      setReplyingTo(null);
      setMessageAction(null);
    }
  }, [open, active, userId, loadMessages, loadWallpaper]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (!messageAction) return;

    const closeMenu = () => setMessageAction(null);

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMessageAction(null);
    };

    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [messageAction]);

  useEffect(() => {
    if (!mounted) return;

    const params = new URLSearchParams(window.location.search);
    const dm = params.get("dm");

    if (dm === "requests") {
      setOpen(true);
      setView("requests");
    } else if (dm && isUuid(dm)) {
      setActive(dm);
      setOpen(true);
    }

    const handleOpen = (event: Event) => {
      const custom = event as CustomEvent<{
        userId?: string;
        view?: string;
      }>;

      if (custom.detail?.view === "requests") {
        setOpen(true);
        setView("requests");
        return;
      }

      if (custom.detail?.userId && isUuid(custom.detail.userId)) {
        setActive(custom.detail.userId);
        setOpen(true);
        setView("chats");
      }
    };

    window.addEventListener("f1-dm-open", handleOpen);

    return () => {
      window.removeEventListener("f1-dm-open", handleOpen);
    };
  }, [mounted]);

  useEffect(() => {
    if (view !== "find" || !search.trim() || !userId) {
      setFound([]);
      return;
    }

    let alive = true;

    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc("dm_find_users", {
        p_search: search.trim(),
      });

      if (!alive || error) return;

      setFound(
        (Array.isArray(data) ? data : []).filter(
          (person: Person) => person.user_id !== userId,
        ),
      );
    }, 300);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [search, view, userId, supabase]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

      try {
        recorderRef.current?.stop();
      } catch {
        // Kayıt zaten durmuş olabilir.
      }

      microphoneRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const sendPush = useCallback(async (messageId: string) => {
    try {
      await fetch("/api/dm/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
    } catch {
      // Push bildirimi başarısız olsa da mesaj gönderimi başarılı kalır.
    }
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!userId || !active) return;

      const kind = getMediaKind(file);

      if (!kind || !ALLOWED_TYPES.has(file.type)) {
        notify("Bu dosya türü desteklenmiyor.");
        return;
      }

      const limit =
        kind === "image"
          ? MAX_IMAGE
          : kind === "video"
            ? MAX_VIDEO
            : MAX_AUDIO;

      if (file.size > limit) {
        notify(
          kind === "image"
            ? "Fotoğraf en fazla 10 MB olabilir."
            : kind === "video"
              ? "Video en fazla 25 MB olabilir."
              : "Ses kaydı en fazla 8 MB olabilir.",
        );
        return;
      }

      setBusy(true);
      setStatus("Medya gönderiliyor…");

      try {
        const extension = getExtension(file);
        const path = `${userId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("dm-media")
          .upload(path, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data, error } = await supabase.rpc("dm_send_media", {
          p_other: active,
          p_path: path,
          p_kind: kind,
          p_mime: file.type,
          p_name: file.name || `medya.${extension}`,
        });

        if (error) {
          await supabase.storage.from("dm-media").remove([path]);
          throw error;
        }

        if (typeof data === "string") void sendPush(data);

        await loadMessages(active, true);
        await refresh();
        setStatus("");
        notify("Medya gönderildi.");
      } catch (error) {
        setStatus(errorText(error));
      } finally {
        setBusy(false);
      }
    },
    [userId, active, supabase, notify, loadMessages, refresh, sendPush],
  );

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    microphoneRef.current?.getTracks().forEach((track) => track.stop());
    microphoneRef.current = null;
    setRecording(false);
  }, []);

  const toggleRecording = useCallback(async () => {
    if (recording) {
      stopRecording();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      notify("Bu tarayıcı ses kaydını desteklemiyor.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      microphoneRef.current = stream;
      recordingPartsRef.current = [];

      const preferredType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/webm",
        "audio/ogg",
      ].find((type) => MediaRecorder.isTypeSupported(type));

      const recorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingPartsRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setRecording(false);
        notify("Ses kaydı sırasında hata oluştu.");
      };

      recorder.onstop = () => {
        const blob = new Blob(recordingPartsRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        stream.getTracks().forEach((track) => track.stop());
        microphoneRef.current = null;
        setRecording(false);

        if (blob.size > 0) {
          const extension = blob.type.includes("mp4") ? "m4a" : "webm";

          const file = new File(
            [blob],
            `ses-kaydi-${Date.now()}.${extension}`,
            { type: blob.type || "audio/webm" },
          );

          void uploadFile(file);
        }
      };

      recorder.start(250);
      setRecording(true);
      notify("Ses kaydı başladı. Bitirmek için kayıt düğmesine bas.");
    } catch {
      notify("Mikrofon izni verilmedi veya mikrofon kullanılamıyor.");
    }
  }, [recording, stopRecording, notify, uploadFile]);

  const send = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const body = draft.trim();
      const recipient = active;
      const replyTarget = replyingTo;

      if (!body || !recipient || !userId || busyRef.current) return;

      const tempId = `optimistic-${crypto.randomUUID()}`;

      const optimistic: Message = {
        id: tempId,
        sender_id: userId,
        recipient_id: recipient,
        body,
        created_at: new Date().toISOString(),
        read_at: null,
        reply_to_id: replyTarget?.id || null,
        reply_to_body: replyTarget ? messagePreview(replyTarget) : null,
        reply_to_sender_id: replyTarget?.sender_id || null,
        optimistic: true,
      };

      setMessages((previous) => [...previous, optimistic]);
      setDraft("");
      setReplyingTo(null);
      setMessageAction(null);
      setBusy(true);
      setStatus("");

      try {
        const { data, error } = await supabase.rpc("dm_send_message", {
          p_other: recipient,
          p_body: body,
          p_reply_to:
            replyTarget && isUuid(replyTarget.id) ? replyTarget.id : null,
        });

        if (error) throw error;

        setMessages((previous) =>
          previous.map((message) =>
            message.id === tempId
              ? {
                  ...message,
                  id: typeof data === "string" ? data : tempId,
                  optimistic: false,
                }
              : message,
          ),
        );

        if (typeof data === "string") void sendPush(data);

        void loadMessages(recipient, true);
        void refresh();
      } catch (error) {
        setMessages((previous) =>
          previous.filter((message) => message.id !== tempId),
        );
        setDraft(body);
        setReplyingTo(replyTarget);
        setStatus(errorText(error));
      } finally {
        setBusy(false);
      }
    },
    [
      draft,
      active,
      userId,
      replyingTo,
      supabase,
      loadMessages,
      refresh,
      sendPush,
    ],
  );

  const act = useCallback(
    async (
      rpcName: string,
      args: Record<string, unknown>,
      successMessage: string,
    ) => {
      setBusy(true);
      setStatus("");

      try {
        const { error } = await supabase.rpc(rpcName, args);
        if (error) throw error;

        await refresh();
        notify(successMessage);
        return true;
      } catch (error) {
        setStatus(errorText(error));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [supabase, refresh, notify],
  );

  const openProfile = useCallback(
    async (targetId: string) => {
      if (!targetId || !isUuid(targetId)) return;

      setProfileOpen(true);
      setProfileBusy(true);
      setProfile(null);

      const { data, error } = await supabase.rpc("dm_friend_profile", {
        p_target: targetId,
      });

      setProfileBusy(false);

      if (error) {
        setStatus(error.message);
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;

      if (!row) {
        setStatus("Profil bilgileri bulunamadı.");
        return;
      }

      setProfile(row as FriendProfile);
    },
    [supabase],
  );

  const saveWallpaper = useCallback(
    async (file: File) => {
      if (!userId || !active) return;

      if (!file.type.startsWith("image/")) {
        notify("Duvar kâğıdı için bir görsel seçmelisin.");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        notify("Duvar kâğıdı en fazla 10 MB olabilir.");
        return;
      }

      setWallpaperBusy(true);

      try {
        const path = `${userId}/${active}/${crypto.randomUUID()}.${getExtension(file)}`;

        const { error: uploadError } = await supabase.storage
          .from("dm-wallpapers")
          .upload(path, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { error } = await supabase.rpc("dm_set_chat_wallpaper", {
          p_other: active,
          p_path: path,
        });

        if (error) {
          await supabase.storage.from("dm-wallpapers").remove([path]);
          throw error;
        }

        await loadWallpaper(active);
        setShowWallpaperPicker(false);
        notify("Sohbet duvar kâğıdı güncellendi.");
      } catch (error) {
        setStatus(errorText(error));
      } finally {
        setWallpaperBusy(false);
      }
    },
    [userId, active, supabase, loadWallpaper, notify],
  );

  const clearWallpaper = useCallback(async () => {
    if (!active) return;

    setWallpaperBusy(true);

    try {
      const { error } = await supabase.rpc("dm_set_chat_wallpaper", {
        p_other: active,
        p_path: null,
      });

      if (error) throw error;

      setWallpaper("");
      setShowWallpaperPicker(false);
      notify("Varsayılan duvar kâğıdı kullanılıyor.");
    } catch (error) {
      setStatus(errorText(error));
    } finally {
      setWallpaperBusy(false);
    }
  }, [active, supabase, notify]);

  const closePanel = useCallback(() => {
    if (mode === "page") {
      window.history.back();
      return;
    }

    setOpen(false);
    setProfileOpen(false);
    setShowWallpaperPicker(false);
    setReplyingTo(null);
    setMessageAction(null);

    const url = new URL(window.location.href);
    url.searchParams.delete("dm");
    window.history.replaceState({}, "", url.toString());
  }, [mode]);

  const selectChat = useCallback(
    (targetId: string) => {
      setActive(targetId);
      setView("chats");
      setOpen(true);
      setProfileOpen(false);
      setReplyingTo(null);
      setMessageAction(null);
      setStatus("");

      if (mode !== "page") {
        const url = new URL(window.location.href);
        url.searchParams.set("dm", targetId);
        window.history.replaceState({}, "", url.toString());
      }
    },
    [mode],
  );

  const unread = friends.reduce(
    (sum, friend) => sum + Number(friend.unread_count || 0),
    0,
  );

  const incoming = requests.filter(
    (request) => request.direction === "incoming",
  );

  const partner = friends.find((friend) => friend.user_id === active);

  const currentPersonName =
    partner?.display_name || profile?.display_name || "Sohbet";

  const canChat = Boolean(active && isUuid(active));

  if (!mounted || !userId) {
    if (mode === "page") {
      return (
        <div className={styles.panel}>
          <div className={styles.empty}>Mesajlar yükleniyor…</div>
        </div>
      );
    }

    return null;
  }

  const buttonStyle: CSSProperties = {
    border: "1px solid var(--dm-border, rgba(255,255,255,.13))",
    background: "var(--dm-control, rgba(255,255,255,.06))",
    color: "inherit",
    borderRadius: 12,
    minHeight: 40,
    padding: "8px 12px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
  };

  const primaryStyle: CSSProperties = {
    ...buttonStyle,
    background: "#e10600",
    borderColor: "#e10600",
    color: "#fff",
  };

  const panel = (
    <div
      className={[
        styles.panel,
        styles[theme],
        mode === "page" ? styles.pageMode : styles.popupMode,
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        wallpaper && active
          ? {
              backgroundImage: `linear-gradient(rgba(8,10,15,.78),rgba(8,10,15,.82)),url("${wallpaper}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <div className={styles.header}>
        {active ? (
          <button
            type="button"
            className={styles.headerButton}
            onClick={() => {
              setActive("");
              setMessages([]);
              setReplyingTo(null);
              setMessageAction(null);
              setProfileOpen(false);
              setView("chats");
            }}
            aria-label="Sohbet listesine dön"
          >
            <Icon name="back" />
          </button>
        ) : null}

        <div className={styles.headerTitle}>
          <strong>{active ? currentPersonName : "Mesajlar"}</strong>
          <small>
            {active
              ? "Özel sohbet"
              : unread
                ? `${unread} okunmamış mesaj`
                : "F1 Medipol"}
          </small>
        </div>

        {active ? (
          <>
            <button
              type="button"
              style={buttonStyle}
              title="Sohbet duvar kâğıdı"
              aria-label="Sohbet duvar kâğıdı"
              onClick={() => setShowWallpaperPicker((value) => !value)}
            >
              <Icon name="wallpaper" />
            </button>

            <button
              type="button"
              style={buttonStyle}
              title="Kişi profili ve işlemler"
              aria-label="Kişi profili ve işlemler"
              onClick={() => void openProfile(active)}
            >
              <Icon name="user" />
            </button>
          </>
        ) : null}

        <button
          type="button"
          className={styles.headerButton}
          onClick={closePanel}
          aria-label="Kapat"
        >
          <Icon name="close" />
        </button>
      </div>

      {status ? (
        <div
          role="status"
          style={{
            padding: "9px 12px",
            color: "#ffaaa6",
            fontSize: 13,
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >
          {status}
        </div>
      ) : null}

      {showWallpaperPicker && active ? (
        <div
          style={{
            padding: 14,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid rgba(255,255,255,.12)",
          }}
        >
          <strong style={{ width: "100%", fontSize: 13 }}>
            Sohbet duvar kâğıdı
          </strong>

          <button
            type="button"
            style={buttonStyle}
            disabled={wallpaperBusy}
            onClick={() => wallpaperInputRef.current?.click()}
          >
            <Icon name="image" size={17} />
            Galeriden seç
          </button>

          <button
            type="button"
            style={buttonStyle}
            disabled={wallpaperBusy || !wallpaper}
            onClick={() => void clearWallpaper()}
          >
            Varsayılana dön
          </button>

          <input
            ref={wallpaperInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void saveWallpaper(file);
            }}
          />

          {wallpaperBusy ? (
            <small style={{ width: "100%" }}>Güncelleniyor…</small>
          ) : null}
        </div>
      ) : null}

      {active ? (
        <>
          <div className={styles.chatBody} ref={chatBodyRef}>
            {messages.length === 0 ? (
              <div className={styles.empty}>
                Henüz mesaj yok. İlk mesajı sen gönder!
              </div>
            ) : (
              messages.map((message) => {
                const mine = message.sender_id === userId;

                const repliedMessage = message.reply_to_id
                  ? messages.find((item) => item.id === message.reply_to_id)
                  : null;

                const quotedBody =
                  message.reply_to_body ||
                  (repliedMessage ? messagePreview(repliedMessage) : "");

                const quotedSenderId =
                  message.reply_to_sender_id || repliedMessage?.sender_id;

                const quotedSender =
                  quotedSenderId === userId ? "Sen" : currentPersonName;

                const canJumpToQuote = Boolean(
                  message.reply_to_id &&
                    !message.reply_to_id.startsWith("optimistic-"),
                );

                return (
                  <div
                    key={message.id}
                    id={`dm-message-${message.id}`}
                    className={[
                      styles.message,
                      mine ? styles.mine : styles.theirs,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      showMessageActions(
                        message,
                        event.clientX,
                        event.clientY,
                      );
                    }}
                    onTouchStart={(event: TouchEvent<HTMLDivElement>) => {
                      const touch = event.touches[0];
                      if (!touch) return;

                      touchStartRef.current = {
                        x: touch.clientX,
                        y: touch.clientY,
                      };

                      longPressTriggeredRef.current = false;
                      cancelLongPress();

                      longPressTimerRef.current = setTimeout(() => {
                        longPressTriggeredRef.current = true;
                        showMessageActions(
                          message,
                          touch.clientX,
                          touch.clientY,
                        );
                      }, LONG_PRESS_MS);
                    }}
                    onTouchMove={(event: TouchEvent<HTMLDivElement>) => {
                      const touch = event.touches[0];
                      const start = touchStartRef.current;

                      if (!touch || !start) return;

                      const deltaX = touch.clientX - start.x;
                      const deltaY = touch.clientY - start.y;

                      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                        cancelLongPress();
                      }
                    }}
                    onTouchEnd={(event: TouchEvent<HTMLDivElement>) => {
                      cancelLongPress();

                      const start = touchStartRef.current;
                      const touch = event.changedTouches[0];

                      if (!start || !touch || longPressTriggeredRef.current) {
                        touchStartRef.current = null;
                        return;
                      }

                      const deltaX = touch.clientX - start.x;
                      const deltaY = touch.clientY - start.y;

                      if (
                        deltaX >= SWIPE_REPLY_THRESHOLD &&
                        Math.abs(deltaY) < 70
                      ) {
                        startReply(message);
                      }

                      touchStartRef.current = null;
                    }}
                    onTouchCancel={() => {
                      cancelLongPress();
                      touchStartRef.current = null;
                    }}
                  >
                    {message.reply_to_id ? (
                      <button
                        type="button"
                        className={styles.replyQuote}
                        onClick={(event) => {
                          event.stopPropagation();

                          if (canJumpToQuote) {
                            goToMessage(message.reply_to_id!);
                          } else if (repliedMessage) {
                            goToMessage(repliedMessage.id);
                          }
                        }}
                        disabled={!canJumpToQuote && !repliedMessage}
                        title="Yanıtlanan mesaja git"
                      >
                        <span className={styles.replyQuoteBar} />
                        <span className={styles.replyQuoteContent}>
                          <strong>{quotedSender}</strong>
                          <span>{quotedBody || "Mesaj"}</span>
                        </span>
                      </button>
                    ) : null}

                    {message.media_url && message.media_kind === "image" ? (
                      <a
                        href={message.media_url}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.mediaLink}
                      >
                        <img
                          src={message.media_url}
                          alt={message.media_name || "Gönderilen fotoğraf"}
                          className={styles.messageImage}
                          loading="lazy"
                        />
                      </a>
                    ) : null}

                    {message.media_url && message.media_kind === "video" ? (
                      <video
                        src={message.media_url}
                        controls
                        playsInline
                        preload="metadata"
                        className={styles.messageVideo}
                      />
                    ) : null}

                    {message.media_url && message.media_kind === "audio" ? (
                      <div className={styles.audioMessage}>
                        <span aria-hidden="true">
                          <Icon name="mic" size={17} />
                        </span>
                        <audio
                          src={message.media_url}
                          controls
                          preload="metadata"
                        />
                      </div>
                    ) : null}

                    {message.media_kind && !message.media_url ? (
                      <div className={styles.mediaUnavailable}>
                        Medya bağlantısı şu anda açılamıyor.
                      </div>
                    ) : null}

                    {message.body &&
                    !["[Fotoğraf]", "[Video]", "[Ses kaydı]"].includes(
                      message.body,
                    ) ? (
                      <div className={styles.messageText}>{message.body}</div>
                    ) : null}

                    {/* Saat ve gönderim tikleri aynı satırda. */}
                    <div className={styles.messageMeta}>
                      <span>{formatTime(message.created_at)}</span>

                      {mine ? (
                        <span
                          className={
                            message.read_at ? styles.messageStatusRead : ""
                          }
                          title={
                            message.optimistic
                              ? "Gönderiliyor"
                              : message.read_at
                                ? "Görüldü"
                                : "Gönderildi"
                          }
                          aria-label={
                            message.optimistic
                              ? "Gönderiliyor"
                              : message.read_at
                                ? "Görüldü"
                                : "Gönderildi"
                          }
                        >
                          {message.optimistic
                            ? "…"
                            : message.read_at
                              ? "✓✓"
                              : "✓"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}

            <div ref={bottomRef} />
          </div>

          {replyingTo ? (
            <div className={styles.replyComposerPreview}>
              <span className={styles.replyQuoteBar} />
              <div className={styles.replyComposerText}>
                <strong>
                  {replyingTo.sender_id === userId
                    ? "Kendine yanıt"
                    : currentPersonName}
                </strong>
                <span>{messagePreview(replyingTo)}</span>
              </div>
              <button
                type="button"
                className={styles.replyCancelButton}
                aria-label="Yanıtlamayı iptal et"
                title="Yanıtlamayı iptal et"
                onClick={() => setReplyingTo(null)}
              >
                <Icon name="close" size={17} />
              </button>
            </div>
          ) : null}

          <form className={styles.composer} onSubmit={send}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void uploadFile(file);
              }}
            />

            <button
              type="button"
              className={styles.iconButton}
              title="Fotoğraf veya video ekle"
              aria-label="Fotoğraf veya video ekle"
              disabled={busy || recording}
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="attach" />
            </button>

            <input
              className={styles.messageInput}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={replyingTo ? "Yanıtını yaz…" : "Mesaj yaz…"}
              aria-label="Mesaj"
              maxLength={1000}
              autoComplete="off"
              disabled={recording}
            />

            <button
              type="button"
              className={styles.iconButton}
              title={recording ? "Kaydı bitir ve gönder" : "Ses kaydet"}
              aria-label={recording ? "Kaydı bitir" : "Ses kaydet"}
              disabled={busy}
              onClick={() => void toggleRecording()}
              style={recording ? { color: "#ff4545" } : undefined}
            >
              <Icon name={recording ? "stop" : "mic"} />
            </button>

            <button
              type="submit"
              className={styles.sendButton}
              aria-label="Gönder"
              title="Gönder"
              disabled={busy || !draft.trim() || recording}
            >
              <Icon name="send" />
            </button>
          </form>
        </>
      ) : (
        <>
          <div className={styles.tabs}>
            <button
              type="button"
              className={view === "chats" ? styles.activeTab : ""}
              onClick={() => setView("chats")}
            >
              <Icon name="chat" size={16} />
              Sohbetler
            </button>

            <button
              type="button"
              className={view === "find" ? styles.activeTab : ""}
              onClick={() => setView("find")}
            >
              <Icon name="search" size={16} />
              Kişiler
            </button>

            <button
              type="button"
              className={view === "requests" ? styles.activeTab : ""}
              onClick={() => setView("requests")}
            >
              <Icon name="users" size={16} />
              İstekler
              {incoming.length ? (
                <span className={styles.badge}>{incoming.length}</span>
              ) : null}
            </button>
          </div>

          {view === "chats" ? (
            <div className={styles.list}>
              {friends.length === 0 ? (
                <div className={styles.empty}>
                  Henüz sohbetin yok. Kişiler sekmesinden arkadaş ekleyebilirsin.
                </div>
              ) : (
                friends.map((friend) => (
                  <button
                    type="button"
                    key={friend.friendship_id}
                    className={styles.friendRow}
                    onClick={() => selectChat(friend.user_id)}
                  >
                    <Avatar
                      name={friend.display_name}
                      src={friend.avatar_url}
                    />

                    <span className={styles.friendInfo}>
                      <strong>{friend.display_name}</strong>
                      <small>{friend.last_message || "Sohbete başla"}</small>
                    </span>

                    <span className={styles.friendMeta}>
                      <small>{formatTime(friend.last_at)}</small>
                      {friend.unread_count > 0 ? (
                        <span className={styles.badge}>
                          {friend.unread_count}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}

          {view === "find" ? (
            <div className={styles.findView}>
              <div className={styles.searchBox}>
                <Icon name="search" size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="İsim veya kullanıcı ara…"
                  aria-label="Kişi ara"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Aramayı temizle"
                  >
                    <Icon name="close" size={16} />
                  </button>
                ) : null}
              </div>

              <div className={styles.list}>
                {found.map((person) => (
                  <div key={person.user_id} className={styles.friendRow}>
                    <Avatar
                      name={person.display_name}
                      src={person.avatar_url}
                    />

                    <span className={styles.friendInfo}>
                      <strong>{person.display_name}</strong>
                      <small>
                        {person.relationship || "F1 Medipol üyesi"}
                      </small>
                    </span>

                    {["accepted", "friend"].includes(
                      (person.relationship || "").toLowerCase(),
                    ) ? (
                      <button
                        type="button"
                        style={buttonStyle}
                        onClick={() => selectChat(person.user_id)}
                      >
                        Mesaj
                      </button>
                    ) : (
                      <button
                        type="button"
                        style={buttonStyle}
                        disabled={busy}
                        onClick={() =>
                          void act(
                            "dm_add_friend",
                            { p_target: person.user_id },
                            "Arkadaşlık isteği gönderildi.",
                          )
                        }
                      >
                        <Icon name="plus" size={16} />
                        Ekle
                      </button>
                    )}
                  </div>
                ))}

                {search.trim() && found.length === 0 ? (
                  <div className={styles.empty}>
                    Sonuç bulunamadı veya kullanıcı henüz listelenmedi.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {view === "requests" ? (
            <div className={styles.list}>
              {requests.length === 0 ? (
                <div className={styles.empty}>
                  Bekleyen arkadaşlık isteği yok.
                </div>
              ) : (
                requests.map((request) => (
                  <div
                    key={request.friendship_id}
                    className={styles.friendRow}
                  >
                    <Avatar
                      name={request.display_name}
                      src={request.avatar_url}
                    />

                    <span className={styles.friendInfo}>
                      <strong>{request.display_name}</strong>
                      <small>
                        {request.direction === "incoming"
                          ? "Arkadaşlık isteği gönderdi"
                          : "Yanıt bekleniyor"}
                      </small>
                    </span>

                    {request.direction === "incoming" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          style={primaryStyle}
                          disabled={busy}
                          aria-label="Arkadaşlık isteğini kabul et"
                          onClick={() =>
                            void act(
                              "dm_respond_friend",
                              {
                                p_friendship: request.friendship_id,
                                p_accept: true,
                              },
                              "Arkadaşlık isteği kabul edildi.",
                            )
                          }
                        >
                          <Icon name="check" size={16} />
                        </button>

                        <button
                          type="button"
                          style={buttonStyle}
                          disabled={busy}
                          aria-label="Arkadaşlık isteğini reddet"
                          onClick={() =>
                            void act(
                              "dm_respond_friend",
                              {
                                p_friendship: request.friendship_id,
                                p_accept: false,
                              },
                              "İstek reddedildi.",
                            )
                          }
                        >
                          <Icon name="close" size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        style={buttonStyle}
                        disabled={busy}
                        onClick={() =>
                          void act(
                            "dm_remove_friend",
                            { p_target: request.user_id },
                            "İstek iptal edildi.",
                          )
                        }
                      >
                        İptal
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </>
      )}

      {messageAction ? (
        <div
          className={styles.messageActionMenu}
          role="menu"
          aria-label="Mesaj işlemleri"
          style={{
            position: "fixed",
            left: messageAction.x,
            top: messageAction.y,
            zIndex: 10000,
          }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => startReply(messageAction.message)}
          >
            <Icon name="reply" size={17} />
            Yanıtla
          </button>
        </div>
      ) : null}

      {profileOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Kişi profili ve kullanıcı işlemleri"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            background: "rgba(0,0,0,.68)",
            backdropFilter: "blur(5px)",
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setProfileOpen(false);
            }
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 360,
              maxHeight: "100%",
              overflowY: "auto",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,.14)",
              padding: 22,
              background: theme === "light" ? "#fff" : "#17191f",
              color: theme === "light" ? "#151515" : "#fff",
              boxShadow: "0 24px 70px rgba(0,0,0,.4)",
              overflowWrap: "anywhere",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <strong>Kişi profili</strong>
              <button
                type="button"
                style={buttonStyle}
                onClick={() => setProfileOpen(false)}
                aria-label="Profili kapat"
              >
                <Icon name="close" size={17} />
              </button>
            </div>

            {profileBusy ? (
              <div className={styles.empty}>Profil yükleniyor…</div>
            ) : profile ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginBottom: 18,
                    minWidth: 0,
                  }}
                >
                  <Avatar
                    name={profile.display_name}
                    src={profile.avatar_url}
                    size={68}
                  />

                  <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                    <h3 style={{ margin: "0 0 6px" }}>
                      {profile.display_name}
                    </h3>
                    <small style={{ opacity: 0.7 }}>F1 Medipol üyesi</small>
                  </div>
                </div>

                {profile.bio ? (
                  <p
                    style={{
                      margin: "0 0 14px",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    {profile.bio}
                  </p>
                ) : null}

                {profile.favorite_team ? (
                  <p style={{ margin: "8px 0" }}>
                    <strong>Favori takım:</strong> {profile.favorite_team}
                  </p>
                ) : null}

                {profile.favorite_driver ? (
                  <p style={{ margin: "8px 0 18px" }}>
                    <strong>Favori pilot:</strong> {profile.favorite_driver}
                  </p>
                ) : null}

                <button
                  type="button"
                  style={{ ...primaryStyle, width: "100%", marginTop: 10 }}
                  onClick={() => {
                    // Profil penceresindeki RPC sonucuna bağlı kalma.
                    // Açık olan sohbetin karşı tarafının kimliğini kullan.
                    const targetId = active;

                    if (!targetId || !isUuid(targetId)) {
                      setStatus("Kullanıcı profili açılamadı.");
                      return;
                    }

                   setProfileOpen(false);

window.location.assign(
  `/profile?user=${encodeURIComponent(targetId)}`,
);
                  }}
                >
                  <Icon name="external" size={16} />
                  Profili ziyaret et
                </button>

                {active && profile.user_id === active ? (
                  <button
                    type="button"
                    style={{ ...buttonStyle, width: "100%", marginTop: 8 }}
                    disabled={busy}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `${profile.display_name} ile arkadaşlığı kaldırmak istiyor musun?`,
                        )
                      ) {
                        return;
                      }

                      const success = await act(
                        "dm_remove_friend",
                        { p_target: profile.user_id },
                        "Arkadaşlık kaldırıldı.",
                      );

                      if (success) {
                        setProfileOpen(false);
                        setActive("");
                        setMessages([]);
                        setReplyingTo(null);
                        setView("chats");
                      }
                    }}
                  >
                    <Icon name="trash" size={16} />
                    Arkadaşlığı kaldır
                  </button>
                ) : null}

                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    width: "100%",
                    marginTop: 8,
                    borderColor: "rgba(225,6,0,.4)",
                    color: theme === "light" ? "#b00000" : "#ff8b86",
                  }}
                  disabled={busy}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `${profile.display_name} kişisini engellemek istiyor musun?`,
                      )
                    ) {
                      return;
                    }

                    const success = await act(
                      "dm_block_user",
                      { p_target: profile.user_id, p_block: true },
                      "Kullanıcı engellendi.",
                    );

                    if (success) {
                      setProfileOpen(false);
                      setActive("");
                      setMessages([]);
                      setReplyingTo(null);
                      setView("chats");
                    }
                  }}
                >
                  <Icon name="block" size={16} />
                  Kullanıcıyı engelle
                </button>
              </>
            ) : (
              <div className={styles.empty}>
                Profil bilgileri yüklenemedi.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );

  if (mode === "page") {
    return (
      <div style={{ width: "100%", minWidth: 0 }}>
        {panel}
        {toast ? (
          <div className={styles.toast} role="status">
            {toast}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {/* Sohbet açıkken de başlatıcı düğmesi DOM'da kalır. */}
      <button
        type="button"
        className={`${styles.floatingButton} ${open ? styles.floatingButtonOpen || "" : ""}`}
        aria-label={open ? "Mesaj penceresini kapat" : "Mesajları aç"}
        aria-expanded={open}
        onClick={() => {
          if (open) {
            closePanel();
          } else {
            setOpen(true);
          }
        }}
      >
       <svg
  width="29"
  height="29"
  viewBox="0 0 24 24"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
>
  <path
    d="M22 2L11 13"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
  <path
    d="M22 2L15 22L11 13L2 9L22 2Z"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
</svg>
        {unread > 0 ? (
          <span className={styles.floatingBadge}>
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open && mounted
        ? createPortal(
            <>
              <button
                type="button"
                className={styles.backdrop}
                aria-label="Mesaj penceresini kapat"
                onClick={closePanel}
              />
              {panel}
              {toast ? (
                <div className={styles.toast} role="status">
                  {toast}
                </div>
              ) : null}
            </>,
            document.body,
          )
        : null}
    </>
  );
}