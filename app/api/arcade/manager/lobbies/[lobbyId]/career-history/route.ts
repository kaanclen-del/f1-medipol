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

const RACE_NAMES: Record<
  number,
  {
    name: string;
    country: string;
  }
> = {
  1: {
    name: "Bahrain GP",
    country: "Bahrain",
  },

  2: {
    name: "Saudi Arabian GP",
    country: "Saudi Arabia",
  },

  3: {
    name: "Australian GP",
    country: "Australia",
  },

  4: {
    name: "Japanese GP",
    country: "Japan",
  },

  5: {
    name: "Monaco GP",
    country: "Monaco",
  },

  6: {
    name: "British GP",
    country: "United Kingdom",
  },

  7: {
    name: "Belgian GP",
    country: "Belgium",
  },

  8: {
    name: "Italian GP",
    country: "Italy",
  },

  9: {
    name: "Singapore GP",
    country: "Singapore",
  },

  10: {
    name: "Türkiye GP",
    country: "Türkiye",
  },
};

function asArray(value: any) {
  return Array.isArray(value)
    ? value
    : [];
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
      data: currentSeason,
    } = await admin
      .from("manager_seasons")
      .select(`
        season_number,
        current_round,
        status
      `)
      .eq("lobby_id", lobbyId)
      .maybeSingle();

    const {
      data: archives,
      error: archiveError,
    } = await admin
      .from("manager_season_archives")
      .select(`
        id,
        season_number,
        champion_team_key,
        champion_driver_key,
        standings,
        race_results,
        race_events,
        created_at
      `)
      .eq("lobby_id", lobbyId)
      .order("season_number", {
        ascending: false,
      });

    if (archiveError) {
      throw new Error(
        archiveError.message
      );
    }

    const {
      data: drivers,
      error: driversError,
    } = await admin
      .from("manager_driver_catalog")
      .select(`
        driver_key,
        driver_name
      `);

    if (driversError) {
      throw new Error(
        driversError.message
      );
    }

    const driverNameMap =
      new Map(
        (drivers ?? []).map(
          (driver) => [
            driver.driver_key,
            driver.driver_name,
          ]
        )
      );

    /*
      Arşivlerde yer alan tüm
      insan kullanıcılarını bul.
    */

    const userIds =
      new Set<string>();

    for (const archive of
      archives ?? []) {
      for (const row of asArray(
        archive.standings
      )) {
        if (
          row?.user_id &&
          !row?.is_bot
        ) {
          userIds.add(
            row.user_id
          );
        }
      }

      for (const row of asArray(
        archive.race_results
      )) {
        if (
          row?.user_id &&
          !row?.is_bot
        ) {
          userIds.add(
            row.user_id
          );
        }
      }
    }

    let profiles: any[] = [];

    if (userIds.size > 0) {
      const {
        data: rows,
      } = await admin
        .from("profiles")
        .select(`
          id,
          display_name,
          username
        `)
        .in(
          "id",
          [...userIds]
        );

      profiles =
        rows ?? [];
    }

    const profileName = (
      userId:
        | string
        | null,
      botName:
        | string
        | null,
      isBot: boolean
    ) => {
      if (isBot) {
        return (
          botName ??
          "AI Manager"
        );
      }

      const profile =
        profiles.find(
          (item) =>
            item.id === userId
        );

      return (
        profile?.display_name ??
        profile?.username ??
        "Manager"
      );
    };

    /*
      TRANSFERLER
    */

    const {
      data: transfers,
      error: transferError,
    } = await admin
      .from(
        "manager_driver_transfer_logs"
      )
      .select(`
        id,
        season_number,
        driver_key,
        driver_name,
        from_team_key,
        to_team_key,
        annual_salary,
        contract_until_season,
        transfer_type,
        created_at
      `)
      .eq("lobby_id", lobbyId)
      .order("created_at", {
        ascending: false,
      });

    if (transferError) {
      throw new Error(
        transferError.message
      );
    }

    const normalized =
      (archives ?? []).map(
        (archive) => {
          const rawStandings =
            asArray(
              archive.standings
            );

          const standings =
            [...rawStandings]
              .sort(
                (a, b) => {
                  if (
                    Number(
                      b.season_points
                    ) !==
                    Number(
                      a.season_points
                    )
                  ) {
                    return (
                      Number(
                        b.season_points
                      ) -
                      Number(
                        a.season_points
                      )
                    );
                  }

                  if (
                    Number(
                      b.wins
                    ) !==
                    Number(
                      a.wins
                    )
                  ) {
                    return (
                      Number(
                        b.wins
                      ) -
                      Number(
                        a.wins
                      )
                    );
                  }

                  return (
                    Number(
                      b.podiums
                    ) -
                    Number(
                      a.podiums
                    )
                  );
                }
              )
              .map(
                (
                  row,
                  index
                ) => ({
                  position:
                    index + 1,

                  team_key:
                    row.team_key,

                  team_name:
                    TEAM_NAMES[
                      row.team_key
                    ] ??
                    row.team_key,

                  team_color:
                    TEAM_COLORS[
                      row.team_key
                    ] ??
                    "#ffffff",

                  driver_key:
                    row.driver_key,

                  driver_name:
                    driverNameMap.get(
                      row.driver_key
                    ) ??
                    row.driver_key ??
                    "Pilot",

                  manager_name:
                    profileName(
                      row.user_id,
                      row.bot_name,
                      !!row.is_bot
                    ),

                  is_bot:
                    !!row.is_bot,

                  points:
                    Number(
                      row.season_points ??
                        0
                    ),

                  wins:
                    Number(
                      row.wins ??
                        0
                    ),

                  podiums:
                    Number(
                      row.podiums ??
                        0
                    ),

                  team_rating:
                    Number(
                      row.team_rating ??
                        0
                    ),
                })
              );

          const rawResults =
            asArray(
              archive.race_results
            );

          const raceRounds =
            Array.from(
              {
                length: 10,
              },
              (_, index) =>
                index + 1
            ).map(
              (round) => {
                const results =
                  rawResults
                    .filter(
                      (row) =>
                        Number(
                          row.round
                        ) ===
                        round
                    )
                    .sort(
                      (a, b) =>
                        Number(
                          a.position
                        ) -
                        Number(
                          b.position
                        )
                    )
                    .map(
                      (row) => ({
                        position:
                          Number(
                            row.position
                          ),

                        team_key:
                          row.team_key,

                        team_name:
                          TEAM_NAMES[
                            row.team_key
                          ] ??
                          row.team_key,

                        team_color:
                          TEAM_COLORS[
                            row.team_key
                          ] ??
                          "#ffffff",

                        driver_key:
                          row.driver_key,

                        driver_name:
                          driverNameMap.get(
                            row.driver_key
                          ) ??
                          row.driver_key ??
                          "Pilot",

                        manager_name:
                          profileName(
                            row.user_id,
                            row.bot_name,
                            !!row.is_bot
                          ),

                        points:
                          Number(
                            row.points ??
                              0
                          ),

                        finish_status:
                          row.finish_status ??
                          "finished",

                        incident_message:
                          row.incident_message ??
                          null,
                      })
                    );

                return {
                  round,

                  name:
                    RACE_NAMES[
                      round
                    ]?.name ??
                    `Round ${round}`,

                  country:
                    RACE_NAMES[
                      round
                    ]?.country ??
                    "",

                  winner:
                    results[0] ??
                    null,

                  results,
                };
              }
            );

          const seasonTransfers =
            (
              transfers ?? []
            )
              .filter(
                (item) =>
                  Number(
                    item.season_number
                  ) ===
                  Number(
                    archive.season_number
                  )
              )
              .map(
                (item) => ({
                  ...item,

                  from_team_name:
                    item.from_team_key
                      ? TEAM_NAMES[
                          item.from_team_key
                        ] ??
                        item.from_team_key
                      : null,

                  to_team_name:
                    item.to_team_key
                      ? TEAM_NAMES[
                          item.to_team_key
                        ] ??
                        item.to_team_key
                      : null,
                })
              );

          const champion =
            standings[0] ??
            null;

          return {
            id:
              archive.id,

            season_number:
              archive.season_number,

            created_at:
              archive.created_at,

            champion:
              champion
                ? {
                    ...champion,

                    driver_name:
                      driverNameMap.get(
                        archive.champion_driver_key
                      ) ??
                      champion.driver_name,
                  }
                : null,

            podium:
              standings.slice(
                0,
                3
              ),

            standings,

            races:
              raceRounds,

            transfers:
              seasonTransfers,
          };
        }
      );

    /*
      CAREER SUMMARY
    */

    const teamTitles: Record<
      string,
      number
    > = {};

    const driverTitles: Record<
      string,
      number
    > = {};

    for (const season of
      normalized) {
      if (
        season.champion
      ) {
        teamTitles[
          season.champion
            .team_name
        ] =
          (teamTitles[
            season.champion
              .team_name
          ] ?? 0) + 1;

        driverTitles[
          season.champion
            .driver_name
        ] =
          (driverTitles[
            season.champion
              .driver_name
          ] ?? 0) + 1;
      }
    }

    return NextResponse.json({
      ok: true,

      currentSeason:
        currentSeason ?? null,

      archiveCount:
        normalized.length,

      summary: {
        teamTitles,
        driverTitles,
      },

      seasons:
        normalized,
    });
  } catch (error) {
    console.error(
      "CAREER HISTORY GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Kariyer arşivi yüklenemedi.",
      },
      {
        status: 500,
      }
    );
  }
}