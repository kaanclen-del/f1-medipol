import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(
  _request: Request,
  context: {
    params: Promise<{
      userId: string;
    }>;
  }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Takip etmek için giriş yapmalısın.",
        },
        { status: 401 }
      );
    }

    const { userId } = await context.params;

    if (!userId) {
      return NextResponse.json(
        {
          error: "Kullanıcı ID bulunamadı.",
        },
        { status: 400 }
      );
    }

    if (userId === user.id) {
      return NextResponse.json(
        {
          error: "Kendini takip edemezsin.",
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const {
      data: targetProfile,
      error: profileError,
    } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !targetProfile) {
      return NextResponse.json(
        {
          error: "Kullanıcı bulunamadı.",
        },
        { status: 404 }
      );
    }

    const {
      data: existingFollow,
      error: followCheckError,
    } = await admin
      .from("paddock_follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .maybeSingle();

    if (followCheckError) {
      console.error(
        "PADDOCK FOLLOW CHECK ERROR:",
        followCheckError
      );

      return NextResponse.json(
        {
          error:
            "Takip durumu kontrol edilemedi.",
        },
        { status: 500 }
      );
    }

    let following = false;

    if (existingFollow) {
      const { error: deleteError } =
        await admin
          .from("paddock_follows")
          .delete()
          .eq("id", existingFollow.id);

      if (deleteError) {
        console.error(
          "PADDOCK FOLLOW DELETE ERROR:",
          deleteError
        );

        return NextResponse.json(
          {
            error:
              deleteError.message ||
              "Takip bırakılamadı.",
          },
          { status: 500 }
        );
      }

      following = false;
    } else {
      const { error: insertError } =
        await admin
          .from("paddock_follows")
          .insert({
            follower_id: user.id,
            following_id: userId,
          });

      if (insertError) {
        console.error(
          "PADDOCK FOLLOW CREATE ERROR:",
          insertError
        );

        return NextResponse.json(
          {
            error:
              insertError.message ||
              "Kullanıcı takip edilemedi.",
          },
          { status: 500 }
        );
      }

      following = true;
    }

    const {
      count: followerCount,
      error: followerCountError,
    } = await admin
      .from("paddock_follows")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("following_id", userId);

    if (followerCountError) {
      console.error(
        "PADDOCK FOLLOWER COUNT ERROR:",
        followerCountError
      );
    }

    return NextResponse.json({
      ok: true,
      following,
      followerCount: followerCount ?? 0,
    });
  } catch (error) {
    console.error(
      "PADDOCK FOLLOW ERROR:",
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