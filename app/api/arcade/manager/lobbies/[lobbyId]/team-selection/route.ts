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

type Difficulty =
  | "easy"
  | "normal"
  | "hard"
  | "expert";

type Driver = {
  key: string;
  name: string;
  imageCode: string;

  pace: number;
  consistency: number;
  wet: number;
  racecraft: number;
  potential: number;
};

type Team = {
  key: string;
  name: string;
  mediaKey: string;
  color: string;
  rating: number;

  drivers: Driver[];
};

const STARTING_BUDGET =
  100_000_000;

const DIFFICULTIES: Difficulty[] = [
  "easy",
  "normal",
  "hard",
  "expert",
];

const TEAMS: Team[] = [
  {
    key: "mclaren",
    name: "McLaren",
    mediaKey: "mclaren",
    color: "#ff8000",
    rating: 88,

    drivers: [
      {
        key: "lando-norris",
        name: "Lando Norris",
        imageCode: "lannor01",

        pace: 93,
        consistency: 92,
        wet: 90,
        racecraft: 93,
        potential: 95,
      },

      {
        key: "oscar-piastri",
        name: "Oscar Piastri",
        imageCode: "oscpia01",

        pace: 92,
        consistency: 91,
        wet: 87,
        racecraft: 92,
        potential: 96,
      },
    ],
  },

  {
    key: "ferrari",
    name: "Ferrari",
    mediaKey: "ferrari",
    color: "#e8002d",
    rating: 87,

    drivers: [
      {
        key: "charles-leclerc",
        name: "Charles Leclerc",
        imageCode: "chalec01",

        pace: 95,
        consistency: 92,
        wet: 92,
        racecraft: 94,
        potential: 95,
      },

      {
        key: "lewis-hamilton",
        name: "Lewis Hamilton",
        imageCode: "lewham01",

        pace: 93,
        consistency: 93,
        wet: 96,
        racecraft: 95,
        potential: 91,
      },
    ],
  },

  {
    key: "red-bull",
    name: "Red Bull Racing",
    mediaKey: "redbullracing",
    color: "#3671c6",
    rating: 86,

    drivers: [
      {
        key: "max-verstappen",
        name: "Max Verstappen",
        imageCode: "maxver01",

        pace: 96,
        consistency: 95,
        wet: 96,
        racecraft: 97,
        potential: 96,
      },

      {
        key: "isack-hadjar",
        name: "Isack Hadjar",
        imageCode: "isahad01",

        pace: 89,
        consistency: 87,
        wet: 87,
        racecraft: 90,
        potential: 96,
      },
    ],
  },

  {
    key: "mercedes",
    name: "Mercedes",
    mediaKey: "mercedes",
    color: "#27f4d2",
    rating: 85,

    drivers: [
      {
        key: "george-russell",
        name: "George Russell",
        imageCode: "georus01",

        pace: 94,
        consistency: 94,
        wet: 91,
        racecraft: 94,
        potential: 94,
      },

      {
        key: "kimi-antonelli",
        name: "Kimi Antonelli",
        imageCode: "andant01",

        pace: 95,
        consistency: 90,
        wet: 88,
        racecraft: 92,
        potential: 98,
      },
    ],
  },

  {
    key: "aston-martin",
    name: "Aston Martin",
    mediaKey: "astonmartin",
    color: "#229971",
    rating: 80,

    drivers: [
      {
        key: "fernando-alonso",
        name: "Fernando Alonso",
        imageCode: "feralo01",

        pace: 92,
        consistency: 96,
        wet: 96,
        racecraft: 97,
        potential: 85,
      },

      {
        key: "lance-stroll",
        name: "Lance Stroll",
        imageCode: "lanstr01",

        pace: 84,
        consistency: 85,
        wet: 87,
        racecraft: 85,
        potential: 82,
      },
    ],
  },

  {
    key: "alpine",
    name: "Alpine",
    mediaKey: "alpine",
    color: "#ff87bc",
    rating: 74,

    drivers: [
      {
        key: "pierre-gasly",
        name: "Pierre Gasly",
        imageCode: "piegas01",

        pace: 89,
        consistency: 90,
        wet: 92,
        racecraft: 90,
        potential: 90,
      },

      {
        key: "franco-colapinto",
        name: "Franco Colapinto",
        imageCode: "fracol01",

        pace: 86,
        consistency: 84,
        wet: 86,
        racecraft: 87,
        potential: 93,
      },
    ],
  },

  {
    key: "williams",
    name: "Williams",
    mediaKey: "williams",
    color: "#64c4ff",
    rating: 78,

    drivers: [
      {
        key: "carlos-sainz",
        name: "Carlos Sainz",
        imageCode: "carsai01",

        pace: 91,
        consistency: 93,
        wet: 92,
        racecraft: 93,
        potential: 90,
      },

      {
        key: "alexander-albon",
        name: "Alexander Albon",
        imageCode: "alealb01",

        pace: 90,
        consistency: 91,
        wet: 89,
        racecraft: 92,
        potential: 89,
      },
    ],
  },

  {
    key: "haas",
    name: "Haas F1 Team",
    mediaKey: "haas",
    color: "#b6babd",
    rating: 73,

    drivers: [
      {
        key: "esteban-ocon",
        name: "Esteban Ocon",
        imageCode: "estoco01",

        pace: 88,
        consistency: 89,
        wet: 90,
        racecraft: 90,
        potential: 87,
      },

      {
        key: "oliver-bearman",
        name: "Oliver Bearman",
        imageCode: "olibea01",

        pace: 88,
        consistency: 86,
        wet: 85,
        racecraft: 89,
        potential: 95,
      },
    ],
  },

  {
    key: "racing-bulls",
    name: "Racing Bulls",
    mediaKey: "racingbulls",
    color: "#6692ff",
    rating: 75,

    drivers: [
      {
        key: "liam-lawson",
        name: "Liam Lawson",
        imageCode: "lialaw01",

        pace: 87,
        consistency: 86,
        wet: 85,
        racecraft: 88,
        potential: 93,
      },

      {
        key: "arvid-lindblad",
        name: "Arvid Lindblad",
        imageCode: "arvlin01",

        pace: 86,
        consistency: 84,
        wet: 83,
        racecraft: 86,
        potential: 97,
      },
    ],
  },

  {
    key: "audi",
    name: "Audi",
    mediaKey: "audi",
    color: "#f50537",
    rating: 77,

    drivers: [
      {
        key: "nico-hulkenberg",
        name: "Nico Hulkenberg",
        imageCode: "nichul01",

        pace: 88,
        consistency: 91,
        wet: 89,
        racecraft: 90,
        potential: 85,
      },

      {
        key: "gabriel-bortoleto",
        name: "Gabriel Bortoleto",
        imageCode: "gabbor01",

        pace: 87,
        consistency: 86,
        wet: 84,
        racecraft: 88,
        potential: 94,
      },
    ],
  },

  {
    key: "cadillac",
    name: "Cadillac",
    mediaKey: "cadillac",
    color: "#e6e6e6",
    rating: 72,

    drivers: [
      {
        key: "sergio-perez",
        name: "Sergio Perez",
        imageCode: "serper01",

        pace: 87,
        consistency: 91,
        wet: 92,
        racecraft: 91,
        potential: 84,
      },

      {
        key: "valtteri-bottas",
        name: "Valtteri Bottas",
        imageCode: "valbot01",

        pace: 88,
        consistency: 93,
        wet: 90,
        racecraft: 91,
        potential: 83,
      },
    ],
  },
];

function getCarImage(
  mediaKey: string
) {
  return (
    "https://media.formula1.com/image/upload/" +
    "c_lfill%2Cw_1200/q_auto/" +
    "v1740000001/common/f1/2026/" +
    `${mediaKey}/2026${mediaKey}carright.webp`
  );
}

function getDriverImage(
  mediaKey: string,
  imageCode: string
) {
  return (
    "https://media.formula1.com/image/upload/" +
    "c_fill%2Cw_720/q_auto/" +
    "v1740000001/common/f1/2026/" +
    `${mediaKey}/${imageCode}/2026${mediaKey}${imageCode}right.webp`
  );
}

function getPublicTeams() {
  return TEAMS.map(
    (team) => ({
      key: team.key,
      name: team.name,
      color: team.color,

      carImage:
        getCarImage(
          team.mediaKey
        ),

      drivers:
        team.drivers.map(
          (driver) => ({
            key:
              driver.key,

            name:
              driver.name,

            image:
              getDriverImage(
                team.mediaKey,
                driver.imageCode
              ),

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
          })
        ),
    })
  );
}

function findTeam(
  teamKey: string
) {
  return TEAMS.find(
    (team) =>
      team.key ===
      teamKey
  );
}

function findDriver(
  team: Team,
  driverKey: string
) {
  return team.drivers.find(
    (driver) =>
      driver.key ===
      driverKey
  );
}

function hash(
  value: string
) {
  let result = 0;

  for (
    let i = 0;
    i < value.length;
    i++
  ) {
    result =
      (result * 31 +
        value.charCodeAt(
          i
        )) %
      100000;
  }

  return result;
}

function chooseBotDriver(
  lobbyId: string,
  team: Team
) {
  const index =
    hash(
      `${lobbyId}:${team.key}:driver`
    ) %
    team.drivers.length;

  return team.drivers[
    index
  ];
}

async function getLobbyData(
  lobbyId: string,
  userId: string
) {
  const admin =
    createAdminClient();

  const {
    data: lobby,
    error: lobbyError,
  } = await admin
    .from(
      "manager_lobbies"
    )
    .select(`
      id,
      name,
      created_by,
      status,
      ai_difficulty
    `)
    .eq(
      "id",
      lobbyId
    )
    .maybeSingle();

  if (
    lobbyError ||
    !lobby
  ) {
    return {
      error:
        "Lobi bulunamadı.",

      status: 404,
    };
  }

  const {
    data: members,
    error: membersError,
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
      "status",
      "active"
    );

  if (membersError) {
    console.error(
      "TEAM SELECT MEMBERS:",
      membersError
    );

    return {
      error:
        "Lobi üyeleri alınamadı.",

      status: 500,
    };
  }

  const currentMember =
    members?.find(
      (member) =>
        member.user_id ===
        userId
    );

  if (!currentMember) {
    return {
      error:
        "Bu lobinin aktif üyesi değilsin.",

      status: 403,
    };
  }

  const ids =
    (members ?? []).map(
      (member) =>
        member.user_id
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

  if (ids.length > 0) {
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
        ids
      );

    profiles =
      profileRows ?? [];
  }

  return {
    lobby,

    members:
      (members ?? []).map(
        (member) => ({
          ...member,

          profile:
            profiles.find(
              (profile) =>
                profile.id ===
                member.user_id
            ) ?? null,
        })
      ),

    currentMember,

    isOwner:
      lobby.created_by ===
      userId,

    currentUserId:
      userId,

    teams:
      getPublicTeams(),
  };
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
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
    await getLobbyData(
      lobbyId,
      user.id
    );

  if ("error" in result) {
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

  return NextResponse.json({
    ok: true,
    ...result,
  });
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

    const action =
      String(
        body?.action ??
          ""
      );

    const admin =
      createAdminClient();

    const result =
      await getLobbyData(
        lobbyId,
        user.id
      );

    if ("error" in result) {
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
      lobby,
      members,
      isOwner,
    } = result;

    /*
      AI ZORLUK AYARI
    */

    if (
      action ===
      "set_ai_difficulty"
    ) {
      if (!isOwner) {
        return NextResponse.json(
          {
            error:
              "AI zorluğunu yalnızca lobi sahibi değiştirebilir.",
          },
          {
            status: 403,
          }
        );
      }

      if (
        lobby.status !==
        "team_selection"
      ) {
        return NextResponse.json(
          {
            error:
              "AI zorluğu yalnızca takım seçimi aşamasında değiştirilebilir.",
          },
          {
            status: 400,
          }
        );
      }

      const difficulty =
        String(
          body?.difficulty ??
            ""
        ) as Difficulty;

      if (
        !DIFFICULTIES.includes(
          difficulty
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Geçersiz AI zorluk seviyesi.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        error:
          difficultyError,
      } = await admin
        .from(
          "manager_lobbies"
        )
        .update({
          ai_difficulty:
            difficulty,
        })
        .eq(
          "id",
          lobbyId
        );

      if (
        difficultyError
      ) {
        return NextResponse.json(
          {
            error:
              difficultyError.message,
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        ok: true,
        difficulty,
      });
    }

    /*
      TAKIM + PİLOT SEÇ
    */

    if (
      action === "select"
    ) {
      if (
        lobby.status !==
        "team_selection"
      ) {
        return NextResponse.json(
          {
            error:
              "Takım seçimi aşaması kapalı.",
          },
          {
            status: 400,
          }
        );
      }

      const teamKey =
        String(
          body?.teamKey ??
            ""
        );

      const driverKey =
        String(
          body?.driverKey ??
            ""
        );

      const team =
        findTeam(
          teamKey
        );

      if (!team) {
        return NextResponse.json(
          {
            error:
              "Geçersiz takım.",
          },
          {
            status: 400,
          }
        );
      }

      const driver =
        findDriver(
          team,
          driverKey
        );

      if (!driver) {
        return NextResponse.json(
          {
            error:
              "Bu pilot seçilen takımda yer almıyor.",
          },
          {
            status: 400,
          }
        );
      }

      const otherMembers =
        members.filter(
          (member) =>
            member.user_id !==
            user.id
        );

      const teamTaken =
        otherMembers.some(
          (member) =>
            member.team_key ===
            teamKey
        );

      if (teamTaken) {
        return NextResponse.json(
          {
            error:
              "Bu takım başka bir menajer tarafından seçildi.",
          },
          {
            status: 409,
          }
        );
      }

      const driverTaken =
        otherMembers.some(
          (member) =>
            member.driver_key ===
            driverKey
        );

      if (driverTaken) {
        return NextResponse.json(
          {
            error:
              "Bu pilot başka bir menajer tarafından seçildi.",
          },
          {
            status: 409,
          }
        );
      }

      const {
        error: updateError,
      } = await admin
        .from(
          "manager_lobby_members"
        )
        .update({
          team_key:
            teamKey,

          driver_key:
            driverKey,
        })
        .eq(
          "lobby_id",
          lobbyId
        )
        .eq(
          "user_id",
          user.id
        );

      if (updateError) {
        return NextResponse.json(
          {
            error:
              updateError.message,
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        ok: true,
        teamKey,
        driverKey,
      });
    }

    /*
      SEZONU BAŞLAT
    */

    if (
      action ===
      "start_season"
    ) {
      if (!isOwner) {
        return NextResponse.json(
          {
            error:
              "Sezonu yalnızca lobi sahibi başlatabilir.",
          },
          {
            status: 403,
          }
        );
      }

      if (
        lobby.status ===
        "active"
      ) {
        return NextResponse.json({
          ok: true,

          next:
            `/arcade/manager/lobbies/${lobbyId}/game`,
        });
      }

      if (
        lobby.status !==
        "team_selection"
      ) {
        return NextResponse.json(
          {
            error:
              "Lobi takım seçimi aşamasında değil.",
          },
          {
            status: 400,
          }
        );
      }

      const incomplete =
        members.filter(
          (member) =>
            !member.team_key ||
            !member.driver_key
        );

      if (
        incomplete.length >
        0
      ) {
        return NextResponse.json(
          {
            error:
              `${incomplete.length} oyuncu henüz takım ve pilot seçimini tamamlamadı.`,
          },
          {
            status: 400,
          }
        );
      }

      const selectedTeams =
        new Set(
          members
            .map(
              (member) =>
                member.team_key
            )
            .filter(Boolean)
        );

      const freeTeams =
        TEAMS.filter(
          (team) =>
            !selectedTeams.has(
              team.key
            )
        );

      /*
        Önce eski/stale botları
        temizliyoruz.
      */

      const {
        error:
          cleanupError,
      } = await admin
        .from(
          "manager_team_states"
        )
        .delete()
        .eq(
          "lobby_id",
          lobbyId
        )
        .eq(
          "is_bot",
          true
        );

      if (cleanupError) {
        return NextResponse.json(
          {
            error:
              cleanupError.message,
          },
          {
            status: 500,
          }
        );
      }

      /*
        SEÇİLMEYEN HER TAKIMA
        BİR AI MENAJER.
      */

      if (
        freeTeams.length >
        0
      ) {
        const botRows =
          freeTeams.map(
            (team) => {
              const driver =
                chooseBotDriver(
                  lobbyId,
                  team
                );

              return {
                lobby_id:
                  lobbyId,

                user_id:
                  null,

                team_key:
                  team.key,

                driver_key:
                  driver.key,

                budget:
                  STARTING_BUDGET,

                team_rating:
                  team.rating,

                season_points:
                  0,

                wins: 0,

                podiums: 0,

                aero_level: 1,

                chassis_level: 1,

                power_level: 1,

                reliability_level:
                  1,

                total_spent: 0,

                is_bot: true,

                bot_key:
                  `bot-${team.key}`,

                bot_name:
                  `${team.name} AI`,

                ai_difficulty:
                  lobby.ai_difficulty ??
                  "normal",
              };
            }
          );

        const {
          error:
            botsError,
        } = await admin
          .from(
            "manager_team_states"
          )
          .insert(
            botRows
          );

        if (botsError) {
          return NextResponse.json(
            {
              error:
                botsError.message,
            },
            {
              status: 500,
            }
          );
        }
      }

      /*
        MEVCUT İNSAN TEAM STATE
        VARSA DRIVER'I SENKRONLA.
      */

      for (const member of
        members) {
        const {
          data:
            existingState,
        } = await admin
          .from(
            "manager_team_states"
          )
          .select("id")
          .eq(
            "lobby_id",
            lobbyId
          )
          .eq(
            "user_id",
            member.user_id
          )
          .maybeSingle();

        if (
          existingState
        ) {
          await admin
            .from(
              "manager_team_states"
            )
            .update({
              team_key:
                member.team_key,

              driver_key:
                member.driver_key,

              is_bot: false,

              bot_key: null,

              bot_name: null,

              ai_difficulty:
                null,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              existingState.id
            );
        }
      }

      const {
        error:
          lobbyUpdateError,
      } = await admin
        .from(
          "manager_lobbies"
        )
        .update({
          status:
            "active",
        })
        .eq(
          "id",
          lobbyId
        );

      if (
        lobbyUpdateError
      ) {
        return NextResponse.json(
          {
            error:
              lobbyUpdateError.message,
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        ok: true,

        botsCreated:
          freeTeams.length,

        difficulty:
          lobby.ai_difficulty ??
          "normal",

        next:
          `/arcade/manager/lobbies/${lobbyId}/game`,
      });
    }

    return NextResponse.json(
      {
        error:
          "Geçersiz işlem.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "TEAM SELECTION PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Takım seçimi sırasında hata oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}