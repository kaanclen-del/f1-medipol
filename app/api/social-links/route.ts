import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("site_social_links")
      .select("id,label,url,icon,sort_order")
      .eq("is_visible", true)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      console.error("SOCIAL LINKS GET:", error.message);
      return NextResponse.json({ links: [] }, { status: 200 });
    }

    return NextResponse.json(
      { links: data ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("SOCIAL LINKS GET:", error);
    return NextResponse.json({ links: [] }, { status: 200 });
  }
}
