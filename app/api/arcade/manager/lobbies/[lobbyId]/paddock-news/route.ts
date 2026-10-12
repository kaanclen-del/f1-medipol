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

  "red-bull":
    "Red Bull Racing",

  mercedes:
    "Mercedes",

  "aston-martin":
    "Aston Martin",

  alpine:
    "Alpine",

  williams:
    "Williams",

  haas:
    "Haas F1 Team",

  "racing-bulls":
    "Racing Bulls",

  audi:
    "Audi",

  cadillac:
    "Cadillac",
};

const DIFFICULTY_NAMES: Record<
  string,
  string
> = {
  easy: "Kolay",
  normal: "Normal",
  hard: "Zor",
  expert: "Uzman",
};

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

    const admin =
      createAdminClient();

    /*
      Kullanıcı gerçekten
      lobinin aktif üyesi mi?
    */

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
      data: logs,
      error: logsError,
    } = await admin
      .from(
        "manager_ai_development_logs"
      )
      .select(`
        id,
        round,
        bot_key,
        bot_name,
        team_key,
        ai_difficulty,

        budget_before,
        budget_after,
        amount_spent,

        rating_before,
        rating_after,

        aero_before,
        aero_after,

        chassis_before,
        chassis_after,

        power_before,
        power_after,

        reliability_before,
        reliability_after,

        created_at
      `)
      .eq(
        "lobby_id",
        lobbyId
      )
      .order(
        "round",
        {
          ascending: false,
        }
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(44);

    if (logsError) {
      return NextResponse.json(
        {
          error:
            logsError.message,
        },
        {
          status: 500,
        }
      );
    }

    const news =
      (logs ?? []).map(
        (log) => {
          const upgrades: {
            key: string;
            name: string;
            before: number;
            after: number;
          }[] = [];

          if (
            log.aero_after >
            log.aero_before
          ) {
            upgrades.push({
              key: "aero",
              name: "Aerodinamik",

              before:
                log.aero_before,

              after:
                log.aero_after,
            });
          }

          if (
            log.chassis_after >
            log.chassis_before
          ) {
            upgrades.push({
              key: "chassis",
              name: "Şasi",

              before:
                log.chassis_before,

              after:
                log.chassis_after,
            });
          }

          if (
            log.power_after >
            log.power_before
          ) {
            upgrades.push({
              key: "power",
              name: "Güç Ünitesi",

              before:
                log.power_before,

              after:
                log.power_after,
            });
          }

          if (
            log.reliability_after >
            log.reliability_before
          ) {
            upgrades.push({
              key:
                "reliability",

              name:
                "Dayanıklılık",

              before:
                log.reliability_before,

              after:
                log.reliability_after,
            });
          }

          return {
            ...log,

            team_name:
              TEAM_NAMES[
                log.team_key
              ] ??
              log.team_key,

            difficulty_name:
              DIFFICULTY_NAMES[
                log.ai_difficulty ??
                  ""
              ] ??
              "AI",

            upgrades,

            developed:
              upgrades.length > 0,

            message:
              upgrades.length > 0
                ? `${TEAM_NAMES[log.team_key] ?? log.team_key} geliştirme paketi getirdi.`
                : `${TEAM_NAMES[log.team_key] ?? log.team_key} bu round R&D yatırımı yapmadı.`,
          };
        }
      );

    return NextResponse.json({
      ok: true,
      news,
    });
  } catch (error) {
    console.error(
      "PADDOCK NEWS GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Paddock haberleri alınamadı.",
      },
      {
        status: 500,
      }
    );
  }
}