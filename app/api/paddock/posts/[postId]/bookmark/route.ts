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
            "Gönderiyi kaydetmek için giriş yapmalısın.",
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
      data: existingBookmark,
      error: bookmarkCheckError,
    } = await admin
      .from("paddock_post_bookmarks")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (bookmarkCheckError) {
      console.error(
        "PADDOCK BOOKMARK CHECK ERROR:",
        bookmarkCheckError
      );

      return NextResponse.json(
        {
          error:
            "Kayıt durumu kontrol edilemedi.",
        },
        { status: 500 }
      );
    }

    let bookmarked = false;

    if (existingBookmark) {
      const { error: deleteError } =
        await admin
          .from("paddock_post_bookmarks")
          .delete()
          .eq("id", existingBookmark.id);

      if (deleteError) {
        console.error(
          "PADDOCK BOOKMARK DELETE ERROR:",
          deleteError
        );

        return NextResponse.json(
          {
            error:
              deleteError.message ||
              "Kayıt kaldırılamadı.",
          },
          { status: 500 }
        );
      }

      bookmarked = false;
    } else {
      const { error: insertError } =
        await admin
          .from("paddock_post_bookmarks")
          .insert({
            post_id: postId,
            user_id: user.id,
          });

      if (insertError) {
        console.error(
          "PADDOCK BOOKMARK CREATE ERROR:",
          insertError
        );

        return NextResponse.json(
          {
            error:
              insertError.message ||
              "Gönderi kaydedilemedi.",
          },
          { status: 500 }
        );
      }

      bookmarked = true;
    }

    return NextResponse.json({
      ok: true,
      bookmarked,
    });
  } catch (error) {
    console.error(
      "PADDOCK BOOKMARK ERROR:",
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