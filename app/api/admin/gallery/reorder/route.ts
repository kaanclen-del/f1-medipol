import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekiyor." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admin yetkisi gerekiyor." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }); }
  const ids = (body as { ids?: unknown })?.ids;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 500 || ids.some((x) => typeof x !== "string") || new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: "Geçersiz sıralama." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: existing, error: fetchError } = await admin.from("gallery_images").select("id");
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (existing?.length !== ids.length || ids.some((id) => !existing.some((row) => row.id === id))) {
    return NextResponse.json({ error: "Görsel listesi değişmiş. Sayfayı yenile." }, { status: 409 });
  }
  // Normalize every row using unique negative interim positions, then commit desired ordering.
  // This avoids duplicate sort_order positions even where gallery has historical gaps.
  for (let i = 0; i < ids.length; i++) {
    const { error } = await admin.from("gallery_images").update({ sort_order: -i - 1 }).eq("id", ids[i]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  for (let i = 0; i < ids.length; i++) {
    const { error } = await admin.from("gallery_images").update({ sort_order: i + 1 }).eq("id", ids[i]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
