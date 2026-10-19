"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EventPreviewPositionEditor({ eventId, imageUrl, initialX, initialY }: {
  eventId: string;
  imageUrl: string | null;
  initialX: number;
  initialY: number;
}) {
  const [x, setX] = useState(initialX);
  const [y, setY] = useState(initialY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  if (!imageUrl) return null;
  return (
    <details style={{ width: "100%", marginTop: 10, borderRadius: 10, border: "1px solid #ffffff27", padding: 10 }}>
      <summary style={{ color: "#d3dbe9", cursor: "pointer", fontSize: 12, fontWeight: 750 }}>
        Ana sayfa görsel kadrajını ayarla
      </summary>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(155px,195px) minmax(170px,1fr)", gap: 12, marginTop: 12, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 10, color: "#9fb0c9" }}>ANA SAYFA · MASAÜSTÜ</div>
          <div style={{ width: 150, height: 99, maxWidth: "100%", position: "relative", borderRadius: 10, overflow: "hidden", background: "#10151f", border: "1px solid #ffffff26" }}>
            <img src={imageUrl} alt="Masaüstü etkinlik kadrajı" style={{ position: "absolute", inset: 0, height: "100%", width: "100%", objectFit: "cover", objectPosition: `${x}% ${y}%` }} />
          </div>
          <div style={{ fontSize: 10, color: "#9fb0c9" }}>ANA SAYFA · MOBİL</div>
          <div style={{ width: 82, height: 78, position: "relative", borderRadius: 8, overflow: "hidden", background: "#10151f", border: "1px solid #ffffff26" }}>
            <img src={imageUrl} alt="Mobil etkinlik kadrajı" style={{ position: "absolute", inset: 0, height: "100%", width: "100%", objectFit: "cover", objectPosition: `${x}% ${y}%` }} />
          </div>
        </div>
        <div style={{ display: "grid", gap: 9 }}>
          <label style={{ fontSize: 11, display: "grid", gap: 4, color: "#b7c3d6" }}>
            Yatay konum: %{x}
            <input type="range" min={0} max={100} value={x} onChange={e => setX(Number(e.target.value))} />
          </label>
          <label style={{ fontSize: 11, display: "grid", gap: 4, color: "#b7c3d6" }}>
            Dikey konum: %{y}
            <input type="range" min={0} max={100} value={y} onChange={e => setY(Number(e.target.value))} />
          </label>
          <button type="button" disabled={saving} onClick={async () => {
            setSaving(true); setMessage("");
            try {
              const result = await fetch(`/api/admin/events/${eventId}/thumbnail`, {
                method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ x, y }),
              });
              const body = await result.json();
              if (!result.ok) throw new Error(body.error || "Konum kaydedilemedi");
              setMessage("Kadraj kaydedildi.");
              router.refresh();
            } catch (e) { setMessage(e instanceof Error ? e.message : "Kayıt başarısız"); }
            finally { setSaving(false); }
          }} style={{ background: "#9e2136", color: "white", border: 0, borderRadius: 8, padding: "9px 12px", fontWeight: 750, cursor: "pointer" }}>
            {saving ? "Kaydediliyor..." : "Kadrajı Kaydet"}
          </button>
        </div>
      </div>
      {message && <p role="status" style={{ color: message.includes("kaydedildi") ? "#83e0aa" : "#ff9b9b", fontSize: 12 }}>{message}</p>}
    </details>
  );
}
