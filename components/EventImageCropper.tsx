"use client";

import {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type Props = {
  file: File | null;
  onApply: (file: File) => void;
  onClose: () => void;
};

type RatioOption = {
  label: string;
  value: number;
  description: string;
};

const RATIOS: RatioOption[] = [
  { label: "Yatay", value: 16 / 9, description: "16:9" },
  { label: "Dikey", value: 4 / 5, description: "4:5" },
  { label: "Kare", value: 1, description: "1:1" },
];

export default function EventImageCropper({
  file,
  onApply,
  onClose,
}: Props) {
  const imageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    pointerX: 0,
    pointerY: 0,
    offsetX: 0,
    offsetY: 0,
  });

  const [imageUrl, setImageUrl] = useState("");
  const [ratio, setRatio] = useState(RATIOS[0]);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({
    width: 720,
    height: 405,
  });
  const [imageSize, setImageSize] = useState({
    width: 0,
    height: 0,
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setImageUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;

      setViewport({
        width: rect.width,
        height: rect.height,
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!imageSize.width || !imageSize.height) return;

    const baseScale = Math.max(
      viewport.width / imageSize.width,
      viewport.height / imageSize.height
    ) * zoom;

    setOffset({
      x: (viewport.width - imageSize.width * baseScale) / 2,
      y: (viewport.height - imageSize.height * baseScale) / 2,
    });
  }, [
    ratio.value,
    viewport.width,
    viewport.height,
    imageSize.width,
    imageSize.height,
  ]);

  const getScale = () => {
    if (!imageSize.width || !imageSize.height) return 1;

    return Math.max(
      viewport.width / imageSize.width,
      viewport.height / imageSize.height
    ) * zoom;
  };

  const clampOffset = (x: number, y: number, nextZoom = zoom) => {
    if (!imageSize.width || !imageSize.height) {
      return { x, y };
    }

    const scale =
      Math.max(
        viewport.width / imageSize.width,
        viewport.height / imageSize.height
      ) * nextZoom;

    const renderedWidth = imageSize.width * scale;
    const renderedHeight = imageSize.height * scale;

    return {
      x: Math.min(0, Math.max(viewport.width - renderedWidth, x)),
      y: Math.min(0, Math.max(viewport.height - renderedHeight, y)),
    };
  };

  function handleImageLoad() {
    const image = imageRef.current;
    if (!image) return;

    setImageSize({
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function changeZoom(value: number) {
    const nextZoom = Math.min(4, Math.max(1, value));
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    const oldScale = getScale();

    const sourceX = (centerX - offset.x) / oldScale;
    const sourceY = (centerY - offset.y) / oldScale;

    const nextScale =
      Math.max(
        viewport.width / imageSize.width,
        viewport.height / imageSize.height
      ) * nextZoom;

    const nextOffset = clampOffset(
      centerX - sourceX * nextScale,
      centerY - sourceY * nextScale,
      nextZoom
    );

    setZoom(nextZoom);
    setOffset(nextOffset);
  }

  function changeRatio(nextRatio: RatioOption) {
    setRatio(nextRatio);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();

    const step = event.deltaY < 0 ? 0.08 : -0.08;
    changeZoom(zoom + step);
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {
      active: true,
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  }

  function handlePointerMove(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    if (!dragRef.current.active) return;

    const dx = event.clientX - dragRef.current.pointerX;
    const dy = event.clientY - dragRef.current.pointerY;

    setOffset(
      clampOffset(
        dragRef.current.offsetX + dx,
        dragRef.current.offsetY + dy
      )
    );
  }

  function handlePointerUp() {
    dragRef.current.active = false;
  }

  async function applyCrop() {
    const image = imageRef.current;

    if (!image || !image.naturalWidth || !image.naturalHeight) {
      setError("Görsel henüz yüklenemedi.");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const scale = getScale();

      const sourceX = Math.max(0, -offset.x / scale);
      const sourceY = Math.max(0, -offset.y / scale);

      const sourceWidth = Math.min(
        image.naturalWidth - sourceX,
        viewport.width / scale
      );

      const sourceHeight = Math.min(
        image.naturalHeight - sourceY,
        viewport.height / scale
      );

      const outputWidth = Math.max(1, Math.round(sourceWidth));
      const outputHeight = Math.max(1, Math.round(sourceHeight));

      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Görsel düzenleyici başlatılamadı.");
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputWidth,
        outputHeight
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(new Error("Kadraj görseli oluşturulamadı."));
          },
          "image/jpeg",
          0.96
        );
      });

      const croppedFile = new File(
        [blob],
        `${file?.name.replace(/\.[^.]+$/, "") || "etkinlik"}-kadraj.jpg`,
        { type: "image/jpeg", lastModified: Date.now() }
      );

      onApply(croppedFile);
    } catch (cropError) {
      setError(
        cropError instanceof Error
          ? cropError.message
          : "Kadraj oluşturulamadı."
      );
    } finally {
      setProcessing(false);
    }
  }

  const scale = getScale();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "grid",
        placeItems: "center",
        padding: 18,
        background: "rgba(0,0,0,.86)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          width: "min(100%, 980px)",
          maxHeight: "94vh",
          overflowY: "auto",
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 18,
          background: "#101114",
          color: "#fff",
          boxShadow: "0 25px 100px rgba(0,0,0,.65)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "19px 22px",
            borderBottom: "1px solid #292a2e",
          }}
        >
          <div>
            <div
              style={{
                color: "#ff514b",
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: ".16em",
              }}
            >
              F1 SOCIAL · IMAGE STUDIO
            </div>
            <h2 style={{ margin: "5px 0 0", fontSize: 20 }}>
              Görsel kadrajını düzenle
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={secondaryButton}
          >
            Kapat
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {RATIOS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => changeRatio(item)}
                  style={{
                    ...secondaryButton,
                    borderColor:
                      ratio.label === item.label ? "#e10600" : "#35363b",
                    background:
                      ratio.label === item.label
                        ? "rgba(225,6,0,.16)"
                        : "#191a1e",
                  }}
                >
                  {item.label}
                  <span style={{ marginLeft: 6, color: "#92949c" }}>
                    {item.description}
                  </span>
                </button>
              ))}
            </div>

            <span style={{ color: "#858791", fontSize: 11 }}>
              Sürükle · Tekerlekle yakınlaştır
            </span>
          </div>

          <div
            ref={viewportRef}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              position: "relative",
              width: `min(100%, calc(52vh * ${ratio.value}))`,
              aspectRatio: String(ratio.value),
              margin: "0 auto",
              overflow: "hidden",
              borderRadius: 12,
              background: "#050505",
              cursor: "grab",
              touchAction: "none",
              userSelect: "none",
              border: "1px solid #3a3b40",
            }}
          >
            {imageUrl && (
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Kadraj önizlemesi"
                onLoad={handleImageLoad}
                draggable={false}
                style={{
                  position: "absolute",
                  left: offset.x,
                  top: offset.y,
                  width: imageSize.width * scale,
                  height: imageSize.height * scale,
                  maxWidth: "none",
                  maxHeight: "none",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />
            )}

            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,.35)",
                backgroundImage:
                  "linear-gradient(to right,transparent 33.2%,rgba(255,255,255,.22) 33.33%,transparent 33.5%,transparent 66.5%,rgba(255,255,255,.22) 66.66%,transparent 66.8%),linear-gradient(to bottom,transparent 33.2%,rgba(255,255,255,.22) 33.33%,transparent 33.5%,transparent 66.5%,rgba(255,255,255,.22) 66.66%,transparent 66.8%)",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: 12,
                bottom: 12,
                padding: "6px 9px",
                borderRadius: 6,
                background: "rgba(0,0,0,.65)",
                color: "#fff",
                fontSize: 10,
                pointerEvents: "none",
              }}
            >
              CANLI KADRAJ ÖNİZLEMESİ
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: 19,
            }}
          >
            <span style={{ color: "#c5c6cb", fontSize: 12, whiteSpace: "nowrap" }}>
              Uzaklaştır
            </span>

            <input
              type="range"
              min="1"
              max="4"
              step="0.01"
              value={zoom}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                changeZoom(Number(event.target.value))
              }
              style={{ flex: 1, accentColor: "#e10600" }}
            />

            <span style={{ color: "#c5c6cb", fontSize: 12, whiteSpace: "nowrap" }}>
              Yakınlaştır
            </span>

            <strong
              style={{
                minWidth: 45,
                textAlign: "right",
                fontSize: 12,
                color: "#ff625b",
              }}
            >
              {zoom.toFixed(2)}x
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginTop: 20,
            }}
          >
            <div style={{ color: "#858791", fontSize: 11 }}>
              Orijinal görsel: {imageSize.width} × {imageSize.height} px
              <br />
              Kadraj: {Math.round(viewport.width / scale)} ×{" "}
              {Math.round(viewport.height / scale)} px
            </div>

            <div style={{ display: "flex", gap: 9 }}>
              <button
                type="button"
                onClick={() => {
                  const baseScale = Math.max(
                    viewport.width / imageSize.width,
                    viewport.height / imageSize.height
                  );

                  setZoom(1);
                  setOffset({
                    x: (viewport.width - imageSize.width * baseScale) / 2,
                    y: (viewport.height - imageSize.height * baseScale) / 2,
                  });
                }}
                style={secondaryButton}
              >
                Sıfırla
              </button>

              <button
                type="button"
                onClick={applyCrop}
                disabled={processing || !imageSize.width}
                style={{
                  ...primaryButton,
                  opacity: processing ? 0.6 : 1,
                }}
              >
                {processing ? "Hazırlanıyor..." : "Kadrajı Uygula"}
              </button>
            </div>
          </div>

          {error && (
            <p style={{ color: "#ff7771", fontSize: 12, marginBottom: 0 }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const secondaryButton: React.CSSProperties = {
  padding: "9px 12px",
  border: "1px solid #35363b",
  borderRadius: 8,
  background: "#191a1e",
  color: "#eee",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const primaryButton: React.CSSProperties = {
  padding: "10px 16px",
  border: "1px solid #ff514b",
  borderRadius: 8,
  background: "linear-gradient(135deg,#e10600,#a80000)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};
