import {
  NextResponse,
} from "next/server";

import {
  getLatestF1Session,
  getLatestF1Drivers,
  getLatestF1Positions,
  getLatestF1Intervals,
  getLatestF1Laps,
  getLatestF1Stints,
  type OpenF1Session,
} from "@/lib/openf1";

import {
  getCurrentRaceWeekend,
} from "@/lib/race-data";

import {
  getF1LiveStatus,
  openF1SessionMatchesScheduled,
} from "@/lib/f1-live-status";

export const dynamic =
  "force-dynamic";

/* =========================================================
   HELPERS
   ========================================================= */

function sessionPayload(
  session:
    OpenF1Session | null
) {
  if (
    !session
  ) {
    return null;
  }

  return {
    session_key:
      session.session_key,

    meeting_key:
      session.meeting_key,

    session_name:
      session.session_name,

    session_type:
      session.session_type,

    location:
      session.location ??
      "",

    country_name:
      session.country_name ??
      "",

    date_start:
      session.date_start,

    date_end:
      session.date_end,

    year:
      session.year,
  };
}

/* =========================================================
   API
   ========================================================= */

export async function GET() {
  try {
    /*
      ÖNCE RESMİ HAFTA SONU TAKVİMİNE BAKIYORUZ.

      OpenF1 "latest" tek başına
      canlı seans belirleyicisi değildir.
    */

    const race =
      await getCurrentRaceWeekend();

    const scheduleStatus =
      await getF1LiveStatus(
        race
      );

    /*
      TAKVİME GÖRE ŞU ANDA
      CANLI F1 SEANSI YOK.
    */

    if (
      !scheduleStatus.isLive ||
      !scheduleStatus.currentSession
    ) {
      return NextResponse.json(
        {
          live:
            false,

          timingAvailable:
            false,

          currentSession:
            scheduleStatus.currentSession,

          nextSession:
            scheduleStatus.nextSession,

          session:
            null,

          openF1Session:
            null,

          drivers:
            [],

          updated_at:
            new Date().toISOString(),
        },
        {
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    /*
      TAKVİME GÖRE SEANS CANLI.

      Şimdi OpenF1'ın gerçekten
      aynı seansı gösterip göstermediğini
      kontrol ediyoruz.
    */

    const openF1Session =
      await getLatestF1Session();

    const sessionMatches =
      openF1SessionMatchesScheduled(
        openF1Session,
        scheduleStatus.currentSession
      );

    /*
      F1 seansı başlamış olabilir fakat
      OpenF1 henüz yeni session'ı açmamış
      olabilir.

      Bu durumda site LIVE kalır ancak
      timingAvailable false olur.
    */

    if (
      !openF1Session ||
      !sessionMatches
    ) {
      return NextResponse.json(
        {
          live:
            true,

          timingAvailable:
            false,

          currentSession:
            scheduleStatus.currentSession,

          nextSession:
            scheduleStatus.nextSession,

          session:
            sessionPayload(
              openF1Session
            ),

          openF1Session:
            sessionPayload(
              openF1Session
            ),

          drivers:
            [],

          updated_at:
            new Date().toISOString(),
        },
        {
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    /*
      OPENF1 VE TAKVİM EŞLEŞTİ.

      Şimdi canlı timing verilerini
      paralel çekiyoruz.
    */

    const [
      drivers,
      positions,
      intervals,
      laps,
      stints,
    ] =
      await Promise.all([
        getLatestF1Drivers(),

        getLatestF1Positions(),

        getLatestF1Intervals(),

        getLatestF1Laps(),

        getLatestF1Stints(),
      ]);

    /*
      Hızlı lookup map'leri.
    */

    const positionMap =
      new Map(
        positions.map(
          (
            item
          ) => [
            item.driver_number,
            item,
          ]
        )
      );

    const intervalMap =
      new Map(
        intervals.map(
          (
            item
          ) => [
            item.driver_number,
            item,
          ]
        )
      );

    const lapMap =
      new Map(
        laps.map(
          (
            item
          ) => [
            item.driver_number,
            item,
          ]
        )
      );

    const stintMap =
      new Map(
        stints.map(
          (
            item
          ) => [
            item.driver_number,
            item,
          ]
        )
      );

    /* =====================================================
       DRIVER MERGE
       ===================================================== */

    const liveDrivers =
      drivers
        .map(
          (
            driver
          ) => {
            const position =
              positionMap.get(
                driver.driver_number
              );

            const interval =
              intervalMap.get(
                driver.driver_number
              );

            const lap =
              lapMap.get(
                driver.driver_number
              );

            const stint =
              stintMap.get(
                driver.driver_number
              );

            /*
              LASTİK YAŞI

              stint başlangıç yaşı +
              mevcut tur farkı.
            */

            let tyreAge:
              number | null =
              null;

            if (
              stint
            ) {
              const startingAge =
                stint.tyre_age_at_start ??
                0;

              if (
                lap
              ) {
                tyreAge =
                  startingAge +
                  Math.max(
                    0,

                    lap.lap_number -
                      stint.lap_start
                  );
              } else {
                tyreAge =
                  startingAge;
              }
            }

            return {
              driver_number:
                driver.driver_number,

              driverNumber:
                driver.driver_number,

              first_name:
                driver.first_name,

              last_name:
                driver.last_name,

              full_name:
                driver.full_name,

              broadcast_name:
                driver.broadcast_name,

              name_acronym:
                driver.name_acronym,

              team_name:
                driver.team_name,

              team_colour:
                driver.team_colour,

              country_code:
                driver.country_code,

              headshot_url:
                driver.headshot_url,

              /*
                POSITION
              */

              position:
                position?.position ??
                null,

              livePosition:
                position?.position ??
                null,

              /*
                GAP / INTERVAL
              */

              gap:
                interval
                  ?.gap_to_leader ??
                null,

              gap_to_leader:
                interval
                  ?.gap_to_leader ??
                null,

              interval:
                interval
                  ?.interval ??
                null,

              /*
                LAP DATA
              */

              last_lap:
                lap?.lap_duration ??
                null,

              lastLap:
                lap?.lap_duration ??
                null,

              /*
                YENİ:

                Pilotun seanstaki
                PERSONAL BEST turu.
              */

              best_lap:
                lap
                  ?.best_lap_duration ??
                null,

              bestLap:
                lap
                  ?.best_lap_duration ??
                null,

              lap_number:
                lap?.lap_number ??
                null,

              lapNumber:
                lap?.lap_number ??
                null,

              /*
                TYRE / STINT
              */

              tyre:
                stint?.compound ??
                null,

              compound:
                stint?.compound ??
                null,

              tyre_age:
                tyreAge,

              tyreAge:
                tyreAge,

              stint_number:
                stint
                  ?.stint_number ??
                null,

              stintNumber:
                stint
                  ?.stint_number ??
                null,
            };
          }
        )
        .sort(
          (
            a,
            b
          ) =>
            (
              a.position ??
              999
            ) -
            (
              b.position ??
              999
            )
        );

    /*
      Timing'in gerçekten kullanılabilir
      olması için pilot + pozisyon verisi
      gerekiyor.
    */

    const timingAvailable =
      liveDrivers.length >
        0 &&
      positions.length >
        0;

    return NextResponse.json(
      {
        live:
          true,

        timingAvailable,

        currentSession:
          scheduleStatus.currentSession,

        nextSession:
          scheduleStatus.nextSession,

        session:
          sessionPayload(
            openF1Session
          ),

        openF1Session:
          sessionPayload(
            openF1Session
          ),

        drivers:
          timingAvailable
            ? liveDrivers
            : [],

        updated_at:
          new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "F1 LIVE API ERROR:",
      error
    );

    return NextResponse.json(
      {
        live:
          false,

        timingAvailable:
          false,

        currentSession:
          null,

        nextSession:
          null,

        session:
          null,

        openF1Session:
          null,

        drivers:
          [],

        error:
          error instanceof Error
            ? error.message
            : "F1 live verisi hazırlanamadı.",

        updated_at:
          new Date().toISOString(),
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}