import { createAdminClient } from "@/utils/supabase/admin";

const STALE_AFTER_MS = 30 * 1000;

export async function cleanupManagerLobbies(
  onlyLobbyId?: string
) {
  const admin = createAdminClient();

  const staleBefore = new Date(
    Date.now() - STALE_AFTER_MS
  ).toISOString();

  let staleQuery = admin
    .from("manager_lobby_members")
    .select(`
      id,
      lobby_id,
      user_id,
      role,
      last_seen
    `)
    .eq("status", "active")
    .lt("last_seen", staleBefore);

  if (onlyLobbyId) {
    staleQuery = staleQuery.eq(
      "lobby_id",
      onlyLobbyId
    );
  }

  const {
    data: staleMembers,
    error: staleError,
  } = await staleQuery;

  if (staleError) {
    console.error(
      "MANAGER STALE MEMBER LOOKUP ERROR:",
      staleError
    );

    return;
  }

  if (!staleMembers?.length) {
    return;
  }

  const lobbyIds = [
    ...new Set(
      staleMembers.map(
        (member) => member.lobby_id
      )
    ),
  ];

  for (const lobbyId of lobbyIds) {
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
      continue;
    }

    /*
      Şimdilik otomatik temizlik yalnızca
      oyun başlamamış waiting lobilerinde çalışıyor.
    */
    if (lobby.status !== "waiting") {
      continue;
    }

    const staleIds = staleMembers
      .filter(
        (member) =>
          member.lobby_id === lobbyId
      )
      .map((member) => member.id);

    if (staleIds.length > 0) {
      const { error: leaveError } =
        await admin
          .from("manager_lobby_members")
          .update({
            status: "left",
            is_ready: false,
            role: "member",
          })
          .in("id", staleIds);

      if (leaveError) {
        console.error(
          "MANAGER STALE MEMBER CLEANUP ERROR:",
          leaveError
        );

        continue;
      }
    }

    const {
      data: remainingMembers,
      error: remainingError,
    } = await admin
      .from("manager_lobby_members")
      .select(`
        id,
        user_id,
        role,
        joined_at
      `)
      .eq("lobby_id", lobbyId)
      .eq("status", "active")
      .order("joined_at", {
        ascending: true,
      });

    if (remainingError) {
      console.error(
        "MANAGER REMAINING MEMBER ERROR:",
        remainingError
      );

      continue;
    }

    /*
      Lobide aktif kimse kalmadıysa
      lobiyi tamamen sil.
    */
    if (
      !remainingMembers ||
      remainingMembers.length === 0
    ) {
      const { error: deleteError } =
        await admin
          .from("manager_lobbies")
          .delete()
          .eq("id", lobbyId);

      if (deleteError) {
        console.error(
          "MANAGER EMPTY LOBBY CLEANUP ERROR:",
          deleteError
        );
      }

      continue;
    }

    /*
      Eski lobi sahibi artık aktif değilse
      en eski aktif oyuncuya sahipliği aktar.
    */
    const currentOwnerStillActive =
      remainingMembers.some(
        (member) =>
          member.user_id ===
          lobby.created_by
      );

    if (!currentOwnerStillActive) {
      const newOwner =
        remainingMembers[0];

      const { error: roleError } =
        await admin
          .from("manager_lobby_members")
          .update({
            role: "owner",
          })
          .eq("id", newOwner.id);

      if (roleError) {
        console.error(
          "MANAGER AUTO OWNER ROLE ERROR:",
          roleError
        );

        continue;
      }

      const { error: lobbyOwnerError } =
        await admin
          .from("manager_lobbies")
          .update({
            created_by:
              newOwner.user_id,
          })
          .eq("id", lobbyId);

      if (lobbyOwnerError) {
        console.error(
          "MANAGER AUTO OWNER TRANSFER ERROR:",
          lobbyOwnerError
        );
      }
    }
  }
}