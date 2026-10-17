import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";

export async function wallpaperAdminSession() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { admin: null, rejection: NextResponse.json({ error: "Oturum açmalısın." }, { status: 401 }) };
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile?.is_admin) {
    return { admin: null, rejection: NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekiyor." }, { status: 403 }) };
  }
  return { admin: createAdminClient(), rejection: null };
}
