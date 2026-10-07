"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  eventId: string;
  eventTitle: string;
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

export default function AdminEventActions({
  eventId,
  eventTitle,
  isPublished,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function editEvent() {
    router.push(`/admin/events/${eventId}/edit`);
  }

  async function togglePublished() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/events/${eventId}`,
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
          ? "Etkinlik taslağa alındı."
          : "Etkinlik yayınlandı."
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

  async function deleteEvent() {
    const approved = window.confirm(
      `"${eventTitle}" etkinliğini silmek istediğine emin misin?`
    );

    if (!approved) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/events/${eventId}`,
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

      setMessage("Etkinlik silindi.");

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
        marginTop: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <button
          type="button"
          onClick={editEvent}
          disabled={loading}
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid #555",
            background: "#202020",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Düzenle
        </button>

        <button
          type="button"
          onClick={togglePublished}
          disabled={loading}
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid #555",
            background: isPublished ? "#333" : "#8b0000",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading
            ? "Bekle..."
            : isPublished
              ? "Taslağa Al"
              : "Yayınla"}
        </button>

        <button
          type="button"
          onClick={deleteEvent}
          disabled={loading}
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid #7a2020",
            background: "#3a1010",
            color: "#ffb4b4",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Sil
        </button>
      </div>

      {message && (
        <div
          style={{
            fontSize: "13px",
            color: "#ccc",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}