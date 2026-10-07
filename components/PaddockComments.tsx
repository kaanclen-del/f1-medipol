"use client";

import { FormEvent, useState } from "react";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: Profile | null;
};

type Props = {
  postId: string;
  initialCommentCount?: number;
};

function getInitials(profile: Profile | null) {
  const text =
    profile?.display_name ||
    profile?.username ||
    "F1";

  return text
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

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

export default function PaddockComments({
  postId,
  initialCommentCount = 0,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [comments, setComments] =
    useState<Comment[]>([]);

  const [commentCount, setCommentCount] =
    useState(initialCommentCount);

  const [content, setContent] = useState("");

  const [loadingComments, setLoadingComments] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] = useState("");

  async function loadComments() {
    if (loaded || loadingComments) {
      return;
    }

    setLoadingComments(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/paddock/posts/${postId}/comments`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          (result as { error?: string }).error ||
            "Yorumlar yüklenemedi."
        );
      }

      const data = result as {
        comments?: Comment[];
      };

      const incomingComments =
        data.comments ?? [];

      setComments(incomingComments);
      setCommentCount(incomingComments.length);
      setLoaded(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Yorumlar yüklenemedi."
      );
    } finally {
      setLoadingComments(false);
    }
  }

  async function toggleComments() {
    const nextOpen = !open;

    setOpen(nextOpen);

    if (nextOpen) {
      await loadComments();
    }
  }

  async function submitComment(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanContent = content.trim();

    if (!cleanContent || submitting) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/paddock/posts/${postId}/comments`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            content: cleanContent,
          }),
        }
      );

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          (result as { error?: string }).error ||
            "Yorum gönderilemedi."
        );
      }

      const data = result as {
        comment?: Comment;
      };

      if (data.comment) {
        setComments((current) => [
          ...current,
          data.comment as Comment,
        ]);

        setCommentCount(
          (current) => current + 1
        );
      }

      setContent("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Yorum gönderilemedi."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggleComments}
        style={{
          border: 0,
          padding: 0,
          background: "transparent",
          color: open ? "#ffffff" : "#777",
          cursor: "pointer",
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
          ◯
        </span>

        <span>
          {commentCount > 0
            ? commentCount
            : "Yorum"}
        </span>
      </button>

      {open && (
        <div
          style={{
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: "1px solid #202020",
          }}
        >
          <form
            onSubmit={submitComment}
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "18px",
            }}
          >
            <input
              value={content}
              onChange={(event) =>
                setContent(event.target.value)
              }
              maxLength={500}
              placeholder="Yorumunu yaz..."
              disabled={submitting}
              style={{
                flex: 1,
                minWidth: 0,
                border: "1px solid #292929",
                borderRadius: "12px",
                background: "#0d0d0d",
                color: "#fff",
                padding: "11px 13px",
                outline: "none",
              }}
            />

            <button
              type="submit"
              disabled={
                submitting ||
                content.trim().length === 0
              }
              style={{
                border: 0,
                borderRadius: "12px",
                background:
                  content.trim().length === 0
                    ? "#292929"
                    : "#c51f32",
                color: "#fff",
                padding: "0 16px",
                fontWeight: 700,
                cursor:
                  submitting ||
                  content.trim().length === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {submitting
                ? "..."
                : "Gönder"}
            </button>
          </form>

          {loadingComments ? (
            <div
              style={{
                color: "#777",
                fontSize: "12px",
              }}
            >
              Yorumlar yükleniyor...
            </div>
          ) : comments.length === 0 ? (
            <div
              style={{
                color: "#666",
                fontSize: "12px",
              }}
            >
              Henüz yorum yok. İlk yorumu sen yap.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    display: "flex",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      flex: "0 0 auto",
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "#202020",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: 800,
                    }}
                  >
                    {comment.profile
                      ?.avatar_url ? (
                      <img
                        src={
                          comment.profile
                            .avatar_url
                        }
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      getInitials(
                        comment.profile
                      )
                    )}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "6px",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: "12px",
                        }}
                      >
                        {comment.profile
                          ?.display_name ||
                          comment.profile
                            ?.username ||
                          "Kullanıcı"}
                      </strong>

                      {comment.profile
                        ?.is_admin && (
                        <span
                          style={{
                            padding: "2px 5px",
                            borderRadius:
                              "999px",
                            background:
                              "#3b1017",
                            color:
                              "#ff8a9b",
                            fontSize: "8px",
                            fontWeight: 800,
                          }}
                        >
                          KULÜP
                        </span>
                      )}

                      <span
                        style={{
                          color: "#666",
                          fontSize: "10px",
                        }}
                      >
                        {formatDate(
                          comment.created_at
                        )}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: "5px",
                        color: "#ccc",
                        fontSize: "13px",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {comment.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {message && (
            <div
              style={{
                marginTop: "12px",
                color: "#d88",
                fontSize: "11px",
              }}
            >
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}