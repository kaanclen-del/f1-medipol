import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

function parseRace(rawSeason: string | null, rawRound: string | null) {
  const season = Number(rawSeason);
  const round = Number(rawRound);
  const current = new Date().getUTCFullYear();
  if (
    !rawSeason || !rawRound ||
    !Number.isInteger(season) || !Number.isInteger(round) ||
    season < 2020 || season > current + 1 ||
    round < 0 || round > 30
  ) return null;
  return { season, round };
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Sohbeti görmek için giriş yapmalısın." }, 401);

  const params = new URL(request.url).searchParams;
  const race = parseRace(params.get("season"), params.get("round"));
  if (!race) return json({ error: "Geçersiz yarış." }, 400);

  const { data, error } = await supabase
    .from("race_chat_messages")
    .select("id,user_id,author_name,content,created_at")
    .eq("season", race.season)
    .eq("round", race.round)
    .order("created_at", { ascending: false })
    .limit(70);

  if (error) {
    console.error("RACE CHAT GET:", error);
    return json({ error: "Sohbet yüklenemedi. SQL kurulumunu kontrol et." }, 500);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return json({ messages: (data ?? []).reverse(), myUserId: user.id, isAdmin: Boolean(profile?.is_admin) });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Mesaj göndermek için giriş yapmalısın." }, 401);

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "Geçersiz istek." }, 400); }
  if (!body || typeof body !== "object") return json({ error: "Geçersiz istek." }, 400);
  const input = body as Record<string, unknown>;
  const race = parseRace(String(input.season ?? ""), String(input.round ?? ""));
  const content = typeof input.content === "string" ? input.content.trim() : "";
  if (!race) return json({ error: "Geçersiz yarış." }, 400);
  if (content.length < 1 || content.length > 400) return json({ error: "Mesaj 1-400 karakter olmalı." }, 400);

  const { data, error } = await supabase
    .from("race_chat_messages")
    .insert({ user_id: user.id, season: race.season, round: race.round, content })
    .select("id,user_id,author_name,content,created_at")
    .single();

  if (error) {
    const throttled = /4 saniye|4 seconds/i.test(error.message);
    return json({ error: throttled ? "Yeni mesaj için 4 saniye beklemelisin." : "Mesaj gönderilemedi. Lütfen tekrar dene." }, throttled ? 429 : 500);
  }
  return json({ message: data }, 201);
}
