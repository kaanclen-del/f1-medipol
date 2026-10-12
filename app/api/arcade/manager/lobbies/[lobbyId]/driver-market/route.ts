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

const TEAM_NAMES: Record<string, string> = {
  mclaren: "McLaren",
  ferrari: "Ferrari",
  "red-bull": "Red Bull Racing",
  mercedes: "Mercedes",
  "aston-martin": "Aston Martin",
  alpine: "Alpine",
  williams: "Williams",
  haas: "Haas F1 Team",
  "racing-bulls": "Racing Bulls",
  audi: "Audi",
  cadillac: "Cadillac",
};

async function ensureDriverStates(
  admin: ReturnType<typeof createAdminClient>,
  lobbyId: string,
  seasonNumber: number
) {
  const {
    data: catalog,
    error: catalogError,
  } = await admin
    .from("manager_driver_catalog")
    .select(`
      driver_key,
      driver_name,
      original_team_key,
      pace,
      consistency,
      wet,
      racecraft,
      potential,
      base_salary
    `);

  if (catalogError) {
    throw new Error(catalogError.message);
  }

  const {
    data: teamStates,
    error: teamStatesError,
  } = await admin
    .from("manager_team_states")
    .select(`
      id,
      lobby_id,
      team_key,
      driver_key
    `)
    .eq("lobby_id", lobbyId);

  if (teamStatesError) {
    throw new Error(teamStatesError.message);
  }

  const {
    data: existing,
    error: existingError,
  } = await admin
    .from("manager_driver_states")
    .select("driver_key")
    .eq("lobby_id", lobbyId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingKeys =
    new Set(
      (existing ?? []).map(
        (item) => item.driver_key
      )
    );

  const missing =
    (catalog ?? []).filter(
      (driver) =>
        !existingKeys.has(
          driver.driver_key
        )
    );

  if (missing.length === 0) {
    return;
  }

  const rows =
    missing.map((driver) => {
      const assignedTeam =
        (teamStates ?? []).find(
          (team) =>
            team.driver_key ===
            driver.driver_key
        );

      return {
        lobby_id: lobbyId,

        driver_key:
          driver.driver_key,

        driver_name:
          driver.driver_name,

        current_team_state_id:
          assignedTeam?.id ?? null,

        current_team_key:
          assignedTeam?.team_key ?? null,

        pace:
          driver.pace,

        consistency:
          driver.consistency,

        wet:
          driver.wet,

        racecraft:
          driver.racecraft,

        potential:
          driver.potential,

        annual_salary:
          driver.base_salary,

        contract_until_season:
          assignedTeam
            ? seasonNumber
            : null,

        last_developed_season:
          0,
      };
    });

  const {
    error: insertError,
  } = await admin
    .from("manager_driver_states")
    .insert(rows);

  if (insertError) {
    throw new Error(
      insertError.message
    );
  }
}

async function getBaseContext(
  lobbyId: string,
  userId: string
) {
  const admin =
    createAdminClient();

  const {
    data: member,
    error: memberError,
  } = await admin
    .from("manager_lobby_members")
    .select(`
      id,
      user_id,
      team_key,
      driver_key,
      status
    `)
    .eq("lobby_id", lobbyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (
    memberError ||
    !member
  ) {
    return {
      error:
        "Bu lobinin aktif üyesi değilsin.",
      status: 403,
    } as const;
  }

  const {
    data: season,
    error: seasonError,
  } = await admin
    .from("manager_seasons")
    .select(`
      season_number,
      current_round,
      status
    `)
    .eq("lobby_id", lobbyId)
    .maybeSingle();

  if (
    seasonError ||
    !season
  ) {
    return {
      error:
        "Manager sezonu bulunamadı.",
      status: 404,
    } as const;
  }

  const {
    data: ownTeam,
    error: ownTeamError,
  } = await admin
    .from("manager_team_states")
    .select(`
      id,
      user_id,
      team_key,
      driver_key,
      budget,
      is_bot
    `)
    .eq("lobby_id", lobbyId)
    .eq("user_id", userId)
    .eq("is_bot", false)
    .maybeSingle();

  if (
    ownTeamError ||
    !ownTeam
  ) {
    return {
      error:
        "Takım kaydın bulunamadı.",
      status: 404,
    } as const;
  }

  await ensureDriverStates(
    admin,
    lobbyId,
    season.season_number
  );

  return {
    admin,
    member,
    season,
    ownTeam,
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
      await getBaseContext(
        lobbyId,
        user.id
      );

    if ("error" in ctx) {
      return NextResponse.json(
        {
          error: ctx.error,
        },
        {
          status: ctx.status,
        }
      );
    }

    const {
      admin,
      season,
      ownTeam,
    } = ctx;

    const marketSeason =
      season.status === "finished"
        ? season.season_number + 1
        : season.season_number;

    const {
      data: teamStates,
      error: teamError,
    } = await admin
      .from("manager_team_states")
      .select(`
        id,
        user_id,
        team_key,
        driver_key,
        is_bot,
        bot_name
      `)
      .eq("lobby_id", lobbyId);

    if (teamError) {
      return NextResponse.json(
        {
          error:
            teamError.message,
        },
        {
          status: 500,
        }
      );
    }

    const {
      data: drivers,
      error: driverError,
    } = await admin
      .from("manager_driver_states")
      .select(`
        id,
        driver_key,
        driver_name,
        current_team_state_id,
        current_team_key,
        pace,
        consistency,
        wet,
        racecraft,
        potential,
        annual_salary,
        contract_until_season,
        last_developed_season
      `)
      .eq("lobby_id", lobbyId)
      .order("pace", {
        ascending: false,
      });

    if (driverError) {
      return NextResponse.json(
        {
          error:
            driverError.message,
        },
        {
          status: 500,
        }
      );
    }

    const normalized =
      (drivers ?? []).map(
        (driver) => {
          const team =
            (teamStates ?? []).find(
              (item) =>
                item.id ===
                driver.current_team_state_id
            );

          const current =
            driver.current_team_state_id ===
            ownTeam.id;

          const free =
            !driver.current_team_state_id;

          const expired =
            driver.contract_until_season ==
              null ||
            driver.contract_until_season <
              marketSeason;

          const occupiedByHuman =
            !!team &&
            !team.is_bot &&
            team.id !==
              ownTeam.id;

          const canSign =
            current ||
            free ||
            (
              expired &&
              !!team?.is_bot
            );

          let status:
            | "current"
            | "free"
            | "expired"
            | "contracted"
            | "human_locked";

          if (current) {
            status =
              "current";
          } else if (free) {
            status =
              "free";
          } else if (
            occupiedByHuman
          ) {
            status =
              "human_locked";
          } else if (
            expired
          ) {
            status =
              "expired";
          } else {
            status =
              "contracted";
          }

          return {
            ...driver,

            current_team_name:
              driver.current_team_key
                ? TEAM_NAMES[
                    driver.current_team_key
                  ] ??
                  driver.current_team_key
                : null,

            is_current_driver:
              current,

            is_free_agent:
              free,

            contract_expired:
              expired,

            can_sign:
              canSign,

            status,

            first_year_cost:
              Number(
                driver.annual_salary
              ),
          };
        }
      );

    const currentDriver =
      normalized.find(
        (driver) =>
          driver.is_current_driver
      ) ?? null;

    return NextResponse.json({
      ok: true,

      season: {
        ...season,
        market_season:
          marketSeason,
      },

      team: {
        id:
          ownTeam.id,

        team_key:
          ownTeam.team_key,

        team_name:
          TEAM_NAMES[
            ownTeam.team_key
          ] ??
          ownTeam.team_key,

        budget:
          Number(
            ownTeam.budget
          ),

        driver_key:
          ownTeam.driver_key,
      },

      currentDriver,

      drivers:
        normalized,
    });
  } catch (error) {
    console.error(
      "DRIVER MARKET GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Pilot pazarı yüklenemedi.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
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
      await getBaseContext(
        lobbyId,
        user.id
      );

    if ("error" in ctx) {
      return NextResponse.json(
        {
          error: ctx.error,
        },
        {
          status: ctx.status,
        }
      );
    }

    const {
      admin,
      member,
      season,
      ownTeam,
    } = ctx;

    const body =
      await request.json();

    const driverKey =
      String(
        body?.driverKey ??
          ""
      );

    const years =
      Number(
        body?.years ??
          1
      );

    if (
      !driverKey
    ) {
      return NextResponse.json(
        {
          error:
            "Pilot seçmelisin.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(
        years
      ) ||
      years < 1 ||
      years > 3
    ) {
      return NextResponse.json(
        {
          error:
            "Kontrat süresi 1-3 sezon arasında olmalı.",
        },
        {
          status: 400,
        }
      );
    }

    const marketSeason =
      season.status === "finished"
        ? season.season_number + 1
        : season.season_number;

    const contractUntil =
      marketSeason +
      years -
      1;

    const {
      data: target,
      error: targetError,
    } = await admin
      .from("manager_driver_states")
      .select(`
        id,
        driver_key,
        driver_name,
        current_team_state_id,
        current_team_key,
        annual_salary,
        contract_until_season
      `)
      .eq("lobby_id", lobbyId)
      .eq("driver_key", driverKey)
      .maybeSingle();

    if (
      targetError ||
      !target
    ) {
      return NextResponse.json(
        {
          error:
            "Pilot bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      data: currentDriver,
    } = await admin
      .from("manager_driver_states")
      .select(`
        id,
        driver_key,
        driver_name,
        current_team_state_id,
        current_team_key,
        annual_salary,
        contract_until_season
      `)
      .eq("lobby_id", lobbyId)
      .eq(
        "current_team_state_id",
        ownTeam.id
      )
      .maybeSingle();

    const renewing =
      target.current_team_state_id ===
      ownTeam.id;

    const free =
      !target.current_team_state_id;

    const expired =
      target.contract_until_season ==
        null ||
      target.contract_until_season <
        marketSeason;

    let previousTeam:
      | {
          id: string;
          user_id:
            | string
            | null;
          team_key: string;
          driver_key:
            | string
            | null;
          is_bot: boolean;
        }
      | null = null;

    if (
      target.current_team_state_id &&
      !renewing
    ) {
      const {
        data: previous,
      } = await admin
        .from(
          "manager_team_states"
        )
        .select(`
          id,
          user_id,
          team_key,
          driver_key,
          is_bot
        `)
        .eq(
          "id",
          target.current_team_state_id
        )
        .maybeSingle();

      previousTeam =
        previous ?? null;
    }

    if (!renewing) {
      if (
        !free &&
        !expired
      ) {
        return NextResponse.json(
          {
            error:
              "Bu pilotun aktif kontratı devam ediyor.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        previousTeam &&
        !previousTeam.is_bot
      ) {
        return NextResponse.json(
          {
            error:
              "Başka bir insan oyuncunun pilotuyla doğrudan sözleşme yapılamaz.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
      Şimdilik sözleşme yapılırken
      ilk sezon maaşı bütçeden
      düşülüyor.
    */

    const cost =
      Number(
        target.annual_salary
      );

    if (
      Number(
        ownTeam.budget
      ) < cost
    ) {
      return NextResponse.json(
        {
          error:
            "Bu pilotun ilk sezon maaşı için yeterli bütçen yok.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      MEVCUT PİLOTU YENİLEME
    */

    if (renewing) {
      const {
        error:
          renewError,
      } = await admin
        .from(
          "manager_driver_states"
        )
        .update({
          contract_until_season:
            contractUntil,

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", target.id);

      if (renewError) {
        throw new Error(
          renewError.message
        );
      }

      const {
        error:
          budgetError,
      } = await admin
        .from(
          "manager_team_states"
        )
        .update({
          budget:
            Number(
              ownTeam.budget
            ) - cost,

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", ownTeam.id);

      if (budgetError) {
        throw new Error(
          budgetError.message
        );
      }

      await admin
        .from(
          "manager_driver_transfer_logs"
        )
        .insert({
          lobby_id:
            lobbyId,

          season_number:
            marketSeason,

          driver_key:
            target.driver_key,

          driver_name:
            target.driver_name,

          from_team_key:
            ownTeam.team_key,

          to_team_key:
            ownTeam.team_key,

          annual_salary:
            cost,

          contract_until_season:
            contractUntil,

          transfer_type:
            "renewal",
        });

      return NextResponse.json({
        ok: true,

        message:
          `${target.driver_name} ile kontrat ${contractUntil}. sezon sonuna kadar uzatıldı.`,
      });
    }

    /*
      HEDEF PİLOT BİR AI TAKIMINDAYSA,
      ÖNCE ONU GEÇİCİ OLARAK SERBEST
      BIRAKIYORUZ. BÖYLECE UNIQUE
      TAKIM-PİLOT CONSTRAINT'İNE TAKILMAYIZ.
    */

    if (previousTeam) {
      const {
        error:
          releaseTargetError,
      } = await admin
        .from(
          "manager_driver_states"
        )
        .update({
          current_team_state_id:
            null,

          current_team_key:
            null,

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", target.id);

      if (
        releaseTargetError
      ) {
        throw new Error(
          releaseTargetError.message
        );
      }
    }

    /*
      SENİN ESKİ PİLOTUN
    */

    if (currentDriver) {
      if (previousTeam) {
        /*
          AI'DAN PİLOT ALDIYSAN,
          ESKİ PİLOTUN O AI TAKIMINA
          GEÇİYOR.
        */

        const {
          error:
            moveOldError,
        } = await admin
          .from(
            "manager_driver_states"
          )
          .update({
            current_team_state_id:
              previousTeam.id,

            current_team_key:
              previousTeam.team_key,

            contract_until_season:
              marketSeason,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            currentDriver.id
          );

        if (
          moveOldError
        ) {
          throw new Error(
            moveOldError.message
          );
        }

        const {
          error:
            botTeamError,
        } = await admin
          .from(
            "manager_team_states"
          )
          .update({
            driver_key:
              currentDriver.driver_key,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            previousTeam.id
          );

        if (
          botTeamError
        ) {
          throw new Error(
            botTeamError.message
          );
        }

        await admin
          .from(
            "manager_driver_transfer_logs"
          )
          .insert({
            lobby_id:
              lobbyId,

            season_number:
              marketSeason,

            driver_key:
              currentDriver.driver_key,

            driver_name:
              currentDriver.driver_name,

            from_team_key:
              ownTeam.team_key,

            to_team_key:
              previousTeam.team_key,

            annual_salary:
              Number(
                currentDriver.annual_salary
              ),

            contract_until_season:
              marketSeason,

            transfer_type:
              "ai_signing",
          });
      } else {
        /*
          SERBEST PİLOT ALDIYSAN
          ESKİ PİLOTUN SERBEST KALIYOR.
        */

        const {
          error:
            releaseOldError,
        } = await admin
          .from(
            "manager_driver_states"
          )
          .update({
            current_team_state_id:
              null,

            current_team_key:
              null,

            contract_until_season:
              null,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            currentDriver.id
          );

        if (
          releaseOldError
        ) {
          throw new Error(
            releaseOldError.message
          );
        }

        await admin
          .from(
            "manager_driver_transfer_logs"
          )
          .insert({
            lobby_id:
              lobbyId,

            season_number:
              marketSeason,

            driver_key:
              currentDriver.driver_key,

            driver_name:
              currentDriver.driver_name,

            from_team_key:
              ownTeam.team_key,

            to_team_key:
              null,

            annual_salary:
              Number(
                currentDriver.annual_salary
              ),

            contract_until_season:
              null,

            transfer_type:
              "release",
          });
      }
    }

    /*
      YENİ PİLOTU SENİN TAKIMINA ATA
    */

    const {
      error:
        targetAssignError,
    } = await admin
      .from(
        "manager_driver_states"
      )
      .update({
        current_team_state_id:
          ownTeam.id,

        current_team_key:
          ownTeam.team_key,

        contract_until_season:
          contractUntil,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", target.id);

    if (
      targetAssignError
    ) {
      throw new Error(
        targetAssignError.message
      );
    }

    /*
      TEAM STATE + MEMBER
      DRIVER KEY SENKRONİZASYONU
    */

    const {
      error:
        ownTeamUpdateError,
    } = await admin
      .from(
        "manager_team_states"
      )
      .update({
        driver_key:
          target.driver_key,

        budget:
          Number(
            ownTeam.budget
          ) - cost,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", ownTeam.id);

    if (
      ownTeamUpdateError
    ) {
      throw new Error(
        ownTeamUpdateError.message
      );
    }

    const {
      error:
        memberUpdateError,
    } = await admin
      .from(
        "manager_lobby_members"
      )
      .update({
        driver_key:
          target.driver_key,
      })
      .eq("id", member.id);

    if (
      memberUpdateError
    ) {
      throw new Error(
        memberUpdateError.message
      );
    }

    await admin
      .from(
        "manager_driver_transfer_logs"
      )
      .insert({
        lobby_id:
          lobbyId,

        season_number:
          marketSeason,

        driver_key:
          target.driver_key,

        driver_name:
          target.driver_name,

        from_team_key:
          target.current_team_key,

        to_team_key:
          ownTeam.team_key,

        annual_salary:
          cost,

        contract_until_season:
          contractUntil,

        transfer_type:
          "signing",
      });

    return NextResponse.json({
      ok: true,

      message:
        `${target.driver_name} ile ${years} sezonluk kontrat imzalandı.`,
    });
  } catch (error) {
    console.error(
      "DRIVER MARKET POST:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Kontrat işlemi tamamlanamadı.",
      },
      {
        status: 500,
      }
    );
  }
}