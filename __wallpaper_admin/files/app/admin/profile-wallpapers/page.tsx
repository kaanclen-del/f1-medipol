import Link from "next/link";
import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/server";
import WallpaperAdminClient from "@/components/WallpaperAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminProfileWallpapersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <><Header /><main style={{padding:"70px 20px",textAlign:"center"}}><h1>Giriş yapmalısın</h1><Link href="/login">Girişe git →</Link></main></>;
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id",user.id).maybeSingle();
  if (!profile?.is_admin) return <><Header /><main style={{padding:"70px 20px",textAlign:"center"}}><h1>Yönetici yetkisi gerekiyor</h1><Link href="/">Ana sayfaya dön →</Link></main></>;
  return <><Header /><WallpaperAdminClient /></>;
}
