"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const games = [
  { id: "manager", title: "F1 Manager" },
  { id: "whatif", title: "What If" },
  { id: "rush", title: "Kart Rush 3D" },
  { id: "timing", title: "Go-Kart Zamanlama" },
  { id: "mcold", title: "MCOLD Grand Prix" },
] as const;

type GameId = (typeof games)[number]["id"];

export default function AdminArcadeBackgroundsClient() {
  const [images, setImages] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function refresh() {
    const response = await fetch("/api/arcade-game-backgrounds", {
      cache: "no-store",
    });
    const result = await response.json();

    if (response.ok && result.ok) {
      const next: Record<string, string> = {};
      for (const item of result.backgrounds ?? []) {
        next[item.game_id] = item.image_url;
      }
      setImages(next);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function upload(gameId: GameId) {
    const file = files[gameId];
    if (!file) {
      setMessage("Önce bir görsel seç.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      setMessage("JPG, PNG, WebP veya AVIF formatı seç.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage("Dosya 10 MB sınırını aşıyor.");
      return;
    }

    setBusy(gameId);
    setMessage("");

    try {
      const signResponse = await fetch("/api/admin/arcade-backgrounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign",
          gameId,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      const signed = await signResponse.json();
      if (!signResponse.ok || !signed.ok) {
        throw new Error(signed.error ?? "Yükleme başlatılamadı.");
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("gallery-images")
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type,
          cacheControl: "3600",
        });

      if (uploadError) throw new Error(uploadError.message);

      const completeResponse = await fetch("/api/admin/arcade-backgrounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          gameId,
          path: signed.path,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      const completed = await completeResponse.json();
      if (!completeResponse.ok || !completed.ok) {
        throw new Error(completed.error ?? "Görsel kaydedilemedi.");
      }

      setImages((current) => ({ ...current, [gameId]: completed.imageUrl }));
      setFiles((current) => {
        const next = { ...current };
        delete next[gameId];
        return next;
      });
      setMessage(`${games.find((game) => game.id === gameId)?.title} arka planı kaydedildi.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Yükleme başarısız.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 18px 70px", color: "#f5f7fa" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: "#ff5149", fontSize: 10, fontWeight: 900, letterSpacing: ".15em" }}>
          F1 SOCIAL · ARCADE
        </div>
        <h1 style={{ margin: "8px 0", fontSize: "clamp(28px,5vw,42px)" }}>
          Oyun Arka Planları
        </h1>
        <p style={{ color: "#a0aab7", lineHeight: 1.6 }}>
          Her oyun için ayrı bir görsel seç. Yüklediğin görsel ana sayfadaki oyun kartında arka plan olarak kullanılır.
          JPG, PNG, WebP ve AVIF desteklenir; dosya sınırı 10 MB.
        </p>
      </div>

      {message && (
        <p role="status" style={{
          padding: 13,
          borderRadius: 10,
          background: "rgba(255,255,255,.06)",
          border: "1px solid rgba(255,255,255,.12)",
          overflowWrap: "anywhere",
        }}>
          {message}
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,310px),1fr))", gap: 18 }}>
        {games.map((game) => {
          const selected = files[game.id];
          const preview = selected ? URL.createObjectURL(selected) : images[game.id];

          return (
            <section key={game.id} style={{
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 16,
              background: "#131820",
            }}>
              <div style={{
                minHeight: 170,
                background: preview
                  ? `linear-gradient(0deg,rgba(0,0,0,.58),rgba(0,0,0,.05)),url("${preview}") center/cover`
                  : "linear-gradient(135deg,#35151c,#111822)",
                display: "flex",
                alignItems: "flex-end",
                padding: 18,
              }}>
                <strong style={{ fontSize: 24, textShadow: "0 2px 12px #000" }}>{game.title}</strong>
              </div>

              <div style={{ padding: 18 }}>
                <label htmlFor={`file-${game.id}`} style={{ display: "block", fontSize: 12, fontWeight: 800, marginBottom: 9 }}>
                  Arka plan görseli
                </label>
                <input
                  id={`file-${game.id}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setFiles((current) => ({ ...current, [game.id]: file }));
                  }}
                  style={{ width: "100%", fontSize: 12 }}
                />

                <button
                  type="button"
                  disabled={!selected || busy !== null}
                  onClick={() => void upload(game.id)}
                  style={{
                    width: "100%",
                    marginTop: 14,
                    minHeight: 43,
                    border: 0,
                    borderRadius: 9,
                    color: "#fff",
                    background: busy === game.id ? "#6d3030" : "#e10600",
                    fontWeight: 900,
                    cursor: !selected || busy !== null ? "not-allowed" : "pointer",
                    opacity: !selected || busy !== null ? .55 : 1,
                  }}
                >
                  {busy === game.id ? "YÜKLENİYOR..." : "ARKA PLANI KAYDET"}
                </button>
                <p style={{ color: "#8c98a7", fontSize: 11, marginBottom: 0 }}>
                  {images[game.id] ? "Kayıtlı arka plan mevcut." : "Henüz özel arka plan yüklenmedi."}
                </p>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
