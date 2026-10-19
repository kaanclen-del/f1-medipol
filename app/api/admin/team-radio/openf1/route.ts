import { NextResponse } from "next/server";
import { getTeamRadioAdmin } from "@/lib/team-radio-admin";
import { getOpenF1Data, OpenF1RateLimitError } from "@/lib/openf1-team-radio";
import { isAllowedRadioRecordingUrl } from "@/lib/team-radio-types";
import type { OpenF1Radio, RadioDriver, RadioMeeting, RadioSession } from "@/lib/team-radio-types";

export const dynamic = "force-dynamic";

function numberField(value: string | null, min: number, max: number) {
  if (!value || !/^\d+$/.test(value)) return null;
  const result = Number(value);
  return Number.isSafeInteger(result) && result >= min && result <= max ? result : null;
}

export async function GET(request: Request) {
  try {
    const auth = await getTeamRadioAdmin();
    if ("error" in auth) return auth.error;
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource");
    let items: RadioMeeting[] | RadioSession[] | RadioDriver[] | OpenF1Radio[];

    if (resource === "meetings") {
      const year = numberField(url.searchParams.get("year"), 2023, 2030);
      if (year === null) return NextResponse.json({ error: "2023 sonrası bir yıl seç." }, { status: 400 });
      items = (await getOpenF1Data<RadioMeeting>("meetings", { year }))
        .filter((item) => typeof item.meeting_key === "number" && typeof item.meeting_name === "string")
        .sort((a, b) => b.date_start.localeCompare(a.date_start));
    } else if (resource === "sessions") {
      const meetingKey = numberField(url.searchParams.get("meetingKey"), 1, 999999);
      if (meetingKey === null) return NextResponse.json({ error: "Grand Prix seç." }, { status: 400 });
      items = (await getOpenF1Data<RadioSession>("sessions", { meeting_key: meetingKey }))
        .filter((item) => typeof item.session_key === "number")
        .sort((a, b) => b.date_start.localeCompare(a.date_start));
    } else if (resource === "drivers") {
      const sessionKey = numberField(url.searchParams.get("sessionKey"), 1, 999999);
      if (sessionKey === null) return NextResponse.json({ error: "Seans seç." }, { status: 400 });
      items = (await getOpenF1Data<RadioDriver>("drivers", { session_key: sessionKey }))
        .filter((item) => typeof item.driver_number === "number" && typeof item.full_name === "string")
        .sort((a, b) => a.full_name.localeCompare(b.full_name));
    } else if (resource === "recordings") {
      const sessionKey = numberField(url.searchParams.get("sessionKey"), 1, 999999);
      const driverNumber = numberField(url.searchParams.get("driverNumber"), 1, 199);
      if (sessionKey === null || driverNumber === null) return NextResponse.json({ error: "Seans ve pilot seç." }, { status: 400 });
      items = (await getOpenF1Data<OpenF1Radio>("team_radio", { session_key: sessionKey, driver_number: driverNumber }))
        .filter((item) => isAllowedRadioRecordingUrl(item.recording_url) && item.session_key === sessionKey && item.driver_number === driverNumber)
        .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 250);
    } else {
      return NextResponse.json({ error: "Bilinmeyen arşiv sorgusu." }, { status: 400 });
    }
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof OpenF1RateLimitError) {
      return NextResponse.json({ error: error.message, retryAfter: error.retryAfter }, {
        status: 429,
        headers: { "Retry-After": String(error.retryAfter), "Cache-Control": "no-store" },
      });
    }
    console.error("TEAM RADIO OPENF1 SEARCH:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "OpenF1 arşiv sorgusu başarısız." }, { status: 502 });
  }
}
