"use client";

import {
  CSSProperties,
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

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

export default function AdminBoardForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [instagramUrl, setInstagramUrl] =
    useState("");
  const [linkedinUrl, setLinkedinUrl] =
    useState("");

  const [sortOrder, setSortOrder] = useState(0);
  const [isPublished, setIsPublished] =
    useState(true);

  const [cardImageFile, setCardImageFile] =
    useState<File | null>(null);

  const [detailImageFile, setDetailImageFile] =
    useState<File | null>(null);

  const [cardPreview, setCardPreview] =
    useState("");

  const [detailPreview, setDetailPreview] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function uploadImage(file: File) {
    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch(
      "/api/admin/board-image-upload",
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
        "Görsel adresi alınamadı."
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
      if (!cardImageFile) {
        throw new Error(
          "Dikey kart görselini seçmelisin."
        );
      }

      if (!detailImageFile) {
        throw new Error(
          "Geniş görseli seçmelisin."
        );
      }

      const imageUrl =
        await uploadImage(cardImageFile);

      const detailImageUrl =
        await uploadImage(detailImageFile);

      const response = await fetch(
        "/api/admin/board",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            role,
            bio,
            imageUrl,
            detailImageUrl,
            instagramUrl,
            linkedinUrl,
            sortOrder,
            isPublished,
          }),
        }
      );

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          (result as { error?: string }).error ||
            `Kayıt oluşturulamadı. HTTP ${response.status}`
        );
      }

      setMessage(
        "Yönetim kurulu kartı eklendi."
      );

      setName("");
      setRole("");
      setBio("");
      setInstagramUrl("");
      setLinkedinUrl("");
      setSortOrder(0);
      setIsPublished(true);

      setCardImageFile(null);
      setDetailImageFile(null);

      if (cardPreview) {
        URL.revokeObjectURL(cardPreview);
      }

      if (detailPreview) {
        URL.revokeObjectURL(detailPreview);
      }

      setCardPreview("");
      setDetailPreview("");

      const cardInput =
        document.getElementById(
          "board-card-image"
        ) as HTMLInputElement | null;

      const detailInput =
        document.getElementById(
          "board-detail-image"
        ) as HTMLInputElement | null;

      if (cardInput) {
        cardInput.value = "";
      }

      if (detailInput) {
        detailInput.value = "";
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
        display: "flex",
        flexDirection: "column",
        gap: "22px",
        maxWidth: "850px",
      }}
    >
      <div
        style={{
          padding: "20px",
          border: "1px solid #292929",
          borderRadius: "14px",
          background: "#0d0d0d",
        }}
      >
        <label style={labelStyle}>
          Dikey Kart Görseli
          <input
            id="board-card-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            style={inputStyle}
            onChange={(e) => {
              const file =
                e.target.files?.[0] ?? null;

              setCardImageFile(file);

              if (cardPreview) {
                URL.revokeObjectURL(cardPreview);
              }

              setCardPreview(
                file
                  ? URL.createObjectURL(file)
                  : ""
              );
            }}
          />
        </label>

        <div
          style={{
            marginTop: "8px",
            color: "#777",
            fontSize: "12px",
          }}
        >
          Önerilen ölçü: 1080×1440.
        </div>

        {cardPreview && (
          <div
            style={{
              width: "220px",
              aspectRatio: "3 / 4",
              marginTop: "16px",
              overflow: "hidden",
              borderRadius: "12px",
              border: "1px solid #333",
            }}
          >
            <img
              src={cardPreview}
              alt="Dikey kart önizleme"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        )}
      </div>

      <div
        style={{
          padding: "20px",
          border: "1px solid #54202a",
          borderRadius: "14px",
          background: "#12090b",
        }}
      >
        <label style={labelStyle}>
          Geniş Açılış Görseli
          <input
            id="board-detail-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            style={inputStyle}
            onChange={(e) => {
              const file =
                e.target.files?.[0] ?? null;

              setDetailImageFile(file);

              if (detailPreview) {
                URL.revokeObjectURL(
                  detailPreview
                );
              }

              setDetailPreview(
                file
                  ? URL.createObjectURL(file)
                  : ""
              );
            }}
          />
        </label>

        <div
          style={{
            marginTop: "8px",
            color: "#888",
            fontSize: "12px",
          }}
        >
          Kullanıcı dikey karta bastığında kart
          yatay genişleyip bu ikinci görseli
          gösterecek.
        </div>

        {detailPreview && (
          <div
            style={{
              width: "100%",
              maxWidth: "650px",
              marginTop: "16px",
              overflow: "hidden",
              borderRadius: "12px",
              border: "1px solid #333",
              background: "#080808",
            }}
          >
            <img
              src={detailPreview}
              alt="Geniş görsel önizleme"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
              }}
            />
          </div>
        )}
      </div>

      <div
        style={{
          padding: "14px 16px",
          borderRadius: "10px",
          background: "#101010",
          border: "1px solid #282828",
          color: "#888",
          fontSize: "13px",
        }}
      >
        Aşağıdaki tüm bilgiler opsiyonel.
        Tasarımın üzerinde zaten yazıyorsa boş
        bırakabilirsin.
      </div>

      <label style={labelStyle}>
        İsim — Opsiyonel
        <input
          type="text"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Pozisyon — Opsiyonel
        <input
          type="text"
          value={role}
          onChange={(e) =>
            setRole(e.target.value)
          }
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Açıklama — Opsiyonel
        <textarea
          rows={5}
          value={bio}
          onChange={(e) =>
            setBio(e.target.value)
          }
          style={{
            ...inputStyle,
            resize: "vertical",
          }}
        />
      </label>

      <label style={labelStyle}>
        Instagram — Opsiyonel
        <input
          type="url"
          value={instagramUrl}
          onChange={(e) =>
            setInstagramUrl(e.target.value)
          }
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        LinkedIn — Opsiyonel
        <input
          type="url"
          value={linkedinUrl}
          onChange={(e) =>
            setLinkedinUrl(e.target.value)
          }
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Sıralama
        <input
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) =>
            setSortOrder(
              Number(e.target.value)
            )
          }
          style={inputStyle}
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
          checked={isPublished}
          onChange={(e) =>
            setIsPublished(e.target.checked)
          }
        />

        Yayında
      </label>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "13px 18px",
          border: "none",
          borderRadius: "9px",
          background: "#b00020",
          color: "#fff",
          fontWeight: 700,
          cursor: loading
            ? "not-allowed"
            : "pointer",
        }}
      >
        {loading
          ? "Yükleniyor..."
          : "Yönetim Kuruluna Ekle"}
      </button>

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