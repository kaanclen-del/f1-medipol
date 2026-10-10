"use client";

import {
  ChangeEvent,
  PointerEvent,
  WheelEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createClient,
} from "@/utils/supabase/client";

const MAX_INPUT_SIZE =
  20 * 1024 * 1024;

const CROP_SIZE = 420;
const OUTPUT_SIZE = 1200;

type ImageSize = {
  width: number;
  height: number;
};

type Point = {
  x: number;
  y: number;
};

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    Math.max(
      value,
      min
    ),
    max
  );
}

export default function ProfileAvatarUploader() {
  const [
    supabase,
  ] =
    useState(() =>
      createClient()
    );

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const imageRef =
    useRef<HTMLImageElement | null>(
      null
    );

  const objectUrlRef =
    useRef<string | null>(
      null
    );

  const draggingRef =
    useRef(false);

  const dragStartRef =
    useRef<Point>({
      x: 0,
      y: 0,
    });

  const panStartRef =
    useRef<Point>({
      x: 0,
      y: 0,
    });

  const [
    currentAvatar,
    setCurrentAvatar,
  ] =
    useState<string | null>(
      null
    );

  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState<string | null>(
      null
    );

  const [
    cropImageUrl,
    setCropImageUrl,
  ] =
    useState<string | null>(
      null
    );

  const [
    imageSize,
    setImageSize,
  ] =
    useState<ImageSize>({
      width: 1,
      height: 1,
    });

  const [
    zoom,
    setZoom,
  ] =
    useState(1);

  const [
    pan,
    setPan,
  ] =
    useState<Point>({
      x: 0,
      y: 0,
    });

  const [
    cropOpen,
    setCropOpen,
  ] =
    useState(false);

  const [
    uploading,
    setUploading,
  ] =
    useState(false);

  const [
    processing,
    setProcessing,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  /* =====================================================
     CURRENT AVATAR
     ===================================================== */

  useEffect(
    () => {
      async function loadCurrentAvatar() {
        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (!user) {
          return;
        }

        const {
          data:
            profile,
        } =
          await supabase
            .from("profiles")
            .select(
              "avatar_url"
            )
            .eq(
              "id",
              user.id
            )
            .maybeSingle();

        if (
          profile?.avatar_url
        ) {
          setCurrentAvatar(
            profile.avatar_url
          );

          setPreviewUrl(
            profile.avatar_url
          );
        }
      }

      void loadCurrentAvatar();
    },
    [supabase]
  );

  /* =====================================================
     CLEANUP
     ===================================================== */

  useEffect(
    () => {
      return () => {
        if (
          objectUrlRef.current
        ) {
          URL.revokeObjectURL(
            objectUrlRef.current
          );
        }
      };
    },
    []
  );

  /* =====================================================
     IMAGE GEOMETRY
     ===================================================== */

  function getBaseScale() {
    return Math.max(
      CROP_SIZE /
        imageSize.width,

      CROP_SIZE /
        imageSize.height
    );
  }

  function getDisplaySize(
    nextZoom = zoom
  ) {
    const scale =
      getBaseScale() *
      nextZoom;

    return {
      width:
        imageSize.width *
        scale,

      height:
        imageSize.height *
        scale,
    };
  }

  function clampPan(
    nextPan: Point,
    nextZoom = zoom
  ) {
    const display =
      getDisplaySize(
        nextZoom
      );

    const maxX =
      Math.max(
        0,
        (
          display.width -
          CROP_SIZE
        ) / 2
      );

    const maxY =
      Math.max(
        0,
        (
          display.height -
          CROP_SIZE
        ) / 2
      );

    return {
      x:
        clamp(
          nextPan.x,
          -maxX,
          maxX
        ),

      y:
        clamp(
          nextPan.y,
          -maxY,
          maxY
        ),
    };
  }

  function changeZoom(
    nextZoom: number
  ) {
    const safeZoom =
      clamp(
        nextZoom,
        1,
        4
      );

    setZoom(
      safeZoom
    );

    setPan(
      (
        current
      ) =>
        clampPan(
          current,
          safeZoom
        )
    );
  }

  /* =====================================================
     SELECT FILE
     ===================================================== */

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setMessage(
        "Sadece JPG, PNG veya WEBP yükleyebilirsin."
      );

      event.target.value =
        "";

      return;
    }

    if (
      file.size >
      MAX_INPUT_SIZE
    ) {
      setMessage(
        "Seçtiğin fotoğraf en fazla 20 MB olabilir."
      );

      event.target.value =
        "";

      return;
    }

    if (
      objectUrlRef.current
    ) {
      URL.revokeObjectURL(
        objectUrlRef.current
      );
    }

    const objectUrl =
      URL.createObjectURL(
        file
      );

    objectUrlRef.current =
      objectUrl;

    const image =
      new Image();

    image.onload =
      () => {
        setImageSize({
          width:
            image.naturalWidth,

          height:
            image.naturalHeight,
        });

        setCropImageUrl(
          objectUrl
        );

        setZoom(1);

        setPan({
          x: 0,
          y: 0,
        });

        setCropOpen(
          true
        );
      };

    image.onerror =
      () => {
        setMessage(
          "Fotoğraf okunamadı."
        );
      };

    image.src =
      objectUrl;

    event.target.value =
      "";
  }

  /* =====================================================
     DRAG
     ===================================================== */

  function handlePointerDown(
    event: PointerEvent<HTMLDivElement>
  ) {
    draggingRef.current =
      true;

    dragStartRef.current =
      {
        x:
          event.clientX,

        y:
          event.clientY,
      };

    panStartRef.current =
      {
        ...pan,
      };

    event.currentTarget
      .setPointerCapture(
        event.pointerId
      );
  }

  function handlePointerMove(
    event: PointerEvent<HTMLDivElement>
  ) {
    if (
      !draggingRef.current
    ) {
      return;
    }

    const deltaX =
      event.clientX -
      dragStartRef.current.x;

    const deltaY =
      event.clientY -
      dragStartRef.current.y;

    const next =
      {
        x:
          panStartRef.current.x +
          deltaX,

        y:
          panStartRef.current.y +
          deltaY,
      };

    setPan(
      clampPan(
        next
      )
    );
  }

  function handlePointerUp(
    event: PointerEvent<HTMLDivElement>
  ) {
    draggingRef.current =
      false;

    try {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId
        );
    } catch {
      // ignore
    }
  }

  /* =====================================================
     MOUSE WHEEL ZOOM
     ===================================================== */

  function handleWheel(
    event: WheelEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    const direction =
      event.deltaY < 0
        ? 0.12
        : -0.12;

    changeZoom(
      zoom +
        direction
    );
  }

  /* =====================================================
     CREATE CROPPED IMAGE
     ===================================================== */

  async function createCroppedFile() {
    const image =
      imageRef.current;

    if (!image) {
      throw new Error(
        "Görsel hazır değil."
      );
    }

    const baseScale =
      getBaseScale();

    const totalScale =
      baseScale *
      zoom;

    const displayedWidth =
      imageSize.width *
      totalScale;

    const displayedHeight =
      imageSize.height *
      totalScale;

    /*
      Crop alanına göre görselin
      sol üst konumunu hesaplıyoruz.
    */

    const imageLeft =
      (
        CROP_SIZE -
        displayedWidth
      ) /
        2 +
      pan.x;

    const imageTop =
      (
        CROP_SIZE -
        displayedHeight
      ) /
        2 +
      pan.y;

    /*
      Crop alanının kaynak görseldeki
      karşılığını hesapla.
    */

    const sourceX =
      clamp(
        -imageLeft /
          totalScale,
        0,
        imageSize.width
      );

    const sourceY =
      clamp(
        -imageTop /
          totalScale,
        0,
        imageSize.height
      );

    const sourceSize =
      CROP_SIZE /
      totalScale;

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      OUTPUT_SIZE;

    canvas.height =
      OUTPUT_SIZE;

    const context =
      canvas.getContext(
        "2d",
        {
          alpha:
            false,
        }
      );

    if (!context) {
      throw new Error(
        "Görsel işlenemedi."
      );
    }

    /*
      JPEG için beyaz zemin.
    */

    context.fillStyle =
      "#ffffff";

    context.fillRect(
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    context.imageSmoothingEnabled =
      true;

    context.imageSmoothingQuality =
      "high";

    context.drawImage(
      image,

      sourceX,
      sourceY,

      sourceSize,
      sourceSize,

      0,
      0,

      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    const blob =
      await new Promise<Blob | null>(
        (
          resolve
        ) => {
          canvas.toBlob(
            resolve,
            "image/jpeg",
            0.9
          );
        }
      );

    if (!blob) {
      throw new Error(
        "Fotoğraf oluşturulamadı."
      );
    }

    return new File(
      [
        blob,
      ],
      `avatar-${Date.now()}.jpg`,
      {
        type:
          "image/jpeg",
      }
    );
  }

  /* =====================================================
     UPLOAD FINAL AVATAR
     ===================================================== */

  async function handleCropConfirm() {
    if (
      uploading ||
      processing
    ) {
      return;
    }

    setMessage("");
    setProcessing(true);

    try {
      const croppedFile =
        await createCroppedFile();

      /*
        Normalde 1200x1200 JPEG
        birkaç yüz KB / birkaç MB olur.
      */

      if (
        croppedFile.size >
        8 * 1024 * 1024
      ) {
        throw new Error(
          "İşlenen fotoğraf hâlâ çok büyük."
        );
      }

      setProcessing(
        false
      );

      setUploading(
        true
      );

      const formData =
        new FormData();

      formData.append(
        "file",
        croppedFile
      );

      const response =
        await fetch(
          "/api/profile/avatar-upload",
          {
            method:
              "POST",

            body:
              formData,
          }
        );

      const text =
        await response.text();

      let data:
        {
          url?: string;
          error?: string;
        } =
          {};

      try {
        data =
          text
            ? JSON.parse(
                text
              )
            : {};
      } catch {
        data = {
          error:
            text,
        };
      }

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Profil fotoğrafı yüklenemedi."
        );
      }

      if (
        !data.url
      ) {
        throw new Error(
          "Yeni profil fotoğrafı adresi alınamadı."
        );
      }

      setPreviewUrl(
        data.url
      );

      setCurrentAvatar(
        data.url
      );

      setCropOpen(
        false
      );

      setMessage(
        "✅ Profil fotoğrafı güncellendi."
      );

      /*
        Header vb. başka componentler
        isterse bunu dinleyebilir.
      */

      window.dispatchEvent(
        new CustomEvent(
          "profile-avatar-updated",
          {
            detail: {
              url:
                data.url,
            },
          }
        )
      );
    } catch (
      error
    ) {
      setMessage(
        error instanceof
        Error
          ? error.message
          : "Profil fotoğrafı yüklenemedi."
      );
    } finally {
      setProcessing(
        false
      );

      setUploading(
        false
      );
    }
  }

  function closeCropper() {
    if (
      uploading ||
      processing
    ) {
      return;
    }

    setCropOpen(
      false
    );

    setZoom(1);

    setPan({
      x: 0,
      y: 0,
    });
  }

  const displaySize =
    getDisplaySize();

  /* =====================================================
     UI
     ===================================================== */

  return (
    <>
      <style>{`
        .avatar-uploader {
          padding: 22px;

          margin-bottom:
            24px;

          border:
            1px solid
            rgba(255,255,255,.08);

          border-radius:
            18px;

          background:
            rgba(255,255,255,.025);
        }

        .avatar-uploader-inner {
          display: flex;

          align-items:
            center;

          gap: 18px;

          flex-wrap:
            wrap;
        }

        .avatar-current-preview {
          width: 104px;
          height: 104px;

          padding: 4px;

          overflow: hidden;

          flex:
            0 0 104px;

          display: grid;

          place-items:
            center;

          border:
            1px solid
            rgba(255,255,255,.14);

          border-radius:
            15px;

          background:
            #ffffff;

          box-shadow:
            0 10px 30px
            rgba(0,0,0,.24);
        }

        .avatar-current-preview img {
          width: 100%;
          height: 100%;

          display: block;

          object-fit:
            contain;

          object-position:
            center;

          border-radius:
            10px;
        }

        .avatar-current-empty {
          color:
            #727c87;

          font-size:
            30px;
        }

        .avatar-upload-info {
          flex: 1;

          min-width:
            220px;
        }

        .avatar-upload-title {
          color: #f4f7fa;

          font-size:
            15px;

          font-weight:
            900;
        }

        .avatar-upload-description {
          margin-top:
            6px;

          color:
            #929dab;

          font-size:
            11px;

          line-height:
            1.6;
        }

        .avatar-select-button {
          min-height:
            42px;

          margin-top:
            13px;

          padding:
            0 17px;

          border: 0;

          border-radius:
            8px;

          color:
            white;

          background:
            linear-gradient(
              135deg,
              var(
                --profile-accent-2,
                #c90000
              ),
              var(
                --profile-accent,
                #ff443c
              )
            );

          font-size:
            10px;

          font-weight:
            900;

          cursor:
            pointer;

          transition:
            .18s ease;
        }

        .avatar-select-button:hover {
          transform:
            translateY(-1px);
        }

        .avatar-message {
          margin-top:
            14px;

          padding:
            10px 12px;

          border:
            1px solid
            rgba(255,255,255,.07);

          border-radius:
            8px;

          background:
            rgba(255,255,255,.025);

          font-size:
            10px;
        }

        /*
          MODAL
        */

        .avatar-crop-modal {
          position: fixed;

          z-index:
            99999;

          inset: 0;

          padding:
            25px;

          display: grid;

          place-items:
            center;

          background:
            rgba(0,0,0,.78);

          backdrop-filter:
            blur(12px);
        }

        .avatar-crop-dialog {
          width:
            min(
              620px,
              100%
            );

          overflow:
            hidden;

          border:
            1px solid
            rgba(255,255,255,.13);

          border-radius:
            18px;

          background:
            #11151c;

          box-shadow:
            0 40px 120px
            rgba(0,0,0,.65);
        }

        .crop-dialog-header {
          min-height:
            68px;

          padding:
            0 20px;

          display: flex;

          align-items:
            center;

          justify-content:
            space-between;

          border-bottom:
            1px solid
            rgba(255,255,255,.08);
        }

        .crop-dialog-header > div {
          display: grid;

          gap: 4px;
        }

        .crop-dialog-header span {
          color:
            var(
              --profile-accent,
              #ff443c
            );

          font-size:
            7px;

          font-weight:
            1000;

          letter-spacing:
            .12em;
        }

        .crop-dialog-header strong {
          color: #fff;

          font-size:
            16px;
        }

        .crop-close {
          width: 34px;
          height: 34px;

          display: grid;

          place-items:
            center;

          border:
            1px solid
            rgba(255,255,255,.10);

          border-radius:
            50%;

          color: #cbd2da;

          background:
            rgba(255,255,255,.04);

          cursor:
            pointer;

          font-size:
            16px;
        }

        .crop-body {
          padding:
            22px;
        }

        .crop-stage-shell {
          position:
            relative;

          width:
            min(
              420px,
              100%
            );

          aspect-ratio:
            1;

          margin:
            0 auto;

          overflow:
            hidden;

          border-radius:
            16px;

          background:
            #05070a;

          box-shadow:
            inset 0 0 0 1px
            rgba(255,255,255,.08);

          touch-action:
            none;

          user-select:
            none;

          cursor:
            grab;
        }

        .crop-stage-shell.dragging {
          cursor:
            grabbing;
        }

        .crop-stage-image {
          position:
            absolute;

          left: 50%;
          top: 50%;

          max-width:
            none;

          max-height:
            none;

          pointer-events:
            none;

          user-select:
            none;

          -webkit-user-drag:
            none;
        }

        /*
          INSTAGRAM BENZERİ MASK
        */

        .crop-guide {
          position:
            absolute;

          z-index:
            4;

          inset: 0;

          pointer-events:
            none;

          border:
            2px solid
            rgba(255,255,255,.88);

          border-radius:
            15px;

          box-shadow:
            0 0 0 999px
            rgba(0,0,0,.06)
            inset;
        }

        .crop-guide::before,
        .crop-guide::after {
          content: "";

          position:
            absolute;

          pointer-events:
            none;
        }

        .crop-guide::before {
          left:
            33.333%;

          top: 0;

          bottom: 0;

          width:
            33.333%;

          border-left:
            1px solid
            rgba(255,255,255,.20);

          border-right:
            1px solid
            rgba(255,255,255,.20);
        }

        .crop-guide::after {
          top:
            33.333%;

          left: 0;

          right: 0;

          height:
            33.333%;

          border-top:
            1px solid
            rgba(255,255,255,.20);

          border-bottom:
            1px solid
            rgba(255,255,255,.20);
        }

        .crop-hint {
          margin-top:
            12px;

          text-align:
            center;

          color:
            #7f8995;

          font-size:
            9px;
        }

        /*
          ZOOM
        */

        .crop-zoom {
          margin-top:
            20px;

          display: grid;

          grid-template-columns:
            36px 1fr 36px;

          align-items:
            center;

          gap: 11px;
        }

        .crop-zoom button {
          width: 36px;
          height: 36px;

          border:
            1px solid
            rgba(255,255,255,.09);

          border-radius:
            8px;

          background:
            rgba(255,255,255,.04);

          color: #fff;

          cursor:
            pointer;

          font-size:
            18px;
        }

        .crop-zoom input {
          width: 100%;

          accent-color:
            var(
              --profile-accent,
              #ff443c
            );
        }

        .crop-zoom-meta {
          margin-top:
            7px;

          display: flex;

          justify-content:
            space-between;

          color:
            #737e89;

          font-size:
            8px;
        }

        /*
          BUTTONS
        */

        .crop-actions {
          margin-top:
            22px;

          display: grid;

          grid-template-columns:
            1fr 1.3fr;

          gap:
            9px;
        }

        .crop-cancel,
        .crop-confirm {
          min-height:
            46px;

          border-radius:
            9px;

          font-size:
            10px;

          font-weight:
            900;

          cursor:
            pointer;
        }

        .crop-cancel {
          border:
            1px solid
            rgba(255,255,255,.10);

          color: #fff;

          background:
            rgba(255,255,255,.04);
        }

        .crop-confirm {
          border: 0;

          color: #fff;

          background:
            linear-gradient(
              135deg,
              var(
                --profile-accent-2,
                #c90000
              ),
              var(
                --profile-accent,
                #ff443c
              )
            );

          box-shadow:
            0 9px 28px
            var(
              --profile-accent-glow,
              rgba(255,68,60,.22)
            );
        }

        .crop-confirm:disabled,
        .crop-cancel:disabled {
          opacity: .45;

          cursor:
            wait;
        }

        @media(
          max-width:
            520px
        ) {
          .avatar-crop-modal {
            padding:
              9px;
          }

          .crop-body {
            padding:
              14px;
          }

          .crop-actions {
            grid-template-columns:
              1fr;
          }
        }
      `}</style>

      <div className="avatar-uploader">
        <div className="avatar-uploader-inner">
          <div className="avatar-current-preview">
            {previewUrl ||
            currentAvatar ? (
              <img
                src={
                  previewUrl ||
                  currentAvatar ||
                  ""
                }
                alt="Profil fotoğrafı"
              />
            ) : (
              <span className="avatar-current-empty">
                👤
              </span>
            )}
          </div>

          <div className="avatar-upload-info">
            <div className="avatar-upload-title">
              Profil Fotoğrafı
            </div>

            <div className="avatar-upload-description">
              JPG, PNG veya WEBP ·
              Maksimum 20 MB
              <br />
              Fotoğrafı seçtikten sonra
              kırpabilir ve yakınlaştırabilirsin.
            </div>

            <input
              ref={
                inputRef
              }
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={
                handleFileChange
              }
              disabled={
                uploading ||
                processing
              }
              style={{
                display:
                  "none",
              }}
            />

            <button
              type="button"
              className="avatar-select-button"
              disabled={
                uploading ||
                processing
              }
              onClick={() =>
                inputRef.current?.click()
              }
            >
              Fotoğraf Seç
            </button>
          </div>
        </div>

        {message && (
          <div
            className="avatar-message"
            style={{
              color:
                message.startsWith(
                  "✅"
                )
                  ? "#8de3a5"
                  : "#ff9ca9",
            }}
          >
            {message}
          </div>
        )}
      </div>

      {/* =================================================
          CROP POPUP
          ================================================= */}

      {cropOpen &&
        cropImageUrl && (
          <div
            className="avatar-crop-modal"
            onMouseDown={
              (
                event
              ) => {
                if (
                  event.target ===
                  event.currentTarget
                ) {
                  closeCropper();
                }
              }
            }
          >
            <div className="avatar-crop-dialog">
              <header className="crop-dialog-header">
                <div>
                  <span>
                    PROFILE PHOTO
                  </span>

                  <strong>
                    Fotoğrafı Ayarla
                  </strong>
                </div>

                <button
                  type="button"
                  className="crop-close"
                  onClick={
                    closeCropper
                  }
                  disabled={
                    uploading ||
                    processing
                  }
                >
                  ×
                </button>
              </header>

              <div className="crop-body">
                <div
                  className="crop-stage-shell"
                  onPointerDown={
                    handlePointerDown
                  }
                  onPointerMove={
                    handlePointerMove
                  }
                  onPointerUp={
                    handlePointerUp
                  }
                  onPointerCancel={
                    handlePointerUp
                  }
                  onWheel={
                    handleWheel
                  }
                >
                  <img
                    ref={
                      imageRef
                    }
                    src={
                      cropImageUrl
                    }
                    alt=""
                    draggable={
                      false
                    }
                    className="crop-stage-image"
                    style={{
                      width:
                        `${displaySize.width}px`,

                      height:
                        `${displaySize.height}px`,

                      transform:
                        `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
                    }}
                  />

                  <div className="crop-guide" />
                </div>

                <div className="crop-hint">
                  Fotoğrafı sürükleyerek
                  konumlandır. Fare tekerleği
                  veya aşağıdaki kontrol ile
                  yakınlaştırabilirsin.
                </div>

                <div className="crop-zoom">
                  <button
                    type="button"
                    onClick={() =>
                      changeZoom(
                        zoom -
                          0.15
                      )
                    }
                  >
                    −
                  </button>

                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.01"
                    value={
                      zoom
                    }
                    onChange={
                      (
                        event
                      ) =>
                        changeZoom(
                          Number(
                            event
                              .target
                              .value
                          )
                        )
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      changeZoom(
                        zoom +
                          0.15
                      )
                    }
                  >
                    +
                  </button>
                </div>

                <div className="crop-zoom-meta">
                  <span>
                    Uzak
                  </span>

                  <strong>
                    {Math.round(
                      zoom *
                        100
                    )}
                    %
                  </strong>

                  <span>
                    Yakın
                  </span>
                </div>

                <div className="crop-actions">
                  <button
                    type="button"
                    className="crop-cancel"
                    onClick={
                      closeCropper
                    }
                    disabled={
                      uploading ||
                      processing
                    }
                  >
                    İptal
                  </button>

                  <button
                    type="button"
                    className="crop-confirm"
                    onClick={
                      handleCropConfirm
                    }
                    disabled={
                      uploading ||
                      processing
                    }
                  >
                    {processing
                      ? "Fotoğraf hazırlanıyor..."
                      : uploading
                      ? "Yükleniyor..."
                      : "Uygula ve Yükle"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
}