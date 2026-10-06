"use client";

import {
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";

type ApiResult = {
  ok?: boolean;
  url?: string;
  path?: string;
  error?: string;
};

async function readResponse(
  response: Response
): Promise<ApiResult> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as ApiResult;
  } catch {
    return {
      error: text,
    };
  }
}

export default function AdminEventForm() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [imageUrl, setImageUrl] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  async function uploadImage() {
    if (!imageFile) {
      return imageUrl.trim();
    }

    const uploadData = new FormData();

    uploadData.append(
      "file",
      imageFile
    );

    const response = await fetch(
      "/api/admin/event-image-upload",
      {
        method: "POST",
        body: uploadData,
      }
    );

    const result =
      await readResponse(response);

    if (!response.ok) {
      throw new Error(
        result.error ||
          `Görsel yüklenemedi. HTTP ${response.status}`
      );
    }

    if (!result.url) {
      throw new Error(
        "Görsel yüklendi ancak görsel adresi alınamadı."
      );
    }

    return result.url;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setSuccess(false);

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    try {
      const coverImageUrl =
        await uploadImage();

      const body = {
        title: String(
          formData.get("title") || ""
        ).trim(),

        description: String(
          formData.get(
            "description"
          ) || ""
        ).trim(),

        eventType: String(
          formData.get(
            "eventType"
          ) || "other"
        ),

        locationName: String(
          formData.get(
            "locationName"
          ) || ""
        ).trim(),

        locationAddress: String(
          formData.get(
            "locationAddress"
          ) || ""
        ).trim(),

        startAt: String(
          formData.get(
            "startAt"
          ) || ""
        ),

        endAt: String(
          formData.get(
            "endAt"
          ) || ""
        ),

        coverImageUrl,

        registrationUrl: String(
          formData.get(
            "registrationUrl"
          ) || ""
        ).trim(),

        featured:
          formData.get(
            "featured"
          ) === "on",

        isPublished:
          formData.get(
            "isPublished"
          ) === "on",
      };

      const response =
        await fetch(
          "/api/admin/events",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              body
            ),
          }
        );

      const result =
        await readResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          result.error ||
            `Etkinlik oluşturulamadı. HTTP ${response.status}`
        );
      }

      form.reset();

      setImageFile(null);
      setImageUrl("");

      setSuccess(true);

      setMessage(
        "Etkinlik başarıyla oluşturuldu."
      );

      router.refresh();
    } catch (error) {
      setSuccess(false);

      setMessage(
        error instanceof Error
          ? error.message
          : "Beklenmeyen bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: "16px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: "14px",
        }}
      >
        <label>
          <FieldTitle>
            ETKİNLİK ADI
          </FieldTitle>

          <input
            name="title"
            required
            placeholder="Örn. Singapore GP İzleme Etkinliği"
            style={inputStyle}
          />
        </label>

        <label>
          <FieldTitle>
            ETKİNLİK TÜRÜ
          </FieldTitle>

          <select
            name="eventType"
            defaultValue="other"
            style={inputStyle}
          >
            <option value="watch_party">
              Yarış İzleme
            </option>

            <option value="karting">
              Go-Kart
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
      </div>

      <label>
        <FieldTitle>
          AÇIKLAMA
        </FieldTitle>

        <textarea
          name="description"
          rows={5}
          placeholder="Etkinlik hakkında kısa açıklama..."
          style={{
            ...inputStyle,
            paddingTop: "12px",
            resize: "vertical",
          }}
        />
      </label>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: "14px",
        }}
      >
        <label>
          <FieldTitle>
            KONUM
          </FieldTitle>

          <input
            name="locationName"
            placeholder="Örn. Güney Kampüs"
            style={inputStyle}
          />
        </label>

        <label>
          <FieldTitle>
            ADRES
          </FieldTitle>

          <input
            name="locationAddress"
            placeholder="Etkinliğin açık adresi"
            style={inputStyle}
          />
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: "14px",
        }}
      >
        <label>
          <FieldTitle>
            BAŞLANGIÇ
          </FieldTitle>

          <input
            name="startAt"
            type="datetime-local"
            required
            style={inputStyle}
          />
        </label>

        <label>
          <FieldTitle>
            BİTİŞ
          </FieldTitle>

          <input
            name="endAt"
            type="datetime-local"
            style={inputStyle}
          />
        </label>
      </div>

      <div
        className="card"
        style={{
          padding: "18px",
          background:
            "rgba(255,255,255,.025)",
        }}
      >
        <div className="eyebrow">
          ETKİNLİK GÖRSELİ
        </div>

        <p
          style={{
            color: "#8d98a6",
            fontSize: "11px",
            margin: "6px 0 0",
          }}
        >
          Bilgisayarından JPG,
          PNG veya WEBP
          seçebilirsin.
          Maksimum 5 MB.
        </p>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file =
              event.target
                .files?.[0] ??
              null;

            setImageFile(file);
          }}
          style={{
            ...inputStyle,
            marginTop: "14px",
            paddingTop: "9px",
          }}
        />

        {imageFile && (
          <div
            style={{
              marginTop: "9px",
              padding: "8px 10px",
              borderRadius: "8px",
              background:
                "rgba(53,212,119,.08)",
              border:
                "1px solid rgba(53,212,119,.15)",
              color: "#65df96",
              fontSize: "11px",
            }}
          >
            ✓ Seçildi:{" "}
            {imageFile.name}
          </div>
        )}

        <div
          style={{
            margin: "16px 0 8px",
            color: "#737f8d",
            fontSize: "10px",
            fontWeight: 900,
          }}
        >
          VEYA GÖRSEL URL
        </div>

        <input
          type="url"
          value={imageUrl}
          onChange={(event) =>
            setImageUrl(
              event.target.value
            )
          }
          placeholder="https://..."
          style={inputStyle}
        />

        <p
          style={{
            color: "#66717e",
            fontSize: "10px",
            margin: "7px 0 0",
          }}
        >
          Dosya seçersen URL
          yerine seçtiğin dosya
          kullanılacaktır.
        </p>
      </div>

      <label>
        <FieldTitle>
          KAYIT LİNKİ
        </FieldTitle>

        <input
          name="registrationUrl"
          type="url"
          placeholder="https://..."
          style={inputStyle}
        />
      </label>

      <div
        style={{
          display: "flex",
          gap: "24px",
          alignItems: "center",
          flexWrap: "wrap",
          padding: "4px 0",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            name="featured"
          />

          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            Öne çıkar
          </span>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            name="isPublished"
          />

          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            Hemen yayınla
          </span>
        </label>
      </div>

      {message && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "10px",

            background: success
              ? "rgba(53,212,119,.08)"
              : "rgba(225,6,0,.08)",

            border: success
              ? "1px solid rgba(53,212,119,.18)"
              : "1px solid rgba(225,6,0,.20)",

            color: success
              ? "#65df96"
              : "#ff7772",

            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-red"
        disabled={loading}
        style={{
          minHeight: "48px",
          justifySelf: "start",
          minWidth: "190px",
          opacity:
            loading ? 0.6 : 1,
        }}
      >
        {loading
          ? "Oluşturuluyor..."
          : "Etkinliği Oluştur"}
      </button>
    </form>
  );
}

function FieldTitle({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 900,
        marginBottom: "7px",
      }}
    >
      {children}
    </div>
  );
}

const inputStyle: CSSProperties =
  {
    width: "100%",
    minHeight: "44px",
    borderRadius: "9px",
    border:
      "1px solid rgba(255,255,255,.10)",
    background:
      "rgba(10,14,20,.50)",
    color: "#fff",
    padding: "0 12px",
    outline: "none",
  };