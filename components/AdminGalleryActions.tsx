"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  imageId: string;
  imageTitle?: string | null;
  isPublished: boolean;
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

export default function AdminGalleryActions({
  imageId,
  imageTitle,
  isPublished,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function togglePublished() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/gallery/${imageId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isPublished: !isPublished,
          }),
        }
      );

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          (result as { error?: string }).error ||
            `İşlem başarısız. HTTP ${response.status}`
        );
      }

      setMessage(
        isPublished
          ? "Görsel yayından kaldırıldı."
          : "Görsel yayınlandı."
      );

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

  async function deleteImage() {
    const approved = window.confirm(
      `"${imageTitle || "Bu görsel"}" silinsin mi?`
    );

    if (!approved) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/gallery/${imageId}`,
        {
          method: "DELETE",
        }
      );

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          (result as { error?: string }).error ||
            `Silme işlemi başarısız. HTTP ${response.status}`
        );
      }

      setMessage("Görsel silindi.");

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        marginTop: "14px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={togglePublished}
          disabled={loading}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #444",
            background: isPublished
              ? "#272727"
              : "#8b0000",
            color: "#fff",
            cursor: loading
              ? "not-allowed"
              : "pointer",
          }}
        >
          {loading
            ? "Bekle..."
            : isPublished
              ? "Yayından Kaldır"
              : "Yayınla"}
        </button>

        <button
          type="button"
          onClick={deleteImage}
          disabled={loading}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #7a2020",
            background: "#3a1010",
            color: "#ffb4b4",
            cursor: loading
              ? "not-allowed"
              : "pointer",
          }}
        >
          Sil
        </button>
      </div>

      {message && (
        <div
          style={{
            fontSize: "12px",
            color: "#aaa",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}