import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_PARTICIPANTS = 10;
const MAX_ROWS = 10000;

type SelectionRow = {
  p1_driver_number: number | null;
  p2_driver_number: number | null;
  p3_driver_number: number | null;
  race_bulletin: Record<string, unknown> | null;
  special_picks: Record<string, unknown> | null;
};

function emptyStats() {
  return {
    ready: false,
    total: 0,
    podium: { P1: {} as Record<string, number>, P2: {} as Record<string, number>, P3: {} as Record<string, number> },
    bulletin: {} as Record<string, { yes: number; no: number; total: number }>,
    specials: {} as Record<string, { total: number; choices: Record<string, number> }>,
  };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const season = Number(params.get("season"));
  const round = Number(params.get("round"));
  const type = params.get("type") === "sprint" ? "sprint" : "race";

  if (!Number.isInteger(season) || season < 2020 || season > new Date().getUTCFullYear() + 1 ||
      !Number.isInteger(round) || round < 1 || round > 30) {
    return NextResponse.json({ error: "Geçersiz sezon veya yarış." }, { status: 400 });
  }

  try {
    const db = createAdminClient();
    const rows: SelectionRow[] = [];

    // Only aggregates are returned. Never return prediction records or user identifiers.
    for (let start = 0; start < MAX_ROWS; start += 1000) {
      const { data, error } = await db
        .from("predictions")
        .select("p1_driver_number,p2_driver_number,p3_driver_number,race_bulletin,special_picks")
        .eq("season", season)
        .eq("round", round)
        .eq("prediction_type", type)
        .order("user_id", { ascending: true })
        .range(start, start + 999);
      if (error) throw error;
      const batch = (data ?? []) as SelectionRow[];
      rows.push(...batch);
      if (batch.length < 1000) break;
    }

    const result = emptyStats();
    if (rows.length < MIN_PARTICIPANTS) {
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    }

    result.ready = true;
    result.total = rows.length;
    const yesNoKeys = ["redFlag", "safetyCar", "vsc", "dnf3", "lap1Incident", "rain", "poleWins", "lightsToFlag", "margin10", "fastestOnPodium", "leaders4", "lateNeutral"];
    const specialKeys = ["fastestLap", "firstDnf", "mostGained", "winningTeam"];

    for (const row of rows) {
      for (const slot of ["P1", "P2", "P3"] as const) {
        const key = String(row[`${slot.toLowerCase()}_driver_number` as keyof SelectionRow] ?? "");
        if (key && key !== "null") result.podium[slot][key] = (result.podium[slot][key] ?? 0) + 1;
      }
      if (type !== "race") continue;
      const answers = row.race_bulletin ?? {};
      for (const key of yesNoKeys) {
        const answer = answers[key];
        if (answer !== "yes" && answer !== "no") continue;
        const item = result.bulletin[key] ?? { yes: 0, no: 0, total: 0 };
        item[answer]++;
        item.total++;
        result.bulletin[key] = item;
      }
      const picks = row.special_picks ?? {};
      for (const key of specialKeys) {
        const answer = picks[key];
        if (answer === null || answer === undefined || answer === "") continue;
        const item = result.specials[key] ?? { total: 0, choices: {} as Record<string, number> };
        item.total++;
        item.choices[String(answer)] = (item.choices[String(answer)] ?? 0) + 1;
        result.specials[key] = item;
      }
    }

    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("PREDICTION COMMUNITY AGGREGATE:", error);
    return NextResponse.json({ error: "Topluluk oranları şu anda alınamıyor." }, { status: 503 });
  }
}
