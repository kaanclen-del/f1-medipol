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
        { error: "Giriş yapılmamış." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: "Admin yetkisi gerekiyor." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Görsel bulunamadı." },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Sadece JPG, PNG veya WEBP görseller yüklenebilir.",
        },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error:
            "Görsel boyutu en fazla 5 MB olabilir.",
        },
        { status: 400 }
      );
    }

    const extension =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";

    const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const bytes = new Uint8Array(
      await file.arrayBuffer()
    );

    const admin = createAdminClient();

    const { error: uploadError } =
      await admin.storage
        .from("board-images")
        .upload(filePath, bytes, {
          contentType: file.type,
          upsert: false,
        });

    if (uploadError) {
      console.error(
        "BOARD IMAGE UPLOAD ERROR:",
        uploadError
      );

      return NextResponse.json(
        {
          error:
            uploadError.message ||
            "Görsel yüklenemedi.",
        },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = admin.storage
      .from("board-images")
      .getPublicUrl(filePath);

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      path: filePath,
    });
  } catch (error) {
    console.error(
      "BOARD IMAGE UPLOAD ERROR:",
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