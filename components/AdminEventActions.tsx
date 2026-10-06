"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  eventId: string;
  eventTitle: string;
  isPublished: boolean;
};

export default function AdminEventActions({
  eventId,
  eventTitle,
  isPublished,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function readResponse(response: Response) {
    const text = await response.text();

    if (!text) {
      return {
        ok: response.ok,
        error: response.ok
          ? ""
          : `Sunucu hatası (${response.status})`,
      };
    }

    try {
      return JSON.parse(text);
    } catch {
      return {
        ok: false,
        error: `Geçersiz sunucu yanıtı (${response.status})`,
      };
    }
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

      if (!response.ok || !result.ok) {
        setMessage(
          result.error ||
            "Etkinliğin yayın durumu değiştirilemedi."
        );

        return;
      }

      setMessage(
        isPublished
          ? "Etkinlik taslağa alındı."
          : "Etkinlik yayınlandı."
      );

      router.refresh();
    } catch (error) {
      console.error(error);

      setMessage(
        "Sunucuya bağlanırken bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteEvent() {
    const confirmed = window.confirm(
      `"${eventTitle}" etkinliğini kalıcı olarak silmek istiyor musun?`
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

      if (!response.ok || !result.ok) {
        setMessage(
          result.error ||
            "Etkinlik silinemedi."
        );

        return;
      }

      setMessage("Etkinlik silindi.");

      router.refresh();
    } catch (error) {
      console.error(error);

      setMessage(
        "Sunucuya bağlanırken bir hata oluştu."
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
        alignItems: "flex-end",
        gap: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "7px",
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          className="btn"
          disabled={loading}
          onClick={togglePublished}
          style={{
            minHeight: "34px",
            padding: "0 11px",
            fontSize: "9px",
            opacity: loading ? 0.55 : 1,
          }}
        >
          {loading
            ? "İşleniyor..."
            : isPublished
              ? "Taslağa Çek"
              : "Yayınla"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={deleteEvent}
          style={{
            minHeight: "34px",
            padding: "0 11px",
            borderRadius: "9px",

            border:
              "1px solid rgba(225,6,0,.25)",

            background:
              "rgba(225,6,0,.08)",

            color: "#ff625b",

            fontSize: "9px",
            fontWeight: 900,

            cursor: loading
              ? "not-allowed"
              : "pointer",

            opacity: loading ? 0.55 : 1,
          }}
        >
          Sil
        </button>
      </div>

      {message && (
        <div
          style={{
            maxWidth: "260px",
            color: "#aab4c0",
            fontSize: "9px",
            textAlign: "right",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}