import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { openF1Request } from "@/lib/openf1-auth";
import {
  calculatePredictionScore,
  calculateRaceExtraScore,
  getPodiumFromResults,
  type RaceBulletinActuals,
  type RaceBulletinAnswers,
  type RaceSpecialActuals,
  type RaceSpecialPicks,
} from "@/lib/prediction-scoring";
export const dynamic = "force-dynamic";
type PredictionType = "race" | "sprint";
type JolpicaResult = {
  number: string;
  position: string;
  grid?: string;
  laps?: string;
  status?: string;
  Constructor?: {
    name?: string;
  };
  Time?: {
    time?: string;
    millis?: string;
  };
  FastestLap?: {
    rank?: string;
    lap?: string;
    Time?: {
      time?: string;
    };
  };
};
type JolpicaRace = {
  season: string;
  round: string;
  raceName: string;
  date?: string;
  time?: string;
  Sprint?: {
    date?: string;
    time?: string;
  };
  Circuit?: {
    circuitName?: string;
    Location?: {
      locality?: string;
      country?: string;
    };
  };
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
type OpenMeeting = {
  meeting_key: number;
  meeting_name?: string;
  location?: string;
  country_name?: string;
  date_start?: string;
};
type OpenSession = {
  session_key: number;
  session_name?: string;
  session_type?: string;
  date_start?: string;
  date_end?: string;
};
type RaceControl = {
  category?: string;
  flag?: string;
  message?: string;
  lap_number?: number | null;
};
type Weather = {
  rainfall?: number;
};
type Position = {
  driver_number: number;
  position: number;
};
type SessionResult = {
  driver_number: number;
  position: number | null;
  number_of_laps?: number;
  dnf?: boolean;
  dns?: boolean;
  dsq?: boolean;
  gap_to_leader?:
    | number
    | string
    | (number | string | null)[]
    | null;
};
type Podium = NonNullable<
  ReturnType<typeof getPodiumFromResults>
>;
type ScoringResult =
  | {
      ok: true;
      type: PredictionType;
      race: JolpicaRace;
      rawResults: JolpicaResult[];
      podium: Podium;
      season: number;
      round: number;
      source: "jolpica" | "openf1";
    }
  | {
      ok: false;
      type: PredictionType;
      reason: string;
    };
function clean(
  value: string | null | undefined
): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/grand prix/g, "")
    .replace(/[^a-z0-9]/g, "");
}
async function fetchJolpica(
  url: string
): Promise<JolpicaResponse> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "F1-Medipol-Website/1.0",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Jolpica HTTP ${response.status}`
    );
  }
  return (await response.json()) as JolpicaResponse;
}
async function fetchOpenArray<T>(
  path: string
): Promise<T[] | null> {
  try {
    const response = await openF1Request(path, {
      cache: "no-store",
    });
    if (!response.ok) {
      console.warn(
        "PREDICTION OpenF1 HTTP:",
        path,
        response.status
      );
      return null;
    }
    const data: unknown = await response.json();
    return Array.isArray(data)
      ? (data as T[])
      : null;
  } catch (error) {
    console.error(
      "PREDICTION OpenF1 FETCH:",
      path,
      error
    );
    return null;
  }
}

// Her etkinlik kendi sezonu ve tur numarasıyla sorgulanır.
// "current/last" kullanmak eski yarışların atlanmasına neden olur.
type EventKey = { season: number; round: number; type: PredictionType };
type ScoringStatus = "final" | "provisional";
type StoredBreakdown = { type?: string; quality?: { status?: string } } | null;

const PAGE_SIZE = 700;
const MAX_SCAN_ROWS = 28000;
const MAX_EVENTS_PER_RUN = 6;
const WRITE_BATCH_SIZE = 25;
const WAIT_FOR_TELEMETRY_MS = 24 * 60 * 60 * 1000;

function eventLabel(event: EventKey) {
  return `${event.season}/${event.round}/${event.type}`;
}

function stableJson(value: unknown): string {
  function normalize(item: unknown): unknown {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === "object") {
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(item).sort()) {
        const value = (item as Record<string, unknown>)[key];
        if (value !== undefined) sorted[key] = normalize(value);
      }
      return sorted;
    }
    return item;
  }
  return JSON.stringify(normalize(value));
}

function isPendingBreakdown(value: unknown, type: PredictionType): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return true;
  const breakdown = value as StoredBreakdown;
  return breakdown?.type !== type || breakdown?.quality?.status === "provisional";
}

function eventStartTimestamp(race: JolpicaRace, type: PredictionType): number | null {
  const date = type === "race" ? race.date : race.Sprint?.date;
  const time = type === "race" ? race.time : race.Sprint?.time;
  if (!date) return null;
  const parsed = Date.parse(`${date}T${time || "23:59:59Z"}`);
  return Number.isFinite(parsed) ? parsed : null;
}

function eventMayBeFinished(race: JolpicaRace, type: PredictionType): boolean {
  const start = eventStartTimestamp(race, type);
  if (start === null) return false;
  const grace = type === "race" ? 4 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
  return Date.now() > start + grace;
}

async function getCalendar(season: number): Promise<JolpicaRace[]> {
  const response = await fetchJolpica(
    `https://api.jolpi.ca/ergast/f1/${season}/races/?limit=100`
  );
  return response.MRData?.RaceTable?.Races ?? [];
}

function resultFromJolpica(type: PredictionType, race?: JolpicaRace): ScoringResult {
  if (!race) return { ok: false, type, reason: "Jolpica etkinlik sonucu henüz yok." };
  const rawResults = type === "race" ? (race.Results ?? []) : (race.SprintResults ?? []);
  // Kısmi API yanıtında yalnızca ilk üç pilot bulunması yarışın
  // tamamen sonuçlandığını kanıtlamaz.
  if (rawResults.length < 10) {
    return { ok: false, type, reason: "Tam sonuç listesi henüz hazır değil." };
  }
  const podium = getPodiumFromResults(rawResults.map((item) => ({
    driver_number: Number(item.number), position: Number(item.position)
  })));
  if (!podium) return { ok: false, type, reason: "Podyum henüz kesinleşmedi." };
  const season = Number(race.season);
  const round = Number(race.round);
  if (!Number.isInteger(season) || !Number.isInteger(round) || round < 1) {
    return { ok: false, type, reason: "Sonuç sezon/tur bilgisi hatalı." };
  }
  return { ok: true, type, race, rawResults, podium, season, round, source: "jolpica" };
}

async function getJolpicaResult(event: EventKey): Promise<ScoringResult> {
  try {
    const endpoint = event.type === "race" ? "results" : "sprint";
    const response = await fetchJolpica(
      `https://api.jolpi.ca/ergast/f1/${event.season}/${event.round}/${endpoint}/?limit=100`
    );
    const race = response.MRData?.RaceTable?.Races?.[0];
    const result = resultFromJolpica(event.type, race);
    if (result.ok && (result.season !== event.season || result.round !== event.round)) {
      return { ok: false, type: event.type, reason: "Jolpica farklı etkinlik sonucu döndürdü." };
    }
    return result;
  } catch (error) {
    return { ok: false, type: event.type, reason: error instanceof Error ? error.message : "Jolpica hatası." };
  }
}

async function getOpenF1SprintResult(race: JolpicaRace): Promise<ScoringResult> {
  const type = "sprint" as const;
  const year = Number(race.season);
  const sprintDate = race.Sprint?.date;
  if (!sprintDate || !eventMayBeFinished(race, "sprint")) {
    return { ok: false, type, reason: "Sprint henüz tamamlanmadı." };
  }
  try {
    const sessions = await fetchOpenArray<OpenSession>(
      `sessions?year=${year}&session_name=Sprint`
    );
    if (!sessions?.length) return { ok: false, type, reason: "OpenF1 Sprint oturumları alınamadı." };
    const target = Date.parse(`${sprintDate}T12:00:00Z`);
    const session = sessions.find((item) => {
      const start = Date.parse(item.date_start ?? "");
      const end = Date.parse(item.date_end ?? "");
      return item.session_name?.toLowerCase() === "sprint" &&
        Number.isFinite(start) && Number.isFinite(end) && end + 5 * 60_000 < Date.now() &&
        Math.abs(start - target) <= 36 * 60 * 60_000;
    });
    if (!session) return { ok: false, type, reason: "İlgili OpenF1 Sprint oturumu bulunamadı." };
    const results = await fetchOpenArray<SessionResult>(
      `session_result?session_key=${session.session_key}`
    );
    if (!results || results.length < 10) {
      return { ok: false, type, reason: "OpenF1 Sprint sonuçları henüz eksik." };
    }
    const top = results.filter((item) => Number.isInteger(item.position) &&
      item.position !== null && item.position >= 1 && item.position <= 3
    ).sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
    if (top.length !== 3 || top.some((item, index) =>
      item.position !== index + 1 || !Number.isInteger(item.driver_number) ||
      item.dnf || item.dns || item.dsq
    ) || new Set(top.map((item) => item.driver_number)).size !== 3) {
      return { ok: false, type, reason: "OpenF1 Sprint podyumu henüz kesin değil." };
    }
    const podium = getPodiumFromResults(top.map((item) => ({
      driver_number: item.driver_number, position: item.position as number
    })));
    if (!podium) return { ok: false, type, reason: "OpenF1 Sprint podyumu geçersiz." };
    return {
      ok: true, type, race, rawResults: [], podium,
      season: year, round: Number(race.round), source: "openf1"
    };
  } catch (error) {
    return { ok: false, type, reason: error instanceof Error ? error.message : "OpenF1 Sprint hatası." };
  }
}

async function fetchResult(event: EventKey, calendarRace: JolpicaRace): Promise<ScoringResult> {
  const jolpica = await getJolpicaResult(event);
  if (jolpica.ok || event.type === "race") return jolpica;
  // Jolpica Sprint sonuçları geciktiğinde yalnızca TAM AYNI yarışa ait
  // ve bitmiş OpenF1 Sprint oturumundan sonuç alınır.
  const openf1 = await getOpenF1SprintResult(calendarRace);
  return openf1.ok ? openf1 : jolpica;
}

async function findRaceSession(
  race: JolpicaRace
): Promise<OpenSession | null> {
  const year = Number(race.season);
  const meetings =
    await fetchOpenArray<OpenMeeting>(
      `meetings?year=${year}`
    );
  if (!meetings?.length) {
    return null;
  }
  const raceName = clean(race.raceName);
  const country = clean(
    race.Circuit?.Location?.country
  );
  const locality = clean(
    race.Circuit?.Location?.locality
  );
  const raceDate = race.date
    ? Date.parse(`${race.date}T12:00:00Z`)
    : null;
  let best: OpenMeeting | null = null;
  let bestScore = -1;
  for (const meeting of meetings) {
    let score = 0;
    const name = clean(meeting.meeting_name);
    if (
      name &&
      raceName &&
      (name.includes(raceName) ||
        raceName.includes(name))
    ) {
      score += 10;
    }
    if (
      country &&
      clean(meeting.country_name) === country
    ) {
      score += 5;
    }
    if (
      locality &&
      clean(meeting.location).includes(
        locality
      )
    ) {
      score += 5;
    }
    if (raceDate && meeting.date_start) {
      const difference = Math.abs(
        Date.parse(meeting.date_start) -
          raceDate
      );
      if (difference <= 4 * 86400000) {
        score += 8;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = meeting;
    }
  }
  if (!best || bestScore < 10) {
    return null;
  }
  const sessions =
    await fetchOpenArray<OpenSession>(
      `sessions?meeting_key=${best.meeting_key}`
    );
  return (sessions?.find((item) => {
    const raceSession = clean(item.session_name) === "race" || clean(item.session_type) === "race";
    const ended = item.date_end && Number.isFinite(Date.parse(item.date_end)) && Date.parse(item.date_end) <= Date.now();
    return raceSession && ended;
  }) ?? null);
}
function isFullSafetyCar(
  item: RaceControl
) {
  const text =
    `${item.category ?? ""} ` +
    `${item.message ?? ""} ` +
    `${item.flag ?? ""}`;
  const upper = text.toUpperCase();
  return (
    upper.includes("SAFETY CAR") &&
    !upper.includes(
      "VIRTUAL SAFETY CAR"
    ) &&
    !upper.includes("VSC")
  );
}
function isVsc(item: RaceControl) {
  const text =
    `${item.category ?? ""} ` +
    `${item.message ?? ""}`;
  const upper = text.toUpperCase();
  return (
    upper.includes(
      "VIRTUAL SAFETY CAR"
    ) ||
    /\bVSC\b/.test(upper)
  );
}
function isRedFlag(item: RaceControl) {
  const text =
    `${item.flag ?? ""} ` +
    `${item.message ?? ""}`;
  const upper = text.toUpperCase();
  return (
    upper.includes("RED") &&
    (upper.includes("FLAG") ||
      item.flag?.toUpperCase() === "RED")
  );
}
function isIncident(item: RaceControl) {
  const text =
    `${item.category ?? ""} ` +
    `${item.message ?? ""}`;
  const upper = text.toUpperCase();
  return [
    "INCIDENT",
    "COLLISION",
    "CRASH",
    "STOPPED",
    "SPUN",
  ].some((word) => upper.includes(word));
}
function parseGap(
  value: SessionResult["gap_to_leader"]
): number | null {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const number = Number(
      value.replace("+", "")
    );
    return Number.isFinite(number)
      ? number
      : null;
  }
  if (Array.isArray(value)) {
    for (
      let index = value.length - 1;
      index >= 0;
      index -= 1
    ) {
      const parsed = parseGap(
        value[index]
      );
      if (parsed !== null) {
        return parsed;
      }
    }
  }
  return null;
}
function jolpicaGap(
  result: JolpicaResult | undefined
): number | null {
  const text = result?.Time?.time;
  if (!text) {
    return null;
  }
  const raw = text.trim().replace(/^\+/, "");
  const parts = raw.split(":");
  const value = parts.length === 2
    ? Number(parts[0]) * 60 + Number(parts[1])
    : Number(raw);
  return Number.isFinite(value)
    ? value
    : null;
}
function isJolpicaDnf(
  result: JolpicaResult
) {
  const status = (
    result.status ?? ""
  ).trim();
  return Boolean(
    status &&
      status !== "Finished" &&
      !status.startsWith("+")
  );
}
async function buildRaceActuals(
  race: JolpicaRace,
  results: JolpicaResult[]
) {
  const actuals: RaceBulletinActuals = {};
  const specials: RaceSpecialActuals = {};
  const missingSources: string[] = [];
  const winner = results[0];
  const podiumNumbers = results
    .slice(0, 3)
    .map((item) => Number(item.number));
  const pole = results.find(
    (item) => Number(item.grid) === 1
  );
  const fastest = results.find(
    (item) =>
      item.FastestLap?.rank === "1"
  );
  const fastestNumber = fastest
    ? Number(fastest.number)
    : null;
  actuals.poleWins = Boolean(
    pole &&
      winner &&
      Number(pole.number) ===
        Number(winner.number)
  );
  actuals.fastestOnPodium =
    fastestNumber !== null
      ? podiumNumbers.includes(
          fastestNumber
        )
      : null;
  specials.fastestLap =
    fastestNumber;
  specials.winningTeam =
    winner?.Constructor?.name ?? null;
  const gains = results
    .map((item) => {
      const grid = Number(item.grid);
      const finish = Number(item.position);
      if (
        !Number.isFinite(grid) ||
        grid <= 0 ||
        !Number.isFinite(finish)
      ) {
        return null;
      }
      return {
        driver: Number(item.number),
        gain: grid - finish,
      };
    })
    .filter(
      (
        item
      ): item is {
        driver: number;
        gain: number;
      } => item !== null
    );
  if (gains.length) {
    const maxGain = Math.max(
      ...gains.map((item) => item.gain)
    );
    specials.mostGained = gains
      .filter(
        (item) => item.gain === maxGain
      )
      .map((item) => item.driver);
  }
  const fallbackDnfs = results.filter(
    isJolpicaDnf
  );
  actuals.dnf3 =
    fallbackDnfs.length >= 3;
  if (!fallbackDnfs.length) {
    specials.firstDnf = "NONE";
  } else {
    const minLaps = Math.min(
      ...fallbackDnfs.map(
        (item) =>
          Number(item.laps ?? 999)
      )
    );
    specials.firstDnf = fallbackDnfs
      .filter(
        (item) =>
          Number(item.laps ?? 999) ===
          minLaps
      )
      .map(
        (item) => Number(item.number)
      );
  }
  const fallbackGap = jolpicaGap(
    results[1]
  );
  actuals.margin10 =
    fallbackGap === null
      ? null
      : fallbackGap > 10;
  const session = await findRaceSession(
    race
  );
  if (!session) {
    return { actuals, specials, missingSources: ["openf1_session"] };
  }
  const [
    raceControl,
    weather,
    positions,
    sessionResults,
  ] = await Promise.all([
    fetchOpenArray<RaceControl>(
      `race_control?session_key=${session.session_key}`
    ),
    fetchOpenArray<Weather>(
      `weather?session_key=${session.session_key}`
    ),
    fetchOpenArray<Position>(
      `position?session_key=${session.session_key}`
    ),
    fetchOpenArray<SessionResult>(
      `session_result?session_key=${session.session_key}`
    ),
  ]);
  if (!raceControl?.length) missingSources.push("race_control");
  if (!weather?.length) missingSources.push("weather");
  if (!positions?.length) missingSources.push("position");
  if (!sessionResults?.length) missingSources.push("session_result");
  if (raceControl !== null) {
    actuals.redFlag =
      raceControl.some(isRedFlag);
    actuals.safetyCar =
      raceControl.some(
        isFullSafetyCar
      );
    actuals.vsc =
      raceControl.some(isVsc);
    actuals.lap1Incident =
      raceControl.some(
        (item) =>
          Number(item.lap_number) === 1 &&
          isIncident(item)
      );
    const totalLaps = Math.max(
      0,
      ...results.map(
        (item) =>
          Number(item.laps ?? 0)
      )
    );
    if (totalLaps > 0) {
      const threshold = Math.max(
        1,
        totalLaps - 9
      );
      actuals.lateNeutral =
        raceControl.some(
          (item) =>
            Number(
              item.lap_number ?? 0
            ) >= threshold &&
            (isFullSafetyCar(item) ||
              isVsc(item))
        );
    }
  }
  if (
    weather !== null &&
    weather.length > 0
  ) {
    actuals.rain = weather.some(
      (item) =>
        Number(
          item.rainfall ?? 0
        ) > 0
    );
  }
  if (
    positions !== null &&
    positions.length > 0
  ) {
    const leaders = new Set(
      positions
        .filter(
          (item) =>
            Number(item.position) === 1
        )
        .map(
          (item) =>
            Number(item.driver_number)
        )
    );
    actuals.leaders4 =
      leaders.size >= 4;
    if (pole && winner) {
      actuals.lightsToFlag =
        leaders.size === 1 &&
        leaders.has(
          Number(pole.number)
        ) &&
        Number(pole.number) ===
          Number(winner.number);
    }
  }
  if (
    sessionResults !== null &&
    sessionResults.length > 0
  ) {
    const dnfs = sessionResults.filter(
      (item) =>
        item.dnf && !item.dns
    );
    actuals.dnf3 =
      dnfs.length >= 3;
    if (!dnfs.length) {
      specials.firstDnf = "NONE";
    } else {
      const minLaps = Math.min(
        ...dnfs.map(
          (item) =>
            Number(
              item.number_of_laps ?? 999
            )
        )
      );
      specials.firstDnf = dnfs
        .filter(
          (item) =>
            Number(
              item.number_of_laps ?? 999
            ) === minLaps
        )
        .map(
          (item) =>
            item.driver_number
        );
    }
    const p2 = sessionResults.find(
      (item) => item.position === 2
    );
    if (p2) {
      const gap = parseGap(
        p2.gap_to_leader
      );
      if (gap !== null) {
        actuals.margin10 =
          gap > 10;
      }
    }
  }
  return { actuals, specials, missingSources };
}

type PendingEvent = EventKey & { count: number };

async function collectPendingEvents() {
  const admin = createAdminClient();
  const grouped = new Map<string, PendingEvent>();
  let scanned = 0;
  let truncated = false;
  while (scanned < MAX_SCAN_ROWS) {
    const { data, error } = await admin.from("predictions")
      .select("id,season,round,prediction_type,score_breakdown")
      .order("season", { ascending: false })
      .order("round", { ascending: false })
      .order("id", { ascending: true })
      .range(scanned, scanned + PAGE_SIZE - 1);
    if (error) throw new Error(`Bekleyen tahminler okunamadı: ${error.message}`);
    const rows = data ?? [];
    for (const row of rows) {
      const season = Number(row.season);
      const round = Number(row.round);
      const type = row.prediction_type;
      if (!Number.isInteger(season) || !Number.isInteger(round) || round < 1 ||
        (type !== "race" && type !== "sprint")) continue;
      if (!isPendingBreakdown(row.score_breakdown, type)) continue;
      const event: EventKey = { season, round, type };
      const key = eventLabel(event);
      const current = grouped.get(key);
      if (current) current.count++;
      else grouped.set(key, { ...event, count: 1 });
    }
    scanned += rows.length;
    if (rows.length < PAGE_SIZE) break;
    if (scanned >= MAX_SCAN_ROWS) truncated = true;
  }
  return { events: Array.from(grouped.values()), scanned, truncated };
}

type ScoreRow = {
  id: string;
  p1_driver_number: number;
  p2_driver_number: number;
  p3_driver_number: number;
  race_bulletin?: RaceBulletinAnswers | null;
  special_picks?: RaceSpecialPicks | null;
  score_breakdown?: unknown;
};

async function loadUnsettledPredictions(event: EventKey): Promise<ScoreRow[]> {
  const admin = createAdminClient();
  const rows: ScoreRow[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin.from("predictions")
      .select("id,p1_driver_number,p2_driver_number,p3_driver_number,race_bulletin,special_picks,score_breakdown")
      .eq("season", event.season).eq("round", event.round)
      .eq("prediction_type", event.type)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`${eventLabel(event)} tahmin okuma hatası: ${error.message}`);
    const batch = (data ?? []) as ScoreRow[];
    for (const item of batch) {
      if (isPendingBreakdown(item.score_breakdown, event.type)) rows.push(item);
    }
    if (batch.length < PAGE_SIZE) break;
    offset += batch.length;
  }
  return rows;
}

async function scoreEvent(event: EventKey, calendarRace: JolpicaRace, dryRun: boolean) {
  const label = eventLabel(event);
  const result = await fetchResult(event, calendarRace);
  if (result.ok === false) {
    console.info(`[PREDICTIONS] ${label}: Sonuç bekleniyor: ${result.reason}`);
    return { type: event.type, event, ok: true, skipped: true, reason: result.reason, scored: 0 };
  }
  const predictions = await loadUnsettledPredictions(event);
  if (!predictions.length) {
    return { type: event.type, event, ok: true, skipped: true, reason: "Puanlanmamış kayıt kalmadı.", scored: 0 };
  }
  let raceActuals: RaceBulletinActuals = {};
  let raceSpecialActuals: RaceSpecialActuals = {};
  let missingSources: string[] = [];
  if (event.type === "race") {
    const actual = await buildRaceActuals(result.race, result.rawResults);
    raceActuals = actual.actuals;
    raceSpecialActuals = actual.specials;
    missingSources = actual.missingSources;
    const start = eventStartTimestamp(calendarRace, "race");
    if (missingSources.length && start !== null && Date.now() - start < WAIT_FOR_TELEMETRY_MS) {
      console.info(`[PREDICTIONS] ${label}: OpenF1 verileri bekleniyor: ${missingSources.join(", ")}`);
      return {
        type: event.type, event, ok: true, skipped: true, scored: 0,
        reason: `Eksik OpenF1 verisi: ${missingSources.join(", ")}`
      };
    }
  }
  const status: ScoringStatus = missingSources.length ? "provisional" : "final";
  const calculated = predictions.map((prediction) => {
    const podium = calculatePredictionScore({
      P1: Number(prediction.p1_driver_number),
      P2: Number(prediction.p2_driver_number),
      P3: Number(prediction.p3_driver_number)
    }, result.podium);
    if (event.type === "sprint") {
      return {
        id: prediction.id, total: podium.total, podiumPoints: podium.total,
        bulletinPoints: 0, specialPoints: 0,
        breakdown: { type: "sprint", podium, total: podium.total,
          quality: { status: "final" as const, missingSources: [] as string[] } }
      };
    }
    const extras = calculateRaceExtraScore(
      (prediction.race_bulletin ?? {}) as RaceBulletinAnswers,
      (prediction.special_picks ?? {}) as RaceSpecialPicks,
      raceActuals, raceSpecialActuals
    );
    const total = podium.total + extras.total;
    return {
      id: prediction.id, total, podiumPoints: podium.total,
      bulletinPoints: extras.bulletinPoints, specialPoints: extras.specialPoints,
      breakdown: {
        type: "race", podium, bulletin: extras.bulletin, special: extras.special,
        actuals: raceActuals, specialActuals: raceSpecialActuals, total,
        quality: { status, missingSources }
      }
    };
  });
  // Aynı geçici veri tekrar geldiyse satırı yeniden yazma.
  const previous = new Map(predictions.map((item) => [item.id, item.score_breakdown]));
  const changes = calculated.filter((item) =>
    stableJson(item.breakdown) !== stableJson(previous.get(item.id))
  );
  if (dryRun) {
    return {
      type: event.type, event, ok: true, dryRun: true, skipped: false,
      source: result.source, status, missingSources,
      wouldScore: changes.length, alreadyUnchanged: calculated.length - changes.length,
      scored: 0, sample: calculated.slice(0, 3).map((i) => ({ total: i.total, podiumPoints: i.podiumPoints, bulletinPoints: i.bulletinPoints, specialPoints: i.specialPoints }))
    };
  }
  const admin = createAdminClient();
  let saved = 0;
  const errors: string[] = [];
  for (let start = 0; start < changes.length; start += WRITE_BATCH_SIZE) {
    const chunk = changes.slice(start, start + WRITE_BATCH_SIZE);
    const batch = await Promise.all(chunk.map(async (item) => {
      try {
        const { error } = await admin.from("predictions").update({
          points: item.total, podium_points: item.podiumPoints,
          bulletin_points: item.bulletinPoints, special_points: item.specialPoints,
          score_breakdown: item.breakdown, updated_at: new Date().toISOString()
        }).eq("id", item.id);
        return error ? error.message : null;
      } catch (error) {
        return error instanceof Error ? error.message : "Bilinmeyen veritabanı hatası";
      }
    }));
    for (const error of batch) {
      if (error) errors.push(error);
      else saved++;
    }
  }
  console.info(`[PREDICTIONS] ${label}: ${saved} kaydedildi, kalite=${status}, hata=${errors.length}`);
  return {
    type: event.type, event, ok: errors.length === 0, skipped: false,
    source: result.source, status, missingSources, scored: saved,
    unchanged: calculated.length - changes.length,
    ...(errors.length ? { errors: errors.slice(0, 5), errorCount: errors.length } : {})
  };
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ ok: false, error: "CRON_SECRET tanımlı değil." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Yetkisiz istek." }, { status: 401 });
  }
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  const started = Date.now();
  try {
    const pending = await collectPendingEvents();
    const calendarCache = new Map<number, JolpicaRace[]>();
    const ready: { key: PendingEvent; race: JolpicaRace }[] = [];
    const calendarErrors: string[] = [];
    let futureCount = 0;
    for (const key of pending.events) {
      if (!calendarCache.has(key.season)) {
        try { calendarCache.set(key.season, await getCalendar(key.season)); }
        catch (error) {
          calendarErrors.push(`${key.season}: ${error instanceof Error ? error.message : "Takvim hatası"}`);
          // Aynı sezon için her kayıt üzerinde tekrar tekrar isteme.
          calendarCache.set(key.season, []);
        }
      }
      const race = calendarCache.get(key.season)?.find((item) => Number(item.round) === key.round);
      if (!race) continue;
      if (!eventMayBeFinished(race, key.type)) { futureCount++; continue; }
      ready.push({ key, race });
    }
    // Yeni yarışlara öncelik ver; eskide kalanlar da sonraki cron çalışmalarıyla işlenir.
    ready.sort((a, b) => b.key.season - a.key.season || b.key.round - a.key.round ||
      (a.key.type === "sprint" ? -1 : 1));
    const selected = ready.slice(0, MAX_EVENTS_PER_RUN);
    const events: Awaited<ReturnType<typeof scoreEvent>>[] = [];
    for (const item of selected) {
      try {
        events.push(await scoreEvent(item.key, item.race, dryRun));
      } catch (error) {
        console.error(`[PREDICTIONS] ${eventLabel(item.key)}:`, error);
        events.push({
          type: item.key.type, event: item.key, ok: false, skipped: false, scored: 0,
          reason: error instanceof Error ? error.message : "Bilinmeyen puanlama hatası"
        });
      }
    }
    const totalScored = events.reduce((sum, item) => sum + item.scored, 0);
    const hasError = events.some((item) => !item.ok) || calendarErrors.length > 0;
    const response = {
      ok: !hasError, dryRun, scanned: pending.scanned,
      scanTruncated: pending.truncated, pendingEvents: pending.events.length,
      futureEvents: futureCount, readyEvents: ready.length,
      deferredEvents: Math.max(0, ready.length - selected.length),
      calendarErrors, events, totalScored, elapsedMs: Date.now() - started
    };
    console.info(`[PREDICTIONS] ${JSON.stringify({
      ok: response.ok, dryRun, pending: response.pendingEvents,
      processed: events.length, scored: totalScored, deferred: response.deferredEvents,
      elapsedMs: response.elapsedMs
    })}`);
    return NextResponse.json(response, {
      status: hasError ? 500 : 200, headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("PREDICTION SCORE ERROR:", error);
    return NextResponse.json({
      ok: false, dryRun,
      error: error instanceof Error ? error.message : "Bilinmeyen sunucu hatası."
    }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
