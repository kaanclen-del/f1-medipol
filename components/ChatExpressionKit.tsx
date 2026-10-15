"use client";

import { useState } from "react";
import css from "./ChatExpressionKit.module.css";

// Sticker IDs are sent as regular DM/group text, so all previously deployed
// Supabase RPCs and row-level policies remain unchanged.
const STICKERS = [
  {id:"pole", emoji:"🏁", title:"POLE!", tone:"red"},
  {id:"speed", emoji:"🏎️", title:"FULL GAS", tone:"red"},
  {id:"trophy", emoji:"🏆", title:"ŞAMPİYON", tone:"gold"},
  {id:"fire", emoji:"🔥", title:"ÇOK HIZLI", tone:"red"},
  {id:"pit", emoji:"🔧", title:"PIT STOP", tone:"blue"},
  {id:"radio", emoji:"🎧", title:"BOX BOX", tone:"blue"},
  {id:"heart", emoji:"❤️", title:"TAM DESTEK", tone:"pink"},
  {id:"star", emoji:"⭐", title:"10/10", tone:"gold"},
  {id:"eyes", emoji:"👀", title:"İZLİYORUM", tone:"blue"},
  {id:"rain", emoji:"🌧️", title:"YAĞMUR!", tone:"blue"},
  {id:"party", emoji:"🎉", title:"BRAVO!", tone:"pink"},
  {id:"wave", emoji:"👋", title:"SELAM!", tone:"gold"},
] as const;
const EMOJIS = ["😀","😁","😂","🤣","😊","😍","🥹","😎","😅","😉","😭","😤","😱","🤔","🫡","😴","🙌","👏","👍","👎","❤️","🧡","💜","🔥","✨","💯","👀","🤝","🏁","🏎️","🏆","⚡","🚀","🥇","🥈","🥉","🎉","🍿","👑","💪","🤍","🫶","😈","💀","🌧️","☀️","🎧","🔧"];

export function stickerPayload(id: string): string { return `[[f1-sticker:${id}]]`; }
export function stickerFor(body: string) {
  const match = /^\[\[f1-sticker:([a-z]+)\]\]$/.exec(body.trim());
  return match ? STICKERS.find(s => s.id === match[1]) || null : null;
}
export function messagePreview(body: string | null | undefined) {
  if (!body) return "Sohbeti başlat";
  const sticker = stickerFor(body);
  return sticker ? `${sticker.emoji} ${sticker.title} çıkartması` : body;
}
export function ChatMessageBody({body}: {body:string}) {
  const sticker = stickerFor(body);
  if (!sticker) return <p>{body}</p>;
  return <div className={`${css.sticker} ${css[sticker.tone]}`} aria-label={`${sticker.title} çıkartması`}>
    <span className={css.stickerEmoji} aria-hidden="true">{sticker.emoji}</span>
    <span className={css.stickerTitle}>{sticker.title}</span>
    <span className={css.stickerStripe} aria-hidden="true" />
  </div>;
}
export function ChatExpressionPicker({onEmoji,onSticker,onClose}: {onEmoji:(emoji:string)=>void;onSticker:(value:string)=>void;onClose:()=>void}) {
  const [tab,setTab] = useState<"emoji"|"sticker">("emoji");
  return <div className={css.picker} role="dialog" aria-label="Emoji ve çıkartma seç" onClick={e=>e.stopPropagation()}>
    <div className={css.header}><strong>İfadeler</strong><button type="button" onClick={onClose} aria-label="Seçiciyi kapat">×</button></div>
    <div className={css.tabs} role="tablist" aria-label="İfade türü">
      <button type="button" role="tab" aria-selected={tab==="emoji"} className={tab==="emoji"?css.active:""} onClick={()=>setTab("emoji")}>😊 Emoji</button>
      <button type="button" role="tab" aria-selected={tab==="sticker"} className={tab==="sticker"?css.active:""} onClick={()=>setTab("sticker")}>🏁 Çıkartma</button>
    </div>
    {tab==="emoji" ? <div className={css.emojiGrid}>
      {EMOJIS.map((emoji,i)=><button key={`${emoji}-${i}`} type="button" aria-label={`${emoji} ekle`} onClick={()=>onEmoji(emoji)}>{emoji}</button>)}
    </div> : <div className={css.stickerGrid}>
      {STICKERS.map(sticker=><button key={sticker.id} type="button" className={css.stickerChoice} aria-label={`${sticker.title} çıkartmasını gönder`} onClick={()=>onSticker(stickerPayload(sticker.id))}>
        <span aria-hidden="true">{sticker.emoji}</span><strong>{sticker.title}</strong>
      </button>)}
    </div>}
  </div>;
}
