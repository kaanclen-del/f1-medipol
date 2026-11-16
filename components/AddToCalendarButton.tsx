"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
};

type MenuPosition = {
  top: number;
  left: number;
};

function escapeICS(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatICSDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function formatGoogleDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export default function AddToCalendarButton({
  id,
  title,
  description,
  location,
  startAt,
  endAt,
}: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const start = new Date(startAt);
  const end = endAt
    ? new Date(endAt)
    : new Date(start.getTime() + 60 * 60 * 1000);

  const validDates =
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    end > start;

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    function updatePosition() {
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const menuWidth = Math.min(245, window.innerWidth - 32);
      const estimatedMenuHeight = 225;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openAbove =
        spaceBelow < estimatedMenuHeight + 20 &&
        rect.top > estimatedMenuHeight + 20;

      let left = rect.left;
      left = Math.max(
        16,
        Math.min(left, window.innerWidth - menuWidth - 16)
      );

      const top = openAbove
        ? Math.max(12, rect.top - estimatedMenuHeight - 9)
        : Math.min(
            window.innerHeight - 12,
            rect.bottom + 9
          );

      setPosition({ top, left });
    }

    updatePosition();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function createCalendarFile(openDirectly = false) {
    if (!validDates) return;

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//F1 SOCIAL//Events//TR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${id}@f1social.com`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(start)}`,
      `DTEND:${formatICSDate(end)}`,
      `SUMMARY:${escapeICS(title)}`,
      ...(description
        ? [`DESCRIPTION:${escapeICS(description)}`]
        : []),
      ...(location ? [`LOCATION:${escapeICS(location)}`] : []),
      "END:VEVENT",
      "END:VCALENDAR",
    ];

    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/calendar;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    if (openDirectly) {
      window.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }

    const link = document.createElement("a");
    const fileName = title
      .toLocaleLowerCase("tr-TR")
      .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/gi, "-")
      .replace(/^-|-$/g, "");

    link.href = url;
    link.download = `${fileName || "f1social-etkinlik"}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function openGoogleCalendar() {
    if (!validDates) return;

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
      details: description ?? "",
      location: location ?? "",
      trp: "false",
    });

    window.open(
      `https://calendar.google.com/calendar/render?${params.toString()}`,
      "_blank",
      "noopener,noreferrer"
    );

    setOpen(false);
  }

  function openOutlookCalendar() {
    if (!validDates) return;

    const params = new URLSearchParams({
      path: "/calendar/action/compose",
      rru: "addevent",
      subject: title,
      startdt: start.toISOString(),
      enddt: end.toISOString(),
      body: description ?? "",
      location: location ?? "",
    });

    window.open(
      `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`,
      "_blank",
      "noopener,noreferrer"
    );

    setOpen(false);
  }

  const optionStyle = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "12px 13px",
    border: "none",
    borderRadius: "9px",
    background: "transparent",
    color: "#f5f5f5",
    fontSize: "13px",
    textAlign: "left" as const,
    cursor: "pointer",
  };

  const menu =
    open && position
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              zIndex: 999999,
              top: position.top,
              left: position.left,
              width: "245px",
              maxWidth: "calc(100vw - 32px)",
              maxHeight: "calc(100vh - 24px)",
              overflowY: "auto",
              padding: "7px",
              border: "1px solid #333",
              borderRadius: "13px",
              background: "#151515",
              boxShadow: "0 12px 35px rgba(0,0,0,0.65)",
              color: "#f5f5f5",
            }}
          >
            <div
              style={{
                padding: "9px 11px 10px",
                color: "#888",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "1px",
              }}
            >
              TAKVİMİNİ SEÇ
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={openGoogleCalendar}
              style={optionStyle}
            >
              <span>Google Takvim</span>
              <span style={{ marginLeft: "auto", color: "#888" }}>↗</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                createCalendarFile(true);
                setOpen(false);
              }}
              style={optionStyle}
            >
              <span>Apple Takvim</span>
              <span style={{ marginLeft: "auto", color: "#888" }}>↗</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={openOutlookCalendar}
              style={optionStyle}
            >
              <span>Outlook</span>
              <span style={{ marginLeft: "auto", color: "#888" }}>↗</span>
            </button>

          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div style={{ display: "inline-flex" }}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            cursor: "pointer",
          }}
        >
          <span>+</span>
          Takvime Ekle
          <span
            style={{
              fontSize: "10px",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          >
            ▼
          </span>
        </button>
      </div>

      {menu}
    </>
  );
}
