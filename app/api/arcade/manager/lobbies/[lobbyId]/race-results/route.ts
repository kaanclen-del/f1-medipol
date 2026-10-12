import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    lobbyId: string;
  }>;
};

const TEAM_NAMES: Record<
  string,
  string
> = {
  mclaren: "McLaren",
  ferrari: "Ferrari",

  "red-bull":
    "Red Bull Racing",

  mercedes:
    "Mercedes",

  "aston-martin":
    "Aston Martin",

  alpine: "Alpine",
  williams: "Williams",

  haas:
    "Haas F1 Team",

  "racing-bulls":
    "Racing Bulls",

  audi: "Audi",
  cadillac: "Cadillac",
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { lobbyId } =
      await context.params;

    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Giriş yapmalısın.",
        },
        {
          status: 401,
        }
      );
    }

    const admin =
      createAdminClient();

    const {
      data: member,
    } = await admin
      .from(
        "manager_lobby_members"
      )
      .select(`
        id,
        user_id,
        status
      `)
      .eq(
        "lobby_id",
        lobbyId
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "status",
        "active"
      )
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        {
          error:
            "Bu lobinin aktif üyesi değilsin.",
        },
        {
          status: 403,
        }
      );
    }

    const url =
      new URL(request.url);

    let round =
      Number(
        url.searchParams.get(
          "round"
        )
      );

    if (
      !Number.isFinite(round) ||
      round < 1
    ) {
      const {
        data:
          latestResult,
      } = await admin
        .from(
          "manager_race_results"
        )
        .select("round")
        .eq(
          "lobby_id",
          lobbyId
        )
        .order(
          "round",
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle();

      round =
        latestResult?.round ??
        1;
    }

    const {
      data: race,
      error: raceError,
    } = await admin
      .from(
        "manager_races"
      )
      .select(`
        id,
        round,
        name,
        country,
        status,
        completed_at
      `)
      .eq(
        "lobby_id",
        lobbyId
      )
      .eq(
        "round",
        round
      )
      .maybeSingle();

    if (
      raceError ||
      !race
    ) {
      return NextResponse.json(
        {
          error:
            "Yarış bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      data: season,
    } = await admin
      .from(
        "manager_seasons"
      )
      .select(`
        season_number,
        current_round,
        status
      `)
      .eq(
        "lobby_id",
        lobbyId
      )
      .maybeSingle();

    const {
      data: results,
      error: resultsError,
    } = await admin
      .from(
        "manager_race_results"
      )
      .select(`
        id,
        lobby_id,
        round,
        user_id,
        is_bot,
        bot_key,
        bot_name,
        team_key,
        driver_key,
        position,
        points,
        finish_status,
        performance_score,
        team_rating,
        starting_tire,
        second_tire,
        pit_lap,
        aggression,
        incident_type,
        incident_key,
        incident_message,
        incident_lap,
        created_at
      `)
      .eq(
        "lobby_id",
        lobbyId
      )
      .eq(
        "round",
        round
      )
      .order(
        "position",
        {
          ascending: true,
        }
      );

    if (resultsError) {
      return NextResponse.json(
        {
          error:
            resultsError.message,
        },
        {
          status: 500,
        }
      );
    }

    const humanIds =
      (results ?? [])
        .filter(
          (result) =>
            !result.is_bot &&
            !!result.user_id
        )
        .map(
          (result) =>
            result.user_id
        );

    let profiles: {
      id: string;
      display_name:
        | string
        | null;
      username:
        | string
        | null;
      avatar_url:
        | string
        | null;
    }[] = [];

    if (
      humanIds.length > 0
    ) {
      const {
        data:
          profileRows,
      } = await admin
        .from("profiles")
        .select(`
          id,
          display_name,
          username,
          avatar_url
        `)
        .in(
          "id",
          humanIds
        );

      profiles =
        profileRows ?? [];
    }

    const {
      data: events,
      error: eventsError,
    } = await admin
      .from(
        "manager_race_events"
      )
      .select(`
        id,
        event_type,
        event_lap,
        duration_laps,
        message,
        meta,
        created_at
      `)
      .eq(
        "lobby_id",
        lobbyId
      )
      .eq(
        "round",
        round
      )
      .order(
        "event_lap",
        {
          ascending: true,
        }
      );

    if (eventsError) {
      return NextResponse.json(
        {
          error:
            eventsError.message,
        },
        {
          status: 500,
        }
      );
    }

    const mappedResults =
      (results ?? []).map(
        (result) => {
          const isBot =
            !!result.is_bot;

          /*
            live-race client'ı
            user_id değerini benzersiz
            kimlik olarak kullanıyor.

            Botlarda DB user_id NULL,
            client'a bot_key gönderiyoruz.
          */

          const participantId =
            isBot
              ? result.bot_key ??
                `bot-${result.id}`
              : result.user_id;

          const profile =
            isBot
              ? {
                  id:
                    participantId,

                  display_name:
                    result.bot_name ??
                    "AI Manager",

                  username: null,
                  avatar_url: null,
                }
              : profiles.find(
                  (profile) =>
                    profile.id ===
                    result.user_id
                ) ?? null;

          return {
            ...result,

            user_id:
              participantId,

            team_name:
              TEAM_NAMES[
                result.team_key
              ] ??
              result.team_key,

            profile,

            isMe:
              !isBot &&
              result.user_id ===
                user.id,
          };
        }
      );

    return NextResponse.json({
      ok: true,

      race,

      season,

      events:
        events ?? [],

      results:
        mappedResults,
    });
  } catch (error) {
    console.error(
      "RACE RESULTS GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Yarış sonuçları yüklenemedi.",
      },
      {
        status: 500,
      }
    );
  }
}