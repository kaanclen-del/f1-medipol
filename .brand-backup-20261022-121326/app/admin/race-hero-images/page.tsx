
"use client";

import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

import Header from "@/components/Header";

type RaceOption = {
  key: string;
  name: string;
};

type RaceImage = {
  id: string;
  race_key: string;
  image_url: string;
  storage_path: string | null;
  photo_year: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

type UploadApiResponse = ApiResponse & {
  path?: string;
  token?: string;
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  warning?: string | null;
  images?: RaceImage[];
};

const FALLBACK_RACES = [
  "Australian Grand Prix",
  "Chinese Grand Prix",
  "Japanese Grand Prix",
  "Bahrain Grand Prix",
  "Saudi Arabian Grand Prix",
  "Miami Grand Prix",
  "Canadian Grand Prix",
  "Monaco Grand Prix",
  "Spanish Grand Prix",
  "Austrian Grand Prix",
  "British Grand Prix",
  "Belgian Grand Prix",
  "Hungarian Grand Prix",
  "Dutch Grand Prix",
  "Italian Grand Prix",
  "Azerbaijan Grand Prix",
  "Singapore Grand Prix",
  "United States Grand Prix",
  "Mexico City Grand Prix",
  "São Paulo Grand Prix",
  "Las Vegas Grand Prix",
  "Qatar Grand Prix",
  "Abu Dhabi Grand Prix",
];

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeRaceOptions(
  names: string[]
): RaceOption[] {
  const map = new Map<string, RaceOption>();

  for (const name of names) {
    const key = slugify(name);

    if (key) {
      map.set(key, { key, name });
    }
  }

  return Array.from(map.values());
}

async function readApi(
  response: Response
): Promise<ApiResponse> {
  const data = (await response.json().catch(
    () => ({})
  )) as ApiResponse;

  if (!response.ok || data.ok === false) {
    throw new Error(
      data.error ||
        `İstek başarısız: ${response.status}`
    );
  }

  return data;
}

async function readUploadApi(response: Response): Promise<UploadApiResponse> {
  const data = (await response.json().catch(() => ({}))) as UploadApiResponse;
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Yükleme isteği başarısız: ${response.status}`);
  }
  return data;
}

export default function RaceHeroImagesPage() {
  const [raceOptions, setRaceOptions] = useState<
    RaceOption[]
  >(() => makeRaceOptions(FALLBACK_RACES));

  const [selectedRace, setSelectedRace] = useState(
    "united-states-grand-prix"
  );

  const [customRace, setCustomRace] = useState("");

  const [images, setImages] = useState<RaceImage[]>(
    []
  );

  const [files, setFiles] = useState<File[]>([]);

  const [photoYear, setPhotoYear] = useState(
    String(new Date().getFullYear())
  );

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const raceKey =
    selectedRace === "__custom__"
      ? slugify(customRace)
      : selectedRace;

  const selectedImages = useMemo(
    () =>
      images
        .filter(
          (image) => image.race_key === raceKey
        )
        .sort(
          (a, b) =>
            a.sort_order - b.sort_order ||
            b.created_at.localeCompare(
              a.created_at
            )
        ),
    [images, raceKey]
  );

  const activeCount = selectedImages.filter(
    (image) => image.is_active
  ).length;

  async function loadImages() {
    const response = await fetch(
      "/api/admin/race-hero-images",
      {
        cache: "no-store",
      }
    );

    const data = await readApi(response);

    setImages(data.images ?? []);
  }

  /*
    Mevcut sezonun yarış isimlerini Jolpica'dan
    almaya çalışıyoruz.

    API kullanılamazsa hazır yarış listesi
    ve özel yarış adı alanı çalışmaya devam eder.
  */

  useEffect(() => {
    async function initialize() {
      try {
        await loadImages();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Görseller alınamadı."
        );
      } finally {
        setLoading(false);
      }
    }

    async function loadCalendar() {
      try {
        const year = new Date().getUTCFullYear();

        const response = await fetch(
          `https://api.jolpi.ca/ergast/f1/${year}.json?limit=100`
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        const races =
          data?.MRData?.RaceTable?.Races;

        if (!Array.isArray(races)) {
          return;
        }

        const calendarNames = races
          .map(
            (race: { raceName?: unknown }) =>
              typeof race.raceName === "string"
                ? race.raceName
                : ""
          )
          .filter(Boolean);

        const mergedNames = [
          ...calendarNames,
          ...FALLBACK_RACES,
        ];

        setRaceOptions(
          makeRaceOptions(mergedNames)
        );
      } catch {
        // Hazır yarış listesi kullanılacak.
      }
    }

    void initialize();
    void loadCalendar();
  }, []);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  /*
    FOTOĞRAF YÜKLEME
  */

  async function uploadImages(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    clearMessages();

    if (!raceKey) {
      setError("Önce bir Grand Prix seç.");
      return;
    }

    if (files.length === 0) {
      setError("En az bir fotoğraf seç.");
      return;
    }

    const year =
      photoYear.trim() === ""
        ? null
        : Number(photoYear);

    if (
      year !== null &&
      (!Number.isInteger(year) ||
        year < 1950 ||
        year > 2100)
    ) {
      setError("Geçerli bir fotoğraf yılı gir.");
      return;
    }

    for (const file of files) {
      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/avif",
        ].includes(file.type)
      ) {
        setError(
          "Yalnızca JPG, PNG, WEBP ve AVIF yüklenebilir."
        );
        return;
      }

      if (
        file.size === 0 ||
        file.size > 10 * 1024 * 1024
      ) {
        setError(
          `${file.name}: Fotoğraf boyutu en fazla 10 MB olabilir.`
        );
        return;
      }
    }

    setBusy(true);

    let uploaded = 0;

    let nextSortOrder =
      Math.max(
        0,
        ...selectedImages.map(
          (image) => image.sort_order
        )
      ) + 10;

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase istemci ayarları bulunamadı.");
      }
      const directStorage = createSupabaseClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

      for (const file of files) {
        const metadata = {
          raceKey,
          fileType: file.type,
          fileSize: file.size,
          photoYear: year,
          sortOrder: nextSortOrder,
        };

        // 1. Sunucu sadece yönetici yetkisini kontrol edip süreli bağlantı verir.
        const signResponse = await fetch("/api/admin/race-hero-images/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sign", ...metadata }),
        });
        const sign = await readUploadApi(signResponse);
        if (!sign.path || !sign.token) throw new Error("Yükleme bağlantısı eksik.");

        // 2. Görsel doğrudan Supabase Storage'a gider; Vercel'in 4.5 MB limiti uygulanmaz.
        const { error: storageError } = await directStorage.storage
          .from("gallery-images")
          .uploadToSignedUrl(sign.path, sign.token, file, {
            contentType: file.type,
            cacheControl: "3600",
          });
        if (storageError) throw new Error(`${file.name}: ${storageError.message}`);

        // 3. Yüklenen dosyayı doğrulayıp arşive kaydederiz.
        const finishResponse = await fetch("/api/admin/race-hero-images/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete", path: sign.path, ...metadata }),
        });
        await readApi(finishResponse);

        uploaded += 1;
        nextSortOrder += 10;
      }

      setFiles([]);
      setSuccess(
        `${uploaded} fotoğraf başarıyla yüklendi.`
      );
    } catch (err) {
      setError(
        `${
          err instanceof Error
            ? err.message
            : "Yükleme başarısız."
        } ${uploaded} fotoğraf yüklenmiş olabilir.`
      );
    } finally {
      try {
        await loadImages();
      } catch {
        setError(
          "Fotoğraflar yüklendi ancak liste yenilenemedi."
        );
      }

      setBusy(false);
    }
  }

  /*
    FOTOĞRAFI AKTİF / PASİF YAP
  */

  async function toggleImage(image: RaceImage) {
    clearMessages();
    setBusy(true);

    try {
      const response = await fetch(
        "/api/admin/race-hero-images",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: image.id,
            isActive: !image.is_active,
          }),
        }
      );

      await readApi(response);
      await loadImages();

      setSuccess(
        image.is_active
          ? "Fotoğraf gizlendi."
          : "Fotoğraf yayına alındı."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Görsel güncellenemedi."
      );
    } finally {
      setBusy(false);
    }
  }

  /*
    FOTOĞRAFIN SIRASINI DEĞİŞTİR
  */

  async function moveImage(
    imageId: string,
    direction: -1 | 1
  ) {
    clearMessages();

    const ordered = [...selectedImages];

    const index = ordered.findIndex(
      (image) => image.id === imageId
    );

    const target = index + direction;

    if (
      index < 0 ||
      target < 0 ||
      target >= ordered.length
    ) {
      return;
    }

    [ordered[index], ordered[target]] = [
      ordered[target],
      ordered[index],
    ];

    setBusy(true);

    try {
      for (
        let position = 0;
        position < ordered.length;
        position++
      ) {
        const response = await fetch(
          "/api/admin/race-hero-images",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id: ordered[position].id,
              sortOrder: (position + 1) * 10,
            }),
          }
        );

        await readApi(response);
      }

      setSuccess("Görsel sırası güncellendi.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sıralama güncellenemedi."
      );
    } finally {
      try {
        await loadImages();
      } catch {
        setError("Görsel listesi yenilenemedi.");
      }

      setBusy(false);
    }
  }

  /*
    FOTOĞRAFI SİL
  */

  async function deleteImage(image: RaceImage) {
    const confirmed = window.confirm(
      "Bu fotoğrafı yarış arşivinden kalıcı olarak silmek istiyor musun?"
    );

    if (!confirmed) {
      return;
    }

    clearMessages();
    setBusy(true);

    try {
      const response = await fetch(
        "/api/admin/race-hero-images",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: image.id,
          }),
        }
      );

      const data = await readApi(response);

      await loadImages();

      if (data.warning) {
        setError(data.warning);
      } else {
        setSuccess("Fotoğraf silindi.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Fotoğraf silinemedi."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header />

      <main className="race-admin">
        <style>{styles}</style>

        <div className="race-admin-container">
          <Link
            href="/admin"
            className="race-back-link"
          >
            ← ADMIN PANELİNE DÖN
          </Link>

          <section className="race-admin-hero">
            <div className="race-eyebrow">
              F1 MEDİPOL · MEDIA CONTROL
            </div>

            <h1>YARIŞ GÖRSELLERİ</h1>

            <p>
              Grand Prix arka planlarını yönet.
              Yüklediğin fotoğraflar, ilgili
              yarışın ana sayfa görsellerinde
              kullanılacak.
            </p>

            <span className="race-admin-badge">
              ● YÖNETİM MODÜLÜ
            </span>
          </section>

          {error && (
            <div className="race-message error">
              {error}
            </div>
          )}

          {success && (
            <div className="race-message success">
              {success}
            </div>
          )}

          <div className="race-admin-layout">
            <div className="race-admin-left">

              {/* YARIŞ SEÇİMİ */}

              <section className="race-panel">
                <div className="race-panel-heading">
                  <span>01 / GRAND PRIX</span>
                  <h2>Yarış Seçimi</h2>
                </div>

                <label htmlFor="raceSelect">
                  GÖRSELLERİN AİT OLDUĞU YARIŞ
                </label>

                <select
                  id="raceSelect"
                  value={selectedRace}
                  disabled={busy}
                  onChange={(event) => {
                    clearMessages();
                    setSelectedRace(
                      event.target.value
                    );
                  }}
                >
                  {raceOptions.map((race) => (
                    <option
                      key={race.key}
                      value={race.key}
                    >
                      {race.name}
                    </option>
                  ))}

                  <option value="__custom__">
                    + Başka bir yarış ekle
                  </option>
                </select>

                {selectedRace === "__custom__" && (
                  <>
                    <label htmlFor="customRace">
                      YARIŞIN TAM ADI
                    </label>

                    <input
                      id="customRace"
                      value={customRace}
                      placeholder="Örn: Turkish Grand Prix"
                      disabled={busy}
                      onChange={(event) =>
                        setCustomRace(
                          event.target.value
                        )
                      }
                    />
                  </>
                )}

                <p className="race-helper">
                  Yarış seçildiğinde o Grand Prix için
                  yüklenmiş fotoğraflar gösterilir.
                </p>

                <div className="race-counter-grid">
                  <div>
                    <strong>
                      {selectedImages.length}
                    </strong>
                    <span>TOPLAM GÖRSEL</span>
                  </div>

                  <div>
                    <strong>{activeCount}</strong>
                    <span>YAYINDA</span>
                  </div>
                </div>
              </section>

              {/* FOTOĞRAF YÜKLEME */}

              <section className="race-panel">
                <div className="race-panel-heading">
                  <span>02 / UPLOAD</span>
                  <h2>Fotoğraf Yükle</h2>
                </div>

                <form onSubmit={uploadImages}>
                  <label htmlFor="raceFiles">
                    FOTOĞRAFLAR
                  </label>

                  <input
                    key={
                      selectedRace +
                      files.map((file) => file.name).join("|")
                    }
                    id="raceFiles"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    disabled={busy}
                    onChange={(event) =>
                      setFiles(
                        Array.from(
                          event.target.files ?? []
                        )
                      )
                    }
                  />

                  <p className="race-helper">
                    JPG, PNG, WebP veya AVIF. Her fotoğraf
                    en fazla 10 MB olabilir. Birden
                    fazla dosya seçebilirsin.
                  </p>

                  {files.length > 0 && (
                    <div className="selected-files">
                      {files.length} fotoğraf seçildi
                    </div>
                  )}

                  <label htmlFor="photoYear">
                    FOTOĞRAF YILI
                  </label>

                  <input
                    id="photoYear"
                    type="number"
                    min={1950}
                    max={2100}
                    placeholder="Örn: 2024"
                    value={photoYear}
                    disabled={busy}
                    onChange={(event) =>
                      setPhotoYear(
                        event.target.value
                      )
                    }
                  />

                  <p className="race-helper">
                    İsteğe bağlı. Fotoğrafın
                    çekildiği yılı belirtebilirsin.
                  </p>

                  <button
                    type="submit"
                    className="race-primary-button"
                    disabled={
                      busy ||
                      !raceKey ||
                      files.length === 0
                    }
                  >
                    {busy
                      ? "İŞLEM YAPILIYOR..."
                      : "FOTOĞRAFLARI YÜKLE →"}
                  </button>
                </form>
              </section>
            </div>

            {/* FOTOĞRAF ARŞİVİ */}

            <section className="race-panel race-library">
              <div className="race-library-header">
                <div className="race-panel-heading">
                  <span>03 / MEDIA LIBRARY</span>
                  <h2>Fotoğraf Arşivi</h2>
                </div>

                <button
                  type="button"
                  className="race-refresh-button"
                  disabled={busy}
                  onClick={async () => {
                    clearMessages();
                    setLoading(true);

                    try {
                      await loadImages();
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Liste yenilenemedi."
                      );
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  ↻ YENİLE
                </button>
              </div>

              {loading ? (
                <div className="race-empty">
                  Görseller yükleniyor...
                </div>
              ) : selectedImages.length === 0 ? (
                <div className="race-empty">
                  <span>🏎️</span>

                  <h3>Henüz fotoğraf yok</h3>

                  <p>
                    Bu Grand Prix için ilk
                    fotoğrafları soldaki bölümden
                    yükleyebilirsin.
                  </p>
                </div>
              ) : (
                <div className="race-image-grid">
                  {selectedImages.map(
                    (image, index) => (
                      <article
                        className="race-image-card"
                        key={image.id}
                      >
                        <div className="race-image-preview">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.image_url}
                            alt={`Yarış fotoğrafı ${
                              index + 1
                            }`}
                            loading="lazy"
                          />

                          <span
                            className={
                              image.is_active
                                ? "race-photo-status active"
                                : "race-photo-status inactive"
                            }
                          >
                            {image.is_active
                              ? "● YAYINDA"
                              : "○ GİZLİ"}
                          </span>
                        </div>

                        <div className="race-image-information">
                          <div>
                            <strong>
                              FOTOĞRAF #{index + 1}
                            </strong>

                            <span>
                              {image.photo_year ??
                                "Yıl belirtilmedi"}
                            </span>
                          </div>

                          <div className="race-card-actions">
                            <button
                              type="button"
                              disabled={
                                busy || index === 0
                              }
                              onClick={() =>
                                moveImage(image.id, -1)
                              }
                              title="Yukarı taşı"
                            >
                              ↑
                            </button>

                            <button
                              type="button"
                              disabled={
                                busy ||
                                index ===
                                  selectedImages.length -
                                    1
                              }
                              onClick={() =>
                                moveImage(image.id, 1)
                              }
                              title="Aşağı taşı"
                            >
                              ↓
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                toggleImage(image)
                              }
                            >
                              {image.is_active
                                ? "GİZLE"
                                : "YAYINLA"}
                            </button>

                            <button
                              type="button"
                              className="race-delete-button"
                              disabled={busy}
                              onClick={() =>
                                deleteImage(image)
                              }
                            >
                              SİL
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

const styles = `
  .race-admin {
    min-height: calc(100vh - 70px);
    color: #f6f7fb;

    background:
      radial-gradient(
        circle at 88% 2%,
        rgba(225, 6, 0, .13),
        transparent 34%
      ),
      linear-gradient(
        145deg,
        #10141c,
        #07090d
      );
  }

  .race-admin * {
    box-sizing: border-box;
  }

  .race-admin-container {
    width: min(1450px, calc(100% - 36px));
    margin: auto;
    padding: 32px 0 100px;
  }

  .race-back-link {
    display: inline-block;
    margin-bottom: 20px;
    color: #b7beca;
    font-size: 12px;
    text-decoration: none;
  }

  .race-back-link:hover {
    color: #fff;
  }

  .race-admin-hero {
    padding: 35px;
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 18px;

    background:
      radial-gradient(
        circle at 90% 10%,
        rgba(225,6,0,.20),
        transparent 36%
      ),
      linear-gradient(
        145deg,
        #222a35,
        #151b23
      );
  }

  .race-eyebrow,
  .race-panel-heading > span {
    color: #ff6159;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: .13em;
  }

  .race-admin-hero h1 {
    margin: 12px 0;
    font-size: clamp(28px, 4vw, 52px);
    font-weight: 950;
    letter-spacing: -.045em;
  }

  .race-admin-hero p {
    max-width: 680px;
    color: #adb7c4;
    line-height: 1.7;
    font-size: 13px;
  }

  .race-admin-badge {
    display: inline-block;
    margin-top: 12px;
    padding: 9px 14px;
    color: #75e3a1;
    background: rgba(53,212,119,.09);
    border: 1px solid rgba(53,212,119,.22);
    border-radius: 30px;
    font-size: 10px;
    font-weight: 900;
  }

  .race-message {
    margin-top: 16px;
    padding: 15px 18px;
    border-radius: 12px;
    font-size: 13px;
  }

  .race-message.error {
    color: #ffb8b3;
    background: rgba(225,6,0,.10);
    border: 1px solid rgba(225,6,0,.25);
  }

  .race-message.success {
    color: #93ecb5;
    background: rgba(53,212,119,.08);
    border: 1px solid rgba(53,212,119,.22);
  }

  .race-admin-layout {
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    gap: 18px;
    margin-top: 20px;
    align-items: start;
  }

  .race-admin-left {
    display: grid;
    gap: 18px;
    min-width: 0;
  }

  .race-panel {
    min-width: 0;
    padding: 24px;
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 16px;
    background: #131922;
  }

  .race-panel-heading {
    margin-bottom: 24px;
  }

  .race-panel-heading h2 {
    margin: 9px 0 0;
    font-size: 24px;
    letter-spacing: -.03em;
  }

  .race-panel label {
    display: block;
    margin: 22px 0 9px;
    color: #b9c3ce;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: .08em;
  }

  .race-panel select,
  .race-panel input:not([type="file"]) {
    width: 100%;
    min-height: 46px;
    padding: 0 13px;
    color: #fff;
    background: #0c1118;
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 10px;
    font: inherit;
    font-size: 13px;
  }

  .race-panel select option {
    background: #10151d;
    color: #fff;
  }

  .race-panel input[type="file"] {
    width: 100%;
    padding: 12px;
    border: 1px dashed rgba(255,255,255,.2);
    border-radius: 10px;
    background: #0c1118;
    color: #b8c2ce;
    font-size: 12px;
  }

  .race-panel input[type="file"]::file-selector-button {
    padding: 9px 12px;
    margin-right: 10px;
    background: #e10600;
    color: #fff;
    border: 0;
    border-radius: 7px;
    font-weight: 800;
    cursor: pointer;
  }

  .race-helper {
    margin: 12px 0;
    color: #84909e;
    font-size: 11px;
    line-height: 1.7;
  }

  .selected-files {
    margin-top: 12px;
    padding: 10px 12px;
    color: #98e9b7;
    background: rgba(53,212,119,.08);
    border-radius: 8px;
    font-size: 12px;
  }

  .race-counter-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 22px;
  }

  .race-counter-grid > div {
    padding: 17px;
    border-radius: 11px;
    background: #0d1219;
    border: 1px solid rgba(255,255,255,.06);
  }

  .race-counter-grid strong {
    display: block;
    font-size: 30px;
  }

  .race-counter-grid span {
    display: block;
    margin-top: 5px;
    color: #8b97a5;
    font-size: 9px;
    font-weight: 800;
  }

  .race-primary-button {
    width: 100%;
    min-height: 48px;
    margin-top: 24px;
    border: 0;
    border-radius: 10px;
    color: #fff;
    background: #e10600;
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
  }

  .race-primary-button:hover:not(:disabled) {
    background: #f71d16;
  }

  .race-admin button:disabled,
  .race-admin input:disabled,
  .race-admin select:disabled {
    opacity: .48;
    cursor: not-allowed;
  }

  .race-library {
    min-height: 490px;
  }

  .race-library-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .race-refresh-button {
    padding: 10px 14px;
    color: #e3e8ed;
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 8px;
    background: rgba(255,255,255,.05);
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }

  .race-empty {
    min-height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px;
    border: 1px dashed rgba(255,255,255,.12);
    border-radius: 13px;
    background: rgba(0,0,0,.12);
  }

  .race-empty > span {
    font-size: 42px;
  }

  .race-empty h3 {
    margin: 15px 0 4px;
    font-size: 21px;
  }

  .race-empty p {
    max-width: 310px;
    color: #8f9baa;
    font-size: 12px;
    line-height: 1.7;
  }

  .race-image-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0,1fr));
    gap: 15px;
  }

  .race-image-card {
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 13px;
    background: #0d1219;
  }

  .race-image-preview {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: #080c10;
  }

  .race-image-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .race-photo-status {
    position: absolute;
    top: 12px;
    left: 12px;
    padding: 7px 10px;
    border-radius: 7px;
    font-size: 9px;
    font-weight: 900;
    backdrop-filter: blur(8px);
  }

  .race-photo-status.active {
    color: #91f0ba;
    background: rgba(10,50,27,.8);
  }

  .race-photo-status.inactive {
    color: #d1d5dc;
    background: rgba(20,24,30,.85);
  }

  .race-image-information {
    padding: 15px;
  }

  .race-image-information > div:first-child {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
  }

  .race-image-information strong {
    font-size: 11px;
  }

  .race-image-information span {
    color: #94a1af;
    font-size: 10px;
  }

  .race-card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 15px;
  }

  .race-card-actions button {
    min-height: 34px;
    padding: 0 10px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 7px;
    background: #1c2530;
    color: #fff;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }

  .race-card-actions button:hover:not(:disabled) {
    border-color: rgba(255,255,255,.4);
  }

  .race-card-actions .race-delete-button {
    color: #ff8f89;
    background: rgba(225,6,0,.08);
    border-color: rgba(225,6,0,.24);
  }

  @media (max-width: 1050px) {
    .race-admin-layout {
      grid-template-columns: 1fr;
    }

    .race-admin-left {
      grid-template-columns:
        repeat(2, minmax(0,1fr));
    }
  }

  @media (max-width: 650px) {
    .race-admin-hero {
      padding: 24px;
    }

    .race-panel {
      padding: 18px;
    }

    .race-admin-left,
    .race-image-grid {
      grid-template-columns: 1fr;
    }

    .race-library-header {
      flex-wrap: wrap;
    }
  }
`;
