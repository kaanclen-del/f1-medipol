"use client";

import { useEffect, useRef, useState, type ReactNode, type TouchEvent, type MouseEvent, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import css from "./ChatMessageGesture.module.css";

type Props = {
  children: ReactNode;
  onReply: () => void;
  onPin: () => void;
  onCopy: () => void;
  pinned?: boolean;
  disabled?: boolean;
  pinBusy?: boolean;
};

type Point = { x: number; y: number; dragging: boolean; longPressed: boolean };

export default function ChatMessageGesture({ children, onReply, onPin, onCopy, pinned=false, disabled=false, pinBusy=false }: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<Point | null>(null);
  const swipeDistance = useRef(0);
  const [offset, setOffset] = useState(0);
  const [menu, setMenu] = useState<{left:number;top:number} | null>(null);

  const clearTimer = () => { if (longPress.current !== null) { clearTimeout(longPress.current); longPress.current=null; } };
  useEffect(() => () => clearTimer(), []);

  function openMenu() {
    if (disabled) return;
    clearTimer();
    const rect = shellRef.current?.getBoundingClientRect();
    const w = typeof window !== "undefined" ? window.innerWidth : 375;
    const h = typeof window !== "undefined" ? window.innerHeight : 700;
    const width = 188;
    const height = 143;
    setMenu({
      left: Math.min(Math.max(8, rect ? rect.left + rect.width / 2 - width / 2 : 8), w - width - 8),
      top: rect ? (rect.bottom + height + 10 < h ? rect.bottom + 5 : Math.max(8, rect.top - height - 5)) : 8,
    });
  }

  const isInteractive = (target:EventTarget & Element) => Boolean(target.closest("button,a,input,textarea,video,audio,[role='button']"));
  function onStart(e:TouchEvent<HTMLDivElement>) {
    if (disabled || e.touches.length!==1 || isInteractive(e.target as EventTarget & Element)) return;
    const t=e.touches[0];
    start.current={x:t.clientX,y:t.clientY,dragging:false,longPressed:false};
    swipeDistance.current=0;
    clearTimer();
    longPress.current=setTimeout(()=>{
      if (start.current && !start.current.dragging) {
        start.current.longPressed=true;
        openMenu();
        if (typeof navigator!=="undefined" && "vibrate" in navigator) navigator.vibrate?.(12);
      }
    },520);
  }
  function onMove(e:TouchEvent<HTMLDivElement>) {
    const item=start.current;
    if (!item || disabled) return;
    const t=e.touches[0];
    if (!t) return;
    const dx=t.clientX-item.x,dy=t.clientY-item.y;
    if (Math.abs(dx)>9 || Math.abs(dy)>9) { item.dragging=true;clearTimer(); }
    // Right swipe only; vertical scrolling stays native.
    if (dx>12 && Math.abs(dx)>Math.abs(dy)*1.25) {
      swipeDistance.current=Math.min(75,dx);
      setOffset(swipeDistance.current);
    } else if (Math.abs(dy)>18) {swipeDistance.current=0;setOffset(0);}
  }
  function onEnd() {
    clearTimer();
    const wasSwiped=swipeDistance.current>=55;
    start.current=null;
    swipeDistance.current=0;
    setOffset(0);
    if (wasSwiped && !disabled) onReply();
  }
  function contextMenu(e:MouseEvent<HTMLDivElement>) {
    if (disabled) return;
    e.preventDefault();
    openMenu();
  }

  const action = (callback:()=>void) => {setMenu(null);callback();};
  const position:CSSProperties|undefined=menu?{left:menu.left,top:menu.top}:undefined;
  return <>
    <div ref={shellRef} className={css.shell} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} onTouchCancel={onEnd} onContextMenu={contextMenu}>
      <div className={css.content} style={offset?{transform:`translate3d(${offset}px,0,0)`}:undefined}>
        {children}
        {!disabled && <button type="button" className={css.more} title="Mesaj işlemleri" aria-label="Mesaj işlemleri" onClick={openMenu}>•••</button>}
      </div>
      {offset>12 && <span className={css.swipeHint} aria-hidden="true">↪</span>}
    </div>
    {menu && typeof document!=="undefined" && createPortal(<>
      <button type="button" className={css.dismiss} aria-label="Mesaj işlemlerini kapat" onClick={()=>setMenu(null)} />
      <div className={css.menu} style={position} role="menu" aria-label="Mesaj işlemleri">
        <button type="button" role="menuitem" onClick={()=>action(onReply)}>↪ <span>Yanıtla</span></button>
        <button type="button" role="menuitem" disabled={pinBusy} onClick={()=>action(onPin)}>📌 <span>{pinned?"Sabitlemeyi kaldır":"Sabitle"}</span></button>
        <button type="button" role="menuitem" onClick={()=>action(onCopy)}>⧉ <span>Kopyala</span></button>
      </div>
    </>,document.body)}
  </>;
}
