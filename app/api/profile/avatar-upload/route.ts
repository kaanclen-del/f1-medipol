import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/utils/supabase/server";

import {
  createAdminClient,
} from "@/utils/supabase/admin";

export const runtime =
  "nodejs";

const MAX_FILE_SIZE =
  20 *
  1024 *
  1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Profil fotoğrafı yüklemek için giriş yapmalısın.",
        },
        {
          status:
            401,
        }
      );
    }

    const formData =
      await request.formData();

    const file =
      formData.get(
        "file"
      );

    if (
      !(
        file instanceof
        File
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Dosya bulunamadı.",
        },
        {
          status:
            400,
        }
      );
    }

    /* =====================================================
       TYPE CONTROL
       ===================================================== */

    if (
      !ALLOWED_TYPES.includes(
        file.type
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Sadece JPG, PNG veya WEBP yükleyebilirsin.",
        },
        {
          status:
            400,
        }
      );
    }

    /* =====================================================
       20 MB LIMIT
       ===================================================== */

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Profil fotoğrafı en fazla 20 MB olabilir.",
        },
        {
          status:
            400,
        }
      );
    }

    /* =====================================================
       EXTENSION
       ===================================================== */

    let extension =
      "jpg";

    if (
      file.type ===
      "image/png"
    ) {
      extension =
        "png";
    }

    if (
      file.type ===
      "image/webp"
    ) {
      extension =
        "webp";
    }

    /* =====================================================
       PATH
       ===================================================== */

    const filePath =
      `${user.id}/avatar-${Date.now()}-` +
      `${crypto.randomUUID()}.${extension}`;

    const bytes =
      new Uint8Array(
        await file.arrayBuffer()
      );

    const admin =
      createAdminClient();

    /* =====================================================
       UPLOAD
       ===================================================== */

    const {
      error:
        uploadError,
    } =
      await admin.storage
        .from(
          "profile-avatars"
        )
        .upload(
          filePath,
          bytes,
          {
            contentType:
              file.type,

            upsert:
              false,

            cacheControl:
              "3600",
          }
        );

    if (
      uploadError
    ) {
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
        {
          status:
            500,
        }
      );
    }

    /* =====================================================
       PUBLIC URL
       ===================================================== */

    const {
      data: {
        publicUrl,
      },
    } =
      admin.storage
        .from(
          "profile-avatars"
        )
        .getPublicUrl(
          filePath
        );

    /* =====================================================
       SAVE PROFILE
       ===================================================== */

    const {
      error:
        profileError,
    } =
      await admin
        .from(
          "profiles"
        )
        .update({
          avatar_url:
            publicUrl,
        })
        .eq(
          "id",
          user.id
        );

    if (
      profileError
    ) {
      console.error(
        "PROFILE AVATAR UPDATE ERROR:",
        profileError
      );

      /*
        Profil update başarısızsa
        Storage'daki yeni dosyayı temizle.
      */

      await admin.storage
        .from(
          "profile-avatars"
        )
        .remove([
          filePath,
        ]);

      return NextResponse.json(
        {
          error:
            profileError.message ||
            "Profil fotoğrafı profile kaydedilemedi.",
        },
        {
          status:
            500,
        }
      );
    }

    /* =====================================================
       SUCCESS
       ===================================================== */

    return NextResponse.json({
      ok:
        true,

      url:
        publicUrl,

      path:
        filePath,

      size:
        file.size,

      maxSize:
        MAX_FILE_SIZE,
    });
  } catch (
    error
  ) {
    console.error(
      "AVATAR UPLOAD ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      },
      {
        status:
          500,
      }
    );
  }
}