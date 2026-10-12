"use client";

import { useEffect, useState } from "react";
import type { DriverNewsItem } from "@/lib/f1-driver-news";

export default function DriverNewsCarousel({ items, raceName }: {
  items: DriverNewsItem[];
  raceName: string;
}) {
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [raceName]);
  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % items.length), 7500);
    return () => window.clearInterval(timer);
  }, [items.length]);

  const index = active % Math.max(items.length, 1);
  const current = items[index];
  const date = current?.publishedAt
    ? new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" }).format(new Date(current.publishedAt))
    : "";

  return <section className="pilot-news-card" aria-label="Pilotlar, hakem kararları ve yarış gündemi">
    <div className="pilot-news-topline">
      <span>F1 HABER MERKEZİ</span>
      {items.length > 1 && <span className="pilot-news-counter">{String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>}
    </div>
    {current ? (
      <div className="pilot-news-content" key={current.url} aria-live="off">
        <span style={{ display: "block", color: "#ff8b84", fontSize: "9px", fontWeight: 900, marginBottom: "7px" }}>{current.category}</span>
        <a href={current.url} target="_blank" rel="noopener noreferrer" className="pilot-news-title">{current.title}</a>
        <div className="pilot-news-meta">
          <span>{current.source} · {date}</span>
          <a href={current.url} target="_blank" rel="noopener noreferrer">HABERİ AÇ ↗</a>
        </div>
      </div>
    ) : (
      <div className="pilot-news-empty">
        <strong>Güncel haber akışı bekleniyor</strong>
        <p>{raceName} ve F1 gündemiyle ilgili doğrulanabilir haberler bulunduğunda burada görünecek. Güncel kaynaklar:</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
          <a href="https://www.formula1.com/en/latest" target="_blank" rel="noopener noreferrer">FORMULA 1 ↗</a>
          <a href="https://www.motorsport.com/f1/news/" target="_blank" rel="noopener noreferrer">MOTORSPORT ↗</a>
          <a href="https://www.autosport.com/f1/news/" target="_blank" rel="noopener noreferrer">AUTOSPORT ↗</a>
        </div>
      </div>
    )}
    {items.length > 1 && (
      <div className="pilot-news-controls" aria-label="Haberler arasında geçiş">
        <button type="button" onClick={() => setActive((i) => (i + items.length - 1) % items.length)} aria-label="Önceki haber">‹</button>
        <button type="button" onClick={() => setActive((i) => (i + 1) % items.length)} aria-label="Sonraki haber">›</button>
      </div>
    )}
  </section>;
}
