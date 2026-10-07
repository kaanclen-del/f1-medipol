import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Lobiye katılmak için giriş yapmalısın.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const lobbyId =
      typeof body?.lobbyId === "string"
        ? body.lobbyId.trim()
        : "";

    const joinCode =
      typeof body?.joinCode === "string"
        ? body.joinCode.trim().toUpperCase()
        : "";

    if (!lobbyId && !joinCode) {
      return NextResponse.json(
        {
          error: "Lobi bilgisi bulunamadı.",
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    let lobbyQuery = admin
      .from("manager_lobbies")
      .select(`
        id,
        created_by,
        name,
        join_code,
        visibility,
        mode,
        status,
        max_players
      `);

    if (lobbyId) {
      lobbyQuery = lobbyQuery.eq("id", lobbyId);
    } else {
      lobbyQuery = lobbyQuery.eq("join_code", joinCode);
    }

    const {
      data: lobby,
      error: lobbyError,
    } = await lobbyQuery.maybeSingle();

    if (lobbyError) {
      console.error(
        "MANAGER LOBBY JOIN LOOKUP ERROR:",
        lobbyError
      );

      return NextResponse.json(
        {
          error: "Lobi bulunamadı.",
        },
        { status: 500 }
      );
    }

    if (!lobby) {
      return NextResponse.json(
        {
          error: "Bu koda ait lobi bulunamadı.",
        },
        { status: 404 }
      );
    }

    if (lobby.status !== "waiting") {
      return NextResponse.json(
        {
          error: "Bu lobi artık oyuncu kabul etmiyor.",
        },
        { status: 400 }
      );
    }

    if (
      lobby.visibility === "private" &&
      !joinCode
    ) {
      return NextResponse.json(
        {
          error:
            "Özel lobilere yalnızca davet koduyla katılabilirsin.",
        },
        { status: 403 }
      );
    }

    const {
      data: existingMember,
      error: existingMemberError,
    } = await admin
      .from("manager_lobby_members")
      .select(`
        id,
        role,
        status
      `)
      .eq("lobby_id", lobby.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMemberError) {
      console.error(
        "MANAGER LOBBY MEMBER LOOKUP ERROR:",
        existingMemberError
      );

      return NextResponse.json(
        {
          error: "Üyelik bilgisi kontrol edilemedi.",
        },
        { status: 500 }
      );
    }

    if (existingMember?.status === "active") {
      return NextResponse.json({
        ok: true,
        alreadyJoined: true,
        lobbyId: lobby.id,
        lobbyName: lobby.name,
      });
    }

    if (existingMember?.status === "kicked") {
      return NextResponse.json(
        {
          error:
            "Bu lobiden çıkarıldığın için tekrar katılamazsın.",
        },
        { status: 403 }
      );
    }

    const {
      count: activeMemberCount,
      error: countError,
    } = await admin
      .from("manager_lobby_members")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("lobby_id", lobby.id)
      .eq("status", "active");

    if (countError) {
      console.error(
        "MANAGER LOBBY MEMBER COUNT ERROR:",
        countError
      );

      return NextResponse.json(
        {
          error:
            "Lobideki oyuncu sayısı kontrol edilemedi.",
        },
        { status: 500 }
      );
    }

    if (
      (activeMemberCount ?? 0) >=
      lobby.max_players
    ) {
      return NextResponse.json(
        {
          error: "Bu lobi dolu.",
        },
        { status: 409 }
      );
    }

    if (existingMember) {
      const { error: reactivateError } =
        await admin
          .from("manager_lobby_members")
          .update({
            status: "active",
            joined_at: new Date().toISOString(),
          })
          .eq("id", existingMember.id);

      if (reactivateError) {
        console.error(
          "MANAGER LOBBY REJOIN ERROR:",
          reactivateError
        );

        return NextResponse.json(
          {
            error: "Lobiye tekrar katılınamadı.",
          },
          { status: 500 }
        );
      }
    } else {
      const { error: joinError } = await admin
        .from("manager_lobby_members")
        .insert({
          lobby_id: lobby.id,
          user_id: user.id,
          role: "member",
          status: "active",
        });

      if (joinError) {
        console.error(
          "MANAGER LOBBY JOIN ERROR:",
          joinError
        );

        return NextResponse.json(
          {
            error:
              joinError.message ||
              "Lobiye katılınamadı.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      lobbyId: lobby.id,
      lobbyName: lobby.name,
    });
  } catch (error) {
    console.error(
      "MANAGER LOBBY JOIN ERROR:",
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