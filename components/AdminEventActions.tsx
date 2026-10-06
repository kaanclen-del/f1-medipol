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
    const confirmed = window.confirm(
      `"${eventTitle}" etkinliğini silmek istediğine emin misin?`
    );

    if (!confirmed) {
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
            `Silme başarısız. HTTP ${response.status}`
        );
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
        justifyContent: "flex-end",
      }}
    >
      <button
        type="button"
        className={isPublished ? "btn" : "btn btn-red"}
        onClick={togglePublished}
        disabled={loading}
      >
        {loading
          ? "Bekle..."
          : isPublished
          ? "Taslağa Çek"
          : "Yayınla"}
      </button>

      <button
        type="button"
        className="btn"
        onClick={deleteEvent}
        disabled={loading}
        style={{
          borderColor: "rgba(255,80,80,.25)",
        }}
      >
        Sil
      </button>

      {message && (
        <span
          style={{
            width: "100%",
            fontSize: "10px",
            color: "#aab4c0",
            textAlign: "right",
          }}
        >
          {message}
        </span>
      )}
    </div>
  );
}