"use client";

import { useEffect, useState } from "react";

type BoardMember = {
  id: string;
  name: string | null;
  role: string | null;
  bio: string | null;
  image_url: string | null;
  detail_image_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  sort_order: number;
};

type Props = {
  members: BoardMember[];
};

export default function BoardShowcase({
  members,
}: Props) {
  const [selectedIndex, setSelectedIndex] =
    useState<number | null>(null);

  function closeSelected() {
    setSelectedIndex(null);
  }

  function openMember(index: number) {
    if (selectedIndex === index) {
      closeSelected();
      return;
    }

    setSelectedIndex(index);
  }

  function nextMember() {
    if (
      selectedIndex === null ||
      members.length <= 1
    ) {
      return;
    }

    setSelectedIndex(
      selectedIndex === members.length - 1
        ? 0
        : selectedIndex + 1
    );
  }

  function previousMember() {
    if (
      selectedIndex === null ||
      members.length <= 1
    ) {
      return;
    }

    setSelectedIndex(
      selectedIndex === 0
        ? members.length - 1
        : selectedIndex - 1
    );
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (selectedIndex === null) {
        return;
      }

      if (event.key === "Escape") {
        closeSelected();
      }

      if (event.key === "ArrowRight") {
        nextMember();
      }

      if (event.key === "ArrowLeft") {
        previousMember();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [selectedIndex, members.length]);

  if (!members.length) {
    return (
      <div
        style={{
          padding: "50px 20px",
          textAlign: "center",
          border: "1px dashed #333",
          borderRadius: "16px",
          color: "#777",
        }}
      >
        Henüz yayınlanmış yönetim kurulu
        görseli bulunmuyor.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "24px",
        alignItems: "flex-start",
      }}
    >
      {members.map((member, index) => {
        const selected =
          selectedIndex === index;

        const displayImage = selected
          ? member.detail_image_url ||
            member.image_url
          : member.image_url;

        return (
          <article
            key={member.id}
            style={{
              position: "relative",

              flexGrow: 0,
              flexShrink: 1,

              flexBasis: selected
                ? "min(850px, 100%)"
                : "300px",

              width: selected
                ? "min(850px, 100%)"
                : "300px",

              maxWidth: "100%",

              overflow: "hidden",

              borderRadius: selected
                ? "22px"
                : "18px",

              border: selected
                ? "1px solid #6f1b28"
                : "1px solid #262626",

              background: "#0d0d0d",

              boxShadow: selected
                ? "0 28px 80px rgba(0,0,0,0.55)"
                : "0 18px 50px rgba(0,0,0,0.32)",

              transition:
                "flex-basis 500ms cubic-bezier(0.22, 1, 0.36, 1), width 500ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 350ms ease, border-color 350ms ease, box-shadow 350ms ease",

              transformOrigin:
                index % 2 === 0
                  ? "left center"
                  : "right center",
            }}
          >
            <button
              type="button"
              onClick={() =>
                openMember(index)
              }
              style={{
                display: "block",
                width: "100%",
                padding: 0,
                margin: 0,
                border: 0,
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  position: "relative",

                  width: "100%",

                  aspectRatio: selected
                    ? "16 / 9"
                    : "3 / 4",

                  minHeight: selected
                    ? "420px"
                    : undefined,

                  overflow: "hidden",

                  background: "#111",

                  transition:
                    "aspect-ratio 500ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={
                      member.name ||
                      "Yönetim kurulu görseli"
                    }
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",

                      transform: selected
                        ? "scale(1)"
                        : "scale(1.01)",

                      transition:
                        "transform 500ms ease, opacity 250ms ease",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#666",
                    }}
                  >
                    Görsel yok
                  </div>
                )}

                {!selected && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,

                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.28), transparent 40%)",

                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>
            </button>

            {selected && (
              <>
                <button
                  type="button"
                  onClick={closeSelected}
                  aria-label="Kapat"
                  style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",

                    zIndex: 5,

                    width: "42px",
                    height: "42px",

                    borderRadius: "50%",
                    border:
                      "1px solid rgba(255,255,255,0.22)",

                    background:
                      "rgba(0,0,0,0.68)",

                    color: "#fff",
                    fontSize: "22px",

                    cursor: "pointer",

                    backdropFilter: "blur(8px)",
                  }}
                >
                  ×
                </button>

                {members.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={previousMember}
                      aria-label="Önceki kişi"
                      style={{
                        position:
                          "absolute",
                        left: "16px",
                        top: "50%",

                        zIndex: 5,

                        transform:
                          "translateY(-50%)",

                        width: "48px",
                        height: "48px",

                        borderRadius: "50%",

                        border:
                          "1px solid rgba(255,255,255,0.22)",

                        background:
                          "rgba(0,0,0,0.64)",

                        color: "#fff",
                        fontSize: "28px",

                        cursor: "pointer",

                        backdropFilter:
                          "blur(8px)",
                      }}
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={nextMember}
                      aria-label="Sonraki kişi"
                      style={{
                        position:
                          "absolute",
                        right: "16px",
                        top: "50%",

                        zIndex: 5,

                        transform:
                          "translateY(-50%)",

                        width: "48px",
                        height: "48px",

                        borderRadius: "50%",

                        border:
                          "1px solid rgba(255,255,255,0.22)",

                        background:
                          "rgba(0,0,0,0.64)",

                        color: "#fff",
                        fontSize: "28px",

                        cursor: "pointer",

                        backdropFilter:
                          "blur(8px)",
                      }}
                    >
                      ›
                    </button>
                  </>
                )}
              </>
            )}

            {!selected &&
              (member.name || member.role) && (
                <div
                  style={{
                    padding:
                      "15px 17px 18px",

                    background: "#101010",
                  }}
                >
                  {member.name && (
                    <div
                      style={{
                        color: "#fff",
                        fontSize: "17px",
                        fontWeight: 700,
                      }}
                    >
                      {member.name}
                    </div>
                  )}

                  {member.role && (
                    <div
                      style={{
                        marginTop: "5px",
                        color: "#888",
                        fontSize: "13px",
                      }}
                    >
                      {member.role}
                    </div>
                  )}
                </div>
              )}

            {selected &&
              (member.bio ||
                member.instagram_url ||
                member.linkedin_url) && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "space-between",

                    gap: "18px",
                    flexWrap: "wrap",

                    padding:
                      "16px 20px 18px",

                    background: "#0d0d0d",

                    borderTop:
                      "1px solid #222",
                  }}
                >
                  {member.bio && (
                    <div
                      style={{
                        maxWidth: "560px",

                        color: "#999",
                        fontSize: "13px",
                        lineHeight: 1.6,
                      }}
                    >
                      {member.bio}
                    </div>
                  )}

                  {(member.instagram_url ||
                    member.linkedin_url) && (
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      {member.instagram_url && (
                        <a
                          href={
                            member.instagram_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding:
                              "8px 13px",

                            borderRadius:
                              "999px",

                            border:
                              "1px solid #333",

                            color: "#fff",

                            textDecoration:
                              "none",

                            fontSize: "12px",
                          }}
                        >
                          Instagram
                        </a>
                      )}

                      {member.linkedin_url && (
                        <a
                          href={
                            member.linkedin_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding:
                              "8px 13px",

                            borderRadius:
                              "999px",

                            border:
                              "1px solid #333",

                            color: "#fff",

                            textDecoration:
                              "none",

                            fontSize: "12px",
                          }}
                        >
                          LinkedIn
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
          </article>
        );
      })}
    </div>
  );
}