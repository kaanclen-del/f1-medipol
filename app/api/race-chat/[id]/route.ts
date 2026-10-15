import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Geçersiz mesaj." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });

  // Mesaj sahibinin kendi mesajini silmesi RLS ile korunur.
  const { data: own, error } = await supabase
    .from("race_chat_messages")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (error) return NextResponse.json({ error: "Silme işlemi başarısız." }, { status: 500 });
  if (own && own.length) return NextResponse.json({ ok: true });

  // Admin ekrandan tum mesajlari silebilir; admin yetkisi sunucuda dogrulanir.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: "Bu mesajı silemezsin." }, { status: 403 });

  const { error: adminError } = await admin
    .from("race_chat_messages")
    .delete()
    .eq("id", id);
  if (adminError) return NextResponse.json({ error: "Mesaj silinemedi." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
