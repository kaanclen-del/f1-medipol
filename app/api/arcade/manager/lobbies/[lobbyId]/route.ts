import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    lobbyId: string;
  }>;
};

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

    const admin = createAdminClient();

    const {
      data: lobby,
      error: lobbyError,
    } = await admin
      .from("manager_lobbies")
      .select(`
        id,
        created_by,
        name,
        join_code,
        visibility,
        mode,
        status,
        max_players,
        created_at,
        started_at
      `)
      .eq("id", lobbyId)
      .maybeSingle();

    if (lobbyError) {
      console.error(
        "MANAGER LOBBY GET ERROR:",
        lobbyError
      );

      return NextResponse.json(
        {
          error: "Lobi bilgileri alınamadı.",
        },
        { status: 500 }
      );
    }

    if (!lobby) {
      return NextResponse.json(
        {
          error: "Lobi bulunamadı.",
        },
        { status: 404 }
      );
    }

    const {
      data: memberRows,
      error: membersError,
    } = await admin
      .from("manager_lobby_members")
      .select(`
        id,
        lobby_id,
        user_id,
        role,
        status,
        is_ready,
        joined_at
      `)
      .eq("lobby_id", lobby.id)
      .eq("status", "active")
      .order("joined_at", {
        ascending: true,
      });

    if (membersError) {
      console.error(
        "MANAGER LOBBY MEMBERS ERROR:",
        membersError
      );

      return NextResponse.json(
        {
          error: "Lobi oyuncuları alınamadı.",
        },
        { status: 500 }
      );
    }

    const userIds = [
      ...new Set(
        (memberRows ?? []).map(
          (member) => member.user_id
        )
      ),
    ];

    let profiles:
      | {
          id: string;
          display_name: string | null;
          username: string | null;
          avatar_url: string | null;
        }[]
      = [];

    if (userIds.length > 0) {
      const {
        data,
        error: profilesError,
      } = await admin
        .from("profiles")
        .select(`
          id,
          display_name,
          username,
          avatar_url
        `)
        .in("id", userIds);

      if (profilesError) {
        console.error(
          "MANAGER LOBBY PROFILES ERROR:",
          profilesError
        );
      } else {
        profiles = data ?? [];
      }
    }

    const members = (memberRows ?? []).map(
      (member) => {
        const profile =
          profiles.find(
            (item) =>
              item.id === member.user_id
          ) ?? null;

        return {
          ...member,
          profile,
        };
      }
    );

    const currentMember =
      user
        ? members.find(
            (member) =>
              member.user_id === user.id
          ) ?? null
        : null;

    return NextResponse.json({
      ok: true,

      lobby,

      members,

      memberCount: members.length,

      currentUserId: user?.id ?? null,

      currentMember,

      isOwner:
        user?.id === lobby.created_by,
    });
  } catch (error) {
    console.error(
      "MANAGER LOBBY GET ERROR:",
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

export async function PATCH(
  request: Request,
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
          error:
            "Hazır durumunu değiştirmek için giriş yapmalısın.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (
      typeof body?.isReady !== "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "Geçerli bir hazır durumu gönderilmedi.",
        },
        { status: 400 }
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
        status
      `)
      .eq("id", lobbyId)
      .maybeSingle();

    if (lobbyError || !lobby) {
      return NextResponse.json(
        {
          error: "Lobi bulunamadı.",
        },
        { status: 404 }
      );
    }

    if (lobby.status !== "waiting") {
      return NextResponse.json(
        {
          error:
            "Oyun başladıktan sonra hazır durumu değiştirilemez.",
        },
        { status: 400 }
      );
    }

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
          error:
            "Bu lobinin aktif bir üyesi değilsin.",
        },
        { status: 403 }
      );
    }

    const {
      data: updatedMember,
      error: updateError,
    } = await admin
      .from("manager_lobby_members")
      .update({
        is_ready: body.isReady,
      })
      .eq("id", membership.id)
      .select(`
        id,
        user_id,
        role,
        status,
        is_ready
      `)
      .single();

    if (updateError) {
      console.error(
        "MANAGER READY UPDATE ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            updateError.message ||
            "Hazır durumu güncellenemedi.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      member: updatedMember,
    });
  } catch (error) {
    console.error(
      "MANAGER READY UPDATE ERROR:",
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

export async function DELETE(
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
          error:
            "Lobiden ayrılmak için giriş yapmalısın.",
        },
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
        created_by,
        status
      `)
      .eq("id", lobbyId)
      .maybeSingle();

    if (lobbyError || !lobby) {
      return NextResponse.json(
        {
          error: "Lobi bulunamadı.",
        },
        { status: 404 }
      );
    }

    if (lobby.status !== "waiting") {
      return NextResponse.json(
        {
          error:
            "Oyun başladıktan sonra bu şekilde lobiden ayrılamazsın.",
        },
        { status: 400 }
      );
    }

    const {
      data: membership,
      error: membershipError,
    } = await admin
      .from("manager_lobby_members")
      .select(`
        id,
        user_id,
        role,
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
          error:
            "Bu lobinin aktif bir üyesi değilsin.",
        },
        { status: 403 }
      );
    }

    const { error: leaveError } =
      await admin
        .from("manager_lobby_members")
        .update({
          status: "left",
          is_ready: false,
          role: "member",
        })
        .eq("id", membership.id);

    if (leaveError) {
      console.error(
        "MANAGER LOBBY LEAVE ERROR:",
        leaveError
      );

      return NextResponse.json(
        {
          error:
            "Lobiden ayrılırken hata oluştu.",
        },
        { status: 500 }
      );
    }

    const {
      data: remainingMembers,
      error: remainingError,
    } = await admin
      .from("manager_lobby_members")
      .select(`
        id,
        user_id,
        joined_at
      `)
      .eq("lobby_id", lobbyId)
      .eq("status", "active")
      .order("joined_at", {
        ascending: true,
      });

    if (remainingError) {
      console.error(
        "MANAGER REMAINING MEMBERS ERROR:",
        remainingError
      );

      return NextResponse.json(
        {
          error:
            "Lobi üyeleri kontrol edilemedi.",
        },
        { status: 500 }
      );
    }

    if (
      !remainingMembers ||
      remainingMembers.length === 0
    ) {
      const { error: deleteLobbyError } =
        await admin
          .from("manager_lobbies")
          .delete()
          .eq("id", lobbyId);

      if (deleteLobbyError) {
        console.error(
          "MANAGER EMPTY LOBBY DELETE ERROR:",
          deleteLobbyError
        );

        return NextResponse.json(
          {
            error:
              "Boş lobi silinemedi.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        lobbyDeleted: true,
      });
    }

    const userWasOwner =
      lobby.created_by === user.id ||
      membership.role === "owner";

    if (userWasOwner) {
      const newOwner =
        remainingMembers[0];

      const {
        error: newOwnerMemberError,
      } = await admin
        .from("manager_lobby_members")
        .update({
          role: "owner",
        })
        .eq("id", newOwner.id);

      if (newOwnerMemberError) {
        console.error(
          "MANAGER NEW OWNER MEMBER ERROR:",
          newOwnerMemberError
        );

        return NextResponse.json(
          {
            error:
              "Yeni lobi sahibi atanamadı.",
          },
          { status: 500 }
        );
      }

      const {
        error: newOwnerLobbyError,
      } = await admin
        .from("manager_lobbies")
        .update({
          created_by:
            newOwner.user_id,
        })
        .eq("id", lobbyId);

      if (newOwnerLobbyError) {
        console.error(
          "MANAGER NEW OWNER LOBBY ERROR:",
          newOwnerLobbyError
        );

        return NextResponse.json(
          {
            error:
              "Lobi sahipliği aktarılamadı.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        lobbyDeleted: false,
        ownershipTransferred: true,
        newOwnerId:
          newOwner.user_id,
      });
    }

    return NextResponse.json({
      ok: true,
      lobbyDeleted: false,
      ownershipTransferred: false,
    });
  } catch (error) {
    console.error(
      "MANAGER LOBBY LEAVE ERROR:",
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