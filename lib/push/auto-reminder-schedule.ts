/** F1 Medipol otomatik hatırlatma takvimi. Jolpica UTC seans saatleri kullanılır. */
export type ReminderKind = "race" | "qualifying" | "sprint" | "race_prediction" | "sprint_prediction";

export type ScheduledReminder = {
  key: string;
  kind: ReminderKind;
  title: string;
  body: string;
  url: string;
  scheduledFor: string;
};

type Session = { date?: string; time?: string };
type Race = {
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Qualifying?: Session;
  Sprint?: Session;
};
type CalendarResponse = {
  MRData?: { RaceTable?: { Races?: Race[] } };
};

/** Saat olmayan seanslar için saat uydurmayız. */
function utcTime(date?: string, time?: string): number | null {
  if (!date || !time || !/^\d{4}-\d\d-\d\d$/.test(date)) return null;
  const value = Date.parse(`${date}T${time}`);
  return Number.isFinite(value) ? value : null;
}

function buildNotice(race: Race, kind: ReminderKind, when: number, minutesBefore: number): ScheduledReminder {
  const round = Number(race.round);
  const season = Number(race.date.slice(0, 4));
  const name = race.raceName.trim() || "Formula 1 yarışı";
  const prediction = kind.endsWith("prediction");
  const title = kind === "race" ? `${name} yaklaşıyor! 🏁`
    : kind === "qualifying" ? `${name}: Sıralama yaklaşıyor! ⏱️`
    : kind === "sprint" ? `${name}: Sprint yaklaşıyor! ⚡`
    : kind === "sprint_prediction" ? "Sprint tahminin kapanmak üzere!"
    : "Yarış tahminin kapanmak üzere!";
  const body = prediction
    ? `${name} için tahminler başlangıçta kapanacak. Son 30 dakika!`
    : `${name} ${minutesBefore} dakika sonra başlıyor. Yarış heyecanını kaçırma!`;
  return {
    key: `f1-${season}-r${round}-${kind}`,
    kind,
    title,
    body,
    url: prediction ? (kind === "sprint_prediction" ? "/predict?mode=sprint" : "/predict") : "/live",
    scheduledFor: new Date(when - minutesBefore * 60_000).toISOString(),
  };
}

export function remindersForRaces(races: Race[]): ScheduledReminder[] {
  const out: ScheduledReminder[] = [];
  for (const race of races) {
    const raceAt = utcTime(race.date, race.time);
    const qualificationAt = utcTime(race.Qualifying?.date, race.Qualifying?.time);
    const sprintAt = utcTime(race.Sprint?.date, race.Sprint?.time);
    if (raceAt !== null) {
      out.push(buildNotice(race, "race", raceAt, 60));
      out.push(buildNotice(race, "race_prediction", raceAt, 30));
    }
    if (qualificationAt !== null) out.push(buildNotice(race, "qualifying", qualificationAt, 30));
    if (sprintAt !== null) {
      out.push(buildNotice(race, "sprint", sprintAt, 30));
      out.push(buildNotice(race, "sprint_prediction", sprintAt, 30));
    }
  }
  return out;
}

export function isDue(item: ScheduledReminder, nowMs: number): boolean {
  const due = Date.parse(item.scheduledFor);
  // Supabase Cron her iki dakikada bir: 8 dakikalık telafi aralığı.
  return due <= nowMs && nowMs - due < 8 * 60_000;
}

export async function loadReminderSchedule(nowMs: number): Promise<ScheduledReminder[]> {
  const year = new Date(nowMs).getUTCFullYear();
  const years = [year];
  if (new Date(nowMs).getUTCMonth() === 11) years.push(year + 1);
  const races = await Promise.all(years.map(async y => {
    const response = await fetch(`https://api.jolpi.ca/ergast/f1/${y}.json?limit=100`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) throw new Error(`Jolpica takvimi ${response.status}`);
    const data = (await response.json()) as CalendarResponse;
    return data.MRData?.RaceTable?.Races ?? [];
  }));
  return remindersForRaces(races.flat());
}
