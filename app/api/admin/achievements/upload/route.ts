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

async function getAdmin() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        NextResponse.json(
          {
            error:
              "Giriş yapılmamış.",
          },
          {
            status:
              401,
          }
        ),
    };
  }

  const {
    data:
      profile,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select(
        "is_admin"
      )
      .eq(
        "id",
        user.id
      )
      .single();

  if (
    !profile?.is_admin
  ) {
    return {
      error:
        NextResponse.json(
          {
            error:
              "Admin yetkisi gerekiyor.",
          },
          {
            status:
              403,
          }
        ),
    };
  }

  return {
    user,

    admin:
      createAdminClient(),
  };
}

export async function POST(
  request: Request
) {
  try {
    const auth =
      await getAdmin();

    if (
      "error" in auth
    ) {
      return auth.error;
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
            "Rozet görseli bulunamadı.",
        },
        {
          status:
            400,
        }
      );
    }

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
      return NextResponse.json(
        {
          error:
            "Sadece JPG, PNG veya WEBP yüklenebilir.",
        },
        {
          status:
            400,
        }
      );
    }

    const maxSize =
      5 *
      1024 *
      1024;

    if (
      file.size >
      maxSize
    ) {
      return NextResponse.json(
        {
          error:
            "Rozet görseli en fazla 5 MB olabilir.",
        },
        {
          status:
            400,
        }
      );
    }

    const extension =
      file.type ===
      "image/png"
        ? "png"
        : file.type ===
          "image/webp"
        ? "webp"
        : "jpg";

    const filePath =
      `${auth.user.id}/` +
      `${Date.now()}-` +
      `${crypto.randomUUID()}.${extension}`;

    const bytes =
      new Uint8Array(
        await file.arrayBuffer()
      );

    const {
      error:
        uploadError,
    } =
      await auth.admin.storage
        .from(
          "achievement-badges"
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
      return NextResponse.json(
        {
          error:
            uploadError.message,
        },
        {
          status:
            500,
        }
      );
    }

    const {
      data: {
        publicUrl,
      },
    } =
      auth.admin.storage
        .from(
          "achievement-badges"
        )
        .getPublicUrl(
          filePath
        );

    return NextResponse.json({
      ok:
        true,

      url:
        publicUrl,

      path:
        filePath,
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Rozet görseli yüklenemedi.",
      },
      {
        status:
          500,
      }
    );
  }
}