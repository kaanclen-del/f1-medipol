"use client";

import { useEffect, useRef, useState } from "react";
import PaddockDeleteButton from "@/components/PaddockDeleteButton";
import PaddockPinButton from "@/components/PaddockPinButton";
import PaddockBookmarkButton from "@/components/PaddockBookmarkButton";

type Props = {
  postId: string;
  canDelete: boolean;
  isAdmin: boolean;
  initialPinned: boolean;
  initialBookmarked: boolean;
};

export default function PaddockPostMenu({
  postId,
  canDelete,
  isAdmin,
  initialPinned,
  initialBookmarked,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        flex: "0 0 auto",
        zIndex: open ? 20 : 1,
      }}
    >
      <button
        type="button"
        aria-label="Gönderi seçenekleri"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{
          width: 36,
          height: 36,
          display: "grid",
          placeItems: "center",
          border: "1px solid transparent",
          borderRadius: "50%",
          background: open ? "rgba(225,6,0,.14)" : "transparent",
          color: open ? "#ff647b" : "#858585",
          fontSize: 23,
          lineHeight: 1,
          cursor: "pointer",
          transition: "background .15s ease, color .15s ease",
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = "rgba(225,6,0,.12)";
          event.currentTarget.style.color = "#ff647b";
        }}
        onMouseLeave={(event) => {
          if (!open) {
            event.currentTarget.style.background = "transparent";
            event.currentTarget.style.color = "#858585";
          }
        }}
      >
        ⋯
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Gönderi işlemleri"
          style={{
            position: "absolute",
            top: 40,
            right: 0,
            width: 220,
            maxWidth: "calc(100vw - 32px)",
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            border: "1px solid #303030",
            borderRadius: 15,
            background: "#111",
            boxShadow: "0 12px 36px rgba(0,0,0,.55)",
            color: "#eee",
          }}
        >
          <div
            style={{
              padding: "7px 9px 9px",
              borderBottom: "1px solid #292929",
              color: "#777",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            GÖNDERİ İŞLEMLERİ
          </div>

          <div
            role="menuitem"
            style={{
              padding: "8px 9px",
              borderRadius: 9,
            }}
          >
            <PaddockBookmarkButton
              postId={postId}
              initialBookmarked={initialBookmarked}
            />
          </div>

          {isAdmin && (
            <div
              role="menuitem"
              style={{
                padding: "8px 9px",
                borderRadius: 9,
              }}
            >
              <PaddockPinButton
                postId={postId}
                initialPinned={initialPinned}
              />
            </div>
          )}

          {canDelete && (
            <>
              <div
                style={{
                  height: 1,
                  background: "#292929",
                  margin: "2px 0",
                }}
              />
              <div
                role="menuitem"
                style={{
                  padding: "8px 9px",
                  borderRadius: 9,
                }}
              >
                <PaddockDeleteButton postId={postId} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
