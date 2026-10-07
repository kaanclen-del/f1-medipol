"use client";

import { ChangeEvent, useRef, useState } from "react";

export default function ProfileAvatarUploader() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Sadece JPG, PNG veya WEBP yükleyebilirsin.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Profil fotoğrafı en fazla 5 MB olabilir.");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/profile/avatar-upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data?.error || "Profil fotoğrafı yüklenemedi."
        );
        return;
      }

      setPreviewUrl(data.url);
      setMessage("✅ Profil fotoğrafı güncellendi.");
    } catch {
      setMessage("Profil fotoğrafı yüklenirken hata oluştu.");
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div
      style={{
        padding: "22px",
        borderRadius: "18px",
        border: "1px solid rgba(255,255,255,.08)",
        background: "rgba(255,255,255,.025)",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: "92px",
            height: "92px",
            borderRadius: "50%",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, #20252c, #101216)",
            border: "2px solid rgba(255,255,255,.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Profil fotoğrafı"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <span
              style={{
                fontSize: "32px",
                opacity: 0.45,
              }}
            >
              👤
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: "220px" }}>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 800,
              marginBottom: "6px",
            }}
          >
            Profil Fotoğrafı
          </div>

          <div
            style={{
              color: "#929dab",
              fontSize: "12px",
              lineHeight: 1.6,
              marginBottom: "12px",
            }}
          >
            JPG, PNG veya WEBP · Maksimum 5 MB
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: "none" }}
          />

          <button
            type="button"
            className="btn btn-red"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            style={{
              opacity: uploading ? 0.6 : 1,
              cursor: uploading ? "wait" : "pointer",
            }}
          >
            {uploading
              ? "Yükleniyor..."
              : "Fotoğraf Seç"}
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            marginTop: "14px",
            fontSize: "12px",
            color: message.startsWith("✅")
              ? "#8de3a5"
              : "#ff9ca9",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}