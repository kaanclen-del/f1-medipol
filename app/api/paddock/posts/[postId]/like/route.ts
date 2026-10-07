import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(
  _request: Request,
  context: {
    params: Promise<{
      postId: string;
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
            "Beğenmek için giriş yapmalısın.",
        },
        { status: 401 }
      );
    }

    const { postId } = await context.params;

    if (!postId) {
      return NextResponse.json(
        {
          error: "Gönderi ID bulunamadı.",
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: post, error: postError } =
      await admin
        .from("paddock_posts")
        .select("id")
        .eq("id", postId)
        .eq("is_published", true)
        .single();

    if (postError || !post) {
      return NextResponse.json(
        {
          error: "Gönderi bulunamadı.",
        },
        { status: 404 }
      );
    }

    const {
      data: existingLike,
      error: existingLikeError,
    } = await admin
      .from("paddock_post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingLikeError) {
      console.error(
        "PADDOCK LIKE CHECK ERROR:",
        existingLikeError
      );

      return NextResponse.json(
        {
          error:
            "Beğeni bilgisi kontrol edilemedi.",
        },
        { status: 500 }
      );
    }

    let liked = false;

    if (existingLike) {
      const { error: deleteError } =
        await admin
          .from("paddock_post_likes")
          .delete()
          .eq("id", existingLike.id);

      if (deleteError) {
        console.error(
          "PADDOCK LIKE DELETE ERROR:",
          deleteError
        );

        return NextResponse.json(
          {
            error:
              deleteError.message ||
              "Beğeni geri alınamadı.",
          },
          { status: 500 }
        );
      }

      liked = false;
    } else {
      const { error: insertError } =
        await admin
          .from("paddock_post_likes")
          .insert({
            post_id: postId,
            user_id: user.id,
          });

      if (insertError) {
        console.error(
          "PADDOCK LIKE CREATE ERROR:",
          insertError
        );

        return NextResponse.json(
          {
            error:
              insertError.message ||
              "Gönderi beğenilemedi.",
          },
          { status: 500 }
        );
      }

      liked = true;
    }

    const {
      count,
      error: countError,
    } = await admin
      .from("paddock_post_likes")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("post_id", postId);

    if (countError) {
      console.error(
        "PADDOCK LIKE COUNT ERROR:",
        countError
      );
    }

    return NextResponse.json({
      ok: true,
      liked,
      likeCount: count ?? 0,
    });
  } catch (error) {
    console.error(
      "PADDOCK LIKE ERROR:",
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