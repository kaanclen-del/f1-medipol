import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("profile_wallpaper_options")
      .select("id,name,description,image_url,color_a,color_b,accent,motion,is_published,sort_order")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ wallpapers: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Koleksiyon yüklenemedi." }, { status: 503 });
  }
}
