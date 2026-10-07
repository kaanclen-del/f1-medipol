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
      .from("board_members")
      .select("*")
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error("BOARD GET ERROR:", error);

      return NextResponse.json(
        {
          error:
            error.message ||
            "Yönetim kurulu üyeleri alınamadı.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      members: data ?? [],
    });
  } catch (error) {
    console.error("BOARD GET ERROR:", error);

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

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const role =
      typeof body.role === "string"
        ? body.role.trim()
        : "";

    const bio =
      typeof body.bio === "string"
        ? body.bio.trim()
        : "";

    const imageUrl =
      typeof body.imageUrl === "string"
        ? body.imageUrl.trim()
        : "";

    const detailImageUrl =
      typeof body.detailImageUrl === "string"
        ? body.detailImageUrl.trim()
        : "";

    const instagramUrl =
      typeof body.instagramUrl === "string"
        ? body.instagramUrl.trim()
        : "";

    const linkedinUrl =
      typeof body.linkedinUrl === "string"
        ? body.linkedinUrl.trim()
        : "";

    const sortOrder =
      typeof body.sortOrder === "number" &&
      Number.isFinite(body.sortOrder)
        ? Math.trunc(body.sortOrder)
        : 0;

    const isPublished =
      typeof body.isPublished === "boolean"
        ? body.isPublished
        : true;

    if (!imageUrl) {
      return NextResponse.json(
        {
          error:
            "Dikey kart görselini seçmelisin.",
        },
        { status: 400 }
      );
    }

    if (!detailImageUrl) {
      return NextResponse.json(
        {
          error:
            "Geniş profil görselini seçmelisin.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await auth.admin
      .from("board_members")
      .insert({
        name: name || null,
        role: role || null,
        bio: bio || null,
        image_url: imageUrl,
        detail_image_url: detailImageUrl,
        instagram_url: instagramUrl || null,
        linkedin_url: linkedinUrl || null,
        sort_order: sortOrder,
        is_published: isPublished,
      })
      .select()
      .single();

    if (error) {
      console.error(
        "BOARD CREATE ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "Yönetim kurulu kartı kaydedilemedi.",
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
      "BOARD CREATE ERROR:",
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