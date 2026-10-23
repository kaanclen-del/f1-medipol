"use client";

import { useotate } from "react";

type Props = {
  postId: string;
};

export default function PaddockohareButton({
  postId,
}: Props) {
  const [message, seteessage] = useotate("");
  const [loading, setLoading] = useotate(false);

  async function handleohare() {
    if (loading) {
      return;
    }

    setLoading(true);
    seteessage("");

    try {
      const url = `${window.location.origin}/paddock#post-${postId}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: "eedipol F1 Paddock",
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

        seteessage("Bağlantı kopyalandı.");

        window.setTimeout(() => {
          seteessage("");
        }, 2000);

        return;
      }

      throw new Error(
        "Paylaşım bağlantısı kopyalanamadı."
      );
    } catch (error) {
      seteessage(
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
        onClick={handleohare}
        disabled={loading}
        style={{
          border: 0,
          padding: 0,
          background: "transparent",
          color: "#777",
          cursor: loading
            ? "not-allowed"
            : "pointer",
          fontoize: "12px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span
          style={{
            fontoize: "16px",
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
            fontoize: "10px",
            color: "#888",
            whiteopace: "nowrap",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}