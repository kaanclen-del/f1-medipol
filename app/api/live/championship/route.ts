import {
  NextResponse,
} from "next/server";

export const dynamic =
  "force-dynamic";

type JolpicaConstructor = {
  constructorId?:
    string;

  name?:
    string;
};

type JolpicaDriver = {
  driverId?:
    string;

  permanentNumber?:
    string;

  code?:
    string;

  givenName?:
    string;

  familyName?:
    string;
};

type JolpicaStanding = {
  position?:
    string;

  positionText?:
    string;

  points?:
    string;

  wins?:
    string;

  Driver?:
    JolpicaDriver;

  Constructors?:
    JolpicaConstructor[];
};

type JolpicaResponse = {
  MRData?: {
    StandingsTable?: {
      season?:
        string;

      round?:
        string;

      StandingsLists?: Array<{
        season?:
          string;

        round?:
          string;

        DriverStandings?:
          JolpicaStanding[];
      }>;
    };
  };
};

export type ChampionshipStanding = {
  position:
    number;

  points:
    number;

  wins:
    number;

  driverId:
    string;

  driverNumber:
    number | null;

  acronym:
    string;

  givenName:
    string;

  familyName:
    string;

  fullName:
    string;

  constructor:
    string;
};

function toNumber(
  value:
    string |
    undefined,

  fallback =
    0
) {
  const number =
    Number(
      value
    );

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}

export async function GET() {
  try {
    const response =
      await fetch(
        "https://api.jolpi.ca/ergast/f1/current/driverstandings/",
        {
          headers: {
            "User-Agent":
              "F1Medipol/1.0 NextJS",
          },

          next: {
            revalidate:
              300,
          },
        }
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `Jolpica standings HTTP ${response.status}`
      );
    }

    const data =
      (
        await response.json()
      ) as JolpicaResponse;

    const table =
      data.MRData
        ?.StandingsTable;

    const list =
      table
        ?.StandingsLists
        ?.[0];

    const rawStandings =
      list
        ?.DriverStandings ??
      [];

    const standings:
      ChampionshipStanding[] =
      rawStandings
        .map(
          (
            standing
          ) => {
            const driver =
              standing.Driver ??
              {};

            const constructors =
              standing.Constructors ??
              [];

            const permanentNumber =
              driver.permanentNumber
                ? Number(
                    driver.permanentNumber
                  )
                : null;

            return {
              position:
                toNumber(
                  standing.position,
                  999
                ),

              points:
                toNumber(
                  standing.points
                ),

              wins:
                toNumber(
                  standing.wins
                ),

              driverId:
                driver.driverId ??
                "",

              driverNumber:
                permanentNumber !==
                  null &&
                Number.isFinite(
                  permanentNumber
                )
                  ? permanentNumber
                  : null,

              acronym:
                (
                  driver.code ??
                  ""
                ).toUpperCase(),

              givenName:
                driver.givenName ??
                "",

              familyName:
                driver.familyName ??
                "",

              fullName:
                [
                  driver.givenName,
                  driver.familyName,
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    " "
                  ),

              constructor:
                constructors
                  .at(
                    -1
                  )
                  ?.name ??
                "",
            };
          }
        )
        .sort(
          (
            a,
            b
          ) =>
            a.position -
            b.position
        );

    return NextResponse.json(
      {
        ok:
          true,

        season:
          Number(
            list?.season ??
              table?.season ??
              new Date().getFullYear()
          ),

        round:
          Number(
            list?.round ??
              table?.round ??
              0
          ),

        standings,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "CHAMPIONSHIP API ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Şampiyona tablosu alınamadı.",
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