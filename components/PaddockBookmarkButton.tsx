"use client";

import { useState } from "react";

type Props = {
  postId: string;
  initialBookmarked?: boolean;
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

export default function PaddockBookmarkButton({
  postId,
  initialBookmarked = false,
}: Props) {
  const [bookmarked, setBookmarked] =
    useState(initialBookmarked);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleBookmark() {
    if (loading) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/paddock/posts/${postId}/bookmark`,
        {
          method: "POST",
        }
      );

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          (result as { error?: string }).error ||
            `Kaydetme işlemi başarısız. HTTP ${response.status}`
        );
      }

      const data = result as {
        bookmarked?: boolean;
      };

      if (
        typeof data.bookmarked === "boolean"
      ) {
        setBookmarked(data.bookmarked);
      }
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
        gap: "5px",
      }}
    >
      <button
        type="button"
        onClick={toggleBookmark}
        disabled={loading}
        style={{
          border: 0,
          padding: 0,
          background: "transparent",
          color: bookmarked
            ? "#ffffff"
            : "#777",
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
            fontSize: "17px",
            lineHeight: 1,
          }}
        >
          {bookmarked ? "★" : "☆"}
        </span>

        <span>
          {bookmarked
            ? "Kaydedildi"
            : "Kaydet"}
        </span>
      </button>

      {message && (
        <div
          style={{
            fontSize: "11px",
            color: "#b88",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}