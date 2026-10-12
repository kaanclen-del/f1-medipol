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

const VALID_TIRES = [
  "soft",
  "medium",
  "hard",
];

async function getContext(
  lobbyId: string,
  userId: string
) {
  const admin =
    createAdminClient();

  const {
    data: lobby,
    error: lobbyError,
  } = await admin
    .from("manager_lobbies")
    .select(`
      id,
      name,
      status
    `)
    .eq("id", lobbyId)
    .maybeSingle();

  if (
    lobbyError ||
    !lobby
  ) {
    return {
      error:
        "Lobi bulunamadı.",
      status: 404,
    } as const;
  }

  if (
    lobby.status !==
    "active"
  ) {
    return {
      error:
        "Manager sezonu aktif değil.",
      status: 400,
    } as const;
  }

  const {
    data: membership,
    error: memberError,
  } = await admin
    .from(
      "manager_lobby_members"
    )
    .select(`
      id,
      user_id,
      status,
      team_key
    `)
    .eq(
      "lobby_id",
      lobbyId
    )
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();

  if (
    memberError ||
    !membership ||
    membership.status !==
      "active"
  ) {
    return {
      error:
        "Bu Manager sezonunun üyesi değilsin.",
      status: 403,
    } as const;
  }

  const {
    data: season,
    error: seasonError,
  } = await admin
    .from("manager_seasons")
    .select(`
      id,
      lobby_id,
      season_number,
      current_round,
      status
    `)
    .eq(
      "lobby_id",
      lobbyId
    )
    .maybeSingle();

  if (
    seasonError ||
    !season
  ) {
    return {
      error:
        "Sezon bilgisi bulunamadı.",
      status: 404,
    } as const;
  }

  const {
    data: race,
    error: raceError,
  } = await admin
    .from("manager_races")
    .select(`
      id,
      lobby_id,
      round,
      name,
      country,
      status
    `)
    .eq(
      "lobby_id",
      lobbyId
    )
    .eq(
      "round",
      season.current_round
    )
    .maybeSingle();

  if (
    raceError
  ) {
    return {
      error:
        "Sıradaki yarış alınamadı.",
      status: 500,
    } as const;
  }

  if (!race) {
    return {
      error:
        "Takvimde oynanacak yarış kalmadı.",
      status: 400,
    } as const;
  }

  return {
    admin,
    lobby,
    membership,
    season,
    race,
  };
}

export async function GET(
  _request: Request,
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

    const result =
      await getContext(
        lobbyId,
        user.id
      );

    if (
      "error" in result
    ) {
      return NextResponse.json(
        {
          error:
            result.error,
        },
        {
          status:
            result.status,
        }
      );
    }

    const {
      data: savedStrategy,
      error: strategyError,
    } = await result.admin
      .from(
        "manager_race_strategies"
      )
      .select(`
        id,
        lobby_id,
        user_id,
        round,
        starting_tire,
        second_tire,
        pit_lap,
        aggression,
        created_at,
        updated_at
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
        "round",
        result.season
          .current_round
      )
      .maybeSingle();

    if (strategyError) {
      console.error(
        "STRATEGY GET ERROR:",
        strategyError
      );

      return NextResponse.json(
        {
          error:
            "Strateji bilgisi alınamadı.",
        },
        {
          status: 500,
        }
      );
    }

    const strategy =
      savedStrategy ?? {
        id: null,

        lobby_id:
          lobbyId,

        user_id:
          user.id,

        round:
          result.season
            .current_round,

        starting_tire:
          "medium",

        second_tire:
          "hard",

        pit_lap:
          20,

        aggression:
          50,

        created_at:
          null,

        updated_at:
          null,
      };

    return NextResponse.json({
      ok: true,

      lobby:
        result.lobby,

      season:
        result.season,

      race:
        result.race,

      strategy,

      saved:
        !!savedStrategy,
    });
  } catch (error) {
    console.error(
      "STRATEGY GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
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

    const body =
      await request.json();

    const startingTire =
      typeof body?.startingTire ===
      "string"
        ? body.startingTire
        : "";

    const secondTire =
      typeof body?.secondTire ===
      "string"
        ? body.secondTire
        : "";

    const pitLap =
      Number(
        body?.pitLap
      );

    const aggression =
      Number(
        body?.aggression
      );

    if (
      !VALID_TIRES.includes(
        startingTire
      ) ||
      !VALID_TIRES.includes(
        secondTire
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Geçerli lastik seçimi yapmalısın.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(
        pitLap
      ) ||
      pitLap < 1 ||
      pitLap > 70
    ) {
      return NextResponse.json(
        {
          error:
            "Pit turu 1 ile 70 arasında olmalı.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(
        aggression
      ) ||
      aggression < 0 ||
      aggression > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Agresiflik 0 ile 100 arasında olmalı.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await getContext(
        lobbyId,
        user.id
      );

    if (
      "error" in result
    ) {
      return NextResponse.json(
        {
          error:
            result.error,
        },
        {
          status:
            result.status,
        }
      );
    }

    if (
      result.race.status ===
      "finished"
    ) {
      return NextResponse.json(
        {
          error:
            "Tamamlanan yarışın stratejisi değiştirilemez.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: savedStrategy,
      error: saveError,
    } = await result.admin
      .from(
        "manager_race_strategies"
      )
      .upsert(
        {
          lobby_id:
            lobbyId,

          user_id:
            user.id,

          round:
            result.season
              .current_round,

          starting_tire:
            startingTire,

          second_tire:
            secondTire,

          pit_lap:
            pitLap,

          aggression,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "lobby_id,user_id,round",
        }
      )
      .select(`
        id,
        lobby_id,
        user_id,
        round,
        starting_tire,
        second_tire,
        pit_lap,
        aggression,
        created_at,
        updated_at
      `)
      .single();

    if (
      saveError ||
      !savedStrategy
    ) {
      console.error(
        "STRATEGY SAVE ERROR:",
        saveError
      );

      return NextResponse.json(
        {
          error:
            saveError?.message ||
            "Yarış stratejisi kaydedilemedi.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      ok: true,

      strategy:
        savedStrategy,

      message:
        "Yarış stratejin kaydedildi.",
    });
  } catch (error) {
    console.error(
      "STRATEGY SAVE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}