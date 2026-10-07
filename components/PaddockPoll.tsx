"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PollOption = {
  id: string;
  poll_id: string;
  option_text: string;
  sort_order: number;
  vote_count: number;
};

type Props = {
  poll: {
    id: string;
    question: string;
    options: PollOption[];
    total_votes: number;
  };
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

export default function PaddockPoll({
  poll,
}: Props) {
  const router = useRouter();

  const [loadingOptionId, setLoadingOptionId] =
    useState<string | null>(null);

  const [selectedOptionId, setSelectedOptionId] =
    useState<string | null>(null);

  const [message, setMessage] = useState("");

  const [voteCounts, setVoteCounts] = useState<
    Record<string, number>
  >(() => {
    const initialCounts: Record<string, number> = {};

    for (const option of poll.options) {
      initialCounts[option.id] =
        option.vote_count ?? 0;
    }

    return initialCounts;
  });

  const totalVotes = useMemo(() => {
    return Object.values(voteCounts).reduce(
      (sum, count) => sum + count,
      0
    );
  }, [voteCounts]);

  async function vote(optionId: string) {
    if (loadingOptionId) {
      return;
    }

    setLoadingOptionId(optionId);
    setMessage("");

    try {
      const response = await fetch(
        `/api/paddock/polls/${poll.id}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            optionId,
          }),
        }
      );

      const result = await readResponse(response);

      if (!response.ok) {
        const data = result as {
          error?: string;
          optionId?: string;
        };

        if (
          response.status === 409 &&
          data.optionId
        ) {
          setSelectedOptionId(data.optionId);
        }

        throw new Error(
          data.error ||
            `Oy verilemedi. HTTP ${response.status}`
        );
      }

      const data = result as {
        selectedOptionId?: string;
        counts?: Record<string, number>;
      };

      if (data.selectedOptionId) {
        setSelectedOptionId(
          data.selectedOptionId
        );
      }

      if (data.counts) {
        setVoteCounts(data.counts);
      }

      setMessage("Oyun kaydedildi.");

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Oy verirken bir hata oluştu."
      );
    } finally {
      setLoadingOptionId(null);
    }
  }

  return (
    <div
      style={{
        marginTop: "16px",
        padding: "16px",
        borderRadius: "16px",
        border: "1px solid #2d2d2d",
        background: "#0b0b0b",
      }}
    >
      <div
        style={{
          fontSize: "15px",
          fontWeight: 700,
          lineHeight: 1.5,
          marginBottom: "14px",
        }}
      >
        {poll.question}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "9px",
        }}
      >
        {poll.options.map((option) => {
          const count =
            voteCounts[option.id] ?? 0;

          const percentage =
            totalVotes > 0
              ? Math.round(
                  (count / totalVotes) * 100
                )
              : 0;

          const selected =
            selectedOptionId === option.id;

          const loading =
            loadingOptionId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                vote(option.id)
              }
              disabled={
                Boolean(loadingOptionId) ||
                Boolean(selectedOptionId)
              }
              style={{
                position: "relative",
                width: "100%",
                minHeight: "46px",
                padding: "11px 13px",
                overflow: "hidden",
                borderRadius: "12px",
                border: selected
                  ? "1px solid #8d2638"
                  : "1px solid #303030",
                background: selected
                  ? "#1c0d11"
                  : "#111",
                color: "#fff",
                cursor:
                  loadingOptionId ||
                  selectedOptionId
                    ? "default"
                    : "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${percentage}%`,
                  background: selected
                    ? "rgba(176, 0, 32, 0.24)"
                    : "rgba(255,255,255,0.05)",
                  transition:
                    "width 300ms ease",
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: selected
                      ? 700
                      : 500,
                  }}
                >
                  {option.option_text}
                </span>

                <span
                  style={{
                    fontSize: "12px",
                    color: "#888",
                    whiteSpace: "nowrap",
                  }}
                >
                  {loading
                    ? "..."
                    : `${percentage}%`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "11px",
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap",
          color: "#666",
          fontSize: "11px",
        }}
      >
        <span>
          {totalVotes} oy
        </span>

        {selectedOptionId && (
          <span>
            Oy kullandın
          </span>
        )}
      </div>

      {message && (
        <div
          style={{
            marginTop: "10px",
            color: "#888",
            fontSize: "12px",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}