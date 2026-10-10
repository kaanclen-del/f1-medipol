import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

async function getAdmin() {
  const supabase =
    await createClient();

  const {
    data: { user },
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
            status: 401,
          }
        ),
    };
  }

  const {
    data: profile,
  } =
    await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

  if (!profile?.is_admin) {
    return {
      error:
        NextResponse.json(
          {
            error:
              "Admin yetkisi gerekiyor.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  return {
    admin:
      createAdminClient(),
  };
}

function getStoragePath(
  url?: string | null
) {
  if (!url) {
    return null;
  }

  const marker =
    "/storage/v1/object/public/board-images/";

  const markerIndex =
    url.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const path =
    url
      .substring(
        markerIndex +
          marker.length
      )
      .split("?")[0];

  try {
    return decodeURIComponent(
      path
    );
  } catch {
    return path;
  }
}

/* ========================================
   PATCH
   - Bilgi düzenleme
   - Görsel değiştirme
   - Yayın durumu
   - Yukarı / aşağı taşıma
   ======================================== */

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

    if ("error" in auth) {
      return auth.error;
    }

    const {
      id,
    } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Yönetim kurulu kaydı ID bulunamadı.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      await request.json();

    /* ============================
       SIRALAMA TAŞIMA
       ============================ */

    if (
      body.action === "move"
    ) {
      const direction =
        body.direction;

      if (
        direction !== "up" &&
        direction !== "down"
      ) {
        return NextResponse.json(
          {
            error:
              "Geçersiz taşıma yönü.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data: members,
        error:
          membersError,
      } =
        await auth.admin
          .from(
            "board_members"
          )
          .select(
            `
              id,
              sort_order,
              created_at
            `
          )
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
                true,
            }
          );

      if (
        membersError
      ) {
        return NextResponse.json(
          {
            error:
              membersError.message,
          },
          {
            status: 500,
          }
        );
      }

      const list =
        members ?? [];

      const index =
        list.findIndex(
          (member) =>
            member.id === id
        );

      if (
        index === -1
      ) {
        return NextResponse.json(
          {
            error:
              "Yönetim kurulu üyesi bulunamadı.",
          },
          {
            status: 404,
          }
        );
      }

      const targetIndex =
        direction === "up"
          ? index - 1
          : index + 1;

      if (
        targetIndex < 0 ||
        targetIndex >=
          list.length
      ) {
        return NextResponse.json({
          ok: true,
          unchanged: true,
        });
      }

      const reordered =
        [...list];

      const [
        current,
      ] =
        reordered.splice(
          index,
          1
        );

      reordered.splice(
        targetIndex,
        0,
        current
      );

      /*
        Sıralamayı temiz biçimde
        1,2,3,4... olarak yeniden yaz.
      */

      for (
        let i = 0;
        i <
        reordered.length;
        i++
      ) {
        const {
          error,
        } =
          await auth.admin
            .from(
              "board_members"
            )
            .update({
              sort_order:
                i + 1,
            })
            .eq(
              "id",
              reordered[i].id
            );

        if (error) {
          return NextResponse.json(
            {
              error:
                error.message,
            },
            {
              status: 500,
            }
          );
        }
      }

      return NextResponse.json({
        ok: true,
      });
    }

    /* ============================
       NORMAL DÜZENLEME
       ============================ */

    const {
      data:
        existingMember,
      error:
        existingError,
    } =
      await auth.admin
        .from(
          "board_members"
        )
        .select(
          `
            id,
            image_url,
            detail_image_url
          `
        )
        .eq(
          "id",
          id
        )
        .single();

    if (
      existingError ||
      !existingMember
    ) {
      return NextResponse.json(
        {
          error:
            "Yönetim kurulu kaydı bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    const updateData:
      Record<
        string,
        string |
          number |
          boolean |
          null
      > = {};

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "name"
      )
    ) {
      updateData.name =
        typeof body.name ===
        "string"
          ? body.name.trim() ||
            null
          : null;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "role"
      )
    ) {
      updateData.role =
        typeof body.role ===
        "string"
          ? body.role.trim() ||
            null
          : null;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "bio"
      )
    ) {
      updateData.bio =
        typeof body.bio ===
        "string"
          ? body.bio.trim() ||
            null
          : null;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "instagramUrl"
      )
    ) {
      updateData.instagram_url =
        typeof body.instagramUrl ===
        "string"
          ? body.instagramUrl.trim() ||
            null
          : null;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "linkedinUrl"
      )
    ) {
      updateData.linkedin_url =
        typeof body.linkedinUrl ===
        "string"
          ? body.linkedinUrl.trim() ||
            null
          : null;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "sortOrder"
      )
    ) {
      const sortOrder =
        Number(
          body.sortOrder
        );

      if (
        !Number.isFinite(
          sortOrder
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Sıra numarası geçersiz.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.sort_order =
        Math.trunc(
          sortOrder
        );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "isPublished"
      )
    ) {
      if (
        typeof body.isPublished !==
        "boolean"
      ) {
        return NextResponse.json(
          {
            error:
              "Yayın durumu geçersiz.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.is_published =
        body.isPublished;
    }

    let newCardImage:
      string | null =
      null;

    let newDetailImage:
      string | null =
      null;

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "imageUrl"
      )
    ) {
      if (
        typeof body.imageUrl !==
          "string" ||
        !body.imageUrl.trim()
      ) {
        return NextResponse.json(
          {
            error:
              "Dikey kart görseli boş olamaz.",
          },
          {
            status: 400,
          }
        );
      }

      newCardImage =
        body.imageUrl.trim();

      updateData.image_url =
        newCardImage;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "detailImageUrl"
      )
    ) {
      if (
        typeof body.detailImageUrl !==
          "string" ||
        !body.detailImageUrl.trim()
      ) {
        return NextResponse.json(
          {
            error:
              "Geniş profil görseli boş olamaz.",
          },
          {
            status: 400,
          }
        );
      }

      newDetailImage =
        body.detailImageUrl.trim();

      updateData.detail_image_url =
        newDetailImage;
    }

    if (
      Object.keys(
        updateData
      ).length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Güncellenecek bilgi bulunamadı.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data,
      error,
    } =
      await auth.admin
        .from(
          "board_members"
        )
        .update(
          updateData
        )
        .eq(
          "id",
          id
        )
        .select()
        .single();

    if (error) {
      console.error(
        "BOARD UPDATE ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "Yönetim kurulu kaydı güncellenemedi.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      Görsel değiştiyse eski dosyayı
      storage'dan temizle.
    */

    const oldPaths:
      string[] = [];

    if (
      newCardImage &&
      newCardImage !==
        existingMember.image_url
    ) {
      const path =
        getStoragePath(
          existingMember.image_url
        );

      if (path) {
        oldPaths.push(
          path
        );
      }
    }

    if (
      newDetailImage &&
      newDetailImage !==
        existingMember.detail_image_url
    ) {
      const path =
        getStoragePath(
          existingMember.detail_image_url
        );

      if (path) {
        oldPaths.push(
          path
        );
      }
    }

    if (
      oldPaths.length
    ) {
      const {
        error:
          storageError,
      } =
        await auth.admin.storage
          .from(
            "board-images"
          )
          .remove(
            oldPaths
          );

      if (
        storageError
      ) {
        console.error(
          "OLD BOARD IMAGE CLEANUP ERROR:",
          storageError
        );
      }
    }

    return NextResponse.json({
      ok: true,
      member: data,
    });
  } catch (error) {
    console.error(
      "BOARD PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}

/* ========================================
   DELETE
   ======================================== */

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

    if ("error" in auth) {
      return auth.error;
    }

    const {
      id,
    } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Yönetim kurulu kaydı ID bulunamadı.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: member,
      error:
        findError,
    } =
      await auth.admin
        .from(
          "board_members"
        )
        .select(
          `
            id,
            image_url,
            detail_image_url
          `
        )
        .eq(
          "id",
          id
        )
        .single();

    if (
      findError ||
      !member
    ) {
      return NextResponse.json(
        {
          error:
            "Yönetim kurulu kaydı bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      error:
        deleteError,
    } =
      await auth.admin
        .from(
          "board_members"
        )
        .delete()
        .eq(
          "id",
          id
        );

    if (deleteError) {
      return NextResponse.json(
        {
          error:
            deleteError.message,
        },
        {
          status: 500,
        }
      );
    }

    const paths = [
      getStoragePath(
        member.image_url
      ),
      getStoragePath(
        member.detail_image_url
      ),
    ].filter(
      (
        item
      ): item is string =>
        Boolean(item)
    );

    if (
      paths.length
    ) {
      const {
        error:
          storageError,
      } =
        await auth.admin.storage
          .from(
            "board-images"
          )
          .remove(
            paths
          );

      if (
        storageError
      ) {
        console.error(
          "BOARD IMAGE DELETE ERROR:",
          storageError
        );
      }
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "BOARD DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}