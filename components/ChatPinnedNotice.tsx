"use client";

import { messagePreview } from "./ChatExpressionKit";
import { parseChatReply } from "./ChatReplyKit";
import css from "./ChatPinnedNotice.module.css";

export type PinnedMessage = {message_id:string;sender_id:string;body:string;author_name:string;pinned_at:string};

export default function ChatPinnedNotice({pin,onJump,onRemove,busy=false}: {
  pin:PinnedMessage|null;onJump:(id:string)=>void;onRemove:()=>void;busy?:boolean;
}) {
  if(!pin)return null;
  return <div className={css.notice} role="group" aria-label="Sabitlenen mesaj">
    <span className={css.mark} aria-hidden="true">📌</span>
    <button type="button" className={css.preview} onClick={()=>onJump(pin.message_id)} title="Sabitlenen mesaja git">
      <strong>{pin.author_name || "Üye"}</strong>
      <span>{messagePreview(parseChatReply(pin.body).text).slice(0,95) || "Medya mesajı"}</span>
    </button>
    <button type="button" disabled={busy} className={css.remove} onClick={onRemove} aria-label="Sabitlemeyi kaldır" title="Sabitlemeyi kaldır">×</button>
  </div>;
}
