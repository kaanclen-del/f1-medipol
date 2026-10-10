"use client";

import {
  ChangeEvent,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type Props = {
  memberId: string;

  memberName?: string | null;
  role?: string | null;
  bio?: string | null;

  imageUrl?: string | null;
  detailImageUrl?: string | null;

  instagramUrl?: string | null;
  linkedinUrl?: string | null;

  sortOrder: number;
  isPublished: boolean;
};

async function readResponse(
  response: Response
) {
  const text =
    await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(
      text
    );
  } catch {
    return {
      error: text,
    };
  }
}

export default function AdminBoardActions({
  memberId,

  memberName,
  role,
  bio,

  imageUrl,
  detailImageUrl,

  instagramUrl,
  linkedinUrl,

  sortOrder,
  isPublished,
}: Props) {
  const router =
    useRouter();

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    name,
    setName,
  ] =
    useState(
      memberName ?? ""
    );

  const [
    editRole,
    setEditRole,
  ] =
    useState(
      role ?? ""
    );

  const [
    editBio,
    setEditBio,
  ] =
    useState(
      bio ?? ""
    );

  const [
    instagram,
    setInstagram,
  ] =
    useState(
      instagramUrl ??
        ""
    );

  const [
    linkedin,
    setLinkedin,
  ] =
    useState(
      linkedinUrl ??
        ""
    );

  const [
    order,
    setOrder,
  ] =
    useState(
      sortOrder
    );

  const [
    cardFile,
    setCardFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    detailFile,
    setDetailFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    cardPreview,
    setCardPreview,
  ] =
    useState(
      imageUrl ?? ""
    );

  const [
    detailPreview,
    setDetailPreview,
  ] =
    useState(
      detailImageUrl ??
        ""
    );

  useEffect(() => {
    setName(
      memberName ?? ""
    );

    setEditRole(
      role ?? ""
    );

    setEditBio(
      bio ?? ""
    );

    setInstagram(
      instagramUrl ??
        ""
    );

    setLinkedin(
      linkedinUrl ??
        ""
    );

    setOrder(
      sortOrder
    );

    if (!cardFile) {
      setCardPreview(
        imageUrl ?? ""
      );
    }

    if (!detailFile) {
      setDetailPreview(
        detailImageUrl ??
          ""
      );
    }
  }, [
    memberName,
    role,
    bio,
    instagramUrl,
    linkedinUrl,
    sortOrder,
    imageUrl,
    detailImageUrl,
    cardFile,
    detailFile,
  ]);

  async function uploadImage(
    file: File
  ) {
    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    const response =
      await fetch(
        "/api/admin/board-image-upload",
        {
          method:
            "POST",

          body:
            formData,
        }
      );

    const result =
      await readResponse(
        response
      );

    if (
      !response.ok
    ) {
      throw new Error(
        (
          result as {
            error?: string;
          }
        ).error ||
          "Görsel yüklenemedi."
      );
    }

    const url =
      (
        result as {
          url?: string;
        }
      ).url;

    if (!url) {
      throw new Error(
        "Görsel URL alınamadı."
      );
    }

    return url;
  }

  function selectCardImage(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target
        .files?.[0] ??
      null;

    setCardFile(
      file
    );

    if (file) {
      setCardPreview(
        URL.createObjectURL(
          file
        )
      );
    }
  }

  function selectDetailImage(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target
        .files?.[0] ??
      null;

    setDetailFile(
      file
    );

    if (file) {
      setDetailPreview(
        URL.createObjectURL(
          file
        )
      );
    }
  }

  async function saveChanges() {
    setLoading(
      true
    );

    setMessage(
      ""
    );

    try {
      let finalCardImage =
        imageUrl ??
        "";

      let finalDetailImage =
        detailImageUrl ??
        "";

      if (
        cardFile
      ) {
        finalCardImage =
          await uploadImage(
            cardFile
          );
      }

      if (
        detailFile
      ) {
        finalDetailImage =
          await uploadImage(
            detailFile
          );
      }

      if (
        !finalCardImage
      ) {
        throw new Error(
          "Dikey kart görseli bulunamadı."
        );
      }

      if (
        !finalDetailImage
      ) {
        throw new Error(
          "Geniş profil görseli bulunamadı."
        );
      }

      const response =
        await fetch(
          `/api/admin/board/${memberId}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name,

                role:
                  editRole,

                bio:
                  editBio,

                instagramUrl:
                  instagram,

                linkedinUrl:
                  linkedin,

                sortOrder:
                  Number(
                    order
                  ),

                imageUrl:
                  finalCardImage,

                detailImageUrl:
                  finalDetailImage,
              }),
          }
        );

      const result =
        await readResponse(
          response
        );

      if (
        !response.ok
      ) {
        throw new Error(
          (
            result as {
              error?: string;
            }
          ).error ||
            "Değişiklikler kaydedilemedi."
        );
      }

      setCardFile(
        null
      );

      setDetailFile(
        null
      );

      setMessage(
        "✅ Değişiklikler kaydedildi."
      );

      setEditing(
        false
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof
        Error
          ? error.message
          : "Bir hata oluştu."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  async function move(
    direction:
      | "up"
      | "down"
  ) {
    setLoading(
      true
    );

    setMessage(
      ""
    );

    try {
      const response =
        await fetch(
          `/api/admin/board/${memberId}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "move",

                direction,
              }),
          }
        );

      const result =
        await readResponse(
          response
        );

      if (
        !response.ok
      ) {
        throw new Error(
          (
            result as {
              error?: string;
            }
          ).error ||
            "Sıralama değiştirilemedi."
        );
      }

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof
        Error
          ? error.message
          : "Bir hata oluştu."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  async function togglePublished() {
    setLoading(
      true
    );

    setMessage(
      ""
    );

    try {
      const response =
        await fetch(
          `/api/admin/board/${memberId}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                isPublished:
                  !isPublished,
              }),
          }
        );

      const result =
        await readResponse(
          response
        );

      if (
        !response.ok
      ) {
        throw new Error(
          (
            result as {
              error?: string;
            }
          ).error ||
            "Yayın durumu değiştirilemedi."
        );
      }

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof
        Error
          ? error.message
          : "Bir hata oluştu."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  async function deleteMember() {
    const approved =
      window.confirm(
        `"${memberName || "Bu yönetim kurulu kartı"}" tamamen silinsin mi?`
      );

    if (
      !approved
    ) {
      return;
    }

    setLoading(
      true
    );

    setMessage(
      ""
    );

    try {
      const response =
        await fetch(
          `/api/admin/board/${memberId}`,
          {
            method:
              "DELETE",
          }
        );

      const result =
        await readResponse(
          response
        );

      if (
        !response.ok
      ) {
        throw new Error(
          (
            result as {
              error?: string;
            }
          ).error ||
            "Kart silinemedi."
        );
      }

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof
        Error
          ? error.message
          : "Bir hata oluştu."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  return (
    <div className="board-actions">
      <style>{`
        .board-actions {
          margin-top: 15px;
        }

        .board-action-row {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .board-action-button {
          min-height: 36px;

          padding:
            0 11px;

          border:
            1px solid
            var(--border);

          border-radius:
            8px;

          color:
            var(--text);

          background:
            var(--panel-soft);

          font-size:
            10px;

          font-weight:
            850;

          cursor:
            pointer;
        }

        .board-action-button:hover {
          border-color:
            rgba(
              255,
              70,
              61,
              .35
            );
        }

        .board-action-button.red {
          color:
            #ffaaa6;

          border-color:
            rgba(
              255,
              60,
              50,
              .25
            );

          background:
            rgba(
              160,
              0,
              5,
              .13
            );
        }

        .board-action-button.edit {
          color:
            white;

          border-color:
            transparent;

          background:
            linear-gradient(
              135deg,
              #c90000,
              #f0443c
            );
        }

        .board-editor {
          margin-top:
            14px;

          padding:
            16px;

          border:
            1px solid
            var(--border);

          border-radius:
            12px;

          background:
            var(--panel-soft);
        }

        .board-editor-grid {
          display:
            grid;

          grid-template-columns:
            repeat(
              2,
              minmax(
                0,
                1fr
              )
            );

          gap:
            12px;
        }

        .board-editor-field {
          display:
            flex;

          flex-direction:
            column;

          gap:
            6px;
        }

        .board-editor-field.full {
          grid-column:
            1 / -1;
        }

        .board-editor-field label {
          color:
            var(--muted);

          font-size:
            9px;

          font-weight:
            900;

          letter-spacing:
            .08em;
        }

        .board-editor-field input,
        .board-editor-field textarea {
          width:
            100%;

          min-height:
            40px;

          padding:
            9px 10px;

          border:
            1px solid
            var(--border);

          border-radius:
            8px;

          color:
            var(--text);

          background:
            var(--panel);

          outline:
            none;
        }

        .board-editor-field textarea {
          min-height:
            100px;

          resize:
            vertical;
        }

        .board-image-edit-grid {
          display:
            grid;

          grid-template-columns:
            1fr 1fr;

          gap:
            12px;

          margin-top:
            14px;
        }

        .board-image-editor {
          padding:
            11px;

          border:
            1px solid
            var(--border);

          border-radius:
            10px;
        }

        .board-image-editor strong {
          display:
            block;

          margin-bottom:
            8px;

          font-size:
            10px;
        }

        .board-image-editor img {
          width:
            100%;

          height:
            155px;

          display:
            block;

          margin-bottom:
            9px;

          object-fit:
            cover;

          border-radius:
            8px;

          background:
            #101010;
        }

        .board-image-editor input {
          width:
            100%;

          font-size:
            9px;
        }

        .board-editor-footer {
          display:
            flex;

          gap:
            8px;

          margin-top:
            14px;
        }

        .board-message {
          margin-top:
            8px;

          color:
            var(--muted);

          font-size:
            10px;

          line-height:
            1.5;
        }

        @media(
          max-width:
            700px
        ) {
          .board-editor-grid,
          .board-image-edit-grid {
            grid-template-columns:
              1fr;
          }

          .board-editor-field.full {
            grid-column:
              auto;
          }
        }
      `}</style>

      <div className="board-action-row">
        <button
          type="button"
          className="board-action-button"
          onClick={() =>
            move("up")
          }
          disabled={loading}
        >
          ↑ Yukarı
        </button>

        <button
          type="button"
          className="board-action-button"
          onClick={() =>
            move("down")
          }
          disabled={loading}
        >
          ↓ Aşağı
        </button>

        <button
          type="button"
          className="board-action-button edit"
          onClick={() =>
            setEditing(
              !editing
            )
          }
          disabled={loading}
        >
          {editing
            ? "Düzenlemeyi Kapat"
            : "✎ Düzenle"}
        </button>

        <button
          type="button"
          className="board-action-button"
          onClick={
            togglePublished
          }
          disabled={loading}
        >
          {isPublished
            ? "Yayından Kaldır"
            : "Yayınla"}
        </button>

        <button
          type="button"
          className="board-action-button red"
          onClick={
            deleteMember
          }
          disabled={loading}
        >
          Sil
        </button>
      </div>

      {editing && (
        <div className="board-editor">
          <div className="board-editor-grid">
            <div className="board-editor-field">
              <label>
                İSİM
              </label>

              <input
                value={
                  name
                }
                onChange={(
                  event
                ) =>
                  setName(
                    event
                      .target
                      .value
                  )
                }
              />
            </div>

            <div className="board-editor-field">
              <label>
                GÖREV
              </label>

              <input
                value={
                  editRole
                }
                onChange={(
                  event
                ) =>
                  setEditRole(
                    event
                      .target
                      .value
                  )
                }
              />
            </div>

            <div className="board-editor-field">
              <label>
                INSTAGRAM
              </label>

              <input
                value={
                  instagram
                }
                onChange={(
                  event
                ) =>
                  setInstagram(
                    event
                      .target
                      .value
                  )
                }
              />
            </div>

            <div className="board-editor-field">
              <label>
                LINKEDIN
              </label>

              <input
                value={
                  linkedin
                }
                onChange={(
                  event
                ) =>
                  setLinkedin(
                    event
                      .target
                      .value
                  )
                }
              />
            </div>

            <div className="board-editor-field">
              <label>
                SIRA NUMARASI
              </label>

              <input
                type="number"
                value={
                  order
                }
                onChange={(
                  event
                ) =>
                  setOrder(
                    Number(
                      event
                        .target
                        .value
                    )
                  )
                }
              />
            </div>

            <div className="board-editor-field full">
              <label>
                BİYOGRAFİ
              </label>

              <textarea
                value={
                  editBio
                }
                onChange={(
                  event
                ) =>
                  setEditBio(
                    event
                      .target
                      .value
                  )
                }
              />
            </div>
          </div>

          <div className="board-image-edit-grid">
            <div className="board-image-editor">
              <strong>
                Dikey Kart Görseli
              </strong>

              {cardPreview && (
                <img
                  src={
                    cardPreview
                  }
                  alt=""
                />
              )}

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={
                  selectCardImage
                }
              />
            </div>

            <div className="board-image-editor">
              <strong>
                Geniş Profil Görseli
              </strong>

              {detailPreview && (
                <img
                  src={
                    detailPreview
                  }
                  alt=""
                />
              )}

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={
                  selectDetailImage
                }
              />
            </div>
          </div>

          <div className="board-editor-footer">
            <button
              type="button"
              className="board-action-button edit"
              disabled={loading}
              onClick={
                saveChanges
              }
            >
              {loading
                ? "Kaydediliyor..."
                : "Değişiklikleri Kaydet"}
            </button>

            <button
              type="button"
              className="board-action-button"
              disabled={loading}
              onClick={() =>
                setEditing(
                  false
                )
              }
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="board-message">
          {message}
        </div>
      )}
    </div>
  );
}