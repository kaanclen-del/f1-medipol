"use client";

import {
  CSSProperties,
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type EventData = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  location_name: string | null;
  location_address: string | null;
  start_at: string;
  end_at: string | null;
  cover_image_url: string | null;
  registration_url: string | null;
  featured: boolean;
  is_published: boolean;
};

type Props = {
  event: EventData;
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: "8px",
  border: "1px solid #333",
  background: "#111",
  color: "#fff",
  outline: "none",
};

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "14px",
  color: "#ddd",
};

function toTurkeyDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}T${get(
    "hour"
  )}:${get("minute")}`;
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

export default function AdminEventEditForm({
  event,
}: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(
    event.description ?? ""
  );
  const [eventType, setEventType] = useState(
    event.event_type
  );
  const [locationName, setLocationName] = useState(
    event.location_name ?? ""
  );
  const [locationAddress, setLocationAddress] = useState(
    event.location_address ?? ""
  );

  const [startAt, setStartAt] = useState(
    toTurkeyDateTimeLocal(event.start_at)
  );
  const [endAt, setEndAt] = useState(
    toTurkeyDateTimeLocal(event.end_at)
  );

  const [coverImageUrl, setCoverImageUrl] = useState(
    event.cover_image_url ?? ""
  );
  const [registrationUrl, setRegistrationUrl] = useState(
    event.registration_url ?? ""
  );

  const [featured, setFeatured] = useState(
    event.featured
  );
  const [isPublished, setIsPublished] = useState(
    event.is_published
  );

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function uploadImage() {
    if (!imageFile) {
      return coverImageUrl.trim();
    }

    const formData = new FormData();
    formData.append("file", imageFile);

    const response = await fetch(
      "/api/admin/event-image-upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await readResponse(response);

    if (!response.ok) {
      throw new Error(
        (result as { error?: string }).error ||
          `Görsel yüklenemedi. HTTP ${response.status}`
      );
    }

    const uploadedUrl = (
      result as {
        url?: string;
      }
    ).url;

    if (!uploadedUrl) {
      throw new Error(
        "Yüklenen görselin adresi alınamadı."
      );
    }

    return uploadedUrl;
  }

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      if (!title.trim()) {
        throw new Error(
          "Etkinlik adı boş bırakılamaz."
        );
      }

      if (!startAt) {
        throw new Error(
          "Başlangıç tarihi seçmelisin."
        );
      }

      const finalImageUrl = await uploadImage();

      const response = await fetch(
        `/api/admin/events/${event.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            description,
            eventType,
            locationName,
            locationAddress,
            startAt,
            endAt,
            coverImageUrl: finalImageUrl,
            registrationUrl,
            featured,
            isPublished,
          }),
        }
      );

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          (result as { error?: string }).error ||
            `Etkinlik güncellenemedi. HTTP ${response.status}`
        );
      }

      setMessage("Etkinlik başarıyla güncellendi.");

      router.refresh();

      setTimeout(() => {
        router.push("/admin/events");
      }, 500);
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
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        maxWidth: "800px",
      }}
    >
      <label style={labelStyle}>
        Etkinlik adı
        <input
          type="text"
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
          style={inputStyle}
          required
        />
      </label>

      <label style={labelStyle}>
        Açıklama
        <textarea
          value={description}
          onChange={(e) =>
            setDescription(e.target.value)
          }
          rows={6}
          style={{
            ...inputStyle,
            resize: "vertical",
          }}
        />
      </label>

      <label style={labelStyle}>
        Etkinlik türü
        <select
          value={eventType}
          onChange={(e) =>
            setEventType(e.target.value)
          }
          style={inputStyle}
        >
          <option value="watch_party">
            Yarış İzleme
          </option>

          <option value="karting">
            Karting
          </option>

          <option value="talk">
            Söyleşi
          </option>

          <option value="club">
            Kulüp Etkinliği
          </option>

          <option value="other">
            Diğer
          </option>
        </select>
      </label>

      <label style={labelStyle}>
        Konum adı
        <input
          type="text"
          value={locationName}
          onChange={(e) =>
            setLocationName(e.target.value)
          }
          style={inputStyle}
          placeholder="Örn: Güney Kampüs"
        />
      </label>

      <label style={labelStyle}>
        Konum adresi
        <input
          type="text"
          value={locationAddress}
          onChange={(e) =>
            setLocationAddress(e.target.value)
          }
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Başlangıç tarihi ve saati
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) =>
            setStartAt(e.target.value)
          }
          style={inputStyle}
          required
        />
      </label>

      <label style={labelStyle}>
        Bitiş tarihi ve saati
        <input
          type="datetime-local"
          value={endAt}
          onChange={(e) =>
            setEndAt(e.target.value)
          }
          style={inputStyle}
        />
      </label>

      <div
        style={{
          padding: "16px",
          border: "1px solid #2e2e2e",
          borderRadius: "10px",
          background: "#0d0d0d",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <strong>Etkinlik görseli</strong>

        {coverImageUrl && (
          <div
            style={{
              fontSize: "13px",
              color: "#aaa",
              wordBreak: "break-all",
            }}
          >
            Mevcut görsel:
            <br />
            {coverImageUrl}
          </div>
        )}

        <label style={labelStyle}>
          Yeni görsel seç
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file =
                e.target.files?.[0] ?? null;

              setImageFile(file);
            }}
            style={inputStyle}
          />
        </label>

        <div
          style={{
            fontSize: "12px",
            color: "#888",
          }}
        >
          Yeni dosya seçmezsen mevcut görsel
          korunur.
        </div>

        <label style={labelStyle}>
          Görsel URL
          <input
            type="url"
            value={coverImageUrl}
            onChange={(e) =>
              setCoverImageUrl(e.target.value)
            }
            style={inputStyle}
            placeholder="https://..."
          />
        </label>
      </div>

      <label style={labelStyle}>
        Kayıt bağlantısı
        <input
          type="url"
          value={registrationUrl}
          onChange={(e) =>
            setRegistrationUrl(e.target.value)
          }
          style={inputStyle}
          placeholder="https://..."
        />
      </label>

      <label
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={featured}
          onChange={(e) =>
            setFeatured(e.target.checked)
          }
        />

        Öne çıkan etkinlik
      </label>

      <label
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) =>
            setIsPublished(e.target.checked)
          }
        />

        Yayında
      </label>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "11px 18px",
            border: "none",
            borderRadius: "8px",
            background: "#b00020",
            color: "#fff",
            fontWeight: 700,
            cursor: loading
              ? "not-allowed"
              : "pointer",
          }}
        >
          {loading
            ? "Kaydediliyor..."
            : "Değişiklikleri Kaydet"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            router.push("/admin/events")
          }
          style={{
            padding: "11px 18px",
            borderRadius: "8px",
            border: "1px solid #444",
            background: "#181818",
            color: "#fff",
            cursor: loading
              ? "not-allowed"
              : "pointer",
          }}
        >
          İptal
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: "12px",
            borderRadius: "8px",
            background: "#161616",
            border: "1px solid #333",
            color: "#ddd",
          }}
        >
          {message}
        </div>
      )}
    </form>
  );
}