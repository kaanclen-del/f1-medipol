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

const TEAM_COLORS: Record<string, string> = {
  mclaren: "#ff8000",
  ferrari: "#e8002d",
  "red-bull": "#3671c6",
  mercedes: "#27f4d2",
  "aston-martin": "#229971",
  alpine: "#ff87bc",
  williams: "#64c4ff",
  haas: "#b6babd",
  "racing-bulls": "#6692ff",
  audi: "#f50537",
  cadillac: "#e6e6e6",
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { lobbyId } =
      await context.params;

    const url =
      new URL(request.url);

    const requestedTestMode =
      url.searchParams.get("test") ===
      "1";

    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Giriş yapmalısın.",
        },
        {
          status: 401,
        }
      );
    }

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
        created_by,
        status
      `)
      .eq("id", lobbyId)
      .maybeSingle();

    if (
      lobbyError ||
      !lobby
    ) {
      return NextResponse.json(
        {
          error: "Lobi bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    const isOwner =
      lobby.created_by ===
      user.id;

    const {
      data: member,
      error: memberError,
    } = await admin
      .from("manager_lobby_members")
      .select(`
        id,
        user_id,
        status
      `)
      .eq("lobby_id", lobbyId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (
      memberError ||
      !member
    ) {
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
      return NextResponse.json(
        {
          error:
            "Manager sezonu bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    /*
      TEST MODU SADECE HOST TARAFINDAN
      ÖNİZLENEBİLİR.
    */

    const testMode =
      requestedTestMode &&
      season.status !== "finished" &&
      isOwner;

    /*
      Gerçek sezon bitmediyse ve
      test modu istenmediyse normalde
      hiçbir şey göstermiyoruz.
    */

    if (
      season.status !== "finished" &&
      !testMode
    ) {
      return NextResponse.json({
        ok: true,

        finished: false,

        testMode: false,

        isOwner,

        season,
      });
    }

    const {
      data: teamStates,
      error: teamsError,
    } = await admin
      .from("manager_team_states")
      .select(`
        id,
        user_id,
        team_key,
        driver_key,
        season_points,
        wins,
        podiums,
        team_rating,
        budget,
        is_bot,
        bot_key,
        bot_name
      `)
      .eq("lobby_id", lobbyId);

    if (teamsError) {
      throw new Error(
        teamsError.message
      );
    }

    const {
      data: driverStates,
      error: driversError,
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
        contract_until_season
      `)
      .eq("lobby_id", lobbyId);

    if (driversError) {
      throw new Error(
        driversError.message
      );
    }

    /*
      Gerçek sezon sonuysa development
      trigger'ının oluşturduğu kayıtları
      gösteririz.

      Test modunda DB'yi değiştirmediğimiz
      için bu liste boş olabilir.
    */

    const {
      data: developmentLogs,
      error: developmentError,
    } = await admin
      .from(
        "manager_driver_development_logs"
      )
      .select(`
        id,
        season_number,
        driver_key,
        driver_name,

        pace_before,
        pace_after,

        consistency_before,
        consistency_after,

        wet_before,
        wet_after,

        racecraft_before,
        racecraft_after,

        potential,
        growth_points
      `)
      .eq("lobby_id", lobbyId)
      .eq(
        "season_number",
        season.season_number
      )
      .order("growth_points", {
        ascending: false,
      });

    if (developmentError) {
      throw new Error(
        developmentError.message
      );
    }

    const humanIds =
      (teamStates ?? [])
        .filter(
          (team) =>
            !team.is_bot &&
            !!team.user_id
        )
        .map(
          (team) =>
            team.user_id as string
        );

    let profiles: any[] = [];

    if (humanIds.length > 0) {
      const {
        data: profileRows,
      } = await admin
        .from("profiles")
        .select(`
          id,
          display_name,
          username
        `)
        .in("id", humanIds);

      profiles =
        profileRows ?? [];
    }

    const standings =
      [...(teamStates ?? [])]
        .sort((a, b) => {
          if (
            b.season_points !==
            a.season_points
          ) {
            return (
              b.season_points -
              a.season_points
            );
          }

          if (
            b.wins !==
            a.wins
          ) {
            return (
              b.wins -
              a.wins
            );
          }

          if (
            b.podiums !==
            a.podiums
          ) {
            return (
              b.podiums -
              a.podiums
            );
          }

          return (
            b.team_rating -
            a.team_rating
          );
        })
        .map(
          (team, index) => {
            const driver =
              (
                driverStates ??
                []
              ).find(
                (item) =>
                  item.current_team_state_id ===
                  team.id
              );

            const profile =
              team.user_id
                ? profiles.find(
                    (item) =>
                      item.id ===
                      team.user_id
                  )
                : null;

            return {
              position:
                index + 1,

              team_state_id:
                team.id,

              user_id:
                team.user_id,

              is_bot:
                team.is_bot,

              team_key:
                team.team_key,

              team_name:
                TEAM_NAMES[
                  team.team_key
                ] ??
                team.team_key,

              team_color:
                TEAM_COLORS[
                  team.team_key
                ] ??
                "#ffffff",

              manager_name:
                team.is_bot
                  ? team.bot_name ??
                    "AI Manager"
                  : profile
                      ?.display_name ??
                    profile
                      ?.username ??
                    "Manager",

              driver_key:
                driver?.driver_key ??
                team.driver_key,

              driver_name:
                driver?.driver_name ??
                "Pilot",

              points:
                Number(
                  team.season_points
                ),

              wins:
                Number(
                  team.wins
                ),

              podiums:
                Number(
                  team.podiums
                ),

              rating:
                Number(
                  team.team_rating
                ),
            };
          }
        );

    const nextSeason =
      season.season_number +
      1;

    const humanTeams =
      (teamStates ?? []).filter(
        (team) =>
          !team.is_bot
      );

    const contracts =
      humanTeams.map(
        (team) => {
          const driver =
            (
              driverStates ??
              []
            ).find(
              (item) =>
                item.current_team_state_id ===
                team.id
            );

          const ready =
            !!driver &&
            Number(
              driver.contract_until_season ??
                0
            ) >= nextSeason;

          return {
            team_state_id:
              team.id,

            user_id:
              team.user_id,

            team_key:
              team.team_key,

            team_name:
              TEAM_NAMES[
                team.team_key
              ] ??
              team.team_key,

            driver_key:
              driver?.driver_key ??
              null,

            driver_name:
              driver?.driver_name ??
              null,

            contract_until:
              driver
                ?.contract_until_season ??
              null,

            ready,
          };
        }
      );

    const myContract =
      contracts.find(
        (contract) =>
          contract.user_id ===
          user.id
      ) ?? null;

    const missingContracts =
      contracts.filter(
        (contract) =>
          !contract.ready
      ).length;

    return NextResponse.json({
      ok: true,

      /*
        Test modunda UI bunu
        sezon sonu ekranı gibi görür.
      */

      finished: true,

      testMode,

      isOwner,

      season: {
        ...season,

        next_season:
          nextSeason,
      },

      champion:
        standings[0] ??
        null,

      podium:
        standings.slice(
          0,
          3
        ),

      standings,

      developmentLogs:
        developmentLogs ?? [],

      contracts: {
        total:
          contracts.length,

        ready:
          contracts.length -
          missingContracts,

        missing:
          missingContracts,

        allReady:
          missingContracts ===
          0,

        mine:
          myContract,
      },
    });
  } catch (error) {
    console.error(
      "SEASON END GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Sezon sonu verileri yüklenemedi.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
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

    const admin =
      createAdminClient();

    const {
      data: lobby,
    } = await admin
      .from("manager_lobbies")
      .select(`
        id,
        created_by
      `)
      .eq("id", lobbyId)
      .maybeSingle();

    if (!lobby) {
      return NextResponse.json(
        {
          error:
            "Lobi bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      lobby.created_by !==
      user.id
    ) {
      return NextResponse.json(
        {
          error:
            "Yeni sezonu yalnızca lobi sahibi başlatabilir.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data: season,
    } = await admin
      .from("manager_seasons")
      .select(`
        season_number,
        status
      `)
      .eq("lobby_id", lobbyId)
      .maybeSingle();

    /*
      TEST MODUNDAN BURAYA
      GİRİLEMEZ.

      Gerçek sezon gerçekten
      finished olmalı.
    */

    if (
      !season ||
      season.status !==
        "finished"
    ) {
      return NextResponse.json(
        {
          error:
            "Bu yalnızca test önizlemesi. Gerçek yeni sezon için mevcut sezonun tamamlanması gerekiyor.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: nextSeason,
      error: startError,
    } = await admin.rpc(
      "start_manager_next_season",
      {
        p_lobby_id:
          lobbyId,
      }
    );

    if (startError) {
      return NextResponse.json(
        {
          error:
            startError.message,
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json({
      ok: true,

      nextSeason,

      next:
        `/arcade/manager/lobbies/${lobbyId}/game`,
    });
  } catch (error) {
    console.error(
      "START NEXT SEASON:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Yeni sezon başlatılamadı.",
      },
      {
        status: 500,
      }
    );
  }
}