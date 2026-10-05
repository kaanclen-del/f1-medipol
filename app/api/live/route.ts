import { NextResponse } from "next/server";

import {
  getLatestF1Session,
  getLatestF1Drivers,
  getLatestF1Positions,
  getLatestF1Intervals,
  getLatestF1Laps,
  getLatestF1Stints,
} from "@/lib/openf1";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session =
      await getLatestF1Session();

    if (!session) {
      return NextResponse.json(
        {
          live: false,
          session: null,
          drivers: [],
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const now = new Date();

    const sessionStart =
      new Date(session.date_start);

    const sessionEnd =
      new Date(session.date_end);

    const isLive =
      now >= sessionStart &&
      now <= sessionEnd;

    /*
      SESSION CANLI DEĞİLSE
      ESKİ YARIŞ VERİSİNİ GÖNDERME
    */

    if (!isLive) {
      return NextResponse.json(
        {
          live: false,

          session: {
            session_name:
              session.session_name,

            session_type:
              session.session_type,

            location:
              session.location,

            country_name:
              session.country_name,

            date_start:
              session.date_start,

            date_end:
              session.date_end,
          },

          drivers: [],
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /*
      SESSION CANLIYSA
      TÜM VERİLERİ PARALEL ÇEK
    */

    const [
      drivers,
      positions,
      intervals,
      laps,
      stints,
    ] = await Promise.all([
      getLatestF1Drivers(),
      getLatestF1Positions(),
      getLatestF1Intervals(),
      getLatestF1Laps(),
      getLatestF1Stints(),
    ]);

    /*
      HER SÜRÜCÜ İÇİN
      CANLI VERİYİ BİRLEŞTİR
    */

    const liveDrivers = drivers
      .map((driver) => {
        const position =
          positions.find(
            (item) =>
              item.driver_number ===
              driver.driver_number
          );

        const interval =
          intervals.find(
            (item) =>
              item.driver_number ===
              driver.driver_number
          );

        const lap =
          laps.find(
            (item) =>
              item.driver_number ===
              driver.driver_number
          );

        const stint =
          stints.find(
            (item) =>
              item.driver_number ===
              driver.driver_number
          );

        return {
          driver_number:
            driver.driver_number,

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

          headshot_url:
            driver.headshot_url,

          position:
            position?.position ??
            null,

          interval:
            interval?.interval ??
            null,

          gap_to_leader:
            interval?.gap_to_leader ??
            null,

          last_lap:
            lap?.lap_duration ??
            null,

          lap_number:
            lap?.lap_number ??
            null,

          tyre:
            stint?.compound ??
            null,

          stint_number:
            stint?.stint_number ??
            null,
        };
      })
      .sort((a, b) => {
        const positionA =
          a.position ?? 999;

        const positionB =
          b.position ?? 999;

        return (
          positionA -
          positionB
        );
      });

    return NextResponse.json(
      {
        live: true,

        updated_at:
          new Date().toISOString(),

        session: {
          session_key:
            session.session_key,

          session_name:
            session.session_name,

          session_type:
            session.session_type,

          location:
            session.location,

          country_name:
            session.country_name,

          date_start:
            session.date_start,

          date_end:
            session.date_end,
        },

        drivers: liveDrivers,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        live: false,
        session: null,
        drivers: [],
        error:
          "Live timing verisi alınamadı.",
      },
      {
        status: 500,

        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}