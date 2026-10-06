import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "Görsel seçilmedi." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Sadece JPG, PNG veya WEBP yüklenebilir.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Görsel en fazla 5 MB olabilir." },
        { status: 400 }
      );
    }

    const extension =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
        ? "webp"
        : "jpg";

    const fileName =
      `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const bytes = new Uint8Array(
      await file.arrayBuffer()
    );

    const admin = createAdminClient();

    const { error: uploadError } = await admin.storage
      .from("event-images")
      .upload(fileName, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("UPLOAD ERROR:", uploadError);

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
      .from("event-images")
      .getPublicUrl(fileName);

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      path: fileName,
    });
  } catch (error) {
    console.error("EVENT IMAGE ERROR:", error);

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