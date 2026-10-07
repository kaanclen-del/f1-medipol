import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Medya yüklemek için giriş yapmalısın.",
        },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Dosya bulunamadı.",
        },
        { status: 400 }
      );
    }

    const imageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    const videoTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    const isImage = imageTypes.includes(file.type);
    const isVideo = videoTypes.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        {
          error:
            "Sadece JPG, PNG, WEBP, MP4, WEBM veya MOV yükleyebilirsin.",
        },
        { status: 400 }
      );
    }

    const imageMaxSize = 5 * 1024 * 1024;
    const videoMaxSize = 15 * 1024 * 1024;

    if (isImage && file.size > imageMaxSize) {
      return NextResponse.json(
        {
          error:
            "Görsel boyutu en fazla 5 MB olabilir.",
        },
        { status: 400 }
      );
    }

    if (isVideo && file.size > videoMaxSize) {
      return NextResponse.json(
        {
          error:
            "Video boyutu en fazla 15 MB olabilir.",
        },
        { status: 400 }
      );
    }

    let extension = "bin";

    if (file.type === "image/jpeg") {
      extension = "jpg";
    }

    if (file.type === "image/png") {
      extension = "png";
    }

    if (file.type === "image/webp") {
      extension = "webp";
    }

    if (file.type === "video/mp4") {
      extension = "mp4";
    }

    if (file.type === "video/webm") {
      extension = "webm";
    }

    if (file.type === "video/quicktime") {
      extension = "mov";
    }

    const mediaType = isImage
      ? "image"
      : "video";

    const filePath =
      `${user.id}/${Date.now()}-` +
      `${crypto.randomUUID()}.${extension}`;

    const bytes = new Uint8Array(
      await file.arrayBuffer()
    );

    const admin = createAdminClient();

    const { error: uploadError } =
      await admin.storage
        .from("paddock-media")
        .upload(filePath, bytes, {
          contentType: file.type,
          upsert: false,
        });

    if (uploadError) {
      console.error(
        "PADDOCK MEDIA UPLOAD ERROR:",
        uploadError
      );

      return NextResponse.json(
        {
          error:
            uploadError.message ||
            "Medya yüklenemedi.",
        },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = admin.storage
      .from("paddock-media")
      .getPublicUrl(filePath);

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      path: filePath,
      mediaType,
    });
  } catch (error) {
    console.error(
      "PADDOCK MEDIA UPLOAD ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}