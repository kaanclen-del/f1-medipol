"use client";

import { useState } from "react";

type Props = {
  postId: string;
};

export default function PaddockShareButton({
  postId,
}: Props) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    if (loading) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const url = `${window.location.origin}/paddock#post-${postId}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: "Medipol F1 Paddock",
            text: "Bu Paddock gönderisine göz at.",
            url,
          });

          return;
        } catch (error) {
          if (
            error instanceof Error &&
            error.name === "AbortError"
          ) {
            return;
          }
        }
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);

        setMessage("Bağlantı kopyalandı.");

        window.setTimeout(() => {
          setMessage("");
        }, 2000);

        return;
      }

      throw new Error(
        "Paylaşım bağlantısı kopyalanamadı."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Paylaşım sırasında hata oluştu."
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
        gap: "5px",
      }}
    >
      <button
        type="button"
        onClick={handleShare}
        disabled={loading}
        style={{
          border: 0,
          padding: 0,
          background: "transparent",
          color: "#777",
          cursor: loading
            ? "not-allowed"
            : "pointer",
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span
          style={{
            fontSize: "16px",
            lineHeight: 1,
          }}
        >
          ↗
        </span>

        <span>
          {loading ? "..." : "Paylaş"}
        </span>
      </button>

      {message && (
        <div
          style={{
            fontSize: "10px",
            color: "#888",
            whiteSpace: "nowrap",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}