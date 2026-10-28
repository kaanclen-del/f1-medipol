import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "gallery-images";
const MAX_BYTES = 10 * 1024 * 1024;

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const GAME_IDS = ["manager", "whatif", "rush", "timing", "mcold"] as const;
type GameId = (typeof GAME_IDS)[number];

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { error: fail("Giriş yapmalısın.", 401) };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    return { error: fail("Bu işlem için admin yetkisi gerekiyor.", 403) };
  }

  return { error: null };
}

type Body = {
  action?: "sign" | "complete";
  gameId?: string;
  fileType?: string;
  fileSize?: number;
  path?: string;
};

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body || !["sign", "complete"].includes(body.action ?? "")) {
      return fail("Geçersiz istek.");
    }

    const gameId = body.gameId;
    if (!GAME_IDS.includes(gameId as GameId)) {
      return fail("Geçersiz oyun seçimi.");
    }

    const fileType = body.fileType ?? "";
    const extension = TYPES[fileType];
    if (!extension) {
      return fail("JPG, PNG, WebP veya AVIF formatında görsel seç.");
    }

    const fileSize = Number(body.fileSize);
    if (!Number.isInteger(fileSize) || fileSize < 1 || fileSize > MAX_BYTES) {
      return fail("Görsel 10 MB'dan küçük olmalı.");
    }

    const admin = createAdminClient();
    const storage = admin.storage.from(BUCKET);

    if (body.action === "sign") {
      const path = `arcade-backgrounds/${gameId}/${crypto.randomUUID()}.${extension}`;
      const { data, error } = await storage.createSignedUploadUrl(path);

      if (error || !data?.token) {
        return fail(error?.message ?? "Yükleme bağlantısı oluşturulamadı.", 500);
      }

      return NextResponse.json({ ok: true, path, token: data.token });
    }

    const path = typeof body.path === "string" ? body.path : "";
    const prefix = `arcade-backgrounds/${gameId}/`;
    const filename = path.startsWith(prefix) ? path.slice(prefix.length) : "";

    if (
      !new RegExp(
        `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.${extension}$`
      ).test(filename)
    ) {
      return fail("Yükleme yolu doğrulanamadı.");
    }

    const { data: uploaded, error: infoError } = await storage.info(path);
    if (infoError || !uploaded) {
      return fail("Görsel yüklenmemiş görünüyor. Tekrar dene.", 409);
    }

    if (Number(uploaded.size) !== fileSize || Number(uploaded.size) > MAX_BYTES) {
      await storage.remove([path]);
      return fail("Yüklenen dosyanın boyutu doğrulanamadı.");
    }

    const { data: old } = await admin
      .from("arcade_game_backgrounds")
      .select("storage_path")
      .eq("game_id", gameId)
      .maybeSingle();

    const { data: publicData } = storage.getPublicUrl(path);

    const { error: saveError } = await admin
      .from("arcade_game_backgrounds")
      .upsert(
        {
          game_id: gameId,
          image_url: publicData.publicUrl,
          storage_path: path,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "game_id" }
      );

    if (saveError) {
      await storage.remove([path]);
      return fail(saveError.message || "Arka plan kaydedilemedi.", 500);
    }

    if (old?.storage_path && old.storage_path !== path) {
      await storage.remove([old.storage_path]);
    }

    return NextResponse.json({
      ok: true,
      gameId,
      imageUrl: publicData.publicUrl,
    });
  } catch (error) {
    console.error("ARCADE BACKGROUND ERROR:", error);
    return fail("Beklenmeyen bir sunucu hatası oluştu.", 500);
  }
}
