"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminEventForm() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setSuccess(false);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),

      eventType: String(formData.get("eventType") || "other"),

      locationName: String(formData.get("locationName") || ""),
      locationAddress: String(formData.get("locationAddress") || ""),

      startAt: String(formData.get("startAt") || ""),
      endAt: String(formData.get("endAt") || ""),

      coverImageUrl: String(formData.get("coverImageUrl") || ""),
      registrationUrl: String(formData.get("registrationUrl") || ""),

      featured: formData.get("featured") === "on",
      isPublished: formData.get("isPublished") === "on",
    };

    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Etkinlik oluşturulamadı.");
        setSuccess(false);
        return;
      }

      setMessage("Etkinlik başarıyla oluşturuldu.");
      setSuccess(true);

      form.reset();

      router.refresh();
    } catch (error) {
      console.error(error);

      setMessage("Sunucuya bağlanırken bir hata oluştu.");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    minHeight: "44px",
    padding: "0 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.04)",
    color: "white",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "7px",
    color: "#aeb7c3",
    fontSize: "10px",
    fontWeight: 900,
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          gap: "14px",
        }}
      >
        {/* BAŞLIK */}

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>ETKİNLİK BAŞLIĞI *</label>

          <input
            name="title"
            type="text"
            required
            placeholder="Örn: Japonya GP Yarış İzleme"
            style={inputStyle}
          />
        </div>

        {/* TÜR */}

        <div>
          <label style={labelStyle}>ETKİNLİK TÜRÜ</label>

          <select
            name="eventType"
            defaultValue="watch_party"
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
        </div>

        {/* MEKAN */}

        <div>
          <label style={labelStyle}>MEKAN ADI</label>

          <input
            name="locationName"
            type="text"
            placeholder="Örn: Güney Kampüs"
            style={inputStyle}
          />
        </div>

        {/* BAŞLANGIÇ */}

        <div>
          <label style={labelStyle}>BAŞLANGIÇ *</label>

          <input
            name="startAt"
            type="datetime-local"
            required
            style={inputStyle}
          />
        </div>

        {/* BİTİŞ */}

        <div>
          <label style={labelStyle}>BİTİŞ</label>

          <input
            name="endAt"
            type="datetime-local"
            style={inputStyle}
          />
        </div>

        {/* ADRES */}

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>ADRES</label>

          <input
            name="locationAddress"
            type="text"
            placeholder="Etkinlik adresi"
            style={inputStyle}
          />
        </div>

        {/* KAPAK FOTOĞRAFI */}

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>KAPAK GÖRSELİ URL</label>

          <input
            name="coverImageUrl"
            type="url"
            placeholder="https://..."
            style={inputStyle}
          />
        </div>

        {/* KAYIT LINKI */}

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>KAYIT / DETAY LİNKİ</label>

          <input
            name="registrationUrl"
            type="url"
            placeholder="https://..."
            style={inputStyle}
          />
        </div>

        {/* AÇIKLAMA */}

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>AÇIKLAMA</label>

          <textarea
            name="description"
            rows={5}
            placeholder="Etkinlik hakkında kısa açıklama..."
            style={{
              ...inputStyle,
              minHeight: "120px",
              padding: "12px",
              resize: "vertical",
            }}
          />
        </div>

        {/* AYARLAR */}

        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              minHeight: "46px",
              padding: "0 14px",
              display: "flex",
              alignItems: "center",
              gap: "9px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,.10)",
              background: "rgba(255,255,255,.035)",
              fontSize: "10px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            <input
              name="isPublished"
              type="checkbox"
            />

            Hemen yayınla
          </label>

          <label
            style={{
              minHeight: "46px",
              padding: "0 14px",
              display: "flex",
              alignItems: "center",
              gap: "9px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,.10)",
              background: "rgba(255,255,255,.035)",
              fontSize: "10px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            <input
              name="featured"
              type="checkbox"
            />

            Öne çıkan etkinlik
          </label>
        </div>
      </div>

      {/* MESAJ */}

      {message && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px 14px",
            borderRadius: "10px",
            background: success
              ? "rgba(53,212,119,.10)"
              : "rgba(225,6,0,.10)",
            border: success
              ? "1px solid rgba(53,212,119,.25)"
              : "1px solid rgba(225,6,0,.25)",
            color: success ? "#65df96" : "#ff706a",
            fontSize: "11px",
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      )}

      {/* BUTON */}

      <button
        type="submit"
        className="btn btn-red"
        disabled={loading}
        style={{
          marginTop: "18px",
          minWidth: "180px",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading
          ? "Oluşturuluyor..."
          : "Etkinlik Oluştur"}
      </button>
    </form>
  );
}