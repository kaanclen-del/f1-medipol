import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "Geçersiz kaynak." }, { status: 403 });
  if (!(request.headers.get("content-type") || "").startsWith("application/json")) return NextResponse.json({ error: "JSON bekleniyor." }, { status: 415 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const { data: profile, error: roleError } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (roleError || !profile?.is_admin) return NextResponse.json({ error: "Yönetici yetkisi gerekli." }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof (body as {text?: unknown}).text !== "string") return NextResponse.json({ error: "Geçersiz duyuru." }, { status: 400 });
  const text = (body as {text: string}).text.trim();
  if (text.length > 240) return NextResponse.json({ error: "En fazla 240 karakter." }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin.from("site_race_ticker").upsert({ id: 1, message: text, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) {
    console.error("RACE TICKER UPDATE:", error.message);
    return NextResponse.json({ error: "Kaydedilemedi. Supabase SQL tablosunu kontrol et." }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
