export type TeamRadioRecord = {
  id: string;
  title: string;
  driver_name: string;
  grand_prix: string;
  team_name: string | null;
  season: number | null;
  audio_path: string | null;
  audio_url: string;
  source_type: "openf1" | "upload";
  recording_url: string | null;
  session_key: number | null;
  driver_number: number | null;
  recorded_at: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
};

export type RadioMeeting = {
  meeting_key: number;
  meeting_name: string;
  country_name: string;
  year: number;
  date_start: string;
};
export type RadioSession = {
  session_key: number;
  session_name: string;
  session_type: string;
  meeting_key: number;
  date_start: string;
};
export type RadioDriver = {
  driver_number: number;
  full_name: string;
  team_name: string;
  name_acronym: string;
};
export type OpenF1Radio = {
  date: string;
  driver_number: number;
  session_key: number;
  meeting_key: number;
  recording_url: string;
};

// G6.16'dan kalan eski yüklemelerin okunabilmesi için korunur.
export const TEAM_RADIO_BUCKET = "team-radio-audio";

// Uzaktan açılan kayıtlar yalnızca OpenF1'in bildirdiği resmî ses alanından kabul edilir.
export function isAllowedRadioRecordingUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "livetiming.formula1.com" &&
      url.port === "" && url.username === "" && url.password === "" &&
      url.pathname.startsWith("/static/") &&
      /\.mp3$/i.test(url.pathname) &&
      url.search === "" && url.hash === "";
  } catch {
    return false;
  }
}
