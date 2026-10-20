"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./HeaderThemeMenu.module.css";

type SiteTheme = "gray" | "red" | "light";
const choices: { key: SiteTheme; label: string; description: string }[] = [
  { key: "gray", label: "Gri", description: "Koyu yarış teması" },
  { key: "red", label: "F1 Kırmızı", description: "Kırmızı yarış teması" },
  { key: "light", label: "Açık", description: "Açık renk teması" },
];
const keys = ["f1-site-theme", "site-theme", "siteTheme", "theme"];
function valid(value: string | null): value is SiteTheme {
  return value === "gray" || value === "red" || value === "light";
}
function currentTheme(): SiteTheme {
  if (typeof document === "undefined") return "gray";
  const html = document.documentElement;
  const attr = html.getAttribute("data-theme") || html.getAttribute("data-site-theme");
  if (valid(attr)) return attr;
  try { for (const key of keys) {
    const candidate = localStorage.getItem(key);
    if (valid(candidate)) return candidate;
  } } catch { /* Storage unavailable. */ }
  return "gray";
}
function saveTheme(value: SiteTheme) {
  document.documentElement.setAttribute("data-theme", value);
  document.documentElement.setAttribute("data-site-theme", value);
  try { keys.forEach(key => localStorage.setItem(key, value)); } catch { /* Theme still works. */ }
  window.dispatchEvent(new CustomEvent("theme-changed", { detail: { theme: value } }));
  window.dispatchEvent(new CustomEvent("site-theme-changed", { detail: { theme: value } }));
}

export default function HeaderThemeMenu({ compact = false }: { compact?: boolean }) {
  const [selected, setSelected] = useState<SiteTheme>("gray");
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setSelected(currentTheme());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true, attributeFilter: ["data-theme", "data-site-theme"],
    });
    window.addEventListener("theme-changed", sync);
    window.addEventListener("site-theme-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("theme-changed", sync);
      window.removeEventListener("site-theme-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const dismiss = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setExpanded(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false); };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [expanded]);

  return (
    <div className={`${styles.root} ${compact ? styles.compact : ""}`} ref={rootRef} data-f1-theme-picker>
      <button
        type="button" className={styles.trigger}
        aria-label="Renk temasını değiştir" aria-haspopup="true" aria-expanded={expanded}
        title="Tema seç" onClick={() => setExpanded(value => !value)}
      >
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18c1.4 0 1.9-1.1 1.3-2.1-.7-1.3-.2-2.5 1.3-2.5H17a4 4 0 0 0 4-4"/>
          <circle cx="7.5" cy="10" r=".6" fill="currentColor"/><circle cx="12" cy="7.5" r=".6" fill="currentColor"/><circle cx="17" cy="10" r=".6" fill="currentColor"/>
        </svg>
        <span className={styles.indicator} data-selected={selected}/>
      </button>
      {expanded && <div className={styles.menu} role="group" aria-label="Renk temaları" data-f1-theme-panel>
        <div className={styles.menuTitle} data-f1-theme-title>GÖRÜNÜM</div>
        {choices.map(choice => <button
          type="button" key={choice.key}
          className={`${styles.option} ${selected === choice.key ? styles.active : ""}`}
          data-f1-theme-option
          aria-pressed={selected === choice.key}
          onClick={() => { setSelected(choice.key); saveTheme(choice.key); setExpanded(false); }}
        >
          <span className={styles.colorDot} data-color={choice.key}/>
          <span className={styles.copy}><strong data-f1-theme-name>{choice.label}</strong><small data-f1-theme-description>{choice.description}</small></span>
          {selected === choice.key && <span className={styles.check} data-f1-theme-check aria-hidden="true">✓</span>}
        </button>)}
      </div>}
    </div>
  );
}
