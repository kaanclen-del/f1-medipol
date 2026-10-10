import {
  NextResponse,
} from "next/server";

import {
  getLatestF1Replay,
} from "@/lib/f1-replay";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const replay =
      await getLatestF1Replay();

    if (!replay) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Oynatılabilir geçmiş F1 seansı bulunamadı.",
        },
        {
          status: 404,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      {
        ok: true,

        replay,
      },
      {
        headers: {
          /*
            Geçmiş replay sürekli değişmediği için
            Vercel edge tarafında kısa süreli
            cache kullanabilir.
          */

          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "F1 REPLAY API ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Replay verisi hazırlanamadı.",
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}