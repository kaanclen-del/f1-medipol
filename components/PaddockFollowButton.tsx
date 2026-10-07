"use client";

import { useState } from "react";

type Props = {
  userId: string;
  initialFollowing?: boolean;
  initialFollowerCount?: number;
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

export default function PaddockFollowButton({
  userId,
  initialFollowing = false,
  initialFollowerCount = 0,
}: Props) {
  const [following, setFollowing] =
    useState(initialFollowing);

  const [followerCount, setFollowerCount] =
    useState(initialFollowerCount);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function toggleFollow() {
    if (loading) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/paddock/users/${userId}/follow`,
        {
          method: "POST",
        }
      );

      const result =
        await readResponse(response);

      if (!response.ok) {
        throw new Error(
          (result as { error?: string })
            .error ||
            `Takip işlemi başarısız. HTTP ${response.status}`
        );
      }

      const data = result as {
        following?: boolean;
        followerCount?: number;
      };

      if (
        typeof data.following === "boolean"
      ) {
        setFollowing(data.following);
      }

      if (
        typeof data.followerCount ===
        "number"
      ) {
        setFollowerCount(
          data.followerCount
        );
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
        alignItems: "flex-end",
        gap: "5px",
      }}
    >
      <button
        type="button"
        onClick={toggleFollow}
        disabled={loading}
        style={{
          minWidth: "92px",
          borderRadius: "999px",
          border: following
            ? "1px solid #333"
            : "1px solid #fff",
          padding: "8px 14px",
          background: following
            ? "transparent"
            : "#fff",
          color: following
            ? "#fff"
            : "#000",
          fontSize: "12px",
          fontWeight: 800,
          cursor: loading
            ? "not-allowed"
            : "pointer",
          opacity: loading ? 0.6 : 1,
          transition:
            "all 0.2s ease",
        }}
      >
        {loading
          ? "..."
          : following
            ? "Takiptesin"
            : "Takip Et"}
      </button>

      <div
        style={{
          color: "#666",
          fontSize: "10px",
        }}
      >
        {followerCount} takipçi
      </div>

      {message && (
        <div
          style={{
            maxWidth: "180px",
            color: "#b88",
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