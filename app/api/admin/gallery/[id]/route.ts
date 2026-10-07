import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

async function getAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Giriş yapılmamış." },
        { status: 401 }
      ),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return {
      error: NextResponse.json(
        { error: "Admin yetkisi gerekiyor." },
        { status: 403 }
      ),
    };
  }

  return {
    admin: createAdminClient(),
  };
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const auth = await getAdmin();

    if ("error" in auth) {
      return auth.error;
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Galeri görseli ID bulunamadı." },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (typeof body.isPublished !== "boolean") {
      return NextResponse.json(
        { error: "Yayın durumu geçersiz." },
        { status: 400 }
      );
    }

    const { data, error } = await auth.admin
      .from("gallery_images")
      .update({
        is_published: body.isPublished,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(
        "GALLERY UPDATE ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "Galeri görseli güncellenemedi.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      image: data,
    });
  } catch (error) {
    console.error(
      "GALLERY PATCH ERROR:",
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

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const auth = await getAdmin();

    if ("error" in auth) {
      return auth.error;
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Galeri görseli ID bulunamadı." },
        { status: 400 }
      );
    }

    const { data: image, error: findError } =
      await auth.admin
        .from("gallery_images")
        .select("id, image_url")
        .eq("id", id)
        .single();

    if (findError || !image) {
      return NextResponse.json(
        { error: "Galeri görseli bulunamadı." },
        { status: 404 }
      );
    }

    const { error: deleteError } =
      await auth.admin
        .from("gallery_images")
        .delete()
        .eq("id", id);

    if (deleteError) {
      console.error(
        "GALLERY DELETE ERROR:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            deleteError.message ||
            "Galeri görseli silinemedi.",
        },
        { status: 500 }
      );
    }

    try {
      const marker =
        "/storage/v1/object/public/gallery-images/";

      const markerIndex =
        image.image_url.indexOf(marker);

      if (markerIndex !== -1) {
        const filePath = decodeURIComponent(
          image.image_url.substring(
            markerIndex + marker.length
          )
        );

        if (filePath) {
          const { error: storageError } =
            await auth.admin.storage
              .from("gallery-images")
              .remove([filePath]);

          if (storageError) {
            console.error(
              "GALLERY STORAGE DELETE ERROR:",
              storageError
            );
          }
        }
      }
    } catch (storageError) {
      console.error(
        "GALLERY STORAGE DELETE ERROR:",
        storageError
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "GALLERY DELETE ERROR:",
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