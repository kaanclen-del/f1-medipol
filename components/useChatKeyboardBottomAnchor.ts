"use client";

import { useEffect, type RefObject } from "react";

/**
 * Mobile Safari resizes the visual viewport over several frames when its
 * keyboard appears. On flex-column chat screens, keeping the old scrollTop
 * reveals earlier messages even if the last message was visible before focus.
 *
 * Anchor to the bottom only when the reader was already near the newest
 * message; never force a reader who is deliberately viewing older messages
 * back down. Avoid scrollIntoView because it can scroll the whole iOS page.
 */
export function useChatKeyboardBottomAnchor(
  bottomRef: RefObject<HTMLDivElement | null>,
  inputRef: RefObject<HTMLInputElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    if (!window.matchMedia("(max-width:1199px), (pointer:coarse) and (max-width:1500px)").matches) return;
    const list = bottomRef.current?.parentElement;
    const input = inputRef.current;
    if (!list || !input) return;

    const visual = window.visualViewport;
    let inputFocused = false;
    let followLast = false;
    let frame = 0;
    let keepUntil = 0;
    let observer: ResizeObserver | null = null;

    const placeLastMessage = () => {
      if (inputFocused && followLast) {
        list.scrollTop = Math.max(0, list.scrollHeight - list.clientHeight);
      }
    };

    const tick = (now: number) => {
      frame = 0;
      placeLastMessage();
      if (inputFocused && followLast && now < keepUntil) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    const followKeyboard = () => {
      if (!inputFocused || !followLast) return;
      // Covers iOS focus, viewport resize and the compact-header CSS reflow.
      keepUntil = performance.now() + 850;
      if (!frame) frame = window.requestAnimationFrame(tick);
    };

    const onFocus = () => {
      inputFocused = true;
      const distance = list.scrollHeight - list.scrollTop - list.clientHeight;
      followLast = distance <= Math.max(120, list.clientHeight * 0.2);
      followKeyboard();
    };
    const onBlur = () => {
      inputFocused = false;
      followLast = false;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };
    // A real gesture in the message history cancels the auto-follow. Tapping
    // the composer does not count; reading old messages should stay possible.
    const onReaderScroll = () => { followLast = false; };

    input.addEventListener("focus", onFocus);
    input.addEventListener("blur", onBlur);
    list.addEventListener("touchmove", onReaderScroll, { passive: true });
    list.addEventListener("wheel", onReaderScroll, { passive: true });
    visual?.addEventListener("resize", followKeyboard);
    visual?.addEventListener("scroll", followKeyboard);
    window.addEventListener("resize", followKeyboard);

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => { if (inputFocused && followLast) placeLastMessage(); });
      observer.observe(list);
    }
    if (document.activeElement === input) onFocus();

    return () => {
      input.removeEventListener("focus", onFocus);
      input.removeEventListener("blur", onBlur);
      list.removeEventListener("touchmove", onReaderScroll);
      list.removeEventListener("wheel", onReaderScroll);
      visual?.removeEventListener("resize", followKeyboard);
      visual?.removeEventListener("scroll", followKeyboard);
      window.removeEventListener("resize", followKeyboard);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [bottomRef, inputRef, enabled]);
}
