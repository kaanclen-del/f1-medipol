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

type UploadRequest = {
  action?: "sign" | "complete";
  raceKey?: string;
  fileType?: string;
  fileSize?: number;
  photoYear?: number | null;
  sortOrder?: number;
  path?: string;
};

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return fail("Giriş yapmanız gerekiyor.", 401);

    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("is_admin").eq("id", user.id).single();
    if (profileError || !profile?.is_admin) return fail("Admin yetkisi gerekiyor.", 403);

    const body = (await request.json().catch(() => null)) as UploadRequest | null;
    if (!body || (body.action !== "sign" && body.action !== "complete")) {
      return fail("Geçersiz yükleme isteği.");
    }

    const raceKey = typeof body.raceKey === "string" ? body.raceKey.trim().toLowerCase() : "";
    if (!raceKey || raceKey.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raceKey)) {
      return fail("Geçersiz yarış anahtarı.");
    }

    const fileType = body.fileType ?? "";
    const extension = TYPES[fileType];
    if (!extension) return fail("Yalnızca JPG, PNG, WebP ve AVIF desteklenir.");

    const fileSize = Number(body.fileSize);
    if (!Number.isInteger(fileSize) || fileSize < 1 || fileSize > MAX_BYTES) {
      return fail("Görsel boş olmamalı ve 10 MB sınırını aşmamalıdır.");
    }

    const year = body.photoYear === null || body.photoYear === undefined ? null : Number(body.photoYear);
    if (year !== null && (!Number.isInteger(year) || year < 1950 || year > 2100)) {
      return fail("Geçersiz fotoğraf yılı.");
    }

    const sortOrder = Number(body.sortOrder ?? 0);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) {
      return fail("Geçersiz sıralama değeri.");
    }

    const admin = createAdminClient();
    const storage = admin.storage.from(BUCKET);

    if (body.action === "sign") {
      const path = `race-heroes/${raceKey}/${crypto.randomUUID()}.${extension}`;
      // Dosyanın kendisi Vercel'e gelmez; tarayıcı Supabase'e doğrudan yükler.
      const { data, error } = await storage.createSignedUploadUrl(path, { upsert: false });
      if (error || !data?.token) {
        return fail(error?.message || "Yükleme bağlantısı hazırlanamadı.", 500);
      }
      return NextResponse.json({ ok: true, path, token: data.token });
    }

    const path = typeof body.path === "string" ? body.path : "";
    const expectedPrefix = `race-heroes/${raceKey}/`;
    const filename = path.startsWith(expectedPrefix) ? path.slice(expectedPrefix.length) : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|avif)$/.test(filename)
      || !filename.endsWith(`.${extension}`)) {
      return fail("Geçersiz yükleme yolu.");
    }

    // Başarılı browser yüklemesini kontrol etmeden veritabanına kaydetme.
    const { data: uploaded, error: fileError } = await storage.info(path);
    if (fileError || !uploaded) return fail("Görsel henüz yüklenmemiş. Tekrar deneyin.", 409);
    const actualSize = Number(uploaded.size);
    if (!Number.isFinite(actualSize) || actualSize !== fileSize || actualSize > MAX_BYTES) {
      return fail("Yüklenen dosyanın boyutu doğrulanamadı.", 400);
    }

    const { data: { publicUrl } } = storage.getPublicUrl(path);
    const { data: image, error: insertError } = await admin.from("race_hero_images")
      .insert({
        race_key: raceKey,
        image_url: publicUrl,
        storage_path: path,
        photo_year: year,
        sort_order: sortOrder,
        is_active: true,
      })
      .select().single();

    if (insertError || !image) {
      await storage.remove([path]);
      return fail(insertError?.message || "Görsel arşive eklenemedi.", 500);
    }
    return NextResponse.json({ ok: true, image });
  } catch (error) {
    console.error("RACE HERO DIRECT UPLOAD ERROR:", error);
    return fail(error instanceof Error ? error.message : "Beklenmeyen sunucu hatası.", 500);
  }
}
