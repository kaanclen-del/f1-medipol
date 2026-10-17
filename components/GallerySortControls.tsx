"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; title: string; image_url: string };
export default function GallerySortControls({ images }: { images: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(images);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  function reorder(from: number, to: number) {
    if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return;
    setItems((previous) => {
      const next = [...previous];
      const [entry] = next.splice(from, 1);
      next.splice(to, 0, entry);
      return next;
    });
  }
  async function save() {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/admin/gallery/reorder", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: items.map((item) => item.id) }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Sıralama kaydedilemedi.");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Bir hata oluştu."); }
    finally { setSaving(false); }
  }
  return <section style={{ padding: 16, border: "1px solid #343434", borderRadius: 14, marginBottom: 24, background: "#101010" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
      <div><strong>Galeri sıralaması</strong><p style={{ color: "#aaa", fontSize: 12, margin: "5px 0 0" }}>Sürükleyerek veya oklarla değiştir. İlk sıradaki fotoğraf galeride ilk görünür.</p></div>
      <button type="button" onClick={save} disabled={saving} style={{ background: "#cf1736", color: "#fff", border: 0, borderRadius: 9, padding: "11px 17px", fontWeight: 700, cursor: "pointer" }}>{saving ? "Kaydediliyor…" : "Sıralamayı kaydet"}</button>
    </div>
    {error && <p role="alert" style={{ color: "#ff9ca7" }}>{error}</p>}
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((item, index) => <div key={item.id} draggable={!saving} onDragStart={() => setDragId(item.id)} onDragEnd={() => setDragId(null)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (dragId) reorder(items.findIndex((x) => x.id === dragId), index); setDragId(null); }} style={{ display: "flex", alignItems: "center", gap: 10, background: "#1b1b1b", padding: 8, borderRadius: 9 }}>
        <strong style={{ minWidth: 28 }}>{index + 1}.</strong>
        <img src={item.image_url} alt="" style={{ width: 42, height: 48, objectFit: "cover", borderRadius: 6 }} />
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>{item.title}</span>
        <button type="button" aria-label={`${item.title} yukarı taşı`} disabled={saving || index === 0} onClick={() => reorder(index, index - 1)}>↑</button>
        <button type="button" aria-label={`${item.title} aşağı taşı`} disabled={saving || index === items.length - 1} onClick={() => reorder(index, index + 1)}>↓</button>
      </div>)}
    </div>
  </section>;
}
