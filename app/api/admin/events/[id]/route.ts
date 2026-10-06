import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

const EVENT_TYPES = [
  "watch_party",
  "karting",
  "talk",
  "club",
  "other",
];

function parseTurkeyDate(value: string) {
  const date = new Date(`${value}:00+03:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

async function getAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Giriş yapılmamış." },
        { status: 401 }
      ),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return {
      error: NextResponse.json(
        { error: "Admin yetkisi gerekiyor." },
        { status: 403 }
      ),
    };
  }

  return {
    admin: createAdminClient(),
  };
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const auth = await getAdmin();

    if ("error" in auth) {
      return auth.error;
    }

    const admin = auth.admin;

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Etkinlik ID bulunamadı." },
        { status: 400 }
      );
    }

    const { data: currentEvent, error: currentError } =
      await admin
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

    if (currentError || !currentEvent) {
      return NextResponse.json(
        { error: "Etkinlik bulunamadı." },
        { status: 404 }
      );
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.title === "string") {
      const title = body.title.trim();

      if (!title) {
        return NextResponse.json(
          { error: "Etkinlik adı boş olamaz." },
          { status: 400 }
        );
      }

      updateData.title = title;
    }

    if (typeof body.description === "string") {
      updateData.description =
        body.description.trim() || null;
    }

    if (typeof body.eventType === "string") {
      if (!EVENT_TYPES.includes(body.eventType)) {
        return NextResponse.json(
          { error: "Geçersiz etkinlik türü." },
          { status: 400 }
        );
      }

      updateData.event_type = body.eventType;
    }

    if (typeof body.locationName === "string") {
      updateData.location_name =
        body.locationName.trim() || null;
    }

    if (typeof body.locationAddress === "string") {
      updateData.location_address =
        body.locationAddress.trim() || null;
    }

    if (typeof body.coverImageUrl === "string") {
      updateData.cover_image_url =
        body.coverImageUrl.trim() || null;
    }

    if (typeof body.registrationUrl === "string") {
      updateData.registration_url =
        body.registrationUrl.trim() || null;
    }

    if (typeof body.startAt === "string") {
      const startAt = parseTurkeyDate(body.startAt);

      if (!startAt) {
        return NextResponse.json(
          { error: "Başlangıç tarihi geçersiz." },
          { status: 400 }
        );
      }

      updateData.start_at = startAt;
    }

    if (typeof body.endAt === "string") {
      if (!body.endAt) {
        updateData.end_at = null;
      } else {
        const endAt = parseTurkeyDate(body.endAt);

        if (!endAt) {
          return NextResponse.json(
            { error: "Bitiş tarihi geçersiz." },
            { status: 400 }
          );
        }

        updateData.end_at = endAt;
      }
    }

    if (typeof body.isPublished === "boolean") {
      updateData.is_published = body.isPublished;
    }

    if (typeof body.featured === "boolean") {
      updateData.featured = body.featured;

      if (body.featured) {
        const { error: featuredError } = await admin
          .from("events")
          .update({
            featured: false,
            updated_at: new Date().toISOString(),
          })
          .neq("id", id)
          .eq("featured", true);

        if (featuredError) {
          console.error(
            "FEATURED RESET ERROR:",
            featuredError
          );
        }
      }
    }

    const startValue =
      (updateData.start_at as string | undefined) ??
      currentEvent.start_at;

    const endValue =
      updateData.end_at !== undefined
        ? (updateData.end_at as string | null)
        : currentEvent.end_at;

    if (
      startValue &&
      endValue &&
      new Date(endValue).getTime() <
        new Date(startValue).getTime()
    ) {
      return NextResponse.json(
        {
          error:
            "Bitiş tarihi başlangıç tarihinden önce olamaz.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("events")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("EVENT UPDATE ERROR:", error);

      return NextResponse.json(
        {
          error:
            error.message ||
            "Etkinlik güncellenemedi.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      event: data,
    });
  } catch (error) {
    console.error("EVENT PATCH ERROR:", error);

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
    params: Promise<{ id: string }>;
  }
) {
  try {
    const auth = await getAdmin();

    if ("error" in auth) {
      return auth.error;
    }

    const admin = auth.admin;

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Etkinlik ID bulunamadı." },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("events")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("EVENT DELETE ERROR:", error);

      return NextResponse.json(
        {
          error:
            error.message ||
            "Etkinlik silinemedi.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("EVENT DELETE ERROR:", error);

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