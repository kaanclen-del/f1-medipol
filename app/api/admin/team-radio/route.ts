import { NextResponse } from "next/server";
import { getTeamRadioAdmin } from "@/lib/team-radio-admin";
import { TEAM_RADIO_BUCKET, isAllowedRadioRecordingUrl } from "@/lib/team-radio-types";
import type { OpenF1Radio, RadioDriver, RadioMeeting, RadioSession } from "@/lib/team-radio-types";
import { getOpenF1Data, OpenF1RateLimitError } from "@/lib/openf1-team-radio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await getTeamRadioAdmin();
    if ("error" in auth) return auth.error;
    const { data, error } = await auth.admin
      .from("team_radio_clips")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    const clips = (data || []).map((row) => ({
      ...row,
      audio_url: row.source_type === "openf1" && isAllowedRadioRecordingUrl(row.recording_url)
        ? row.recording_url
        : row.audio_path
          ? auth.admin.storage.from(TEAM_RADIO_BUCKET).getPublicUrl(row.audio_path).data.publicUrl
          : "",
    }));
    return NextResponse.json({ clips }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("TEAM RADIO ADMIN GET:", error);
    return NextResponse.json({ error: "Telsiz kayıtları yüklenemedi. SQL güncellemesini kontrol et." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getTeamRadioAdmin();
    if ("error" in auth) return auth.error;
    const body = await request.json();
    const sessionKey = Number(body.sessionKey);
    const driverNumber = Number(body.driverNumber);
    const recordingUrl = body.recordingUrl;
    const titleOverride = typeof body.title === "string" ? body.title.trim() : "";
    if (!Number.isSafeInteger(sessionKey) || sessionKey < 1 ||
        !Number.isSafeInteger(driverNumber) || driverNumber < 1 || driverNumber > 199 ||
        !isAllowedRadioRecordingUrl(recordingUrl) ||
        (titleOverride && (titleOverride.length < 2 || titleOverride.length > 120))) {
      return NextResponse.json({ error: "Seçilen OpenF1 kaydının bilgileri geçersiz." }, { status: 400 });
    }

    // Kayıt URL'si, tarayıcıdan gelen serbest metne güvenilmeden OpenF1'den tekrar doğrulanır.
    const [radios, sessions, drivers] = await Promise.all([
      getOpenF1Data<OpenF1Radio>("team_radio", { session_key: sessionKey, driver_number: driverNumber }),
      getOpenF1Data<RadioSession>("sessions", { session_key: sessionKey }),
      getOpenF1Data<RadioDriver>("drivers", { session_key: sessionKey, driver_number: driverNumber }),
    ]);
    const radio = radios.find((item) => item.recording_url === recordingUrl && item.session_key === sessionKey && item.driver_number === driverNumber);
    const session = sessions.find((item) => item.session_key === sessionKey);
    const driver = drivers.find((item) => item.driver_number === driverNumber);
    if (!radio || !session || !driver) return NextResponse.json({ error: "Bu kayıt OpenF1 arşivinde doğrulanamadı." }, { status: 400 });

    const meetings = await getOpenF1Data<RadioMeeting>("meetings", { meeting_key: session.meeting_key });
    const meeting = meetings.find((item) => item.meeting_key === session.meeting_key);
    if (!meeting) return NextResponse.json({ error: "Grand Prix bilgisi OpenF1 üzerinden alınamadı." }, { status: 400 });
    const clock = new Date(radio.date);
    if (!Number.isFinite(clock.valueOf())) {
      return NextResponse.json({ error: "Kayıt tarih bilgisi geçersiz." }, { status: 400 });
    }
    const clockText = Number.isFinite(clock.valueOf())
      ? clock.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
      : "";
    const title = titleOverride || `${driver.full_name} · ${session.session_name}${clockText ? ` (${clockText} UTC)` : ""}`;
    const { data, error } = await auth.admin.from("team_radio_clips").insert({
      title: title.slice(0, 120),
      driver_name: driver.full_name,
      grand_prix: meeting.meeting_name,
      team_name: driver.team_name || null,
      season: meeting.year,
      source_type: "openf1",
      recording_url: recordingUrl,
      session_key: sessionKey,
      driver_number: driverNumber,
      recorded_at: radio.date,
      audio_path: null,
      is_published: false, // Haklar doğrulanmadan otomatik yayımlama yapılmaz.
      sort_order: 0,
    }).select("id").single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Bu telsiz zaten arşive eklenmiş." }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    if (error instanceof OpenF1RateLimitError) {
      return NextResponse.json({ error: error.message, retryAfter: error.retryAfter }, {
        status: 429,
        headers: { "Retry-After": String(error.retryAfter), "Cache-Control": "no-store" },
      });
    }
    console.error("TEAM RADIO ADMIN OPENF1 CREATE:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Kayıt eklenemedi." }, { status: 500 });
  }
}
