"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  postId: string;
  initialPinned?: boolean;
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

export default function PaddockPinButton({
  postId,
  initialPinned = false,
}: Props) {
  const router = useRouter();

  const [pinned, setPinned] =
    useState(initialPinned);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function togglePin() {
    if (loading) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/paddock/posts/${postId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isPinned: !pinned,
          }),
        }
      );

      const result =
        await readResponse(response);

      if (!response.ok) {
        throw new Error(
          (result as { error?: string }).error ||
            `Sabitleme işlemi başarısız. HTTP ${response.status}`
        );
      }

      const data = result as {
        post?: {
          id: string;
          is_pinned: boolean;
        };
      };

      if (
        typeof data.post?.is_pinned ===
        "boolean"
      ) {
        setPinned(
          data.post.is_pinned
        );
      } else {
        setPinned(!pinned);
      }

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Sabitleme işlemi başarısız."
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
        onClick={togglePin}
        disabled={loading}
        style={{
          border: 0,
          background: "transparent",
          color: pinned
            ? "#ff647b"
            : "#8b8b8b",
          cursor: loading
            ? "not-allowed"
            : "pointer",
          padding: "3px 6px",
          fontSize: "12px",
          borderRadius: "8px",
        }}
      >
        {loading
          ? "..."
          : pinned
            ? "📌 Sabitlemeyi Kaldır"
            : "📌 Sabitle"}
      </button>

      {message && (
        <div
          style={{
            maxWidth: "200px",
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