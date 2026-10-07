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

export async function GET() {
  try {
    const auth = await getAdmin();

    if ("error" in auth) {
      return auth.error;
    }

    const { data, error } = await auth.admin
      .from("gallery_images")
      .select("*")
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("GALLERY GET ERROR:", error);

      return NextResponse.json(
        {
          error:
            error.message ||
            "Galeri görselleri alınamadı.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      images: data ?? [],
    });
  } catch (error) {
    console.error("GALLERY GET ERROR:", error);

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

export async function POST(request: Request) {
  try {
    const auth = await getAdmin();

    if ("error" in auth) {
      return auth.error;
    }

    const body = await request.json();

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const caption =
      typeof body.caption === "string"
        ? body.caption.trim()
        : "";

    const imageUrl =
      typeof body.imageUrl === "string"
        ? body.imageUrl.trim()
        : "";

    const isPublished =
      typeof body.isPublished === "boolean"
        ? body.isPublished
        : true;

    const sortOrder =
      typeof body.sortOrder === "number" &&
      Number.isFinite(body.sortOrder)
        ? Math.trunc(body.sortOrder)
        : 0;

    if (!imageUrl) {
      return NextResponse.json(
        {
          error: "Galeri görseli bulunamadı.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await auth.admin
      .from("gallery_images")
      .insert({
        title: title || null,
        caption: caption || null,
        image_url: imageUrl,
        is_published: isPublished,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error(
        "GALLERY CREATE ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "Galeri görseli kaydedilemedi.",
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
      "GALLERY CREATE ERROR:",
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