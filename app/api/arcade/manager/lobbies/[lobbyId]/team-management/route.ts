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

type Department =
  | "aero"
  | "chassis"
  | "power"
  | "reliability";

const TEAM_DATA: Record<
  string,
  {
    name: string;
    rating: number;
  }
> = {
  mclaren: {
    name: "McLaren",
    rating: 88,
  },

  ferrari: {
    name: "Ferrari",
    rating: 87,
  },

  "red-bull": {
    name: "Red Bull Racing",
    rating: 86,
  },

  mercedes: {
    name: "Mercedes",
    rating: 85,
  },

  "aston-martin": {
    name: "Aston Martin",
    rating: 80,
  },

  alpine: {
    name: "Alpine",
    rating: 74,
  },

  williams: {
    name: "Williams",
    rating: 78,
  },

  haas: {
    name: "Haas",
    rating: 73,
  },

  "racing-bulls": {
    name: "Racing Bulls",
    rating: 75,
  },

  audi: {
    name: "Audi",
    rating: 77,
  },

  cadillac: {
    name: "Cadillac",
    rating: 72,
  },
};

const DEPARTMENT_COLUMNS: Record<
  Department,
  | "aero_level"
  | "chassis_level"
  | "power_level"
  | "reliability_level"
> = {
  aero: "aero_level",
  chassis: "chassis_level",
  power: "power_level",
  reliability: "reliability_level",
};

const DEPARTMENT_NAMES: Record<
  Department,
  string
> = {
  aero: "Aerodinamik",
  chassis: "Şasi",
  power: "Güç Ünitesi",
  reliability: "Dayanıklılık",
};

function getUpgradeCost(
  currentLevel: number
) {
  /*
    Level 1 -> 2 = €4M
    Level 2 -> 3 = €6M
    Level 3 -> 4 = €8M
    ...
  */
  return (
    4_000_000 +
    (currentLevel - 1) *
      2_000_000
  );
}

function getUpgradeData(
  state: any
) {
  return {
    aero: {
      level:
        state.aero_level,
      maxLevel: 10,
      cost:
        state.aero_level >= 10
          ? null
          : getUpgradeCost(
              state.aero_level
            ),
    },

    chassis: {
      level:
        state.chassis_level,
      maxLevel: 10,
      cost:
        state.chassis_level >= 10
          ? null
          : getUpgradeCost(
              state.chassis_level
            ),
    },

    power: {
      level:
        state.power_level,
      maxLevel: 10,
      cost:
        state.power_level >= 10
          ? null
          : getUpgradeCost(
              state.power_level
            ),
    },

    reliability: {
      level:
        state.reliability_level,
      maxLevel: 10,
      cost:
        state.reliability_level >= 10
          ? null
          : getUpgradeCost(
              state.reliability_level
            ),
    },
  };
}

async function getLobbyContext(
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
      created_by,
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
      error: "Lobi bulunamadı.",
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
      role,
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

  if (
    !membership.team_key
  ) {
    return {
      error:
        "Önce bir takım seçmelisin.",
      status: 400,
    } as const;
  }

  let {
    data: teamState,
    error: stateError,
  } = await admin
    .from(
      "manager_team_states"
    )
    .select(`
      id,
      lobby_id,
      user_id,
      team_key,
      budget,
      team_rating,
      season_points,
      wins,
      podiums,
      aero_level,
      chassis_level,
      power_level,
      reliability_level,
      total_spent,
      created_at,
      updated_at
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

  if (stateError) {
    return {
      error:
        "Takım bilgileri alınamadı.",
      status: 500,
    } as const;
  }

  /*
    Normalde dashboard bunu zaten oluşturuyor.
    Yine de sayfa doğrudan açılırsa burada da
    oluşturabiliyoruz.
  */
  if (!teamState) {
    const team =
      TEAM_DATA[
        membership.team_key
      ] ?? {
        name:
          membership.team_key,
        rating: 70,
      };

    const {
      data: createdState,
      error: createError,
    } = await admin
      .from(
        "manager_team_states"
      )
      .insert({
        lobby_id:
          lobbyId,

        user_id:
          userId,

        team_key:
          membership.team_key,

        budget:
          100_000_000,

        team_rating:
          team.rating,

        season_points:
          0,

        wins:
          0,

        podiums:
          0,

        aero_level:
          1,

        chassis_level:
          1,

        power_level:
          1,

        reliability_level:
          1,

        total_spent:
          0,
      })
      .select(`
        id,
        lobby_id,
        user_id,
        team_key,
        budget,
        team_rating,
        season_points,
        wins,
        podiums,
        aero_level,
        chassis_level,
        power_level,
        reliability_level,
        total_spent,
        created_at,
        updated_at
      `)
      .single();

    if (
      createError ||
      !createdState
    ) {
      return {
        error:
          createError?.message ||
          "Takım oluşturulamadı.",
        status: 500,
      } as const;
    }

    teamState =
      createdState;
  }

  return {
    lobby,
    membership,
    teamState,
    admin,
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
      await getLobbyContext(
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

    const teamName =
      TEAM_DATA[
        result.teamState
          .team_key
      ]?.name ??
      result.teamState
        .team_key;

    return NextResponse.json({
      ok: true,

      lobby:
        result.lobby,

      teamName,

      teamState:
        result.teamState,

      upgrades:
        getUpgradeData(
          result.teamState
        ),
    });
  } catch (error) {
    console.error(
      "TEAM MANAGEMENT GET ERROR:",
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

    const department =
      body?.department as
        | Department
        | undefined;

    if (
      !department ||
      ![
        "aero",
        "chassis",
        "power",
        "reliability",
      ].includes(
        department
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Geçerli bir geliştirme bölümü seçilmedi.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await getLobbyContext(
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
      teamState,
      admin,
    } = result;

    const column =
      DEPARTMENT_COLUMNS[
        department
      ];

    const currentLevel =
      Number(
        teamState[
          column
        ]
      );

    if (
      currentLevel >= 10
    ) {
      return NextResponse.json(
        {
          error:
            `${DEPARTMENT_NAMES[department]} zaten maksimum seviyede.`,
        },
        {
          status: 400,
        }
      );
    }

    const cost =
      getUpgradeCost(
        currentLevel
      );

    const currentBudget =
      Number(
        teamState.budget
      );

    if (
      currentBudget <
      cost
    ) {
      return NextResponse.json(
        {
          error:
            "Bu geliştirme için yeterli bütçen yok.",
        },
        {
          status: 400,
        }
      );
    }

    const newBudget =
      currentBudget -
      cost;

    const newLevel =
      currentLevel + 1;

    const newRating =
      Math.min(
        100,
        Number(
          teamState.team_rating
        ) + 1
      );

    const newSpent =
      Number(
        teamState.total_spent
      ) + cost;

    const updatePayload: Record<
      string,
      number | string
    > = {
      [column]:
        newLevel,

      budget:
        newBudget,

      team_rating:
        newRating,

      total_spent:
        newSpent,

      updated_at:
        new Date().toISOString(),
    };

    /*
      Aynı butona iki kez çok hızlı basılırsa
      iki harcama yapılmasını önlemek için
      mevcut seviye ve bütçeyi de koşula bağlıyoruz.
    */
    const {
      data: updatedState,
      error: updateError,
    } = await admin
      .from(
        "manager_team_states"
      )
      .update(
        updatePayload
      )
      .eq(
        "id",
        teamState.id
      )
      .eq(
        column,
        currentLevel
      )
      .eq(
        "budget",
        currentBudget
      )
      .select(`
        id,
        lobby_id,
        user_id,
        team_key,
        budget,
        team_rating,
        season_points,
        wins,
        podiums,
        aero_level,
        chassis_level,
        power_level,
        reliability_level,
        total_spent,
        created_at,
        updated_at
      `)
      .maybeSingle();

    if (updateError) {
      console.error(
        "TEAM UPGRADE ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            updateError.message ||
            "Geliştirme uygulanamadı.",
        },
        {
          status: 500,
        }
      );
    }

    if (!updatedState) {
      return NextResponse.json(
        {
          error:
            "Takım verisi değişti. Sayfayı yenileyip tekrar dene.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json({
      ok: true,

      message:
        `${DEPARTMENT_NAMES[department]} Seviye ${newLevel} oldu.`,

      teamState:
        updatedState,

      upgrades:
        getUpgradeData(
          updatedState
        ),
    });
  } catch (error) {
    console.error(
      "TEAM UPGRADE ERROR:",
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