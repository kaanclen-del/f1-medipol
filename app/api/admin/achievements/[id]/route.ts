import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/utils/supabase/server";

import {
  createAdminClient,
} from "@/utils/supabase/admin";

const VALID_RARITIES = [
  "common",
  "rare",
  "epic",
  "legendary",
];

const VALID_CATEGORIES = [
  "achievement",
  "badge",
  "special",
  "event",
];

const VALID_CONDITIONS = [
  "manual",
  "paddock_post_count",
  "prediction_count",
  "prediction_points",
  "best_prediction_score",
];

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

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const auth =
      await getAdmin();

    if (
      "error" in auth
    ) {
      return auth.error;
    }

    const {
      id,
    } =
      await context.params;

    const body =
      await request.json();

    const name =
      typeof body.name ===
      "string"
        ? body.name.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Rozet adı zorunlu.",
        },
        {
          status:
            400,
        }
      );
    }

    const category =
      VALID_CATEGORIES.includes(
        body.category
      )
        ? body.category
        : "achievement";

    const rarity =
      VALID_RARITIES.includes(
        body.rarity
      )
        ? body.rarity
        : "common";

    const conditionType =
      body.isAutomatic ===
        true &&
      VALID_CONDITIONS.includes(
        body.conditionType
      ) &&
      body.conditionType !==
        "manual"
        ? body.conditionType
        : "manual";

    const conditionValue =
      conditionType ===
      "manual"
        ? null
        : Number(
            body.conditionValue
          );

    const xpReward =
      Number(
        body.xpReward ??
          0
      );

    if (
      !Number.isFinite(
        xpReward
      ) ||
      xpReward <
        0 ||
      xpReward >
        100000
    ) {
      return NextResponse.json(
        {
          error:
            "XP ödülü 0 ile 100000 arasında olmalı.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      conditionType !==
        "manual" &&
      (
        !Number.isFinite(
          conditionValue
        ) ||
        Number(
          conditionValue
        ) <
          1
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Geçerli hedef değeri girmelisin.",
        },
        {
          status:
            400,
        }
      );
    }

    const {
      data,
      error,
    } =
      await auth.admin
        .from(
          "achievements"
        )
        .update({
          name,

          description:
            typeof body.description ===
              "string" &&
            body.description.trim()
              ? body.description.trim()
              : null,

          image_url:
            typeof body.imageUrl ===
              "string" &&
            body.imageUrl.trim()
              ? body.imageUrl.trim()
              : null,

          category,

          rarity,

          xp_reward:
            Math.floor(
              xpReward
            ),

          is_automatic:
            conditionType !==
            "manual",

          condition_type:
            conditionType,

          condition_value:
            conditionType ===
            "manual"
              ? null
              : conditionValue,

          is_published:
            body.isPublished !==
            false,

          sort_order:
            Number.isFinite(
              Number(
                body.sortOrder
              )
            )
              ? Number(
                  body.sortOrder
                )
              : 0,
        })
        .eq(
          "id",
          id
        )
        .select()
        .single();

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

      achievement:
        data,
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
            : "Başarım güncellenemedi.",
      },
      {
        status:
          500,
      }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const auth =
      await getAdmin();

    if (
      "error" in auth
    ) {
      return auth.error;
    }

    const {
      id,
    } =
      await context.params;

    const {
      data:
        achievement,
    } =
      await auth.admin
        .from(
          "achievements"
        )
        .select(
          "image_url"
        )
        .eq(
          "id",
          id
        )
        .maybeSingle();

    const {
      error,
    } =
      await auth.admin
        .from(
          "achievements"
        )
        .delete()
        .eq(
          "id",
          id
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

    if (
      achievement?.image_url
    ) {
      try {
        const marker =
          "/storage/v1/object/public/achievement-badges/";

        const index =
          achievement.image_url.indexOf(
            marker
          );

        if (
          index !==
          -1
        ) {
          const path =
            decodeURIComponent(
              achievement.image_url.substring(
                index +
                  marker.length
              )
            );

          if (path) {
            await auth.admin.storage
              .from(
                "achievement-badges"
              )
              .remove([
                path,
              ]);
          }
        }
      } catch (
        error
      ) {
        console.error(
          "BADGE IMAGE DELETE:",
          error
        );
      }
    }

    return NextResponse.json({
      ok:
        true,
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
            : "Başarım silinemedi.",
      },
      {
        status:
          500,
      }
    );
  }
}