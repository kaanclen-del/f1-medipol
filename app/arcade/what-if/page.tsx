import Header from "@/components/Header";
import WhatIfSimulator, { type WhatIfDriver, type WhatIfTeam, type WhatIfRace } from "@/components/WhatIfSimulator";
import { getCurrentRaceWeekend, getSeasonRaces } from "@/lib/race-data";

export const dynamic = "force-dynamic";

type StandingsResponse = {
  MRData?: {
    StandingsTable?: {
      StandingsLists?: Array<{
        DriverStandings?: Array<{
          position: string;
          points: string;
          Driver?: { driverId?: string; code?: string; permanentNumber?: string; givenName?: string; familyName?: string };
          Constructors?: Array<{ constructorId?: string; name?: string }>;
        }>;
        ConstructorStandings?: Array<{
          position: string;
          points: string;
          Constructor?: { constructorId?: string; name?: string };
        }>;
      }>;
    };
  };
};

async function getStandings(url: string): Promise<StandingsResponse> {
  try {
    const response = await fetch(url, { next: { revalidate: 900 } });
    if (!response.ok) return {};
    return (await response.json()) as StandingsResponse;
  } catch (error) {
    console.warn("WHAT IF STANDINGS:", error);
    return {};
  }
}

export default async function WhatIfPage() {
  const year = new Date().getUTCFullYear();
  const [driverResponse, teamResponse, races, currentRace] = await Promise.all([
    getStandings(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings.json`),
    getStandings(`https://api.jolpi.ca/ergast/f1/${year}/constructorStandings.json`),
    getSeasonRaces(year),
    getCurrentRaceWeekend(),
  ]);

  const driverRows = driverResponse.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
  const teamRows = teamResponse.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? [];

  const teams: WhatIfTeam[] = teamRows.map((row) => ({
    id: row.Constructor?.constructorId || row.Constructor?.name || "unknown-team",
    name: row.Constructor?.name || "Takım",
    points: Number(row.points) || 0,
    position: Number(row.position) || 99,
  }));
  const drivers: WhatIfDriver[] = driverRows.map((row, index) => ({
    id: row.Driver?.driverId || row.Driver?.code || `driver-${index}`,
    name: `${row.Driver?.givenName || ""} ${row.Driver?.familyName || ""}`.trim() || "Pilot",
    code: row.Driver?.code || row.Driver?.permanentNumber || "F1",
    number: row.Driver?.permanentNumber || "",
    teamId: row.Constructors?.[0]?.constructorId || row.Constructors?.[0]?.name || "unknown-team",
    teamName: row.Constructors?.[0]?.name || "Takım",
    position: Number(row.position) || index + 1,
    points: Number(row.points) || 0,
  })).sort((a, b) => a.position - b.position);

  const now = Date.now();
  const futureRaces: WhatIfRace[] = races
    .filter((race) => {
      const when = Date.parse(`${race.raceDate}T${race.raceTime || "12:00:00Z"}`);
      return Number.isFinite(when) && when > now - 12 * 3600000;
    })
    .map((race) => ({ round: race.round, name: race.raceName, date: race.raceDate, sprint: race.sprint }));

  if (futureRaces.length === 0 && currentRace) {
    futureRaces.push({ round: currentRace.round, name: currentRace.raceName, date: currentRace.raceDate, sprint: currentRace.sprint });
  }

  return <>
    <Header />
    <WhatIfSimulator season={year} drivers={drivers} teams={teams} races={futureRaces} />
  </>;
}
