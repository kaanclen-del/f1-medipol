"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import styles from "./RaceChat.module.css";

type ChatMessage = {
  id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

type Props = {
  season: number;
  round: number;
  raceName: string;
  authenticated: boolean;
};

export default function RaceChat({ season, round, raceName, authenticated }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myUserId, setMyUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const wasAtBottom = useRef(true);

  const load = useCallback(async (quiet = false) => {
    if (!authenticated) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/race-chat?season=${season}&round=${round}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sohbet yÃƒÂ¼klenemedi.");
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setMyUserId(data.myUserId || "");
      setIsAdmin(Boolean(data.isAdmin));
      setConnected(true);
      setError("");
    } catch (err) {
      setConnected(false);
      if (!quiet) setError(err instanceof Error ? err.message : "Sohbet baÃ„Å¸lantÃ„Â±sÃ„Â± kurulamadÃ„Â±.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [authenticated, season, round]);

  useEffect(() => {
    void load();
    if (!authenticated) return;

    // Supabase Realtime anlik yeniler, polling ise kopmalara karsi yedektir.
    const supabase = createClient();
    const channel = supabase.channel(`race-chat-${season}-${round}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "race_chat_messages",
        filter: `season=eq.${season}`,
      }, () => {
        if (document.visibilityState === "visible") void load(true);

      })
      .subscribe();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 12000);
    const visible = () => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      void supabase.removeChannel(channel);
    };
  }, [authenticated, season, round, load]);

  useEffect(() => {
    const node = listRef.current;
    if (node && wasAtBottom.current) node.scrollTop = node.scrollHeight;
  }, [messages]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = text.trim();
    if (!authenticated || sending || content.length < 1 || content.length > 400) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/race-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season, round, content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Mesaj gÃƒÂ¶nderilemedi.");
      setText("");
      wasAtBottom.current = true;
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mesaj gÃƒÂ¶nderilemedi.");
    } finally {
      setSending(false);
    }
  }

  async function removeMessage(id: string) {
    if (!window.confirm("Bu mesajÃ„Â± silmek istiyor musun?")) return;
    try {
      const response = await fetch(`/api/race-chat/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Mesaj silinemedi.");
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mesaj silinemedi.");
    }
  }

  async function reportMessage(id: string) {
    if (!window.confirm("Bu mesajÃ„Â± moderasyona bildirmek istiyor musun?")) return;
    try {
      const response = await fetch("/api/race-chat/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Bildirim gÃƒÂ¶nderilemedi.");
      window.alert("Bildirim alÃ„Â±ndÃ„Â±. YÃƒÂ¶netim tarafÃ„Â±ndan incelenebilir.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bildirim gÃƒÂ¶nderilemedi.");
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <section className={styles.root} aria-label="Grand Prix canlÃ„Â± sohbet">
      <div className={styles.ambience} aria-hidden="true" />
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}><span className={styles.pulse} /> F1 MEDÃ„Â°POL / RACE COMMUNITY</p>
          <h1 className={styles.title}>GRAND PRIX <span>CHAT</span></h1>
          <p className={styles.caption}>{raceName} <span>Ã‚Â·</span> {season} Sezonu {round > 0 ? `Ã‚Â· Round ${round}` : "Ã‚Â· Genel Sohbet"}</p>
        </div>
        <div className={styles.headButtons}>
          <span className={styles.status}><i className={connected ? styles.online : ""} />{connected ? "BAÃ„ÂLI" : "SOHBET"}</span>
          <Link href="/predict" className={styles.back}>Ã¢â€ Â Tahmine dÃƒÂ¶n</Link>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.chatPanel}>
          <div className={styles.channelHeader}>
            <span><b>#</b> grand-prix-{round || "genel"}</span>
            <span>SON 70 MESAJ</span>
          </div>
          <div className={styles.messages} ref={listRef} onScroll={(e) => {
            const el = e.currentTarget;
            wasAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
          }}>
            {!authenticated ? (
              <div className={styles.empty}>
                <b>Sohbete katÃ„Â±lmak iÃƒÂ§in oturum aÃƒÂ§.</b>
                <span>YarÃ„Â±Ã…Å¸ tartÃ„Â±Ã…Å¸malarÃ„Â± yalnÃ„Â±zca F1 SOCIAL ÃƒÂ¼yelerine aÃƒÂ§Ã„Â±k.</span>
                <Link href="/login" className={styles.loginButton}>Oturum AÃƒÂ§</Link>
              </div>
            ) : loading ? (
              <div className={styles.empty}>Mesajlar yÃƒÂ¼kleniyor...</div>
            ) : messages.length === 0 ? (
              <div className={styles.empty}><b>Ã„Â°lk mesajÃ„Â± sen gÃƒÂ¶nder!</b><span>YarÃ„Â±Ã…Å¸ hakkÃ„Â±ndaki ilk fikrini paylaÃ…Å¸arak sohbeti baÃ…Å¸lat.</span></div>
            ) : messages.map((msg) => {
              const mine = msg.user_id === myUserId;
              return (
                <div key={msg.id} className={`${styles.message} ${mine ? styles.mine : ""}`}>
                  <div className={styles.avatar} aria-hidden="true">{(msg.author_name || "S").slice(0, 1).toLocaleUpperCase("tr-TR")}</div>
                  <div className={styles.bubble}>
                    <div className={styles.meta}>
                      <strong>{msg.author_name}</strong>
                      {mine && <span className={styles.me}>SEN</span>}
                      <time dateTime={msg.created_at}>{new Date(msg.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</time>
                      {!mine && <button type="button" className={styles.delete} onClick={() => void reportMessage(msg.id)} aria-label="MesajÃ„Â± bildir">Bildir</button>}
                      {(mine || isAdmin) && <button type="button" className={styles.delete} onClick={() => void removeMessage(msg.id)} aria-label="MesajÃ„Â± sil">Sil</button>}
                    </div>
                    <div className={styles.body}>{msg.content}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {error && <div className={styles.error} role="alert">{error}</div>}
          {authenticated ? (
            <form onSubmit={send} className={styles.composer}>
              <textarea
                aria-label="Sohbet mesajÃ„Â±"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 400))}
                onKeyDown={onKeyDown}
                maxLength={400}
                rows={2}
                placeholder="YarÃ„Â±Ã…Å¸ hakkÃ„Â±nda ne dÃƒÂ¼Ã…Å¸ÃƒÂ¼nÃƒÂ¼yorsun?"
                disabled={sending}
              />
              <div className={styles.composeBottom}>
                <span>Enter: gÃƒÂ¶nder Ã‚Â· Shift+Enter: yeni satÃ„Â±r <b>{text.length}/400</b></span>
                <button type="submit" disabled={sending || text.trim().length === 0}>{sending ? "GÃƒâ€“NDERÃ„Â°LÃ„Â°YOR" : "GÃƒâ€“NDER Ã¢â€ â€”"}</button>
              </div>
            </form>
          ) : null}
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sideTile}>
            <span className={styles.kicker}>PADDOCK / LIVE DISCUSSION</span>
            <h2>YARIÃ…ÂI BÃ„Â°RLÃ„Â°KTE YAÃ…ÂA.</h2>
            <p>Podyum tahminlerini tartÃ„Â±Ã…Å¸, pit stop stratejilerini yorumla ve diÃ„Å¸er ÃƒÂ¼yelerin fikirlerini keÃ…Å¸fet.</p>
          </div>
          <div className={styles.sideTile}>
            <span className={styles.kicker}>SOHBET KURALLARI</span>
            <p>SaygÃ„Â±lÃ„Â± ol. Spam, hakaret ve kiÃ…Å¸isel bilgi paylaÃ…Å¸Ã„Â±mÃ„Â±ndan kaÃƒÂ§Ã„Â±n. Tahminler kapanana kadar diÃ„Å¸er ÃƒÂ¼yelerin kayÃ„Â±tlÃ„Â± tahminlerini sistem otomatik olarak gÃƒÂ¶stermez.</p>
            <div className={styles.note}>Mesajlar yarÃ„Â±Ã…Å¸a ÃƒÂ¶zeldir ve Supabase ÃƒÂ¼zerinde saklanÃ„Â±r.</div>
          </div>
          <Link href="/paddock" className={styles.paddock}>PADDOCK'A GÃ„Â°T <span>Ã¢â€ â€”</span></Link>
        </aside>
      </div>
    </section>
  );
}
