import { NextResponse } from "next/server";

import {
  createClient,
} from "@/utils/supabase/server";

import {
  createAdminClient,
} from "@/utils/supabase/admin";

/* =========================================================
   ADMIN AUTH
   ========================================================= */

async function getAdmin() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        NextResponse.json(
          {
            error:
              "Giriş yapılmamış.",
          },
          {
            status:
              401,
          }
        ),
    };
  }

  const {
    data:
      profile,
    error:
      profileError,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select(
        "is_admin"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile?.is_admin
  ) {
    return {
      error:
        NextResponse.json(
          {
            error:
              "Admin yetkisi gerekiyor.",
          },
          {
            status:
              403,
          }
        ),
    };
  }

  return {
    user,

    admin:
      createAdminClient(),
  };
}

/* =========================================================
   GET

   q:
   kullanıcı arar

   userId:
   tek kullanıcının rozetlerini getirir
   ========================================================= */

export async function GET(
  request: Request
) {
  try {
    const auth =
      await getAdmin();

    if (
      "error" in auth
    ) {
      return auth.error;
    }

    const url =
      new URL(
        request.url
      );

    const query =
      (
        url.searchParams.get(
          "q"
        ) ||
        ""
      ).trim();

    const userId =
      (
        url.searchParams.get(
          "userId"
        ) ||
        ""
      ).trim();

    /* =====================================================
       SELECTED USER
       ===================================================== */

    if (userId) {
      const {
        data:
          profile,
        error:
          profileError,
      } =
        await auth.admin
          .from(
            "profiles"
          )
          .select(`
            id,
            display_name,
            username,
            avatar_url,
            xp,
            level
          `)
          .eq(
            "id",
            userId
          )
          .maybeSingle();

      if (
        profileError
      ) {
        return NextResponse.json(
          {
            error:
              profileError.message,
          },
          {
            status:
              500,
          }
        );
      }

      if (!profile) {
        return NextResponse.json(
          {
            error:
              "Kullanıcı bulunamadı.",
          },
          {
            status:
              404,
          }
        );
      }

      /* ===================================================
         USER AWARDS
         =================================================== */

      const {
        data:
          awards,
        error:
          awardsError,
      } =
        await auth.admin
          .from(
            "user_achievements"
          )
          .select(`
            id,
            user_id,
            achievement_id,
            award_source,
            awarded_by,
            note,
            awarded_at,
            xp_awarded
          `)
          .eq(
            "user_id",
            userId
          )
          .order(
            "awarded_at",
            {
              ascending:
                false,
            }
          );

      if (
        awardsError
      ) {
        return NextResponse.json(
          {
            error:
              awardsError.message,
          },
          {
            status:
              500,
          }
        );
      }

      const achievementIds =
        (
          awards ??
          []
        ).map(
          (
            award
          ) =>
            award.achievement_id
        );

      let achievements:
        {
          id: string;

          slug: string;

          name: string;

          description:
            string | null;

          image_url:
            string | null;

          category: string;

          rarity: string;

          xp_reward: number;

          is_automatic:
            boolean;

          condition_type:
            string;

          condition_value:
            number | null;

          is_published:
            boolean;

          sort_order:
            number;
        }[] =
          [];

      /* ===================================================
         GET ACHIEVEMENT DETAILS
         =================================================== */

      if (
        achievementIds.length >
        0
      ) {
        const {
          data,
          error,
        } =
          await auth.admin
            .from(
              "achievements"
            )
            .select(`
              id,
              slug,
              name,
              description,
              image_url,
              category,
              rarity,
              xp_reward,
              is_automatic,
              condition_type,
              condition_value,
              is_published,
              sort_order
            `)
            .in(
              "id",
              achievementIds
            );

        if (error) {
          return NextResponse.json(
            {
              error:
                error.message,
            },
            {
              status:
                500,
            }
          );
        }

        achievements =
          data ??
          [];
      }

      const achievementMap =
        new Map(
          achievements.map(
            (
              achievement
            ) => [
              achievement.id,
              achievement,
            ]
          )
        );

      return NextResponse.json({
        ok:
          true,

        profile,

        awards:
          (
            awards ??
            []
          ).map(
            (
              award
            ) => ({
              ...award,

              achievement:
                achievementMap.get(
                  award.achievement_id
                ) ??
                null,
            })
          ),
      });
    }

    /* =====================================================
       USER SEARCH
       ===================================================== */

    if (query) {
      const safeQuery =
        query.replace(
          /[%_,()]/g,
          ""
        );

      const {
        data:
          profiles,
        error,
      } =
        await auth.admin
          .from(
            "profiles"
          )
          .select(`
            id,
            display_name,
            username,
            avatar_url,
            xp,
            level
          `)
          .or(
            `display_name.ilike.%${safeQuery}%,username.ilike.%${safeQuery}%`
          )
          .limit(
            12
          );

      if (error) {
        return NextResponse.json(
          {
            error:
              error.message,
          },
          {
            status:
              500,
          }
        );
      }

      return NextResponse.json({
        ok:
          true,

        users:
          profiles ??
          [],
      });
    }

    /* =====================================================
       DEFAULT USER LIST
       ===================================================== */

    const {
      data:
        profiles,
      error,
    } =
      await auth.admin
        .from(
          "profiles"
        )
        .select(`
          id,
          display_name,
          username,
          avatar_url,
          xp,
          level
        `)
        .order(
          "display_name",
          {
            ascending:
              true,
          }
        )
        .limit(
          12
        );

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status:
            500,
        }
      );
    }

    return NextResponse.json({
      ok:
        true,

      users:
        profiles ??
        [],
    });
  } catch (
    error
  ) {
    console.error(
      "ACHIEVEMENT USER GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Kullanıcılar alınamadı.",
      },
      {
        status:
          500,
      }
    );
  }
}

/* =========================================================
   POST
   MANUAL ACHIEVEMENT ASSIGN
   ========================================================= */

export async function POST(
  request: Request
) {
  try {
    const auth =
      await getAdmin();

    if (
      "error" in auth
    ) {
      return auth.error;
    }

    const body =
      await request.json();

    const userId =
      typeof body.userId ===
      "string"
        ? body.userId.trim()
        : "";

    const achievementId =
      typeof body.achievementId ===
      "string"
        ? body.achievementId.trim()
        : "";

    const note =
      typeof body.note ===
      "string"
        ? body.note.trim()
        : "";

    if (
      !userId ||
      !achievementId
    ) {
      return NextResponse.json(
        {
          error:
            "Kullanıcı ve rozet seçmelisin.",
        },
        {
          status:
            400,
        }
      );
    }

    /* =====================================================
       CHECK TARGET USER
       ===================================================== */

    const {
      data:
        targetProfile,
      error:
        targetError,
    } =
      await auth.admin
        .from(
          "profiles"
        )
        .select(
          "id"
        )
        .eq(
          "id",
          userId
        )
        .maybeSingle();

    if (
      targetError
    ) {
      return NextResponse.json(
        {
          error:
            targetError.message,
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !targetProfile
    ) {
      return NextResponse.json(
        {
          error:
            "Kullanıcı bulunamadı.",
        },
        {
          status:
            404,
        }
      );
    }

    /* =====================================================
       ACHIEVEMENT DATA
       ===================================================== */

    const {
      data:
        achievement,
      error:
        achievementError,
    } =
      await auth.admin
        .from(
          "achievements"
        )
        .select(`
          id,
          name,
          xp_reward
        `)
        .eq(
          "id",
          achievementId
        )
        .maybeSingle();

    if (
      achievementError
    ) {
      return NextResponse.json(
        {
          error:
            achievementError.message,
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !achievement
    ) {
      return NextResponse.json(
        {
          error:
            "Başarım bulunamadı.",
        },
        {
          status:
            404,
        }
      );
    }

    const xpReward =
      Math.max(
        Number(
          achievement.xp_reward ??
            0
        ),
        0
      );

    /* =====================================================
       UPSERT AWARD

       Burada XP açık şekilde yazılıyor.
       Aynı rozet daha önce 0 XP kayıtlandıysa
       tekrar verildiğinde düzeltilebilir.
       ===================================================== */

    const {
      data:
        award,
      error:
        awardError,
    } =
      await auth.admin
        .from(
          "user_achievements"
        )
        .upsert(
          {
            user_id:
              userId,

            achievement_id:
              achievementId,

            award_source:
              "manual",

            awarded_by:
              auth.user.id,

            note:
              note ||
              null,

            xp_awarded:
              xpReward,

            awarded_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "user_id,achievement_id",
          }
        )
        .select(`
          id,
          user_id,
          achievement_id,
          award_source,
          awarded_by,
          note,
          xp_awarded,
          awarded_at
        `)
        .single();

    if (
      awardError
    ) {
      console.error(
        "ACHIEVEMENT ASSIGN ERROR:",
        awardError
      );

      return NextResponse.json(
        {
          error:
            awardError.message,
        },
        {
          status:
            500,
        }
      );
    }

    /* =====================================================
       REFRESH XP
       ===================================================== */

    const {
      error:
        refreshError,
    } =
      await auth.admin.rpc(
        "refresh_profile_xp",
        {
          p_user_id:
            userId,
        }
      );

    if (
      refreshError
    ) {
      console.error(
        "PROFILE XP REFRESH ERROR:",
        refreshError
      );
    }

    /* =====================================================
       UPDATED PROFILE
       ===================================================== */

    const {
      data:
        updatedProfile,
    } =
      await auth.admin
        .from(
          "profiles"
        )
        .select(`
          id,
          xp,
          level
        `)
        .eq(
          "id",
          userId
        )
        .maybeSingle();

    return NextResponse.json({
      ok:
        true,

      award,

      achievement: {
        id:
          achievement.id,

        name:
          achievement.name,

        xp_reward:
          xpReward,
      },

      profile:
        updatedProfile,
    });
  } catch (
    error
  ) {
    console.error(
      "ACHIEVEMENT ASSIGN POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Rozet verilemedi.",
      },
      {
        status:
          500,
      }
    );
  }
}

/* =========================================================
   DELETE
   REVOKE ACHIEVEMENT
   ========================================================= */

export async function DELETE(
  request: Request
) {
  try {
    const auth =
      await getAdmin();

    if (
      "error" in auth
    ) {
      return auth.error;
    }

    const body =
      await request.json();

    const userId =
      typeof body.userId ===
      "string"
        ? body.userId.trim()
        : "";

    const achievementId =
      typeof body.achievementId ===
      "string"
        ? body.achievementId.trim()
        : "";

    if (
      !userId ||
      !achievementId
    ) {
      return NextResponse.json(
        {
          error:
            "Kullanıcı veya başarım eksik.",
        },
        {
          status:
            400,
        }
      );
    }

    /* =====================================================
       REMOVE
       ===================================================== */

    const {
      error:
        deleteError,
    } =
      await auth.admin
        .from(
          "user_achievements"
        )
        .delete()
        .eq(
          "user_id",
          userId
        )
        .eq(
          "achievement_id",
          achievementId
        );

    if (
      deleteError
    ) {
      return NextResponse.json(
        {
          error:
            deleteError.message,
        },
        {
          status:
            500,
        }
      );
    }

    /* =====================================================
       REFRESH XP
       ===================================================== */

    const {
      error:
        refreshError,
    } =
      await auth.admin.rpc(
        "refresh_profile_xp",
        {
          p_user_id:
            userId,
        }
      );

    if (
      refreshError
    ) {
      console.error(
        "PROFILE XP REFRESH AFTER REVOKE:",
        refreshError
      );
    }

    /* =====================================================
       UPDATED PROFILE
       ===================================================== */

    const {
      data:
        updatedProfile,
    } =
      await auth.admin
        .from(
          "profiles"
        )
        .select(`
          id,
          xp,
          level
        `)
        .eq(
          "id",
          userId
        )
        .maybeSingle();

    return NextResponse.json({
      ok:
        true,

      profile:
        updatedProfile,
    });
  } catch (
    error
  ) {
    console.error(
      "ACHIEVEMENT REVOKE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Rozet geri alınamadı.",
      },
      {
        status:
          500,
      }
    );
  }
}