import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { TEAM_RADIO_BUCKET, isAllowedRadioRecordingUrl } from "@/lib/team-radio-types";

export const dynamic = "force-dynamic";

// Ana sayfa, OpenF1'i asla kendiliğinden taramaz. Yalnızca yöneticinin
// seçip yayımladığı kayıtların bağlantıları sunulur; dosya kopyalanmaz.
export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("team_radio_clips")
      .select("id,title,driver_name,grand_prix,team_name,season,audio_path,recording_url,source_type,session_key,driver_number,recorded_at,created_at,sort_order")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const clips = (data || []).map((row) => {
      const audioUrl = row.source_type === "openf1"
        ? (isAllowedRadioRecordingUrl(row.recording_url) ? row.recording_url : "")
        : (row.audio_path ? admin.storage.from(TEAM_RADIO_BUCKET).getPublicUrl(row.audio_path).data.publicUrl : "");
      return { ...row, audio_url: audioUrl };
    }).filter((row) => row.audio_url);
    return NextResponse.json({ clips }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("TEAM RADIO GET:", error);
    return NextResponse.json({ error: "Telsiz listesi yüklenemedi. SQL güncellemesini kontrol et." }, { status: 500 });
  }
}
