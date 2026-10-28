import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("arcade_game_backgrounds")
      .select("game_id,image_url");

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Oyun arka planları okunamadı." },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { ok: true, backgrounds: data ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
