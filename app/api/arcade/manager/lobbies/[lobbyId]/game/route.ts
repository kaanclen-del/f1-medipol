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

const STARTING_BUDGET = 100_000_000;

const TEAM_DATA: Record<
  string,
  {
    name: string;
    rating: number;
    color: string;
  }
> = {
  mclaren: {
    name: "McLaren",
    rating: 88,
    color: "#ff8000",
  },

  ferrari: {
    name: "Ferrari",
    rating: 87,
    color: "#e8002d",
  },

  "red-bull": {
    name: "Red Bull Racing",
    rating: 86,
    color: "#3671c6",
  },

  mercedes: {
    name: "Mercedes",
    rating: 85,
    color: "#27f4d2",
  },

  "aston-martin": {
    name: "Aston Martin",
    rating: 80,
    color: "#229971",
  },

  alpine: {
    name: "Alpine",
    rating: 74,
    color: "#ff87bc",
  },

  williams: {
    name: "Williams",
    rating: 78,
    color: "#64c4ff",
  },

  haas: {
    name: "Haas F1 Team",
    rating: 73,
    color: "#b6babd",
  },

  "racing-bulls": {
    name: "Racing Bulls",
    rating: 75,
    color: "#6692ff",
  },

  audi: {
    name: "Audi",
    rating: 77,
    color: "#f50537",
  },

  cadillac: {
    name: "Cadillac",
    rating: 72,
    color: "#e6e6e6",
  },
};

type DriverInfo = {
  key: string;
  name: string;
  teamKey: string;
  image: string;

  pace: number;
  consistency: number;
  wet: number;
  racecraft: number;
  potential: number;
};

function driverImage(
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

const DRIVERS: Record<string, DriverInfo> = {
  "lando-norris": {
    key: "lando-norris",
    name: "Lando Norris",
    teamKey: "mclaren",
    image: driverImage("mclaren", "lannor01"),
    pace: 93,
    consistency: 92,
    wet: 90,
    racecraft: 93,
    potential: 95,
  },

  "oscar-piastri": {
    key: "oscar-piastri",
    name: "Oscar Piastri",
    teamKey: "mclaren",
    image: driverImage("mclaren", "oscpia01"),
    pace: 92,
    consistency: 91,
    wet: 87,
    racecraft: 92,
    potential: 96,
  },

  "charles-leclerc": {
    key: "charles-leclerc",
    name: "Charles Leclerc",
    teamKey: "ferrari",
    image: driverImage("ferrari", "chalec01"),
    pace: 95,
    consistency: 92,
    wet: 92,
    racecraft: 94,
    potential: 95,
  },

  "lewis-hamilton": {
    key: "lewis-hamilton",
    name: "Lewis Hamilton",
    teamKey: "ferrari",
    image: driverImage("ferrari", "lewham01"),
    pace: 93,
    consistency: 93,
    wet: 96,
    racecraft: 95,
    potential: 91,
  },

  "max-verstappen": {
    key: "max-verstappen",
    name: "Max Verstappen",
    teamKey: "red-bull",
    image: driverImage("redbullracing", "maxver01"),
    pace: 96,
    consistency: 95,
    wet: 96,
    racecraft: 97,
    potential: 96,
  },

  "isack-hadjar": {
    key: "isack-hadjar",
    name: "Isack Hadjar",
    teamKey: "red-bull",
    image: driverImage("redbullracing", "isahad01"),
    pace: 89,
    consistency: 87,
    wet: 87,
    racecraft: 90,
    potential: 96,
  },

  "george-russell": {
    key: "george-russell",
    name: "George Russell",
    teamKey: "mercedes",
    image: driverImage("mercedes", "georus01"),
    pace: 94,
    consistency: 94,
    wet: 91,
    racecraft: 94,
    potential: 94,
  },

  "kimi-antonelli": {
    key: "kimi-antonelli",
    name: "Kimi Antonelli",
    teamKey: "mercedes",
    image: driverImage("mercedes", "andant01"),
    pace: 95,
    consistency: 90,
    wet: 88,
    racecraft: 92,
    potential: 98,
  },

  "fernando-alonso": {
    key: "fernando-alonso",
    name: "Fernando Alonso",
    teamKey: "aston-martin",
    image: driverImage("astonmartin", "feralo01"),
    pace: 92,
    consistency: 96,
    wet: 96,
    racecraft: 97,
    potential: 85,
  },

  "lance-stroll": {
    key: "lance-stroll",
    name: "Lance Stroll",
    teamKey: "aston-martin",
    image: driverImage("astonmartin", "lanstr01"),
    pace: 84,
    consistency: 85,
    wet: 87,
    racecraft: 85,
    potential: 82,
  },

  "pierre-gasly": {
    key: "pierre-gasly",
    name: "Pierre Gasly",
    teamKey: "alpine",
    image: driverImage("alpine", "piegas01"),
    pace: 89,
    consistency: 90,
    wet: 92,
    racecraft: 90,
    potential: 90,
  },

  "franco-colapinto": {
    key: "franco-colapinto",
    name: "Franco Colapinto",
    teamKey: "alpine",
    image: driverImage("alpine", "fracol01"),
    pace: 86,
    consistency: 84,
    wet: 86,
    racecraft: 87,
    potential: 93,
  },

  "carlos-sainz": {
    key: "carlos-sainz",
    name: "Carlos Sainz",
    teamKey: "williams",
    image: driverImage("williams", "carsai01"),
    pace: 91,
    consistency: 93,
    wet: 92,
    racecraft: 93,
    potential: 90,
  },

  "alexander-albon": {
    key: "alexander-albon",
    name: "Alexander Albon",
    teamKey: "williams",
    image: driverImage("williams", "alealb01"),
    pace: 90,
    consistency: 91,
    wet: 89,
    racecraft: 92,
    potential: 89,
  },

  "esteban-ocon": {
    key: "esteban-ocon",
    name: "Esteban Ocon",
    teamKey: "haas",
    image: driverImage("haas", "estoco01"),
    pace: 88,
    consistency: 89,
    wet: 90,
    racecraft: 90,
    potential: 87,
  },

  "oliver-bearman": {
    key: "oliver-bearman",
    name: "Oliver Bearman",
    teamKey: "haas",
    image: driverImage("haas", "olibea01"),
    pace: 88,
    consistency: 86,
    wet: 85,
    racecraft: 89,
    potential: 95,
  },

  "liam-lawson": {
    key: "liam-lawson",
    name: "Liam Lawson",
    teamKey: "racing-bulls",
    image: driverImage("racingbulls", "lialaw01"),
    pace: 87,
    consistency: 86,
    wet: 85,
    racecraft: 88,
    potential: 93,
  },

  "arvid-lindblad": {
    key: "arvid-lindblad",
    name: "Arvid Lindblad",
    teamKey: "racing-bulls",
    image: driverImage("racingbulls", "arvlin01"),
    pace: 86,
    consistency: 84,
    wet: 83,
    racecraft: 86,
    potential: 97,
  },

  "nico-hulkenberg": {
    key: "nico-hulkenberg",
    name: "Nico Hulkenberg",
    teamKey: "audi",
    image: driverImage("audi", "nichul01"),
    pace: 88,
    consistency: 91,
    wet: 89,
    racecraft: 90,
    potential: 85,
  },

  "gabriel-bortoleto": {
    key: "gabriel-bortoleto",
    name: "Gabriel Bortoleto",
    teamKey: "audi",
    image: driverImage("audi", "gabbor01"),
    pace: 87,
    consistency: 86,
    wet: 84,
    racecraft: 88,
    potential: 94,
  },

  "sergio-perez": {
    key: "sergio-perez",
    name: "Sergio Perez",
    teamKey: "cadillac",
    image: driverImage("cadillac", "serper01"),
    pace: 87,
    consistency: 91,
    wet: 92,
    racecraft: 91,
    potential: 84,
  },

  "valtteri-bottas": {
    key: "valtteri-bottas",
    name: "Valtteri Bottas",
    teamKey: "cadillac",
    image: driverImage("cadillac", "valbot01"),
    pace: 88,
    consistency: 93,
    wet: 90,
    racecraft: 91,
    potential: 83,
  },
};

const RACE_CALENDAR = [
  { round: 1, name: "Bahrain GP", country: "Bahrain" },
  { round: 2, name: "Saudi Arabian GP", country: "Saudi Arabia" },
  { round: 3, name: "Australian GP", country: "Australia" },
  { round: 4, name: "Japanese GP", country: "Japan" },
  { round: 5, name: "Monaco GP", country: "Monaco" },
  { round: 6, name: "British GP", country: "United Kingdom" },
  { round: 7, name: "Belgian GP", country: "Belgium" },
  { round: 8, name: "Italian GP", country: "Italy" },
  { round: 9, name: "Singapore GP", country: "Singapore" },
  { round: 10, name: "Türkiye GP", country: "Türkiye" },
];

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { lobbyId } = await context.params;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Giriş yapmalısın." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    const {
      data: lobby,
      error: lobbyError,
    } = await admin
      .from("manager_lobbies")
      .select(`
        id,
        name,
        created_by,
        status,
        ai_difficulty
      `)
      .eq("id", lobbyId)
      .maybeSingle();

    if (lobbyError || !lobby) {
      return NextResponse.json(
        { error: "Lobi bulunamadı." },
        { status: 404 }
      );
    }

    if (
      lobby.status !== "active" &&
      lobby.status !== "finished"
    ) {
      return NextResponse.json(
        { error: "Manager sezonu henüz başlamadı." },
        { status: 400 }
      );
    }

    const {
      data: members,
      error: membersError,
    } = await admin
      .from("manager_lobby_members")
      .select(`
        id,
        user_id,
        status,
        team_key,
        driver_key
      `)
      .eq("lobby_id", lobbyId)
      .eq("status", "active");

    if (membersError) {
      return NextResponse.json(
        { error: "Lobi üyeleri alınamadı." },
        { status: 500 }
      );
    }

    const currentMember =
      members?.find(
        (member) =>
          member.user_id === user.id
      );

    if (!currentMember) {
      return NextResponse.json(
        {
          error:
            "Bu Manager sezonunun aktif üyesi değilsin.",
        },
        { status: 403 }
      );
    }

    let {
      data: season,
      error: seasonError,
    } = await admin
      .from("manager_seasons")
      .select(`
        id,
        lobby_id,
        season_number,
        current_round,
        status,
        created_at,
        updated_at
      `)
      .eq("lobby_id", lobbyId)
      .maybeSingle();

    if (seasonError) {
      return NextResponse.json(
        { error: seasonError.message },
        { status: 500 }
      );
    }

    if (!season) {
      const {
        data: createdSeason,
        error: createSeasonError,
      } = await admin
        .from("manager_seasons")
        .insert({
          lobby_id: lobbyId,
          season_number: 1,
          current_round: 1,
          status: "active",
        })
        .select()
        .single();

      if (createSeasonError) {
        return NextResponse.json(
          { error: createSeasonError.message },
          { status: 500 }
        );
      }

      season = createdSeason;
    }

    const {
      error: calendarError,
    } = await admin
      .from("manager_races")
      .upsert(
        RACE_CALENDAR.map(
          (race) => ({
            lobby_id: lobbyId,
            round: race.round,
            name: race.name,
            country: race.country,
            status: "scheduled",
          })
        ),
        {
          onConflict: "lobby_id,round",
          ignoreDuplicates: true,
        }
      );

    if (calendarError) {
      return NextResponse.json(
        { error: calendarError.message },
        { status: 500 }
      );
    }

    /*
      TÜM TEAM STATE'LER.
      BOTLAR DA BURADA.
    */

    let {
      data: teamStates,
      error: statesError,
    } = await admin
      .from("manager_team_states")
      .select(`
        id,
        lobby_id,
        user_id,
        team_key,
        driver_key,
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
        is_bot,
        bot_key,
        bot_name,
        ai_difficulty,
        created_at,
        updated_at
      `)
      .eq("lobby_id", lobbyId);

    if (statesError) {
      return NextResponse.json(
        { error: statesError.message },
        { status: 500 }
      );
    }

    /*
      EKSİK İNSAN STATE'LERİNİ
      OLUŞTUR.
    */

    for (const member of members ?? []) {
      if (!member.team_key) {
        continue;
      }

      const existing =
        teamStates?.find(
          (state) =>
            !state.is_bot &&
            state.user_id === member.user_id
        );

      if (!existing) {
        const team =
          TEAM_DATA[member.team_key];

        const {
          error: insertError,
        } = await admin
          .from("manager_team_states")
          .insert({
            lobby_id: lobbyId,
            user_id: member.user_id,
            team_key: member.team_key,
            driver_key: member.driver_key ?? null,

            budget: STARTING_BUDGET,

            team_rating:
              team?.rating ?? 70,

            season_points: 0,
            wins: 0,
            podiums: 0,

            aero_level: 1,
            chassis_level: 1,
            power_level: 1,
            reliability_level: 1,

            total_spent: 0,

            is_bot: false,
            bot_key: null,
            bot_name: null,
            ai_difficulty: null,
          });

        if (insertError) {
          return NextResponse.json(
            { error: insertError.message },
            { status: 500 }
          );
        }

        continue;
      }

      if (
        existing.team_key !== member.team_key ||
        existing.driver_key !== member.driver_key
      ) {
        const {
          error: syncError,
        } = await admin
          .from("manager_team_states")
          .update({
            team_key: member.team_key,
            driver_key: member.driver_key ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (syncError) {
          return NextResponse.json(
            { error: syncError.message },
            { status: 500 }
          );
        }
      }
    }

    /*
      STATE'LERİ YENİDEN AL.
    */

    const {
      data: refreshedStates,
      error: refreshedError,
    } = await admin
      .from("manager_team_states")
      .select(`
        id,
        lobby_id,
        user_id,
        team_key,
        driver_key,
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
        is_bot,
        bot_key,
        bot_name,
        ai_difficulty,
        created_at,
        updated_at
      `)
      .eq("lobby_id", lobbyId);

    if (refreshedError) {
      return NextResponse.json(
        { error: refreshedError.message },
        { status: 500 }
      );
    }

    teamStates = refreshedStates ?? [];

    const {
      data: races,
      error: racesError,
    } = await admin
      .from("manager_races")
      .select(`
        id,
        round,
        name,
        country,
        status,
        completed_at
      `)
      .eq("lobby_id", lobbyId)
      .order("round", {
        ascending: true,
      });

    if (racesError) {
      return NextResponse.json(
        { error: racesError.message },
        { status: 500 }
      );
    }

    const humanIds =
      (members ?? []).map(
        (member) => member.user_id
      );

    let profiles: {
      id: string;
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
    }[] = [];

    if (humanIds.length > 0) {
      const {
        data: profileRows,
      } = await admin
        .from("profiles")
        .select(`
          id,
          display_name,
          username,
          avatar_url
        `)
        .in("id", humanIds);

      profiles = profileRows ?? [];
    }

    /*
      BOTLARI DA STANDINGS'E EKLE.
      Client tarafında user_id string
      beklediği için botlarda bot_key
      kullanıyoruz.
    */

    const standings =
      [...(teamStates ?? [])]
        .sort((a, b) => {
          if (
            Number(b.season_points) !==
            Number(a.season_points)
          ) {
            return (
              Number(b.season_points) -
              Number(a.season_points)
            );
          }

          if (
            Number(b.wins) !==
            Number(a.wins)
          ) {
            return (
              Number(b.wins) -
              Number(a.wins)
            );
          }

          if (
            Number(b.podiums) !==
            Number(a.podiums)
          ) {
            return (
              Number(b.podiums) -
              Number(a.podiums)
            );
          }

          return (
            Number(b.team_rating) -
            Number(a.team_rating)
          );
        })
        .map((state, index) => {
          const isBot =
            !!state.is_bot;

          const participantId =
            isBot
              ? state.bot_key
              : state.user_id;

          const profile =
            isBot
              ? {
                  id:
                    state.bot_key ??
                    `bot-${state.id}`,

                  display_name:
                    state.bot_name ??
                    "AI Manager",

                  username: null,
                  avatar_url: null,
                }
              : profiles.find(
                  (item) =>
                    item.id ===
                    state.user_id
                ) ?? null;

          const driver =
            state.driver_key
              ? DRIVERS[state.driver_key] ??
                null
              : null;

          return {
            ...state,

            user_id:
              participantId ??
              state.id,

            position:
              index + 1,

            teamName:
              TEAM_DATA[state.team_key]
                ?.name ??
              state.team_key,

            teamColor:
              TEAM_DATA[state.team_key]
                ?.color ??
              "#ffffff",

            driver,

            profile,
          };
        });

    const currentTeamState =
      teamStates.find(
        (state) =>
          !state.is_bot &&
          state.user_id === user.id
      ) ?? null;

    const currentDriver =
      currentTeamState?.driver_key
        ? DRIVERS[
            currentTeamState.driver_key
          ] ?? null
        : null;

    const currentTeam =
      currentTeamState
        ? {
            key:
              currentTeamState.team_key,

            name:
              TEAM_DATA[
                currentTeamState.team_key
              ]?.name ??
              currentTeamState.team_key,

            color:
              TEAM_DATA[
                currentTeamState.team_key
              ]?.color ??
              "#ffffff",
          }
        : null;

    const nextRace =
      races?.find(
        (race) =>
          race.round ===
            season?.current_round &&
          race.status !== "finished"
      ) ?? null;

    return NextResponse.json({
      ok: true,

      lobby,
      season,

      races: races ?? [],
      nextRace,

      standings,

      currentUserId: user.id,

      isOwner:
        lobby.created_by === user.id,

      currentTeamState,
      currentTeam,
      currentDriver,

      aiDifficulty:
        lobby.ai_difficulty ??
        "normal",

      botCount:
        teamStates.filter(
          (state) =>
            state.is_bot
        ).length,
    });
  } catch (error) {
    console.error(
      "MANAGER GAME GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Manager Dashboard yüklenemedi.",
      },
      {
        status: 500,
      }
    );
  }
}