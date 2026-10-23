
"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
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

type Request = {
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
  relationship: string;
};

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  media_url?: string | null;
  media_kind?: MediaKind | null;
  media_mime?: string | null;
  media_name?: string | null;
};

type MediaRecord = {
  message_id: string;
  media_path: string;
  media_kind: MediaKind;
  media_mime: string;
  media_name: string;
};

const ALLOWED_MEDIA = new Set([
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

function readTheme(): Theme {
  if (typeof document === "undefined") return "gray";

  const html = document.documentElement;
  const value = (
    html.getAttribute("data-theme") ||
    html.getAttribute("data-site-theme") ||
    ""
  ).toLowerCase();

  if (["light", "white", "açık", "acik"].includes(value)) return "light";
  if (["red", "f1-red", "kırmızı", "kirmizi"].includes(value)) return "red";

  try {
    for (const key of ["f1-site-theme", "site-theme", "siteTheme", "theme"]) {
      const stored = (localStorage.getItem(key) || "").toLowerCase();

      if (["light", "white", "açık", "acik"].includes(stored)) {
        return "light";
      }

      if (["red", "f1-red", "kırmızı", "kirmizi"].includes(stored)) {
        return "red";
      }
    }
  } catch {}

  return "gray";
}

function Icon({
  name,
  size = 19,
}: {
  name:
    | "chat"
    | "users"
    | "search"
    | "close"
    | "send"
    | "back"
    | "check"
    | "plus"
    | "more"
    | "attach"
    | "mic"
    | "stop";
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "chat" && (
        <>
          <path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-3.6-.75L3 21l1.75-4.9A8.5 8.5 0 1 1 20 11.5Z" />
          <path d="M8 11.5h8m-8 3h5" />
        </>
      )}

      {name === "users" && (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 21v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5" />
        </>
      )}

      {name === "search" && (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </>
      )}

      {name === "close" && <path d="M5 5 19 19M19 5 5 19" />}

      {name === "send" && (
        <>
          <path d="m3 11 18-8-8 18-2.5-7.5L3 11Z" />
          <path d="M10.5 13.5 21 3" />
        </>
      )}

      {name === "back" && <path d="m15 5-7 7 7 7" />}
      {name === "check" && <path d="m5 12 4 4L19 6" />}
      {name === "plus" && <path d="M12 5v14M5 12h14" />}

      {name === "more" && (
        <>
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </>
      )}

      {name === "attach" && (
        <path d="m21.4 11.1-8.9 8.9a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
      )}

      {name === "mic" && (
        <>
          <rect x="9" y="2" width="6" height="13" rx="3" />
          <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" />
        </>
      )}

      {name === "stop" && <rect x="6" y="6" width="12" height="12" rx="2" />}
    </svg>
  );
}

function Avatar({
  name,
  src,
  small = false,
}: {
  name: string;
  src?: string | null;
  small?: boolean;
}) {
  return (
    <span className={`${styles.avatar} ${small ? styles.avatarSmall : ""}`}>
      {src ? (
        <img src={src} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span>{name.charAt(0).toLocaleUpperCase("tr-TR") || "F"}</span>
      )}
    </span>
  );
}

function formatTime(value: string | null) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function validUuid(value: string) {
  return /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
    value
  );
}

function getMediaKind(mime: string): MediaKind | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

function getExtension(mime: string) {
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

  return extensions[mime] || "bin";
}

export default function DmDock({
  isLight = false,
  mode = "dock",
}: {
  isLight?: boolean;
  mode?: "dock" | "page";
}) {
  const [supabase] = useState(() => createClient());
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(isLight ? "light" : "gray");
  const [open, setOpen] = useState(mode === "page");
  const [view, setView] = useState<View>("chats");
  const [active, setActive] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<Person[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState<{
    text: string;
    from: string;
    name: string;
  } | null>(null);

  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const friendsRef = useRef<Friend[]>([]);
  const countsRef = useRef<string | null>(null);
  const activeRef = useRef<string | null>(null);
  const openRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const recordingPartsRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const refresh = useCallback(async () => {
    if (!userId) return;

    const [f, r] = await Promise.all([
      supabase.rpc("dm_list_friends"),
      supabase.rpc("dm_list_requests"),
    ]);

    if (f.error || r.error) {
      setStatus(
        "Mesajlaşma verileri alınamadı. DM_FRIENDS_SETUP.sql kurulumunu kontrol et."
      );
      return;
    }

    friendsRef.current = (f.data || []) as Friend[];
    setFriends(friendsRef.current);

    const freshRequests = (r.data || []) as Request[];
    setRequests(freshRequests);

    const counts = `${
      friendsRef.current.reduce(
        (n, item) => n + Number(item.unread_count || 0),
        0
      )
    }:${freshRequests.filter((item) => item.direction === "incoming").length}`;

    if (countsRef.current !== counts) {
      countsRef.current = counts;
      window.dispatchEvent(new Event("f1-notifications-updated"));
    }

    setStatus("");
  }, [supabase, userId]);

  const loadMessages = useCallback(
    async (otherId: string) => {
      if (!userId || !validUuid(otherId)) return;

      const { data, error } = await supabase.rpc("dm_get_messages", {
        p_other: otherId,
        p_limit: 70,
      });

      if (error) {
        setStatus(error.message);
        return;
      }

      if (activeRef.current !== otherId) return;

      const base = (data || []) as Message[];

      let mergedMessages = base;

      const { data: mediaData, error: mediaError } = await supabase.rpc(
        "dm_get_media_metadata",
        { p_other: otherId }
      );

      if (!mediaError && mediaData?.length) {
        const media = mediaData as MediaRecord[];

        const signedEntries = await Promise.all(
          media.map(async (item) => {
            const { data: signedData } = await supabase.storage
              .from("dm-media")
              .createSignedUrl(item.media_path, 1800);

            return [
              item.message_id,
              {
                media_url: signedData?.signedUrl || null,
                media_kind: item.media_kind,
                media_mime: item.media_mime,
                media_name: item.media_name,
              },
            ] as const;
          })
        );

        const mediaByMessageId = new Map(signedEntries);

        mergedMessages = base.map((message) => ({
          ...message,
          ...mediaByMessageId.get(message.id),
        }));
      }

      if (activeRef.current !== otherId) return;

      setMessages(mergedMessages);

      const { error: readError } = await supabase.rpc("dm_mark_read", {
        p_other: otherId,
      });

      if (!readError) {
        window.dispatchEvent(new Event("f1-notifications-updated"));
        void refresh();
      }
    },
    [supabase, userId, refresh]
  );

  useEffect(() => {
    setMounted(true);

    const update = () => setTheme(readTheme());
    update();

    const watcher = new MutationObserver(update);

    watcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-site-theme", "class"],
    });

    window.addEventListener("theme-changed", update);
    window.addEventListener("site-theme-changed", update);

    return () => {
      watcher.disconnect();
      window.removeEventListener("theme-changed", update);
      window.removeEventListener("site-theme-changed", update);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (alive) setUserId(data.user?.id || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;

    void refresh();

    const onFocus = () => {
      void refresh();
      if (activeRef.current) void loadMessages(activeRef.current);
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("f1-dm-refresh", onFocus);

    const timer = window.setInterval(() => {
      if (!document.hidden) onFocus();
    }, 15000);

    const channel = supabase
      .channel(`dm-dock-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as { sender_id?: string; body?: string };

          void refresh();

          if (activeRef.current === next.sender_id && openRef.current) {
            void loadMessages(next.sender_id);
          } else if (next.sender_id) {
            const body = String(next.body || "Yeni mesaj").slice(0, 65);

            const senderName =
              friendsRef.current.find(
                (friend) => friend.user_id === next.sender_id
              )?.display_name || "Bir arkadaşın";

            setToast({
              text: body,
              from: next.sender_id,
              name: senderName,
            });

            if (toastTimer.current) clearTimeout(toastTimer.current);

            toastTimer.current = setTimeout(() => setToast(null), 6500);

            if (
              document.hidden &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              try {
                new Notification(`${senderName} · Yeni mesaj`, { body });
              } catch {}
            }
          }

          window.dispatchEvent(new Event("f1-notifications-updated"));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_friendships",
        },
        () => void refresh()
      )
      .subscribe();

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("f1-dm-refresh", onFocus);
      window.clearInterval(timer);
      void supabase.removeChannel(channel);

      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [supabase, userId, refresh, loadMessages]);

  useEffect(() => {
    if (active && userId && open) void loadMessages(active);
  }, [active, userId, open, loadMessages]);

  useEffect(() => {
    if (open && active) {
      bottomRef.current?.scrollIntoView({
        block: "end",
        behavior: "smooth",
      });
    }
  }, [messages.length, open, active]);

  useEffect(() => {
    if (!userId) return;

    const params = new URLSearchParams(window.location.search);
    const requested = params.get("dm");

    if (requested === "requests") {
      setOpen(true);
      setView("requests");
      setActive(null);
    } else if (requested && validUuid(requested)) {
      setOpen(true);
      setView("chats");
      setActive(requested);
    }

    const openExternal = (event: Event) => {
      const next = (event as CustomEvent<{ userId?: string }>).detail?.userId;

      if (next && validUuid(next)) {
        setOpen(true);
        setActive(next);
        setView("chats");
      } else {
        setOpen(true);
        setActive(null);
        setView("chats");
      }
    };

    window.addEventListener("f1-dm-open", openExternal);

    return () => window.removeEventListener("f1-dm-open", openExternal);
  }, [userId]);

  useEffect(() => {
    if (!userId || !mounted) return;

    const onStart = (event: globalThis.TouchEvent) => {
      const touch = event.touches[0];

      if (!touch || innerWidth > 680) return;

      lastTouch.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
    };

    const onEnd = (event: globalThis.TouchEvent) => {
      const initial = lastTouch.current;
      lastTouch.current = null;

      const touch = event.changedTouches[0];

      if (!initial || !touch || innerWidth > 680) return;

      const dx = touch.clientX - initial.x;
      const dy = touch.clientY - initial.y;

      if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 1.4) {
        return;
      }

      if (!openRef.current && initial.x > innerWidth - 28 && dx < -80) {
        setOpen(true);
        setView("chats");
      } else if (openRef.current && initial.x < 60 && dx > 80) {
        setOpen(false);
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [mounted, userId]);

  useEffect(() => {
    if (view !== "find" || search.trim().length < 2 || !userId) {
      setFound([]);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc("dm_find_users", {
        p_search: search.trim(),
      });

      if (!cancelled) {
        if (error) {
          setStatus(error.message);
        } else {
          setFound((data || []) as Person[]);
          setStatus("");
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [view, search, userId, supabase]);

  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.stop();
      } catch {}

      microphoneRef.current?.getTracks().forEach((track) => track.stop());
      microphoneRef.current = null;
      recorderRef.current = null;
      recordingPartsRef.current = [];
    };
  }, []);

  async function act(
    fn: () => PromiseLike<{ error: { message: string } | null }>,
    success: string
  ) {
    if (busy) return;

    setBusy(true);
    setStatus("");

    try {
      const { error } = await fn();

      if (error) throw new Error(error.message);

      setStatus(success);
      await refresh();

      if (search.trim().length >= 2 && view === "find") {
        const { data } = await supabase.rpc("dm_find_users", {
          p_search: search.trim(),
        });

        setFound((data || []) as Person[]);
      }

      window.dispatchEvent(new Event("f1-notifications-updated"));
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "İşlem başarısız oldu."
      );
    } finally {
      setBusy(false);
    }
  }

  async function notifyRecipient(messageId: string) {
    try {
      await fetch("/api/dm/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
        keepalive: true,
      });
    } catch {
      // Bildirim gönderimi başarısız olsa da medya mesajı gönderilmiş olabilir.
    }
  }

  async function uploadFile(file: File) {
    if (!userId || !active || busy) return;

    const recipient = active;
    const mime = file.type.toLowerCase().split(";")[0];
    const kind = getMediaKind(mime);

    if (!kind || !ALLOWED_MEDIA.has(mime)) {
      setStatus("Desteklenmeyen dosya türü. JPG, PNG, WebP, MP4, WebM veya desteklenen ses dosyalarını kullan.");
      return;
    }

    const maxSize =
      kind === "audio"
        ? 8 * 1024 * 1024
        : kind === "video"
          ? 25 * 1024 * 1024
          : 10 * 1024 * 1024;

    if (file.size > maxSize) {
      setStatus(
        `Dosya çok büyük. Bu tür için üst sınır ${Math.round(
          maxSize / 1024 / 1024
        )} MB.`
      );
      return;
    }

    setBusy(true);
    setStatus("Medya yükleniyor...");

    const path = `${userId}/${crypto.randomUUID()}.${getExtension(mime)}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("dm-media")
        .upload(path, file, {
          contentType: mime,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: sentId, error: sendError } = await supabase.rpc(
        "dm_send_media",
        {
          p_other: recipient,
          p_path: path,
          p_kind: kind,
          p_mime: mime,
          p_name: file.name || `medya.${getExtension(mime)}`,
        }
      );

      if (sendError) throw sendError;

      if (typeof sentId === "string") {
        void notifyRecipient(sentId);
      }

      setStatus("");
      await loadMessages(recipient);
      await refresh();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Medya gönderilemedi. Supabase medya kurulumunu kontrol et."
      );
    } finally {
      setBusy(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function toggleRecording() {
    if (recording) {
      try {
        recorderRef.current?.stop();
      } catch {
        setRecording(false);
        setStatus("Ses kaydı durdurulamadı.");
      }
      return;
    }

    if (!active || !userId || busy) return;

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setStatus("Bu tarayıcıda ses kaydı desteklenmiyor.");
      return;
    }

    try {
      setStatus("Mikrofon hazırlanıyor...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      microphoneRef.current = stream;

      const candidates = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/webm",
        "audio/ogg",
      ];

      const supported = candidates.find((mime) =>
        MediaRecorder.isTypeSupported(mime)
      );

      if (!supported) {
        stream.getTracks().forEach((track) => track.stop());
        microphoneRef.current = null;
        setStatus("Bu tarayıcının ses biçimi desteklenmiyor.");
        return;
      }

      const recorder = new MediaRecorder(stream, { mimeType: supported });
      recorderRef.current = recorder;
      recordingPartsRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingPartsRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setRecording(false);
        setStatus("Ses kaydı sırasında bir hata oluştu.");
        stream.getTracks().forEach((track) => track.stop());
        microphoneRef.current = null;
        recorderRef.current = null;
      };

      recorder.onstop = () => {
        const parts = [...recordingPartsRef.current];
        recordingPartsRef.current = [];
        stream.getTracks().forEach((track) => track.stop());

        microphoneRef.current = null;
        recorderRef.current = null;
        setRecording(false);

        const blob = new Blob(parts, { type: supported });
        const mime = supported.split(";")[0].toLowerCase();

        if (!blob.size) {
          setStatus("Ses kaydı boş olduğu için gönderilmedi.");
          return;
        }

        const extension = getExtension(mime);
        const file = new File(
          [blob],
          `ses-kaydi-${Date.now()}.${extension}`,
          { type: mime }
        );

        void uploadFile(file);
      };

      recorder.start();
      setRecording(true);
      setStatus("Ses kaydediliyor. Bitirmek ve göndermek için mikrofon düğmesine tekrar bas.");
    } catch (error) {
      microphoneRef.current?.getTracks().forEach((track) => track.stop());
      microphoneRef.current = null;
      recorderRef.current = null;
      setRecording(false);

      setStatus(
        error instanceof Error
          ? `Mikrofon açılamadı: ${error.message}`
          : "Mikrofon açılamadı. Tarayıcı izinlerini kontrol et."
      );
    }
  }

 async function send(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const body = draft.trim();
  const recipient = active;

  if (!recipient || !body || busy || recording || !userId) return;

  setBusy(true);
  setStatus("");

  // Gönderim sırasında yazılan metni koru.
  const previousDraft = draft;
  setDraft("");

  try {
    const { data: sentId, error } = await supabase.rpc("dm_send_message", {
      p_other: recipient,
      p_body: body,
    });

    if (error) throw new Error(error.message);

    // Arkadaş listesinin yenilenmesini beklemeden mesaj geçmişini yenile.
    void loadMessages(recipient);
    void refresh();

    if (typeof sentId === "string") {
      void notifyRecipient(sentId);
    }
  } catch (error) {
    // Gönderim başarısızsa mesajı kaybetme.
    setDraft((current) => current || previousDraft);
    setStatus(
      error instanceof Error ? error.message : "Mesaj gönderilemedi."
    );
  } finally {
    setBusy(false);
  }
}

  function closePanel() {
    setToast(null);

    if (mode === "page") {
      let stored = "/";

      try {
        stored = window.sessionStorage.getItem("f1-dm-last-page") || "/";
      } catch {}

      const safe =
        stored.startsWith("/") &&
        !stored.startsWith("//") &&
        !stored.startsWith("/messages")
          ? stored
          : "/";

      window.location.assign(safe);
      return;
    }

    setOpen(false);

    if (typeof window !== "undefined") {
      const next = new URL(window.location.href);

      if (next.searchParams.has("dm")) {
        next.searchParams.delete("dm");

        window.history.replaceState(
          {},
          "",
          next.pathname + next.search + next.hash
        );
      }
    }
  }

  const unread = friends.reduce(
    (acc, friend) => acc + Number(friend.unread_count || 0),
    0
  );

  const waiting = requests.filter(
    (request) => request.direction === "incoming"
  ).length;

  const total = unread + waiting;
  const partner = friends.find((item) => item.user_id === active);
  const canChat = Boolean(partner);
  const incoming = requests.filter((item) => item.direction === "incoming");
  const outgoing = requests.filter((item) => item.direction === "outgoing");

 if (!userId && mode === "page") return null;

  const isPageMode = mode === "page";

  const dialog = (
    <div
      className={
        
        isPageMode
          ? styles[theme] || ""
         : `${styles.portal} ${styles.popupMode} ${styles[theme] || ""}`
      }
      style={
        isPageMode
          ? {
              position: "relative",
              inset: "auto",
              zIndex: "auto",
              pointerEvents: "auto",
              display: "flex",
              justifyContent: "center",
              alignItems: "stretch",
              width: "100%",
              minHeight: "calc(100vh - 100px)",
              padding: "20px",
              boxSizing: "border-box",
              background: "transparent",
            }
          : undefined
      }
    >
      {!isPageMode && !open && (
        <button
          className={styles.floating}
          onClick={() => {
            setOpen(true);
            setActive(null);
            setView("chats");
          }}
          title="Mesajlarını aç"
          aria-label={`Mesajlarını aç, ${total} okunmamış`}
        >
          <Icon name="chat" size={23} />
          {total > 0 && (
            <b className={styles.counter}>
              {total > 99 ? "99+" : total}
            </b>
          )}
        </button>
      )}

      {!isPageMode && toast && !open && (
        <button
          className={styles.toast}
          onClick={() => {
            setOpen(true);
            setView("chats");
            setActive(toast.from);
            setToast(null);
          }}
        >
          <b>{toast.name} · Yeni mesaj</b>
          <span>{toast.text}</span>
        </button>
      )}

      {open && (
        <>
          {!isPageMode && (
            <button
              type="button"
              className={styles.backdrop}
              aria-label="Mesajlaşmayı kapat"
              onClick={closePanel}
            />
          )}

          <section
            className={styles.panel}
            role="dialog"
            aria-modal={!isPageMode}
            aria-label="F1 SOCIAL özel mesajlar"
            style={
              isPageMode
                ? {
                    position: "relative",
                    inset: "auto",
                    right: "auto",
                    bottom: "auto",
                    width: "100%",
                    maxWidth: "900px",
                    height: "min(760px, calc(100vh - 140px))",
                    minHeight: "420px",
                    maxHeight: "none",
                    margin: "0 auto",
                    flex: "1 1 auto",
                    boxSizing: "border-box",
                  }
                : undefined
            }
          >
            <header className={styles.panelHead}>
              {active ? (
                <button
                  className={styles.iconBtn}
                  onClick={() => {
                    setActive(null);
                    setMessages([]);
                  }}
                  aria-label="Konuşmalara dön"
                >
                  <Icon name="back" />
                </button>
              ) : (
                <span className={styles.headIcon}>
                  <Icon name="chat" size={21} />
                </span>
              )}

              <div className={styles.heading}>
                <strong>
                  {active ? partner?.display_name || "Özel mesaj" : "Mesajlar"}
                </strong>
                <small>
                  {active
                    ? "Özel konuşma"
                    : `${unread} okunmamış mesaj · ${waiting} istek`}
                </small>
              </div>

              {active && canChat && (
                <button
                  className={styles.iconBtn}
                  title="Arkadaşlığı kaldır"
                  aria-label="Arkadaşlığı kaldır"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        `${
                          partner?.display_name || "Bu kişi"
                        } ile arkadaşlığını kaldırmak istiyor musun? Konuşma geçmişi de silinir.`
                      )
                    ) {
                      void act(
                        () =>
                          supabase.rpc("dm_remove_friend", {
                            p_target: active,
                          }),
                        "Arkadaşlık kaldırıldı."
                      ).then(() => setActive(null));
                    }
                  }}
                >
                  <Icon name="users" size={18} />
                </button>
              )}

              <button
                className={styles.iconBtn}
                onClick={closePanel}
                aria-label={
                  isPageMode ? "Mesajlardan çık" : "Mesajlaşmayı kapat"
                }
              >
                <Icon name="close" />
              </button>
            </header>

            {active ? (
              <>
                <div className={styles.chatMessages}>
                  {!canChat && (
                    <div className={styles.empty}>
                      Bu kullanıcıyla konuşmak için arkadaş olmanız gerekiyor.
                      Arkadaşlarını veya isteklerini kontrol et.
                    </div>
                  )}

                  {canChat && messages.length === 0 && (
                    <div className={styles.empty}>
                      Henüz mesajınız yok. İlk mesajı sen gönder!
                    </div>
                  )}

                  {canChat &&
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`${styles.bubbleRow} ${
                          message.sender_id === userId ? styles.mine : ""
                        }`}
                      >
                        <div className={styles.bubble}>
                          {message.media_url && message.media_kind === "image" ? (
                            <a
                              href={message.media_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Fotoğrafı yeni sekmede aç"
                            >
                              <img
                                className={styles.mediaImage}
                                src={message.media_url}
                                alt={message.media_name || "Gönderilen fotoğraf"}
                                loading="lazy"
                              />
                            </a>
                          ) : message.media_url &&
                            message.media_kind === "video" ? (
                            <video
                              className={styles.mediaVideo}
                              src={message.media_url}
                              controls
                              playsInline
                              preload="metadata"
                            />
                          ) : message.media_url &&
                            message.media_kind === "audio" ? (
                            <audio
                              className={styles.mediaAudio}
                              src={message.media_url}
                              controls
                              preload="metadata"
                            />
                          ) : (
                            <p>{message.body}</p>
                          )}

                          {message.media_url && message.body.trim() && (
                            <p>{message.body}</p>
                          )}

                          <small>
                            {formatTime(message.created_at)}{" "}
                            {message.sender_id === userId
                              ? message.read_at
                                ? "· Görüldü"
                                : "· Gönderildi"
                              : ""}
                          </small>
                        </div>

                        {message.sender_id !== userId && (
                          <button
                            title="Mesajı bildir"
                            className={styles.report}
                            onClick={() => {
                              if (
                                confirm(
                                  "Bu mesaj moderatörlere bildirilsin mi?"
                                )
                              ) {
                                void act(
                                  () =>
                                    supabase.rpc("dm_report_message", {
                                      p_message: message.id,
                                      p_reason: "Uygunsuz mesaj",
                                    }),
                                  "Mesaj bildirildi."
                                );
                              }
                            }}
                          >
                            Bildir
                          </button>
                        )}
                      </div>
                    ))}

                  <div ref={bottomRef} />
                </div>

                {canChat && (
                  <form onSubmit={send} className={styles.composer}>
                    <input
                      ref={fileInputRef}
                      className={styles.fileHidden}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,audio/webm,audio/mp4,audio/mpeg,audio/ogg"
                      aria-label="Fotoğraf, video veya ses dosyası seç"
                      disabled={busy || recording}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file) void uploadFile(file);
                      }}
                    />

                    <button
                      type="button"
                      className={styles.attachBtn}
                      disabled={busy || recording}
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Fotoğraf veya video ekle"
                      title="Fotoğraf, video veya ses dosyası ekle"
                    >
                      <Icon name="attach" size={19} />
                    </button>

                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      maxLength={1000}
                      placeholder="Mesaj yaz..."
                      aria-label="Yeni mesaj"
                      disabled={recording}
                    />

                    <button
                      type="button"
                      className={`${styles.attachBtn} ${
                        recording ? styles.recording : ""
                      }`}
                      disabled={busy && !recording}
                      onClick={() => void toggleRecording()}
                      aria-label={recording ? "Ses kaydını bitir ve gönder" : "Ses kaydını başlat"}
                      title={recording ? "Kaydı bitir ve gönder" : "Ses kaydet"}
                    >
                      <Icon name={recording ? "stop" : "mic"} size={19} />
                    </button>

                    <button
                      type="submit"
                      disabled={!draft.trim() || busy || recording}
                      aria-label="Mesaj gönder"
                    >
                      <Icon name="send" />
                    </button>
                  </form>
                )}

                {canChat && (
                  <div className={styles.chatSafety}>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            "Bu kullanıcıyı engellemek istiyor musun? Arkadaşlık ve konuşma geçmişi silinir."
                          )
                        ) {
                          void act(
                            () =>
                              supabase.rpc("dm_block_user", {
                                p_target: active,
                                p_block: true,
                              }),
                            "Kullanıcı engellendi."
                          ).then(() => setActive(null));
                        }
                      }}
                    >
                      Kullanıcıyı engelle
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className={styles.tabs}>
                  <button
                    className={view === "chats" ? styles.selected : ""}
                    onClick={() => setView("chats")}
                  >
                    <Icon name="chat" size={16} /> Sohbetler
                  </button>

                  <button
                    className={view === "find" ? styles.selected : ""}
                    onClick={() => setView("find")}
                  >
                    <Icon name="search" size={16} /> Kişi bul
                  </button>

                  <button
                    className={view === "requests" ? styles.selected : ""}
                    onClick={() => setView("requests")}
                  >
                    <Icon name="users" size={16} /> İstekler
                    {waiting > 0 && <em>{waiting}</em>}
                  </button>
                </div>

                <div className={styles.listBody}>
                  {view === "chats" && (
                    <>
                      {friends.length === 0 && (
                        <div className={styles.empty}>
                          Henüz arkadaşın yok. “Kişi bul” sekmesinden kullanıcı
                          arayıp arkadaşlık isteği gönder.
                        </div>
                      )}

                      {friends.map((friend) => (
                        <button
                          className={styles.friendItem}
                          key={friend.user_id}
                          onClick={() => {
                            setActive(friend.user_id);
                            setMessages([]);
                            setDraft("");
                          }}
                        >
                          <Avatar
                            name={friend.display_name}
                            src={friend.avatar_url}
                          />

                          <span className={styles.friendCopy}>
                            <strong>{friend.display_name}</strong>
                            <small>
                              {friend.last_message || "Sohbeti başlat"}
                            </small>
                          </span>

                          <span className={styles.meta}>
                            {friend.unread_count > 0 ? (
                              <b>{friend.unread_count}</b>
                            ) : (
                              <small>{formatTime(friend.last_at)}</small>
                            )}
                          </span>
                        </button>
                      ))}
                    </>
                  )}

                  {view === "find" && (
                    <>
                      <label className={styles.searchBox}>
                        <Icon name="search" size={18} />
                        <input
                          autoFocus
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Kullanıcı adı veya görünen ad (en az 2 harf)"
                          maxLength={40}
                        />
                      </label>

                      {search.trim().length < 2 && (
                        <div className={styles.empty}>
                          Arkadaş eklemek için en az iki karakter yaz.
                        </div>
                      )}

                      {search.trim().length >= 2 && found.length === 0 && (
                        <div className={styles.empty}>
                          Bu aramayla eşleşen kullanıcı bulunamadı.
                        </div>
                      )}

                      {found.map((person) => (
                        <div
                          className={styles.personItem}
                          key={person.user_id}
                        >
                          <Avatar
                            small
                            name={person.display_name}
                            src={person.avatar_url}
                          />

                          <strong>{person.display_name}</strong>

                          {person.relationship === "accepted" ? (
                            <button disabled className={styles.secondary}>
                              Arkadaşın
                            </button>
                          ) : person.relationship === "pending" ? (
                            <button
                              className={styles.secondary}
                              onClick={() => setView("requests")}
                            >
                              İstek var
                            </button>
                          ) : person.relationship === "declined" ? (
                            <span className={styles.muted}>
                              İstek reddedildi
                            </span>
                          ) : (
                            <button
                              className={styles.action}
                              disabled={busy}
                              onClick={() =>
                                void act(
                                  () =>
                                    supabase.rpc("dm_add_friend", {
                                      p_target: person.user_id,
                                    }),
                                  "Arkadaşlık isteği gönderildi."
                                )
                              }
                            >
                              <Icon name="plus" size={15} /> Ekle
                            </button>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {view === "requests" && (
                    <>
                      {requests.length === 0 && (
                        <div className={styles.empty}>
                          Bekleyen arkadaşlık isteğin yok.
                        </div>
                      )}

                      {incoming.map((request) => (
                        <div
                          className={styles.personItem}
                          key={request.friendship_id}
                        >
                          <Avatar
                            small
                            name={request.display_name}
                            src={request.avatar_url}
                          />

                          <span className={styles.friendCopy}>
                            <strong>{request.display_name}</strong>
                            <small>Sana istek gönderdi</small>
                          </span>

                          <div className={styles.requestButtons}>
                            <button
                              className={styles.action}
                              disabled={busy}
                              onClick={() =>
                                void act(
                                  () =>
                                    supabase.rpc("dm_respond_friend", {
                                      p_friendship: request.friendship_id,
                                      p_accept: true,
                                    }),
                                  "Arkadaşlık isteği kabul edildi."
                                )
                              }
                            >
                              <Icon name="check" size={15} />
                            </button>

                            <button
                              className={styles.secondary}
                              disabled={busy}
                              onClick={() =>
                                void act(
                                  () =>
                                    supabase.rpc("dm_respond_friend", {
                                      p_friendship: request.friendship_id,
                                      p_accept: false,
                                    }),
                                  "İstek reddedildi."
                                )
                              }
                            >
                              <Icon name="close" size={15} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {outgoing.map((request) => (
                        <div
                          className={styles.personItem}
                          key={request.friendship_id}
                        >
                          <Avatar
                            small
                            name={request.display_name}
                            src={request.avatar_url}
                          />

                          <span className={styles.friendCopy}>
                            <strong>{request.display_name}</strong>
                            <small>Yanıt bekleniyor</small>
                          </span>

                          <button
                            className={styles.secondary}
                            disabled={busy}
                            onClick={() =>
                              void act(
                                () =>
                                  supabase.rpc("dm_remove_friend", {
                                    p_target: request.user_id,
                                  }),
                                "İstek iptal edildi."
                              )
                            }
                          >
                            İptal
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}

            {status && (
              <div className={styles.status} role="status">
                {status}
              </div>
            )}

            <footer className={styles.panelFoot}>
              <span>F1 MEDİPOL · ÖZEL MESAJLAR</span>
              <span>Arkadaşlar arasında</span>
            </footer>
          </section>
        </>
      )}
    </div>
  );

  if (!userId) return null;

  if (isPageMode) {
    return mounted ? dialog : null;
  }

  return (
    <>
      <button
        className={`${styles.headerButton} ${
          isLight ? styles.headerLight : ""
        }`}
        type="button"
        aria-label={`Mesajlar: ${unread} okunmamış mesaj, ${waiting} arkadaşlık isteği`}
        title="Mesajlar"
        onClick={() => {
  setActive(null);
  setView("chats");
  setOpen(true);
}}
      >
        <Icon name="chat" size={21} />
        {total > 0 && (
          <span className={styles.headerBadge}>
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {mounted ? createPortal(dialog, document.body) : null}
    </>
  );
}
