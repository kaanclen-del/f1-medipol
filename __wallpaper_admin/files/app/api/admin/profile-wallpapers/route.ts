import { NextResponse } from "next/server";
import { wallpaperAdminSession } from "@/lib/wallpaper-admin-auth";
import { WALLPAPER_MOTIONS, hexColor } from "@/lib/profile-wallpaper-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const TABLE = "profile_wallpaper_options";
const BUCKET = "profile-wallpapers";
const mimeExtensions: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
};

function fail(error: unknown, status = 500) {
  const msg = error instanceof Error ? error.message : (error && typeof error === "object" && "message" in error ? String(error.message) : String(error));
  return NextResponse.json({ error: msg }, { status });
}

export async function GET() {
  try {
    const { admin, rejection } = await wallpaperAdminSession();
    if (rejection) return rejection;
    if (!admin) return fail("Yönetici yetkisi doğrulanamadı.", 403);
    const { data, error } = await admin.from(TABLE).select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ wallpapers: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const { admin, rejection } = await wallpaperAdminSession();
    if (rejection) return rejection;
    if (!admin) return fail("Yönetici yetkisi doğrulanamadı.", 403);
    const body = await request.formData();
    const name = String(body.get("name") ?? "").trim();
    const description = String(body.get("description") ?? "").trim();
    const color_a = hexColor(body.get("color_a"), "#080e20");
    const color_b = hexColor(body.get("color_b"), "#45152d");
    const accent = hexColor(body.get("accent"), "#fa3449");
    const motion = String(body.get("motion") ?? "drift");
    const is_published = body.get("is_published") === "true";
    const upload = body.get("image");

    if (name.length < 2 || name.length > 60) return fail("Arka plan adı 2-60 karakter olmalı.", 400);
    if (description.length > 240) return fail("Açıklama en fazla 240 karakter olabilir.", 400);
    if (!WALLPAPER_MOTIONS.some((m) => m === motion)) return fail("Geçersiz animasyon türü.", 400);

    let image_url: string | null = null;
    let image_path: string | null = null;
    if (upload instanceof File && upload.size > 0) {
      if (!mimeExtensions[upload.type]) return fail("Yalnızca JPG, PNG ve WEBP görsel yüklenebilir.", 400);
      if (upload.size > 6 * 1024 * 1024) return fail("Görsel en fazla 6 MB olabilir.", 400);
      image_path = `${crypto.randomUUID()}.${mimeExtensions[upload.type]}`;
      const { error: uploadError } = await admin.storage.from(BUCKET)
        .upload(image_path, new Uint8Array(await upload.arrayBuffer()), {
          contentType: upload.type, upsert: false, cacheControl: "3600",
        });
      if (uploadError) throw uploadError;
      image_url = admin.storage.from(BUCKET).getPublicUrl(image_path).data.publicUrl;
    }
    const id = `custom-${crypto.randomUUID()}`;
    const { data, error } = await admin.from(TABLE).insert({
      id, name, description, color_a, color_b, accent, motion,
      image_url, image_path, is_published,
    }).select("*").single();
    if (error) {
      if (image_path) await admin.storage.from(BUCKET).remove([image_path]);
      throw error;
    }
    return NextResponse.json({ wallpaper: data }, { status: 201 });
  } catch (error) { return fail(error); }
}

export async function PATCH(request: Request) {
  try {
    const { admin, rejection } = await wallpaperAdminSession();
    if (rejection) return rejection;
    if (!admin) return fail("Yönetici yetkisi doğrulanamadı.", 403);
    const body = await request.json();
    const id = body?.id;
    if (typeof id !== "string" || !/^custom-[a-f0-9-]{36}$/.test(id) || typeof body?.is_published !== "boolean") {
      return fail("Geçersiz yayın durumu isteği.", 400);
    }
    const { data, error } = await admin.from(TABLE)
      .update({ is_published: body.is_published })
      .eq("id", id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ wallpaper: data });
  } catch (error) { return fail(error); }
}

export async function DELETE(request: Request) {
  try {
    const { admin, rejection } = await wallpaperAdminSession();
    if (rejection) return rejection;
    if (!admin) return fail("Yönetici yetkisi doğrulanamadı.", 403);
    const body = await request.json();
    const id = body?.id;
    if (typeof id !== "string" || !/^custom-[a-f0-9-]{36}$/.test(id)) return fail("Geçersiz arka plan.", 400);
    const { data: old, error: lookupError } = await admin.from(TABLE)
      .select("image_path").eq("id", id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!old) return fail("Arka plan bulunamadı.", 404);
    const { error } = await admin.from(TABLE).delete().eq("id", id);
    if (error) throw error;
    if (old.image_path) {
      // Deletion is best-effort after the DB record is deleted.
      const { error: storageError } = await admin.storage.from(BUCKET).remove([old.image_path]);
      if (storageError) console.error("Wallpaper storage cleanup failed:", storageError);
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return fail(error); }
}
