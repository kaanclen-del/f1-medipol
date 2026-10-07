import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      postId: string;
    }>;
  }
) {
  try {
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

    const { data: comments, error: commentsError } =
      await admin
        .from("paddock_comments")
        .select(
          `
            id,
            post_id,
            user_id,
            content,
            created_at
          `
        )
        .eq("post_id", postId)
        .order("created_at", {
          ascending: true,
        });

    if (commentsError) {
      console.error(
        "PADDOCK COMMENTS GET ERROR:",
        commentsError
      );

      return NextResponse.json(
        {
          error: "Yorumlar yüklenemedi.",
        },
        { status: 500 }
      );
    }

    const userIds = [
      ...new Set(
        (comments ?? []).map(
          (comment) => comment.user_id
        )
      ),
    ];

    let profiles: {
      id: string;
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
      is_admin: boolean;
    }[] = [];

    if (userIds.length > 0) {
      const { data, error: profilesError } =
        await admin
          .from("profiles")
          .select(
            `
              id,
              username,
              display_name,
              avatar_url,
              is_admin
            `
          )
          .in("id", userIds);

      if (profilesError) {
        console.error(
          "PADDOCK COMMENT PROFILES ERROR:",
          profilesError
        );
      } else {
        profiles = data ?? [];
      }
    }

    const result = (comments ?? []).map(
      (comment) => ({
        ...comment,

        profile:
          profiles.find(
            (profile) =>
              profile.id === comment.user_id
          ) ?? null,
      })
    );

    return NextResponse.json({
      ok: true,
      comments: result,
    });
  } catch (error) {
    console.error(
      "PADDOCK COMMENTS GET ERROR:",
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

export async function POST(
  request: Request,
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
            "Yorum yapmak için giriş yapmalısın.",
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

    const body = await request.json();

    const content =
      typeof body?.content === "string"
        ? body.content.trim()
        : "";

    if (!content) {
      return NextResponse.json(
        {
          error: "Yorum boş olamaz.",
        },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        {
          error:
            "Yorum en fazla 500 karakter olabilir.",
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
      data: comment,
      error: insertError,
    } = await admin
      .from("paddock_comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
      })
      .select(
        `
          id,
          post_id,
          user_id,
          content,
          created_at
        `
      )
      .single();

    if (insertError || !comment) {
      console.error(
        "PADDOCK COMMENT CREATE ERROR:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            insertError?.message ||
            "Yorum eklenemedi.",
        },
        { status: 500 }
      );
    }

    const { data: profile } = await admin
      .from("profiles")
      .select(
        `
          id,
          username,
          display_name,
          avatar_url,
          is_admin
        `
      )
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,

      comment: {
        ...comment,
        profile: profile ?? null,
      },
    });
  } catch (error) {
    console.error(
      "PADDOCK COMMENT POST ERROR:",
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