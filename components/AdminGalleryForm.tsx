"use client";

import {
  CSSProperties,
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: "8px",
  border: "1px solid #333",
  background: "#111",
  color: "#fff",
  outline: "none",
};

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "14px",
  color: "#ddd",
};

async function readResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: text,
    };
  }
}

export default function AdminGalleryForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isPublished, setIsPublished] =
    useState(true);

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function uploadImage() {
    if (!imageFile) {
      throw new Error("Bir görsel seçmelisin.");
    }

    const formData = new FormData();
    formData.append("file", imageFile);

    const response = await fetch(
      "/api/admin/gallery-image-upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await readResponse(response);

    if (!response.ok) {
      throw new Error(
        (result as { error?: string }).error ||
          `Görsel yüklenemedi. HTTP ${response.status}`
      );
    }

    const uploadedUrl = (
      result as {
        url?: string;
      }
    ).url;

    if (!uploadedUrl) {
      throw new Error(
        "Yüklenen görselin adresi alınamadı."
      );
    }

    return uploadedUrl;
  }

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const imageUrl = await uploadImage();

      const response = await fetch(
        "/api/admin/gallery",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            caption,
            imageUrl,
            sortOrder,
            isPublished,
          }),
        }
      );

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          (result as { error?: string }).error ||
            `Galeri görseli kaydedilemedi. HTTP ${response.status}`
        );
      }

      setMessage(
        "Galeri görseli başarıyla eklendi."
      );

      setTitle("");
      setCaption("");
      setSortOrder(0);
      setIsPublished(true);
      setImageFile(null);

      const fileInput =
        document.getElementById(
          "gallery-image-file"
        ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        maxWidth: "800px",
      }}
    >
      <label style={labelStyle}>
        Görsel
        <input
          id="gallery-image-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file =
              e.target.files?.[0] ?? null;

            setImageFile(file);
          }}
          style={inputStyle}
          required
        />
      </label>

      <div
        style={{
          fontSize: "12px",
          color: "#888",
          marginTop: "-10px",
        }}
      >
        JPG, PNG veya WEBP. Maksimum 5 MB.
      </div>

      <label style={labelStyle}>
        Başlık
        <input
          type="text"
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
          style={inputStyle}
          placeholder="Örn: Karting Etkinliği"
        />
      </label>

      <label style={labelStyle}>
        Açıklama
        <textarea
          value={caption}
          onChange={(e) =>
            setCaption(e.target.value)
          }
          rows={4}
          style={{
            ...inputStyle,
            resize: "vertical",
          }}
          placeholder="Fotoğraf hakkında kısa açıklama"
        />
      </label>

      <label style={labelStyle}>
        Sıralama
        <input
          type="number"
          value={sortOrder}
          onChange={(e) =>
            setSortOrder(
              Number(e.target.value)
            )
          }
          style={inputStyle}
          min={0}
        />
      </label>

      <div
        style={{
          fontSize: "12px",
          color: "#888",
          marginTop: "-10px",
        }}
      >
        Küçük sayıdaki görseller galeride daha
        önce gösterilir.
      </div>

      <label
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) =>
            setIsPublished(e.target.checked)
          }
        />

        Yayında
      </label>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "12px 18px",
          border: "none",
          borderRadius: "8px",
          background: "#b00020",
          color: "#fff",
          fontWeight: 700,
          cursor: loading
            ? "not-allowed"
            : "pointer",
        }}
      >
        {loading
          ? "Yükleniyor..."
          : "Galeriye Ekle"}
      </button>

      {message && (
        <div
          style={{
            padding: "12px",
            borderRadius: "8px",
            background: "#161616",
            border: "1px solid #333",
            color: "#ddd",
          }}
        >
          {message}
        </div>
      )}
    </form>
  );
}