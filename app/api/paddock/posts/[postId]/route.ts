import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

function getStoragePathFromUrl(url: string) {
  const marker =
    "/storage/v1/object/public/paddock-media/";

  const markerIndex = url.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const path = url.slice(
    markerIndex + marker.length
  );

  if (!path) {
    return null;
  }

  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export async function PATCH(
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
            "Bu işlem için giriş yapmalısın.",
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

    const {
      data: currentProfile,
      error: profileError,
    } = await admin
      .from("profiles")
      .select("id, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !currentProfile) {
      return NextResponse.json(
        {
          error:
            "Kullanıcı profili bulunamadı.",
        },
        { status: 403 }
      );
    }

    if (!currentProfile.is_admin) {
      return NextResponse.json(
        {
          error:
            "Gönderi sabitleme yetkin yok.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (
      typeof body?.isPinned !== "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "Geçerli bir sabitleme durumu gönderilmedi.",
        },
        { status: 400 }
      );
    }

    const {
      data: post,
      error: postError,
    } = await admin
      .from("paddock_posts")
      .select("id")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      console.error(
        "PADDOCK POST FIND ERROR:",
        postError
      );

      return NextResponse.json(
        {
          error:
            "Gönderi kontrol edilemedi.",
        },
        { status: 500 }
      );
    }

    if (!post) {
      return NextResponse.json(
        {
          error: "Gönderi bulunamadı.",
        },
        { status: 404 }
      );
    }

    const {
      data: updatedPost,
      error: updateError,
    } = await admin
      .from("paddock_posts")
      .update({
        is_pinned: body.isPinned,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", postId)
      .select(
        `
          id,
          is_pinned
        `
      )
      .single();

    if (updateError || !updatedPost) {
      console.error(
        "PADDOCK PIN UPDATE ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            updateError?.message ||
            "Gönderi sabitlenemedi.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      post: updatedPost,
    });
  } catch (error) {
    console.error(
      "PADDOCK POST PATCH ERROR:",
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

export async function DELETE(
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
            "Gönderiyi silmek için giriş yapmalısın.",
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

    const {
      data: currentProfile,
      error: profileError,
    } = await admin
      .from("profiles")
      .select("id, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !currentProfile) {
      return NextResponse.json(
        {
          error:
            "Kullanıcı profili bulunamadı.",
        },
        { status: 403 }
      );
    }

    const {
      data: post,
      error: postError,
    } = await admin
      .from("paddock_posts")
      .select(
        `
          id,
          user_id
        `
      )
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      console.error(
        "PADDOCK POST FIND ERROR:",
        postError
      );

      return NextResponse.json(
        {
          error:
            "Gönderi kontrol edilemedi.",
        },
        { status: 500 }
      );
    }

    if (!post) {
      return NextResponse.json(
        {
          error: "Gönderi bulunamadı.",
        },
        { status: 404 }
      );
    }

    const ownsPost =
      post.user_id === user.id;

    const isAdmin =
      Boolean(currentProfile.is_admin);

    if (!ownsPost && !isAdmin) {
      return NextResponse.json(
        {
          error:
            "Bu gönderiyi silme yetkin yok.",
        },
        { status: 403 }
      );
    }

    const {
      data: mediaRows,
      error: mediaError,
    } = await admin
      .from("paddock_post_media")
      .select("media_url")
      .eq("post_id", postId);

    if (mediaError) {
      console.error(
        "PADDOCK MEDIA READ ERROR:",
        mediaError
      );
    }

    const storagePaths = (
      mediaRows ?? []
    )
      .map((item) =>
        getStoragePathFromUrl(
          item.media_url
        )
      )
      .filter(
        (path): path is string =>
          Boolean(path)
      );

    const { error: deleteError } =
      await admin
        .from("paddock_posts")
        .delete()
        .eq("id", postId);

    if (deleteError) {
      console.error(
        "PADDOCK POST DELETE ERROR:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            deleteError.message ||
            "Gönderi silinemedi.",
        },
        { status: 500 }
      );
    }

    if (storagePaths.length > 0) {
      const {
        error: storageDeleteError,
      } = await admin.storage
        .from("paddock-media")
        .remove(storagePaths);

      if (storageDeleteError) {
        console.error(
          "PADDOCK STORAGE DELETE ERROR:",
          storageDeleteError
        );
      }
    }

    return NextResponse.json({
      ok: true,
      deleted: true,
    });
  } catch (error) {
    console.error(
      "PADDOCK POST DELETE ERROR:",
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