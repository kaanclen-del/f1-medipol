"use client";

import { useEffect, useState } from "react";

type GalleryImage = {
  id: string;
  title: string | null;
  caption: string | null;
  image_url: string;
  sort_order: number | null;
  created_at: string | null;
};

export default function GalleryLightboxGrid({ images }: { images: GalleryImage[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") setActiveIndex((prev) => (prev === null ? prev : (prev + 1) % images.length));
      if (event.key === "ArrowLeft") setActiveIndex((prev) => (prev === null ? prev : (prev - 1 + images.length) % images.length));
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeIndex, images.length]);

  const activeImage = activeIndex !== null ? images[activeIndex] : null;

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 380px))",
          gap: "24px",
          justifyContent: "start",
        }}
      >
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            style={{
              width: "100%",
              overflow: "hidden",
              borderRadius: "18px",
              background: "#101010",
              border: "1px solid #242424",
              boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
              padding: 0,
              textAlign: "left",
              cursor: "zoom-in",
            }}
          >
            <div
              style={{
                aspectRatio: "3 / 4",
                background: "#151515",
                overflow: "hidden",
              }}
            >
              <img
                src={image.image_url}
                alt={image.title || "Medipol F1 Kulübü galeri görseli"}
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>

            {(image.title || image.caption) && (
              <div style={{ padding: "18px 18px 20px" }}>
                {image.title && (
                  <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700 }}>
                    {image.title}
                  </h2>
                )}

                {image.caption && (
                  <p
                    style={{
                      margin: image.title ? "9px 0 0" : 0,
                      color: "#999",
                      fontSize: "14px",
                      lineHeight: 1.6,
                    }}
                  >
                    {image.caption}
                  </p>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {activeImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeImage.title || "Galeri görseli"}
          onClick={() => setActiveIndex(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(3, 5, 10, 0.9)",
            backdropFilter: "blur(8px)",
            padding: "28px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(1200px, 100%)",
              maxHeight: "92vh",
              display: "grid",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
              <div style={{ minWidth: 0 }}>
                {activeImage.title && (
                  <h2 style={{ margin: 0, color: "#fff", fontSize: "clamp(24px, 4vw, 36px)", lineHeight: 1.1 }}>
                    {activeImage.title}
                  </h2>
                )}
                {activeImage.caption && (
                  <p style={{ margin: activeImage.title ? "8px 0 0" : 0, color: "#bdbdbd", lineHeight: 1.6 }}>
                    {activeImage.caption}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                style={{
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  borderRadius: "999px",
                  padding: "10px 16px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Kapat
              </button>
            </div>

            <div
              style={{
                position: "relative",
                borderRadius: "24px",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "#0d0f15",
                boxShadow: "0 30px 70px rgba(0,0,0,0.45)",
                minHeight: "320px",
                display: "grid",
                placeItems: "center",
              }}
            >
              <img
                src={activeImage.image_url}
                alt={activeImage.title || "Galeri görseli"}
                style={{
                  display: "block",
                  width: "100%",
                  maxHeight: "78vh",
                  objectFit: "contain",
                  background: "#0d0f15",
                }}
              />

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((prev) => (prev === null ? prev : (prev - 1 + images.length) % images.length))}
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "44px",
                      height: "44px",
                      borderRadius: "999px",
                      border: "1px solid rgba(255,255,255,0.16)",
                      background: "rgba(6, 9, 15, 0.65)",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "22px",
                    }}
                    aria-label="Önceki görsel"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((prev) => (prev === null ? prev : (prev + 1) % images.length))}
                    style={{
                      position: "absolute",
                      right: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "44px",
                      height: "44px",
                      borderRadius: "999px",
                      border: "1px solid rgba(255,255,255,0.16)",
                      background: "rgba(6, 9, 15, 0.65)",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "22px",
                    }}
                    aria-label="Sonraki görsel"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
