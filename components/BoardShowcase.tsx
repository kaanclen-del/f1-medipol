"use client";

import { useEffect, useRef, useState } from "react";

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
  const [imagePending, setImagePending] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [expansion, setExpansion] = useState({ width: 850, shift: 0 });
  const gridRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pendingAction = useRef(0);
  const readyImages = useRef(new Set<string>());

  // Reserve the original grid slot and expand over it; never move an item
  // into the next flex line (the old problem on columns 3 and 4).
  function measureExpansion(index: number) {
    const grid = gridRef.current;
    const slot = slotRefs.current[index];
    if (!grid || !slot) return;
    const gridRect = grid.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    const width = Math.min(850, gridRect.width);
    const x = slotRect.left - gridRect.left;
    const shift = Math.max(0, Math.min(x, x + width - gridRect.width));
    setExpansion({ width, shift });
  }

  useEffect(() => {
    if (selectedIndex === null) return;
    // The first frame is the compact card; expand on the next frame so
    // width and horizontal offset actually animate from that position.
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setExpanded(true));
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [selectedIndex]);

  useEffect(() => {
    if (selectedIndex === null) return;
    const onResize = () => measureExpansion(selectedIndex);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [selectedIndex]);

  function closeSelected() {
    pendingAction.current += 1;
    setImagePending(null);
    setExpanded(false);
    setSelectedIndex(null);
  }

  async function selectMember(index: number) {
    const selectionToken = ++pendingAction.current;
    const source = members[index]?.detail_image_url || members[index]?.image_url;
    if (source && !readyImages.current.has(source)) {
      setImagePending(index);
      try {
        const img = new window.Image();
        img.src = source;
        await img.decode();
        readyImages.current.add(source);
      } catch { /* Broken image still shows its normal fallback. */ }
    }
    if (selectionToken !== pendingAction.current) return;
    setImagePending(null);
    measureExpansion(index);
    setExpanded(false);
    setSelectedIndex(index);
  }

  function openMember(index: number) {
    if (selectedIndex === index) { closeSelected(); return; }
    void selectMember(index);
  }

  function nextMember() {
    if (
      selectedIndex === null ||
      members.length <= 1
    ) {
      return;
    }

    void selectMember(selectedIndex === members.length - 1 ? 0 : selectedIndex + 1);
  }

  function previousMember() {
    if (
      selectedIndex === null ||
      members.length <= 1
    ) {
      return;
    }

    void selectMember(selectedIndex === 0 ? members.length - 1 : selectedIndex - 1);
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
      ref={gridRef}
      className="f1-board-stable-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: "20px",
        alignItems: "start",
        position: "relative",
        isolation: "isolate",
        overflow: "visible",
      }}
    >
      <style>{`
        @media (max-width: 980px) { .f1-board-stable-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; } }
        @media (max-width: 680px) { .f1-board-stable-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
        @media (max-width: 440px) { .f1-board-stable-grid { grid-template-columns: minmax(0, 1fr) !important; } }

        @keyframes f1BoardRevealLeft {
          from { clip-path: inset(0 9% 0 0); opacity: .92; }
          to { clip-path: inset(0 0 0 0); opacity: 1; }
        }
        @keyframes f1BoardRevealRight {
          from { clip-path: inset(0 0 0 9%); opacity: .92; }
          to { clip-path: inset(0 0 0 0); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .f1-board-expanding, .f1-board-image-reveal {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
      {members.map((member, index) => {
        const selected =
          selectedIndex === index;

        const displayImage = selected && expanded
          ? member.detail_image_url || member.image_url
          : member.image_url;

        return (
          <div
            key={member.id}
            ref={(node) => { slotRefs.current[index] = node; }}
            style={{
              position: "relative",
              minWidth: 0,
              zIndex: selected ? 10 : 1,
            }}
          >
            {/* Keep the thumbnail's place in the grid while its real card
                opens across nearby columns. No item jumps to a lower row. */}
            {selected && (
              <>
                <div style={{ width: "100%", aspectRatio: "3 / 4" }} />
                {(member.name || member.role) && <div style={{ height: "68px" }} />}
              </>
            )}
            <article
            className={selected ? "f1-board-expanding" : undefined}
            style={{
              position: selected ? "absolute" : "relative",
              top: 0,
              left: selected && expanded ? -expansion.shift : 0,
              width: selected && expanded ? expansion.width : "100%",
              zIndex: selected ? 15 : 1,

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

              // Animate in the SAME grid row. Last columns expand toward
              // the left, first columns toward the right, without reflow.
              transition: "width 330ms cubic-bezier(.2,.7,.25,1), left 330ms cubic-bezier(.2,.7,.25,1), border-color 180ms ease, box-shadow 180ms ease",
              transformOrigin: expansion.shift > 0 ? "right center" : "left center",
            }}
          >
            <button
              type="button"
              onClick={() => openMember(index)}
              aria-busy={imagePending === index}
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
                className={selected && expanded ? "f1-board-image-reveal" : undefined}
                style={{
                  position: "relative",

                  // A very small side-to-side reveal with no scaling/zooming.
                  animation: selected && expanded
                    ? `${expansion.shift > 0 ? "f1BoardRevealRight" : "f1BoardRevealLeft"} 330ms cubic-bezier(.2,.7,.25,1) both`
                    : undefined,

                  width: "100%",

                  aspectRatio: selected && expanded
                    ? "16 / 9"
                    : "3 / 4",

                  minHeight: selected && expanded && expansion.width >= 700
                    ? "420px"
                    : undefined,

                  overflow: "hidden",

                  background: "#111",

                  transition: "none",
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
                      objectFit: selected && expanded ? "contain" : "cover",
                      display: "block",

                      transform: selected && expanded ? "scale(1)" : "scale(1.01)",

                      transition: "none",
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

            {selected && expanded && (
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

            {selected && expanded &&
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
          </div>
        );
      })}
    </div>
  );
}