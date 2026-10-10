
"use client";

import { useEffect, useState } from "react";

export type HomeDriverStanding = {
  position: number;
  code: string;
  name: string;
  team: string;
  points: number;
  wins: number;
  color: string;
};

export type HomeTeamStanding = {
  position: number;
  name: string;
  points: number;
  wins: number;
  color: string;
};

type ChampionshipDriver = {
  position: number;
  points: number;
  wins: number;
  driverNumber: number | null;
  acronym: string;
  fullName: string;
  constructor: string;
};

type ChampionshipResponse = {
  ok: boolean;
  officialRound?: number;
  appliedSprints?: Array<{
    round: number;
    sessionKey: number;
  }>;
  standings?: ChampionshipDriver[];
};

type LiveResponse = {
  live?: boolean;
  timingAvailable?: boolean;
  currentSession?: object | null;
  session?: {
    session_name?: string;
    session_type?: string;
  } | null;
  drivers?: Array<{
    driver_number?: number;
    position?: number | null;
  }>;
};

type DisplayData = {
  drivers: HomeDriverStanding[];
  teams: HomeTeamStanding[];
  provisional: boolean;
};

type Props = {
  initialDrivers: HomeDriverStanding[];
  initialTeams: HomeTeamStanding[];
  currentRound?: number;
};

const RACE_POINTS = [
  25, 18, 15, 12, 10, 8, 6, 4, 2, 1,
];

const SPRINT_POINTS = [
  8, 7, 6, 5, 4, 3, 2, 1,
];

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function calculateStandings(
  initialDrivers: HomeDriverStanding[],
  initialTeams: HomeTeamStanding[],
  championship: ChampionshipResponse,
  live: LiveResponse | null,
  currentRound: number
): DisplayData {
  const officialDrivers = championship.standings ?? [];

  if (
    !championship.ok ||
    officialDrivers.length === 0
  ) {
    return {
      drivers: initialDrivers,
      teams: initialTeams,
      provisional: false,
    };
  }

  /*
    RESMI SONUC KONTROLU

    Resmi puanlar ilgili tura islendiyse
    ayni yaris icin ek puan hesaplama.
  */

  const validRound =
    Number.isInteger(currentRound) &&
    currentRound > 0;

  const officialRoundKnown =
    typeof championship.officialRound === "number" &&
    Number.isInteger(championship.officialRound);

  const officialRound =
    championship.officialRound ?? 0;

  const raceAlreadyScored =
    validRound &&
    officialRoundKnown &&
    officialRound >= currentRound;

  const sprintAlreadyScored =
    raceAlreadyScored ||
    (
      validRound &&
      (
        championship.appliedSprints ?? []
      ).some(
        (sprint) =>
          sprint.round === currentRound
      )
    );

  /*
    OTURUM KONTROLU

    Antrenman ve siralama turlarinda
    sampiyona puani hesaplanmaz.
  */

  const sessionName = normalize(
    live?.session?.session_name ?? ""
  );

  const sessionType = normalize(
    live?.session?.session_type ?? ""
  );

  const isRace =
    sessionName === "race";

  const isSprint =
    sessionName === "sprint";

  const properSessionType =
    sessionType === "race";

  const canProject =
    validRound &&
    officialRoundKnown &&
    live?.live === true &&
    live?.timingAvailable === true &&
    live?.currentSession != null &&
    properSessionType &&
    (
      (isRace && !raceAlreadyScored) ||
      (isSprint && !sprintAlreadyScored)
    ) &&
    Array.isArray(live?.drivers);

  /*
    GECICI PUANLAR

    Ilk 10 pozisyonun tamamini ve
    pilot numaralarini dogrulamadan
    gecici puan tablosu olusturma.
  */

  const projectedPoints = new Map<number, number>();
  let provisional = false;

  if (canProject && live?.drivers) {
    const numberByPosition = new Map<number, number>();
    const usedNumbers = new Set<number>();

    let validPositions = true;

    for (const driver of live.drivers) {
      const number = Number(driver.driver_number);
      const position = Number(driver.position);

      if (
        !Number.isInteger(number) ||
        number <= 0 ||
        !Number.isInteger(position) ||
        position < 1 ||
        position > 20
      ) {
        continue;
      }

      if (
        numberByPosition.has(position) ||
        usedNumbers.has(number)
      ) {
        validPositions = false;
        break;
      }

      numberByPosition.set(position, number);
      usedNumbers.add(number);
    }

    const knownNumbers = new Set(
      officialDrivers
        .map((driver) => driver.driverNumber)
        .filter(
          (number): number is number =>
            typeof number === "number"
        )
    );

    const topTenComplete = Array.from(
      { length: 10 },
      (_, index) => index + 1
    ).every((position) => {
      const number = numberByPosition.get(position);

      return (
        typeof number === "number" &&
        knownNumbers.has(number)
      );
    });

    if (
      validPositions &&
      topTenComplete
    ) {
      const eventPoints = isSprint
        ? SPRINT_POINTS
        : RACE_POINTS;

      eventPoints.forEach((points, index) => {
        const number = numberByPosition.get(index + 1);

        if (typeof number === "number") {
          projectedPoints.set(number, points);
        }
      });

      provisional = true;
    }
  }

  /*
    RESMI PILOT PUANLARI

    LIVE championship API'si,
    tamamlanan eksik Sprint puanlarini
    zaten bu tabloya ekliyor.
  */

  const baseByName = new Map(
    initialDrivers.map((driver) => [
      normalize(driver.name),
      driver,
    ])
  );

  const baseByCode = new Map(
    initialDrivers.map((driver) => [
      normalize(driver.code),
      driver,
    ])
  );

  const teamExtra = new Map<string, number>();

  const drivers = officialDrivers.map((driver) => {
    const base =
      baseByName.get(normalize(driver.fullName)) ??
      baseByCode.get(normalize(driver.acronym));

    const teamName =
      driver.constructor ||
      base?.team ||
      "F1 Team";

    const liveExtra =
      provisional && driver.driverNumber !== null
        ? projectedPoints.get(driver.driverNumber) ?? 0
        : 0;

    /*
      Ana sayfanin Jolpica verisinde
      eksik olan puanlari takimlara da ekle.
    */

    const completedExtra = base
      ? Math.max(
          0,
          driver.points - base.points
        )
      : 0;

    const teamKey = normalize(teamName);

    teamExtra.set(
      teamKey,
      (teamExtra.get(teamKey) ?? 0) +
        completedExtra +
        liveExtra
    );

    return {
      position: driver.position,
      code: driver.acronym || base?.code || "---",
      name: driver.fullName || base?.name || "",
      team: teamName,
      points: driver.points + liveExtra,
      wins: driver.wins,
      color: base?.color ?? "#e10600",
    };
  });

  drivers.sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      a.position - b.position
  );

  drivers.forEach((driver, index) => {
    driver.position = index + 1;
  });

  /*
    TAKIM PUANLARI

    Takimlar icin tamamlanan Sprint
    farklari ve gecici yaris puanlari
    pilotlarin takimina aktarilir.
  */

  const teams = initialTeams.map((team) => ({
    ...team,
    points:
      team.points +
      (teamExtra.get(normalize(team.name)) ?? 0),
  }));

  teams.sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      a.position - b.position
  );

  teams.forEach((team, index) => {
    team.position = index + 1;
  });

  return {
    drivers,
    teams,
    provisional,
  };
}

export default function HomeChampionshipLive({
  initialDrivers,
  initialTeams,
  currentRound = 0,
}: Props) {
  const [data, setData] = useState<DisplayData>({
    drivers: initialDrivers,
    teams: initialTeams,
    provisional: false,
  });

  useEffect(() => {
    let active = true;
    let loading = false;

    async function update() {
      if (loading) {
        return;
      }

      loading = true;

      try {
        /*
          Championship ve LIVE verilerini
          birbirinden bagimsiz ele al.

          LIVE gecici olarak ulasilamazsa
          resmi puanlari yine goster.
        */

        const [champResponse, liveResponse] =
          await Promise.all([
            fetch("/api/live/championship", {
              cache: "no-store",
            }),
            fetch("/api/live", {
              cache: "no-store",
            }).catch(() => null),
          ]);

        if (!champResponse.ok) {
          return;
        }

        const championship: ChampionshipResponse =
          await champResponse.json();

        let live: LiveResponse | null = null;

        if (liveResponse?.ok) {
          try {
            live = await liveResponse.json();
          } catch {
            live = null;
          }
        }

        if (!active) {
          return;
        }

        setData(
          calculateStandings(
            initialDrivers,
            initialTeams,
            championship,
            live,
            currentRound
          )
        );
      } catch (error) {
        console.error(
          "HOME CHAMPIONSHIP UPDATE:",
          error
        );
      } finally {
        loading = false;
      }
    }

    void update();

    const timer = setInterval(() => {
      void update();
    }, 15000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [
    initialDrivers,
    initialTeams,
    currentRound,
  ]);

  return (
    <div className="champ-card champ-switch">
      <input
        id="champ-drivers"
        type="radio"
        name="championship"
        defaultChecked
      />

      <input
        id="champ-teams"
        type="radio"
        name="championship"
      />

      <div className="champ-header">
        <div>
          <div className="eyebrow">
            CHAMPIONSHIP
          </div>

          <h3>Güncel Puan Durumu</h3>

          {data.provisional && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#e10600",
                marginTop: 6,
              }}
            >
              CANLI · GEÇİCİ PUANLAR
            </div>
          )}
        </div>

        <div className="champ-tabs">
          <label htmlFor="champ-drivers">
            PİLOTLAR
          </label>

          <label htmlFor="champ-teams">
            TAKIMLAR
          </label>
        </div>
      </div>

      <div className="champ-panels">
        <div className="drivers-panel">
          {data.drivers.slice(0, 10).map((driver) => (
            <div
              className="standing-row"
              key={driver.code}
            >
              <strong>P{driver.position}</strong>

              <span
                className="team-line"
                style={{
                  background: driver.color,
                }}
              />

              <div>
                <div className="standing-name">
                  {driver.code} {driver.name}
                </div>

                <div className="standing-meta">
                  {driver.team}
                </div>
              </div>

              <div className="points">
                {driver.points}
              </div>
            </div>
          ))}
        </div>

        <div className="teams-panel">
          {data.teams.slice(0, 10).map((team) => (
            <div
              className="standing-row"
              key={team.name}
            >
              <strong>P{team.position}</strong>

              <span
                className="team-line"
                style={{
                  background: team.color,
                }}
              />

              <div>
                <div className="standing-name">
                  {team.name}
                </div>

                <div className="standing-meta">
                  {team.wins} GALİBİYET
                </div>
              </div>

              <div className="points">
                {team.points}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
