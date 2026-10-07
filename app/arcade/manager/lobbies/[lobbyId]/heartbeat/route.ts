import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    lobbyId: string;
  }>;
};

export async function POST(
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
        {
          error: "Oturum bulunamadı.",
        },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    const {
      data: membership,
      error: membershipError,
    } = await admin
      .from("manager_lobby_members")
      .select(`
        id,
        status
      `)
      .eq("lobby_id", lobbyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      membershipError ||
      !membership ||
      membership.status !== "active"
    ) {
      return NextResponse.json(
        {
          error: "Bu lobinin aktif bir üyesi değilsin.",
        },
        { status: 403 }
      );
    }

    const { error: updateError } = await admin
      .from("manager_lobby_members")
      .update({
        last_seen: new Date().toISOString(),
      })
      .eq("id", membership.id);

    if (updateError) {
      console.error(
        "MANAGER HEARTBEAT ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          error: "Oyuncu durumu güncellenemedi.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "MANAGER HEARTBEAT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}