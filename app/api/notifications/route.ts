import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

async function authorized() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, userId: user.id };
}

export async function GET() {
  const context = await authorized();
  if (!context) return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  const { data, error } = await context.supabase.from("site_notifications")
    .select("id,title,body,kind,target_url,created_at,read_at")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    console.error("NOTIFICATION INBOX GET:", error.code);
    return NextResponse.json({ error: "Bildirim tablosuna erişilemedi." }, { status: 503 });
  }
  return NextResponse.json({ notifications: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const context = await authorized();
  if (!context) return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  const payload: unknown = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  const body = payload as Record<string, unknown>;
  if (body.all !== true && (typeof body.id !== "string" || !/^[0-9a-fA-F-]{36}$/.test(body.id))) {
    return NextResponse.json({ error: "Bildirim seçimi geçersiz." }, { status: 400 });
  }
  let query = context.supabase.from("site_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", context.userId)
    .is("read_at", null);
  if (body.all !== true) query = query.eq("id", body.id as string);
  const { error } = await query;
  if (error) {
    console.error("NOTIFICATION INBOX PATCH:", error.code);
    return NextResponse.json({ error: "Bildirim güncellenemedi." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
