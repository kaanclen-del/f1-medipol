
import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORAGE_BUCKET = "gallery-images";

const RACE_KEY_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/*
  YÖNETİCİ YETKİSİNİ KONTROL ET
*/

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error: "Giriş yapmanız gerekiyor.",
        },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

  if (profileError || !profile?.is_admin) {
    return {
      success: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error: "Admin yetkisi gerekiyor.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    success: true as const,
    admin: createAdminClient(),
  };
}

/*
  TÜM YARIŞ GÖRSELLERİNİ LİSTELE

  İstenirse ?raceKey=united-states-grand-prix
  ile yalnızca belirli yarış gösterilir.
*/

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();

    if (!auth.success) {
      return auth.response;
    }

    const url = new URL(request.url);

    const raceKey =
      url.searchParams.get("raceKey")?.trim() ?? "";

    if (
      raceKey &&
      !RACE_KEY_PATTERN.test(raceKey)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Geçersiz yarış anahtarı.",
        },
        { status: 400 }
      );
    }

    let query = auth.admin
      .from("race_hero_images")
      .select(
        "id,race_key,image_url,storage_path,photo_year,sort_order,is_active,created_at"
      )
      .order("race_key", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (raceKey) {
      query = query.eq("race_key", raceKey);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "RACE HERO LIST ERROR:",
        error
      );

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        images: data ?? [],
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "RACE HERO GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Görseller alınamadı.",
      },
      { status: 500 }
    );
  }
}

/*
  GÖRSEL BİLGİLERİNİ GÜNCELLE

  Değiştirilebilir alanlar:
  - sortOrder
  - isActive
  - photoYear
*/

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();

    if (!auth.success) {
      return auth.response;
    }

    const body = await request.json();

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Geçersiz görsel kimliği.",
        },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "sortOrder"
      )
    ) {
      const value = body.sortOrder;

      if (
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < 0 ||
        value > 100000
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "Geçersiz sıralama değeri.",
          },
          { status: 400 }
        );
      }

      updates.sort_order = value;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "isActive"
      )
    ) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json(
          {
            ok: false,
            error: "Geçersiz görünürlük değeri.",
          },
          { status: 400 }
        );
      }

      updates.is_active = body.isActive;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "photoYear"
      )
    ) {
      const value = body.photoYear;

      if (
        value !== null &&
        (
          typeof value !== "number" ||
          !Number.isInteger(value) ||
          value < 1950 ||
          value > 2100
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "Geçersiz fotoğraf yılı.",
          },
          { status: 400 }
        );
      }

      updates.photo_year = value;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Güncellenecek bilgi bulunamadı.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await auth.admin
      .from("race_hero_images")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error(
        "RACE HERO UPDATE ERROR:",
        error
      );

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: "Görsel bulunamadı.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      image: data,
    });
  } catch (error) {
    console.error(
      "RACE HERO PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Görsel güncellenemedi.",
      },
      { status: 500 }
    );
  }
}

/*
  GÖRSELİ SİL

  Önce veritabanı kaydını sil,
  ardından yarışa ait Storage dosyasını temizle.
*/

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin();

    if (!auth.success) {
      return auth.response;
    }

    const body = await request.json();

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Geçersiz görsel kimliği.",
        },
        { status: 400 }
      );
    }

    const { data: image, error: lookupError } =
      await auth.admin
        .from("race_hero_images")
        .select("id,storage_path")
        .eq("id", id)
        .maybeSingle();

    if (lookupError) {
      return NextResponse.json(
        {
          ok: false,
          error: lookupError.message,
        },
        { status: 500 }
      );
    }

    if (!image) {
      return NextResponse.json(
        {
          ok: false,
          error: "Görsel bulunamadı.",
        },
        { status: 404 }
      );
    }

    const { error: deleteError } =
      await auth.admin
        .from("race_hero_images")
        .delete()
        .eq("id", id);

    if (deleteError) {
      console.error(
        "RACE HERO DELETE ERROR:",
        deleteError
      );

      return NextResponse.json(
        {
          ok: false,
          error: deleteError.message,
        },
        { status: 500 }
      );
    }

    let storageWarning: string | null = null;

    if (
      image.storage_path &&
      image.storage_path.startsWith(
        "race-heroes/"
      )
    ) {
      const { error: storageError } =
        await auth.admin.storage
          .from(STORAGE_BUCKET)
          .remove([image.storage_path]);

      if (storageError) {
        console.error(
          "RACE HERO STORAGE DELETE ERROR:",
          storageError
        );

        storageWarning =
          "Veritabanı kaydı silindi ancak Storage dosyası temizlenemedi.";
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Görsel kaldırıldı.",
      warning: storageWarning,
    });
  } catch (error) {
    console.error(
      "RACE HERO DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Görsel silinemedi.",
      },
      { status: 500 }
    );
  }
}
