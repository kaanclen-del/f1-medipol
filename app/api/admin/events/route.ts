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

function parseTurkeyDate(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}:00+03:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Admin events API çalışıyor.",
  });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Giriş yapılmamış.",
        },
        {
          status: 401,
        }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        {
          error: "Admin yetkisi gerekiyor.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const eventType =
      typeof body.eventType === "string"
        ? body.eventType
        : "other";

    const locationName =
      typeof body.locationName === "string"
        ? body.locationName.trim()
        : "";

    const locationAddress =
      typeof body.locationAddress === "string"
        ? body.locationAddress.trim()
        : "";

    const coverImageUrl =
      typeof body.coverImageUrl === "string"
        ? body.coverImageUrl.trim()
        : "";

    const registrationUrl =
      typeof body.registrationUrl === "string"
        ? body.registrationUrl.trim()
        : "";

    if (!title) {
      return NextResponse.json(
        {
          error: "Etkinlik adı zorunlu.",
        },
        {
          status: 400,
        }
      );
    }

    if (!EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        {
          error: "Geçersiz etkinlik türü.",
        },
        {
          status: 400,
        }
      );
    }

    const startAt = parseTurkeyDate(body.startAt);

    if (!startAt) {
      return NextResponse.json(
        {
          error: "Geçerli bir başlangıç tarihi seç.",
        },
        {
          status: 400,
        }
      );
    }

    const endAt = body.endAt
      ? parseTurkeyDate(body.endAt)
      : null;

    if (body.endAt && !endAt) {
      return NextResponse.json(
        {
          error: "Bitiş tarihi geçersiz.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      endAt &&
      new Date(endAt).getTime() <
        new Date(startAt).getTime()
    ) {
      return NextResponse.json(
        {
          error:
            "Bitiş tarihi başlangıç tarihinden önce olamaz.",
        },
        {
          status: 400,
        }
      );
    }

    const admin = createAdminClient();

    if (body.featured === true) {
      const { error: featuredError } = await admin
        .from("events")
        .update({
          featured: false,
        })
        .eq("featured", true);

      if (featuredError) {
        console.error(
          "FEATURED RESET ERROR:",
          featuredError
        );
      }
    }

    const { data, error } = await admin
      .from("events")
      .insert({
        title,
        description:
          description || null,

        event_type: eventType,

        location_name:
          locationName || null,

        location_address:
          locationAddress || null,

        start_at: startAt,
        end_at: endAt,

        cover_image_url:
          coverImageUrl || null,

        registration_url:
          registrationUrl || null,

        featured:
          body.featured === true,

        is_published:
          body.isPublished === true,
      })
      .select()
      .single();

    if (error) {
      console.error(
        "EVENT INSERT ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "Etkinlik oluşturulamadı.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      event: data,
    });
  } catch (error) {
    console.error(
      "ADMIN EVENTS API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}