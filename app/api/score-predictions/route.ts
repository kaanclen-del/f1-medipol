import { NextResponse } from "next/server";

import { createAdminClient } from "@/utils/supabase/admin";

import {
  calculatePredictionScore,
  getPodiumFromResults,
} from "@/lib/prediction-scoring";

export const dynamic = "force-dynamic";

type JolpicaResult = {
  number: string;
  position: string;
};

type JolpicaRace = {
  season: string;
  round: string;
  raceName: string;
  Results?: JolpicaResult[];
};

type JolpicaResponse = {
  MRData?: {
    RaceTable?: {
      Races?: JolpicaRace[];
    };
  };
};

export async function GET(
  request: Request
) {
  /*
    GÜVENLİK

    Bu endpoint admin yetkisiyle
    tüm kullanıcıların puanlarını
    değiştirebildiği için dışarıdan
    serbestçe çalıştırılamaz.
  */

  const cronSecret =
    process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "CRON_SECRET tanımlı değil.",
      },
      {
        status: 500,
      }
    );
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    authorization !==
    `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Yetkisiz istek.",
      },
      {
        status: 401,
      }
    );
  }

  try {
    /*
      EN SON TAMAMLANAN
      F1 YARIŞININ SONUCUNU AL
    */

    const response = await fetch(
      "https://api.jolpi.ca/ergast/f1/current/last/results/",
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Yarış sonucu alınamadı.",
        },
        {
          status: 502,
        }
      );
    }

    const data =
      (await response.json()) as JolpicaResponse;

    const race =
      data.MRData?.RaceTable
        ?.Races?.[0];

    if (!race) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Tamamlanmış yarış bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    const results =
      race.Results ?? [];

    /*
      JOLPICA VERİSİNİ
      PUANLAMA MOTORUMUZUN
      FORMATINA ÇEVİR
    */

    const podium =
      getPodiumFromResults(
        results.map(
          (result) => ({
            driver_number:
              Number(
                result.number
              ),

            position:
              Number(
                result.position
              ),
          })
        )
      );

    if (!podium) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Podyum sonucu henüz hazır değil.",
        },
        {
          status: 409,
        }
      );
    }

    const season =
      Number(race.season);

    const round =
      Number(race.round);

    /*
      BU YARIŞ İÇİN
      TÜM TAHMİNLERİ AL
    */

    const supabase =
      createAdminClient();

    const {
      data: predictions,
      error:
        predictionsError,
    } = await supabase
      .from("predictions")
      .select(
        `
        id,
        p1_driver_number,
        p2_driver_number,
        p3_driver_number
        `
      )
      .eq(
        "season",
        season
      )
      .eq(
        "round",
        round
      )
      .eq(
        "prediction_type",
        "race"
      );

    if (predictionsError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            predictionsError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
      BU YARIŞ İÇİN TAHMİN
      YOKSA HATA DEĞİL.
    */

    if (
      !predictions ||
      predictions.length === 0
    ) {
      return NextResponse.json({
        ok: true,

        message:
          "Bu yarış için kayıtlı tahmin yok.",

        race: {
          season,
          round,
          raceName:
            race.raceName,
        },

        podium,

        scored: 0,
      });
    }

    /*
      HER KULLANICININ
      PUANINI HESAPLA
    */

    const scoredPredictions =
      predictions.map(
        (prediction) => {
          const score =
            calculatePredictionScore(
              {
                P1:
                  prediction.p1_driver_number,

                P2:
                  prediction.p2_driver_number,

                P3:
                  prediction.p3_driver_number,
              },

              podium
            );

          return {
            id:
              prediction.id,

            points:
              score.total,

            detail:
              score,
          };
        }
      );

    /*
      SUPABASE'DEKİ
      POINTS ALANLARINI GÜNCELLE
    */

    const updateResults =
      await Promise.all(
        scoredPredictions.map(
          async (prediction) => {
            const {
              error,
            } =
              await supabase
                .from(
                  "predictions"
                )
                .update({
                  points:
                    prediction.points,

                  updated_at:
                    new Date().toISOString(),
                })
                .eq(
                  "id",
                  prediction.id
                );

            return {
              ...prediction,
              error:
                error?.message ??
                null,
            };
          }
        )
      );

    const failed =
      updateResults.filter(
        (result) =>
          result.error
      );

    if (
      failed.length > 0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Bazı tahminler güncellenemedi.",

          failed,
        },
        {
          status: 500,
        }
      );
    }

    /*
      BAŞARILI
    */

    return NextResponse.json({
      ok: true,

      race: {
        season,

        round,

        raceName:
          race.raceName,
      },

      podium,

      scored:
        updateResults.length,

      results:
        updateResults,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "Bilinmeyen sunucu hatası.",
      },
      {
        status: 500,
      }
    );
  }
}