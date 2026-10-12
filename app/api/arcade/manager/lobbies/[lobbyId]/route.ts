import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    lobbyId: string;
  }>;
};

/*
  ============================================================
  GET
  ============================================================

  Lobi bilgilerini,
  aktif oyuncuları,
  oyuncu profillerini,
  mevcut kullanıcıyı
  ve host bilgisini getirir.
*/

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

    const admin =
      createAdminClient();

    /*
      LOBİYİ BUL
    */

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
          error:
            "Lobi bilgileri alınamadı.",
        },
        {
          status: 500,
        }
      );
    }

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

    /*
      AKTİF LOBİ ÜYELERİ
    */

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
      .eq(
        "lobby_id",
        lobby.id
      )
      .eq(
        "status",
        "active"
      )
      .order(
        "joined_at",
        {
          ascending: true,
        }
      );

    if (membersError) {
      console.error(
        "MANAGER LOBBY MEMBERS ERROR:",
        membersError
      );

      return NextResponse.json(
        {
          error:
            "Lobi oyuncuları alınamadı.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      PROFİL ID'LERİ
    */

    const userIds = [
      ...new Set(
        (memberRows ?? []).map(
          (member) =>
            member.user_id
        )
      ),
    ];

    let profiles:
      | {
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
        }[]
      = [];

    /*
      OYUNCU PROFİLLERİ
    */

    if (
      userIds.length > 0
    ) {
      const {
        data,
        error:
          profilesError,
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
          userIds
        );

      if (
        profilesError
      ) {
        console.error(
          "MANAGER LOBBY PROFILES ERROR:",
          profilesError
        );
      } else {
        profiles =
          data ?? [];
      }
    }

    /*
      MEMBER + PROFILE
      BİRLEŞTİR
    */

    const members =
      (
        memberRows ?? []
      ).map(
        (member) => {
          const profile =
            profiles.find(
              (item) =>
                item.id ===
                member.user_id
            ) ?? null;

          return {
            ...member,
            profile,
          };
        }
      );

    /*
      MEVCUT KULLANICI
      LOBİ ÜYESİ Mİ?
    */

    const currentMember =
      user
        ? members.find(
            (member) =>
              member.user_id ===
              user.id
          ) ?? null
        : null;

    /*
      SONUÇ
    */

    return NextResponse.json({
      ok: true,

      lobby,

      members,

      memberCount:
        members.length,

      currentUserId:
        user?.id ?? null,

      currentMember,

      isOwner:
        user?.id ===
        lobby.created_by,
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
      {
        status: 500,
      }
    );
  }
}

/*
  ============================================================
  PATCH
  ============================================================

  İki farklı işlem yapabilir:

  1. Hazır / hazır değil
     {
       isReady: true
     }

  2. Host oyunu başlatır
     {
       action: "start"
     }
*/

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { lobbyId } =
      await context.params;

    /*
      OTURUM
    */

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
            "Bu işlem için giriş yapmalısın.",
        },
        {
          status: 401,
        }
      );
    }

    /*
      BODY
    */

    const body =
      await request.json();

    const admin =
      createAdminClient();

    /*
      LOBİ
    */

    const {
      data: lobby,
      error: lobbyError,
    } = await admin
      .from("manager_lobbies")
      .select(`
        id,
        created_by,
        name,
        status,
        max_players,
        started_at
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

    /*
      KULLANICININ
      LOBİ ÜYELİĞİ
    */

    const {
      data: membership,
      error:
        membershipError,
    } = await admin
      .from(
        "manager_lobby_members"
      )
      .select(`
        id,
        lobby_id,
        user_id,
        role,
        status,
        is_ready
      `)
      .eq(
        "lobby_id",
        lobbyId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    if (
      membershipError ||
      !membership ||
      membership.status !==
        "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Bu lobinin aktif bir üyesi değilsin.",
        },
        {
          status: 403,
        }
      );
    }

    /*
      ========================================================
      OYUNU BAŞLAT
      ========================================================
    */

    if (
      body?.action ===
      "start"
    ) {
      /*
        SADECE HOST
        BAŞLATABİLİR
      */

      if (
        lobby.created_by !==
        user.id
      ) {
        return NextResponse.json(
          {
            error:
              "Oyunu yalnızca lobi sahibi başlatabilir.",
          },
          {
            status: 403,
          }
        );
      }

      /*
        LOBİ HALA
        WAITING OLMALI
      */

      if (
        lobby.status !==
        "waiting"
      ) {
        return NextResponse.json(
          {
            error:
              "Bu lobi artık başlatılabilir durumda değil.",
          },
          {
            status: 400,
          }
        );
      }

      /*
        TÜM AKTİF
        OYUNCULAR
      */

      const {
        data:
          activeMembers,
        error:
          membersError,
      } = await admin
        .from(
          "manager_lobby_members"
        )
        .select(`
          id,
          user_id,
          role,
          status,
          is_ready
        `)
        .eq(
          "lobby_id",
          lobbyId
        )
        .eq(
          "status",
          "active"
        )
        .order(
          "joined_at",
          {
            ascending:
              true,
          }
        );

      if (
        membersError
      ) {
        console.error(
          "MANAGER START MEMBERS ERROR:",
          membersError
        );

        return NextResponse.json(
          {
            error:
              "Oyuncular kontrol edilirken hata oluştu.",
          },
          {
            status: 500,
          }
        );
      }

      const members =
        activeMembers ?? [];

      /*
        EN AZ 2 OYUNCU
      */

      if (
        members.length < 1
      ) {
        return NextResponse.json(
          {
            error:
              "Oyunu başlatmak için en az 2 oyuncu gerekli.",
          },
          {
            status: 400,
          }
        );
      }

      /*
        TÜM OYUNCULAR
        HAZIR MI?
      */

      const notReadyMembers =
        members.filter(
          (member) =>
            !member.is_ready
        );

      if (
        notReadyMembers.length >
        0
      ) {
        return NextResponse.json(
          {
            error:
              "Oyunu başlatmadan önce tüm oyuncular hazır olmalı.",
          },
          {
            status: 400,
          }
        );
      }

      /*
        BAŞLANGIÇ ZAMANI
      */

      const startedAt =
        new Date().toISOString();

      /*
        LOBİYİ
        TEAM SELECTION'A GEÇİR
      */

      const {
        data:
          updatedLobby,
        error:
          startError,
      } = await admin
        .from(
          "manager_lobbies"
        )
        .update({
          status:
            "team_selection",

          started_at:
            startedAt,
        })
        .eq(
          "id",
          lobbyId
        )
        .eq(
          "status",
          "waiting"
        )
        .select(`
          id,
          created_by,
          name,
          status,
          max_players,
          started_at
        `)
        .maybeSingle();

      if (
        startError
      ) {
        console.error(
          "MANAGER START ERROR:",
          startError
        );

        return NextResponse.json(
          {
            error:
              startError.message ||
              "Oyun başlatılırken hata oluştu.",
          },
          {
            status: 500,
          }
        );
      }

      /*
        AYNI ANDA İKİ
        START İSTEĞİ GELİRSE
      */

      if (
        !updatedLobby
      ) {
        return NextResponse.json(
          {
            error:
              "Lobi başka bir işlem tarafından zaten başlatılmış olabilir.",
          },
          {
            status: 409,
          }
        );
      }

      /*
        BAŞARILI
      */

      return NextResponse.json({
        ok: true,

        action:
          "start",

        lobby:
          updatedLobby,

        next:
          `/arcade/manager/lobbies/${lobbyId}/team-select`,
      });
    }

    /*
      ========================================================
      HAZIR / HAZIR DEĞİL
      ========================================================
    */

    if (
      typeof body?.isReady ===
      "boolean"
    ) {
      /*
        OYUN BAŞLADIYSA
        READY DEĞİŞEMEZ
      */

      if (
        lobby.status !==
        "waiting"
      ) {
        return NextResponse.json(
          {
            error:
              "Oyun başladıktan sonra hazır durumu değiştirilemez.",
          },
          {
            status: 400,
          }
        );
      }

      /*
        READY GÜNCELLE
      */

      const {
        data:
          updatedMember,
        error:
          updateError,
      } = await admin
        .from(
          "manager_lobby_members"
        )
        .update({
          is_ready:
            body.isReady,
        })
        .eq(
          "id",
          membership.id
        )
        .select(`
          id,
          lobby_id,
          user_id,
          role,
          status,
          is_ready
        `)
        .single();

      if (
        updateError
      ) {
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
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        ok: true,

        action:
          "ready",

        member:
          updatedMember,
      });
    }

    /*
      TANINMAYAN PATCH
    */

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
      "MANAGER LOBBY PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
  ============================================================
  DELETE
  ============================================================

  Lobiden ayrılma işlemi.

  - Normal oyuncu ayrılır.
  - Host ayrılırsa hostluk devredilir.
  - Son kişi ayrılırsa lobi silinir.
*/

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { lobbyId } =
      await context.params;

    /*
      OTURUM
    */

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
            "Lobiden ayrılmak için giriş yapmalısın.",
        },
        {
          status: 401,
        }
      );
    }

    const admin =
      createAdminClient();

    /*
      LOBİ
    */

    const {
      data: lobby,
      error: lobbyError,
    } = await admin
      .from(
        "manager_lobbies"
      )
      .select(`
        id,
        created_by,
        status
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

    /*
      ŞİMDİLİK SADECE
      WAITING LOBİDEN
      BU YOLLA ÇIKILABİLİR
    */

    if (
      lobby.status !==
      "waiting"
    ) {
      return NextResponse.json(
        {
          error:
            "Oyun başladıktan sonra bu şekilde lobiden ayrılamazsın.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ÜYELİK
    */

    const {
      data: membership,
      error:
        membershipError,
    } = await admin
      .from(
        "manager_lobby_members"
      )
      .select(`
        id,
        user_id,
        role,
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
      .maybeSingle();

    if (
      membershipError ||
      !membership ||
      membership.status !==
        "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Bu lobinin aktif bir üyesi değilsin.",
        },
        {
          status: 403,
        }
      );
    }

    /*
      OYUNCUYU LOBİDEN
      AYRILMIŞ YAP
    */

    const {
      error: leaveError,
    } = await admin
      .from(
        "manager_lobby_members"
      )
      .update({
        status:
          "left",

        is_ready:
          false,

        role:
          "member",
      })
      .eq(
        "id",
        membership.id
      );

    if (
      leaveError
    ) {
      console.error(
        "MANAGER LOBBY LEAVE ERROR:",
        leaveError
      );

      return NextResponse.json(
        {
          error:
            "Lobiden ayrılırken hata oluştu.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      GERİYE KALAN
      AKTİF ÜYELER
    */

    const {
      data:
        remainingMembers,
      error:
        remainingError,
    } = await admin
      .from(
        "manager_lobby_members"
      )
      .select(`
        id,
        user_id,
        joined_at
      `)
      .eq(
        "lobby_id",
        lobbyId
      )
      .eq(
        "status",
        "active"
      )
      .order(
        "joined_at",
        {
          ascending:
            true,
        }
      );

    if (
      remainingError
    ) {
      console.error(
        "MANAGER REMAINING MEMBERS ERROR:",
        remainingError
      );

      return NextResponse.json(
        {
          error:
            "Lobi üyeleri kontrol edilemedi.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      KİMSE KALMADIYSA
      LOBİYİ SİL
    */

    if (
      !remainingMembers ||
      remainingMembers.length ===
        0
    ) {
      const {
        error:
          deleteLobbyError,
      } = await admin
        .from(
          "manager_lobbies"
        )
        .delete()
        .eq(
          "id",
          lobbyId
        );

      if (
        deleteLobbyError
      ) {
        console.error(
          "MANAGER EMPTY LOBBY DELETE ERROR:",
          deleteLobbyError
        );

        return NextResponse.json(
          {
            error:
              "Boş lobi silinemedi.",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        ok: true,

        lobbyDeleted:
          true,

        ownershipTransferred:
          false,
      });
    }

    /*
      AYRILAN KULLANICI
      HOST MUYDU?
    */

    const userWasOwner =
      lobby.created_by ===
        user.id ||
      membership.role ===
        "owner";

    /*
      HOST AYRILDIYSA
      EN ESKİ AKTİF OYUNCUYA
      HOSTLUĞU VER
    */

    if (
      userWasOwner
    ) {
      const newOwner =
        remainingMembers[0];

      /*
        MEMBER ROLE
      */

      const {
        error:
          newOwnerMemberError,
      } = await admin
        .from(
          "manager_lobby_members"
        )
        .update({
          role:
            "owner",
        })
        .eq(
          "id",
          newOwner.id
        );

      if (
        newOwnerMemberError
      ) {
        console.error(
          "MANAGER NEW OWNER MEMBER ERROR:",
          newOwnerMemberError
        );

        return NextResponse.json(
          {
            error:
              "Yeni lobi sahibi atanamadı.",
          },
          {
            status: 500,
          }
        );
      }

      /*
        LOBİ CREATED_BY
      */

      const {
        error:
          newOwnerLobbyError,
      } = await admin
        .from(
          "manager_lobbies"
        )
        .update({
          created_by:
            newOwner.user_id,
        })
        .eq(
          "id",
          lobbyId
        );

      if (
        newOwnerLobbyError
      ) {
        console.error(
          "MANAGER NEW OWNER LOBBY ERROR:",
          newOwnerLobbyError
        );

        return NextResponse.json(
          {
            error:
              "Lobi sahipliği aktarılamadı.",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        ok: true,

        lobbyDeleted:
          false,

        ownershipTransferred:
          true,

        newOwnerId:
          newOwner.user_id,
      });
    }

    /*
      NORMAL OYUNCU
      AYRILDI
    */

    return NextResponse.json({
      ok: true,

      lobbyDeleted:
        false,

      ownershipTransferred:
        false,
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
      {
        status: 500,
      }
    );
  }
}