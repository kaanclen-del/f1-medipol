"use client";

import { useState } from "react";

type Props = {
  postId: string;
  initialLikeCount: number;
  initialLiked?: boolean;
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

export default function PaddockLikeButton({
  postId,
  initialLikeCount,
  initialLiked = false,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] =
    useState(initialLikeCount);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleLike() {
    if (loading) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/paddock/posts/${postId}/like`,
        {
          method: "POST",
        }
      );

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          (result as { error?: string }).error ||
            `Beğeni işlemi başarısız. HTTP ${response.status}`
        );
      }

      const data = result as {
        liked?: boolean;
        likeCount?: number;
      };

      if (typeof data.liked === "boolean") {
        setLiked(data.liked);
      }

      if (typeof data.likeCount === "number") {
        setLikeCount(data.likeCount);
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
        onClick={toggleLike}
        disabled={loading}
        style={{
          border: 0,
          padding: 0,
          background: "transparent",
          color: liked ? "#ff4b67" : "#777",
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
          {liked ? "♥" : "♡"}
        </span>

        <span>
          {likeCount > 0
            ? likeCount
            : "Beğen"}
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