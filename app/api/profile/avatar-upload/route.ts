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
          error: "Profil fotoğrafı yüklemek için giriş yapmalısın.",
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

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Sadece JPG, PNG veya WEBP yükleyebilirsin.",
        },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: "Profil fotoğrafı en fazla 5 MB olabilir.",
        },
        { status: 400 }
      );
    }

    let extension = "jpg";

    if (file.type === "image/png") {
      extension = "png";
    }

    if (file.type === "image/webp") {
      extension = "webp";
    }

    const filePath =
      `${user.id}/avatar-${Date.now()}-` +
      `${crypto.randomUUID()}.${extension}`;

    const bytes = new Uint8Array(
      await file.arrayBuffer()
    );

    const admin = createAdminClient();

    const { error: uploadError } =
      await admin.storage
        .from("profile-avatars")
        .upload(filePath, bytes, {
          contentType: file.type,
          upsert: false,
        });

    if (uploadError) {
      console.error(
        "AVATAR UPLOAD ERROR:",
        uploadError
      );

      return NextResponse.json(
        {
          error:
            uploadError.message ||
            "Profil fotoğrafı yüklenemedi.",
        },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = admin.storage
      .from("profile-avatars")
      .getPublicUrl(filePath);

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        avatar_url: publicUrl,
      })
      .eq("id", user.id);

    if (profileError) {
      console.error(
        "PROFILE AVATAR UPDATE ERROR:",
        profileError
      );

      await admin.storage
        .from("profile-avatars")
        .remove([filePath]);

      return NextResponse.json(
        {
          error:
            profileError.message ||
            "Profil fotoğrafı profile kaydedilemedi.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      path: filePath,
    });
  } catch (error) {
    console.error(
      "AVATAR UPLOAD ERROR:",
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