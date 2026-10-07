"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  postId: string;
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

export default function PaddockDeleteButton({
  postId,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function handleDelete() {
    if (loading) {
      return;
    }

    const confirmed = window.confirm(
      "Bu gönderiyi silmek istediğine emin misin?"
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/paddock/posts/${postId}`,
        {
          method: "DELETE",
        }
      );

      const result =
        await readResponse(response);

      if (!response.ok) {
        throw new Error(
          (result as { error?: string })
            .error ||
            `Silme işlemi başarısız. HTTP ${response.status}`
        );
      }

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gönderi silinemedi."
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
        gap: "5px",
      }}
    >
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        style={{
          border: 0,
          background: "transparent",
          color: "#8b8b8b",
          cursor: loading
            ? "not-allowed"
            : "pointer",
          padding: "3px 6px",
          fontSize: "12px",
          borderRadius: "8px",
        }}
      >
        {loading ? "Siliniyor..." : "Sil"}
      </button>

      {message && (
        <div
          style={{
            maxWidth: "190px",
            color: "#d88",
            fontSize: "10px",
            textAlign: "right",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}