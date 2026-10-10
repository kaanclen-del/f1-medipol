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
    user,

    admin:
      createAdminClient(),
  };
}

function createSlug(
  value: string
) {
  return value
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

export async function GET() {
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
        achievements,
      error:
        achievementError,
    } =
      await auth.admin
        .from(
          "achievements"
        )
        .select("*")
        .order(
          "sort_order",
          {
            ascending:
              true,
          }
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );

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

    const {
      data:
        awardedRows,
    } =
      await auth.admin
        .from(
          "user_achievements"
        )
        .select(
          "achievement_id"
        );

    const counts =
      new Map<
        string,
        number
      >();

    for (
      const row of
        awardedRows ??
        []
    ) {
      counts.set(
        row.achievement_id,
        (
          counts.get(
            row.achievement_id
          ) ??
          0
        ) +
          1
      );
    }

    return NextResponse.json({
      ok:
        true,

      achievements:
        (
          achievements ??
          []
        ).map(
          (
            achievement
          ) => ({
            ...achievement,

            award_count:
              counts.get(
                achievement.id
              ) ??
              0,
          })
        ),
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
            : "Başarımlar yüklenemedi.",
      },
      {
        status:
          500,
      }
    );
  }
}

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

    const name =
      typeof body.name ===
      "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description ===
      "string"
        ? body.description.trim()
        : "";

    const imageUrl =
      typeof body.imageUrl ===
      "string"
        ? body.imageUrl.trim()
        : "";

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

    const isAutomatic =
      body.isAutomatic ===
      true;

    const conditionType =
      isAutomatic &&
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

    const sortOrder =
      Number.isFinite(
        Number(
          body.sortOrder
        )
      )
        ? Number(
            body.sortOrder
          )
        : 0;

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
            "Otomatik başarım için geçerli hedef değeri gir.",
        },
        {
          status:
            400,
        }
      );
    }

    let slug =
      createSlug(
        name
      );

    if (!slug) {
      slug =
        `achievement-${Date.now()}`;
    }

    const {
      data:
        existing,
    } =
      await auth.admin
        .from(
          "achievements"
        )
        .select(
          "id"
        )
        .eq(
          "slug",
          slug
        )
        .maybeSingle();

    if (existing) {
      slug =
        `${slug}-${Date.now()}`;
    }

    const {
      data,
      error,
    } =
      await auth.admin
        .from(
          "achievements"
        )
        .insert({
          slug,

          name,

          description:
            description ||
            null,

          image_url:
            imageUrl ||
            null,

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

          condition_config:
            {},

          is_published:
            body.isPublished !==
            false,

          sort_order:
            sortOrder,
        })
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
            : "Başarım oluşturulamadı.",
      },
      {
        status:
          500,
      }
    );
  }
}