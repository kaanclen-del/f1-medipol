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
    data: member,
    error: memberError,
  } = await admin
    .from(
      "manager_lobby_members"
    )
    .select(`
      id,
      user_id,
      status,
      team_key,
      driver_key
    `)
    .eq(
      "lobby_id",
      lobbyId
    )
    .eq(
      "user_id",
      userId
    )
    .eq(
      "status",
      "active"
    )
    .maybeSingle();

  if (
    memberError ||
    !member
  ) {
    return {
      error:
        "Bu lobinin aktif üyesi değilsin.",
      status: 403,
    };
  }

  const {
    data: season,
    error: seasonError,
  } = await admin
    .from(
      "manager_seasons"
    )
    .select(`
      id,
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
        "Manager sezonu bulunamadı.",
      status: 404,
    };
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

  if (raceError) {
    return {
      error:
        raceError.message,
      status: 500,
    };
  }

  return {
    admin,
    member,
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

    const ctx =
      await getContext(
        lobbyId,
        user.id
      );

    if ("error" in ctx) {
      return NextResponse.json(
        {
          error:
            ctx.error,
        },
        {
          status:
            ctx.status,
        }
      );
    }

    const {
      admin,
      season,
      race,
    } = ctx;

    const {
      data: strategy,
      error: strategyError,
    } = await admin
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
        season.current_round
      )
      .maybeSingle();

    if (strategyError) {
      return NextResponse.json(
        {
          error:
            strategyError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      ok: true,

      round:
        season.current_round,

      race,

      saved:
        !!strategy,

      strategy:
        strategy ?? {
          starting_tire:
            "medium",

          second_tire:
            "hard",

          pit_lap:
            20,

          aggression:
            50,
        },
    });
  } catch (error) {
    console.error(
      "INLINE STRATEGY GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Strateji yüklenemedi.",
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

    const ctx =
      await getContext(
        lobbyId,
        user.id
      );

    if ("error" in ctx) {
      return NextResponse.json(
        {
          error:
            ctx.error,
        },
        {
          status:
            ctx.status,
        }
      );
    }

    const {
      admin,
      season,
      race,
    } = ctx;

    if (
      season.status !==
      "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Sezon aktif değil.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      race?.status ===
      "finished"
    ) {
      return NextResponse.json(
        {
          error:
            "Bu yarış zaten tamamlandı.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      await request.json();

    const startingTire =
      String(
        body?.startingTire ??
          ""
      );

    const secondTire =
      String(
        body?.secondTire ??
          ""
      );

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
            "Geçersiz lastik seçimi.",
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

    const now =
      new Date().toISOString();

    const {
      data: saved,
      error: saveError,
    } = await admin
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
            season.current_round,

          starting_tire:
            startingTire,

          second_tire:
            secondTire,

          pit_lap:
            pitLap,

          aggression,

          updated_at:
            now,
        },
        {
          onConflict:
            "lobby_id,user_id,round",
        }
      )
      .select()
      .single();

    if (saveError) {
      return NextResponse.json(
        {
          error:
            saveError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      ok: true,

      saved: true,

      round:
        season.current_round,

      strategy:
        saved,
    });
  } catch (error) {
    console.error(
      "INLINE STRATEGY PATCH:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Strateji kaydedilemedi.",
      },
      {
        status: 500,
      }
    );
  }
}