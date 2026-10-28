"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";

export default function McOldGrandPrixPage() {
  const [reloadKey, setReloadKey] = useState(0);

  function toggleFullscreen() {
    const frame = document.getElementById(
      "mcold-grand-prix-frame"
    ) as HTMLIFrameElement | null;

    if (!frame) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void frame.requestFullscreen?.();
    }
  }

  return (
    <>
      <Header />

      <main
        style={{
          minHeight: "calc(100vh - 70px)",
          padding: "28px 16px 48px",
          color: "#fff",
          background:
            "radial-gradient(ellipse at top, #252a33 0%, #101216 48%, #08090c 100%)",
        }}
      >
        <div style={{ width: "min(1200px, 100%)", margin: "0 auto" }}>
          <Link
            href="/arcade"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 22,
              color: "#b9c0ca",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            ← ARCADE MERKEZİNE DÖN
          </Link>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <div
                style={{
                  color: "#ff3939",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 3,
                  marginBottom: 8,
                }}
              >
                F1 SOCIAL ARCADE
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(27px, 5vw, 44px)",
                  fontWeight: 950,
                  letterSpacing: -1.5,
                }}
              >
                McOld <span style={{ color: "#ed1c24" }}>Grand Prix</span>
              </h1>

              <p
                style={{
                  color: "#a5acb7",
                  fontSize: 13,
                  lineHeight: 1.7,
                  margin: "10px 0 0",
                }}
              >
                Motorlarını çalıştır ve yarışa başla.
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                style={buttonStyle}
              >
                ↻ Oyunu Yenile
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                style={{
                  ...buttonStyle,
                  background: "#ed1c24",
                  borderColor: "#ed1c24",
                }}
              >
                ⛶ Tam Ekran
              </button>
            </div>
          </div>

          <div
            style={{
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,.13)",
              borderRadius: 16,
              background: "#000",
              boxShadow: "0 24px 80px rgba(0,0,0,.45)",
            }}
          >
            <iframe
              key={reloadKey}
              id="mcold-grand-prix-frame"
              src="/games/mcold-grand-prix.html"
              title="McOld Grand Prix"
              allow="fullscreen; autoplay; gamepad"
              allowFullScreen
              style={{
                display: "block",
                width: "100%",
                height: "min(76vh, 760px)",
                minHeight: 420,
                border: 0,
                background: "#000",
              }}
            />
          </div>

          <p
            style={{
              color: "#858d99",
              fontSize: 12,
              lineHeight: 1.7,
              marginTop: 14,
            }}
          >
            Oyun yüklenmezse “Oyunu Yenile” düğmesini kullan. Daha geniş bir
            oyun alanı için “Tam Ekran” seçeneğini açabilirsin.
          </p>
        </div>
      </main>
    </>
  );
}

const buttonStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "0 15px",
  border: "1px solid rgba(255,255,255,.15)",
  borderRadius: 9,
  color: "#fff",
  background: "rgba(255,255,255,.06)",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};