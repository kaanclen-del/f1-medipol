"use client";

import {
  CSSProperties,
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type SelectedMedia = {
  file: File;
  previewUrl: string;
  type: "image" | "video";
};

type UploadedMedia = {
  url: string;
  mediaType: "image" | "video";
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid #2b2b2b",
  background: "#0d0d0d",
  color: "#fff",
  outline: "none",
  fontSize: "14px",
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

export default function PaddockComposer() {
  const router = useRouter();

  const [content, setContent] = useState("");

  const [selectedMedia, setSelectedMedia] =
    useState<SelectedMedia[]>([]);

  const [pollEnabled, setPollEnabled] =
    useState(false);

  const [pollQuestion, setPollQuestion] =
    useState("");

  const [pollOptions, setPollOptions] =
    useState(["", ""]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleFiles(files: FileList | null) {
    if (!files) {
      return;
    }

    const remaining =
      4 - selectedMedia.length;

    if (remaining <= 0) {
      setMessage(
        "Bir gönderiye en fazla 4 görsel/video ekleyebilirsin."
      );
      return;
    }

    const newItems: SelectedMedia[] = [];

    for (const file of Array.from(files).slice(
      0,
      remaining
    )) {
      const isImage = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type);

      const isVideo = [
        "video/mp4",
        "video/webm",
        "video/quicktime",
      ].includes(file.type);

      if (!isImage && !isVideo) {
        setMessage(
          `${file.name}: Desteklenmeyen dosya türü.`
        );
        continue;
      }

      if (
        isImage &&
        file.size > 5 * 1024 * 1024
      ) {
        setMessage(
          `${file.name}: Görsel en fazla 5 MB olabilir.`
        );
        continue;
      }

      if (
        isVideo &&
        file.size > 15 * 1024 * 1024
      ) {
        setMessage(
          `${file.name}: Video en fazla 15 MB olabilir.`
        );
        continue;
      }

      newItems.push({
        file,
        previewUrl:
          URL.createObjectURL(file),
        type: isImage
          ? "image"
          : "video",
      });
    }

    setSelectedMedia((current) => [
      ...current,
      ...newItems,
    ]);
  }

  function removeMedia(index: number) {
    setSelectedMedia((current) => {
      const item = current[index];

      if (item) {
        URL.revokeObjectURL(
          item.previewUrl
        );
      }

      return current.filter(
        (_, currentIndex) =>
          currentIndex !== index
      );
    });
  }

  function togglePoll() {
    if (pollEnabled) {
      setPollEnabled(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      return;
    }

    setPollEnabled(true);
    setMessage("");
  }

  function changePollOption(
    index: number,
    value: string
  ) {
    setPollOptions((current) =>
      current.map(
        (option, optionIndex) =>
          optionIndex === index
            ? value
            : option
      )
    );
  }

  function addPollOption() {
    if (pollOptions.length >= 4) {
      return;
    }

    setPollOptions((current) => [
      ...current,
      "",
    ]);
  }

  function removePollOption(index: number) {
    if (pollOptions.length <= 2) {
      return;
    }

    setPollOptions((current) =>
      current.filter(
        (_, optionIndex) =>
          optionIndex !== index
      )
    );
  }

  async function uploadMedia(
    item: SelectedMedia
  ): Promise<UploadedMedia> {
    const formData = new FormData();

    formData.append("file", item.file);

    const response = await fetch(
      "/api/paddock/media-upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const result =
      await readResponse(response);

    if (!response.ok) {
      throw new Error(
        (result as { error?: string })
          .error ||
          `Medya yüklenemedi. HTTP ${response.status}`
      );
    }

    const data = result as {
      url?: string;
      mediaType?: "image" | "video";
    };

    if (!data.url || !data.mediaType) {
      throw new Error(
        "Yüklenen medya bilgileri alınamadı."
      );
    }

    return {
      url: data.url,
      mediaType: data.mediaType,
    };
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");

    const cleanOptions = pollOptions
      .map((option) => option.trim())
      .filter(Boolean);

    if (pollEnabled) {
      if (!pollQuestion.trim()) {
        setMessage(
          "Anket sorusunu yazmalısın."
        );
        return;
      }

      if (cleanOptions.length < 2) {
        setMessage(
          "Ankette en az 2 seçenek olmalı."
        );
        return;
      }
    }

    if (
      !content.trim() &&
      selectedMedia.length === 0 &&
      !pollEnabled
    ) {
      setMessage(
        "Boş bir gönderi paylaşamazsın."
      );
      return;
    }

    setLoading(true);

    try {
      const uploadedMedia =
        await Promise.all(
          selectedMedia.map(
            uploadMedia
          )
        );

      const response = await fetch(
        "/api/paddock/posts",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            content,
            media: uploadedMedia,

            poll: pollEnabled
              ? {
                  question:
                    pollQuestion,
                  options:
                    cleanOptions,
                }
              : null,
          }),
        }
      );

      const result =
        await readResponse(response);

      if (!response.ok) {
        throw new Error(
          (result as {
            error?: string;
          }).error ||
            `Paylaşım yapılamadı. HTTP ${response.status}`
        );
      }

      selectedMedia.forEach(
        (item) => {
          URL.revokeObjectURL(
            item.previewUrl
          );
        }
      );

      setContent("");
      setSelectedMedia([]);

      setPollEnabled(false);
      setPollQuestion("");
      setPollOptions(["", ""]);

      setMessage(
        "Paylaşım yayınlandı."
      );

      const fileInput =
        document.getElementById(
          "paddock-media-input"
        ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      router.refresh();
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
    <form
      onSubmit={handleSubmit}
      style={{
        padding: "18px",
        borderRadius: "18px",
        border: "1px solid #242424",
        background: "#0b0b0b",
      }}
    >
      <textarea
        value={content}
        onChange={(event) =>
          setContent(
            event.target.value
          )
        }
        maxLength={1500}
        placeholder="Ne paylaşmak istersin?"
        style={{
          ...inputStyle,
          minHeight: "110px",
          resize: "vertical",
          lineHeight: 1.6,
          fontSize: "15px",
        }}
      />

      {/* MEDYA ÖNİZLEME */}

      {selectedMedia.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              selectedMedia.length === 1
                ? "1fr"
                : "repeat(2, minmax(0, 1fr))",
            gap: "10px",
            marginTop: "14px",
          }}
        >
          {selectedMedia.map(
            (item, index) => (
              <div
                key={
                  item.file.name +
                  index
                }
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "14px",
                  border:
                    "1px solid #292929",
                  background: "#111",
                  aspectRatio:
                    selectedMedia.length ===
                    1
                      ? "16 / 9"
                      : "1 / 1",
                }}
              >
                {item.type ===
                "image" ? (
                  <img
                    src={
                      item.previewUrl
                    }
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit:
                        "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <video
                    src={
                      item.previewUrl
                    }
                    controls
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit:
                        "cover",
                      display: "block",
                    }}
                  />
                )}

                <button
                  type="button"
                  onClick={() =>
                    removeMedia(index)
                  }
                  style={{
                    position:
                      "absolute",
                    top: "8px",
                    right: "8px",
                    width: "34px",
                    height: "34px",
                    borderRadius:
                      "50%",
                    border:
                      "1px solid rgba(255,255,255,0.25)",
                    background:
                      "rgba(0,0,0,0.72)",
                    color: "#fff",
                    fontSize: "18px",
                    cursor:
                      "pointer",
                  }}
                >
                  ×
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* ANKET */}

      {pollEnabled && (
        <div
          style={{
            marginTop: "14px",
            padding: "16px",
            borderRadius: "16px",
            border:
              "1px solid #3b2025",
            background: "#100a0b",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <strong
              style={{
                fontSize: "14px",
              }}
            >
              📊 Anket
            </strong>

            <button
              type="button"
              onClick={togglePoll}
              style={{
                border: 0,
                background:
                  "transparent",
                color: "#888",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Anketi kaldır
            </button>
          </div>

          <input
            type="text"
            value={pollQuestion}
            onChange={(event) =>
              setPollQuestion(
                event.target.value
              )
            }
            maxLength={300}
            placeholder="Anket sorusu"
            style={inputStyle}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "9px",
              marginTop: "10px",
            }}
          >
            {pollOptions.map(
              (option, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    gap: "8px",
                  }}
                >
                  <input
                    type="text"
                    value={option}
                    maxLength={120}
                    placeholder={`Seçenek ${
                      index + 1
                    }`}
                    onChange={(
                      event
                    ) =>
                      changePollOption(
                        index,
                        event.target
                          .value
                      )
                    }
                    style={inputStyle}
                  />

                  {pollOptions.length >
                    2 && (
                    <button
                      type="button"
                      onClick={() =>
                        removePollOption(
                          index
                        )
                      }
                      style={{
                        flex: "0 0 auto",
                        width: "42px",
                        borderRadius:
                          "10px",
                        border:
                          "1px solid #442326",
                        background:
                          "#211012",
                        color:
                          "#ff9da9",
                        cursor:
                          "pointer",
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            )}
          </div>

          {pollOptions.length < 4 && (
            <button
              type="button"
              onClick={addPollOption}
              style={{
                marginTop: "10px",
                padding:
                  "8px 12px",
                borderRadius: "10px",
                border:
                  "1px solid #333",
                background: "#171717",
                color: "#ccc",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              + Seçenek ekle
            </button>
          )}

          <div
            style={{
              marginTop: "10px",
              color: "#666",
              fontSize: "11px",
            }}
          >
            En az 2, en fazla 4
            seçenek.
          </div>
        </div>
      )}

      {/* ALT KONTROLLER */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginTop: "14px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label
            htmlFor="paddock-media-input"
            style={{
              padding: "9px 13px",
              borderRadius: "999px",
              border:
                "1px solid #303030",
              color: "#ddd",
              fontSize: "13px",
              cursor:
                selectedMedia.length >=
                  4 ||
                loading
                  ? "not-allowed"
                  : "pointer",
              opacity:
                selectedMedia.length >=
                  4 ||
                loading
                  ? 0.45
                  : 1,
            }}
          >
            📷 Fotoğraf / Video
          </label>

          <input
            id="paddock-media-input"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
            disabled={
              selectedMedia.length >=
                4 || loading
            }
            onChange={(event) => {
              handleFiles(
                event.target.files
              );

              event.target.value =
                "";
            }}
            style={{
              display: "none",
            }}
          />

          <button
            type="button"
            onClick={togglePoll}
            disabled={loading}
            style={{
              padding: "9px 13px",
              borderRadius: "999px",
              border: pollEnabled
                ? "1px solid #74202e"
                : "1px solid #303030",
              background: pollEnabled
                ? "#281016"
                : "transparent",
              color: pollEnabled
                ? "#ff9aaa"
                : "#ddd",
              fontSize: "13px",
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            📊 Anket
          </button>

          {selectedMedia.length >
            0 && (
            <span
              style={{
                color: "#666",
                fontSize: "12px",
              }}
            >
              {selectedMedia.length}/4
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              color: "#777",
              fontSize: "12px",
            }}
          >
            {content.length} / 1500
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              (!content.trim() &&
                selectedMedia.length ===
                  0 &&
                !pollEnabled)
            }
            style={{
              padding: "10px 18px",
              borderRadius: "999px",
              border: "none",
              background:
                loading ||
                (!content.trim() &&
                  selectedMedia.length ===
                    0 &&
                  !pollEnabled)
                  ? "#3a3a3a"
                  : "#b00020",
              color: "#fff",
              fontWeight: 700,
              cursor:
                loading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading
              ? "Paylaşılıyor..."
              : "Paylaş"}
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: "9px",
          color: "#555",
          fontSize: "11px",
        }}
      >
        En fazla 4 medya · Görsel 5 MB ·
        Video 15 MB
      </div>

      {message && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 12px",
            borderRadius: "10px",
            background: "#141414",
            border:
              "1px solid #292929",
            color: "#aaa",
            fontSize: "13px",
          }}
        >
          {message}
        </div>
      )}
    </form>
  );
}