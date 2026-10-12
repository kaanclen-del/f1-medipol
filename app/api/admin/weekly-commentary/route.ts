import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

type EditorialInput = {
  id?: unknown;
  weekLabel?: unknown;
  title?: unknown;
  summary?: unknown;
  content?: unknown;
  imageUrl?: unknown;
  imagePath?: unknown;
  isPublished?: unknown;
};

async function authorize() {
  const client = await createClient();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return { error: NextResponse.json({ error: "Giriş gerekli." }, { status: 401 }) };
  const { data: profile, error: profileError } = await client.from("profiles")
    .select("is_admin").eq("id", user.id).maybeSingle();
  if (profileError || !profile?.is_admin) return { error: NextResponse.json({ error: "Yönetici yetkisi gerekli." }, { status: 403 }) };
  return { admin: createAdminClient() };
}

function parsePayload(input: EditorialInput) {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";
  const weekLabel = typeof input.weekLabel === "string" ? input.weekLabel.trim() : "";
  const imageUrl = typeof input.imageUrl === "string" ? input.imageUrl.trim() : "";
  const imagePath = typeof input.imagePath === "string" ? input.imagePath.trim() : "";
  const isPublished = input.isPublished === true;

  if (!title || title.length > 180) throw new Error("Başlık 1–180 karakter olmalı.");
  if (!content || content.length > 20000) throw new Error("Yorum metni 1–20.000 karakter olmalı.");
  if (summary.length > 400) throw new Error("Kısa özet en fazla 400 karakter olabilir.");
  if (weekLabel.length > 120) throw new Error("Hafta etiketi en fazla 120 karakter olabilir.");
  // Dış bağlantılardan görsel kabul etmiyoruz. Görseli bizim yükleme API'miz üretmeli.
  if (imageUrl && (!imageUrl.startsWith("https://") || !imageUrl.includes("/storage/v1/object/public/gallery-images/weekly-commentaries/"))) {
    throw new Error("Görseli Haftalık Yorum panelinden yüklemelisin.");
  }
  return {
    week_label: weekLabel, title, summary, content,
    image_url: imageUrl || null, image_path: imagePath || null,
    is_published: isPublished,
  };
}

async function payloadFromRequest(request: Request) {
  const body: unknown = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Geçersiz form verisi.");
  return body as EditorialInput;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  try {
    const auth = await authorize();
    if ("error" in auth) return auth.error;
    const { data, error } = await auth.admin.from("weekly_commentaries")
      .select("id,week_label,title,summary,content,image_url,image_path,is_published,published_at,created_at,updated_at")
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ ok: true, articles: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("WEEKLY GET:", error);
    return NextResponse.json({ error: "Yorumlar alınamadı. SQL tablosunu kontrol et." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorize();
    if ("error" in auth) return auth.error;
    let body: EditorialInput;
    let payload: ReturnType<typeof parsePayload>;
    try { body = await payloadFromRequest(request); payload = parsePayload(body); }
    catch (error) { return badRequest(error instanceof Error ? error.message : "Geçersiz veri."); }
    const { data, error } = await auth.admin.from("weekly_commentaries")
      .insert({ ...payload, published_at: payload.is_published ? new Date().toISOString() : null })
      .select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, article: data }, { status: 201 });
  } catch (error) {
    console.error("WEEKLY POST:", error);
    return NextResponse.json({ error: "Yorum kaydedilemedi." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authorize();
    if ("error" in auth) return auth.error;
    let body: EditorialInput;
    let payload: ReturnType<typeof parsePayload>;
    try { body = await payloadFromRequest(request); payload = parsePayload(body); }
    catch (error) { return badRequest(error instanceof Error ? error.message : "Geçersiz veri."); }
    const id = typeof body.id === "string" ? body.id : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return badRequest("Yorum kimliği geçersiz.");
    const { data: existing, error: existingError } = await auth.admin.from("weekly_commentaries")
      .select("is_published,published_at").eq("id", id).maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return NextResponse.json({ error: "Yorum bulunamadı." }, { status: 404 });
    const publishedAt = payload.is_published
      ? (existing.is_published ? existing.published_at ?? new Date().toISOString() : new Date().toISOString())
      : null;
    const { data, error } = await auth.admin.from("weekly_commentaries")
      .update({ ...payload, published_at: publishedAt, updated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, article: data });
  } catch (error) {
    console.error("WEEKLY PATCH:", error);
    return NextResponse.json({ error: "Yorum güncellenemedi." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authorize();
    if ("error" in auth) return auth.error;
    const body = await payloadFromRequest(request);
    const id = typeof body.id === "string" ? body.id : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return badRequest("Yorum kimliği geçersiz.");
    const { error } = await auth.admin.from("weekly_commentaries").delete().eq("id", id);
    if (error) throw error;
    // Yüklenen dosyaları otomatik silmiyoruz: eski bağlantıları kırmamak için.
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WEEKLY DELETE:", error);
    return NextResponse.json({ error: "Yorum silinemedi." }, { status: 500 });
  }
}
