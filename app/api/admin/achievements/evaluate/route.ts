import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/utils/supabase/server";

import {
  createAdminClient,
} from "@/utils/supabase/admin";

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
      .single();

  if (
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
    admin:
      createAdminClient(),
  };
}

export async function POST() {
  try {
    const auth =
      await getAdmin();

    if (
      "error" in auth
    ) {
      return auth.error;
    }

    const {
      data:
        profiles,
      error:
        profilesError,
    } =
      await auth.admin
        .from(
          "profiles"
        )
        .select(
          "id"
        );

    if (
      profilesError
    ) {
      return NextResponse.json(
        {
          error:
            profilesError.message,
        },
        {
          status:
            500,
        }
      );
    }

    let evaluated =
      0;

    for (
      const profile of
        profiles ??
        []
    ) {
      const {
        error,
      } =
        await auth.admin.rpc(
          "evaluate_user_achievements",
          {
            p_user_id:
              profile.id,
          }
        );

      if (error) {
        console.error(
          "ACHIEVEMENT EVALUATE ERROR:",
          profile.id,
          error
        );

        continue;
      }

      evaluated +=
        1;
    }

    return NextResponse.json({
      ok:
        true,

      evaluated,
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Başarımlar kontrol edilemedi.",
      },
      {
        status:
          500,
      }
    );
  }
}