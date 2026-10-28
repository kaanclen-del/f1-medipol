import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Giriş gerekli." }, { status: 401 }) };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile?.is_admin) {
    return { error: NextResponse.json({ error: "Yönetici yetkisi gerekli." }, { status: 403 }) };
  }

  return { admin: createAdminClient() };
}

function validUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 500) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const allowedIcons = ["instagram", "linkedin", "tiktok", "whatsapp", "link"];

export async function GET() {
  const auth = await getAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.admin
    .from("site_social_links")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Bağlantılar okunamadı. SQL kurulumunu kontrol et." }, { status: 500 });
  }

  return NextResponse.json({ links: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await getAdmin();
  if ("error" in auth) return auth.error;

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Geçersiz veri." }, { status: 400 });
  }

  const item = body as Record<string, unknown>;
  const label = typeof item.label === "string" ? item.label.trim() : "";
  const url = typeof item.url === "string" ? item.url.trim() : "";
  const icon = typeof item.icon === "string" ? item.icon : "link";
  const sortOrder = typeof item.sort_order === "number" && Number.isFinite(item.sort_order)
    ? Math.trunc(item.sort_order)
    : 0;
  const isVisible = typeof item.is_visible === "boolean" ? item.is_visible : true;

  if (!label || label.length > 40 || !validUrl(url) || !allowedIcons.includes(icon)) {
    return NextResponse.json({ error: "Etiket, geçerli URL veya ikon seçimi hatalı." }, { status: 400 });
  }

  const { data, error } = await auth.admin
    .from("site_social_links")
    .insert({ label, url, icon, sort_order: sortOrder, is_visible: isVisible })
    .select()
    .single();

  if (error) {
    console.error("SOCIAL LINKS POST:", error.message);
    return NextResponse.json({ error: "Bağlantı kaydedilemedi. SQL kurulumunu kontrol et." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, link: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await getAdmin();
  if ("error" in auth) return auth.error;

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Geçersiz veri." }, { status: 400 });
  }

  const item = body as Record<string, unknown>;
  const id = typeof item.id === "number" && Number.isInteger(item.id) ? item.id : 0;

  if (id <= 0) {
    return NextResponse.json({ error: "Geçerli bağlantı kimliği gerekli." }, { status: 400 });
  }

  const updates: Record<string, string | number | boolean> = {};

  if ("label" in item) {
    if (typeof item.label !== "string" || !item.label.trim() || item.label.trim().length > 40) {
      return NextResponse.json({ error: "Etiket 1–40 karakter olmalı." }, { status: 400 });
    }
    updates.label = item.label.trim();
  }

  if ("url" in item) {
    if (!validUrl(item.url)) {
      return NextResponse.json({ error: "Geçerli bir HTTP/HTTPS bağlantısı gerekli." }, { status: 400 });
    }
    updates.url = item.url.trim();
  }

  if ("icon" in item) {
    if (typeof item.icon !== "string" || !allowedIcons.includes(item.icon)) {
      return NextResponse.json({ error: "Geçersiz ikon." }, { status: 400 });
    }
    updates.icon = item.icon;
  }

  if ("sort_order" in item) {
    if (typeof item.sort_order !== "number" || !Number.isFinite(item.sort_order)) {
      return NextResponse.json({ error: "Sıralama sayısal olmalı." }, { status: 400 });
    }
    updates.sort_order = Math.trunc(item.sort_order);
  }

  if ("is_visible" in item) {
    if (typeof item.is_visible !== "boolean") {
      return NextResponse.json({ error: "Görünürlük değeri geçersiz." }, { status: 400 });
    }
    updates.is_visible = item.is_visible;
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await auth.admin
    .from("site_social_links")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Bağlantı güncellenemedi." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Bağlantı bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, link: data });
}

export async function DELETE(request: Request) {
  const auth = await getAdmin();
  if ("error" in auth) return auth.error;

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Geçersiz veri." }, { status: 400 });
  }

  const id = (body as Record<string, unknown>).id;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Geçerli bağlantı kimliği gerekli." }, { status: 400 });
  }

  const { error } = await auth.admin
    .from("site_social_links")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Bağlantı silinemedi." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
