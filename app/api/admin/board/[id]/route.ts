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

function getStoragePath(url: string | null) {
  if (!url) {
    return null;
  }

  const marker =
    "/storage/v1/object/public/board-images/";

  const markerIndex = url.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return decodeURIComponent(
    url.substring(markerIndex + marker.length)
  );
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
        {
          error:
            "Yönetim kurulu kaydı ID bulunamadı.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (typeof body.isPublished !== "boolean") {
      return NextResponse.json(
        {
          error: "Yayın durumu geçersiz.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await auth.admin
      .from("board_members")
      .update({
        is_published: body.isPublished,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(
        "BOARD UPDATE ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "Yönetim kurulu kaydı güncellenemedi.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      member: data,
    });
  } catch (error) {
    console.error(
      "BOARD PATCH ERROR:",
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
        {
          error:
            "Yönetim kurulu kaydı ID bulunamadı.",
        },
        { status: 400 }
      );
    }

    const { data: member, error: findError } =
      await auth.admin
        .from("board_members")
        .select(
          `
            id,
            image_url,
            detail_image_url
          `
        )
        .eq("id", id)
        .single();

    if (findError || !member) {
      return NextResponse.json(
        {
          error:
            "Yönetim kurulu kaydı bulunamadı.",
        },
        { status: 404 }
      );
    }

    const { error: deleteError } =
      await auth.admin
        .from("board_members")
        .delete()
        .eq("id", id);

    if (deleteError) {
      console.error(
        "BOARD DELETE ERROR:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            deleteError.message ||
            "Yönetim kurulu kaydı silinemedi.",
        },
        { status: 500 }
      );
    }

    const storagePaths = [
      getStoragePath(member.image_url),
      getStoragePath(member.detail_image_url),
    ].filter(
      (path): path is string => Boolean(path)
    );

    if (storagePaths.length > 0) {
      const { error: storageError } =
        await auth.admin.storage
          .from("board-images")
          .remove(storagePaths);

      if (storageError) {
        console.error(
          "BOARD STORAGE DELETE ERROR:",
          storageError
        );
      }
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "BOARD DELETE ERROR:",
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