import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

function createJoinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 6; i += 1) {
    code += chars[
      Math.floor(Math.random() * chars.length)
    ];
  }

  return code;
}

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data: lobbies, error } = await admin
      .from("manager_lobbies")
      .select(`
        id,
        created_by,
        name,
        visibility,
        mode,
        status,
        max_players,
        created_at
      `)
      .eq("visibility", "public")
      .eq("status", "waiting")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "MANAGER LOBBIES GET ERROR:",
        error
      );

      return NextResponse.json(
        {
          error: "Lobiler alınamadı.",
        },
        { status: 500 }
      );
    }

    const lobbyIds =
      lobbies?.map((lobby) => lobby.id) ?? [];

    const creatorIds = [
      ...new Set(
        (lobbies ?? []).map(
          (lobby) => lobby.created_by
        )
      ),
    ];

    let members:
      | {
          lobby_id: string;
          user_id: string;
          status: string;
        }[]
      = [];

    if (lobbyIds.length > 0) {
      const { data } = await admin
        .from("manager_lobby_members")
        .select(`
          lobby_id,
          user_id,
          status
        `)
        .in("lobby_id", lobbyIds)
        .eq("status", "active");

      members = data ?? [];
    }

    let profiles:
      | {
          id: string;
          display_name: string | null;
          username: string | null;
          avatar_url: string | null;
        }[]
      = [];

    if (creatorIds.length > 0) {
      const { data } = await admin
        .from("profiles")
        .select(`
          id,
          display_name,
          username,
          avatar_url
        `)
        .in("id", creatorIds);

      profiles = data ?? [];
    }

    const result = (lobbies ?? []).map(
      (lobby) => {
        const creator =
          profiles.find(
            (profile) =>
              profile.id === lobby.created_by
          ) ?? null;

        const memberCount = members.filter(
          (member) =>
            member.lobby_id === lobby.id
        ).length;

        return {
          ...lobby,
          member_count: memberCount,
          creator,
        };
      }
    );

    return NextResponse.json({
      ok: true,
      lobbies: result,
    });
  } catch (error) {
    console.error(
      "MANAGER LOBBIES GET ERROR:",
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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Lobi oluşturmak için giriş yapmalısın.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const name =
      typeof body?.name === "string"
        ? body.name.trim()
        : "";

    const visibility =
      body?.visibility === "private"
        ? "private"
        : "public";

    const mode =
      body?.mode === "ranked"
        ? "ranked"
        : "casual";

    const maxPlayers = Number(
      body?.maxPlayers ?? 8
    );

    if (name.length < 3) {
      return NextResponse.json(
        {
          error:
            "Lobi adı en az 3 karakter olmalı.",
        },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        {
          error:
            "Lobi adı en fazla 50 karakter olabilir.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(maxPlayers) ||
      maxPlayers < 2 ||
      maxPlayers > 20
    ) {
      return NextResponse.json(
        {
          error:
            "Oyuncu sayısı 2 ile 20 arasında olmalı.",
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "Profil bulunamadı.",
        },
        { status: 404 }
      );
    }

    let createdLobby:
      | {
          id: string;
          join_code: string;
        }
      | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const joinCode = createJoinCode();

      const {
        data,
        error: lobbyError,
      } = await admin
        .from("manager_lobbies")
        .insert({
          created_by: user.id,
          name,
          join_code: joinCode,
          visibility,
          mode,
          status: "waiting",
          max_players: maxPlayers,
        })
        .select(`
          id,
          join_code
        `)
        .single();

      if (!lobbyError && data) {
        createdLobby = data;
        break;
      }

      if (
        lobbyError &&
        !lobbyError.message
          .toLowerCase()
          .includes("duplicate")
      ) {
        console.error(
          "MANAGER LOBBY CREATE ERROR:",
          lobbyError
        );

        return NextResponse.json(
          {
            error:
              lobbyError.message ||
              "Lobi oluşturulamadı.",
          },
          { status: 500 }
        );
      }
    }

    if (!createdLobby) {
      return NextResponse.json(
        {
          error:
            "Lobi kodu oluşturulamadı. Tekrar dene.",
        },
        { status: 500 }
      );
    }

    const { error: memberError } =
      await admin
        .from("manager_lobby_members")
        .insert({
          lobby_id: createdLobby.id,
          user_id: user.id,
          role: "owner",
          status: "active",
        });

    if (memberError) {
      await admin
        .from("manager_lobbies")
        .delete()
        .eq("id", createdLobby.id);

      console.error(
        "MANAGER LOBBY OWNER ERROR:",
        memberError
      );

      return NextResponse.json(
        {
          error:
            "Lobi oluşturuldu fakat oyuncu eklenemedi.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      lobbyId: createdLobby.id,
      joinCode: createdLobby.join_code,
    });
  } catch (error) {
    console.error(
      "MANAGER LOBBIES POST ERROR:",
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