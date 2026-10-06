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
  SprintResults?: JolpicaResult[];
};

type JolpicaResponse = {
  MRData?: {
    RaceTable?: {
      Races?: JolpicaRace[];
    };
  };
};

type PredictionType =
  | "race"
  | "sprint";

/*
  JOLPICA'DAN SONUÇ AL
*/

async function fetchResult(
  type: PredictionType
) {
  /*
    RACE:
    Son tamamlanan yarış.

    SPRINT:
    Bu sezondaki tamamlanmış
    Sprint sonuçlarının tamamını al.
    Daha sonra en sonuncuyu seçeceğiz.
  */

  const url =
    type === "race"
      ? "https://api.jolpi.ca/ergast/f1/current/last/results/"
      : "https://api.jolpi.ca/ergast/f1/current/sprint/";

  try {
    const response =
      await fetch(url, {
        cache: "no-store",

        headers: {
          "User-Agent":
            "F1-Medipol-Website/1.0",
        },
      });

    if (!response.ok) {
      return {
        ok: false as const,
        skipped: true,
        type,
        reason:
          type === "sprint"
            ? "Sprint sonuçları alınamadı."
            : "Yarış sonucu alınamadı.",
      };
    }

    const data =
      (await response.json()) as JolpicaResponse;

    const races =
      data.MRData?.RaceTable
        ?.Races ?? [];

    /*
      NORMAL YARIŞ:
      last/results zaten tek yarış döndürür.

      SPRINT:
      sezon içindeki Sprint yarışlarından
      en sonuncuyu kullan.
    */

    const race =
      type === "race"
        ? races[0]
        : races.length > 0
        ? races[
            races.length - 1
          ]
        : undefined;

    if (!race) {
      return {
        ok: false as const,
        skipped: true,
        type,
        reason:
          type === "sprint"
            ? "Bu sezon tamamlanmış Sprint sonucu henüz yok."
            : "Sonuç verisi bulunamadı.",
      };
    }

    const rawResults =
      type === "race"
        ? race.Results ?? []
        : race.SprintResults ?? [];

    const podium =
      getPodiumFromResults(
        rawResults.map(
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
      return {
        ok: false as const,
        skipped: true,
        type,
        reason:
          type === "sprint"
            ? "Sprint podyumu henüz hazır değil."
            : "Yarış podyumu henüz hazır değil.",
      };
    }

    return {
      ok: true as const,

      type,

      race,

      podium,

      season:
        Number(
          race.season
        ),

      round:
        Number(
          race.round
        ),
    };
  } catch (error) {
    return {
      ok: false as const,

      skipped: true,

      type,

      reason:
        error instanceof Error
          ? error.message
          : "Sonuç alınırken bilinmeyen hata oluştu.",
    };
  }
}

/*
  TEK EVENT PUANLA
*/

async function scoreEvent(
  type: PredictionType
) {
  const result =
    await fetchResult(type);

  /*
    Sprint sonucu yoksa
    tüm cron'u hata saymıyoruz.
  */

  if (!result.ok) {
    return {
      type,

      ok: true,

      skipped: true,

      reason:
        result.reason,

      scored: 0,
    };
  }

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
      result.season
    )
    .eq(
      "round",
      result.round
    )
    .eq(
      "prediction_type",
      type
    );

  if (predictionsError) {
    return {
      type,

      ok: false,

      skipped: false,

      error:
        predictionsError.message,

      scored: 0,
    };
  }

  if (
    !predictions ||
    predictions.length === 0
  ) {
    return {
      type,

      ok: true,

      skipped: false,

      message:
        type === "sprint"
          ? "Bu Sprint için kayıtlı tahmin yok."
          : "Bu yarış için kayıtlı tahmin yok.",

      event: {
        season:
          result.season,

        round:
          result.round,

        raceName:
          result.race
            .raceName,
      },

      podium:
        result.podium,

      scored: 0,
    };
  }

  /*
    PUANLARI HESAPLA
  */

  const scoredPredictions =
    predictions.map(
      (prediction) => {
        const score =
          calculatePredictionScore(
            {
              P1:
                Number(
                  prediction
                    .p1_driver_number
                ),

              P2:
                Number(
                  prediction
                    .p2_driver_number
                ),

              P3:
                Number(
                  prediction
                    .p3_driver_number
                ),
            },

            result.podium
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
    VERİTABANINI GÜNCELLE
  */

  const updates =
    await Promise.all(
      scoredPredictions.map(
        async (
          prediction
        ) => {
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
    updates.filter(
      (update) =>
        update.error
    );

  if (
    failed.length > 0
  ) {
    return {
      type,

      ok: false,

      skipped: false,

      error:
        "Bazı tahminlerin puanı güncellenemedi.",

      failed,

      scored:
        updates.length -
        failed.length,
    };
  }

  return {
    type,

    ok: true,

    skipped: false,

    event: {
      season:
        result.season,

      round:
        result.round,

      raceName:
        result.race
          .raceName,
    },

    podium:
      result.podium,

    scored:
      updates.length,

    results:
      updates,
  };
}

/*
  CRON ENDPOINT
*/

export async function GET(
  request: Request
) {
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
      RACE + SPRINT
      AYNI CRON'DA
    */

    const [
      raceResult,
      sprintResult,
    ] =
      await Promise.all([
        scoreEvent("race"),
        scoreEvent("sprint"),
      ]);

    const hasError =
      !raceResult.ok ||
      !sprintResult.ok;

    if (hasError) {
      return NextResponse.json(
        {
          ok: false,

          race:
            raceResult,

          sprint:
            sprintResult,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      ok: true,

      race:
        raceResult,

      sprint:
        sprintResult,

      totalScored:
        raceResult.scored +
        sprintResult.scored,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Bilinmeyen sunucu hatası.",
      },
      {
        status: 500,
      }
    );
  }
}