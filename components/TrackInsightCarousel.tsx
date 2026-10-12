"use client";

import { useEffect, useState } from "react";
import type { TrackInsight } from "@/lib/f1-track-insights";

export default function TrackInsightCarousel({ items, raceName }: {
  items: TrackInsight[];
  raceName: string;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => setActive(0), [raceName]);
  useEffect(() => {
    if (items.length <= 1) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % items.length), 8500);
    return () => window.clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;
  const current = items[active % items.length];
  return (
    <section className="track-insight-card" aria-label={`${raceName} pist bilgileri`}>
      <div className="track-insight-text" key={`${raceName}-${active}`}>
        <strong>{current.title}</strong>
        <p>{current.detail}</p>
        {current.sourceUrl && <a className="track-insight-source" href={current.sourceUrl}
          target="_blank" rel="noopener noreferrer">{current.sourceLabel ?? "KAYNAK ↗"}</a>}
      </div>
      {items.length > 1 && <div className="track-insight-actions">
        <span className="track-insight-count">{String(active % items.length + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
        <div className="track-insight-buttons">
          <button type="button" aria-label="Önceki pist notu" onClick={() => setActive((i) => (i + items.length - 1) % items.length)}>‹</button>
          <button type="button" aria-label="Sonraki pist notu" onClick={() => setActive((i) => (i + 1) % items.length)}>›</button>
        </div>
      </div>}
    </section>
  );
}
