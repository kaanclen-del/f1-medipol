import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function getTeamRadioAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 }) };
  const { data: profile, error } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (error || !profile?.is_admin) {
    return { error: NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekli." }, { status: 403 }) };
  }
  return { admin: createAdminClient() };
}
