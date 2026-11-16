"use client";

type Props = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
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

export default function AddToCalendarButton({
  id,
  title,
  description,
  location,
  startAt,
  endAt,
}: Props) {
  function downloadCalendarFile() {
    const start = new Date(startAt);
    const end = endAt
      ? new Date(endAt)
      : new Date(start.getTime() + 60 * 60 * 1000);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return;
    }

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
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={downloadCalendarFile}
      className="btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      + Takvime Ekle
    </button>
  );
}
