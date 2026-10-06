import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

const EVENT_TYPES = [
  "watch_party",
  "karting",
  "talk",
  "club",
  "other",
] as const;

type EventType = (typeof EVENT_TYPES)[number];

type CreateEventBody = {
  title?: string;
  description?: string;
  eventType?: string;

  locationName?: string;
  locationAddress?: string;

  startAt?: string;
  endAt?: string;

  coverImageUrl?: string;
  registrationUrl?: string;

  featured?: boolean;
  isPublished?: boolean;
};

/* API kontrolü */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Admin events API çalışıyor",
  });
}

/* Etkinlik oluştur */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    /*
     * Giriş yapan kullanıcı
     */
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Giriş yapman gerekiyor.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Admin kontrolü
     */
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json(
        {
          ok: false,
          error: "Bu işlem için admin yetkisi gerekiyor.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Form verisi
     */
    const body = (await request.json()) as CreateEventBody;

    const title = body.title?.trim();

    if (!title) {
      return NextResponse.json(
        {
          ok: false,
          error: "Etkinlik başlığı zorunlu.",
        },
        {
          status: 400,
        }
      );
    }

    if (!body.startAt) {
      return NextResponse.json(
        {
          ok: false,
          error: "Başlangıç tarihi zorunlu.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Etkinlik türü
     */
    const eventType = body.eventType || "other";

    if (!EVENT_TYPES.includes(eventType as EventType)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Geçersiz etkinlik türü.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Tarihler
     * Formdaki saatleri Türkiye saati olarak kaydediyoruz.
     */
    const startDate = new Date(`${body.startAt}:00+03:00`);

    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json(
        {
          ok: false,
          error: "Başlangıç tarihi geçersiz.",
        },
        {
          status: 400,
        }
      );
    }

    let endAt: string | null = null;

    if (body.endAt) {
      const endDate = new Date(`${body.endAt}:00+03:00`);

      if (Number.isNaN(endDate.getTime())) {
        return NextResponse.json(
          {
            ok: false,
            error: "Bitiş tarihi geçersiz.",
          },
          {
            status: 400,
          }
        );
      }

      if (endDate.getTime() < startDate.getTime()) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Bitiş tarihi başlangıç tarihinden önce olamaz.",
          },
          {
            status: 400,
          }
        );
      }

      endAt = endDate.toISOString();
    }

    const admin = createAdminClient();

    /*
     * Tek bir öne çıkan etkinlik olsun.
     */
    if (body.featured) {
      const { error: featuredError } = await admin
        .from("events")
        .update({
          featured: false,
        })
        .eq("featured", true);

      if (featuredError) {
        console.error("Featured error:", featuredError);

        return NextResponse.json(
          {
            ok: false,
            error: "Öne çıkan etkinlik güncellenemedi.",
          },
          {
            status: 500,
          }
        );
      }
    }

    /*
     * Etkinliği oluştur
     */
    const { data: createdEvent, error: insertError } =
      await admin
        .from("events")
        .insert({
          title,

          description:
            body.description?.trim() || null,

          event_type: eventType,

          location_name:
            body.locationName?.trim() || null,

          location_address:
            body.locationAddress?.trim() || null,

          start_at:
            startDate.toISOString(),

          end_at: endAt,

          cover_image_url:
            body.coverImageUrl?.trim() || null,

          registration_url:
            body.registrationUrl?.trim() || null,

          featured:
            Boolean(body.featured),

          is_published:
            Boolean(body.isPublished),

          updated_at:
            new Date().toISOString(),
        })
        .select()
        .single();

    if (insertError) {
      console.error("Insert error:", insertError);

      return NextResponse.json(
        {
          ok: false,
          error: "Etkinlik oluşturulamadı.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      event: createdEvent,
    });
  } catch (error) {
    console.error("Admin events API error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Beklenmeyen bir sunucu hatası oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}