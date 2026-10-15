"use client";

import type { CSSProperties } from "react";
import css from "./ChatReplyKit.module.css";

export type ChatReplyTarget = { id: string; author: string; preview: string };
const REPLY_START = "⟦F1REPLY1|";
const QUOTED = /^⟦F1REPLY1\|([a-f0-9-]{36})\|([^|]*)\|([^|]*)⟧\n([\s\S]*)$/i;

export function parseChatReply(body: string): {text: string; quote: ChatReplyTarget | null} {
  const value = String(body || "");
  if (!value.startsWith(REPLY_START)) return {text:value,quote:null};
  const matched = value.match(QUOTED);
  if (!matched) return {text:value,quote:null};
  try {
    return {text:matched[4],quote:{id:matched[1],author:decodeURIComponent(matched[2]),preview:decodeURIComponent(matched[3])}};
  } catch { return {text:value,quote:null}; }
}

export function createChatReply(body: string, quote: ChatReplyTarget | null, maxLength: number): string | null {
  if (!quote) return body.length <= maxLength ? body : null;
  const author = encodeURIComponent(quote.author.trim().slice(0, 24));
  const preview = encodeURIComponent(quote.preview.trim().replace(/\s+/g," ").slice(0, 65));
  const tagged = `⟦F1REPLY1|${quote.id}|${author}|${preview}⟧\n${body}`;
  return tagged.length <= maxLength ? tagged : null;
}

export function ChatReplyQuote({ quote, onJump, composing=false }: {
  quote: ChatReplyTarget; onJump?: (messageId:string)=>void; composing?: boolean;
}) {
  const style = {"--f1reply-mode":composing?"1":"0"} as CSSProperties;
  return <button type="button" className={`${css.quote} ${composing?css.composing:""}`}
    style={style} onClick={() => onJump?.(quote.id)}
    title={composing?"Yanıtlanan mesaj":"Orijinal mesaja git"}>
    <strong>↪ {quote.author}</strong>
    <span>{quote.preview || "Mesaj"}</span>
  </button>;
}

export function focusQuotedMessage(id:string) {
  const el=document.getElementById(`f1-chat-message-${id}`);
  if (!el) return false;
  el.scrollIntoView({behavior:"smooth",block:"center"});
  el.classList.remove(css.focused);
  // Animation can be restarted by forcing layout in the focused element only.
  void el.getBoundingClientRect();
  el.classList.add(css.focused);
  window.setTimeout(()=>el.classList.remove(css.focused),1750);
  return true;
}
